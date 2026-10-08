// 무료(Spark) 학생 인증 규칙 검사 — Firebase Rules 모의 검사 API만 쓴다(배포·실제 문서 접근 없음).
// 실행: node tests/free-auth.rules.remote.cjs   (firebase login 된 계정 필요)
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
const memberA={studentNum:1,accountUid:'acc-a',loginId:'kim01',sessionVersion:3,mustChangePassword:false,pwChanged:true,disabled:false};
function world(o={}){
 return {
  users:{teacher:{role:'teacher',approved:true},'other-teacher':{role:'teacher',approved:true},...(o.users||{})},
  meta:o.meta===undefined?{ownerUid:'teacher',studentAuth:'firebase'}:o.meta,
  members:o.members||{'stu-a':memberA},
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
const D='classrooms/room/data/';

// ── 전환 전 학급: 지금까지와 같다 ──
check('legacy anonymous reads roster',D+'tesk-students','get',ids.anon,true,{w:legacy});
check('legacy anonymous writes roster',D+'tesk-students','update',ids.anon,true,{w:legacy});
check('legacy anonymous reads accounts (unchanged risk)',D+'tesk-accounts','get',ids.anon,true,{w:legacy});
check('legacy counsels stay private',D+'tesk-counsels','get',ids.anon,false,{w:legacy});
check('legacy anonymous cannot write teacher keys',D+'tesk-settings','update',ids.anon,false,{w:legacy});
check('legacy writing item create',D+'pesk-writings/items/w','create',ids.anon,true,{w:legacy,next:{title:'x'}});

// ── 전환한 학급: 로그인 전 ──
check('anonymous code lookup','classCodes/123456','get',ids.anon,true);
check('anonymous meta lookup','classrooms/room/info/meta','get',ids.anon,true);
check('anonymous login lookup get','classrooms/room/studentLogins/abc','get',ids.anon,true);
check('anonymous login lookup list','classrooms/room/studentLogins/abc','list',ids.anon,false);
check('anonymous login lookup write','classrooms/room/studentLogins/abc','create',ids.anon,false,{next:{email:'x'}});
check('student cannot write login lookup','classrooms/room/studentLogins/abc','update',ids.student,false,{old:{email:'a'},next:{email:'b'}});
for(const key of ['tesk-students','pesk-deposits','tesk-accounts','pesk-peer-survey']){
 check('secured anonymous read denied '+key,D+key,'get',ids.anon,false);
 check('secured anonymous write denied '+key,D+key,'update',ids.anon,false);
}
check('secured anonymous writing read denied',D+'pesk-writings/items/w','get',ids.anon,false);
check('secured anonymous writing create denied',D+'pesk-writings/items/w','create',ids.anon,false,{next:{title:'x'}});

// ── 전환한 학급: 학생 ──
for(const key of ['tesk-students','tesk-shop','pesk-deposits','pesk-portfolios','pesk-peer-survey','pesk-quiz-progress','pesk-quiz-summary']){
 check('student reads '+key,D+key,'get',ids.student,true);
}
for(const key of ['tesk-students','pesk-deposits','pesk-portfolios','pesk-checklists','tesk-counsel-requests'])check('student writes '+key,D+key,'update',ids.student,true);
for(const key of ['tesk-accounts','tesk-counsels','tesk-friends','tesk-activities']){
 check('student private read denied '+key,D+key,'get',ids.student,false);
 check('student private write denied '+key,D+key,'update',ids.student,false);
}
check('student cannot write teacher settings',D+'tesk-settings','update',ids.student,false);
check('student cannot write legacy writing aggregate',D+'pesk-writings','update',ids.student,false);
check('deleted/reset member denied',D+'tesk-students','get',ids.student,false,{w:world({members:{}})});
check('disabled member denied',D+'tesk-students','get',ids.student,false,{w:world({members:{'stu-a':{...memberA,disabled:true}}})});
check('must-change-password member denied',D+'tesk-students','get',ids.student,false,{w:world({members:{'stu-a':{...memberA,mustChangePassword:true}}})});
check('student of another room denied',D+'tesk-students','get',ids.studentB,false);
check('non-student account with member doc denied',D+'tesk-students','get',ids.google,false,{w:world({members:{'google-user':memberA}})});

// ── 학생 인증 문서 ──
const A='classrooms/room/studentAuth/stu-a';
const pwChange={...memberA,sessionVersion:4,mustChangePassword:false,pwChanged:true,passwordUpdatedAt:'now'};
check('student reads own auth doc',A,'get',ids.student,true);
check('student cannot read other auth doc','classrooms/room/studentAuth/stu-b','get',ids.student,false);
check('student cannot list auth docs',A,'list',ids.student,false);
check('anonymous cannot read auth doc',A,'get',ids.anon,false);
check('student records own password change',A,'update',ids.student,true,{old:memberA,next:pwChange});
check('student password change from must-change state',A,'update',ids.student,true,{old:{...memberA,mustChangePassword:true,pwChanged:false},next:pwChange,w:world({members:{'stu-a':{...memberA,mustChangePassword:true}}})});
check('student cannot skip session numbers',A,'update',ids.student,false,{old:memberA,next:{...pwChange,sessionVersion:9}});
for(const [f,v] of [['studentNum',2],['accountUid','acc-b'],['loginId','x'],['disabled',true]])check('student cannot change '+f,A,'update',ids.student,false,{old:memberA,next:{...pwChange,[f]:v}});
check('disabled student cannot re-enable by password change',A,'update',ids.student,false,{old:{...memberA,disabled:true},next:{...pwChange,disabled:true}});
check('student cannot create auth doc',A,'create',ids.student,false,{next:memberA,w:world({members:{}})});
check('student cannot delete own auth doc',A,'delete',ids.student,false,{old:memberA});
check('owner creates auth doc','classrooms/room/studentAuth/new','create',ids.teacher,true,{next:memberA});
check('owner deletes auth doc',A,'delete',ids.teacher,true,{old:memberA});
check('other teacher cannot create auth doc','classrooms/room/studentAuth/new','create',ids.otherTeacher,false,{next:memberA});

// ── 교사 ──
check('owner reads accounts',D+'tesk-accounts','get',ids.teacher,true);
check('owner writes accounts',D+'tesk-accounts','update',ids.teacher,true);
check('owner writes login lookup','classrooms/room/studentLogins/abc','create',ids.teacher,true,{next:{email:'x'}});
check('other teacher cannot read accounts',D+'tesk-accounts','get',ids.otherTeacher,false);
check('unapproved owner denied',D+'tesk-accounts','get',ids.teacher,false,{w:world({users:{teacher:{role:'teacher',approved:false}}})});
const metaOn={ownerUid:'teacher',studentAuth:'firebase'},metaOff={ownerUid:'teacher'};
check('owner converts room','classrooms/room/info/meta','update',ids.teacher,true,{old:metaOff,next:metaOn,w:legacy});
check('owner cannot switch secure room back','classrooms/room/info/meta','update',ids.teacher,false,{old:metaOn,next:metaOff});
check('owner edits secured meta',  'classrooms/room/info/meta','update',ids.teacher,true,{old:metaOn,next:{...metaOn,className:'새 이름'}});
check('student cannot convert meta','classrooms/room/info/meta','update',ids.student,false,{old:metaOff,next:metaOn,w:legacy});

// ── 학생 계정으로 교사 프로필 만들기 차단 ──
const profile=(uid,email)=>({uid,email,displayName:'',photoURL:'',role:'teacher',approved:false,createdAt:'t',lastLoginAt:'t'});
check('student email cannot create teacher profile','users/stu-a','create',ids.student,false,{next:profile('stu-a',ids.student.token.email),w:world({users:{}})});
check('teacher can still request approval','users/google-user','create',ids.google,true,{next:profile('google-user','someone@gmail.com'),w:world({users:{}})});
check('student email is never an approved teacher',D+'tesk-accounts','get',ids.student,false,{w:world({users:{'stu-a':{role:'teacher',approved:true}},meta:{ownerUid:'stu-a',studentAuth:'firebase'}})});

// ── 전환한 학급의 글 ──
const W=D+'pesk-writings/items/w';
const entry={id:'w',studentNum:1,accountUid:'acc-a',title:'글',content:'본문',feedback:'교사 의견',readAt:'2026-09-30',revision:2};
const fresh={id:'w',studentNum:1,accountUid:'acc-a',title:'글',content:'본문',feedback:'',readAt:'',feedbackDate:'',status:'pending',topic:''};
check('student creates own writing',W,'create',ids.student,true,{next:fresh});
check('student cannot impersonate',W,'create',ids.student,false,{next:{...fresh,studentNum:2,accountUid:'acc-b'}});
check('student cannot insert feedback',W,'create',ids.student,false,{next:{...fresh,feedback:'칭찬'}});
const edited={...entry,content:'수정',revision:3,needsRevisionReview:true};
check('student edits own writing',W,'update',ids.student,true,{old:entry,next:edited});
check('student cannot edit other writing',W,'update',ids.student,false,{old:{...entry,studentNum:2,accountUid:'acc-b'},next:{...edited,studentNum:2,accountUid:'acc-b'}});
check('student cannot change feedback',W,'update',ids.student,false,{old:entry,next:{...edited,feedback:'가짜'}});
check('student cannot delete writing',W,'delete',ids.student,false,{old:entry});
check('student archives own revision',W+'/revisions/2','create',ids.student,true,{next:{...entry,archivedAt:'now'},w:world({item:entry})});
check('owner writes writing feedback',W,'update',ids.teacher,true,{old:entry,next:{...entry,feedback:'좋아요'}});

// ── 모험 기록 (학생별 문서 + 반 요약) ──
const Q=D+'pesk-quiz-progress/students/1';
check('student reads quiz record',Q,'get',ids.student,true);
check('student writes quiz record',Q,'update',ids.student,true,{old:{value:{}},next:{value:{xp:1}}});
check('student writes classmate quiz record (boss reward)',D+'pesk-quiz-progress/students/2','update',ids.student,true,{old:{value:{}},next:{value:{xp:1}}});
check('student writes class quiz summary',D+'pesk-quiz-summary','update',ids.student,true);
check('student cannot write old quiz aggregate',D+'pesk-quiz-progress','update',ids.student,false);
check('student of another room denied quiz record',Q,'update',ids.studentB,false,{old:{value:{}},next:{value:{xp:1}}});
check('secured anonymous quiz record denied',Q,'get',ids.anon,false);
check('legacy anonymous writes quiz record',Q,'update',ids.anon,true,{w:legacy,old:{value:{}},next:{value:{xp:1}}});
check('legacy anonymous writes quiz summary',D+'pesk-quiz-summary','update',ids.anon,true,{w:legacy});
check('legacy anonymous cannot write old quiz aggregate',D+'pesk-quiz-progress','update',ids.anon,false,{w:legacy});
check('owner writes old quiz aggregate',D+'pesk-quiz-progress','update',ids.teacher,true);
check('owner deletes quiz record',Q,'delete',ids.teacher,true,{old:{value:{}}});
check('writing rules do not open quiz paths',D+'pesk-avatars/students/1','update',ids.student,false);

(async()=>{
 const source=fs.readFileSync(process.env.RULES_SOURCE||'firestore.rules','utf8');
 auth.setActiveAccount({},auth.getGlobalDefaultAccount());
 const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
 const result=await api.post('/projects/tesk-pesk:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases.map(({label,...c})=>c)}},{skipLog:{body:true,resBody:true}});
 const rows=(result.body.testResults||[]).map((r,i)=>({label:cases[i].label,expectation:cases[i].expectation,state:r.state,debug:r.debugMessages}));
 const failures=rows.filter(r=>r.state!=='SUCCESS');
 fs.mkdirSync('output/free-auth',{recursive:true});
 fs.writeFileSync('output/free-auth/rules-tests.json',JSON.stringify({checkedAt:new Date().toISOString(),issues:result.body.issues||[],rows},null,2));
 console.log(JSON.stringify({total:rows.length,passed:rows.length-failures.length,issues:(result.body.issues||[]).map(i=>i.description+' @'+(i.sourcePosition?.line||'')),failures},null,2));
 assert.equal(rows.length,cases.length);assert.equal(failures.length,0);assert.ok(!(result.body.issues||[]).some(i=>i.severity==='ERROR'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
