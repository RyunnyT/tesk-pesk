const test=require('node:test'),assert=require('node:assert/strict'),P=require('../shared/peer-portfolio.js');
const roster=[{num:3,name:'가람'},{num:1,name:'하늘'},{num:2,name:'다온'}];
const row=(num,reflection={},categories={play:[]})=>({studentNum:num,reflection,categories,categoryKeys:Object.keys(categories)});
const round=rows=>({roundId:'r2',roundLabel:'2회차',rows});
test('portfolio includes nonresponders in roster order and uses per-question denominators',()=>{
 const m=P.build(round([row(1,{request:'선생님과 따로 이야기하고 싶어요',belonging:2}),row(3,{notApplicable:['belonging']})]),roster);
 assert.deepEqual(m.cards.map(c=>c.num),[1,2,3]);assert.equal(m.respondents,2);assert.equal(m.missing,1);
 assert.equal(m.requestAnswered,1);assert.equal(m.supportRequests,1);assert.equal(m.belonging.answered,1);assert.equal(m.belonging.notApplicable,1);assert.equal(m.belonging.missing,1);
 assert.equal(m.cards[1].belonging,'응답 없음');assert.equal(m.cards[2].belonging,'그런 상황이 없었어요');
});
test('solitude and multi-select context counts are distinct from absence or relationship labels',()=>{
 const m=P.build(round([row(1,{solitude:'혼자 있고 싶어서 혼자 있었어요',contexts:['쉬는 시간','체육·놀이']}),row(2,{solitude:'두 가지 경우가 모두 있었어요',contexts:['쉬는 시간'],request:'지금은 괜찮아요'})]),roster);
 assert.equal(m.wantedCompany,1);assert.equal(m.solitudeAnswered,2);assert.equal(m.contextAnswered,2);assert.deepEqual(m.contexts.map(c=>c.count),[2,1]);
 assert.equal(m.supportRequests,0);assert.match(m.observations.join(' '),/합계는 학생 수와 다를/);assert.doesNotMatch(m.observations.join(' '),/소외형|고위험|문제 학생/);
});
test('relationships retain same-domain mutuals and unknown peers without merging domains',()=>{
 const m=P.build(round([row(1,{}, {study:[2],play:[3]}),row(2,{}, {study:[],play:[1]})]),roster),a=m.cards[0];
 assert.deepEqual(a.relations.find(d=>d.key==='study').mutual,[]);assert.equal(a.relations.find(d=>d.key==='play').unknown,1);
 assert.equal(m.cards[2].relations[0].mutual,null);
});
test('empty round and optional unanswered requests do not imply no support needs',()=>{
 const m=P.build(round([]),roster);assert.equal(m.respondents,0);assert.equal(m.missing,3);assert.match(m.observations[0],/아직/);
 assert.throws(()=>P.build({roundId:'all'},roster));
 assert.match(P.build(round([row(1)]),roster).observations.join(' '),/요약할 수 없습니다/);
});
test('unmatched rows and duplicate responders cannot inflate class totals',()=>{
 const m=P.build(round([row(1),row(1),row(99,{request:'선생님과 따로 이야기하고 싶어요'})]),roster);
 assert.equal(m.respondents,1);assert.equal(m.supportRequests,0);assert.equal(m.cards.length,3);
});
