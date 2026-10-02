const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../shared/writing-proofread.js');
const text='오늘 친구랑 공원에 갔다. 너무 재미있엇다. 다음에 또 가고싶다';

test('원문에 있는 짧은 구간만 위치와 함께 받는다',()=>{
  const r=P.validate(JSON.stringify({edits:[
    {from:'재미있엇다',to:'재미있었다',type:'맞춤법',reason:'받침'},
    {from:'가고싶다',to:'가고 싶다',type:'띄어쓰기',reason:'띄어 써요'}
  ]}),text,1);
  assert.equal(r.edits.length,2);assert.equal(r.dropped,0);
  assert.equal(text.slice(r.edits[0].start,r.edits[0].end),'재미있엇다');
  assert.equal(P.apply(text,r.edits,['e0','e1']),'오늘 친구랑 공원에 갔다. 너무 재미있었다. 다음에 또 가고 싶다');
});

test('고른 제안만 반영하고 원문은 그대로 둔다',()=>{
  const r=P.validate({edits:[{from:'재미있엇다',to:'재미있었다'},{from:'가고싶다',to:'가고 싶다'}]},text,1);
  assert.equal(P.apply(text,r.edits,['e1']),'오늘 친구랑 공원에 갔다. 너무 재미있엇다. 다음에 또 가고 싶다');
  assert.equal(P.apply(text,r.edits,[]),text);
});

test('원문에 없는 구간·내용을 바꾸는 제안·문장을 보태는 제안은 버린다',()=>{
  const r=P.validate({edits:[
    {from:'놀이터에',to:'공원에'},                                  // 원문에 없음
    {from:'친구랑',to:'가족과 함께'},                               // 내용 변경(거리 초과)
    {from:'갔다.',to:'갔다. 날씨가 맑았다.'},                        // 문장 보태기
    {from:'너무 재미있엇다. 다음에 또 가고싶다',to:'정말 즐거웠고 또 가고 싶다'} // 1단계 길이 초과
  ]},text,1);
  assert.equal(r.edits.length,0);assert.equal(r.dropped,4);
});

test('2단계는 조금 더 넓게 고치되 문장 수는 바꾸지 못한다',()=>{
  const t='나는 밥을 먹고 그리고 학교에 갔다.';
  const ok=P.validate({edits:[{from:'먹고 그리고',to:'먹고',type:'반복'}]},t,2);
  assert.equal(ok.edits.length,1);
  const bad=P.validate({edits:[{from:'먹고 그리고',to:'먹었다. 그리고'}]},t,2);
  assert.equal(bad.edits.length,0);
});

test('같은 구간이 여러 번이면 겹치지 않게 차례로 잡는다',()=>{
  const t='할수있다. 정말 할수있다.';
  const r=P.validate({edits:[{from:'할수있다',to:'할 수 있다'},{from:'할수있다',to:'할 수 있다'}]},t,1);
  assert.deepEqual(r.edits.map(e=>e.start),[0,9]);
  assert.equal(P.apply(t,r.edits,['e0','e1']),'할 수 있다. 정말 할 수 있다.');
});

test('코드 블록이나 앞뒤 설명이 붙은 응답도 읽고, 형식이 틀리면 알린다',()=>{
  assert.equal(P.validate('```json\n{"edits":[]}\n```',text,1).edits.length,0);
  assert.equal(P.validate('결과입니다 {"edits":[{"from":"가고싶다","to":"가고 싶다"}]} 끝',text,1).edits.length,1);
  assert.throws(()=>P.validate('{"items":[]}',text,1),/PROOFREAD_FORMAT/);
});

test('표시용 조각은 원문을 빠짐없이 이어 붙인다',()=>{
  const r=P.validate({edits:[{from:'재미있엇다',to:'재미있었다'}]},text,1);
  const seg=P.segments(text,r.edits);
  assert.equal(seg.map(s=>s.text??s.edit.from).join(''),text);
  assert.ok(P.prompt(text,1).includes('INPUT_TEXT'));assert.ok(!P.prompt(text,1).includes('호응·연결·반복은'));
});
