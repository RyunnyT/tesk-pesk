const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../arca/arca-engine.js'),D=require('../arca/arca-ch1.js');
const NOW='2026-11-12T10:00:00';
const hero=(job='knight')=>A.newState({name:'민준',job,pet:'p_dog',petKind:'dog',petName:'뭉치'});
/* 퀘스트 하나를 끝까지: talk·read 는 그냥 넘기고, solve 는 정답, battle 은 정답으로 이긴다 */
function clear(s,id){
  assert.ok(A.startQuest(s,D,id,NOW),id+' 시작');
  const q=A.questById(D,id);let res;
  while(A.currentStep(s,q)){
    const st=A.currentStep(s,q);
    if(st.kind==='solve')for(let i=0;i<st.count;i++)A.answer(s,D,id,true);
    if(st.kind==='battle'){const b=A.newBattle(s,D,st.monster);while(!b.over)A.battleTurn(s,D,b,true,()=>0);assert.ok(b.won);}
    res=A.finishStep(s,D,id);
  }
  return res;
}

test('메인 퀘스트는 아이템 없이 순서대로 끝까지 깰 수 있다',()=>{
  const s=hero();
  assert.equal(A.questStatus(s,A.questById(D,'m2'),NOW),'locked');
  clear(s,'m1');clear(s,'m2');const end=clear(s,'m3');
  assert.ok(end.endsChapter);assert.ok(s.chapterDone);
  assert.deepEqual(s.items,[]);
});

test('solve 단계는 정답만 진행을 올린다',()=>{
  const s=hero();A.startQuest(s,D,'m1',NOW);A.finishStep(s,D,'m1');A.finishStep(s,D,'m1');
  assert.equal(A.answer(s,D,'m1',false).progress,0);
  assert.equal(A.answer(s,D,'m1',true).progress,1);
  assert.equal(s.stats.tried,2);assert.equal(s.stats.correct,1);
});

test('직업 수련은 직업에 맞는 무기를 주고 공격 보너스는 상한을 넘지 않는다',()=>{
  for(const job of Object.keys(D.jobs)){
    const s=hero(job);clear(s,'m1');const r=clear(s,'s_train');
    assert.deepEqual(r.reward.items,['jw1_'+job]);assert.deepEqual(s.titles,['수련생']);
    assert.equal(A.attackBonus(s,D),3);
  }
  const s=hero();s.items=['jw1_knight','jw1_knight','jw1_knight','jw1_warrior'];
  assert.equal(A.attackBonus(s,D),A.ATK_CAP);
});

test('대사는 직업·펫마다 갈리고 이름과 조사가 맞춰진다',()=>{
  const k=hero('knight'),m=hero('mage');
  const kt=A.sceneLines('ch1_mentor',k,D)[0],mt=A.sceneLines('ch1_mentor',m,D)[0];
  assert.equal(kt.speaker,'브란');assert.equal(mt.speaker,'이세트');
  assert.match(kt.text,/민준이구나/);
  const dream=A.sceneLines('sq_dream_start',k,D);
  assert.match(dream[0].text,/뭉치가 꿈속에서/);
  assert.match(dream[2].text,/짖었던/);
  assert.equal(A.fill('{name}을(를) {pet}과(와)',Object.assign(hero(),{name:'하늘',petName:'초코'}),D),'하늘을 초코와');
});

test('선택한 대답에 따라 이어지는 줄이 달라진다',()=>{
  const s=hero();const lines=A.sceneLines('ch1_guild',s,D);
  const warm=lines.filter(l=>l.when==='kai_warm'),cool=lines.filter(l=>l.when==='kai_cool');
  assert.equal(warm.length,1);assert.equal(cool.length,1);
  A.setFlag(s,'kai_warm');
  assert.ok(A.lineVisible(warm[0],s));assert.ok(!A.lineVisible(cool[0],s));
});

test('장소 표시: 받을 퀘스트는 !, 진행 중 단계는 그 장소에만 뜬다',()=>{
  const s=hero();
  assert.equal(A.placeMark(s,D,'home'),'main');
  assert.equal(A.placeMark(s,D,'guild'),'');
  A.startQuest(s,D,'m1',NOW);A.finishStep(s,D,'m1');
  assert.equal(A.placeActions(s,D,'train')[0].mark,'?');
  assert.equal(A.placeActions(s,D,'home').length,0);
  assert.equal(A.locations(s,D).find(l=>l.id==='train').name,'성기사단 연병장');
});

test('길드 게시판은 하루 횟수가 있고 공적 30점마다 보급 상자를 준다',()=>{
  const s=hero();clear(s,'m1');
  const q=A.questById(D,'board');
  clear(s,'board');clear(s,'board');const r=clear(s,'board');
  assert.equal(s.merit,30);assert.deepEqual(r.reward.boxes,['potion']);
  assert.equal(A.questStatus(s,q,NOW),'done');
  assert.equal(A.questStatus(s,q,'2026-11-13T09:00:00'),'available');
});

test('전투: 오답은 체력만 깎고, 펫 목걸이는 한 번 막아 주며, 물약은 회복한다',()=>{
  const s=hero();s.items=['collar','potion'];
  const b=A.newBattle(s,D,'fogslime');
  assert.ok(A.battleTurn(s,D,b,false).guarded);assert.equal(s.hp,100);
  assert.equal(A.battleTurn(s,D,b,false).hurt,12);assert.equal(s.hp,88);
  assert.equal(A.usePotion(s,D),12);assert.equal(s.hp,100);assert.ok(!s.items.includes('potion'));
  s.hp=12;A.battleTurn(s,D,b,false);assert.ok(b.over);assert.ok(!b.won);assert.equal(s.hp,0);
  A.rest(s);assert.equal(s.hp,100);
});

test('예전 저장본의 빠진 칸을 채워 읽는다',()=>{
  const s=A.normalize({name:'옛날',job:'archer',hp:999,items:'x'});
  assert.equal(s.hp,100);assert.deepEqual(s.items,[]);assert.deepEqual(s.quests,{});
});

test('모든 퀘스트 단계가 있는 장면·장소·몬스터·지문을 가리킨다',()=>{
  const places=new Set(D.locations.map(l=>l.id));
  for(const q of D.quests){
    assert.ok(places.has(q.at),q.id);
    for(const st of q.steps){
      assert.ok(places.has(st.at),q.id+' '+st.at);
      if(st.scene)assert.ok(D.scenes[st.scene],st.scene);
      if(st.before)assert.ok(D.scenes[st.before],st.before);
      if(st.monster)assert.ok(D.monsters[st.monster],st.monster);
      if(st.passage)assert.ok(D.passages[st.passage],st.passage);
    }
    for(const id of (q.reward&&q.reward.items)||[])assert.ok(D.items[id],id);
  }
});
