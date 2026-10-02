const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('landing.html','utf8');
function fixture(){
 const data=new Map([['pesk-room-id','room'],['pesk-account-uid','existing'],['pesk-student-num','1']]);
 const elements={},el=id=>elements[id]??={value:'',disabled:false,textContent:'',innerHTML:'',style:{},focus(){},classList:{add(){},remove(){},toggle(){}}};
 let accounts={1:{id:'student',pw:'pass'}},retry=null,transactions=0;
 const c={console:{warn(){}},navigator:{onLine:true},location:{},setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,1)),clearTimeout,
  localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},
  document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){}},_fbReady:true,_db:{},addEventListener(){},
  _fsDoc:(_, ...parts)=>parts.join('/'),_fsGetDoc:async ref=>({exists:()=>true,data:()=>({value:ref.endsWith('tesk-accounts')?structuredClone(accounts):[{num:1,name:'학생'}]})}),
  _fsRunTxn:async(_,fn)=>{transactions++;let saved;const txn={get:c._fsGetDoc,set:(_,v)=>saved=v.value};let out=await fn(txn);if(retry){retry();retry=null;saved=null;out=await fn(txn);}if(saved)accounts=structuredClone(saved);return out;}
 };
 c.window=c;vm.createContext(c);vm.runInContext(html.split('<script>')[1].split('</script>')[0],c);
 el('login-id').value='student';el('login-pw').value='pass';
 return {c,el,data,accounts:()=>accounts,setAccounts:a=>accounts=a,retry:fn=>retry=fn,count:()=>transactions};
}
test('opening login screen preserves the active student session in another tab',()=>{
 const f=fixture();assert.equal(f.data.get('pesk-account-uid'),'existing');assert.equal(f.data.get('pesk-room-id'),'room');
});
test('student login waits for SDK readiness, prevents duplicate Enter and normalizes legacy account',async()=>{
 const f=fixture();f.c._fbReady=false;setTimeout(()=>f.c._fbReady=true,5);
 await Promise.all([f.c.loginWithCredentials(),f.c.loginWithCredentials()]);
 assert.equal(f.count(),1);assert.equal(f.c.location.href,'pesk.html');assert.equal(f.data.get('pesk-account-uid'),f.accounts()[1].accountUid);
});
test('login retry preserves concurrent changes to other student accounts',async()=>{
 const f=fixture();f.retry(()=>{f.accounts()[2]={id:'second',pw:'new-password',sessionVersion:3};});
 await f.c.loginWithCredentials();assert.equal(f.accounts()[2].pw,'new-password');assert.equal(f.accounts()[2].sessionVersion,3);
});
test('login retry rechecks credentials when teacher changes password',async()=>{
 const f=fixture();f.retry(()=>{f.accounts()[1].pw='reset';});await f.c.loginWithCredentials();
 assert.equal(f.c.location.href,undefined);assert.match(f.el('login-error').textContent,/올바르지/);assert.equal(f.el('login-btn').disabled,false);
});
test('returning from forced password change unlocks login controls',async()=>{
 const f=fixture();f.accounts()[1].mustChangePassword=true;await f.c.loginWithCredentials();
 assert.equal(f.el('step3-panel').style.display,'block');f.c.backToStep1();assert.equal(f.el('login-btn').disabled,false);
});
test('password change preserves other accounts on transaction retry',async()=>{
 const f=fixture();f.accounts()[1].mustChangePassword=true;await f.c.loginWithCredentials();
 f.el('new-pw').value='changed';f.el('new-pw-confirm').value='changed';f.retry(()=>{f.accounts()[2]={id:'other',pw:'reset'};});
 await f.c.changePassword();assert.equal(f.accounts()[1].pw,'changed');assert.equal(f.accounts()[1].sessionVersion,2);assert.equal(f.accounts()[2].pw,'reset');
});
test('server authentication cannot silently bypass an unloaded economy module',async()=>{
 const f=fixture();f.c.TESK_USE_SERVER_ECONOMY=true;await f.c.loginWithCredentials();
 assert.equal(f.count(),0);assert.equal(f.c.location.href,undefined);assert.equal(f.el('login-btn').disabled,false);
});
test('storage quota login error cleans partial credentials and explains recovery',async()=>{
 const f=fixture();f.c.localStorage.setItem=(k,v)=>{if(k==='pesk-account-uid')throw Object.assign(Error('quota'),{name:'QuotaExceededError'});f.data.set(k,v);};
 await f.c.loginWithCredentials();assert.equal(f.data.has('pesk-student-num'),false);assert.equal(f.c.location.href,undefined);assert.match(f.el('login-error').textContent,/저장 공간/);
});

test('server login uses only returned identity and never reads account documents',async()=>{
 const f=fixture();f.c.TESK_USE_SERVER_STUDENT_AUTH=true;
 f.c._fsGetDoc=async()=>{throw Error('private account document must not be read');};
 f.c._studentAuthApi={studentSignIn:async()=>({roomId:'room',studentNum:3,name:'서버 학생',id:'student',accountUid:'signed-account',sessionVersion:4,mustChangePassword:false})};
 await f.c.loginWithCredentials();assert.equal(f.count(),0);assert.equal(f.c.location.href,'pesk.html');
 assert.equal(f.data.get('pesk-student-num'),'3');assert.equal(f.data.get('pesk-account-uid'),'signed-account');assert.equal(f.el('login-pw').value,'');
});
test('server password-change flow uses fresh session without account reads or writes',async()=>{
 const f=fixture();f.c.TESK_USE_SERVER_STUDENT_AUTH=true;
 const account={roomId:'room',studentNum:1,name:'학생',id:'student',accountUid:'signed-account',sessionVersion:4,mustChangePassword:true};
 f.c._studentAuthApi={studentSignIn:async()=>account,changePassword:async(room,pw)=>{
  assert.equal(room,'room');assert.equal(pw,'changed');return {...account,sessionVersion:5,mustChangePassword:false};
 }};
 await f.c.loginWithCredentials();assert.equal(f.el('step3-panel').style.display,'block');assert.equal(f.c.location.href,undefined);
 f.el('new-pw').value='changed';f.el('new-pw-confirm').value='changed';await f.c.changePassword();
 assert.equal(f.count(),0);assert.equal(f.data.get('pesk-session-version'),'5');assert.equal(f.c.location.href,'pesk.html');
});
test('server authentication failure never falls back to public password comparison',async()=>{
 const f=fixture();f.c.TESK_USE_SERVER_STUDENT_AUTH=true;
 f.c._studentAuthApi={studentSignIn:async()=>{throw Object.assign(Error('다시 시도해주세요'),{code:'functions/unavailable'});}};
 await f.c.loginWithCredentials();assert.equal(f.count(),0);assert.equal(f.c.location.href,undefined);assert.equal(f.el('login-btn').disabled,false);
});

function teacherFixture(){
 const source=fs.readFileSync('tesk_teacher_v2.html','utf8'),data=new Map([['tesk-teacher-uid','old-user'],['tesk-teacher-role','master']]),messages=[];
 const c={console:{warn(){}},location:{protocol:'https:',replace(url){this.target=url;}},document:{getElementById:()=>null},
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},sessionStorage:{removeItem(){}},showToast:m=>messages.push(m),_showMasterBtnFromLocal(){},auth:{currentUser:null},onAuthStateChanged:(_,fn)=>c.authChange=fn};c.window=c;vm.createContext(c);
 const logout=source.slice(source.indexOf('async function teacherLogout(){'),source.indexOf('\nfunction save(k,v)',source.indexOf('async function teacherLogout(){')));
 vm.runInContext(logout,c);
 const start=source.indexOf('onAuthStateChanged(auth, async (user) => {');vm.runInContext(source.slice(start,source.indexOf('\nfunction _showMasterBtnFromLocal()',start)),c);
 return {c,data,messages};
}
test('teacher without Firebase authentication redirects even with a cached teacher identity',async()=>{
 const f=teacherFixture();await f.c.authChange(null);assert.equal(f.c.location.target,'landing.html');assert.equal(f.data.has('tesk-teacher-uid'),false);
});
test('teacher logout clears role after signout and allows retry on failure',async()=>{
 const f=teacherFixture();f.c._auth={};f.c._signOut=async()=>{throw Error('failed');};await f.c.teacherLogout();
 assert.equal(f.c.location.target,undefined);assert.equal(f.c._teacherLoggingOut,false);assert.equal(f.messages.length,1);
 f.c._signOut=async()=>{};await f.c.teacherLogout();assert.equal(f.c.location.target,'landing.html');assert.equal(f.data.has('tesk-teacher-role'),false);
});
