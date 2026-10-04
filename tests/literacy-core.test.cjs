const test=require('node:test'),assert=require('node:assert/strict'),L=require('../shared/literacy-core.js');
const ai=(o={})=>({
  title:'세종대왕이 만든 한글',
  paragraphs:[
    '우리가 매일 쓰는 한글은 누가 만들었을까? 옛날에는 우리말을 적을 글자가 없어서 사람들은 한자를 빌려 썼어. 한자는 배우기 어려워서 대부분의 백성은 글을 몰랐지.',
    '세종대왕은 글을 몰라 억울한 일을 당하는 백성을 안타깝게 여겼어. 그래서 누구나 쉽게 배울 수 있는 글자를 만들고 훈민정음이라고 이름 붙였어.',
    '자음은 소리를 낼 때 혀나 입술 같은 발음 기관의 모양을 본떠 만들었어. 모음은 하늘, 땅, 사람의 모양을 본떠 만들었지.',
    '세종대왕은 1446년에 훈민정음을 널리 알렸어. 이것을 반포라고 해. 우리는 10월 9일을 한글날로 정해 기념하고 있어.'
  ],
  glossary:[{term:'훈민정음',meaning:'백성을 가르치는 바른 소리'},{term:'반포',meaning:'세상에 널리 알림'}],
  map:{center:'한글',branches:[
    {label:'만든 까닭',text:'글을 모르는 {{백성}}을 위해',evidence:2},
    {label:'자음',text:'{{발음 기관}}의 모양을 본뜸',evidence:3},
    {label:'모음',text:'하늘, 땅, {{사람}}의 모양',evidence:3},
    {label:'반포',text:'1446년에 널리 알림',sub:'10월 9일 한글날',evidence:4}]},
  final_quiz:{text:"'ㅁ'은 무엇을 본떴을까?",choices:['하늘','사람','입','한자'],answer:3,evidence:3,explain:'자음은 발음 기관'},
  essay_suggestion:'왜 쉬운 글자가 필요했을까?',...o});

test('AI answer number 1~4 becomes an index and the correct choice survives shuffling',()=>{
  for(const seed of ['2026-10-06','2026-10-08','x','y']){
    const r=L.fromAi(ai(),{grade:5,seed});
    assert.equal(r.ok,true,r.errors.join());
    assert.equal(r.sheet.final_quiz.choices[r.sheet.final_quiz.answer],'입');
    assert.equal(new Set(r.sheet.final_quiz.choices).size,4);
  }
  const spots=new Set(['a','b','c','d','e','f','g','h'].map(s=>L.fromAi(ai(),{seed:s}).sheet.final_quiz.answer));
  assert.ok(spots.size>1,'answer position should vary by seed');
});
test('blanks must be passage words, one per branch, and never a glossary term',()=>{
  const bad=(branches)=>L.fromAi(ai({map:{center:'한글',branches}}),{seed:'s'});
  assert.match(bad([{label:'a',text:'{{비행기}}',evidence:1},{label:'b',text:'{{사람}}',evidence:3},{label:'c',text:'{{백성}}',evidence:2}]).errors.join(),/지문에 그대로/);
  assert.match(bad([{label:'a',text:'{{훈민정음}}',evidence:2},{label:'b',text:'{{사람}}',evidence:3},{label:'c',text:'{{백성}}',evidence:2}]).errors.join(),/용어 풀이/);
  assert.match(bad([{label:'a',text:'{{백성}} {{사람}}',evidence:2},{label:'b',text:'x',evidence:3},{label:'c',text:'{{한자}}',evidence:1}]).errors.join(),/서로 다른 가지/);
  assert.match(bad([{label:'a',text:'{{백성}}',evidence:9},{label:'b',text:'{{사람}}',evidence:3},{label:'c',text:'{{한자}}',evidence:1}]).errors.join(),/근거 문단/);
  assert.match(bad([{label:'a',text:'{{백성}}',evidence:2},{label:'b',text:'{{사람}}',evidence:3},{label:'c',text:'없음',evidence:1}]).errors.join(),/정확히 3개/);
});
test('quiz needs four distinct choices and a valid answer',()=>{
  assert.equal(L.fromAi(ai({final_quiz:{text:'q',choices:['a','a','b','c'],answer:1,evidence:1}})).ok,false);
  assert.equal(L.fromAi(ai({final_quiz:{text:'q',choices:['a','b','c','d'],answer:0,evidence:1}})).ok,false);
  assert.equal(L.fromAi(ai({final_quiz:{text:'q',choices:['a','b','c','d'],answer:5,evidence:1}})).ok,false);
});
test('emphasis markup is stripped from the passage',()=>{
  const r=L.fromAi(ai({paragraphs:ai().paragraphs.map((p,i)=>i?p:'**한글**은 '+p)}),{seed:'s'});
  assert.ok(!r.sheet.paragraphs[0].includes('**'));
});
test('grading ignores spaces and reports the evidence paragraph of each wrong item',()=>{
  const s=L.fromAi(ai(),{seed:'s'}).sheet;
  const ok=L.grade(s,{blanks:['백성','발음기관',' 사람 '],choice:s.final_quiz.answer});
  assert.equal(ok.allRight,true);assert.equal(ok.score,4);
  const g=L.grade(s,{blanks:['백성','발음 기관','사랑'],choice:-1});
  assert.equal(g.score,2);assert.deepEqual(g.wrong.map(w=>[w.n,w.evidence]),[[3,3],[4,3]]);assert.equal(g.wrong[1].empty,true);
  assert.equal(L.grade(s,{blanks:['','',''],choice:0}).items.slice(0,3).every(x=>!x.ok),true,'empty answers are never right');
});
test('choseong comes from code, keeping the space of two-word answers',()=>{
  assert.deepEqual(L.choseong('발음 기관'),['ㅂ','ㅇ',' ','ㄱ','ㄱ']);
  assert.deepEqual(L.choseong('속력'),['ㅅ','ㄹ']);
});
test('open window covers the day and the grace days only',()=>{
  assert.equal(L.stateOn('2026-10-06','2026-10-05',2),'future');
  assert.equal(L.stateOn('2026-10-06','2026-10-06',2),'open');
  assert.equal(L.stateOn('2026-10-06','2026-10-08',2),'open');
  assert.equal(L.stateOn('2026-10-06','2026-10-09',2),'closed');
  assert.equal(L.stateOn('2026-10-06','2026-10-07',0),'closed');
  assert.equal(L.stateOn('2026-10-30','2026-11-01',2),'open','month boundary');
});
test('reward uses the first check only and config is clamped',()=>{
  assert.deepEqual(L.reward({coinBase:30,coinBonus:20,bonusMin:3},3),{base:30,bonus:20,total:50});
  assert.deepEqual(L.reward({coinBase:30,coinBonus:20,bonusMin:4},3),{base:30,bonus:0,total:30});
  const c=L.normalizeCfg({grade:9,coinBase:-5,graceDays:'x'});assert.equal(c.grade,6);assert.equal(c.coinBase,0);assert.equal(c.graceDays,2);
});
test('upcoming dates follow the weekly table and subjects alternate social/science within a week',()=>{
  const d=L.upcomingDates([2,4],'2026-10-04',4);
  assert.deepEqual(d,['2026-10-06','2026-10-08','2026-10-13','2026-10-15']);
  const s=L.suggestSubjects(d);
  assert.ok(['사회','역사','생활'].includes(s[0])&&['과학','환경'].includes(s[1]));
  assert.notEqual(s[0],s[2]);
  assert.deepEqual(L.upcomingDates([],'2026-10-04',3),[]);
});
test('prompts carry grade, topic and the no-emphasis rule',()=>{
  const p=L.buildSheetPrompt({grade:4,subject:'과학',topic:'속력',date:'2026-10-08',usedWords:['백성']});
  assert.match(p,/4학년/);assert.match(p,/400~550자/);assert.match(p,/강조 금지/);assert.match(p,/백성/);
  const t=L.buildTopicPrompt({grade:5,slots:[{date:'2026-10-06',dow:'화',subject:'역사'}],used:['한글']});
  assert.match(t,/2026-10-06 \(화\) · 역사/);assert.match(t,/한글/);
});
test('rendered sheet escapes text and never emphasises passage words',()=>{
  const s=L.fromAi(ai({title:'<b>x</b>'}),{seed:'s'}).sheet;
  const html=L.renderSheet(s,{});
  assert.ok(!html.includes('<b>x</b>'));assert.equal((html.match(/data-lit-blank=/g)||[]).length,3);
  const text=html.slice(html.indexOf('lit-text'),html.indexOf('한눈에 정리'));assert.ok(!/<(b|strong|em|mark)\b/.test(text));
  assert.equal((L.renderSheet(s,{reveal:true}).match(/data-lit-blank=/g)||[]).length,0);
});
