const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shared/pesk-shooter.js'),C=require('../shared/pesk-combat.js'),G=require('../rpg-monsters.js'),R=require('../quiz-rating.js');
function advance(s,n=20,input={}){for(let i=0;i<n&&!s.finished;i++)S.step(s,.05,input);return s;}
function close(s){s.x=s.enemyX-70;s.y=s.enemyY;s.targetX=s.x;s.targetY=s.y;}
function ready(extra={}){const g=G.newGameState();g.petCharge=3;g.pendingAttack={id:'one',monsterId:'m_mush',baseDamage:72,ammo:6,expMultiplier:1,weaponStyle:'sword',mode:'shooter',petId:'p_dog',petTier:'common',...extra};return g;}

test('joystick has a dead zone, analog speed and normalized diagonals even outside the base',()=>{
 assert.deepEqual(S.stickVector(2,3,50),{x:0,y:0});
 assert.deepEqual(S.stickVector(25,0,50),{x:.5,y:0});
 const v=S.stickVector(100,-100,50);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-8);assert.ok(v.x>0&&v.y<0);
 const s=S.create();advance(s,1,{direction:v.x,vertical:v.y});assert.ok(s.x>140&&s.y<250);
});
test('idle and movement never fire automatically or consume attack rights',()=>{
 const s=S.create({ammo:6});advance(s,40,{direction:-1});assert.equal(s.ammoUsed,0);assert.equal(s.hits,0);assert.equal(s.finished,false);
});
test('A attacks only in range, respects cooldown and never consumes extra rights',()=>{
 const s=S.create({ammo:2});assert.equal(S.action(s,'a'),false);assert.equal(s.ammoUsed,0);close(s);
 assert.equal(S.action(s,'a'),true);assert.equal(s.ammoUsed,1);assert.equal(S.action(s,'a'),false);advance(s);close(s);assert.equal(S.action(s,'a'),true);advance(s,30);assert.equal(s.finished,true);assert.equal(s.report.attacksUsed,2);assert.equal(S.action(s,'a'),false);
});
test('all eight weapons have a manual S skill and distinct impact families',()=>{
 const types=new Set();for(const weaponStyle of Object.keys(C.WEAPONS)){const s=S.create({weaponStyle,ammo:6});close(s);assert.equal(S.action(s,'s'),true);assert.equal(s.ammoUsed,2);assert.ok(s.hits>1);types.add(s.move[1]);assert.ok(s.effects.length&&s.particles.length);assert.ok(s.hitStop>0);assert.equal(S.action(s,'s'),false);}assert.ok(types.size>=6);
});
test('arrow movement covers four directions, bounds and diagonal speed; A S D F never move the player',()=>{
 const s=S.create();advance(s,1,{direction:1,vertical:-1});assert.ok(s.x>140&&s.y<250);assert.ok(Math.hypot(s.x-140,s.y-250)<=235*.05+.001);
 advance(s,100,{direction:-1,vertical:1});assert.equal(s.x,40);assert.equal(s.y,392);
 const before=[s.x,s.y];S.action(s,'d');assert.deepEqual([s.x,s.y],before);
 s.paused=true;const t=s.t;advance(s,10,{direction:1});assert.equal(s.t,t);assert.equal(S.action(s,'a'),false);
});
test('monster telegraphs a melee strike, wrong-position player loses HP, escape dodges it',()=>{
 const s=S.create();advance(s,60);assert.ok(s.warning);const hp=s.hp;advance(s,35);assert.equal(s.hp,hp-8);assert.equal(s.hpLost,8);assert.equal(s.bumps,1);
 const dodge=S.create();advance(dodge,60);advance(dodge,35,{direction:-1,vertical:-1});assert.equal(dodge.hp,100);assert.equal(dodge.dodges,1);
});
test('D defense blocks the next telegraphed hit without spending an attack right',()=>{
 const s=S.create();advance(s,60);assert.equal(S.action(s,'d'),true);assert.equal(s.ammoUsed,0);advance(s,35);assert.equal(s.hp,100);assert.equal(s.shield,0);assert.equal(S.action(s,'d'),false);
});
test('younger children receive longer enemy warning windows',()=>{
 const a=S.create({grade:3}),b=S.create({grade:6});advance(a,60);advance(b,60);assert.ok(a.warning.at>b.warning.at);
});
test('F pet skill requires charge, consumes one right and supports all eight pet abilities',()=>{
 assert.equal(new Set(Object.values(C.PETS).map(p=>p.ability)).size,8);
 for(const petId of Object.keys(C.PETS)){const s=S.create({petId,petCharge:3});s.hits=3;close(s);assert.equal(S.activate(s),true);assert.equal(s.ammoUsed,1);assert.equal(S.activate(s),false);assert.equal(S.activate(S.create({petId,petCharge:2})),false);}
});
test('care tiers preserve rarity; legendary combo requires three hits',()=>{
 assert.equal(C.petProfile('p_dog',10).tier,'rare');assert.equal(C.petProfile('p_dog',20).tier,'unique');assert.equal(C.petProfile('p_dog',30).tier,'legend');assert.equal(C.petProfile('p_chick_g',1).tier,'legend');
 const s=S.create({petId:'p_dog',petTier:'legend',petCharge:3});assert.equal(S.activate(s),false);s.hits=3;close(s);assert.equal(S.activate(s),true);assert.equal(s.combo,true);assert.ok(s.effects.some(e=>e.type==='nova'));
});
test('pet shield, speed and ambush produce different RPG effects',()=>{
 const shield=S.create({petId:'p_slime',petCharge:3});close(shield);S.activate(shield);assert.equal(shield.shield,3);
 const speed=S.create({petId:'p_rabbit',petCharge:3});close(speed);S.activate(speed);assert.equal(speed.speedUntil,5);
 const cat=S.create({petId:'p_cat_bk',petCharge:3});close(cat);S.activate(cat);assert.ok(cat.burstAt.length);assert.ok(cat.stagger>0);
});
test('zero health retreats and reports only attacks actually used',()=>{
 const s=S.create({heroHp:8});advance(s,120);assert.equal(s.hp,0);assert.equal(s.finished,true);assert.equal(s.report.attacksUsed,0);assert.equal(s.report.hpLost,8);
 const g=ready();const out=C.resolve(g,{ticketId:'one',report:s.report},G,R);assert.equal(out.damage,0);assert.equal(out.game.hp,36);assert.equal(out.game.heroHp,92);
});
test('persisted battle HP loss applies exactly once and skip cannot refund a hit',()=>{
 const out=C.resolve(ready(),{ticketId:'one',skip:true,report:{rpg:true,attacksUsed:1,hits:1,hpLost:16}},G,R);assert.equal(out.game.heroHp,84);assert.equal(out.damage,72);assert.equal(out.game.petCharge,3);assert.throws(()=>C.resolve(out.game,{ticketId:'one'},G,R),/ALREADY_USED/);
});
test('RPG damage scales to used rights on retreat and pet bonuses remain capped',()=>{
 const out=C.resolve(ready(),{ticketId:'one',report:{rpg:true,attacksUsed:2,hits:4,hpLost:100}},G,R);assert.equal(out.damage,25);assert.equal(out.game.heroHp,0);assert.equal(out.game.gxp,0);
 const skipped=C.resolve(ready(),{ticketId:'one',skip:true},G,R);assert.equal(skipped.game.shooting.rounds,0);assert.equal(skipped.game.heroHp,100);
});

test('unique pets track targets at long range while common support pets need proximity',()=>{const ordinary=S.create({petId:'p_cat',petCharge:3}),unique=S.create({petId:'p_cat',petTier:'unique',petCharge:3});assert.equal(S.activate(ordinary),false);assert.equal(S.activate(unique),true);});

test('arena damage: playing plainly equals skipping, S costs two rights for two shares',()=>{
 const t={ammo:6,baseDamage:72};
 const s=S.create({...t,ammo:6});for(let i=0;i<6;i++){close(s);S.action(s,'a');advance(s,12);}
 advance(s,40);assert.equal(s.finished,true);assert.equal(s.report.units,6);assert.equal(s.report.attacksUsed,6);
 assert.equal(C.resolve(ready(),{ticketId:'one',report:s.report},G,R).damage,C.resolve(ready(),{ticketId:'one',skip:true},G,R).damage);
 const sk=S.create({...t,ammo:3});close(sk);assert.equal(S.action(sk,'s'),true);assert.equal(sk.ammoUsed,2);assert.equal(sk.units,2);
 advance(sk,70);close(sk);assert.equal(S.action(sk,'s'),false);assert.equal(sk.ammoUsed,2);assert.equal(S.action(sk,'a'),true);
});
test('S during a telegraphed counter cancels it',()=>{
 const s=S.create({ammo:6});advance(s,60);assert.ok(s.warning);close(s);assert.equal(S.action(s,'s'),true);assert.equal(s.warning,null);
 advance(s,30);assert.equal(s.hp,100);assert.equal(s.bumps,0);
});
test('dodge or block makes the next hit a 1.5x strong hit',()=>{
 const s=S.create({ammo:6});advance(s,60);advance(s,35,{direction:-1,vertical:-1});assert.equal(s.dodges,1);assert.equal(s.boost,true);
 close(s);S.action(s,'a');assert.equal(s.units,1.5);assert.equal(s.boost,false);assert.equal(s.boosts,1);
 const b=S.create({ammo:6});advance(b,60);S.action(b,'d');advance(b,35);assert.equal(b.blocks,1);assert.equal(b.boost,true);
});
test('perfect hunt adds 10% and total bonus stays capped at +35% over skipping',()=>{
 assert.equal(C.arenaDamage({ammo:6,baseDamage:72},6,true),79);
 assert.equal(C.arenaDamage({ammo:6,baseDamage:72},100,true),Math.round(72*C.ARENA_CAP));
 const out=C.resolve(ready(),{ticketId:'one',report:{rpg:true,v:2,attacksUsed:6,units:99,hits:9,perfect:true,boosts:3}},G,R);
 assert.equal(out.damage,97);assert.equal(out.game.hp,0);assert.equal(out.strong,true);
});
test('monster HP is shown in the arena; a kill ends the fight and returns unused rights',()=>{
 const s=S.create({ammo:6,baseDamage:72,monsterHp:30,monsterMax:36});assert.equal(s.enemyHp,30);
 for(let i=0;i<3;i++){close(s);S.action(s,'a');advance(s,12);}
 assert.equal(s.killed,true);assert.equal(S.action(s,'a'),false);assert.equal(s.ammoUsed,3);
 advance(s,60);assert.equal(s.finished,true);assert.equal(s.report.killed,true);
 const g=ready();g.hp=30;const out=C.resolve(g,{ticketId:'one',report:s.report},G,R);
 assert.equal(out.defeated,true);assert.equal(out.refund,3);assert.deepEqual(out.game.huntEnergy,[12,12,12]);
 const skipped=C.resolve(ready(),{ticketId:'one',skip:true,report:s.report},G,R);assert.equal(skipped.refund,0);
});

function waitWarning(s){for(let i=0;i<200&&!s.warning;i++)S.step(s,.05,{});return s.warning;}
test('every monster pattern telegraphs, can hit a standing player and can be escaped',()=>{
 for(const pattern of Object.keys(S.PATTERNS)){
  const s=S.create({pattern,ammo:6});const w=waitWarning(s);assert.ok(w,pattern);assert.ok(w.at>s.t,pattern);
  assert.equal(S.inWarning(s,w),true,pattern+' covers the player');
 }
 const dash=S.create({pattern:'dash'});const w=waitWarning(dash);assert.equal(w.kind,'line');dash.y=Math.max(120,dash.y-120);dash.x+=0;assert.equal(S.inWarning(dash,w),false);
 const cone=S.create({pattern:'breath'});const c=waitWarning(cone);assert.equal(c.kind,'cone');cone.x=cone.enemyX+60;cone.y=cone.enemyY;cone.x=c.x-Math.cos(c.a)*100;cone.y=c.y-Math.sin(c.a)*100;assert.equal(S.inWarning(cone,c),false,'behind the dragon is safe');
 const tri=S.create({pattern:'triple'});const t=waitWarning(tri);assert.equal(t.circles.length,3);
});
test('double pattern strikes twice in a row; dodging both counts two dodges',()=>{
 const s=S.create({pattern:'double',grade:6});waitWarning(s);
 advance(s,40,{direction:-1,vertical:-1});assert.equal(s.dodges,1);assert.equal(s.second,true);
 const w2=waitWarning(s);assert.ok(w2.second);assert.ok(w2.dur<1.15);advance(s,40,{direction:1,vertical:1});assert.equal(s.dodges,2);assert.equal(s.second,false);
});
test('dash moves the monster along its line; S cancels a combo chain',()=>{
 const s=S.create({pattern:'dash'});const w=waitWarning(s);for(let i=0;i<60&&s.warning;i++)S.step(s,.05,{vertical:-1});assert.equal(s.enemyX,w.x2);assert.equal(s.enemyY,w.y2);
 const d=S.create({pattern:'double',ammo:6});waitWarning(d);close(d);assert.equal(S.action(d,'s'),true);assert.equal(d.warning,null);assert.equal(d.second,false);
});
test('bosses keep the plain circle; unknown patterns fall back to circle',()=>{
 assert.equal(waitWarning(S.create({boss:true,pattern:'breath'})).kind,'circle');assert.equal(S.create({pattern:'nope'}).pattern,'circle');
});
