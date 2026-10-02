const test=require('node:test'),assert=require('node:assert/strict'),S=require('../shared/pesk-subjects.js');
const raw=(extra={})=>({id:'q1',subject:'korean',grade:3,term:1,unitNo:2,unitName:'낱말',level:1,question:'반대 뜻은?',options:['크다','작다','밝다','길다'],answerIndex:1,explain:'뜻을 비교해요.',enabled:true,...extra});
test('teacher questions validate required fields and reject ambiguous options',()=>{assert.equal(S.validate(raw()).grade,3);assert.throws(()=>S.validate(raw({options:['가','가','나','다']})));assert.throws(()=>S.validate(raw({grade:2})));assert.throws(()=>S.validate(raw({answerIndex:4})));});
test('custom subjects are opt-in and scope never crosses grade, term, unit or difficulty',()=>{
  assert.equal(S.enabled({}).length,2);assert.deepEqual(S.enabled({mathOn:false,englishOn:false,scienceOn:true}).map(x=>x.id),['science']);
  const rows=[raw(),raw({id:'q2',grade:4}),raw({id:'q3',term:2}),raw({id:'q4',unitNo:3}),raw({id:'q5',level:2}),raw({id:'q6',enabled:false})];
  assert.deepEqual(S.pool(rows,{grade:3,term:1,difficulty:1,subjectUnits:{korean:[2]}},'korean').map(x=>x.id),['q1']);
});
test('subject questions feed the same answer and explanation contract as math',()=>{
  const q=S.make([raw()],{grade:3,term:1},'korean','s',{makeRng:()=>()=>0});assert.equal(q.answer,'작다');assert.equal(q.bankId,'q1');assert.equal(q.unitNo,2);assert.equal(S.make([],{grade:3,term:1},'science','s',{makeRng:()=>()=>0}),null);
});
test('question store writes one document and restores without touching other class data',async()=>{
  const docs=new Map();let seq=0;const ref=path=>({path,id:path.split('/').at(-1)});
  const api={_db:{},_fsCollection:(_, ...p)=>ref(p.join('/')),_fsDoc:(base,id)=>ref(base.path+'/'+(id||'new'+(++seq))),_fsSetDoc:async(r,d)=>docs.set(r.path,structuredClone(d)),_fsUpdateDoc:async(r,d)=>docs.set(r.path,{...docs.get(r.path),...d}),_fsGetDocs:async r=>({docs:[...docs].filter(([p])=>p.startsWith(r.path+'/')).map(([p,d])=>({id:p.split('/').at(-1),data:()=>d}))})};
  const store=S.store(api,'room');const id=await store.save(raw());assert.match([...docs.keys()][0],/pesk-question-bank\/items\/new1$/);
  const backup=await store.load();assert.equal(backup[0].id,id);await store.save(raw({question:'추가 문제'}));await store.restore(backup);
  const rows=await store.load();assert.equal(rows.filter(x=>x.enabled).length,1);assert.equal(rows.length,2);
  await assert.rejects(()=>store.restore([raw({id:'../bad'})]));
});
