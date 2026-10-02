// Only synthetic resources and mocked lookups are sent to the Rules simulator.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const auth=require(path.join(base,'auth.js')),{Client}=require(path.join(base,'apiv2.js'));
const account={id:'student',firebaseUid:'student-a',studentNum:1,accountUid:'account-a',sessionVersion:2,authRevision:'rev-a',passwordHash:'server-only',mustChangePassword:false};
const student={uid:'student-a',token:{role:'student',roomId:'test',studentNum:1,accountUid:'account-a',sessionVersion:2,authRevision:'rev-a',loginId:'student'}};
const teacher={uid:'teacher',token:{email:'teacher@example.test',email_verified:true}};
const cases=[],root='/databases/(default)/documents/',entry={id:'w',studentNum:1,accountUid:'account-a',title:'글',content:'본문',feedback:'교사 의견',readAt:'2026-09-30',revision:2};
function check(label,location,method,identity,allow,{old,next={},acc=account,exists=true,parent=entry,approved=true}={}){
 const data={role:'teacher',approved,ownerUid:'teacher',value:{1:acc},...parent};
 const c={label,expectation:allow?'ALLOW':'DENY',request:{path:root+location,method,auth:identity,resource:{data:next}},functionMocks:[
  {function:'exists',args:[{anyValue:{}}],result:{value:exists}},
  {function:'get',args:[{exactValue:'/databases/%28default%29/documents/classrooms/test/data/pesk-writings/items/w'}],result:{value:{data:parent}}},
  ...['get','getAfter'].map(functionName=>({function:functionName,args:[{anyValue:{}}],result:{value:{data}}}))
 ]};if(old!==undefined)c.resource={data:old};cases.push(c);
}
const publicDoc=['classCodes/123456','classrooms/test/info/meta','master/notices'];
publicDoc.forEach(p=>check('entry lookup '+p,p,'get',null,true));
const shared=['tesk-students','tesk-shop','tesk-settings','pesk-deposits','pesk-portfolios','pesk-peer-survey','pesk-writings'];
for(const key of shared){
 const p='classrooms/test/data/'+key;
 check('anonymous read blocked '+key,p,'get',null,false);
 check('valid student room read '+key,p,'get',student,true);
 check('other room blocked '+key,p,'get',{...student,token:{...student.token,roomId:'other'}},false);
 check('revoked teacher blocked '+key,p,'get',teacher,false,{approved:false});
 check('owner reads '+key,p,'get',teacher,true);
}
for(const key of ['tesk-accounts','tesk-counsels','tesk-friends','tesk-activities']){
 for(const method of ['get','list','create','update','delete']){
  check('student private denied '+key+method,'classrooms/test/data/'+key,method,student,false);
  check('anonymous private denied '+key+method,'classrooms/test/data/'+key,method,null,false);
 }
 check('owner private allowed '+key,'classrooms/test/data/'+key,'get',teacher,true);
}
for(const field of ['id','firebaseUid','accountUid','sessionVersion','authRevision'])check('live account change revokes '+field,'classrooms/test/data/tesk-students','get',student,false,{acc:{...account,[field]:field==='sessionVersion'?99:'changed'}});
for(const change of [{pw:'reset'},{mustChangePassword:true},{disabled:true},{authRevision:''}])check('reset/restricted session '+JSON.stringify(change),'classrooms/test/data/tesk-students','get',student,false,{acc:{...account,...change}});
check('deleted account rejects','classrooms/test/data/tesk-students','get',student,false,{acc:{}});
for(const key of ['tesk-students','pesk-deposits','pesk-portfolios','pesk-peer-survey','pesk-checklists']){
 check('compatibility own room write '+key,'classrooms/test/data/'+key,'update',student,true);
 check('anonymous write blocked '+key,'classrooms/test/data/'+key,'update',null,false);
 check('other room write blocked '+key,'classrooms/test/data/'+key,'update',{...student,token:{...student.token,roomId:'other'}},false);
}
check('legacy writing aggregate write blocked','classrooms/test/data/pesk-writings','update',student,false);
const p='classrooms/test/data/pesk-writings/items/w';
const newEntry={...entry,feedback:'',readAt:'',status:'pending',topic:'',feedbackDate:''};delete newEntry.revision;
check('new own writing',p,'create',student,true,{next:newEntry});
check('create cannot insert teacher feedback',p,'create',student,false,{next:{...newEntry,feedback:'fake'}});
check('create cannot impersonate other student',p,'create',student,false,{next:{...newEntry,studentNum:2,accountUid:'account-b'}});
const edited={...entry,content:'수정',revision:3,needsRevisionReview:true};
check('edit own reviewed writing preserves feedback',p,'update',student,true,{old:entry,next:edited});
check('cannot edit other writing',p,'update',student,false,{old:{...entry,studentNum:2,accountUid:'account-b'},next:edited});
for(const patch of [{feedback:'fake'},{readAt:'fake'},{studentNum:2},{accountUid:'account-b'},{needsRevisionReview:false},{revision:9},{rubric:{score:100}}])check('protected writing fields '+JSON.stringify(patch),p,'update',student,false,{old:entry,next:{...edited,...patch}});
check('own writing tombstone',p,'update',student,true,{old:entry,next:{id:'w',studentNum:1,accountUid:'account-a',deleted:true}});
check('cannot revive deleted writing',p,'update',student,false,{old:{...entry,deleted:true},next:edited});
check('cannot delete writing directly',p,'delete',student,false,{old:entry});
check('cannot remove pending review without edit',p,'update',student,false,{old:{...entry,needsRevisionReview:true},next:{...entry,needsRevisionReview:false}});
check('student cannot self-publish without teacher request',p,'update',student,false,{old:entry,next:{...entry,anthology:{status:'published'}}});
const requested={...entry,anthology:{status:'student-review',edits:[],basis:'basis'}};
check('student approves requested anthology',p,'update',student,true,{old:requested,next:{...requested,anthology:{...requested.anthology,status:'published',by:'student',text:'본문'}}});
check('student cannot change teacher anthology edits',p,'update',student,false,{old:requested,next:{...requested,anthology:{...requested.anthology,status:'published',edits:['fake']}}});
check('archive exact own previous revision',p+'/revisions/2','create',student,true,{next:{...entry,archivedAt:'now'}});
check('archive cannot invent feedback',p+'/revisions/2','create',student,false,{next:{...entry,feedback:'fake',archivedAt:'now'}});
check('student cannot overwrite revision',p+'/revisions/2','update',student,false,{old:entry,next:entry});
for(const method of ['get','create','update','delete'])check('login limiter private '+method,'_studentAuthLimits/x',method,student,false);
(async()=>{
 auth.setActiveAccount({},auth.getGlobalDefaultAccount());const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
 const source=fs.readFileSync('firestore.student-auth.rules','utf8');
 const result=await api.post('/projects/tesk-pesk:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases.map(({label,...c})=>c)}},{skipLog:{body:true,resBody:true}});
 const report={checkedAt:new Date().toISOString(),issues:result.body.issues||[],cases:(result.body.testResults||[]).map((r,i)=>({label:cases[i].label,...r}))};
 fs.mkdirSync('output/student-auth',{recursive:true});fs.writeFileSync('output/student-auth/rules-tests.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({total:report.cases.length,passed:report.cases.filter(c=>c.state==='SUCCESS').length,issues:report.issues,failures:report.cases.filter(c=>c.state!=='SUCCESS').map(c=>({label:c.label,state:c.state,error:c.error,errors:c.errors}))},null,2));
 assert.equal(report.cases.length,cases.length);assert.ok(report.cases.every(c=>c.state==='SUCCESS'));assert.ok(!report.issues.some(i=>i.severity==='ERROR'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
