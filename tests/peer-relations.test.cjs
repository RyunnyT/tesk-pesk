// 가상 학급 8명으로 관계 지도·무리·또래 지위·사회성 평정·학부모 문장을 확인한다.
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../shared/peer-relations.js');
const roster=[1,2,3,4,5,6,7,8].map(n=>({num:n,name:['','가온','나래','다인','라온','마루','바다','사랑','아라'][n]}));
const row=(n,c)=>({studentNum:n,categories:{study:[],play:[],support:[],leader:[],aspire:[],discomfort:[],...c}});
// 1·2·3 은 서로 친한 무리, 4 는 1 을 일방으로 좋아함, 5 는 여러 명이 불편해함, 6 은 아무도 고르지 않음
const rows=[
  row(1,{play:[2,3],study:[4]}),
  row(2,{play:[1,3],discomfort:[5]}),
  row(3,{support:[1,2],leader:[1]}),
  row(4,{play:[1],study:[1],discomfort:[5]}),
  row(5,{play:[1],discomfort:[4]}),
  row(6,{aspire:[1],discomfort:[5]}),
  row(7,{play:[8],discomfort:[5]}),
  row(8,{play:[7]})
];
const name=n=>roster.find(s=>s.num===n).name;

test('pair relations describe who relates to whom',()=>{
  assert.equal(R.pair(rows,1,2).type,'서로 친한 친구');
  assert.equal(R.pair(rows,1,4).type,'서로 학습 파트너');
  assert.equal(R.pair(rows,4,1).type,'서로 학습 파트너');
  assert.equal(R.pair(rows,6,1).type,'내가 가까워지고 싶어 함');
  assert.equal(R.pair(rows,5,4).type,'서로 불편한 관계');
  assert.equal(R.pair(rows,5,1).type,'내가 좋아함(일방)');
  assert.equal(R.pair(rows,1,3).type,'서로 친한 친구');   // 놀이 ↔ 마음 나눔도 친한 관계
  assert.equal(R.pair(rows,2,5).type,'내가 불편해함');
  assert.equal(R.pair(rows,1,6).type,'상대가 가까워지고 싶어 함');
  assert.equal(R.pair(rows,6,7),null);
});

test('class analysis finds the close group, statuses and isolation',()=>{
  const a=R.analyze(rows,roster);
  assert.deepEqual(a.groups,[[1,2,3]]);
  const s1=a.students.get(1),s5=a.students.get(5),s6=a.students.get(6);
  assert.deepEqual(s1.close.sort(),[2,3]);assert.equal(s1.groups.length,1);
  assert.equal(s1.leaderIn,1);assert.equal(s1.status,'popular');
  assert.equal(s5.negIn,4);assert.equal(s5.status,'rejected');
  assert.equal(s6.posIn,0);assert.equal(s6.isolated,true);
  assert.equal(a.students.get(7).close[0],8);
  // 관계는 강한 순서
  assert.equal(s1.relations[0].tone,'close');
});

test('too few respondents never produce a status label',()=>{
  const a=R.analyze(rows.slice(0,3),roster);
  assert.equal(a.students.get(1).status,'insufficient');assert.equal(a.students.get(6).isolated,false);
});

test('teacher social-skill rating scores strengths and needs',()=>{
  const rating=R.normalizeRating({studentNum:5,scores:{'cooperation.0':4,'cooperation.1':4,'selfControl.0':1,'selfControl.1':2,'empathy.0':9},note:' 메모 '});
  assert.equal(rating.scores['empathy.0'],undefined);assert.equal(rating.note,'메모');
  const s=R.skillScores(rating);
  assert.deepEqual(s.strengths,['협력']);assert.deepEqual(s.needs,['자기조절']);assert.equal(s.rated,2);
});

test('parent report names friends but never the peers who reported discomfort',()=>{
  const a=R.analyze(rows,roster);
  const rep=R.parentReport(a.students.get(5),{nameOf:name,studentName:'마루',rating:{scores:{'selfControl.0':1,'selfControl.1':1}}});
  const all=JSON.stringify(rep);
  for(const n of [2,4,6,7])assert.ok(!rep.conflictText.includes(name(n)));
  assert.match(rep.conflictText,/4명/);
  assert.ok(rep.home.some(h=>h.includes('숨 고르는')));
  const r1=R.parentReport(a.students.get(1),{nameOf:name,studentName:'가온',rating:null});
  assert.match(r1.relationLines[0],/나래, 다인과 서로를 친한 친구로/);
  assert.match(r1.groupsText,/나래, 다인/);
  assert.equal(R.josa('하늘','와','과'),'하늘과');assert.equal(R.josa('가온','는','은'),'가온은');assert.equal(R.josa('나래','를','을'),'나래를');
  assert.ok(!/확인 질문|물어보/.test(all));
});
