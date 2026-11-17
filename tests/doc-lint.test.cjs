// 교사 도우미 결과 검사 (shared/doc-lint.js) · 날짜 계산 (shared/doc-prompts.js)
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../shared/doc-lint.js'),P=require('../shared/doc-prompts.js');
const codes=(k,t,o)=>D.check(k,t,o).map(x=>x.code);
test('요일이 달력과 다르면 찾고 바로잡는다',()=>{
  assert.ok(codes('letter','일시: 2026. 4. 10.(목)').includes('weekday'));
  assert.ok(!codes('letter','일시: 2026. 4. 10.(금)').includes('weekday'));
  const f=D.fixWeekdays('2026. 4. 10.(목)부터 2026. 11. 17.(화)까지');
  assert.equal(f.fixed,1);assert.equal(f.text,'2026. 4. 10.(금)부터 2026. 11. 17.(화)까지');
});
test('입력에 없던 조항·문서번호·전화번호·금액을 찾는다',()=>{
  const input={title:'현장체험학습',content:'12월 4일 과학관',rels:['가상초등학교-1234(2026. 11. 2.)']};
  const c=codes('gongmun','1. 관련: 가상초등학교-1234(2026. 11. 2.)\n2. 학교안전법 제12조에 따라 실시\n문의: 062-123-4567\n비용: 15,000원\n끝.',{input});
  assert.equal(c.filter(x=>x==='invented-number').length,2,'관련 문서번호는 입력에 있으니 괜찮고, 조항·전화번호는 지어낸 것');
  assert.ok(c.includes('invented-money'));
});
test('공문 끝, 마크다운, 품의 합계, 항목 번호',()=>{
  assert.ok(codes('gongmun','본문입니다.').includes('no-end'));
  assert.ok(!codes('gongmun','본문입니다.\n붙임  계획 1부.  끝.').includes('no-end'));
  assert.ok(codes('letter','**굵게**').includes('markdown'));
  const items=[{sum:13500},{sum:10000}];
  assert.ok(codes('pumi','다. 소요예산: 금25,000원\n끝.',{input:{items}}).includes('sum-mismatch'));
  assert.ok(!codes('pumi','다. 소요예산: 금23,500원\n끝.',{input:{items}}).includes('sum-mismatch'));
  assert.ok(codes('plan','1. 목적\n3. 일정\n').includes('numbering'));
  assert.ok(codes('plan','2. 운영\n  가. 기간\n  다. 장소\n').includes('numbering'));
  assert.ok(D.check('letter','일시: [확인 필요: 날짜]').some(x=>x.code==='check-needed'));
});
test('프롬프트: 입력 날짜의 요일을 계산해 넣고, 특정 교육청 예시를 쓰지 않는다',()=>{
  const ctx={school:'가상초',className:'4학년 2반',teacher:'담임',date:'2026. 11. 17.(화)',today:'2026-11-17'};
  const g=P.gongmun({title:'체험학습',content:'12월 4일 실시',detail:'',rels:[],atts:[]},ctx);
  assert.match(g,/12월 4일 → 2026\. 12\. 4\.\(금\)/);
  assert.doesNotMatch(g,/광주광역시/);
  assert.match(g,/절대 지어내지 않고/);
  assert.deepEqual(P.dates('2월 30일','2026-11-17'),[]);
  assert.equal(P.dates('1월 5일','2026-11-17')[0].iso,'2027-01-05','지난 날짜는 다음 해로 본다');
});
