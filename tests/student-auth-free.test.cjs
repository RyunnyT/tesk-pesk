const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../shared/student-auth-free-core.js');
const key=async id=>'k:'+id;

test('Firebase password is always at least 6 characters while students keep 4-character passwords',()=>{
 assert.equal(C.authPassword('1234'),'pesk1:1234');
 assert.ok(C.authPassword('abcd').length>=6);
 assert.equal(C.validNewPassword('abc'),'비밀번호는 4자 이상 입력해주세요.');
 assert.match(C.validNewPassword('123456'),/초기 비밀번호/);
 assert.equal(C.validNewPassword('mypw'),'');
});

test('login keys hide the raw id and are stable; auth emails are unique and in the student domain',async()=>{
 const a=await C.loginKey('kim01'),b=await C.loginKey('kim01'),c=await C.loginKey('kim02');
 assert.equal(a,b);assert.notEqual(a,c);assert.match(a,/^[0-9a-f]{40}$/);assert.ok(!a.includes('kim'));
 const e1=C.newAuthEmail('Room_ABC/1',7),e2=C.newAuthEmail('Room_ABC/1',7);
 assert.notEqual(e1,e2);assert.match(e1,/^room-abc-1-7-[0-9a-f]{10}@students\.tesk-pesk\.firebaseapp\.com$/);
 assert.ok(C.isStudentEmail(e1));assert.ok(!C.isStudentEmail('teacher@gmail.com'));
});

test('email domain matches the rules and the teacher-page guard',()=>{
 const rules=fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8');
 assert.ok(rules.includes("'.*@"+C.STUDENT_EMAIL_DOMAIN.replace(/\./g,'[.]')+"$'"),'firestore.rules isStudentEmail');
 const teacher=fs.readFileSync(path.join(__dirname,'../tesk_teacher_v2.html'),'utf8');
 assert.ok(teacher.includes('@'+C.STUDENT_EMAIL_DOMAIN.replace(/\./g,'\\.')),'teacher onAuthStateChanged guard');
});

test('conversion: every legacy account with a password gets a Firebase user',async()=>{
 const old={1:{id:'a',pw:'1111'},2:{id:'b',pw:'2222',mustChangePassword:true}};
 const p=await C.planAccountSave(old,old,key);
 assert.deepEqual(p.needsUser,['1','2']);assert.deepEqual(p.touched,['1','2']);
 assert.deepEqual(p.keys,{a:'k:a',b:'k:b'});assert.deepEqual(p.dropLoginKeys,[]);
});

test('ordinary saves after conversion touch only what changed',async()=>{
 const old={1:{id:'a',firebaseUid:'u1'},2:{id:'b',firebaseUid:'u2'},3:{id:'c',firebaseUid:'u3'}};
 const next={1:{id:'a',firebaseUid:'u1'},2:{id:'b2',firebaseUid:'u2'},3:{id:'c',firebaseUid:'u3',pw:'123456',mustChangePassword:true}};
 const p=await C.planAccountSave(old,next,key);
 assert.deepEqual(p.needsUser,['3'],'only the reset account gets a new Firebase user');
 assert.deepEqual(p.touched.sort(),['2','3'],'unchanged student 1 keeps its session');
 assert.deepEqual(p.dropLoginKeys,['k:b'],'old login id no longer resolves');
});

test('deleted accounts lose their login and auth documents; swapped ids keep live keys',async()=>{
 const old={1:{id:'a',firebaseUid:'u1'},2:{id:'b',firebaseUid:'u2'}};
 let p=await C.planAccountSave(old,{1:{id:'a',firebaseUid:'u1'}},key);
 assert.deepEqual(p.dropMembers,['u2']);assert.deepEqual(p.dropLoginKeys,['k:b']);
 p=await C.planAccountSave(old,{1:{id:'b',firebaseUid:'u1'},2:{id:'a',firebaseUid:'u2'}},key);
 assert.deepEqual(p.dropLoginKeys,[]);assert.deepEqual(p.touched.sort(),['1','2']);
});

test('invalid saves are refused before any Firebase user is created',async()=>{
 for(const [next,msg] of [
  [{1:{id:'a',pw:'1'}},/4자/],
  [{1:{id:'a',pw:'1111'},2:{id:'a',pw:'2222'}},/같은 아이디/],
  [{1:{id:' a',pw:'1111'}},/아이디/],
  [{0:{id:'a',pw:'1111'}},/번호/],
  [{1:{id:'a'}},/비밀번호를 다시/]
 ])await assert.rejects(C.planAccountSave({},next,key),msg);
});

test('pages route login through the per-class resolver, not the server-only flag',()=>{
 for(const f of ['landing.html','pesk.html','tesk_teacher_v2.html']){
  const s=fs.readFileSync(path.join(__dirname,'..',f),'utf8');
  assert.ok(s.includes('pesk-student-auth-free.js'),f+' loads the free auth module');
  assert.ok((s.match(/window\._studentAuthFor\(/g)||[]).length>=1,f+' consults the per-class resolver');
 }
});
