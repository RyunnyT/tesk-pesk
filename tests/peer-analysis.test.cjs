const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../shared/peer-analysis.js'),S=require('../shared/peer-survey.js');
const row=(num,categories={},reflection={})=>({studentNum:num,accountUid:'u'+num,categoryKeys:Object.keys(categories),categories,reflection,schemaVersion:3,timeframe:'최근 2주',nominationLimits:{study:3,play:3,support:2}});
const round=rows=>({rows,roundId:'r',responseRate:Math.round(rows.length/3*100)});
test('mutual nomination must be in the same domain; wishes never mean friendship',()=>{
 const p=A.profile(round([row(1,{study:[2],play:[],aspire:[3]}),row(2,{study:[],play:[1]}),row(3,{aspire:[1]})]),1);
 assert.deepEqual(p.domains.find(d=>d.key==='study').mutual,[]);
 assert.deepEqual(p.domains.find(d=>d.key==='play').mutual,[]);
 assert.deepEqual(p.domains.find(d=>d.key==='aspire').mutual,[3]);
});
test('missing self, missing peer and unavailable historical domain are explicit',()=>{
 const p=A.profile(round([row(2,{play:[1]})]),1),d=p.domains.find(d=>d.key==='play');
 assert.equal(p.submitted,false);assert.equal(d.out,null);assert.deepEqual(d.incoming,[2]);assert.equal(d.mutual,null);
 const q=A.profile(round([row(1,{play:[2],study:[]})]),1);
 assert.deepEqual(q.domains.find(d=>d.key==='play').unknown,[2]);assert.equal(q.domains.find(d=>d.key==='support').out,null);
});
test('a missing second response is never a lost friendship or a decline',()=>{
 const old=round([row(1,{play:[2]}),row(2,{play:[1]})]);
 const now=round([row(1,{play:[2]})]);
 const c=A.compare(now,old,1),d=c.domains.find(d=>d.key==='play');
 assert.equal(d.common,0);assert.equal(d.incomingNow,null);assert.deepEqual(d.unconfirmedMutual,[]);assert.deepEqual(d.unknownPeers,[2]);assert.match(c.warnings.join(' '),/응답률/);
});
test('matched reporters expose new and unconfirmed links without combining rounds',()=>{
 const old=round([row(1,{play:[2]}),row(2,{play:[1]}),row(3,{play:[1]})]);
 const now=round([row(1,{play:[3]}),row(2,{play:[]}),row(3,{play:[1]})]);
 const d=A.compare(now,old,1).domains.find(d=>d.key==='play');
 assert.equal(d.common,2);assert.equal(d.incomingBefore,2);assert.equal(d.incomingNow,1);assert.deepEqual(d.newMutual,[3]);assert.deepEqual(d.unconfirmedMutual,[2]);
});
test('changed nomination limits and replaced accounts are excluded from comparisons',()=>{
 const one=row(1,{play:[2]},{belonging:1}),two=row(2,{play:[1]});
 const old=round([one,two]),next=structuredClone(old);next.rows[1].nominationLimits.play=1;
 assert.equal(A.compare(next,old,1).domains.find(d=>d.key==='play').common,0);
 next.rows[0].accountUid='replacement';next.rows[0].reflection.belonging=4;
 assert.deepEqual(A.compare(next,old,1).self,[]);
});
test('not-applicable is distinct from low ability, while old combined help remains evidence',()=>{
 const r=S.reflection({repair:1,notApplicable:['repair'],friendHelp:1,adultHelp:4,help:2,solitude:S.solitude[0]});
 assert.equal(r.repair,null);assert.ok(S.hasReflection({notApplicable:['repair']}));
 const text=S.interpret(r).join(' ');assert.doesNotMatch(text,/갈등 뒤 풀어가는/);assert.match(text,/도움을 요청할 친구/);assert.match(text,/혼자 있는 시간을 원/);
 assert.match(S.evidence(r),/그런 상황이 없었어요/);assert.match(S.evidence(r),/친구나 어른/);
 assert.doesNotMatch(S.form(r),/data-peer-scale="help"/);assert.match(S.form(r),/data-peer-scale="friendHelp"/);
});
test('new fields and not applicable do not create invented change scores',()=>{
 const prev=round([row(1,{}, {help:3,repair:2})]),now=round([row(1,{}, {friendHelp:1,adultHelp:4,notApplicable:['repair']})]);
 assert.deepEqual(A.compare(now,prev,1).self,[]);
});
test('support entries validate dates and preserve only bounded expected fields',()=>{
 const raw={id:'n1',studentNum:1,date:'2026-09-19',observation:'a'.repeat(1700),unsafe:'ignored'};
 assert.equal(A.supportEntry(raw).observation.length,1600);assert.equal(A.supportEntry(raw).unsafe,undefined);
  assert.throws(()=>A.supportEntry({...raw,observation:''}));assert.throws(()=>A.supportEntry({...raw,reviewDate:'2026-09-18'}));
  assert.throws(()=>A.supportEntry({...raw,date:'2026-02-31'}));
});
test('support saves deduplicate retries and do not overwrite other observations',async()=>{
 const docs={},entry={id:'n1',studentNum:1,date:'2026-09-19',observation:'점심 활동에서 학생이 도움을 요청함'};let writes=0;
 const runTransaction=async(_,fn)=>fn({get:async ref=>({exists:()=>!!docs[ref],data:()=>docs[ref]}),set:(ref,value)=>{docs[ref]=structuredClone(value);writes++;}});
 await A.saveSupport({db:{},ref:'n1',runTransaction,entry});await A.saveSupport({db:{},ref:'n1',runTransaction,entry});
 await A.saveSupport({db:{},ref:'n2',runTransaction,entry:{...entry,id:'n2',outcome:'학생이 원하는 활동을 확인함'}});
 assert.equal(writes,2);assert.equal(docs.n1.observation,entry.observation);assert.equal(docs.n2.outcome,'학생이 원하는 활동을 확인함');
});
test('support save failure rejects without a false success result',async()=>{
 await assert.rejects(A.saveSupport({db:{},ref:'n1',entry:{id:'n1',studentNum:1,date:'2026-09-19',plan:'개별 면담'},runTransaction:async()=>{throw new Error('permission-denied');}}),/permission-denied/);
});
