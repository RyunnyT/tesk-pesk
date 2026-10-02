const test=require('node:test'),assert=require('node:assert/strict');
const Sync=require('../shared/pesk-learning-sync.js'),Q=require('../shared/pesk-boss-quest.js');
const fixture=require('./economy-fixture.cjs');

test('contention retries retain the callback, back off, and stop after a bounded number',async()=>{
  const update=()=>{},delays=[],notices=[];let calls=0;
  assert.equal(await Sync.run(async(_,fn,opts)=>{
    assert.equal(fn,update);assert.equal(opts.maxAttempts,3);
    if(++calls<4)throw {code:'firestore/aborted'};return 'saved';
  },{},update,{random:()=>0,sleep:async ms=>delays.push(ms),onRetry:n=>notices.push(n)}),'saved');
  assert.deepEqual(delays,[250,400,640]);assert.deepEqual(notices,[1,2,3]);
  calls=0;await assert.rejects(Sync.run(async()=>{calls++;throw {code:'aborted'};},{},update,{sleep:async()=>{}}));assert.equal(calls,4);
  for(const code of ['permission-denied','unavailable']){
    calls=0;await assert.rejects(Sync.run(async()=>{calls++;throw {code};},{},update));assert.equal(calls,1);
  }
});

test('30 simultaneous contributions survive optimistic conflicts and settle rewards once',async()=>{
  const cfg={enabled:true,roundId:'class',maxHp:300,rewardXp:100,rewardTitle:'함께한 용사',rewardItemId:'pencil'};
  const shop=[{id:'pe',name:'체육 시간',bossReward:true},{id:'pencil',name:'연필'}];
  let state={all:Object.fromEntries(Array.from({length:30},(_,i)=>[i+1,{xp:0,boss:{roundId:'class',dmg:0}}])),buys:[]},version=0,conflicts=0;
  const runTransaction=async(_,update,{maxAttempts})=>{
    for(let n=0;n<maxAttempts;n++){
      const seen=version,snapshot=structuredClone(state);const next=await update(snapshot);
      await new Promise(r=>setTimeout(r,1));
      if(seen!==version){conflicts++;continue;}
      state=next;version++;return;
    }
    throw {code:'aborted'};
  };
  await Promise.all(Array.from({length:30},(_,i)=>Sync.run(runTransaction,{},async current=>{
    current.all[i+1].boss.dmg=10;
    const result=Q.plan(cfg,current.all,shop,current.buys);
    return {all:result.all,buys:result.buys};
  })));
  assert.ok(conflicts>0);assert.equal(version,30);
  assert.equal(state.buys.length,31);assert.equal(state.all.__classBossQuest.rounds.class.participants.length,30);
  for(let i=1;i<=30;i++){assert.equal(state.all[i].xp,100);assert.equal(state.all[i].boss.dmg,10);}
  assert.equal(Q.plan(cfg,state.all,shop,state.buys).changed,false);
});

test('a no-op progress mutation does not write or notify the whole classroom',async()=>{
  const f=fixture();let writes=0;
  f.c._fsRunTxn=async(_,fn)=>fn({get:f.c._fsGetDoc,set(){writes++;}});
  await f.c.rpgMutateProgress(current=>current);assert.equal(writes,0);
});

test('a slow secondary economy log cannot hold a committed answer in saving state',async()=>{
  const f=fixture();f.c.pushEconLog=()=>new Promise(()=>{});
  f.run('rpgEnsureQuestion();rpgQ.responseMode="short";rpgQ.inputKind="number";rpgQ.answer=12');
  f.elements['rpg-short-answer']={value:'12',focus(){}};
  await f.c.rpgSubmitShort();
  assert.equal(f.docs['pesk-quiz-progress'][1].correct,1);
  assert.equal(f.run('rpgBusy'),false);assert.equal(f.run('qzBusy'),false);
});
