const test=require('node:test'), assert=require('node:assert/strict');
const Q=require('../shared/pesk-boss-quest.js'), G=require('../rpg-monsters.js');
const fixture=require('./economy-fixture.cjs');
const cfg={enabled:true,roundId:'round1',name:'골렘',maxHp:100};
const progress={1:{xp:20,boss:{roundId:'round1',dmg:60}},2:{xp:30,boss:{roundId:'round1',dmg:40}}};
const items=[{id:'pe',name:'체육 시간 1회',icon:'⚽',bossReward:true,price:999,stock:0},{id:'pencil',name:'연필',price:10,stock:5}];

test('a boss with only a communal reward leaves individual XP and inventory unchanged',()=>{
  const original=structuredClone({progress,items});
  const out=Q.plan(cfg,progress,items,[]);
  assert.equal(out.granted,1);assert.equal(out.buys.length,1);
  assert.equal(out.buys[0].scope,'class');assert.equal(out.buys[0].studentNum,0);assert.equal(out.buys[0].qty,1);
  assert.equal(out.buys[0].price,0);assert.equal(out.buys[0].itemName,'체육 시간 1회');
  assert.deepEqual(out.all[1],progress[1]);assert.deepEqual(out.all[2],progress[2]);
  assert.deepEqual({progress,items},original);
  assert.equal(G.bossState(cfg,out.all,[]).total,100);
});

test('personal XP, titles and items go only to this boss participants; shared activity goes to the class',()=>{
  const settings={...cfg,rewardXp:100,rewardItemId:'pencil',rewardItemQty:2,rewardTitle:'함께한 용사'};
  const source={...progress,1:{...progress[1],accountUid:'one',studentName:'첫째'},3:{xp:50,boss:{roundId:'old',dmg:999}},4:{xp:80,boss:{roundId:'round1',dmg:0}}};
  const original=structuredClone(source),out=Q.plan(settings,source,items,[]);
  assert.deepEqual(out.participants,[1,2]);assert.equal(out.all[1].xp,120);assert.equal(out.all[2].xp,130);
  assert.equal(out.all[3].xp,50);assert.equal(out.all[4].xp,80);assert.deepEqual(source,original);
  assert.ok(out.all[1].boss.titles.includes('round1:함께한 용사'));
  const personal=out.buys.filter(p=>p.scope==='student');assert.equal(personal.length,2);assert.ok(personal.every(p=>p.qty===2));
  assert.equal(personal[0].accountUid,'one');assert.equal(personal[0].studentName,'첫째');
  assert.equal(out.buys.filter(p=>p.scope==='class').length,1);assert.equal(items[1].stock,5);
  const again=Q.plan({...settings,rewardXp:999,rewardTitle:'다른 칭호'},out.all,items,out.buys);
  assert.equal(again.changed,false);assert.equal(again.all[1].xp,120);assert.equal(again.buys.length,3);
  assert.equal(again.all.__classBossQuest.rounds.round1.rewardXp,100);
});

test('XP-only rewards settle once, never reward old-round or zero damage and preserve old ledgers',()=>{
  const out=Q.plan({...cfg,rewardXp:25},progress,[],[]);
  assert.equal(out.all[1].xp,45);assert.equal(out.buys.length,0);assert.equal(out.changed,true);
  const old=Q.plan(cfg,progress,[],[]);
  assert.equal(Q.plan({...cfg,rewardXp:25},old.all,[],[]).all[1].xp,20);
  const missing=Q.plan({...cfg,rewardItemId:'removed'},progress,items,[]);
  assert.equal(missing.buys.length,1);
  const communal=Q.plan({...cfg,rewardItemId:'pe'},progress,items,[]);
  assert.equal(communal.buys.length,1);
});

test('actual final attack saves XP and separate inventories atomically without duplicate grants',async()=>{
  const f=fixture();Object.assign(f.docs,{'pesk-class-boss':{...cfg,rewardXp:75,rewardItemId:'pencil',rewardItemQty:1},'tesk-shop':items,'pesk-purchases':[]});
  f.docs['pesk-quiz-progress']=structuredClone(progress);f.docs['pesk-quiz-progress'][1].boss.dmg=59;
  await f.c.rpgMutateProgress(current=>({...current,boss:{roundId:'round1',dmg:60}}));
  assert.equal(f.rec(1).xp,95);assert.equal(f.rec(2).xp,105);
  assert.equal(f.docs['pesk-purchases'].length,3);
  await f.c.rpgMutateProgress(current=>current);
  assert.equal(f.rec(1).xp,95);assert.equal(f.docs['pesk-purchases'].length,3);
  assert.equal(f.run('myPurchases.length'),1);assert.equal(f.run('classBossRewards.length'),1);
});

test('student shows one unified boss goal, with different personal and class reward eligibility',()=>{
  const f=fixture();f.c._applyBossCfg({...cfg,rewardXp:100});
  f.run('quizConfig={goals:[{id:"old",enabled:true,target:10000,rewardXp:100}]};');
  const html=f.c.buildClassBossQuestCard();assert.match(html,/참여자 개인 보상/);assert.match(html,/학급 전체 보상/);
  assert.doesNotMatch(html,/이전 학습 목표 확인|달성하면 모두에게/);
});
test('unfinished, disabled and old-round damage cannot unlock rewards',()=>{
  for(const [c,p] of [[{...cfg,enabled:false},progress],[cfg,{1:{boss:{roundId:'old',dmg:999}}}],[{...cfg,maxHp:200},progress]]){
    const out=Q.plan(c,p,items,[]);assert.equal(out.changed,false);assert.equal(out.buys.length,0);
  }
});
test('reloads, completion and inventory cleanup never replay a settled round; a new round earns a new activity',()=>{
  const first=Q.plan(cfg,progress,items,[]);
  const complete=Q.complete(first.buys,first.buys[0].id);
  assert.equal(complete[0].usedQty,1);assert.equal(first.buys[0].usedQty,undefined);
  assert.throws(()=>Q.complete(complete,complete[0].id),/이미/);
  assert.equal(Q.plan(cfg,first.all,items,complete).changed,false);
  assert.equal(Q.plan(cfg,first.all,items,[]).granted,0);
  const next=structuredClone(first.all);next[1].boss={roundId:'round2',dmg:100};
  const second=Q.plan({...cfg,roundId:'round2'},next,items,complete);
  assert.equal(second.buys.length,2);assert.notEqual(second.buys[0].id,second.buys[1].id);
});
test('only configured activities are awarded once; later edits do not retroactively change a completed round',()=>{
  const noReward=Q.plan(cfg,progress,[],[]);
  assert.equal(Q.plan(cfg,noReward.all,items,[]).granted,0);
  const both=Q.plan(cfg,progress,[...items,items[0],{id:'movie',name:'영화 감상',bossReward:true}],[]);
  assert.equal(both.granted,2);
  assert.throws(()=>Q.complete([{id:'personal',studentNum:1}], 'personal'),/공동 보상/);
});
test('real final-attack transaction commits damage and communal activity together and preserves personal inventory',async()=>{
  const f=fixture();Object.assign(f.docs,{'pesk-class-boss':cfg,'tesk-shop':items,'pesk-purchases':[{id:'mine',studentNum:1,itemId:'pencil',qty:2}]});
  f.docs['pesk-quiz-progress']=structuredClone(progress);f.docs['pesk-quiz-progress'][1].boss.dmg=59;
  await f.c.rpgMutateProgress((current)=>({...current,boss:{roundId:'round1',dmg:60}}));
  assert.equal(f.docs['pesk-purchases'].length,2);assert.equal(f.docs['pesk-purchases'][0].qty,2);
  assert.equal(f.c.recordBelongsToMe(f.docs['pesk-purchases'][1]),false);
  assert.equal(f.docs['tesk-shop'][0].stock,0);
  await f.c.rpgMutateProgress(current=>current);
  assert.equal(f.docs['pesk-purchases'].length,2);
});
test('failed final attack commits neither the kill nor a reward',async()=>{
  const f=fixture();Object.assign(f.docs,{'pesk-class-boss':cfg,'tesk-shop':items,'pesk-purchases':[]});
  f.docs['pesk-quiz-progress']=structuredClone(progress);f.docs['pesk-quiz-progress'][1].boss.dmg=59;
  const before=structuredClone(f.docs);f.fail();
  await assert.rejects(f.c.rpgMutateProgress(current=>({...current,boss:{roundId:'round1',dmg:60}})));
  assert.deepEqual(f.docs,before);
});
test('concurrent recovery transactions retry and create one class reward',async()=>{
  const docs={'pesk-class-boss':cfg,'pesk-quiz-progress':progress,'tesk-shop':items,'pesk-purchases':[]};
  let version=0;
  const runTransaction=async(_,fn)=>{
    for(let attempt=0;attempt<5;attempt++){
      const seen=version, snapshot=structuredClone(docs), writes=[];
      await fn({get:async key=>({exists:()=>true,data:()=>({value:snapshot[key]})}),set:(key,value)=>writes.push([key,value.value])});
      if(version!==seen)continue;
      for(const [key,value] of writes)docs[key]=structuredClone(value);
      if(writes.length)version++;
      return;
    }
    throw Error('retry limit');
  };
  await Promise.all([Q.settle({db:{},ref:k=>k,runTransaction}),Q.settle({db:{},ref:k=>k,runTransaction})]);
  assert.equal(docs['pesk-purchases'].length,1);assert.equal(version,1);
});
test('communal activities cannot be purchased or used as personal goods, and all students see the same reward',async()=>{
  const f=fixture();f.c.data=structuredClone(items);f.run('shopItems=data');
  f.c.ensureActiveStudentSession=async()=>true;
  await f.c.buyShopItem('pe');assert.equal(f.docs['pesk-purchases'],undefined);
  const out=Q.plan(cfg,progress,items,[]);f.c.applyClassBossPurchases(out.buys);
  assert.match(f.c.buildClassRewardInventory(),/체육 시간 1회/);
  assert.doesNotMatch(f.c.buildClassRewardInventory(),/onclick=/);
  f.run('myStudentNum=2');assert.match(f.c.buildClassRewardInventory(),/체육 시간 1회/);
  f.c.applyClassBossPurchases(Q.complete(out.buys,out.buys[0].id));assert.match(f.c.buildClassRewardInventory(),/제공 완료/);
});

test('participation tiers: 1 day title only, mid days base reward, top days extra XP; old rounds keep the old rule',()=>{
  const d=n=>Array.from({length:n},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0'));
  const prog={1:{xp:0,boss:{roundId:'round1',dmg:40,days:d(1)}},2:{xp:0,boss:{roundId:'round1',dmg:30,days:d(3)}},3:{xp:0,boss:{roundId:'round1',dmg:30,days:d(5)}}};
  const set={...cfg,tiered:true,tierMid:3,tierTop:5,rewardXp:100,rewardXpBonus:40,rewardItemId:'pencil',rewardTitle:'용사'};
  const out=Q.plan(set,prog,items,[]);
  assert.deepEqual(out.tiers,{1:1,2:2,3:3});
  assert.equal(out.all[1].xp,0);assert.ok(out.all[1].boss.titles.length===1,'1 day still earns the title');
  assert.equal(out.all[2].xp,100);assert.equal(out.all[3].xp,140);
  assert.deepEqual(out.buys.filter(b=>b.scope==='student').map(b=>b.studentNum).sort(),[2,3],'free riders get no personal item');
  const legacy=Q.plan({...set,tiered:false},prog,items,[]);
  assert.deepEqual([legacy.all[1].xp,legacy.all[2].xp,legacy.all[3].xp],[100,100,100]);
});
test('days survive normalisation, roll over to prevDays on a new round, and drive the ranking',()=>{
  const rec=G.normalizeBossRec({roundId:'r1',dmg:50,days:['2026-10-02','2026-10-01','2026-10-02','bad']});
  assert.deepEqual(rec.days,['2026-10-01','2026-10-02']);
  const next=G.bossRollRound(rec,'r2');assert.equal(next.dmg,0);assert.deepEqual(next.days,[]);assert.equal(next.prevDays,2);assert.equal(next.prevRoundId,'r1');
  const same=G.bossRollRound(rec,'r1');assert.equal(same.dmg,50);assert.deepEqual(same.days,rec.days,'same round keeps its record');
  const c={enabled:true,roundId:'r2'};
  const day=k=>({tried:10,correct:k});
  const p={
    1:{boss:{roundId:'r2',dmg:10,days:['2026-10-05','2026-10-06','2026-10-07'],prevRoundId:'r1',prevDays:1},daily:{'2026-10-05':day(5),'2026-10-06':day(5),'2026-10-07':day(5)}},
    2:{boss:{roundId:'r2',dmg:99,days:['2026-10-05'],prevRoundId:'r1',prevDays:4},daily:{'2026-10-05':day(10)}},
    3:{boss:{roundId:'r2',dmg:5,days:['2026-10-05','2026-10-06','2026-10-07']},daily:{'2026-10-05':{tried:3,correct:3}}},
    4:{boss:{roundId:'r1',dmg:500,days:['2026-09-01']}}
  };
  const st=[1,2,3,4].map(n=>({num:n,name:'s'+n}));
  const r=G.bossRanking(c,p,st,5);
  assert.deepEqual(r.steady.map(x=>[x.num,x.rank]),[[1,1],[3,1],[2,3]],'ties share a rank; damage does not matter');
  assert.deepEqual(r.accurate.map(x=>[x.num,x.value]),[[2,100],[1,50]],'needs 10+ questions on boss days');
  assert.deepEqual(r.growth.map(x=>[x.num,x.value]),[[3,3],[1,2]]);
  assert.deepEqual(r.absent.map(x=>x.num),[4],'old round records are not participation');
  assert.equal(G.bossRanking(c,p,st,1).steady.length,2,'top limit keeps everyone tied at the cut');
});
test('finishing today\'s reading unlocks the boss, and reading tickets do not use up hunt preparation',()=>{
  const c={enabled:true,roundId:'r',entryNeed:5};
  assert.equal(G.bossChallenge(c,{daily:{}},'2026-10-06').unlocked,false);
  assert.equal(G.bossChallenge(c,{litDay:'2026-10-06'},'2026-10-06').unlocked,true);
  assert.equal(G.bossChallenge(c,{litDay:'2026-10-05'},'2026-10-06').unlocked,false);
  assert.equal(G.normalizeGame({huntAttempts:0,huntEnergy:Array(8).fill(12)}).huntAttempts,0);
  assert.equal(G.normalizeGame({huntEnergy:[12,12,12]}).huntAttempts,3,'legacy records without the field still count');
});
