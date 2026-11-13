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
const hpB = () => (EQ[save.eq.a].hp || 0) + (save.eq.c ? EQ[save.eq.c].hp || 0 : 0);
const maxHp = () => 4 + save.lv + hpB(),
  atk = () => EQ[save.eq.w].atk,
  petOn = (k) => !!save.pet && partDone(k);
const eqName = (id) => (EQ[id].s === "w" ? WN[save.job || "none"][{ w1: 0, w2: 1, w3: 2 }[id]] : EQ[id].n);
const eqDesc = (id) => {
  const e = EQ[id];
  return e.s === "w" ? "공격력 " + e.atk : e.s === "a" ? (e.hp ? "체력 +" + e.hp : "기본 옷") : e.d;
};
const esc = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 2600);
}
