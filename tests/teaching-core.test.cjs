const test=require('node:test'),assert=require('node:assert/strict'),C=require('../shared/teaching-core.js');
const result=raw=>C.examResult({num:1,name:'하늘',totalQ:10,...raw});
test('score-only is not perfect, zeros and missing results remain distinct',()=>{
 const r=result({scoreRaw:'40'});assert.equal(r.score,40);assert.equal(r.wrongKnown,false);assert.equal(r.level,'');assert.doesNotMatch(r.comment,/완벽/);
 assert.equal(result({scoreRaw:'0'}).took,true);assert.equal(result({wrongRaw:'0'}).score,100);assert.equal(result({}).entryState,'missing');assert.equal(result({absent:true}).entryState,'absent');
});
test('exam inputs reject impossible, malformed and contradictory data, deduplicate wrongs',()=>{
 assert.equal(result({wrongRaw:'2,2,3'}).score,80);for(const r of [{wrongRaw:'11'},{wrongRaw:'2x'},{scoreRaw:'101'},{totalQ:0},{absent:true,scoreRaw:'0'}])assert.throws(()=>result(r));
});
test('class mean uses entered scores and question denominators use known item outcomes',()=>{
 const s=C.examSummary({totalQ:10,results:[result({scoreRaw:'40'}),result({wrongRaw:'2,3'}),result({absent:true}),result({})]});assert.equal(s.average,60);assert.equal(s.scored,2);assert.equal(s.known,1);assert.equal(s.questions[1].wrong,1);
});
test('question metadata must be unique, bounded, and complete to confirm',()=>{
 assert.throws(()=>C.questions([{no:1,confirmed:true}],2));assert.throws(()=>C.questions([{no:1},{no:1}],2));assert.equal(C.questions([{no:1,text:'1+1',answer:'2',skill:'덧셈',confirmed:true}],2)[0].confirmed,true);
});
test('writing feedback cites actual text and requests one actionable revision',()=>{
 const w={content:'친구가 기다려 주었다.'},r={quote:'기다려 주었다',strength:'행동을 구체적으로 썼어요.',nextStep:'그때 느낀 마음을 한 문장 보태세요.',question:'어떤 마음이 들었니?',feedback:'친구의 행동이 잘 보여요.'};assert.doesNotThrow(()=>C.validateWriting(r,w));assert.throws(()=>C.validateWriting({...r,quote:'없는 말'},w));assert.match(C.writingPrompt(w),/행동 하나/);assert.notEqual(C.signature(w),C.signature({...w,content:'달라진 글'}));
});
test('twin questions require exact source set and answer/explanation',()=>{
 const qs=[{no:3}],x={sourceNo:3,question:'문제',answer:'정답',explanation:'풀이'};assert.equal(C.validateTwins({items:[x]},qs).length,1);assert.throws(()=>C.validateTwins({items:[{...x,sourceNo:5}]},qs));assert.throws(()=>C.validateTwins({items:[{...x,answer:''}]},qs));
});
test('counsel mood never creates risk; dates and evidence are checked',()=>{
 const r=C.counsel({studentNum:1,date:'2026-09-20',mood:'불안',content:'쉬는 시간에 혼자 있었다.',voice:'같이 놀고 싶어요',state:'followup'});assert.equal(r.risk,null);assert.equal(r.state,'followup');assert.throws(()=>C.counsel({...r,reviewDate:'2026-02-31'}));assert.throws(()=>C.counsel({...r,reviewDate:'2026-09-01'}));
 const x={quote:'같이 놀고 싶어요',known:'함께 놀기를 원한다고 말했다.',unknown:'원하는 활동을 확인해야 한다.',question:'어떤 놀이를 하고 싶니?',action:'학생이 원하는 참여 방법을 물어보세요.',followUp:'다음 쉬는 시간의 경험을 물어보세요.'};assert.doesNotThrow(()=>C.validateCounsel(x,r));assert.throws(()=>C.validateCounsel({...x,quote:'없는말'},r));assert.throws(()=>C.validateCounsel({...x,known:'우울증이다.'},r));assert.doesNotMatch(C.counselPrompt({...r,studentName:'김비밀'}),/김비밀/);
});
test('counsel prep and cumulative review AI need real quotes and reject diagnosis words',()=>{
 const r=C.counsel({studentNum:1,date:'2026-10-01',voice:'친구가 놀려서 속상해요',state:'active'});
 const prep={quote:'친구가 놀려서',todo:['상황을 끝까지 듣기'],opening:'요즘 어때?',questions:['언제 그랬니?'],closing:'무엇을 도와줄까?',avoid:'바로 판단하기'};
 assert.deepEqual(C.validateCounselPrep(prep,r).todo,['상황을 끝까지 듣기']);
 assert.throws(()=>C.validateCounselPrep({...prep,quote:'없는 말'},r));assert.throws(()=>C.validateCounselPrep({...prep,todo:['우울증 검사 권유']},r));assert.throws(()=>C.validateCounselPrep({...prep,questions:[]},r));
 const review={quote:'짝 활동이 재미있었다',change:'놀림 이야기가 줄었다',kept:'짝 활동',todo:['짝 활동 확인'],questions:['쉬는 시간은 어땠니?'],nextFocus:'놀림이 다시 있었는지'};
 assert.throws(()=>C.validateCounselReview(review,r),/누적/);
 const withSession={...r,sessions:[{date:'2026-10-02',note:'짝 활동이 재미있었다고 말함'}]};
 assert.equal(C.validateCounselReview(review,withSession).change,'놀림 이야기가 줄었다');
 assert.doesNotMatch(C.counselPrepPrompt({...withSession,studentName:'김비밀'}),/김비밀/);assert.match(C.counselReviewPrompt(withSession),/짝 활동이 재미있었다고 말함/);
});
