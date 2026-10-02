const test=require('node:test'),assert=require('node:assert/strict'),RC=require('../shared/record-check.js');
const codes=(t,o)=>RC.lint(t,o).map(i=>i.code);

test('school year starts in March', ()=>{
 assert.equal(RC.schoolYear(new Date(2026,1,28)),2025);
 assert.equal(RC.schoolYear(new Date(2026,2,1)),2026);
 assert.equal(RC.schoolYear(new Date(2026,11,31)),2026);
});

test('clean NEIS-style sentence has no issues', ()=>{
 assert.deepEqual(RC.lint('모둠 활동에서 역할을 나누고 일정을 관리하며 친구들의 의견을 조율함. 저학년을 대상으로 한 독서 안내 활동에 꾸준히 참여함.'),[]);
 assert.deepEqual(RC.lint(''),[]);
});

test('forbidden items are errors', ()=>{
 assert.ok(codes('교내 글짓기에서 최우수상을 받음.').includes('award'));
 assert.ok(codes('교외 과학 경진대회에 참가함.').includes('outside-contest'));
 assert.ok(codes('토익 시험을 준비함.').includes('lang-test'));
 assert.ok(codes('한자능력검정시험 5급에 합격함.').includes('certificate'));
 assert.ok(codes('수학 학원에서 배운 방법을 설명함.').includes('private-ed'));
 assert.ok(codes('의사인 아버지의 영향으로 과학에 관심을 가짐.').includes('parent-status'));
 const first=RC.lint('영어 학원에서 배운 표현을 사용함.')[0];
 assert.equal(first.level,'error');
});

test('style checks are warnings', ()=>{
 assert.ok(codes('발표를 잘합니다.').includes('ending'));
 assert.ok(codes('엄마와 함께 책을 읽음.').includes('parent-word'));
 assert.ok(codes('반에서 가장 빨리 문제를 해결함.').includes('ranking'));
 assert.ok(codes('✨ 발표에 적극 참여함.').includes('symbol'));
 assert.ok(codes('PPT 자료를 만들어 발표함.').includes('english'));
 assert.ok(!codes('Hello 표현을 익힘.',{fieldKey:'subj_english'}).includes('english'));
});

test('student name and given-name address are flagged', ()=>{
 assert.ok(codes('김지원 학생은 성실함.',{studentName:'김지원'}).includes('student-name'));
 assert.ok(codes('지원이는 발표를 즐김.',{studentName:'김지원'}).includes('student-name'));
 assert.ok(!codes('친구를 지원하는 활동에 참여함.',{studentName:'김지원'}).includes('student-name'));
});

test('graduate school is not mistaken for private academy', ()=>{
 assert.ok(!codes('대학원').includes('private-ed'));
});

test('grade bands pick the right subjects', ()=>{
 const keys=b=>RC.recordFields(b).map(f=>f.key);
 assert.equal(RC.gradeBand(1),'1-2');assert.equal(RC.gradeBand(4),'3-4');assert.equal(RC.gradeBand(6),'5-6');assert.equal(RC.gradeBand(null),'5-6');
 assert.equal(RC.gradeFromClassName('4학년 2반'),4);assert.equal(RC.gradeFromClassName('우리 반'),null);
 assert.ok(keys('5-6').includes('subj_practical'));
 assert.ok(!keys('3-4').includes('subj_practical')&&keys('3-4').includes('subj_english'));
 assert.ok(keys('1-2').includes('subj_integ_joy')&&!keys('1-2').includes('subj_english')&&!keys('1-2').includes('subj_autonomy'));
 for(const b of ['1-2','3-4','5-6']){const k=keys(b);assert.equal(k[0],'cea_auto_club');assert.equal(k.at(-1),'comprehensive');}
 assert.equal(RC.recordFields('5-6').length,14);
 assert.equal(RC.recordFields('5-6').find(f=>f.key==='cea_career').limitBytes,2100);
});

test('repeated sentences across students are found, own sentences are not', ()=>{
 const idx=RC.buildSentenceIndex([
  {num:1,key:'comprehensive',text:'맡은 일을 끝까지 성실히 수행하는 책임감이 돋보임. 발표를 즐김.'},
  {num:2,key:'comprehensive',text:'맡은 일을 끝까지  성실히 수행하는 책임감이 돋보임.'},
  {num:3,key:'subj_korean',text:'독서 후 생각을 논리적으로 정리함.'}]);
 const r=RC.findRepeats('맡은 일을 끝까지 성실히 수행하는 책임감이 돋보임. 발표를 즐김.',1,idx);
 assert.equal(r.length,1);assert.deepEqual(r[0].nums,['2']);
 assert.deepEqual(RC.findRepeats('독서 후 생각을 논리적으로 정리함.',3,idx),[]);
});

test('names are masked before AI, ordinary words stay', ()=>{
 assert.equal(RC.maskName('김하늘 학생과 하늘이는 하늘을 봄.','김하늘'),'○○ 학생과 ○○이는 하늘을 봄.');
 assert.equal(RC.maskName('하늘아, 발표해 볼까?','김하늘'),'○○아, 발표해 볼까?');
 assert.equal(RC.maskName('파란 하늘을 그림','김하늘'),'파란 하늘을 그림');
 assert.ok(RC.lint('○○는 발표함.').some(i=>i.code==='mask'));
});

test('note area suggestions respect the grade band', ()=>{
 assert.deepEqual(RC.suggestAreas('분수 문제를 친구에게 설명해 줌',['subj_math','comprehensive']).sort(),['comprehensive','subj_math']);
 assert.ok(RC.suggestAreas('리코더 연주를 연습함').includes('subj_music'));
 assert.ok(!RC.suggestAreas('영어 노래를 부름',['subj_korean']).length);
 assert.deepEqual(RC.suggestAreas(''),[]);
});
