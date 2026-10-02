/* ─────────────────────────────────────────────────────────────────────────
   rpg-monsters.js — 학습 RPG 3단계: 몬스터 · 경험치 · 게임 레벨

   설계 근거: 학습게임_개발_프롬프트.md 2-2 / 2-3 / 2-4 / 7

   지키는 원칙
   · 틀려도 학생 체력을 깎지 않는다. 몬스터가 조금 회복할 뿐이다.
     (못하는 학생이 더 빨리 죽고 그게 반 전체에 보이는 구조를 만들지 않는다)
   · 데미지는 난이도 대비로 정규화한다. 실력이 달라도 한 문제당 기여도가 비슷하다.
   · 경험치는 절대 난이도가 아니라 '그 학생에게 어려운 정도'에 비례한다.
   · 게임 레벨은 절대 내려가지 않는다. 실력 레이팅만 오르내린다.
   · 지역 잠금은 레벨이 아니라 처치 수로 건다 (시간을 쓰면 뚫린다).

   quiz-rating.js 다음에 로드한다. DOM 을 만지지 않는다.
   ───────────────────────────────────────────────────────────────────────── */
(function (root) {
'use strict';

/* ── 지역 ──
   need 는 '앞 지역에서 몇 마리를 잡아야 열리는가'. 실력이 아니라 시간이 기준이다. */
const REGIONS = [
  { id: 'field', name: '들판', icon: '🌿', need: 0,  color: '#7fc98a' },
  { id: 'cave',  name: '동굴', icon: '🕳️', need: 8,  color: '#8f9bb3' },
  { id: 'tower', name: '탑',   icon: '🗼', need: 20, color: '#b48fd6' }
];

/* ── 몬스터 ──
   무섭지 않은 쪽으로 고른다. hp 는 '정답 몇 번이면 잡히는가'로 잡았다
   (정답 1회 ≈ 10~13 데미지). exp 는 잡았을 때 주는 기본 경험치. */
const MONSTERS = [
  { id: 'm_mush',   region: 'field', name: '버섯몬',    icon: '🍄', hp: 36,  exp: 18, color: '#e88a8a' },
  { id: 'm_worm',   region: 'field', name: '꼬물이',    icon: '🐛', hp: 48,  exp: 24, color: '#9ed36a' },
  { id: 'm_bee',    region: 'field', name: '붕붕벌',    icon: '🐝', hp: 60,  exp: 30, color: '#f2c94c' },
  { id: 'm_fox',    region: 'field', name: '장난꾸러기 여우', icon: '🦊', hp: 78, exp: 40, color: '#f0925a' },
  { id: 'm_bat',    region: 'cave',  name: '동굴 박쥐',  icon: '🦇', hp: 96,  exp: 52, color: '#8d7fb8' },
  { id: 'm_slime',  region: 'cave',  name: '바위 슬라임', icon: '🪨', hp: 120, exp: 66, color: '#9aa5b1' },
  { id: 'm_crab',   region: 'cave',  name: '집게 바위게', icon: '🦀', hp: 144, exp: 82, color: '#e2705a' },
  { id: 'm_ghost',  region: 'tower', name: '수줍은 유령', icon: '👻', hp: 170, exp: 100, color: '#b9c6e0' },
  { id: 'm_wizard', region: 'tower', name: '숫자 마법사', icon: '🧙', hp: 200, exp: 122, color: '#8f7ae0' },
  { id: 'm_dragon', region: 'tower', name: '아기 용',    icon: '🐉', hp: 240, exp: 150, color: '#5fc9a8' }
];

const BY_ID = {};
MONSTERS.forEach(m => { BY_ID[m.id] = m; });
const monsterById = id => BY_ID[id] || null;
const monstersOf = regionId => MONSTERS.filter(m => m.region === regionId);
/* 다음 몬스터는 학생이 고르지 않는다. 약한 몬스터도 강한 몬스터도 무작위로 나온다.
   방금 잡은 몬스터가 바로 다시 나오지 않게만 한다. */
function randomMonster(excludeId, rnd) {
  const pool = MONSTERS.filter(m => m.id !== excludeId);
  const r = typeof rnd === 'function' ? rnd() : Math.random();
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(r * pool.length)))];
}
/* 체력으로 매기는 강함 표시 — 무작위로 만난 몬스터가 어느 정도인지 알려준다 */
function monsterRank(m) {
  const hp = (m && m.hp) || 0;
  return hp <= 60 ? { id: 'easy', label: '약함' } : hp <= 144 ? { id: 'mid', label: '보통' } : { id: 'hard', label: '강함' };
}

/* ── 게임 레벨 ──
   보이는 레벨. 경험치 누적으로만 오르고 절대 내려가지 않는다.
   레벨 n → n+1 에 GXP_PER_LEVEL × n 이 든다 (뒤로 갈수록 느려진다). */
const GXP_PER_LEVEL = 60;
const gxpToReach = L => GXP_PER_LEVEL * L * (L - 1) / 2;
function gameLevel(gxp) {
  const x = Math.max(0, Number(gxp) || 0);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 8 * x / GXP_PER_LEVEL)) / 2));
}
function gxpInLevel(gxp) {
  const x = Math.max(0, Number(gxp) || 0);
  return Math.round(x - gxpToReach(gameLevel(x)));
}
function gxpForNextLevel(gxp) { return GXP_PER_LEVEL * gameLevel(gxp); }

/* ── 데미지 ──
   난이도 대비로 정규화한다. 자기 수준에 맞는 문제를 맞히면 누구나 비슷하게 때리고,
   자기보다 어려운 문제를 맞히면 더 크게 때린다. 실력이 낮아도 기여도가 비슷해진다. */
const BASE_DMG = 12;
function damageFor(rating, difficulty, expectedScoreFn) {
  // 기존 영어/타 학년 문제에는 레이팅 난이도가 없다. 기본 피해를 보장한다.
  if(difficulty == null || !Number.isFinite(Number(difficulty))) return BASE_DMG;
  const p = expectedScoreFn ? expectedScoreFn(rating, difficulty)
          : 1 / (1 + Math.pow(10, (difficulty - rating) / 400));
  return Math.max(4, Math.round(BASE_DMG * (0.6 + 0.8 * (1 - p))));
}
/* 틀렸을 때 — 학생은 아무것도 잃지 않고 몬스터가 조금 회복한다 */
const HEAL_ON_WRONG = 0.05;                 // 최대 체력의 5%
function healOnWrong(monster) {
  return Math.max(1, Math.round((monster.hp || 50) * HEAL_ON_WRONG));
}

/* ── 진행 상태 ──
   pesk-quiz-progress 의 학생 기록 안에 game 으로 함께 저장한다.
   문서를 새로 만들지 않으므로 보안 규칙을 건드릴 필요가 없다. */
function newGameState() {
  return { gxp: 0, kills: {}, monsterId: MONSTERS[0].id, hp: MONSTERS[0].hp,
           streakId: '', streakCount: 0, defeated: 0, combatStyle:'', petCharge:0,
           petShield:false, pendingAttack:null, guardDay:'', guardUsed:0,carryDamage:0,heroHp:100,huntAttempts:0,huntEnergy:[],shooting:{rounds:0,hits:0,dodges:0,best:0,combos:0} };
}
function normalizeGame(raw) {
  const g = (raw && typeof raw === 'object') ? raw : {};
  const kills = (g.kills && typeof g.kills === 'object') ? g.kills : {};
  const cleanKills = {};
  Object.keys(kills).forEach(k => {
    if (BY_ID[k]) cleanKills[k] = Math.max(0, Math.min(9999, Math.round(Number(kills[k]) || 0)));
  });
  // 보스는 모험 몬스터와 분리됐다. 예전에 대상을 '__boss__' 로 골라 둔 기록은
  // 첫 몬스터로 되돌린다 (그때 모아 둔 보스 공격권은 pendingAttack 에 그대로 남아 정산된다).
  const known = !!BY_ID[g.monsterId];
  const mid = known ? g.monsterId : MONSTERS[0].id;
  const max = BY_ID[mid].hp;
  return {
    gxp: Math.max(0, Math.round(Number(g.gxp) || 0)),
    kills: cleanKills,
    monsterId: mid,
    // g.hp 가 없을 때를 Number(g.hp)==null 로 보면 안 된다 — Number(undefined) 는 NaN 이고
    // NaN == null 은 false 라, 체력이 통째로 NaN 이 된다
    hp: known ? Math.max(0, Math.min(max, Number.isFinite(Number(g.hp)) ? Math.round(Number(g.hp)) : max)) : max,
    killDay: /^\d{4}-\d{2}-\d{2}$/.test(String(g.killDay || '')) ? String(g.killDay) : '',
    streakId: BY_ID[g.streakId] ? g.streakId : '',
    streakCount: Math.max(0, Math.min(99, Math.round(Number(g.streakCount) || 0))),
    defeated: Math.max(0, Math.round(Number(g.defeated) || 0)),
    combatStyle: ['sword','staff','axe','spear','crystal','bow','dagger','mace'].includes(g.combatStyle) ? g.combatStyle : '',
    heroHp:Math.max(0,Math.min(100,Number.isFinite(Number(g.heroHp))?Math.round(Number(g.heroHp)):100)),
    huntAttempts:Math.max(0,Math.min(30,Math.round(Number(g.huntAttempts)||g.huntEnergy?.length||0))),
    carryDamage: Math.min(12,Math.max(0,Number(g.carryDamage)||0)),
    huntEnergy: (Array.isArray(g.huntEnergy)?g.huntEnergy:[]).slice(0,30).map(x=>Math.max(1,Math.min(40,Math.round(Number(x)||12)))),
    shooting: Object.fromEntries(['rounds','hits','dodges','best','combos'].map(k=>[k,Math.max(0,Math.min(999999,Math.floor(Number(g.shooting?.[k])||0)))])),
    petCharge: Math.max(0,Math.min(3,Math.round(Number(g.petCharge)||0))),
    petShield: g.petShield===true,
    guardDay: String(g.guardDay||'').slice(0,10),
    guardUsed: Math.max(0,Math.min(3,Math.round(Number(g.guardUsed)||0))),
    pendingAttack: normalizeAttack(g.pendingAttack)
  };
}
function normalizeAttack(raw){
  if(!raw || !raw.id || (!BY_ID[raw.monsterId] && raw.monsterId!=='__boss__')) return null;
  const finite=(x,d)=>Number.isFinite(Number(x)) ? Number(x) : d;
  return {id:String(raw.id).slice(0,100),monsterId:raw.monsterId,
    bossRound:String(raw.bossRound||'').slice(0,80),
    baseDamage:Math.max(1,Math.min(1200,Math.round(finite(raw.baseDamage,BASE_DMG)))),
    expMultiplier:Math.max(1,Math.min(3,finite(raw.expMultiplier,1))),
    weaponStyle:['sword','staff','axe','spear','crystal','bow','dagger','mace'].includes(raw.weaponStyle) ? raw.weaponStyle : 'sword',
    petSkill:['attack','guard','focus'].includes(raw.petSkill) ? raw.petSkill : '',
    ...(raw.mode==='shooter'?{mode:'shooter',ammo:Math.max(1,Math.min(30,Math.round(Number(raw.ammo)||1))),weaponId:String(raw.weaponId||'').slice(0,60),petId:String(raw.petId||'').slice(0,60),petTier:['common','rare','unique','legend'].includes(raw.petTier)?raw.petTier:'common'}:{})};
}
const totalKills = game => Object.keys(game.kills || {}).reduce((s, k) => s + (game.kills[k] || 0), 0);

/* 지역이 열렸는가 — 누적 처치 수로만 판정한다 */
function regionUnlocked(regionId, game) {
  const reg = REGIONS.find(x => x.id === regionId);
  if (!reg) return false;
  return totalKills(game) >= reg.need;
}
function unlockedRegions(game) { return REGIONS.filter(r => regionUnlocked(r.id, game)); }
/* 다음 지역까지 남은 처치 수 */
function nextRegionInfo(game) {
  const done = totalKills(game);
  const locked = REGIONS.find(r => done < r.need);
  return locked ? { region: locked, remain: locked.need - done } : null;
}

/* ── 칭호 ──
   모험 레벨이 숫자로만 남지 않도록 붙이는 외형 보상.
   성능에는 전혀 영향이 없어 학급 경제·학습에 부작용이 없다.
   내 방 이름표와 우리 반 갤러리에 나온다. */
const TITLES = [
  { lv: 1,  name: '' },
  { lv: 3,  name: '모험 초보' },
  { lv: 5,  name: '들판의 수호자' },
  { lv: 8,  name: '동굴 탐험가' },
  { lv: 12, name: '탑의 도전자' },
  { lv: 16, name: '몬스터 사냥꾼' },
  { lv: 20, name: '전설의 모험가' }
];
function titleOf(gxp) {
  const lv = gameLevel(gxp);
  let cur = '';
  TITLES.forEach(t => { if (lv >= t.lv) cur = t.name; });
  return cur;
}
function nextTitle(gxp) {
  const lv = gameLevel(gxp);
  return TITLES.find(t => t.lv > lv) || null;
}

/* ─────────────────────────────────────────────────────────
   🗿 우리 반 보스 — 비동기 협동 (설계 2-5)

   "누구든 아무 때나 들어가 문제를 풀면 체력이 깎인다."

   체력을 한 문서에 두고 30명이 깎으면 쓰기 충돌이 나고, 새 문서 권한도
   열어야 한다. 그래서 뒤집었다.
     보스 체력 = 최대체력 − Σ(학생들이 각자 자기 칸에 적은 데미지)
   학생은 이미 쓸 수 있는 pesk-quiz-progress 의 자기 칸에만 적고,
   체력은 읽어서 합산한다. 실시간 구독도 이미 걸려 있어 친구가 때리면
   내 화면 체력바가 같이 내려간다.

   못 깨면? 보스는 사라지지 않고 그대로 남는다. 주가 바뀌어도 체력이
   유지되므로 "이번 주에 못 깼다"로 끝나지 않는다. 선생님이 새 보스를
   낼 때 roundId 가 바뀌고 그때 데미지가 초기화된다.
   ───────────────────────────────────────────────────────── */
function normalizeBoss(raw) {
  const b = (raw && typeof raw === 'object') ? raw : {};
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  return {
    enabled: b.enabled === true,
    roundId: String(b.roundId || ''),
    name: String(b.name || '우리 반 보스').slice(0, 20),
    icon: String(b.icon || '🗿').slice(0, 4),
    character: ['golem','slime','dragon','mushroom','ghost','robot','crystal','owl'].includes(b.character)?b.character:'golem',
    maxHp: Math.max(100, Math.min(200000, Math.round(num(b.maxHp, 3000)))),
    deadline: String(b.deadline || '').slice(0, 10),
    // 오늘 이만큼 풀어야 보스에 도전할 수 있다. 매일 리셋되므로 뒤처진 아이도
    // 오늘 문제를 풀면 바로 들어온다 (레벨 조건이면 영영 못 들어오는 아이가 생긴다)
    entryNeed: Math.max(0, Math.min(50, Math.round(num(b.entryNeed, 5)))),
    // 보스전은 하루 한 번. 모험에서 모은 공격권은 쓰지 않고 보스전 전용 공격 횟수로 싸운다
    dailyAmmo: Math.max(1, Math.min(30, Math.round(num(b.dailyAmmo, 6)))),
    rewardTitle: String(b.rewardTitle || '').slice(0, 20),
    rewardXp: Math.max(0, Math.min(100000, Math.round(num(b.rewardXp, 0)))),
    rewardItemId: String(b.rewardItemId || '').slice(0, 120),
    rewardItemQty: Math.max(1, Math.min(20, Math.round(num(b.rewardItemQty, 1)))),
    note: String(b.note || '').slice(0, 60),
    color: String(b.color || '#8f7ae0').slice(0, 20)
  };
}
/* 학생 한 명의 보스 기록 */
function normalizeBossRec(raw) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  const pending = normalizeAttack(r.pending);
  return {
    roundId: String(r.roundId || ''),
    dmg: Math.max(0, Math.min(999999, Math.round(Number(r.dmg) || 0))),
    titles: Array.isArray(r.titles) ? r.titles.map(t => String(t).slice(0, 120)).slice(-20) : [],
    // 마지막으로 보스에 도전한 날 (하루 1회 제한)
    day: /^\d{4}-\d{2}-\d{2}$/.test(String(r.day || '')) ? String(r.day) : '',
    // 시작했지만 아직 결과를 저장하지 않은 보스전. 모험의 pendingAttack 과 따로 둔다
    pending: pending && pending.monsterId === '__boss__' ? pending : null
  };
}
/* 오늘 이 학생이 보스에 도전할 수 있는가.
   조건: 오늘 entryNeed 문제를 풀었거나, 오늘 모험에서 몬스터를 한 마리 이상 쓰러뜨렸다.
   도전은 하루 한 번 — 시작하는 순간 오늘 기회를 쓴다(그만둬도 다시 시작할 수 없다). */
function bossChallenge(cfg, record, today) {
  const c = normalizeBoss(cfg);
  const r = (record && typeof record === 'object') ? record : {};
  const rec = normalizeBossRec(r.boss);
  const game = normalizeGame(r.game);
  const tried = Math.max(0, Number(r.daily && r.daily[today] && r.daily[today].tried) || 0);
  const killedToday = !!today && game.killDay === today;
  const pending = rec.pending && rec.pending.bossRound === c.roundId ? rec.pending : null;
  const usedToday = !!today && rec.day === today && rec.roundId === c.roundId;
  const unlocked = killedToday || tried >= c.entryNeed;
  return { need: c.entryNeed, tried, left: Math.max(0, c.entryNeed - tried), killedToday,
           unlocked, usedToday, pending, ok: unlocked && !usedToday && !pending };
}
/* 전체 진행도에서 이번 판의 보스 상태를 계산한다.
   progressMap 은 pesk-quiz-progress 의 value 그대로. */
function bossState(cfg, progressMap, students) {
  const c = normalizeBoss(cfg);
  const src = (progressMap && typeof progressMap === 'object') ? progressMap : {};
  let total = 0;
  const byNum = {};
  Object.keys(src).forEach(k => {
    const rec = normalizeBossRec(src[k] && src[k].boss);
    if (!c.roundId || rec.roundId !== c.roundId) return;
    if (rec.dmg <= 0) return;
    total += rec.dmg;
    byNum[k] = rec.dmg;
  });
  const hp = Math.max(0, c.maxHp - total);
  const joined = Object.keys(byNum).length;
  const roster = Array.isArray(students) ? students : [];
  const contributors = roster
    .map(st => ({ num: st.num, name: st.name, dmg: byNum[st.num] || byNum[String(st.num)] || 0 }))
    .filter(x => x.dmg > 0)
    .sort((a, b) => a.num - b.num);        // 등수를 매기지 않는다 (문서 6번) — 번호순
  return {
    cfg: c, on: c.enabled && !!c.roundId,
    maxHp: c.maxHp, hp, total,
    pct: Math.max(0, Math.min(100, Math.round(hp / c.maxHp * 100))),
    cleared: hp <= 0,
    joined, contributors,
    remainText: hp > 0 ? hp.toLocaleString() : '0'
  };
}

const API = {
  REGIONS, MONSTERS, GXP_PER_LEVEL, BASE_DMG,
  monsterById, monstersOf, randomMonster, monsterRank, bossChallenge,
  gameLevel, gxpInLevel, gxpForNextLevel, gxpToReach,
  damageFor, healOnWrong,
  newGameState, normalizeGame, totalKills,
  regionUnlocked, unlockedRegions, nextRegionInfo,
  TITLES, titleOf, nextTitle,
  normalizeBoss, normalizeBossRec, bossState
};
if (typeof module === 'object' && module.exports) module.exports = API;
root.RPG = API;

})(typeof window !== 'undefined' ? window : globalThis);
