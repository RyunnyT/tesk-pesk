const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const G=require('../rpg-monsters.js'),R=require('../quiz-rating.js'),C=require('../shared/pesk-combat.js');
const ticket=(extra={})=>({id:'attack1',monsterId:'m_mush',bossRound:'',weaponStyle:'sword',petSkill:'',baseDamage:12,expMultiplier:1,...extra});
const prepare=(game=G.newGameState(),extra={})=>C.prepare(game,{correct:true,target:game.monsterId,day:'2026-09-09',ticket:ticket(),...extra},G).game;
const resolve=(game,extra={})=>C.resolve(game,{ticketId:'attack1',automatic:false,position:.7,...extra},G,R);
test('legacy and English questions always have finite base damage',()=>{
  for(const difficulty of [undefined,null,NaN,Infinity])assert.equal(G.damageFor(1100,difficulty,R.expectedScore),12);
});
test('three weapons and their premium skins map to supported controls',()=>{
  assert.equal(C.weaponFor('w_sword_flame').id,'sword');assert.equal(C.weaponFor('w_staff_arcane').id,'staff');
  assert.equal(C.weaponFor('w_axe_gold').id,'axe');assert.equal(C.weaponFor(null,'staff').id,'staff');
});
test('timing never reduces earned damage; easy attack skips bonus',()=>{
  for(const w of Object.values(C.WEAPONS))for(const p of [0,.2,.6,1,NaN]){
    const hit=C.timing(w,p,false,false);assert.ok(hit.multiplier>=1 && hit.multiplier<=1.15);
    assert.equal(C.timing(w,p,true,true).multiplier,1);
  }
});
test('hold meter has bounded positions and a wider focus window',()=>{
  for(const w of Object.values(C.WEAPONS))for(const t of [-1,0,500,1500,5000])assert.ok(C.power(t,w)>=0&&C.power(t,w)<=1);
  assert.equal(C.timing(C.WEAPONS.sword,.42,false,false).strong,false);
  assert.equal(C.timing(C.WEAPONS.sword,.42,true,false).strong,true);
});
test('correct answer creates a resumable attack, not immediate damage',()=>{
  const g=prepare();assert.equal(g.hp,36);assert.equal(g.petCharge,1);
  assert.deepEqual(G.normalizeGame(JSON.parse(JSON.stringify(g))).pendingAttack,{...ticket(),power:10});
  assert.throws(()=>prepare(g),/ATTACK_PENDING/);
});
test('one attack is consumed exactly once and cannot repeat rewards',()=>{
  const hit=resolve(prepare());assert.equal(hit.damage,14);assert.equal(hit.game.hp,22);
  assert.equal(hit.game.pendingAttack,null);assert.throws(()=>resolve(hit.game),/ATTACK_ALREADY_USED/);
});
test('defeat gives experience once and leaves a visible defeated monster',()=>{
  const game=G.newGameState();game.hp=5;const hit=resolve(prepare(game));
  assert.equal(hit.game.hp,0);assert.equal(hit.game.kills.m_mush,1);assert.equal(hit.exp,18);
  assert.throws(()=>resolve(hit.game),/ATTACK_ALREADY_USED/);
});
test('pet skills require three charges and have different roles',()=>{
  let g=prepare({...G.newGameState(),petCharge:2},{ticket:ticket({petSkill:'attack'})});
  let hit=resolve(g,{usePet:true});assert.equal(hit.damage,17);assert.equal(hit.game.petCharge,0);
  g=prepare({...G.newGameState(),petCharge:2},{ticket:ticket({petSkill:'guard'})});
  hit=resolve(g,{usePet:true});assert.equal(hit.game.petShield,true);
  const wrong=C.prepare(hit.game,{correct:false,target:'m_mush',day:'2026-09-09'},G);
  assert.equal(wrong.guarded,true);assert.equal(wrong.game.petShield,false);assert.equal(wrong.game.hp,hit.game.hp);
  g=prepare(G.newGameState(),{ticket:ticket({petSkill:'attack'})});
  hit=resolve(g,{usePet:true});assert.equal(hit.skill,'');assert.equal(hit.game.petCharge,1);
});
test('passive legendary guard is limited to three a day and resets next day',()=>{
  let game={...G.newGameState(),hp:10};
  for(let i=0;i<3;i++){const out=C.prepare(game,{correct:false,target:'m_mush',day:'2026-09-09',passiveGuard:true},G);assert.equal(out.guarded,true);game=out.game;}
  const out=C.prepare(game,{correct:false,target:'m_mush',day:'2026-09-09',passiveGuard:true},G);assert.equal(out.guarded,false);
  assert.equal(C.prepare(out.game,{correct:false,target:'m_mush',day:'2026-09-10',passiveGuard:true},G).guarded,true);
});
test('boss title tags survive normalization including the round ID',()=>{
  const tag='b123456789:함께 골렘을 물리친 우리 반';assert.equal(G.normalizeBossRec({titles:[tag]}).titles[0],tag);
});

function fixture(){
  const storage=new Map([['pesk-room-id','test'],['pesk-student-num','1'],['pesk-account-uid','one']]);
  const elements={};const el=id=>elements[id]||null;
  elements['header-class']={textContent:''};
  const context={console,URL,URLSearchParams,Intl,Image:class{},navigator:{},location:{},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}}},
    setTimeout(){},setInterval(){},clearInterval(){},clearTimeout(){},requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener(){},alert(){}};
  context.window=context;context.RPG=G;context.PeskBossQuest=require('../shared/pesk-boss-quest.js');vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/pesk-class-quest-ui.js'),'utf8'),context);
  for(const name of ['quiz-bank.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context);
  const source=fs.readFileSync(path.join(__dirname,'../pesk.html'),'utf8').split('<script>')[1].split('</script>')[0];
  vm.runInContext(source,context);
  const date=context.qzToday();
  const docs={'pesk-quiz-progress':{1:{xp:0,tried:0,correct:0,rating:1100,byUnit:{},daily:{},game:G.newGameState(),boss:{roundId:'round1',dmg:10,titles:[]},goalClaims:{keep:true}}},'tesk-students':[{num:1,name:'학생',points:0}],'pesk-class-boss':{enabled:true,roundId:'round1',maxHp:3000,entryNeed:0}};
  let fail=false;
  Object.assign(context,{RPG:G,QRATE:R,PeskCombat:C,PeskSubjects:require('../shared/pesk-subjects.js'),_fbReady:true,_db:{},
    _fsDoc:(_,...parts)=>parts.at(-1),_fsGetDoc:async ref=>({exists:()=>!!docs[ref],data:()=>({value:structuredClone(docs[ref])})}),
    _fsRunTxn:async(db,fn)=>{const writes=[];const out=await fn({get:context._fsGetDoc,set:(ref,value)=>writes.push([ref,value.value])});if(fail)throw new Error('unavailable');for(const [ref,value] of writes)docs[ref]=structuredClone(value);return out;},
    avRefresh(){},showFeedbackNotice(){},addNotif(){},addTxn(){},pushEconLog:async()=>{},renderEconomyPanels(){},petGrow:async()=>{},avCharDataURL:()=>''});
  context.incoming=structuredClone(docs['pesk-quiz-progress']);context._applyQuizProgress(context.incoming);
  context._applyBossCfg(docs['pesk-class-boss']);
  vm.runInContext('students=[{num:1,name:"학생",points:0}]; myAvatar={equipped:{},owned:[]};',context);
  return {c:context,docs,date,storage,elements,fail:()=>{fail=true;},run:code=>vm.runInContext(code,context)};
}
test('actual answer + attack preserves study records, boss contribution and unrelated claims',async()=>{
  const f=fixture();f.run('rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  let rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.tried,1);assert.equal(rec.game.hp,36);assert.equal(rec.game.huntEnergy.length,1);assert.equal(rec.game.pendingAttack,null);await f.c.rpgBeginHunt();
  assert.equal(rec.boss.dmg,10);assert.equal(rec.goalClaims.keep,true);assert.equal(f.docs['tesk-students'][0].points,5);
  await f.c.rpgReleaseAttack(true);rec=f.docs['pesk-quiz-progress'][1];assert.ok(rec.game.hp<36);assert.equal(rec.tried,1);
  assert.equal(rec.game.pendingAttack,null);assert.equal(rec.boss.dmg,10);
});
test('a final daily question still exposes its attack before the done screen',async()=>{
  const f=fixture();f.run('quizConfig={dailyQuestionLimit:1};rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  const html=f.c.buildRpgPanel({num:1,points:5});assert.match(html,/몬스터 사냥하러 가기 · 1회 공격/);assert.doesNotMatch(html,/오늘 몫을 다 풀었어요/);
});
test('failed answer save grants no damage or rewards and leaves the question retryable',async()=>{
  const f=fixture();f.fail();f.run('rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  const rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.tried,0);assert.equal(rec.game.hp,36);assert.equal(rec.game.pendingAttack,null);assert.equal(f.run('rpgPicked'),null);
});
test('failed attack save keeps the pending opportunity',async()=>{
  const f=fixture();f.run('rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  await f.c.rpgBeginHunt();f.fail();await f.c.rpgReleaseAttack(true);assert.ok(f.docs['pesk-quiz-progress'][1].game.pendingAttack);assert.equal(f.docs['pesk-quiz-progress'][1].game.hp,36);
});
test('boss fight uses its own daily ticket, not adventure energy, and settles once',async()=>{
  const f=fixture();f.run('rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  await f.c.bossStartFight();let rec=f.docs['pesk-quiz-progress'][1];
  assert.equal(rec.boss.pending.monsterId,'__boss__');assert.equal(rec.boss.pending.ammo,6);assert.equal(rec.boss.day,f.date);
  assert.equal(rec.game.huntEnergy.length,1);assert.equal(rec.game.pendingAttack,null);
  const ticket=rec.boss.pending.id;await f.c.bossSkipFight();rec=f.docs['pesk-quiz-progress'][1];
  assert.equal(rec.boss.dmg,10+72);assert.equal(rec.boss.pending,null);assert.equal(rec.game.huntEnergy.length,1);assert.equal(rec.game.hp,36);
  assert.equal(await f.c.bossFinishFight({skip:true}),false);assert.equal(f.docs['pesk-quiz-progress'][1].boss.dmg,82);
  await f.c.bossStartFight();rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.boss.pending,null);assert.equal(rec.boss.dmg,82);
  assert.match(f.c.buildBossPanel({num:1}),/오늘 보스 도전을 마쳤어요/);assert.ok(ticket);
});
test('adventure attacks never damage the boss',async()=>{
  const f=fixture();f.run('rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  await f.c.rpgBeginHunt();assert.equal(f.docs['pesk-quiz-progress'][1].game.pendingAttack.monsterId,'m_mush');
  await f.c.rpgReleaseAttack(true);assert.equal(f.docs['pesk-quiz-progress'][1].boss.dmg,10);
  assert.doesNotMatch(f.c.buildRpgPanel({num:1,points:5}),/rpgPickMonster|onclick="rpgNextMonster/);
});
test('boss unlocks by daily questions or by a monster defeated today',async()=>{
  const f=fixture();f.docs['pesk-class-boss'].entryNeed=5;f.c._applyBossCfg(f.docs['pesk-class-boss']);
  assert.match(f.c.buildBossPanel({num:1}),/5문제를 더 풀거나, 모험에서 몬스터 1마리/);
  await f.c.bossStartFight();assert.equal(f.docs['pesk-quiz-progress'][1].boss.pending,undefined);
  f.docs['pesk-quiz-progress'][1].game.hp=5;await f.c.rpgReloadProgress();f.run('rpgEnsureQuestion()');
  await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));await f.c.rpgBeginHunt();await f.c.rpgReleaseAttack(true);
  assert.equal(f.docs['pesk-quiz-progress'][1].game.killDay,f.date);assert.match(f.c.buildBossPanel({num:1}),/보스 치러 가기/);
  await f.c.bossStartFight();assert.ok(f.docs['pesk-quiz-progress'][1].boss.pending);
});
test('changing boss rounds retires a pending boss fight without damaging the new boss',async()=>{
  const f=fixture();await f.c.bossStartFight();f.docs['pesk-class-boss'].roundId='round2';
  await f.c.bossFinishFight({skip:true});
  assert.equal(f.docs['pesk-quiz-progress'][1].boss.dmg,10);assert.equal(f.docs['pesk-quiz-progress'][1].boss.pending,null);
});
test('configured unit bounds and due reviews stay within teacher scope',()=>{
  const f=fixture();f.run('quizConfig={grade:5,term:1,mathUnits:[1]};myQuiz.review=[{code:"DML-01",d:1000,due:"2020-01-01",n:0}]');
  for(let i=0;i<100;i++){
    f.run('myQuiz.daily[qzToday()]={tried:'+i+'}');const q=f.c.qzMake();assert.equal(q.term,1);assert.equal(q.unitNo,1);assert.equal(q.isReview,false);
  }
});
test('unsupported rating units and other grades fall back to ordinary questions',()=>{
  const f=fixture();for(const cfg of [{grade:5,term:2,mathUnits:[3]},{grade:3,term:1,mathUnits:[1]}]){
    f.c.cfg=cfg;f.run('quizConfig=cfg');const q=f.c.qzMake();assert.equal(q.grade,cfg.grade);assert.equal(q.unitNo,cfg.mathUnits[0]);assert.ok(Number.isFinite(G.damageFor(1000,q.difficulty,R.expectedScore)));
  }
});
test('diagnostic stays within the configured type pool',()=>{
  const st=R.newDiagnostic('test',1100,['MIX-01']);while(!st.done){const q=R.diagnosticNext(st);assert.equal(q.typeCode,'MIX-01');R.diagnosticAnswer(st,true);}assert.equal(st.history.length,10);
});
test('defeated monsters are replaced at random; living monsters cannot be swapped',async()=>{
  const f=fixture();await f.c.rpgNextMonster();assert.equal(f.docs['pesk-quiz-progress'][1].game.monsterId,'m_mush');
  const seen=new Set();
  for(let i=0;i<40;i++){f.docs['pesk-quiz-progress'][1].game.hp=0;await f.c.rpgReloadProgress();const before=f.docs['pesk-quiz-progress'][1].game.monsterId;
    await f.c.rpgNext();const g=f.docs['pesk-quiz-progress'][1].game;assert.notEqual(g.monsterId,before);assert.equal(g.hp,G.monsterById(g.monsterId).hp);seen.add(g.monsterId);}
  assert.ok(seen.size>=4);assert.ok([...seen].some(id=>G.monsterById(id).hp>144));
});
test('legacy boss-targeted adventure records return to a real monster',()=>{
  const g=G.normalizeGame({monsterId:'__boss__',hp:0,pendingAttack:{id:'old',monsterId:'__boss__',bossRound:'round1',baseDamage:12}});
  assert.equal(g.monsterId,'m_mush');assert.equal(g.hp,36);assert.equal(g.pendingAttack.monsterId,'__boss__');
  assert.equal(G.randomMonster('m_mush',()=>0).id,'m_worm');assert.equal(G.randomMonster('m_mush',()=>0.9999).id,'m_dragon');
});
test('another session consuming the daily limit refreshes the stale question',async()=>{
  const f=fixture();f.run('quizConfig={dailyQuestionLimit:1};rpgEnsureQuestion()');
  f.docs['pesk-quiz-progress'][1].daily[f.date]={tried:1,correct:1,coin:5};
  await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  assert.match(f.c.buildRpgPanel({num:1,points:0}),/오늘 몫을 다 풀었어요/);
  assert.equal(f.docs['tesk-students'][0].points,0);
});
test('actual adventure respects every supported grade and selected unit at all learning tiers',()=>{
  const f=fixture();let count=0;
  for(const sem of f.c.QUIZ.curriculum())for(const unit of sem.units.filter(u=>u.supported))for(const xp of [0,600,2800]){
    f.c.cfg={grade:sem.grade,term:sem.term,mathUnits:[unit.no]};f.c.xp=xp;
    f.run('quizConfig=cfg;myQuiz.xp=xp');
    for(let i=0;i<20;i++){
      f.run('myQuiz.daily[qzToday()]={tried:'+i+'}');const q=f.c.qzMake();
      assert.ok(q);assert.equal(q.grade,sem.grade);assert.equal(q.term,sem.term);assert.equal(q.unitNo,unit.no);count++;
    }
  }
  assert.ok(count>2000);
});
test('an in-flight old-grade answer is rejected when the teacher changes the saved scope',async()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1]};rpgEnsureQuestion()');
  f.docs['pesk-quiz-config']={grade:3,term:2,mathUnits:[4]};
  await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  assert.equal(f.docs['pesk-quiz-progress'][1].tried,0);assert.equal(f.docs['tesk-students'][0].points,0);
  const q=f.c.rpgEnsureQuestion();assert.equal(q.grade,3);assert.equal(q.term,2);assert.equal(q.unitNo,4);
});
test('equipped avatar weapon overrides obsolete saved training weapon choice',async()=>{
  const f=fixture();f.run('myAvatar.equipped.weapon="w_staff_arcane";myQuiz.game.combatStyle="axe";rpgEnsureQuestion()');
  assert.equal(f.c.rpgWeapon().id,'staff');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  await f.c.rpgBeginHunt();const ticket=f.docs['pesk-quiz-progress'][1].game.pendingAttack;assert.equal(ticket.weaponStyle,'staff');assert.equal(ticket.weaponId,'w_staff_arcane');
  assert.doesNotMatch(f.c.rpgEquipmentHtml(),/rpgChooseWeapon|훈련 무기 선택/);
});
test('skip advances immediately, grants learning reward once and does not spend a ready pet skill',async()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1]};rpgSetAuto(true);rpgEnsureQuestion()');await f.c.rpgAnswer(f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))'));
  const rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.tried,1);assert.equal(rec.game.hp,24);assert.equal(rec.game.pendingAttack,null);assert.equal(rec.game.shooting.rounds,0);assert.equal(f.docs['tesk-students'][0].points,5);assert.equal(f.run('rpgPicked'),null);
});
test('fixed teacher difficulty stays fixed at high student levels',()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1],difficulty:1};myQuiz.xp=99999');
  assert.equal(f.c.qzMake().tier,1);f.run('quizConfig.difficulty=3');assert.equal(f.c.qzMake().tier,3);
});
test('only math and English remain available even with old custom-subject flags',()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,koreanOn:true,scienceOn:true,socialOn:true}');
  assert.deepEqual(Array.from(f.c.qzSubjects(),x=>x.id),['math','english']);f.run('qzSubject="korean"');assert.equal(f.c.qzMake(),null);
});
async function answerNext(f,correct=true){f.run('rpgEnsureQuestion()');const right=f.run('rpgQ.options.findIndex(x=>String(x)===String(rpgQ.answer))');await f.c.rpgAnswer(correct?right:(right+1)%4);await f.c.rpgNext();}
test('six of eight questions become exactly six attacks, with no combat between questions',async()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1],huntQuestionLimit:8,dailyQuestionLimit:20}');
  for(let i=0;i<6;i++){await answerNext(f);assert.equal(f.docs['pesk-quiz-progress'][1].game.pendingAttack,null);}
  const rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.game.huntEnergy.length,6);assert.equal(rec.game.hp,36);assert.equal(rec.tried,6);
  await f.c.rpgBeginHunt();const g=f.docs['pesk-quiz-progress'][1].game;assert.equal(g.pendingAttack.ammo,6);assert.equal(g.pendingAttack.baseDamage,72);assert.equal(g.huntEnergy.length,0);
  await f.c.rpgReleaseAttack(true,0,{skip:true});assert.equal(f.docs['tesk-students'][0].points,30);assert.equal(f.docs['pesk-quiz-progress'][1].tried,6);
});
test('teacher maximum rejects extra attempts without granting coins, and failed departure preserves energy',async()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1],huntQuestionLimit:2}');
  await answerNext(f);await answerNext(f);await answerNext(f);
  assert.equal(f.docs['pesk-quiz-progress'][1].tried,2);assert.equal(f.docs['tesk-students'][0].points,10);
  f.fail();await f.c.rpgBeginHunt();assert.equal(f.docs['pesk-quiz-progress'][1].game.huntEnergy.length,2);assert.equal(f.docs['pesk-quiz-progress'][1].game.pendingAttack,null);
});
test('wrong attempts grant no attack rights, cost adventure HP and preserve learning XP',async()=>{
  const f=fixture();await answerNext(f,false);const rec=f.docs['pesk-quiz-progress'][1];assert.equal(rec.game.huntEnergy.length,0);assert.equal(rec.game.huntAttempts,1);assert.equal(rec.game.heroHp,88);assert.equal(rec.xp,0);assert.equal(f.docs['tesk-students'][0].points,0);
});

test('wrong-answer penalty persists, full incorrect batch can restart and zero HP requires rest',async()=>{
 const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1],huntQuestionLimit:2}');await answerNext(f,false);await answerNext(f,false);assert.match(f.c.buildRpgPanel({num:1,points:0}),/다시 준비하기/);await f.c.rpgRest();assert.equal(f.docs['pesk-quiz-progress'][1].game.heroHp,100);assert.equal(f.docs['pesk-quiz-progress'][1].game.huntAttempts,0);assert.equal(f.docs['pesk-quiz-progress'][1].tried,2);
 f.docs['pesk-quiz-progress'][1].game.heroHp=4;await f.c.rpgReloadProgress();await answerNext(f,false);assert.equal(f.docs['pesk-quiz-progress'][1].game.heroHp,0);assert.match(f.c.buildRpgPanel({num:1,points:0}),/모닥불/);await f.c.rpgRest();assert.equal(f.docs['pesk-quiz-progress'][1].game.heroHp,100);
});
test('compact equipment UI contains only always skip preference beside the arena',()=>{
 const f=fixture(),html=f.c.rpgEquipmentHtml();assert.doesNotMatch(html,/효과음|흔들림|combat-loadout/);assert.match(html,/항상 건너뛰기/);assert.match(f.c.rpgArenaHtml('🍄','#fff'),/rpg-arena-info/);
});

test('typed answers use the real reward transaction exactly once and preserve input on failure',async()=>{
  const f=fixture();f.run('quizConfig={grade:3,term:1,mathUnits:[1]};rpgEnsureQuestion();rpgQ.responseMode="short";rpgQ.inputKind="number";rpgQ.answer=1200');
  f.elements['rpg-short-answer']={value:' 1,200 ',focus(){}};f.elements['rpg-short-error']={textContent:''};
  await Promise.all([f.c.rpgSubmitShort(),f.c.rpgSubmitShort()]);
  assert.equal(f.docs['pesk-quiz-progress'][1].tried,1);assert.equal(f.docs['pesk-quiz-progress'][1].correct,1);assert.equal(f.docs['pesk-quiz-progress'][1].game.huntEnergy.length,1);
  assert.match(f.c.buildRpgPanel({num:1,points:5}),/정답이에요/);
  const bad=fixture();bad.run('rpgEnsureQuestion();rpgQ.responseMode="short";rpgQ.inputKind="number"');
  bad.elements['rpg-short-answer']={value:'',focus(){}};bad.elements['rpg-short-error']={textContent:''};
  await bad.c.rpgSubmitShort();assert.equal(bad.docs['pesk-quiz-progress'][1].tried,0);assert.match(bad.elements['rpg-short-error'].textContent,/답을 입력/);
  bad.elements['rpg-short-answer'].value='1,20';await bad.c.rpgSubmitShort();assert.equal(bad.docs['pesk-quiz-progress'][1].tried,0);
  bad.elements['rpg-short-answer'].value='120';bad.fail();await bad.c.rpgSubmitShort();assert.equal(bad.run('rpgPicked'),null);assert.equal(bad.run('rpgQ._draft'),'120');assert.equal(bad.docs['pesk-quiz-progress'][1].tried,0);
});

test('typed English accepts capitals, shows no answer options, and wrong input gets normal feedback',async()=>{
  const f=fixture();f.run('qzSubject="english";rpgEnsureQuestion();rpgQ=QUIZ.prepareQuestion(rpgQ,"typed-test",{responseMode:"short"})');
  const answer=f.run('rpgQ.answer');f.elements['rpg-short-answer']={value:' '+answer.toUpperCase()+' ',focus(){}};f.elements['rpg-short-error']={textContent:''};
  const panel=f.c.buildRpgPanel({num:1,points:0});assert.match(panel,/rpg-short-answer/);assert.doesNotMatch(panel,/onclick="rpgAnswer\(/);
  await f.c.rpgSubmitShort();assert.equal(f.docs['pesk-quiz-progress'][1].correct,1);assert.match(f.c.buildRpgPanel({num:1,points:5}),/정답이에요/);
  await f.c.rpgNext();f.run('rpgEnsureQuestion();rpgQ=QUIZ.prepareQuestion(rpgQ,"typed-wrong",{responseMode:"short"})');
  f.elements['rpg-short-answer'].value='wrongword';await f.c.rpgSubmitShort();assert.equal(f.docs['pesk-quiz-progress'][1].correct,1);assert.equal(f.docs['pesk-quiz-progress'][1].tried,2);assert.match(f.c.buildRpgPanel({num:1,points:5}),/정답:/);
});
test('equipped item power adds up and multiplies the real damage (1% per point, capped)',()=>{
  const full=C.powerOf({weapon:'w_axe_gold',top:'t_plate',bottom:'l_plate',shoes:'e_plate',hat:'a_horned_flame',pet:'p_chick_g'},'legend');
  assert.equal(full.total,51);assert.equal(full.bonusPct,41);assert.equal(full.parts.length,6);
  assert.equal(C.powerOf({}).total,10,'bare hands keep the base power');
  assert.equal(C.itemPower('weapon','w_new_unknown'),6,'new items fall back to the slot default');
  assert.equal(C.itemPower('face','f_smile'),0,'faces and hair never add power');
  assert.equal(C.itemPower('pet','p_dog','rare'),5);
  assert.equal(C.powerMultiplier(999),1.5);assert.equal(C.powerMultiplier(undefined),1);
  const plain=resolve(prepare()).damage;
  const strong=C.resolve({...prepare(),pendingAttack:{...prepare().pendingAttack,power:40}},{ticketId:'attack1',automatic:false,position:.7},G,R).damage;
  assert.equal(plain,14);assert.equal(strong,18,'12 x 1.15 strong hit x 1.30 power');
});
test('old tickets without power keep their previous damage and power survives saving',()=>{
  const g=prepare();assert.equal(G.normalizeGame({...g,pendingAttack:{...g.pendingAttack}}).pendingAttack.power,10);
  assert.equal(G.normalizeGame({...g,pendingAttack:{...g.pendingAttack,power:33}}).pendingAttack.power,33);
  assert.equal(G.normalizeGame({...g,pendingAttack:{...g.pendingAttack,power:500}}).pendingAttack.power,60);
  assert.equal(resolve(prepare()).damage,14);
});
