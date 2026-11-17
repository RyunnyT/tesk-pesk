// 돈 문서 덮어쓰기 방지 (shared/econ-guard.js)
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../shared/econ-guard.js');
const ref=key=>({path:'classrooms/r1/data/'+key});
function fakeDb(docs){
  const writes=[];
  const txn={get:async r=>({exists:()=>r.path in docs,data:()=>docs[r.path]}),set:(r,d)=>{writes.push([r.path,d]);},update(){},delete(){}};
  return {writes,txn,run:async fn=>{const out=await fn(txn);for(const [p,d] of writes)docs[p]=d;return out;}};
}
test('읽은 rev 에 1을 더해 쓴다 (없던 문서는 1)',async()=>{
  const docs={'classrooms/r1/data/tesk-students':{value:[],rev:4}};
  const db=fakeDb(docs);
  await db.run(async raw=>{const t=G.wrapTxn(raw);await t.get(ref('tesk-students'));await t.get(ref('pesk-deposits'));
    t.set(ref('tesk-students'),{value:[1]});t.set(ref('pesk-deposits'),{value:{}});});
  assert.equal(docs['classrooms/r1/data/tesk-students'].rev,5);
  assert.equal(docs['classrooms/r1/data/pesk-deposits'].rev,1);
});
test('돈 문서가 아니면 건드리지 않는다',async()=>{
  const docs={};const db=fakeDb(docs);
  await db.run(async raw=>{const t=G.wrapTxn(raw);t.set(ref('tesk-settings'),{value:1});});
  assert.equal('rev' in docs['classrooms/r1/data/tesk-settings'],false);
});
test('읽지 않고 쓰면 알린다 (규칙이 거절할 쓰기)',async()=>{
  const before=G.problems.length,docs={};const db=fakeDb(docs);
  const err=console.error;console.error=()=>{};
  try{await db.run(async raw=>{G.wrapTxn(raw).set(ref('tesk-shop'),{value:[]});});}finally{console.error=err;}
  assert.equal(G.problems.length,before+1);assert.match(G.problems.at(-1),/UNREAD: tesk-shop/);
});
test('트랜잭션 없이 돈 문서를 통째로 쓰면 막는다',async()=>{
  const w={_fsRunTxn:async(db,fn)=>fn({get:async()=>({exists:()=>false}),set(){}}),_fsSetDoc:async()=>'ok'};
  G.install(w);
  const err=console.error;console.error=()=>{};
  try{await assert.rejects(w._fsSetDoc(ref('tesk-students'),{value:[]}),/덮어쓸 수 없어요/);}finally{console.error=err;}
  assert.equal(await w._fsSetDoc(ref('tesk-settings'),{value:1}),'ok');
  assert.equal(await w._fsSetDoc(ref('tesk-students'),{x:1},{merge:true}),'ok');
});
test('규칙 파일에 rev 검사가 있다',()=>{
  const rules=require('fs').readFileSync(require('path').join(__dirname,'..','firestore.rules'),'utf8');
  assert.match(rules,/function revOk\(key\)/);
  assert.match(rules,/request\.resource\.data\.get\('rev', 0\) == resource\.data\.get\('rev', 0\) \+ 1/);
  for(const k of G.KEYS)assert.match(rules,new RegExp("'"+k+"'"));
});
