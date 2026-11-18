const pl = {
  x: 0,
  y: 0,
  face: "d",
  dir: 1,
  f: 0,
  mv: false,
  z: 0,
  vz: 0,
  jx: 0,
  jy: 0,
  sx: 0,
  sy: 0,
  air: 0,
  inv: 0,
  atk: 0,
};
const pet = { x: 0, y: 0, dir: 1, f: 0, mv: false };
let petPick = "dog";
let mode = "map",
  cam = { x: 0, y: 0 },
  tk = 0,
  fr = 0,
  busy = false,
  toastT = null,
  sp = [],
  keys = {},
  dl = null,
  bk = null,
  lastAct = "",
  npcs = [],
  mons = [],
  nodes = [],
  EXP = null,
  B = null,
  shakeT = 0,
  PATCH = [],
  ER = new Map(),
  sk = null;
function skLearned(k) {
  return k === 0 ? !!save.trained : partDone(k);
}
const slots = () => (save.lv >= 7 ? 4 : save.lv >= 5 ? 3 : save.lv >= 3 ? 2 : 1);
// 하트·공격력은 RPG 장비(src/04b-items.js · 04c-rpg-save.js)에서 계산한다. 공격력은 10배 단위(PWR)
const hpB = () => rpgHp();
const maxHp = () => 4 + save.lv + hpB(),
  atk = () => rpgAtk(),
  petOn = (k) => !!save.pet && partDone(k);
const eqName = (id) => (EQ[id].s === "w" ? WN[save.job || "none"][{ w1: 0, w2: 1, w3: 2 }[id]] : EQ[id].n);
const eqDesc = (id) => {
  const e = EQ[id];
  return e.s === "w" ? "공격력 " + e.atk : e.s === "a" ? (e.hp ? "체력 +" + e.hp : "기본 옷") : e.d;
};
const esc = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// 조금 뒤에 띄우는 안내: 그 사이 맵을 옮겼으면 띄우지 않는다(다른 곳 내용이 보이지 않게). f 는 글 또는 글을 만드는 함수
function toastLater(f, ms, idle) {
  const id = typeof M === "object" && M ? M.id : null;
  setTimeout(() => {
    if (typeof M === "object" && M && M.id !== id) return;
    if (idle && busy) return;
    toast(typeof f === "function" ? f() : f);
  }, ms);
}
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 2600);
}
