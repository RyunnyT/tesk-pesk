const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shared/pesk-quiz-store.js'),G=require('../rpg-monsters.js'),Q=require('../shared/pesk-boss-quest.js');
const ROOT='classrooms/r/data/';
const copy=x=>x===undefined?x:structuredClone(x);

/* 경로 기반 가짜 Firestore — 트랜잭션은 읽은 문서가 그사이 바뀌면 다시 시도한다 */
function database(init={}){
  const docs=new Map(Object.entries(init).map(([k,v])=>[ROOT+k,{value:copy(v)}]));
  const ver=new Map();let reads=0,writes=0;
  const ref=(...p)=>({path:p.filter(x=>x&&typeof x==='string').join('/')});
  const snap=path=>{reads++;const d=docs.get(path);return {id:path.split('/').at(-1),exists:()=>!!d,data:()=>copy(d)};};
  const api={_db:{},
    _fsDoc:(_db,...p)=>ref(...p),_fsCollection:(_db,...p)=>ref(...p),
    _fsGetDoc:async r=>snap(r.path),
    _fsGetDocs:async r=>({docs:[...docs.keys()].filter(k=>k.startsWith(r.path+'/')&&!k.slice(r.path.length+1).includes('/')).map(snap)}),
    _fsSetDoc:async(r,v)=>{writes++;docs.set(r.path,copy(v));ver.set(r.path,(ver.get(r.path)||0)+1);},
    _fsRunTxn:async(_db,fn)=>{
      for(let i=0;i<5;i++){
        const seen=new Map(),ops=[];
        const txn={get:async r=>{seen.set(r.path,ver.get(r.path)||0);return snap(r.path);},
          set:(r,v)=>ops.push(['set',r.path,copy(v)]),delete:r=>ops.push(['del',r.path])};
        const out=await fn(txn);
        if([...seen].some(([p,v])=>(ver.get(p)||0)!==v))continue;
        for(const [op,p,v] of ops){writes++;if(op==='set')docs.set(p,v);else docs.delete(p);ver.set(p,(ver.get(p)||0)+1);}
        return out;
      }
      throw new Error('contention');
    }};
  return {api,docs,store:S.create(api,'r'),get:k=>docs.get(ROOT+k)?.value,reads:()=>reads,writes:()=>writes};
}
const rec=(extra={})=>({xp:10,tried:3,correct:2,daily:{'2026-10-06':{tried:3,correct:2,coin:1}},byUnit:{'5-1-1':{tried:3,correct:2}},
  game:{gxp:40,hp:5},literacy:{'2026-10-06':{first:3}},studentName:'학생',accountUid:'u',updatedAt:'2026-10-06T00:00:00Z',...extra});

test('first save after the split copies the old record into the student document and never rewrites the old document',async()=>{
  const legacy={1:rec(),2:rec({xp:99}),__classBossQuest:{rounds:{old:{}}}};
  const d=database({'pesk-quiz-progress':legacy});
  await d.api._fsRunTxn(d.api._db,async txn=>{
    const ctx=await d.store.open(txn,1);
    assert.equal(ctx.mine.xp,10);
    d.store.save(ctx,{1:{...ctx.mine,xp:11}});
  });
  assert.equal(d.get('pesk-quiz-progress/students/1').xp,11);
  assert.equal(d.get('pesk-quiz-progress/students/1').byUnit['5-1-1'].tried,3,'모든 필드가 옮겨진다');
  assert.deepEqual(d.get('pesk-quiz-progress'),legacy,'옛 문서는 그대로');
  assert.equal(d.get('pesk-quiz-summary'),undefined,'일반 저장은 반 요약을 건드리지 않는다');
});

test('student view = class summary + my full record; old records fill in until the summary exists',async()=>{
  const d=database({'pesk-quiz-progress':{1:rec(),2:rec({xp:99,game:{gxp:900}})}});
  let all=await d.store.loadForStudent(1);
  assert.equal(all[1].byUnit['5-1-1'].tried,3,'내 칸은 전체 기록');
  assert.equal(all[2].game.gxp,900);assert.equal(all[2].byUnit,undefined,'친구 칸은 요약');
  assert.equal(all[2].daily['2026-10-06'].coin,undefined,'요약에는 푼 수만');
  // 요약을 만든 뒤에는 옛 문서를 다시 읽지 않는다
  await d.store.flushSummary(1,rec({updatedAt:'2026-10-06T01:00:00Z'}));
  d.docs.set(ROOT+'pesk-quiz-progress/students/1',{value:rec({xp:50})});
  const before=d.reads();
  all=await d.store.loadForStudent(1);
  assert.equal(d.reads()-before,2,'내 문서 + 반 요약만 읽는다');
  assert.equal(all[1].xp,50);assert.equal(all[2].game.gxp,900);
});

test('the first summary is seeded from every old record and the boss ledger; later flushes change only my row',async()=>{
  const d=database({'pesk-quiz-progress':{1:rec(),2:rec({boss:{roundId:'r1',dmg:30}}),__classBossQuest:{rounds:{r0:{at:'x'}}}}});
  await d.store.flushSummary(1,rec({tried:4,daily:{'2026-10-06':{tried:4,correct:3}},updatedAt:'2026-10-06T02:00:00Z'}));
  let sum=d.get('pesk-quiz-summary');
  assert.equal(sum[2].boss.dmg,30);assert.equal(sum.__classBossQuest.rounds.r0.at,'x');
  assert.equal(sum[1].daily['2026-10-06'].tried,4);
  // 더 오래된 내 기록으로는 덮어쓰지 않는다 (다른 기기에서 먼저 올린 경우)
  await d.store.flushSummary(1,rec({daily:{'2026-10-06':{tried:1,correct:1}},updatedAt:'2026-10-06T01:00:00Z'}));
  sum=d.get('pesk-quiz-summary');assert.equal(sum[1].daily['2026-10-06'].tried,4);
  // 같은 내용이면 쓰지 않는다
  const w=d.writes();await d.store.flushSummary(1,rec({tried:4,daily:{'2026-10-06':{tried:4,correct:3}},updatedAt:'2026-10-06T02:00:00Z'}));
  assert.equal(d.writes(),w);
});

test('students saving at the same time do not retry against each other',async()=>{
  const d=database({'pesk-quiz-progress':{}});
  let tries=0;
  const save=num=>d.api._fsRunTxn(d.api._db,async txn=>{tries++;const ctx=await d.store.open(txn,num);await null;d.store.save(ctx,{[num]:{...ctx.mine,tried:(ctx.mine.tried||0)+1}});});
  await Promise.all([1,2,3,4,5,6,7,8].map(save));
  assert.equal(tries,8,'각자 자기 문서만 써서 재시도가 없다');
  for(const n of [1,2,3,4,5,6,7,8])assert.equal(d.get('pesk-quiz-progress/students/'+n).tried,1);
});

test('boss settlement rewards participants by editing their full records without losing study data',async()=>{
  const cfg={enabled:true,roundId:'r1',maxHp:100,rewardXp:25,rewardTitle:'용사'};
  const d=database({'pesk-quiz-progress':{1:rec({boss:{roundId:'r1',dmg:50}}),2:rec({xp:7,boss:{roundId:'r1',dmg:40}}),3:rec({xp:3})}});
  await d.store.flushSummary(1,rec({boss:{roundId:'r1',dmg:50}}));   // 요약 생성
  let out;
  await d.api._fsRunTxn(d.api._db,async txn=>{
    const ctx=await d.store.open(txn,1,{cls:true});
    ctx.all[1]={...ctx.mine,boss:{roundId:'r1',dmg:60}};
    out=await Q.settleInTxn(d.store,ctx,cfg,[],[]);
    d.store.save(ctx,out.records,{summary:true,ledger:out.ledger});
  });
  const two=d.get('pesk-quiz-progress/students/2');
  assert.equal(two.xp,32);assert.ok(two.boss.titles.includes('r1:용사'));
  assert.equal(two.byUnit['5-1-1'].tried,3,'친구의 학습 기록이 그대로 남는다');
  assert.equal(two.literacy['2026-10-06'].first,3);
  assert.equal(d.get('pesk-quiz-progress/students/3'),undefined,'참여하지 않은 학생은 건드리지 않는다');
  assert.equal(d.get('pesk-quiz-progress/students/1').xp,35);
  const sum=d.get('pesk-quiz-summary');
  assert.ok(sum.__classBossQuest.rounds.r1);assert.equal(sum[2].boss.titles.length,1);
  // 같은 판은 다시 정산하지 않는다
  await d.api._fsRunTxn(d.api._db,async txn=>{const ctx=await d.store.open(txn,2,{cls:true});assert.equal(await Q.settleInTxn(d.store,ctx,cfg,[],[]),null);});
});

test('teacher settle without a student number settles from the summary',async()=>{
  const cfg={enabled:true,roundId:'r1',maxHp:100,rewardXp:5};
  const d=database({'pesk-quiz-progress':{1:rec({boss:{roundId:'r1',dmg:120}})},'pesk-class-boss':cfg,'tesk-shop':[],'pesk-purchases':[]});
  const ref=k=>d.api._fsDoc(d.api._db,'classrooms','r','data',k);
  const out=await Q.settle({db:d.api._db,ref,runTransaction:d.api._fsRunTxn,store:d.store});
  assert.equal(out.changed,true);assert.equal(d.get('pesk-quiz-progress/students/1').xp,15);
});

test('teacher sees every full record, edits one student and removes a student',async()=>{
  const d=database({'pesk-quiz-progress':{1:rec(),2:rec({xp:2})}});
  await d.api._fsRunTxn(d.api._db,async txn=>{const ctx=await d.store.open(txn,2);d.store.save(ctx,{2:{...ctx.mine,xp:20}});});
  await d.store.flushSummary(2,rec({xp:20}));
  let all=await d.store.loadAllFull();
  assert.equal(all[1].xp,10);assert.equal(all[2].xp,20);assert.equal(all[2].byUnit['5-1-1'].tried,3);
  const out=await d.store.mutateStudent(1,s=>({...s,literacy:{...s.literacy,'2026-10-06':{...s.literacy['2026-10-06'],essayOk:true}}}));
  assert.equal(out.literacy['2026-10-06'].essayOk,true);
  assert.equal(d.get('pesk-quiz-progress/students/1').literacy['2026-10-06'].essayOk,true);
  await d.store.removeStudent([2,'acc-2']);
  assert.equal(d.get('pesk-quiz-progress/students/2'),undefined);assert.equal(d.get('pesk-quiz-summary')[2],undefined);
});

test('backup round trip: full records restore into student documents and a fresh summary',async()=>{
  const d=database({'pesk-quiz-progress':{1:rec(),__classBossQuest:{rounds:{r1:{}}}}});
  const backup=await d.store.loadAllFull();
  const e=database({});
  await e.store.restoreAll(backup);
  assert.equal(e.get('pesk-quiz-progress/students/1').byUnit['5-1-1'].tried,3);
  assert.ok(e.get('pesk-quiz-summary').__classBossQuest.rounds.r1);
  assert.equal(e.get('pesk-quiz-summary')[1].game.gxp,40);
});

test('summary keeps only what classmates need and stays small',()=>{
  const daily={};for(let i=0;i<120;i++)daily['2026-'+String(1+Math.floor(i/28)).padStart(2,'0')+'-'+String(1+i%28).padStart(2,'0')]={tried:9,correct:8,coin:3};
  const s=S.summaryOf(rec({daily,review:[1,2,3],revenge:[{a:1}]}));
  assert.equal(Object.keys(s.daily).length,62);
  assert.deepEqual(Object.keys(s).sort(),['accountUid','daily','game','studentName','updatedAt']);
  assert.ok(G.bossState({enabled:true,roundId:'r',maxHp:100},{1:S.summaryOf(rec({boss:{roundId:'r',dmg:150}}))},[]).cleared);
});
