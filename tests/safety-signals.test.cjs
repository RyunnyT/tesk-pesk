// 학생 글의 걱정되는 표현 찾기 (shared/safety-signals.js). 문장은 모두 지어낸 것이다.
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shared/safety-signals.js');
const crisis=[
  ['요즘 그냥 죽고 싶어요.','self-harm'],['다 싫고 사라지고 싶다','self-harm'],['나는 없어지고 싶어','self-harm'],
  ['살기 싫어요 선생님','self-harm'],['어제 몰래 자해를 했어요','self-harm'],['나 같은 건 없어도 돼','self-harm'],
  ['태어나지 말았어야 했나 봐요','self-harm'],['차라리 죽어버리고 싶어','self-harm'],
  ['아빠가 어제 저를 때렸어요','violence-received'],['엄마한테 맞아서 멍이 들었어요','violence-received'],
  ['삼촌이 술 먹고 발로 찼어요','violence-received'],['맞아서 다리가 아파요','violence-received'],
  ['반 애들이 저를 따돌려요','bullying'],['쉬는 시간마다 괴롭혀요','bullying'],['형들이 돈을 달라고 협박해요','bullying'],
  ['아무도 나랑 안 놀아줘요','bullying'],['무서워서 학교 가기 싫어요','bullying'],
  ['며칠째 밥을 못 먹었어요','neglect'],['집에 아무도 없어서 밤에 혼자 자요','neglect'],
  ['아저씨가 몸을 만졌는데 비밀로 하라고 했어요','touch']
];
const ordinary=[
  '오늘 급식이 맛있어서 배불러 죽겠다.','친구가 너무 웃겨 죽는 줄 알았다.','계단에서 넘어져서 죽을 뻔했다.',
  '게임에서 내 캐릭터가 죽어서 속상했다.','책 속 주인공의 강아지가 죽어서 슬펐다.','죽을 힘을 다해 달리기를 했다.',
  '동생이랑 레슬링 놀이를 하다가 형이 나를 살짝 쳤다.','엄마가 맛있는 떡볶이를 만들어 주셨다.','아빠랑 축구를 했다.',
  '나는 하늘이 좋다.','오늘 비가 와서 운동장에 못 나갔다.','수학 시험이 어려웠다.','강아지가 귀여워 죽겠다.',
  '친구랑 싸웠지만 금방 화해했다.','밥을 먹고 숙제를 했다.','할머니 댁에 놀러 갔다.','영화에서 악당이 죽었다.',
  '내일은 현장체험학습이다.','피구를 하다가 공에 맞았다.','동생이 내 과자를 먹어서 화가 났다.',
  '선생님께 칭찬을 받았다.','도서관에서 공룡 책을 빌렸다.','줄넘기를 100번 했다.','배고파 죽을 것 같았다.',
  '심심해 죽겠다는 말을 자주 한다.','몬스터를 잡다가 게임 속에서 죽었다.','엄마가 사과를 깎아 주셨다.',
  '오늘은 혼자 학교에 걸어왔다.','시계를 보며 시간을 맞췄다.','운동회에서 이어달리기를 했다.'
];
test('걱정되는 표현을 놓치지 않는다 (20개 중 18개 이상)',()=>{
  const miss=crisis.filter(([t,k])=>!S.scan(t).some(s=>s.key===k));
  assert.ok(miss.length<=2,'놓친 문장: '+miss.map(x=>x[0]).join(' / '));
});
test('평범한 문장은 거의 걸리지 않는다 (30개 중 2개 이하)',()=>{
  const hit=ordinary.filter(t=>S.scan(t).length);
  assert.ok(hit.length<=2,'잘못 걸린 문장: '+hit.join(' / '));
});
test('목록 만들기: 확인한 것은 빠지고, 글이 바뀌어 새 표현이 나오면 다시 뜬다',()=>{
  const w={id:'w1',studentName:'가상',content:'요즘 사라지고 싶어요'};
  const first=S.collect({writings:[w]});
  assert.equal(first.length,1);assert.equal(first[0].kind,'writing');assert.match(first[0].signals[0].match,/사라지고/);
  assert.equal(S.collect({writings:[w],acks:[{sig:first[0].sig}]}).length,0);
  const changed={...w,content:'요즘 사라지고 싶어요. 아빠가 때렸어요'};
  assert.equal(S.collect({writings:[changed],acks:[{sig:first[0].sig}]}).length,1);
  assert.equal(S.collect({writings:[{...w,deleted:true}]}).length,0);
  assert.equal(S.collect({requests:[{id:'r1',reason:'친구가 괴롭혀요 [많이 급해요]',status:'pending'}]})[0].kind,'request');
});
test('상담 신청 긴급도: 새 숫자 필드, 예전 문구',()=>{
  assert.equal(S.urgencyOf({urgency:2}),2);
  assert.equal(S.urgencyOf({reason:'이야기하고 싶어요 [많이 급해요]'}),2);
  assert.equal(S.urgencyOf({reason:'이야기하고 싶어요 [조금 급해요]'}),1);
  assert.equal(S.urgencyOf({reason:'그냥'}),0);
});
