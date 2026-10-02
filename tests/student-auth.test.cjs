const test=require('node:test'),assert=require('node:assert/strict');
const {createStudentAuth,matchesPassword}=require('../functions/student-auth');
const accountPath='classrooms/test/data/tesk-accounts';
function fixture(){
 const docs=new Map([[accountPath,{value:{1:{id:'student',pw:'pass',accountUid:'account-a',sessionVersion:1}},updatedAt:'initial'}],
  ['classrooms/test/data/tesk-students',{value:[{num:1,name:'가상 학생'}]}],
  ['users/teacher',{role:'teacher',approved:true}],['classrooms/test/info/meta',{ownerUid:'teacher'}]]);
 let retry=null,time=1000000;const issued=[];
 const snapshot=ref=>({exists:docs.has(ref.path),get:k=>structuredClone(docs.get(ref.path)?.[k]),data:()=>structuredClone(docs.get(ref.path))});
 const db={doc:path=>({path,get:async()=>snapshot({path})}),runTransaction:async fn=>{
  let writes=[];const txn={get:async r=>snapshot(r),set:(r,v)=>writes.push([r.path,structuredClone(v)])};
  let result=await fn(txn);
  if(retry&&writes.some(([p])=>p===accountPath)){const cb=retry;retry=null;cb();writes=[];result=await fn(txn);}
  for(const [p,v]of writes)docs.set(p,v);return result;
 }};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const server=createStudentAuth({db,auth:{createCustomToken:async(uid,token)=>{issued.push({uid,token});return 'test-token';}},HttpsError,now:()=>time});
 const req={data:{roomId:'test',id:'student',pw:'pass'},rawRequest:{ip:'127.0.0.1'}};
 const get=()=>docs.get(accountPath).value;
 return {server,docs,issued,req,get,clock:v=>time=v,retry:cb=>retry=cb,
  login:async()=>server.studentLogin(req),student:()=>({auth:issued.at(-1),data:{roomId:'test'}}),
  teacher:accounts=>({auth:{uid:'teacher',token:{}},data:{roomId:'test',accounts,expectedUpdatedAt:docs.get(accountPath).updatedAt}})};
}
const rejects=(fn,code)=>assert.rejects(fn,e=>e.code===code);
test('legacy login hashes only the matched password and returns no credentials',async()=>{
 const f=fixture();f.get()[2]={id:'other',pw:'untouched'};const r=await f.login();
 assert.equal(r.studentNum,1);assert.equal(r.name,'가상 학생');assert.equal(r.accountUid,'account-a');
 assert.equal(f.get()[1].pw,undefined);assert.match(f.get()[1].passwordHash,/^scrypt1\$/);assert.equal(f.get()[2].pw,'untouched');
 assert.equal(r.passwordHash,undefined);assert.equal(r.pw,undefined);assert.equal(f.issued[0].token.passwordHash,undefined);
 assert.equal(f.issued[0].token.role,'student');assert.equal(f.get()[1].firebaseUid,f.issued[0].uid);
 assert.equal(await matchesPassword(f.get()[1],'pass'),true);assert.equal(await matchesPassword(f.get()[1],'wrong'),false);
});
test('repeat hashed login preserves active session identity',async()=>{
 const f=fixture();await f.login();const old=structuredClone(f.issued[0]);await f.login();assert.deepEqual(f.issued[1],old);
});
test('wrong, missing and duplicate IDs reveal the same error and never issue tokens',async()=>{
 for(const mutate of [f=>f.req.data.pw='wrong',f=>f.req.data.id='missing',f=>f.get()[2]={id:'student',pw:'different'}]){
  const f=fixture();mutate(f);await rejects(()=>f.login(),'permission-denied');assert.equal(f.issued.length,0);assert.equal(f.get()[1].pw,'pass');
 }
});
test('room path injection and oversized credentials rejected',async()=>{
 for(const data of [{roomId:'a/b'},{roomId:'..'},{pw:'x'.repeat(257)},{id:{bad:true}}]){
  const f=fixture();Object.assign(f.req.data,data);await rejects(()=>f.login(),'invalid-argument');assert.equal(f.issued.length,0);
 }
});
test('rate limiter survives separate requests, expires and stores no raw credentials',async()=>{
 const f=fixture();f.req.data.pw='wrong';for(let i=0;i<12;i++)await rejects(()=>f.login(),'permission-denied');
 await rejects(()=>f.login(),'resource-exhausted');
 const limits=[...f.docs].filter(([p])=>p.startsWith('_studentAuthLimits'));assert.equal(limits.length,2);assert.ok(limits.every(([p,v])=>/^_studentAuthLimits\/[a-f0-9]{64}$/.test(p)&&!JSON.stringify(v).includes('student')));
 f.clock(2000000);f.req.data.pw='pass';await f.login();
});
test('login transaction retries revalidate changed password and preserve other accounts',async()=>{
 const f=fixture();f.retry(()=>f.get()[1].pw='reset');await rejects(()=>f.login(),'permission-denied');assert.equal(f.issued.length,0);
 const g=fixture();g.retry(()=>g.get()[2]={id:'other',pw:'new'});await g.login();assert.equal(g.get()[2].pw,'new');
});
test('session rejects unauthenticated, teacher, wrong room, UID, account and version',async()=>{
 const f=fixture();await f.login();const base=f.student();await f.server.studentSession(base);
 for(const patch of [{auth:null},{auth:{uid:'teacher',token:{}}},{data:{roomId:'foreign'}},{auth:{...base.auth,uid:'spoof'}},
  {auth:{...base.auth,token:{...base.auth.token,sessionVersion:77}}},{auth:{...base.auth,token:{...base.auth.token,accountUid:'other'}}}]){
  await rejects(()=>f.server.studentSession({...base,...patch}),'unauthenticated');
 }
});
test('teacher reset, delete, disable, ID change and recreation invalidate live session',async()=>{
 for(const edit of [a=>a.pw='reset',a=>a.disabled=true,a=>a.id='changed',a=>a.accountUid='new',a=>a.authRevision='new',a=>a.sessionVersion++]){
  const f=fixture();await f.login();edit(f.get()[1]);await rejects(()=>f.server.studentSession(f.student()),'unauthenticated');
 }
 const f=fixture();await f.login();delete f.get()[1];await rejects(()=>f.server.studentSession(f.student()),'unauthenticated');
});
test('forced password change permits only session and password calls',async()=>{
 const f=fixture();f.get()[1].mustChangePassword=true;const login=await f.login();assert.equal(login.mustChangePassword,true);
 await f.server.studentSession(f.student());await rejects(()=>f.server.requireStudent(f.student(),'test'),'failed-precondition');
});
test('password change rotates version, revokes old token and cannot target another student',async()=>{
 const f=fixture();await f.login();const old=f.student();f.get()[2]={id:'other',pw:'keep'};
 const r=await f.server.studentChangePassword({...old,data:{roomId:'test',studentNum:2,newPassword:'new-pass'}});
 assert.equal(r.studentNum,1);assert.equal(f.get()[2].pw,'keep');assert.equal(f.get()[1].sessionVersion,2);
 assert.equal(await matchesPassword(f.get()[1],'new-pass'),true);assert.equal(f.get()[1].pw,undefined);
 await rejects(()=>f.server.studentSession(old),'unauthenticated');await f.server.studentSession(f.student());
});
test('password change rejects weak/same password and concurrent reset',async()=>{
 const f=fixture();await f.login();
 for(const newPassword of ['123','123456','pass'])await rejects(()=>f.server.studentChangePassword({...f.student(),data:{roomId:'test',newPassword}}),'invalid-argument');
 f.retry(()=>f.get()[1].sessionVersion++);
 await rejects(()=>f.server.studentChangePassword({...f.student(),data:{roomId:'test',newPassword:'changed'}}),'unauthenticated');
});
test('teacher account edits hash passwords and stale saves cannot revert student changes',async()=>{
 const f=fixture();const stale=f.teacher(structuredClone(f.get()));await f.login();
 await rejects(()=>f.server.saveStudentAccounts(stale),'aborted');
 const req=f.teacher({...structuredClone(f.get()),2:{id:'second',pw:'start',mustChangePassword:true}});
 const r=await f.server.saveStudentAccounts(req);assert.equal(r.accounts[2].pw,undefined);assert.equal(r.accounts[2].mustChangePassword,true);
 assert.equal(await matchesPassword(r.accounts[2],'start'),true);await f.server.studentSession(f.student());
});
test('teacher reset increments server version regardless of client input',async()=>{
 const f=fixture();await f.login();const req=f.teacher(structuredClone(f.get()));req.data.accounts[1].pw='reset';req.data.accounts[1].sessionVersion=-50;
 await f.server.saveStudentAccounts(req);assert.equal(f.get()[1].sessionVersion,2);await rejects(()=>f.server.studentSession(f.student()),'unauthenticated');
});
test('unapproved, foreign teachers and students cannot manage accounts',async()=>{
 for(const uid of ['foreign','student','teacher']){
  const f=fixture();if(uid==='teacher')f.docs.get('users/teacher').approved=false;
  const req=f.teacher(f.get());req.auth.uid=uid;await rejects(()=>f.server.saveStudentAccounts(req),'permission-denied');
 }
});
test('legacy writing migration derives ownership from trusted stored record',async()=>{
 const f=fixture();await f.login();const root='classrooms/test/data/pesk-writings';
 f.docs.set(root,{value:[{id:'mine',studentNum:1,content:'old'},{id:'other',studentNum:2,content:'private'}]});
 await f.server.migrateStudentWriting({...f.student(),data:{roomId:'test',writingId:'mine'}});
 assert.equal(f.docs.get(root+'/items/mine').accountUid,'account-a');
 await rejects(()=>f.server.migrateStudentWriting({...f.student(),data:{roomId:'test',writingId:'other'}}),'permission-denied');
 assert.equal(f.docs.has(root+'/items/other'),false);
});
