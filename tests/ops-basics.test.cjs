// 운영 기반: 공지 보이기 조건, 오류 문구 정리, 사용량 세기
const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../shared/site-notice.js'),E=require('../shared/error-report.js'),U=require('../shared/usage-meter.js');
test('공지: 켜진 것만, 기간 안에만, 학생은 학생용만, 닫은 공지는 다시 안 뜬다',()=>{
  const n={active:true,text:'점검 안내',updatedAt:'a'};
  assert.equal(N.visible(n),true);
  assert.equal(N.visible({...n,active:false}),false);
  assert.equal(N.visible({...n,until:'2020-01-01'}),false);
  assert.equal(N.visible(n,{student:true}),false);
  assert.equal(N.visible({...n,students:true},{student:true}),true);
  assert.equal(N.visible(n,{dismissed:'a'}),false);
});
test('오류 문구: 따옴표 속 내용·숫자·이름처럼 보이는 말을 지운다',()=>{
  const c=E.clean('학생 "김하늘"의 글 12345를 저장하지 못함');
  assert.doesNotMatch(c,/김하늘|12345/);
  const p=E.payload('save',{name:'FirebaseError',code:'permission-denied',message:"Missing 'tesk-students' doc"});
  assert.equal(p.code,'permission-denied');assert.doesNotMatch(p.msg,/tesk-students/);
});
test('사용량: 읽기·쓰기를 세고 한도 오류를 알린다',async()=>{
  const store=new Map(),w={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},addEventListener(){},
    _fsGetDoc:async()=>({}),_fsGetDocs:async()=>({docs:[1,2,3]}),_fsSetDoc:async()=>{},_fsOnSnapshot:(r,next)=>{next({});return()=>{};},
    _fsRunTxn:async(db,fn)=>fn({get:async()=>({}),set(){},update(){},delete(){}})};
  let hit=0;U.install(w,{onExhausted:()=>hit++});
  await w._fsGetDoc();await w._fsGetDocs();await w._fsSetDoc();w._fsOnSnapshot({},()=>{});
  await w._fsRunTxn({},async t=>{await t.get();t.set().set();});
  const u=U.today();assert.equal(u.reads,1+3+1+1);assert.equal(u.writes,1+2);
  w.__usageMeter=false;w._fsGetDoc=async()=>{throw Object.assign(new Error('quota'),{code:'resource-exhausted'});};
  U.install(w,{onExhausted:()=>hit++});
  await assert.rejects(w._fsGetDoc());assert.equal(hit,1);
});
