/* ════════ RPG 장비 ↔ 아르카 저장(save.rpg) ════════
   save.rpg = { uid, bag: [아이템...], eq: { w, o, c1, c2 }(장착한 아이템 u), room: [{ u, x, y }](마이룸에 놓은 가구), body: "m"|"f" }
   · 처음 직업을 얻으면 그 직업의 견습 무기(일반)만 받는다. 옷은 주지 않는다(상점·전리품).
   · 예전 저장(save.eq·save.own)은 한 번만 새 아이템으로 바꾼다. */
function itemExtra(id) {
  // 이야기 보물 장신구(옛 EQ 의 c_…): 유니크로 고정, 팔 수 없음
  if (typeof EQ !== "object" || !EQ[id] || EQ[id].s !== "c") return null;
  const e = EQ[id],
    b = {};
  if (e.hp) b.hp = e.hp;
  if (e.exp) b.exp = Math.round(e.exp * 100);
  if (e.gold) b.gold = Math.round(e.gold * 100);
  if (e.heal) b.heal = e.heal;
  return (ITEMS[id] = { s: "c", n: e.n, lv: 1, b, story: 1, fixG: 2, d: e.d });
}
function rpgInit() {
  if (!save.rpg) save.rpg = { uid: 1, bag: [], eq: { w: null, o: null, c1: null, c2: null }, room: [], body: "m" };
  const R = save.rpg;
  R.room = R.room || [];
  R.eq = Object.assign({ w: null, o: null, c1: null, c2: null }, R.eq);
  if (!R.mig) {
    R.mig = 1;
    // 예전 장비 → 새 아이템
    if (save.job) {
      const t = { w1: 0, w2: 2, w3: 4 }[save.eq && save.eq.w] || 0;
      for (let k = 0; k <= t; k += t || 1) {
        const it = rpgAdd("w_" + save.job + "_" + k, 0, true);
        if (k === t && it) R.eq.w = it.u;
        if (!t) break;
      }
    }
    const own = save.own || [];
    if (own.includes("a2")) rpgAdd("o_travel", 1, true);
    if (own.includes("a3")) R.eq.o = rpgAdd("o_guard", 1, true).u;
  }
}
// 이야기 보물 장신구는 뒤 파일(06·08·10)에서도 EQ 에 더해지므로, 모든 파일을 불러온 뒤 바꾼다(src/14-rpg.js 가 부름)
function rpgMigrateLate() {
  const R = save.rpg;
  if (R.mig2) return;
  R.mig2 = 1;
  (save.own || []).filter((id) => /^c_/.test(id)).forEach((id) => {
    const it = rpgGiveStory(id);
    if (it && save.eq && save.eq.c === id) R.eq.c1 = it.u;
  });
}
// 가방에 넣기(꽉 차면 null). quiet: 알림 없음
const BAG_MAX = 40;
function rpgAdd(id, g, quiet) {
  const R = save.rpg;
  if (!itemDef(id)) return null;
  if (R.bag.length >= BAG_MAX && !quiet) return null;
  const it = makeItem(id, g, Math.random, R.uid++);
  R.bag.push(it);
  return it;
}
const rpgGet = (u) => (u == null ? null : save.rpg.bag.find((i) => i.u === u) || null);
const rpgHas = (id) => save.rpg.bag.some((i) => i.id === id);
// 장착한 것 모두의 능력 합 + 레벨 기본
function rpgSum() {
  const S = { atk: 0, hp: 0, def: 0, crit: 0, exp: 0, gold: 0, dust: 0, heal: 0 };
  if (!save.rpg) return S;
  Object.values(save.rpg.eq).forEach((u) => {
    const it = rpgGet(u);
    if (it) {
      const s = itemStats(it);
      for (const k in S) S[k] += s[k];
    }
  });
  return S;
}
// 공격력 = 무기 + 레벨 보너스(레벨마다 +2) + 추가 능력. 무기가 없으면 맨손 5
function rpgAtk() {
  const S = rpgSum(),
    w = rpgGet(save.rpg && save.rpg.eq.w);
  return (w ? 0 : 5) + S.atk + 2 * (save.lv - 1);
}
const rpgHp = () => rpgSum().hp;
// 옛 그림(손으로 그린 사람)의 무기 색 단계: 무기 레벨로
function rpgWTier() {
  const w = rpgGet(save.rpg && save.rpg.eq.w),
    d = w && itemDef(w.id);
  return d ? (d.lv >= 13 ? 2 : d.lv >= 7 ? 1 : 0) : 0;
}
// 이야기 보물(퀘스트 보상·상인): 유니크 장신구로
function rpgGiveStory(id) {
  if (!itemDef(id) || rpgHas(id)) return null;
  return rpgAdd(id, 2, true);
}
rpgInit();

/* ── 성장 곡선(2026-11-14 균형 맞추기) ──
   1~12부를 한 바퀴 돌면 얻는 경험치(약 16,700)로 12부 끝에 Lv 20 이 되도록:
   Lv L 까지 모은 경험치 = 16700 × ((L-1)/19)^1.53  → 1부 끝 Lv 3, 3부 7, 6부 12, 9부 17, 12부 20.
   한 레벨에 필요한 경험치 expNeed(lv) 는 그 차이. 계산은 tools 없이 econ 시뮬레이션(검사 스크립트)으로 확인. */
const EXP_TOTAL = 16700;
const expCum = (L) => EXP_TOTAL * Math.pow(Math.max(0, L - 1) / 19, 1.53);
const expNeed = (lv) => Math.max(40, Math.round(expCum(lv + 1) - expCum(lv)));
// 그 부에서 예상되는 레벨(부의 가운데쯤)과 공격력 → 몬스터 체력을 여기에 맞춘다(일반 2~3번, 보스 6~10번 맞혀야 쓰러짐)
function partLevel(part) {
  return Math.max(1, 1 + 19 * Math.pow(Math.min(1, (part - 0.5) / 12), 0.655));
}
function partPow(part) {
  const L = partLevel(part),
    t = WLV.filter((lv) => lv <= L).length - 1;
  return 10 + 6 * Math.max(0, t) + 2 * (L - 1);
}
