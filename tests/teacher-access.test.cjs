const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const access=require('../functions/teacher-access');
const source=fs.readFileSync('tesk_teacher_v2.html','utf8');
const master=access.MASTER_EMAILS[0];
test('server authority ignores self-assigned master profiles and unverified identities',()=>{
 assert.equal(access.canManageRoom({uid:'outsider',token:{}},{role:'master',approved:true},'teacher'),false);
 assert.equal(access.canManageRoom({uid:'admin',token:{email:master,email_verified:false}},null,'teacher'),false);
 assert.equal(access.canManageRoom({uid:'admin',token:{email:master,email_verified:true}},null,'teacher'),true);
 assert.equal(access.canManageRoom({uid:'teacher',token:{}},{role:'teacher',approved:true},'teacher'),true);
 assert.equal(access.canManageRoom({uid:'teacher',token:{}},{role:'teacher',approved:false},'teacher'),false);
 assert.equal(access.canManageRoom({uid:'other',token:{}},{role:'teacher',approved:true},'teacher'),false);
});
test('master identity allowlists agree in frontend, current/future rules and server',()=>{
 const config=fs.readFileSync('shared/firebase-config.js','utf8');
 assert.deepEqual(JSON.parse(config.match(/export const MASTER_EMAILS = (\[[^;]+\])/)[1].replace(/'/g,'"')),access.MASTER_EMAILS);
 for(const file of ['firestore.rules','firestore.secure.rules']){
  const rules=fs.readFileSync(file,'utf8');
  const block=rules.slice(rules.indexOf('function isMaster()'),rules.indexOf('function isApprovedTeacher()'));
  assert.match(block,/email_verified/);assert.doesNotMatch(block,/myUser/);
  assert.deepEqual(JSON.parse(block.match(/ in (\[[^;]+\])/)[1].replace(/'/g,'"')),access.MASTER_EMAILS);
 }
});
function profileFixture(initial,{failure=false}={}){
 let data=initial,writes=[];
 const c={window:{TESK_MASTER_EMAILS:[master]},db:{},doc:()=>({}),console:{warn(){}},
  getDoc:async()=>{if(failure)throw Error('offline');return {exists:()=>!!data,data:()=>structuredClone(data)};},
  setDoc:async(_,v)=>{data=v;writes.push(v);},updateDoc:async(_,v)=>{data={...data,...v};writes.push(v);}};
 vm.createContext(c);const start=source.indexOf('async function ensureTeacherProfile('),end=source.indexOf('// 인증 확인:',start);
 vm.runInContext(source.slice(start,end),c);
 return {run:user=>c.ensureTeacherProfile(user),writes};
}
const teacher={uid:'teacher',email:'teacher@example.test',emailVerified:true,displayName:'가상 교사'};
test('profile read failures fail closed instead of granting teacher approval',async()=>{
 const f=profileFixture(null,{failure:true}),r=await f.run(teacher);
 assert.equal(r.approved,false);assert.equal(r.loadError,true);assert.equal(f.writes.length,0);
});
test('new teacher profile waits for approval; approved existing teacher stays approved',async()=>{
 const fresh=profileFixture(null);assert.equal((await fresh.run(teacher)).approved,false);
 assert.equal(fresh.writes[0].role,'teacher');assert.equal(fresh.writes[0].approved,false);
 const old=profileFixture({uid:teacher.uid,role:'teacher',approved:true});assert.equal((await old.run(teacher)).approved,true);
 assert.equal(Object.hasOwn(old.writes[0],'approved'),false);assert.equal(Object.hasOwn(old.writes[0],'role'),false);
});
test('spoofed role never opens master UI; verified configured master bootstraps',async()=>{
 const fake=await profileFixture({role:'master',approved:true}).run(teacher);assert.equal(fake.role,'teacher');assert.equal(fake.approved,false);
 const legitimate=await profileFixture(null).run({...teacher,email:master});assert.equal(legitimate.role,'master');assert.equal(legitimate.approved,true);
 const unverified=await profileFixture(null).run({...teacher,email:master,emailVerified:false});assert.equal(unverified.role,'teacher');assert.equal(unverified.approved,false);
});
function codeFixture({existingCode=null,owner='teacher',failTxn=false,failPreferences=false}={}){
 const writes=[],notices=[],prefs=[];
 const storage=new Map([['tesk-teacher-uid','spoofed-local-uid']]);
 const c={window:{_fbReady:true,_db:{},_auth:{currentUser:teacher},_fsDoc:(_, ...p)=>p.join('/'),
  _fsRunTxn:async(_,fn)=>{const pending=[];await fn({get:async ref=>({exists:()=>ref.startsWith('classCodes')?!!existingCode:owner!==undefined,data:()=>ref.startsWith('classCodes')?existingCode:{ownerUid:owner}}),set:(...v)=>pending.push(v)});if(failTxn)throw Error('permission-denied');writes.push(...pending);},
  _fsSetDoc:async(...v)=>{if(failPreferences)throw Error('offline');prefs.push(v);}},
  TESK_ROOM:'room',settings:{classCode:'123456',teacherName:'가상',className:'가상 학급'},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console:{warn(){}},showToast:s=>notices.push(s)};
 vm.createContext(c);const a=source.indexOf('async function saveClassCodeToFirebase(){'),b=source.indexOf('/* 내 학급 소유권',a);vm.runInContext(source.slice(a,b),c);
 return {run:()=>c.saveClassCodeToFirebase(),writes,prefs,notices,c};
}
test('class code save uses authenticated identity and writes room plus mapping atomically',async()=>{
 const f=codeFixture();assert.equal(await f.run(),true);assert.equal(f.writes.length,2);
 assert.equal(f.writes[0][1].ownerUid,'teacher');assert.equal(f.writes[1][1].ownerUid,'teacher');
 assert.equal(f.prefs[0][0],'users/teacher');
});
test('occupied code and foreign/ownerless room never leave partial room metadata writes',async()=>{
 for(const opts of [{existingCode:{ownerUid:'other',roomId:'foreign'}},{existingCode:{ownerUid:'teacher',roomId:'foreign'}},{owner:'other'},{owner:null},{failTxn:true}]){
  const f=codeFixture(opts);assert.equal(await f.run(),false);assert.equal(f.writes.length,0);assert.equal(f.prefs.length,0);
 }
});
test('navigation preference failure does not report a committed code as failed',async()=>{
 const f=codeFixture({failPreferences:true});assert.equal(await f.run(),true);assert.equal(f.writes.length,2);
});
test('class code changes require Firebase login, not cached local identity',async()=>{
 const f=codeFixture();f.c.window._auth.currentUser=null;assert.equal(await f.run(),false);assert.equal(f.writes.length,0);
});
