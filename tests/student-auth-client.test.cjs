const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let user=null;const calls=[],signed=[];
 const session={token:'signed-token',roomId:'test',studentNum:1,id:'student',accountUid:'a',sessionVersion:2,mustChangePassword:false};
 const claims={role:'student',roomId:'test',studentNum:1,accountUid:'a',sessionVersion:2};
 const c={getApp:()=>({}),getAuth:()=>({currentUser:user}),getFunctions:()=>({}),
  httpsCallable:(_,name)=>async data=>{calls.push({name,data});return {data:session};},
  signInWithCustomToken:async(_,token)=>{signed.push(token);user={getIdTokenResult:async()=>({claims})};},
  onAuthStateChanged:(_,cb)=>{queueMicrotask(()=>cb(user));return ()=>{};}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('shared/pesk-student-auth.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,''),c);
 return {c,session,claims,calls,signed,user:v=>user=v};
}
test('client exchanges server custom token and returns no token to local session storage',async()=>{
 const f=fixture();const r=await f.c.studentSignIn('test','student','secret');assert.equal(r.token,undefined);assert.deepEqual(f.signed,['signed-token']);
 assert.equal(f.calls[0].name,'studentLogin');assert.equal(f.calls[0].data.pw,'secret');
});
test('client verifies signed student identity before calling session server',async()=>{
 const f=fixture();await f.c.studentSignIn('test','student','secret');const expected={roomId:'test',studentNum:1,accountUid:'a',sessionVersion:2};
 await f.c.verifySession(expected);assert.equal(f.calls.at(-1).name,'studentSession');
 for(const patch of [{roomId:'other'},{studentNum:2},{accountUid:'other'},{sessionVersion:7}]){
  const count=f.calls.length;await assert.rejects(()=>f.c.verifySession({...expected,...patch}),e=>e.code==='functions/unauthenticated');assert.equal(f.calls.length,count);
 }
 f.claims.role='teacher';await assert.rejects(()=>f.c.verifySession(expected),e=>e.code==='functions/unauthenticated');
});
test('client waits for auth readiness and rejects missing login',async()=>{
 const f=fixture();await assert.rejects(()=>f.c.verifySession({roomId:'test'}),e=>e.code==='functions/unauthenticated');assert.equal(f.calls.length,0);
});
test('password change signs in with replacement token and returns only safe metadata',async()=>{
 const f=fixture();const r=await f.c.changePassword('test','changed');assert.equal(f.calls[0].name,'studentChangePassword');assert.equal(f.calls[0].data.newPassword,'changed');assert.deepEqual(f.signed,['signed-token']);assert.equal(r.token,undefined);
});
test('client rejects malformed server login before changing Firebase identity',async()=>{
 const f=fixture();f.session.studentNum=0;await assert.rejects(()=>f.c.studentSignIn('test','student','secret'));assert.equal(f.signed.length,0);
});
