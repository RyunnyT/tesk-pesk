const test=require('node:test'),assert=require('node:assert/strict'),P=require('../shared/pesk-progression.js'),C=require('../shared/pesk-combat.js');
test('revenge monsters come back after 1, 3, 7 days and graduate after three rights in a row',()=>{
  const k=P.revengeKey({subject:'math',grade:5,term:2,unitNo:3,tier:2});assert.equal(k,'m:5-2-3:2');
  assert.equal(P.revengeKey({subject:'math',typeCode:'frac_add'}),null,'rating types stay in the old review list');
  let l=P.revengeOnWrong([], k,'2026-10-05');assert.deepEqual(l,[{k,due:'2026-10-06',n:0}]);
  assert.equal(P.revengeDue(l,'2026-10-05').length,0);assert.equal(P.revengeDue(l,'2026-10-06').length,1);
  let r=P.revengeOnRight(l,k,'2026-10-06');assert.equal(r.list[0].due,'2026-10-09');assert.equal(r.graduated,false);
  r=P.revengeOnRight(r.list,k,'2026-10-09');assert.equal(r.list[0].due,'2026-10-16');
  r=P.revengeOnRight(r.list,k,'2026-10-16');assert.equal(r.graduated,true);assert.equal(r.list.length,0);
  const back=P.revengeOnWrong([{k,due:'2026-10-16',n:2}],k,'2026-10-16');assert.equal(back[0].n,0,'a miss starts over');
  const e=P.revengeKey({subject:'english',word:'apple'});assert.deepEqual(P.parseKey(e),{subject:'english',word:'apple'});
  const many=Array.from({length:40},(_,i)=>({k:'e:w'+i,due:'2026-10-01',n:0}));assert.equal(P.revengeNormalize(many).length,30);
  assert.equal(P.revengeDue([{k,due:'2026-10-01',n:0},{k:'e:cat',due:'2026-10-01',n:0}],'2026-10-05',x=>x.subject==='english').length,1);
});
test('review slots keep revenge questions to at most 2 of every 8',()=>{
  assert.equal(Array.from({length:8},(_,i)=>P.reviewSlot(i)).filter(Boolean).length,2);
});
test('weekly quests: random per student and week, pinned first, closed activities skipped, teacher targets honoured',()=>{
  const cfg={types:{acc_days:{on:false},adv_days:{target:3,reward:{brave:5}}},pinned:['revenge']};
  const a=P.pickQuests(cfg,'2026-10-05','1',{literacy:true,boss:true}),b=P.pickQuests(cfg,'2026-10-05','2',{literacy:true,boss:true});
  assert.equal(a.length,3);assert.equal(a[0].id,'revenge');assert.equal(a[0].pinned,true);
  assert.ok(!a.some(q=>q.id==='acc_days'),'teacher turned it off');
  assert.deepEqual(P.pickQuests(cfg,'2026-10-05','1',{literacy:true,boss:true}),a,'same student and week → same quests');
  const ids=new Set();for(let n=1;n<=20;n++)P.pickQuests(cfg,'2026-10-05',String(n),{literacy:true,boss:true}).forEach(q=>ids.add(q.id));
  assert.ok(ids.size>=4,'different students get different mixes');
  for(let n=1;n<=20;n++)assert.ok(!P.pickQuests(cfg,'2026-10-05',String(n),{}).some(q=>['lit_done','lit_perfect','boss_days'].includes(q.id)));
  const adv=P.pickQuests({pinned:['adv_days']},'2026-10-05','1',{});assert.equal(adv[0].target,4);
  assert.equal(P.pickQuests({...cfg,pinned:['adv_days']},'2026-10-05','1',{})[0].reward.brave,5);
  assert.deepEqual(P.pickQuests({enabled:false},'2026-10-05','1',{}),[]);
});
test('quest progress is counted only inside the week',()=>{
  const week=P.weekKey('2026-10-08');assert.equal(week,'2026-10-05');assert.equal(P.weekKey('2026-10-11'),'2026-10-05');
  let wk=P.bumpWeek(null,'2026-10-06',{correct:true,unitKey:'5-2-3'});wk=P.bumpWeek(wk,'2026-10-07',{correct:true,unitKey:'5-2-1',revenge:true});
  wk=P.bumpWeek(wk,'2026-10-07',{correct:false,revenge:true});
  const rec={wk,daily:{'2026-10-04':{tried:20,correct:20},'2026-10-06':{tried:10,correct:8},'2026-10-07':{tried:12,correct:6}},
    literacy:{'2026-10-06':{done:true,doneAt:'2026-10-06T03:00:00',first:4,firstAt:'2026-10-06T02:00:00'},'2026-10-01':{done:true,doneAt:'2026-10-01T03:00:00',first:4,firstAt:'2026-10-01T02:00:00'}},
    boss:{days:['2026-10-03','2026-10-06']}};
  assert.equal(P.questProgress('unit',rec,week,{}),2);assert.equal(P.questProgress('unit',rec,week,{unitKeys:['5-2-3']}),1);
  assert.equal(P.questProgress('revenge',rec,week),1,'wrong revenge answers do not count');
  assert.equal(P.questProgress('adv_days',rec,week),2);assert.equal(P.questProgress('acc_days',rec,week),1);
  assert.equal(P.questProgress('lit_done',rec,week),1);assert.equal(P.questProgress('lit_perfect',rec,week),1);
  assert.equal(P.questProgress('boss_days',rec,week),1);
  assert.equal(P.bumpWeek(wk,'2026-10-12',{correct:true}).correct,1,'a new week starts from zero');
});
test('crafting needs every fragment and never goes negative',()=>{
  const sword=P.RECIPES.find(r=>r.id==='w_sword_brave');
  assert.equal(P.canCraft({brave:12,know:3},sword),false);assert.equal(P.canCraft({brave:12,know:4},sword),true);
  assert.deepEqual(P.spend({brave:12,know:4,grit:1},sword.cost),{know:0,grit:1,brave:0});
  assert.throws(()=>P.spend({brave:1},sword.cost),/NOT_ENOUGH/);
  assert.deepEqual(P.addFrags({know:1},{know:2,grit:1}),{know:3,grit:1,brave:0});
  P.RECIPES.filter(r=>['hat','weapon','top','shoes'].includes(r.slot)).forEach(r=>assert.ok(C.itemPower(r.slot,r.id)<=14,'crafted items never beat the best shop weapon'));
});
test('dex titles follow collection milestones',()=>{
  assert.equal(P.dexTitle(10),'');assert.equal(P.dexTitle(26),'수집가');assert.equal(P.dexTitle(80),'대수집가');assert.equal(P.dexTitle(100),'전설의 수집가');
});
test('set effects stack by kind and keep the knight penalty bounded',()=>{
  const g={heroHp:100,huntEnergy:[],huntAttempts:0,petCharge:0,monsterId:'m_mush'};
  const G=require('../rpg-monsters.js');const game=G.normalizeGame({...G.newGameState()});
  const out=C.prepare(game,{correct:false,target:game.monsterId,ticket:{mode:'hunt',baseDamage:12},wrongDmg:8},G);assert.equal(out.game.heroHp,92);assert.equal(out.hpLost,8);
  const dbl=C.prepare(G.normalizeGame(G.newGameState()),{correct:true,target:game.monsterId,ticket:{mode:'hunt',baseDamage:12},extraEnergy:1},G);assert.equal(dbl.game.huntEnergy.length,2);
  const low=C.prepare(G.normalizeGame(G.newGameState()),{correct:false,target:game.monsterId,ticket:{mode:'hunt',baseDamage:12},wrongDmg:-5},G);assert.equal(low.hpLost,4);
});
