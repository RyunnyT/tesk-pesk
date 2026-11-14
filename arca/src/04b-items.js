/* ════════ RPG 장비 (아이템·등급·레벨 제한) ════════
   나중에 Pesk 와 같이 쓰려고, 아래 '데이터와 계산' 부분은 게임 화면(캔버스·save)을 모르는 순수한 코드로 둔다.
   · 아이템 = 종류(ITEMS 의 id) + 등급 g(0 일반·1 레어·2 유니크·3 레전드) + 추가 능력 s([[이름, 값], ...]).
   · 같은 아이템이라도 등급이 높을수록 기본 능력이 커지고(배율), 추가 능력 줄이 늘어난다(0~3줄, 값은 무작위).
   · 레벨 제한 lv: 그 레벨이 되어야 장착할 수 있다.
   · 칸: w 무기(직업별) · o 옷(겉모습이 바뀜) · c 장신구(2칸) · d 마이룸 가구(꾸미기).
   · 공격력·피해는 10배 단위(PWR). 몬스터 체력도 10배로 계산한다(src/14-rpg.js 의 mstat 감싸기). */
const PWR = 10;
const GRADES = [
  { n: "일반", col: "#d6d9e0", mul: 1, subs: 0, sell: 1 },
  { n: "레어", col: "#6aa9ec", mul: 1.15, subs: 1, sell: 2 },
  { n: "유니크", col: "#c08af5", mul: 1.3, subs: 2, sell: 4 },
  { n: "레전드", col: "#ffb84a", mul: 1.5, subs: 3, sell: 8 },
];
// 추가 능력: 이름, 단위, 레벨에 따른 값 범위(최소, 최대)
const SUBS = {
  atk: { n: "공격력", u: "", r: (lv) => [2, 4 + lv] },
  hp: { n: "하트", u: "", r: (lv) => [1, lv >= 12 ? 2 : 1] },
  def: { n: "막기", u: "%", r: (lv) => [2, 4 + Math.floor(lv / 3)] },
  crit: { n: "치명타", u: "%", r: (lv) => [2, 4 + Math.floor(lv / 3)] },
  exp: { n: "경험치", u: "%", r: (lv) => [3, 6 + Math.floor(lv / 2)] },
  gold: { n: "금화", u: "%", r: (lv) => [3, 6 + Math.floor(lv / 2)] },
  dust: { n: "별빛 가루", u: "%", r: (lv) => [5, 10 + Math.floor(lv / 2)] },
  heal: { n: "처치 회복", u: "", r: () => [1, 1] },
};
const SUBPOOL = {
  w: ["atk", "crit", "exp", "gold", "dust", "heal"],
  o: ["hp", "def", "exp", "gold", "dust", "heal"],
  c: ["atk", "hp", "def", "crit", "exp", "gold", "dust", "heal"],
};
// 무기 종류(Pesk 무기와 같은 이름): sword axe hammer spear dagger staff crystal bow
const WEAPON_LINE = {
  knight: [
    ["견습 검", "sword"],
    ["강철 검", "sword"],
    ["바람 창", "spear"],
    ["은빛 장검", "sword"],
    ["수호의 망치", "hammer"],
    ["성기사의 창", "spear"],
    ["별빛 검", "sword"],
  ],
  warrior: [
    ["견습 도끼", "axe"],
    ["강철 도끼", "axe"],
    ["돌 망치", "hammer"],
    ["쌍날 도끼", "axe"],
    ["대지 망치", "hammer"],
    ["용암 도끼", "axe"],
    ["별빛 도끼", "axe"],
  ],
  mage: [
    ["견습 지팡이", "staff"],
    ["참나무 지팡이", "staff"],
    ["수정 구슬", "crystal"],
    ["달빛 지팡이", "staff"],
    ["별 수정", "crystal"],
    ["현자의 지팡이", "staff"],
    ["별빛 지팡이", "staff"],
  ],
  archer: [
    ["견습 단검", "dagger"],
    ["짧은 활", "bow"],
    ["쌍단검", "dagger"],
    ["사냥꾼 활", "bow"],
    ["바람 활", "bow"],
    ["매의 활", "bow"],
    ["별빛 활", "bow"],
  ],
};
const WLV = [1, 3, 6, 9, 12, 15, 18];
const ITEMS = {};
for (const job in WEAPON_LINE)
  WEAPON_LINE[job].forEach(([n, kind], t) => {
    ITEMS["w_" + job + "_" + t] = { s: "w", n, kind, job, lv: WLV[t], atk: 10 + 6 * t, price: t ? 30 + WLV[t] * 25 : 0 };
  });
// 옷: 입으면 겉모습이 바뀐다(그림 key). hp 하트, def 막기%
[
  ["o_travel", "여행자 망토", 1, 0, 3, null, "brown hooded travel cloak over a beige tunic"],
  ["o_stripe", "바닷가 줄무늬 옷", 1, 0, 2, ["gold", 3], "blue and white striped sailor shirt with shorts"],
  ["o_hunter", "숲 사냥꾼 조끼", 4, 1, 4, null, "green forest hunter vest with leather belt"],
  ["o_flower", "꽃무늬 나들이옷", 4, 1, 3, ["exp", 3], "cute pastel outfit with small flower patterns"],
  ["o_guard", "수호자의 갑옷", 4, 2, 6, null, "light silver plate armor with a blue tabard"],
  ["o_robe", "마법 학교 로브", 7, 1, 5, ["exp", 5], "navy magic academy robe with gold trim"],
  ["o_festival", "축제 예복", 7, 1, 5, ["gold", 5], "colorful festival costume with ribbons"],
  ["o_wind", "바람 망토", 10, 2, 7, null, "flowing sky-blue wind cape over light armor"],
  ["o_royal", "왕궁 근위대 제복", 13, 3, 9, null, "red and gold royal guard uniform"],
  ["o_star", "별자리 로브", 13, 2, 8, ["exp", 8], "dark blue robe covered in glowing constellation patterns"],
  ["o_harvest", "황금 들판 작업복", 16, 3, 10, ["gold", 8], "golden farmer overalls with a straw hat"],
  ["o_dream", "꿈길 잠옷", 16, 3, 9, ["dust", 8], "soft lavender pajamas with stars and a sleeping cap"],
  ["o_snow", "눈꽃 털옷", 17, 4, 12, null, "white fur winter coat with snowflake patterns"],
  ["o_hero", "별빛 영웅 갑옷", 18, 5, 15, null, "shining gold and white hero armor with a star emblem and short cape"],
].forEach(([id, n, lv, hp, def, fx, art]) => (ITEMS[id] = { s: "o", n, lv, hp, def, fx, art, price: 25 + lv * 20 }));
// 장신구(상점·전리품). 이야기 보물 장신구는 src/14-rpg.js 에서 옛 EQ 를 읽어 더한다(유니크 고정).
[
  ["c_ring1", "구리 반지", 1, { crit: 3 }],
  ["c_neck1", "나무 목걸이", 1, { hp: 1 }],
  ["c_charm", "행운 부적", 4, { gold: 10 }],
  ["c_note", "작은 공부 수첩", 4, { exp: 10 }],
  ["c_ring2", "은 반지", 7, { crit: 6 }],
  ["c_neck2", "조개 목걸이", 7, { hp: 2 }],
  ["c_star", "별 조각 브로치", 10, { dust: 15 }],
  ["c_ring3", "별 반지", 13, { crit: 9 }],
  ["c_neck3", "별빛 목걸이", 13, { hp: 3 }],
  ["c_crown", "작은 왕관", 17, { exp: 15, gold: 15 }],
].forEach(([id, n, lv, b]) => (ITEMS[id] = { s: "c", n, lv, b, price: 20 + lv * 15 }));
// 마이룸 가구(꾸미기). art = 그림(assets/hd/props), rug 은 밟을 수 있다
[
  ["d_plant", "화분", "plant", 40],
  ["d_rug", "둥근 러그", "rug", 50, 1],
  ["d_cushion", "분홍 방석", "cushion", 40],
  ["d_globe", "지구본", "globe", 80],
  ["d_desk", "작은 책상", "desk", 90],
  ["d_shelf", "책장", "shelf", 120],
  ["d_mirror", "전신 거울", "mirror", 90],
  ["d_box", "나무 상자", "furchest", 60],
  ["d_board", "게시판", "board", 70],
  ["d_bottle", "병 속 편지", "bottle", 30],
  ["d_stone", "돌 조각상", "stone", 100],
  ["d_tree", "벚꽃 화분 나무", "tree-garden", 150],
  ["d_tree2", "꿈빛 나무", "tree-dream", 200],
  ["d_well", "작은 우물", "well", 250],
].forEach(([id, n, art, price, walk]) => (ITEMS[id] = { s: "d", n, art, price, walk: !!walk, lv: 1 }));

/* ── 계산(순수 함수) ── */
// 목록에 없으면 바깥(아르카: 이야기 보물)에서 채울 기회를 준다
const itemDef = (id) => ITEMS[id] || (typeof itemExtra === "function" ? itemExtra(id) : null);
function rollSubs(def, g, rnd) {
  const pool = (SUBPOOL[def.s] || []).slice(),
    out = [];
  for (let i = 0; i < GRADES[g].subs && pool.length; i++) {
    const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0],
      [a, b] = SUBS[k].r(def.lv || 1);
    out.push([k, a + Math.floor(rnd() * (b - a + 1))]);
  }
  return out;
}
// 새 아이템 한 개
function makeItem(id, g, rnd, uid) {
  const def = itemDef(id);
  if (!def) return null;
  g = def.fixG != null ? def.fixG : g || 0;
  return { u: uid, id, g, s: def.s === "d" ? [] : rollSubs(def, g, rnd || Math.random) };
}
// 아이템 한 개의 능력 합
function itemStats(it) {
  const def = itemDef(it.id),
    S = { atk: 0, hp: 0, def: 0, crit: 0, exp: 0, gold: 0, dust: 0, heal: 0 };
  if (!def) return S;
  const m = GRADES[it.g].mul;
  if (def.atk) S.atk += Math.round(def.atk * m);
  if (def.hp) S.hp += def.hp + (it.g >= 2 ? 1 : 0);
  if (def.def) S.def += Math.round(def.def * m);
  if (def.fx) S[def.fx[0]] += Math.round(def.fx[1] * m);
  if (def.b) for (const k in def.b) S[k] += k === "hp" || k === "heal" ? def.b[k] + (it.g >= 3 ? 1 : 0) : Math.round(def.b[k] * m);
  (it.s || []).forEach(([k, v]) => (S[k] += v));
  return S;
}
// 등급 뽑기: 표 = [일반, 레어, 유니크, 레전드] 비율
const GTABLE = { mon: [74, 20, 5, 1], gate: [10, 55, 28, 7], boss: [0, 45, 40, 15], chest: [0, 60, 32, 8], shop: [100, 0, 0, 0] };
function rollGrade(table, rnd) {
  const t = GTABLE[table] || GTABLE.mon,
    tot = t.reduce((a, b) => a + b, 0);
  let r = (rnd || Math.random)() * tot;
  for (let g = 0; g < 4; g++) if ((r -= t[g]) < 0) return g;
  return 0;
}
// 전리품 후보: 내 레벨 근처, 무기는 내 직업 것만
function lootPool(lv, job, slot) {
  return Object.keys(ITEMS).filter((id) => {
    const d = ITEMS[id];
    if (d.story || d.s === "d" || (slot && d.s !== slot)) return false;
    if (d.s === "w" && d.job !== job) return false;
    return d.lv <= lv + 2 && d.lv >= Math.max(1, lv - 9);
  });
}
const sellPrice = (it) => {
  const d = itemDef(it.id);
  return d && !d.story ? Math.max(5, Math.floor(((d.price || 40) * GRADES[it.g].sell) / 3)) : 0;
};
const gradeName = (g) => GRADES[g].n;
// 능력 한 줄 글: "공격력 23 · 치명타 4%"
function statText(S) {
  return Object.keys(SUBS)
    .filter((k) => S[k])
    .map((k) => SUBS[k].n + " " + (k === "atk" || k === "hp" || k === "heal" ? "+" : "+") + S[k] + SUBS[k].u)
    .join(" · ");
}
