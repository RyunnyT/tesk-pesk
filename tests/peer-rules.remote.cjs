// Rules simulator only: every service lookup is mocked, no student records touched.
const fs=require('node:fs'),assert=require('node:assert/strict');
const base='C:/Users/Choiseungryun/AppData/Roaming/npm/node_modules/firebase-tools/lib/';
const auth=require(base+'auth.js'),{Client}=require(base+'apiv2.js');
(async()=>{
 auth.setActiveAccount({},auth.getGlobalDefaultAccount());
 const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
 const cases=[];
 for(const [label,uid,role,allowed] of [['anonymous',null,'student',false],['student','student','student',false],['other teacher','other','teacher',false],['owner','teacher','teacher',true],['master','admin','master',true]]){
  for(const method of ['get','list','create','update','delete']){
   cases.push({label:label+' '+method,expectation:allowed?'ALLOW':'DENY',request:{path:'/databases/(default)/documents/classrooms/demo/peer-support/u1/entries/n1',method,auth:uid?{uid,token:role==='master'?{email:require('../functions/teacher-access').MASTER_EMAILS[0],email_verified:true}:{}}:null,resource:{data:{observation:'fictional test'}}},resource:{data:{observation:'fictional test'}},functionMocks:[
    {function:'exists',args:[{anyValue:{}}],result:{value:true}},
    {function:'get',args:[{anyValue:{}}],result:{value:{data:{ownerUid:'teacher',role,approved:role==='teacher'}}}}
   ]});
  }
 }
 const result=await api.post('/projects/tesk-pesk:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:cases.map(({label,...c})=>c)}},{skipLog:{body:true,resBody:true}});
 const report={issues:result.body.issues||[],cases:(result.body.testResults||[]).map((r,i)=>({label:cases[i].label,...r}))};
 fs.mkdirSync('output/peer-depth',{recursive:true});fs.writeFileSync('output/peer-depth/rules-tests.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({issues:report.issues,results:report.cases.map(r=>({label:r.label,state:r.state,errors:r.errors}))}));
 assert.equal(report.issues.filter(i=>i.severity==='ERROR').length,0);assert.equal(report.cases.length,cases.length);assert.ok(report.cases.every(r=>r.state==='SUCCESS'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
