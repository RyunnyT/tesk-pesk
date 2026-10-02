// Firebase Rules simulator only. Every DB lookup is mocked; no real documents are accessed.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const auth=require(path.join(base,'auth.js')),{Client}=require(path.join(base,'apiv2.js'));
const MASTER=require('../functions/teacher-access').MASTER_EMAILS[0];
const teacher={uid:'audit-teacher',email:'teacher@example.test',email_verified:true};
const master={uid:'audit-admin',email:MASTER,email_verified:true};
const cases=[],prefix='/databases/(default)/documents/';
function check(label,location,method,identity,allow,{old={},next={},role='teacher',approved=true,owner='audit-teacher',exists=true}={}){
 const {uid,...token}=identity||{};
 const data={role,approved,ownerUid:owner};
 cases.push({label,expectation:allow?'ALLOW':'DENY',request:{path:prefix+location,method,auth:identity?{uid,token}:null,resource:{data:next}},resource:{data:old},functionMocks:[
  {function:'exists',args:[{anyValue:{}}],result:{value:exists}},
  ...['get','getAfter'].map(fn=>({function:fn,args:[{anyValue:{}}],result:{value:{data}}}))
 ]});
}
const profile={uid:teacher.uid,email:teacher.email,displayName:'가상 교사',photoURL:'',role:'teacher',approved:false,createdAt:'test',lastLoginAt:'test'};
check('new teacher awaits approval','users/'+teacher.uid,'create',teacher,true,{next:profile,exists:false});
for(const [field,value] of [['role','master'],['approved',true],['uid','someone-else'],['email',MASTER],['approvedBy','self']]){
 check('new teacher cannot set '+field,'users/'+teacher.uid,'create',teacher,false,{next:{...profile,[field]:value},exists:false});
 check('existing teacher cannot alter '+field,'users/'+teacher.uid,'update',teacher,false,{old:profile,next:{...profile,[field]:value}});
}
for(const field of ['role','approved','uid','email']){const next={...profile};delete next[field];check('cannot remove '+field,'users/'+teacher.uid,'update',teacher,false,{old:profile,next});}
for(const field of ['displayName','photoURL','lastLoginAt','lastRoomId','lastClassCode','lastSchoolCode','lastClassId','lastRoomUpdatedAt'])check('self preference '+field,'users/'+teacher.uid,'update',teacher,true,{old:profile,next:{...profile,[field]:'updated'}});
check('cannot change createdAt','users/'+teacher.uid,'update',teacher,false,{old:profile,next:{...profile,createdAt:'changed'}});
check('self cannot edit another user','users/other','update',teacher,false,{old:profile,next:{...profile,approved:true}});
check('anonymous cannot create profile','users/'+teacher.uid,'create',null,false,{next:profile});
check('trusted master bootstrap with no profile','users/'+master.uid,'create',master,true,{next:{uid:master.uid,role:'master',approved:true},exists:false});
check('trusted master approves teacher','users/'+teacher.uid,'update',master,true,{old:profile,next:{...profile,approved:true}});
check('trusted master revokes teacher','users/'+teacher.uid,'update',master,true,{old:{...profile,approved:true},next:profile});
check('trusted master lists profiles','users/audit-teacher','list',master,true);
for(const identity of [teacher,{...master,email_verified:false},{uid:'spoof',role:'master'},null]){
 check('profile master claim cannot grant authority '+JSON.stringify(identity),'master/ads','update',identity,false,{role:'master'});
}
check('verified configured master can administer without profile','master/ads','update',master,true,{exists:false});
for(const location of ['classrooms/audit-room/data/tesk-counsels','classrooms/audit-room/peer-support/audit-student/entries/e']){
 for(const method of ['get','list','create','update','delete']){
  check('approved owner '+method+' '+location,location,method,teacher,true);
  check('revoked owner '+method+' '+location,location,method,teacher,false,{approved:false});
  check('missing profile owner '+method+' '+location,location,method,teacher,false,{exists:false});
  check('foreign teacher '+method+' '+location,location,method,{...teacher,uid:'other'},false);
  check('student '+method+' '+location,location,method,{uid:'student',role:'student',roomId:'audit-room'},false,{role:'student'});
  check('anonymous '+method+' '+location,location,method,null,false);
  check('fake profile master '+method+' '+location,location,method,{...teacher,uid:'other'},false,{role:'master'});
  check('verified master '+method+' '+location,location,method,master,true,{exists:false});
 }
}
const meta='classrooms/audit-room/info/meta',owned={ownerUid:teacher.uid,className:'가상 학급'};
check('approved teacher creates own room',meta,'create',teacher,true,{next:owned});
check('pending teacher cannot create room',meta,'create',teacher,false,{approved:false,next:owned});
check('teacher cannot create for another owner',meta,'create',teacher,false,{next:{ownerUid:'other'}});
check('owner edits room description',meta,'update',teacher,true,{old:owned,next:{...owned,className:'수정'}});
check('owner cannot reassign room',meta,'update',teacher,false,{old:owned,next:{ownerUid:'other'}});
check('teacher cannot claim legacy ownerless room',meta,'update',teacher,false,{owner:null,old:{ownerUid:null},next:owned});
check('master can assign legacy room',meta,'update',master,true,{owner:null,old:{ownerUid:null},next:owned});
const code='classCodes/AUDIT',mapping={ownerUid:teacher.uid,roomId:'audit-room',className:'가상 학급'};
check('owner creates code after room creation',code,'create',teacher,true,{next:mapping});
check('teacher cannot point code to foreign room',code,'create',teacher,false,{next:mapping,owner:'other'});
check('teacher cannot create code with foreign owner',code,'create',teacher,false,{next:{...mapping,ownerUid:'other'}});
check('owner updates code label',code,'update',teacher,true,{old:mapping,next:{...mapping,className:'수정'}});
check('foreign code takeover blocked',code,'update',teacher,false,{old:{...mapping,ownerUid:'other'},next:mapping});
check('own code cannot retarget different room',code,'update',teacher,false,{old:mapping,next:{...mapping,roomId:'other'}});
check('own code cannot assign other owner',code,'update',teacher,false,{old:mapping,next:{...mapping,ownerUid:'other'}});
check('revoked owner cannot update code',code,'update',teacher,false,{approved:false,old:mapping,next:mapping});
check('room no longer owned: code update blocked',code,'update',teacher,false,{owner:'other',old:mapping,next:mapping});
check('legacy code claim requires master',code,'update',teacher,false,{old:{roomId:'audit-room'},next:mapping});
check('master repairs legacy code',code,'update',master,true,{old:{roomId:'audit-room'},next:mapping});
check('master deletes code',code,'delete',master,true,{old:mapping});
check('teacher cannot delete code',code,'delete',teacher,false,{old:mapping});
check('anonymous code lookup preserved',code,'get',null,true,{old:mapping});
(async()=>{
 const filename=process.env.RULES_SOURCE||'firestore.rules',source=fs.readFileSync(filename,'utf8');
 // Phase one intentionally preserves current student flows. These are known remaining risks.
 if(source.includes('isPeskWritableDataKey'))for(const key of ['tesk-accounts','tesk-students','pesk-peer-survey','pesk-writings']){
  check('remaining legacy public get '+key,'classrooms/audit-room/data/'+key,'get',null,true);
  check('remaining legacy public update '+key,'classrooms/audit-room/data/'+key,'update',null,true);
 }
 auth.setActiveAccount({},auth.getGlobalDefaultAccount());
 const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
 const result=await api.post('/projects/tesk-pesk:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases.map(({label,...c})=>c)}},{skipLog:{body:true,resBody:true}});
 const report={source:filename,checkedAt:new Date().toISOString(),issues:result.body.issues||[],cases:(result.body.testResults||[]).map((r,i)=>({label:cases[i].label,expectation:cases[i].expectation,...r}))};
 fs.mkdirSync('output/permissions-hardening',{recursive:true});
 fs.writeFileSync(process.env.RULES_REPORT||'output/permissions-hardening/rules-tests.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({source:filename,total:report.cases.length,success:report.cases.filter(r=>r.state==='SUCCESS').length,issues:report.issues,failures:report.cases.filter(r=>r.state!=='SUCCESS')},null,2));
 assert.equal(report.cases.length,cases.length);assert.ok(report.cases.every(r=>r.state==='SUCCESS'));assert.ok(!report.issues.some(i=>i.severity==='ERROR'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
