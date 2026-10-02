/* 모험 전투 규칙. DOM/저장소 없이 계산하고, 저장은 학습 기록 트랜잭션에서 수행한다. */
(function(root){
'use strict';
const WEAPONS = {
  sword:{id:'sword',name:'검',icon:'⚔️',action:'힘을 모아 베기',duration:1500,low:.55,high:.85},
  staff:{id:'staff',name:'지팡이',icon:'🪄',action:'별을 눌러 마법 발사',duration:0,low:0,high:1},
  axe:{id:'axe',name:'도끼',icon:'🪓',action:'빛나는 순간 내려치기',duration:1900,low:.45,high:.85},
  spear:{id:'spear',name:'창',icon:'🔱',action:'약점을 꿰뚫는 창',duration:1500,low:.4,high:.9},
  crystal:{id:'crystal',name:'수정',icon:'💎',action:'펫과 공명하는 빛',duration:1500,low:.4,high:.9},
  bow:{id:'bow',name:'활',icon:'🏹',action:'곧게 날아가는 화살',duration:1500,low:.4,high:.9},
  dagger:{id:'dagger',name:'단검',icon:'🗡️',action:'빠른 연속 투척',duration:1500,low:.4,high:.9},
  mace:{id:'mace',name:'철퇴',icon:'🔨',action:'묵직한 철퇴',duration:1500,low:.4,high:.9}
};
const TIERS={common:{name:'일반',color:'#94b7ab',trait:'기본 스킬'},rare:{name:'희귀',color:'#57b7f7',trait:'스킬에 밀어내기 추가'},unique:{name:'유니크',color:'#bb8af7',trait:'공격이 몬스터를 추적'},legend:{name:'전설',color:'#ffd267',trait:'3회 명중 후 합동기'}};
const PETS={
  p_dog:{name:'강아지',icon:'🐶',ability:'dash',skill:'함께 돌진',desc:'앞으로 돌진해 크게 타격해요.',story:'발자국을 따라오던 친구가 이제는 앞장서서 길을 열어요.'},
  p_cat:{name:'고양이',icon:'🐱',ability:'double',skill:'두 번 할퀴기',desc:'빠른 두 발의 보조 공격을 해요.',story:'잠꾸러기였던 친구가 당신의 모험 시간만큼은 꼭 기억해요.'},
  p_rabbit:{name:'토끼',icon:'🐰',ability:'speed',skill:'바람 발걸음',desc:'잠시 빨라지고 몬스터의 움직임은 느려져요.',story:'작은 뜀박질을 함께 연습했더니 이제 바람과 달리게 됐어요.'},
  p_slime:{name:'슬라임',icon:'🟢',ability:'shield',skill:'말랑 방패',desc:'잠시 몬스터의 반격을 막아요.',story:'작은 물방울이 당신을 지켜주는 든든한 방패로 자랐어요.'},
  p_chick:{name:'병아리',icon:'🐤',ability:'charge',skill:'힘내요 응원',desc:'함께 공격하고 다음 스킬 에너지를 1칸 남겨요.',story:'처음에는 뒤따라오기 바빴지만 이제 지친 친구를 응원해요.'},
  p_cat_bk:{name:'검은 고양이',icon:'🐈‍⬛',ability:'ambush',skill:'그림자 기습',desc:'잠깐 숨어 준비한 뒤 강하게 기습해요.',story:'어둠 속 반짝이는 눈은 언제나 당신의 길을 살피고 있어요.'},
  p_slime_p:{name:'분홍 슬라임',icon:'🩷',ability:'support',skill:'분홍빛 응원',desc:'두 번에 걸쳐 지원 타격을 해요.',story:'함께 웃었던 순간들이 모여 따뜻한 분홍빛이 되었어요.'},
  p_chick_g:{name:'황금 병아리',icon:'🐥',ability:'carry',skill:'햇살 이어달리기',desc:'처치할 때 남은 공격력을 다음 몬스터에 전해요.',story:'작은 친절을 모아 온 날, 깃털마다 아침 햇살이 깃들었어요.'}
};
function petProfile(id,level=1,tier){
  if(!PETS[id])return null;
  const ranks=Object.keys(TIERS),base=tier||({p_cat_bk:'rare',p_slime_p:'unique',p_chick_g:'legend'}[id]||'common');
  const grown=level>=30?3:level>=20?2:level>=10?1:0,rank=Math.max(0,ranks.indexOf(base),grown);
  return {...PETS[id],id,tier:ranks[rank],rank,...TIERS[ranks[rank]],name:PETS[id].name,tierName:TIERS[ranks[rank]].name};
}
function weaponProfile(style,item=''){
  const w=weaponFor(item,style);
  const profiles={sword:{shot:'wave',interval:.55,speed:400,width:27,color:'#8ee7c1',desc:'넓은 검기 · 맞히기 쉬워요'},staff:{shot:'bolt',interval:.26,speed:510,width:9,color:'#b998ff',desc:'룬 폭발 · 멀리서 마법 시전'},axe:{shot:'axe',interval:.95,speed:310,width:32,color:'#ffc16b',desc:'느리고 큰 도끼 · 방어막 깨기'},spear:{shot:'spear',interval:.65,speed:650,width:8,color:'#70d8ed',desc:'빠른 관통 · 약점 명중'},crystal:{shot:'crystal',interval:.65,speed:380,width:15,color:'#f1a4df',desc:'수정 결계 · 펫과 공명'}};
  profiles.bow={shot:'spear',interval:.38,speed:610,width:10,color:'#c7e995',desc:'빠르고 곧은 화살'};
  profiles.dagger={shot:'spear',interval:.23,speed:480,width:7,color:'#d1e3ed',desc:'그림자 연격 · 교차 베기'};
  profiles.mace={shot:'mace',interval:1.0,speed:290,width:34,color:'#a8bed4',desc:'커다란 철퇴로 묵직한 타격'};
  const element=/flame/.test(item)?'fire':/frost/.test(item)?'ice':'';
  return {...w,...profiles[w.id],element,desc:profiles[w.id].desc+(element==='fire'?' · 불꽃 타격 효과':element==='ice'?' · 서리로 움직임 둔화':'')};
}
const SKILLS = {
  attack:{id:'attack',name:'함께 돌진',icon:'💥',desc:'이번 공격 피해 +25%'},
  guard:{id:'guard',name:'말랑 방패',icon:'🛡️',desc:'다음 오답의 몬스터 회복을 한 번 막아요'},
  focus:{id:'focus',name:'집중의 응원',icon:'✨',desc:'이번 강타 판정 구간이 넓어져요'}
};
function weaponFor(item, selected){
  if(WEAPONS[selected]) return WEAPONS[selected];
  if(/crystal/.test(item || '')) return WEAPONS.crystal;
  if(/staff/.test(item || '')) return WEAPONS.staff;
  if(/spear/.test(item || '')) return WEAPONS.spear;
  if(/bow/.test(item || '')) return WEAPONS.bow;
  if(/dagger/.test(item || '')) return WEAPONS.dagger;
  if(/mace/.test(item || '')) return WEAPONS.mace;
  if(/axe/.test(item || '')) return WEAPONS.axe;
  return WEAPONS.sword;
}
function skillFor(pet){
  if(!pet) return null;
  return /slime/.test(pet) ? SKILLS.guard : /rabbit/.test(pet) ? SKILLS.focus : SKILLS.attack;
}
function power(elapsed, weapon){
  if(!weapon.duration) return 0;
  const p=Math.max(0, Number(elapsed)||0)/weapon.duration;
  // 검은 끝까지 모으면 유지, 도끼는 왕복. 두 경우 모두 기본 피해는 보장한다.
  return weapon.id==='axe' ? 1-Math.abs((p%2)-1) : Math.min(1,p);
}
function timing(weapon, position, focus, automatic){
  if(automatic) return {strong:false,multiplier:1};
  const p=Math.max(0,Math.min(1,Number(position)||0));
  const extra=focus ? .15 : 0;
  const strong=weapon.id==='staff' || (p>=weapon.low-extra && p<=weapon.high+extra);
  return {strong,multiplier:strong ? 1.15 : 1};
}
function prepare(raw, input, G){
  const game=G.normalizeGame(raw);
  if(game.pendingAttack) throw new Error('ATTACK_PENDING');
  const monster=G.monsterById(game.monsterId);
  if(game.monsterId!==input.target) throw new Error('STALE_QUESTION');
  if(monster && game.hp<=0) game.hp=monster.hp;
  let guarded=false;
  if(input.ticket?.mode==='hunt'){
    if(game.heroHp<=0)throw new Error('REST_REQUIRED');
    game.huntAttempts++;
    if(input.correct){game.huntEnergy.push(input.ticket.baseDamage);game.petCharge=Math.min(3,game.petCharge+1);}
    else{game.heroHp=Math.max(0,game.heroHp-12);}
    return {game,guarded,hpLost:input.correct?0:12};
  }
  if(input.correct){
    game.petCharge=Math.min(3,game.petCharge+1);
    game.pendingAttack={...input.ticket,monsterId:game.monsterId};
  } else if(monster){
    if(game.petShield){game.petShield=false;guarded=true;}
    else if(input.passiveGuard && (game.guardDay!==input.day || game.guardUsed<3)){
      if(game.guardDay!==input.day){game.guardDay=input.day;game.guardUsed=0;}
      game.guardUsed++;guarded=true;
    } else game.hp=Math.min(monster.hp,game.hp+G.healOnWrong(monster));
  }
  return {game,guarded};
}
function resolve(raw, input, G, R){
  const game=G.normalizeGame(raw),ticket=game.pendingAttack;
  if(!ticket || ticket.id!==input.ticketId) throw new Error('ATTACK_ALREADY_USED');
  const weapon=weaponFor('',ticket.weaponStyle);
  const skill=input.usePet && game.petCharge>=3 ? SKILLS[ticket.petSkill] : null;
  const shooting=ticket.mode==='shooter';
  const report=input.report||{};
  const pet=petProfile(ticket.petId,1,ticket.petTier);
  const played=shooting && !input.skip;
  const hit=shooting ? {strong:played && Number(report.hits)>=6,multiplier:played ? 1+Math.min(.15,Math.max(0,Number(report.hits)||0)*.015) : 1} : timing(weapon,input.position,skill && skill.id==='focus',input.automatic);
  const usedFraction=report.rpg&&!input.skip?Math.min(1,Math.max(0,Number(report.attacksUsed)||0)/ticket.ammo):1;
  const damage=Math.max(usedFraction?1:0,Math.round(ticket.baseDamage*usedFraction*hit.multiplier*(!shooting && skill && skill.id==='attack' ? 1.25 : 1)));
  if(!shooting && skill){game.petCharge=0;if(skill.id==='guard')game.petShield=true;}
  const used=(played||report.rpg===true) && report.skillUsed===true && game.petCharge>=3 && pet && (pet.tier!=='legend'||Number(report.hits)>=3);
  if(used){game.petCharge=pet.ability==='charge'?1:0;if(pet.ability==='shield')game.petShield=true;}
  if(played){const s=game.shooting;s.rounds++;s.hits+=Math.min(100,Math.max(0,Math.floor(Number(report.hits)||0)));s.dodges+=Math.min(100,Math.max(0,Math.floor(Number(report.dodges)||0)));s.best=Math.max(s.best,Math.min(100,Math.max(0,Math.floor(Number(report.hits)||0))));if(used && pet.tier==='legend' && Number(report.hits)>=3)s.combos++;}
  if(report.rpg)game.heroHp=Math.max(0,game.heroHp-Math.max(0,Math.min(100,Math.round(Number(report.hpLost)||0))));
  game.pendingAttack=null;
  let defeated=false,exp=0;
  const monster=G.monsterById(ticket.monsterId);
  if(monster){
    const carry=shooting ? game.carryDamage : 0;
    const remaining=game.hp-damage-carry;game.carryDamage=0;
    game.hp=Math.max(0,remaining);
    if(used && pet.ability==='carry' && remaining<0)game.carryDamage=Math.min(12,-remaining);
    if(game.hp===0&&damage>0){
      defeated=true;
      game.streakCount=game.streakId===monster.id ? game.streakCount+1 : 1;
      game.streakId=monster.id;
      exp=Math.max(1,Math.round(monster.exp*R.streakDecay(game.streakCount)*ticket.expMultiplier));
      game.gxp+=exp;game.kills[monster.id]=(game.kills[monster.id]||0)+1;game.defeated++;
      // 오늘 몬스터를 쓰러뜨렸다 → 우리 반 보스 도전 자격
      if(/^\d{4}-\d{2}-\d{2}$/.test(String(input.day||'')))game.killDay=String(input.day);
    }
  }
  return {game,damage,strong:hit.strong,skill:shooting ? (used?pet.skill:'') : (skill ? skill.name : ''),defeated,exp,ticket};
}
const API={WEAPONS,SKILLS,TIERS,PETS,petProfile,weaponProfile,weaponFor,skillFor,power,timing,prepare,resolve};
if(typeof module==='object' && module.exports) module.exports=API;
root.PeskCombat=API;
})(typeof window!=='undefined' ? window : globalThis);
