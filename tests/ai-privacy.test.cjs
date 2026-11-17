// AI로 나가는 글의 이름 가리기 (shared/ai-privacy.js). 이름은 모두 지어낸 것이다.
const test=require('node:test'),assert=require('node:assert/strict');
const AiPrivacy=require('../shared/ai-privacy.js');
const roster=[{num:1,name:'김하늘'},{num:2,name:'박다온'},{num:3,name:'이서준'},{num:12,name:'남궁민서'},{num:17,name:'최서준'},{num:20,name:'한솔'}];
const m=AiPrivacy.forRoster(roster,{selfNum:3,teacherName:'홍길순'});

test('성+이름 전체를 가명으로 바꾼다',()=>{
  assert.equal(m.mask('박다온과 김하늘이 같이 놀았다'),'학생 02과 학생 01이 같이 놀았다');
  assert.equal(m.mask('남궁민서가 발표함'),'학생 12가 발표함');
});
test('본인은 정한 표현으로 바꾼다',()=>{
  assert.equal(m.mask('이서준은 책을 읽었다'),'이 학생은 책을 읽었다');
  assert.equal(AiPrivacy.forRoster(roster,{selfNum:3,selfAlias:'○○'}).mask('이서준은 책을 읽었다'),'○○은 책을 읽었다');
});
test('이름만 + 조사·호칭',()=>{
  for(const [input,want] of [
    ['다온이는 웃었다','학생 02이는 웃었다'],['다온이가 말했다','학생 02이가 말했다'],['다온아 고마워','학생 02아 고마워'],
    ['다온이한테 줬다','학생 02이한테 줬다'],['다온은 조용하다','학생 02은 조용하다'],['다온의 가방','학생 02의 가방'],
    ['다온이랑 놀았다','학생 02이랑 놀았다'],['다온을 도왔다','학생 02을 도왔다'],['다온, 이리 와','학생 02, 이리 와'],
    ['"다온" 이라고 불렀다','"학생 02" 이라고 불렀다']
  ])assert.equal(m.mask(input),want,input);
});
test('일반 낱말과 같은 이름은 단독으로는 두고, 조사가 붙거나 성이 붙으면 가린다',()=>{
  assert.equal(m.mask('오늘 하늘 색이 예뻤다'),'오늘 하늘 색이 예뻤다');
  assert.equal(m.mask('하늘이가 도와줬다'),'학생 01이가 도와줬다');
  assert.equal(m.mask('김하늘 학생'),'학생 01 학생');
  assert.equal(m.mask('가을 하늘은 높다'),'가을 학생 01은 높다','조사가 붙은 일반 낱말은 가려진다 — 놓치는 것보다 낫다');
});
test('다른 낱말 속에 들어 있는 글자는 건드리지 않는다',()=>{
  assert.equal(m.mask('다온도가 높다'),'다온도가 높다');
  assert.equal(m.mask('한솔방울'),'한솔방울');
  assert.equal(m.mask('한솔이 웃었다'),'학생 20이 웃었다');
});
test('이름만 같은 학생은 번호가 빠른 쪽 가명으로 하고 기록한다',()=>{
  assert.equal(m.mask('서준이가 뛰었다'),'이 학생이가 뛰었다');
  assert.ok(m.ambiguous.some(a=>a.name==='서준'&&a.nums.join()==='3,17'));
});
test('교사 이름',()=>{
  assert.equal(m.mask('홍길순 선생님께 말씀드림'),'담임 선생님께 말씀드림');
});
test('되돌리기: 가명만 실제 이름으로, 본인 표현은 그대로',()=>{
  assert.equal(m.unmask('학생 02와 학생 12가 도왔다. 이 학생은 고마워했다. 학생 99는 없다.'),'박다온와 남궁민서가 도왔다. 이 학생은 고마워했다. 학생 99는 없다.');
});
test('객체 안의 문자열을 모두 바꾸고 키와 숫자는 그대로 둔다',()=>{
  const out=m.maskDeep({김하늘:'김하늘',n:3,list:['박다온이 옴',{note:'다온이는 감'}],nil:null});
  assert.deepEqual(out,{김하늘:'학생 01',n:3,list:['학생 02이 옴',{note:'학생 02이는 감'}],nil:null});
  assert.deepEqual(m.unmaskDeep({a:['학생 01']}),{a:['김하늘']});
});
test('남은 이름 찾기',()=>{
  assert.deepEqual(m.leaks(m.mask('김하늘과 다온이가 서준이를 불렀다')),[]);
  assert.deepEqual(m.leaks('김하늘과 다온이가 왔다').sort(),['김하늘','다온']);
  assert.deepEqual(m.leaks('오늘 하늘이 맑다'),['하늘'],'조사가 붙으면 이름으로 본다');
  assert.deepEqual(m.leaks('파란 하늘 아래'),[]);
});
test('빈 값과 명단이 없을 때',()=>{
  assert.equal(m.mask(''),'');assert.equal(m.mask(null),'');
  const none=AiPrivacy.forRoster([]);
  assert.equal(none.mask('김하늘'),'김하늘');assert.equal(none.size,0);
});
test('열거되지 않는 값도 옮긴다 (검증 함수의 dropped)',()=>{
  const v={a:'김하늘'};Object.defineProperty(v,'dropped',{value:2});
  const out=m.maskDeep(v);assert.equal(out.dropped,2);assert.deepEqual(Object.keys(out),['a']);
});
