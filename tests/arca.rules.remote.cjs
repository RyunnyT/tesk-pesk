// 🧪 아르카(베타) 서버 저장 규칙 검사 — Firebase Rules 모의 검사 API만 쓴다(배포·실제 문서 접근 없음).
// 실행: node tests/arca.rules.remote.cjs   (firebase login 된 계정 필요, free-auth.rules.remote.cjs 와 같은 틀)
// arca-save·arca-log/students/{번호}: 전환 학급 학생은 자기 번호만, rev 는 정확히 1씩, 지우기는 선생님만.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const auth=require(path.join(base,'auth.js')),{Client}=require(path.join(base,'apiv2.js'));
const ROOT='/databases/(default)/documents/',MOCK='/databases/%28default%29/documents/';
const ids={
 teacher:{uid:'teacher',token:{email:'teacher@example.test',email_verified:true}},
 otherTeacher:{uid:'other-teacher',token:{email:'other@example.test',email_verified:true}},
 student:{uid:'stu-a',token:{email:'room-1-ab12@students.tesk-pesk.firebaseapp.com',email_verified:false}},
 studentB:{uid:'stu-b',token:{email:'room-2-cd34@students.tesk-pesk.firebaseapp.com',email_verified:false}},
 google:{uid:'google-user',token:{email:'someone@gmail.com',email_verified:true}},
 anon:null
};
const memberB={studentNum:2,accountUid:'acc-b',loginId:'lee02',sessionVersion:1,mustChangePassword:false,pwChanged:true,disabled:false};
const memberA={studentNum:1,accountUid:'acc-a',loginId:'kim01',sessionVersion:3,mustChangePassword:false,pwChanged:true,disabled:false};
function world(o={}){
 return {
  users:{teacher:{role:'teacher',approved:true},'other-teacher':{role:'teacher',approved:true},...(o.users||{})},
  meta:o.meta===undefined?{ownerUid:'teacher',studentAuth:'firebase'}:o.meta,
  members:o.members||{'stu-a':memberA,'stu-b':memberB},
  item:o.item
 };
}
function mocks(w){
 const out=[],add=(p,data)=>{
  out.push({function:'exists',args:[{exactValue:MOCK+p}],result:{value:data!=null}});
  if(data!=null)out.push({function:'get',args:[{exactValue:MOCK+p}],result:{value:{data}}});
 };
 for(const uid of ['teacher','other-teacher','stu-a','stu-b','google-user'])add('users/'+uid,w.users[uid]);
 add('classrooms/room/info/meta',w.meta);
 for(const uid of ['teacher','other-teacher','stu-a','stu-b','google-user'])add('classrooms/room/studentAuth/'+uid,w.members[uid]);
 add('classrooms/room/data/pesk-writings/items/w',w.item);
 return out;
}
const cases=[];
function check(label,location,method,who,allow,{old,next={},w=world()}={}){
 const c={label,expectation:allow?'ALLOW':'DENY',request:{path:ROOT+location,method,auth:who,resource:{data:next}},functionMocks:mocks(w)};
 if(old!==undefined)c.resource={data:old};
 cases.push(c);
}
const legacy=world({meta:{ownerUid:'teacher'}});
const S='classrooms/room/data/arca-save/students/', L='classrooms/room/data/arca-log/students/';
const ok=(rev)=>({json:'{"solved":3}',rev,at:1,solved:3});
// ── 전환한 학급 ──
check('student reads own save',S+'1','get',ids.student,true);
check('student reads own log',L+'1','get',ids.student,true);
check('student cannot read other save',S+'2','get',ids.student,false);
check('student creates own save rev 1',S+'1','create',ids.student,true,{next:ok(1)});
check('student cannot create with rev 2',S+'1','create',ids.student,false,{next:ok(2)});
check('student updates own save rev+1',S+'1','update',ids.student,true,{old:ok(3),next:ok(4)});
check('stale device update denied (same rev)',S+'1','update',ids.student,false,{old:ok(4),next:ok(4)});
check('skip rev denied',S+'1','update',ids.student,false,{old:ok(3),next:ok(5)});
check('student cannot write other number',S+'2','update',ids.student,false,{old:ok(3),next:ok(4)});
check('student B writes own number 2',L+'2','update',ids.studentB,true,{old:ok(1),next:ok(2)});
check('json must be string',S+'1','update',ids.student,false,{old:ok(1),next:{json:{a:1},rev:2}});
check('rev must be int',S+'1','update',ids.student,false,{old:ok(1),next:{json:'x',rev:'2'}});
check('student cannot delete',S+'1','delete',ids.student,false,{old:ok(3)});
check('teacher reads all',L+'2','get',ids.teacher,true);
check('teacher deletes',S+'1','delete',ids.teacher,true,{old:ok(3)});
check('other teacher denied',L+'1','get',ids.otherTeacher,false);
check('anonymous denied in secured room',S+'1','get',ids.anon,false);
check('google user denied',S+'1','get',ids.google,false);
// ── 전환 전 학급(학생 Firebase 로그인 없음): 지금 Pesk 학생 문서와 같은 수준 ──
check('legacy anonymous creates rev 1',S+'3','create',ids.anon,true,{w:legacy,next:ok(1)});
check('legacy anonymous updates rev+1',L+'3','update',ids.anon,true,{w:legacy,old:ok(1),next:ok(2)});
check('legacy rev skip denied',L+'3','update',ids.anon,false,{w:legacy,old:ok(1),next:ok(3)});
check('legacy anonymous cannot delete',S+'3','delete',ids.anon,false,{w:legacy,old:ok(1)});
// ── 모험 기록 규칙은 그대로 ──
check('quiz progress unchanged for student','classrooms/room/data/pesk-quiz-progress/students/2','update',ids.student,true,{next:{value:{}}});

(async()=>{
 const source=fs.readFileSync(process.env.RULES_SOURCE||'firestore.rules','utf8');
 auth.setActiveAccount({},auth.getGlobalDefaultAccount());
 const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
 const result=await api.post('/projects/tesk-pesk:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases.map(({label,...c})=>c)}},{skipLog:{body:true,resBody:true}});
 const rows=(result.body.testResults||[]).map((r,i)=>({label:cases[i].label,expectation:cases[i].expectation,state:r.state,debug:r.debugMessages}));
 const failures=rows.filter(r=>r.state!=='SUCCESS');
 fs.mkdirSync('output/arca-rules',{recursive:true});
 fs.writeFileSync('output/arca-rules/rules-tests.json',JSON.stringify({checkedAt:new Date().toISOString(),issues:result.body.issues||[],rows},null,2));
 console.log(JSON.stringify({total:rows.length,passed:rows.length-failures.length,issues:(result.body.issues||[]).map(i=>i.description+' @'+(i.sourcePosition?.line||'')),failures},null,2));
 assert.equal(rows.length,cases.length);assert.equal(failures.length,0);assert.ok(!(result.body.issues||[]).some(i=>i.severity==='ERROR'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
