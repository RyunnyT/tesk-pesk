let save;
const DEF = {
  map: "home",
  lv: 1,
  exp: 0,
  gold: 0,
  dust: 0,
  hp: 5,
  read: {},
  met: {},
  boss: {},
  chest: {},
  towns: {},
  vis: {},
  lastTown: "t1",
  ex: {},
  job: null,
  trained: 0,
  pet: null,
  eq: { w: "w1", a: "a1", c: null },
  own: ["w1", "a1"],
  items: [],
  kills: 0,
  inv: {},
  q: {},
  sk: [],
  done: {},
  st: {},
  mm: true,
};
function loadSave() {
  save = JSON.parse(JSON.stringify(DEF));
  try {
    const v = localStorage.getItem("arca-v2");
    if (v) save = { ...save, ...JSON.parse(v) };
  } catch (e) {}
}
loadSave();
const store = () => {
  try {
    localStorage.setItem("arca-v2", JSON.stringify(save));
  } catch (e) {}
};
const PH = [
  "이 자리에 선생님의 지문이 들어가요. 마을, 건물, 길목, 막다른 길에 지문을 흩어 두어 75개를 1년 내내 만나게 해요.",
  "지문마다 확인 문제 2~3개가 붙어요.",
];
const PARTTOWN = ["t1", "t2", "t3", "t4", "t5", "t6"];
function partDone(k) {
  const d = save.done[PARTTOWN[k]];
  return !!d && d.length === 8 && d.every(Boolean);
}
const MLINES = {
  bran: ["나는 기사 브란. 방패로 동료를 지키는 법을 가르치지.", "기사는 틀려도 쉽게 쓰러지지 않는단다."],
  gord: ["하하! 나는 전사 고르드다!", "연속으로 맞히면 맞힐수록 힘이 세지지!"],
  iset: ["나는 마법사 이세트. 별빛으로 주문을 쓰지.", "서두르지 말고 한 번 더 생각하는 것, 그게 마법의 시작이란다."],
  pila: ["나는 궁수 필라. 멀리 보는 눈을 가르쳐 주지.", "틀린 길 하나를 지우는 눈, 그게 궁수의 눈이야."],
};
const MPOST = [
  "배운 것은 별빛이 된다.",
  "길목에서 배운 걸 써 보거라. 지워진 곳을 다시 쓸 때마다 새 스킬을 가르쳐 주마.",
];
const QS = [
  {
    id: "q1",
    map: "t1",
    npc: "dora",
    type: "kill",
    mon: "slime",
    n: 5,
    title: "안개 슬라임 퇴치",
    where: "r1",
    offer: ["견습생 등록 완료! 첫 의뢰야.", "동쪽 들판길에 안개 슬라임이 늘고 있어. 5마리만 물리쳐 줄래?"],
    prog: "안개 슬라임은 동쪽 들판길에 있어.",
    done: ["정말 해냈구나! 길드 첫 의뢰 완료야."],
    rw: { exp: 20, gold: 30, dust: 5 },
  },
  {
    id: "q2",
    map: "t1",
    npc: "toto",
    type: "gather",
    item: "flower",
    n: 4,
    title: "별빛 들꽃 모으기",
    where: "r1",
    offer: ["할머니한테 드릴 별빛 들꽃이 필요해!", "동쪽 들판길에서 4송이만 따다 줄래?"],
    prog: "별빛 들꽃은 들판길 풀숲에 피어 있어!",
    done: ["우와, 반짝반짝해! 고마워! 이거 내가 만든 종이 배지야."],
    rw: { exp: 10, gold: 10, dust: 5, item: "토토의 종이 배지" },
  },
];
const ITEM = { flower: "별빛 들꽃", herb: "약초", shell: "반짝 조개" };
function bT1() {
  const m = nm(48, 32, "."),
    G = m.G,
    O = m.O;
  m.id = "t1";
  m.n = "1부 루멘 마을";
  m.short = "루멘 마을";
  m.kind = "town";
  m.theme = "town";
  m.spawn = [14, 19];
  FL(G, 0, 0, 3, 31, "~");
  FL(G, 4, 0, 5, 31, "s");
  FL(G, 20, 1, 40, 8, "^");
  FL(G, 20, 9, 40, 9, "#");
  FL(G, 29, 8, 30, 9, "H");
  FL(G, 6, 19, 47, 20, ":");
  FL(G, 29, 10, 30, 18, ":");
  FL(G, 26, 11, 34, 16, "q");
  FL(G, 29, 11, 30, 16, ":");
  FL(G, 10, 15, 10, 18, ":");
  FL(G, 17, 15, 17, 18, ":");
  FL(G, 8, 27, 24, 27, ":");
  FL(G, 24, 21, 24, 27, ":");
  FL(G, 10, 26, 10, 26, ":");
  FL(G, 0, 19, 3, 20, "b");
  for (let y = 10; y < 31; y++) for (let a = 35; a < 47; a++) if (G[y][a] === "." && hsh(a, y) % 5 === 0) G[y][a] = ",";
  for (let y = 11; y < 31; y++) for (let a = 6; a < 26; a++) if (G[y][a] === "." && hsh(a, y) % 11 === 0) G[y][a] = ",";
  FL(G, 41, 10, 41, 30, "-");
  FL(G, 41, 19, 41, 20, "b");
  FL(G, 42, 24, 46, 28, "-");
  FL(G, 43, 25, 45, 27, ".");
  FL(O, 6, 0, 47, 0, "T");
  FL(O, 6, 31, 47, 31, "T");
  FL(O, 47, 0, 47, 31, "T");
  O[19][47] = "";
  O[20][47] = "";
  [
    [20, 1],
    [21, 1],
    [20, 2],
    [39, 1],
    [40, 1],
    [40, 2],
    [22, 7],
    [38, 8],
    [26, 2],
  ].forEach(([a, y]) => (O[y][a] = "T"));
  for (let a = 7; a <= 12; a++) {
    O[3][a] = "f";
    O[8][a] = "f";
  }
  for (let y = 3; y <= 8; y++) {
    O[y][7] = "f";
    O[y][12] = "f";
  }
  FL(G, 8, 4, 11, 7, ",");
  [
    [14, 3],
    [16, 6],
    [14, 9],
    [18, 4],
    [6, 12],
    [6, 16],
    [22, 12],
    [25, 15],
    [6, 24],
    [22, 30],
    [14, 30],
    [36, 10],
    [46, 12],
    [33, 23],
    [33, 28],
    [46, 30],
    [30, 26],
    [28, 29],
  ].forEach(([a, y]) => {
    if (G[y][a] !== "~") O[y][a] = "T";
  });
  [
    [38, 12],
    [36, 16],
    [44, 12],
    [39, 27],
    [34, 25],
    [45, 17],
  ].forEach(([a, y]) => (O[y][a] = "r"));
  [
    [37, 21],
    [43, 22],
    [36, 30],
  ].forEach(([a, y]) => (O[y][a] = "l"));
  for (let a = 34; a <= 39; a++) O[23][a] = "f";
  [
    [27, 12],
    [33, 12],
    [27, 15],
    [33, 15],
  ].forEach(([a, y]) => (O[y][a] = "g"));
  O[17][14] = "w";
  m.bld = [
    {
      n: "숙소 (마이룸)",
      x: 8,
      y: 11,
      w: 5,
      h: 4,
      roof: "#3a7ac0",
      roofD: "#2f5a8a",
      wall: "#f3dcc0",
      to: "home",
      at: [9, 11],
    },
    { n: "마르타의 빵집", x: 15, y: 11, w: 5, h: 4, roof: "#c0563f", roofD: "#9a3f2e", wall: "#f6e6c8" },
    { n: "모험가 길드", x: 8, y: 22, w: 6, h: 4, roof: "#7a573b", roofD: "#5e3f29", wall: "#e8d4b0" },
    { n: "루멘 도서관", x: 16, y: 22, w: 6, h: 5, roof: "#534AB7", roofD: "#3C3489", wall: "#d9d3c8" },
    { n: "등대", x: 33, y: 2, w: 3, h: 5, tower: 1, lit: 1 },
    { n: "오스카의 집", x: 37, y: 4, w: 3, h: 3, roof: "#2f5a8a", roofD: "#24476e", wall: "#efe2cc" },
  ];
  m.spots = [
    {
      id: "song",
      kind: "cart",
      tx: 20,
      ty: 28,
      n: "모모의 잃어버린 책",
      t: "잊힌 노래",
      no: 1,
      main: 1,
      p: [
        "아주 먼 옛날, 글자가 없던 마을 사람들은 중요한 일을 노래로 기억했어요. 비가 오는 철, 씨앗을 뿌리는 날, 마을을 처음 세운 사람의 이름까지 모두 노랫말에 담았지요.",
        "아이들은 어른들의 노래를 따라 부르며 마을의 이야기를 배웠어요.",
        "그런데 어느 해, 그 노래를 아는 사람이 하나둘 떠나자 노래의 뒷부분이 사라지고 말았어요. 지금은 첫 소절만 바람결에 남아 있다고 해요.",
        "모모는 이 책 귀퉁이에 이렇게 적어 두었어요. 「기록이 없으면 노래도 길을 잃는다.」",
      ],
      q: [
        [
          "글자가 없던 마을 사람들은 중요한 일을 어떻게 기억했나요?",
          ["노래로 불러서", "그림을 그려서", "돌에 새겨서"],
          0,
        ],
        [
          "노래의 뒷부분이 사라진 까닭은 무엇인가요?",
          ["노래를 아는 사람들이 떠나서", "비가 너무 많이 와서", "아이들이 노래를 싫어해서"],
          0,
        ],
      ],
    },
    { id: "board", kind: "board", tx: 21, ty: 17, n: "마을 게시판", t: "지문 2", no: 2 },
    { id: "stele", kind: "stone", tx: 35, ty: 11, n: "수련장 비석", t: "지문 3", no: 3 },
    { id: "cliff", kind: "stone", tx: 24, ty: 3, n: "등대 언덕의 오래된 비석", t: "지문 4", no: 4 },
    { id: "garden", kind: "sign", tx: 9, ty: 5, n: "울타리 정원 표지판", t: "지문 5", no: 5 },
    { id: "bottle", kind: "bottle", tx: 44, ty: 26, n: "섬에 떠밀려 온 병 편지", t: "지문 6", no: 6 },
  ];
  m.npcs = [
    [
      "momo",
      12,
      17,
      [
        "길목에서 별빛 가루를 모아 오면 지워진 곳을 다시 쓸 수 있어요.",
        "금빛 테두리는 핵심 자리예요. 「잊힌 노래」를 읽고, 도라와 토토의 부탁을 들어주면 열려요.",
      ],
    ],
    ["dora", 11, 28, ["길목은 갈수록 몬스터가 세져. 무리하지 마!"]],
    ["toto", 13, 9, ["형, 누나! 모험 얘기 또 해 줘!"]],
    ["kai", 39, 18, ["…해안길 끝에 안개 문지기가 버티고 있대."]],
    ["marta", 17, 16, ["마을 안은 안전하단다. 다치면 숙소에서 푹 쉬렴."]],
    ["oscar", 37, 8, ["저 멀리 항구 등대가 꺼져 있구나…"]],
  ];
  m.exits = [
    {
      x0: 47,
      y0: 19,
      x1: 47,
      y1: 20,
      to: "r1",
      at: [1, 10],
      d: "r",
      need: () => !!save.job,
      msg: () => "먼저 수련장에서 스승님을 만나 직업을 정해요",
    },
  ];
  m.mons = [];
  m.locks = [];
  m.nodes = [];
  m.patch = 1;
  m.bld.forEach((b) => {
    b.dx = b.x + Math.floor(b.w / 2);
    b.dy = b.y + b.h - 1;
    FL(O, b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, "B");
  });
  m.spots.forEach((s) => (O[s.ty][s.tx] = "K"));
  return m;
}
const FURD = {
  bed(c, X, Y) {
    P(c, X + 2, Y + 44, 30, 4, "rgba(0,0,0,0.18)");
    P(c, X, Y - 6, 32, 10, "#5e3f29");
    P(c, X + 1, Y - 5, 30, 8, "#7a573b");
    P(c, X, Y + 2, 32, 44, "#5e3f29");
    P(c, X + 2, Y + 4, 28, 40, "#f5efe2");
    P(c, X + 4, Y + 6, 24, 10, "#ffffff");
    P(c, X + 2, Y + 18, 28, 26, "#3a7ac0");
    for (let a = 4; a < 30; a += 6) P(c, X + a, Y + 18, 2, 26, "#5f9ad8");
    P(c, X + 2, Y + 18, 28, 2, "#2f5a8a");
  },
  shelf(c, X, Y) {
    P(c, X, Y - 20, 48, 36, "#2a1a10");
    P(c, X + 1, Y - 19, 46, 34, "#6b4a32");
    P(c, X + 3, Y - 17, 42, 30, "#3a2618");
    const BK = ["#c0563f", "#3a7ac0", "#5a9e3a", "#d9a63a", "#7F77DD", "#D4537E", "#1D9E75"];
    for (let yy = Y - 17; yy < Y + 10; yy += 10) {
      P(c, X + 3, yy + 8, 42, 2, "#8a6040");
      for (let bx = X + 4; bx < X + 44; ) {
        const k = hsh(bx, yy),
          bw = 2 + (k % 3),
          bh = 5 + ((k >> 4) % 3);
        P(c, bx, yy + 8 - bh, bw, bh, BK[(k >> 8) % 7]);
        bx += bw + ((k >> 12) % 5 === 0 ? 1 : 0);
      }
    }
  },
  ward(c, X, Y) {
    P(c, X, Y - 24, 32, 40, "#4a3020");
    P(c, X + 1, Y - 23, 30, 38, "#8a5a3b");
    P(c, X - 1, Y - 26, 34, 4, "#4a3020");
    P(c, X + 15, Y - 21, 1, 34, "#4a3020");
    P(c, X + 4, Y - 19, 9, 14, "#7a4e33");
    P(c, X + 18, Y - 19, 9, 14, "#7a4e33");
    P(c, X + 4, Y - 2, 9, 14, "#7a4e33");
    P(c, X + 18, Y - 2, 9, 14, "#7a4e33");
    P(c, X + 12, Y - 6, 2, 4, "#c9a24a");
    P(c, X + 17, Y - 6, 2, 4, "#c9a24a");
  },
  mirror(c, X, Y) {
    for (let dy = -14; dy <= 14; dy++) {
      const w = Math.round(6 * Math.sqrt(1 - (dy * dy) / 196));
      P(c, X + 8 - w - 1, Y - 6 + dy, 2 * w + 2, 1, "#c9a24a");
      if (Math.abs(dy) < 14) P(c, X + 8 - w + 1, Y - 6 + dy, 2 * w - 2, 1, dy < -4 ? "#e6f3fb" : "#cfe6f8");
    }
    P(c, X + 5, Y - 16, 2, 6, "#ffffff");
    P(c, X + 7, Y + 8, 2, 6, "#8a6a45");
    P(c, X + 3, Y + 13, 10, 2, "#8a6a45");
  },
  chest(c, X, Y) {
    P(c, X + 1, Y + 14, 14, 2, "rgba(0,0,0,0.2)");
    P(c, X + 1, Y + 2, 14, 12, "#5e2a14");
    P(c, X + 2, Y + 3, 12, 11, "#a0522d");
    P(c, X + 2, Y + 3, 12, 4, "#8a3f20");
    P(c, X + 4, Y + 3, 2, 11, "#5F5E5A");
    P(c, X + 11, Y + 3, 2, 11, "#5F5E5A");
    P(c, X + 7, Y + 6, 3, 3, "#c9a24a");
  },
  cushion(c, X, Y) {
    for (let dy = -5; dy <= 5; dy++) {
      const w = Math.round(14 * Math.sqrt(1 - (dy * dy) / 25));
      P(c, X + 16 - w, Y + 8 + dy, 2 * w, 1, dy < -2 ? "#ED93B1" : "#D4537E");
    }
  },
  rug(c, X, Y) {
    for (let dy = -22; dy <= 22; dy++) {
      const w = Math.round(46 * Math.sqrt(1 - (dy * dy) / 484));
      P(c, X + 48 - w, Y + 24 + dy, 2 * w, 1, "#c9a24a");
      if (Math.abs(dy) < 21)
        P(c, X + 48 - w + 2, Y + 24 + dy, 2 * w - 4, 1, Math.abs(dy) % 4 === 0 ? "#7f74d8" : "#6f63c9");
    }
    P(c, X + 46, Y + 18, 4, 12, "#f5e3a3");
    P(c, X + 42, Y + 22, 12, 4, "#f5e3a3");
  },
  window(c, X, Y) {
    P(c, X, Y + 4, 40, 30, "#7a573b");
    P(c, X + 2, Y + 6, 36, 26, "#9fd0f0");
    P(c, X + 2, Y + 22, 36, 10, "#bfe0f6");
    P(c, X + 19, Y + 6, 2, 26, "#7a573b");
    P(c, X + 2, Y + 18, 36, 2, "#7a573b");
    P(c, X - 6, Y + 2, 8, 34, "#c0563f");
    P(c, X + 38, Y + 2, 8, 34, "#c0563f");
  },
  plant(c, X, Y) {
    P(c, X + 4, Y + 6, 8, 9, "#a0522d");
    P(c, X + 3, Y + 5, 10, 2, "#c0563f");
    disc(c, X + 8, Y, 6, "#3d8238");
    disc(c, X + 6, Y - 2, 4, "#5a9e3a");
  },
};
function bHome() {
  const m = nm(20, 13, "F"),
    G = m.G,
    O = m.O;
  m.id = "home";
  m.n = "마이룸";
  m.short = "마이룸";
  m.kind = "home";
  m.theme = "town";
  m.spawn = [9, 9];
  FL(G, 0, 0, 19, 2, "W");
  FL(G, 0, 12, 19, 12, "W");
  FL(G, 0, 0, 0, 12, "W");
  FL(G, 19, 0, 19, 12, "W");
  G[12][9] = "F";
  G[12][10] = "F";
  m.fur = [
    { id: "window", x: 2, y: 0 },
    { id: "rug", x: 6, y: 6 },
    { id: "bed", x: 1, y: 4, w: 2, h: 3, act: "bed", n: "침대에서 쉬기" },
    { id: "shelf", x: 5, y: 3, w: 3, h: 1, act: "skill", n: "스킬북 보기" },
    { id: "ward", x: 9, y: 3, w: 2, h: 1, act: "eq", n: "장비 보기" },
    { id: "mirror", x: 12, y: 3, w: 1, h: 1, act: "me", n: "내 정보 보기" },
    { id: "chest", x: 14, y: 3, w: 1, h: 1, act: "bag", n: "가방 열기" },
    { id: "plant", x: 17, y: 3, w: 1, h: 1 },
    { id: "cushion", x: 15, y: 9, act: "pet", n: "펫 돌보기" },
  ];
  m.fur.forEach((f) => {
    if (f.w && f.act !== "pet") FL(O, f.x, f.y, f.x + f.w - 1, f.y + f.h - 1, "U");
    if (f.id === "plant") O[3][17] = "U";
  });
  m.bld = [];
  m.spots = [];
  m.npcs = [];
  m.mons = [];
  m.locks = [];
  m.nodes = [];
  m.exits = [{ x0: 9, y0: 12, x1: 10, y1: 12, to: "t1", at: [10, 15], d: "d" }];
  return m;
}
const py1 = (a) => 10 + Math.round(2 * Math.sin(a / 6));
function bR1() {
  const m = nm(40, 22, "."),
    G = m.G,
    O = m.O;
  m.id = "r1";
  m.n = "길목 1 · 동쪽 들판길";
  m.short = "들판길";
  m.kind = "route";
  m.theme = "town";
  m.bg = "meadow";
  m.rec = "Lv 1~2";
  for (let a = 0; a < 40; a++) {
    const y = py1(a);
    G[y][a] = ":";
    G[y + 1][a] = ":";
  }
  const keep = new Set([`0,${py1(0)}`, `0,${py1(0) + 1}`, `39,${py1(39)}`, `39,${py1(39) + 1}`]);
  border(m, keep);
  for (let y = 1; y < 21; y++)
    for (let a = 1; a < 39; a++) {
      if (G[y][a] !== ".") continue;
      const dp = Math.abs(y - py1(a) - 0.5);
      const h = hsh(a * 3, y * 5);
      if (dp > 2.5 && h % 9 === 0) O[y][a] = "T";
      else if (h % 5 === 0) G[y][a] = ",";
    }
  FL(O, 8, 4, 16, 4, "f");
  FL(G, 24, 15, 26, 16, "-");
  [
    [18, 6],
    [30, 15],
    [6, 16],
    [34, 5],
  ].forEach(([a, y]) => {
    if (!O[y][a] && G[y][a] !== "-") O[y][a] = "r";
  });
  [
    [14, 16],
    [28, 5],
  ].forEach(([a, y]) => {
    if (!O[y][a]) O[y][a] = "l";
  });
  m.spots = [{ id: "r1sign", kind: "sign", tx: 12, ty: py1(12) - 2, n: "들판길 이정표", t: "지문 7", no: 7 }];
  m.spots.forEach((s) => (O[s.ty][s.tx] = "K"));
  m.bld = [];
  m.npcs = [];
  m.locks = [];
  m.mons = picks(m, 6, (a, y) => a > 6 && Math.abs(y - py1(a)) < 6, 11).map(([a, y]) => ["slime", a, y]);
  m.nodes = picks(m, 7, (a, y) => a > 4 && Math.abs(y - py1(a)) > 2, 97).map(([a, y]) => ["flower", a, y]);
  m.exits = [
    { x0: 0, y0: py1(0), x1: 0, y1: py1(0) + 1, to: "t1", at: [46, 19], d: "l" },
    { x0: 39, y0: py1(39), x1: 39, y1: py1(39) + 1, to: "r2", at: [1, 0], d: "r" },
  ];
  return m;
}
const py2 = (a) => 14 + Math.round(2 * Math.sin(a / 7 + 1)),
  bx2 = (y) => 20 + Math.round(1.5 * Math.sin(y / 3));
function bR2() {
  const m = nm(44, 28, "."),
    G = m.G,
    O = m.O;
  m.id = "r2";
  m.n = "길목 2 · 안개 숲길";
  m.short = "숲길";
  m.kind = "route";
  m.theme = "forest";
  m.bg = "forest";
  m.rec = "Lv 2~3";
  const path = new Set();
  for (let a = 0; a < 44; a++) {
    [py2(a), py2(a) + 1].forEach((y) => {
      G[y][a] = ":";
      path.add(a + "," + y);
    });
  }
  for (let y = 0; y <= py2(20); y++) {
    const b = bx2(y);
    [b, b + 1].forEach((a) => {
      G[y][a] = ":";
      path.add(a + "," + y);
    });
  }
  FL(G, 30, 0, 30, 27, "-");
  [py2(30), py2(30) + 1].forEach((y) => (G[y][30] = "b"));
  const clr = (a, y) => {
    for (const k of path) {
      const [p, q] = k.split(",").map(Number);
      if (Math.abs(p - a) <= 2 && Math.abs(q - y) <= 2) return true;
    }
    return Math.hypot(a - 10, y - 21) < 4.5 || Math.hypot(a - 36, y - 7) < 4.5;
  };
  for (let y = 1; y < 27; y++)
    for (let a = 1; a < 43; a++) {
      if (G[y][a] === "-" || G[y][a] === "b") continue;
      if (!clr(a, y) && hsh(a, y) % 3 !== 0) O[y][a] = "T";
      else if (G[y][a] === "." && hsh(a * 7, y) % 7 === 0) G[y][a] = ",";
    }
  const keep = new Set([
    `0,${py2(0)}`,
    `0,${py2(0) + 1}`,
    `43,${py2(43)}`,
    `43,${py2(43) + 1}`,
    `${bx2(0)},0`,
    `${bx2(0) + 1},0`,
  ]);
  border(m, keep);
  for (let y = 0; y < 28; y++) if (!keep.has("30," + y) && (y === 0 || y === 27)) O[y][30] = "T";
  [
    [12, 20],
    [37, 9],
    [25, py2(25) + 3],
  ].forEach(([a, y]) => {
    if (!O[y][a] && G[y][a] !== "-") O[y][a] = "r";
  });
  [
    [8, 22],
    [34, 6],
  ].forEach(([a, y]) => {
    if (!O[y][a]) O[y][a] = "l";
  });
  m.spots = [];
  m.bld = [];
  m.npcs = [];
  m.locks = [];
  m.mons = [
    ...picks(m, 4, (a, y) => a > 6 && a !== 30, 23).map(([a, y]) => ["mush", a, y]),
    ...picks(m, 2, (a, y) => a > 10 && a < 28, 57).map(([a, y]) => ["slime", a, y]),
  ];
  m.nodes = picks(m, 5, (a, y) => a > 3, 131).map(([a, y]) => ["herb", a, y]);
  m.exits = [
    { x0: 0, y0: py2(0), x1: 0, y1: py2(0) + 1, to: "r1", at: [38, py1(39)], d: "l" },
    { x0: 43, y0: py2(43), x1: 43, y1: py2(43) + 1, to: "r3", at: [1, 6], d: "r" },
    { x0: bx2(0), y0: 0, x1: bx2(0) + 1, y1: 0, to: "d1", at: [14, 22], d: "u" },
  ];
  return m;
}
function bD1() {
  const m = nm(30, 24, "."),
    G = m.G,
    O = m.O;
  m.id = "d1";
  m.n = "막다른 길 · 그림자 숲";
  m.short = "막다른 숲";
  m.kind = "dead";
  m.theme = "dead";
  m.bg = "dead";
  m.rec = "Lv 3~4 · 보물";
  FL(G, 14, 16, 15, 23, ":");
  FL(G, 22, 4, 26, 8, "-");
  FL(G, 23, 5, 25, 7, ".");
  for (let y = 1; y < 23; y++)
    for (let a = 1; a < 29; a++) {
      if (G[y][a] === "-") continue;
      const inC = ((a - 15) / 11) ** 2 + ((y - 10) / 6) ** 2 < 1,
        cor = a >= 13 && a <= 16 && y >= 15;
      const isl = a >= 23 && a <= 25 && y >= 5 && y <= 7;
      if (!inC && !cor && !isl && hsh(a, y) % 4 !== 0) O[y][a] = "T";
      else if (G[y][a] === "." && hsh(a * 5, y) % 6 === 0) G[y][a] = ",";
    }
  border(m, new Set(["14,23", "15,23"]));
  O[6][8] = "C";
  m.spots = [{ id: "d1hide", kind: "bottle", tx: 24, ty: 6, n: "안개 섬의 숨은 쪽지", t: "지문 8", no: 8 }];
  m.spots.forEach((s) => (O[s.ty][s.tx] = "K"));
  m.bld = [];
  m.npcs = [];
  m.locks = [];
  m.chest = { id: "d1c", tx: 8, ty: 6 };
  m.mons = [
    ...picks(m, 3, (a, y) => y < 14, 31).map(([a, y]) => ["shade", a, y]),
    ...picks(m, 2, (a, y) => y < 16 && a < 20, 77).map(([a, y]) => ["mush", a, y]),
  ];
  m.exits = [{ x0: 14, y0: 23, x1: 15, y1: 23, to: "r2", at: [bx2(0), 1], d: "d" }];
  return m;
}
function bR3() {
  const m = nm(44, 24, "."),
    G = m.G,
    O = m.O;
  m.id = "r3";
  m.n = "길목 3 · 해안 절벽길";
  m.short = "해안길";
  m.kind = "route";
  m.theme = "coast";
  m.bg = "coast";
  m.rec = "Lv 3~4 · 문지기";
  FL(G, 0, 19, 43, 23, "~");
  FL(G, 0, 17, 43, 18, "s");
  FL(G, 0, 1, 30, 9, "^");
  FL(G, 0, 10, 30, 10, "#");
  FL(G, 26, 9, 27, 10, "H");
  FL(G, 0, 6, 27, 7, ":");
  FL(G, 26, 8, 27, 12, ":");
  FL(G, 26, 13, 43, 14, ":");
  for (let y = 1; y < 17; y++)
    for (let a = 1; a < 43; a++) {
      const g = G[y][a];
      if (g !== "." && g !== "^") continue;
      const h = hsh(a * 11, y * 3);
      if (Math.abs(y - 6.5) > 2 && Math.abs(y - 13.5) > 2 && h % 8 === 0) O[y][a] = "T";
      else if (h % 6 === 0) G[y][a] = g === "^" ? "^" : ",";
    }
  FL(O, 31, 1, 31, 9, "T");
  const keep = new Set(["0,6", "0,7", "43,13", "43,14"]);
  for (let a = 0; a < 44; a++) if (!keep.has(a + ",0")) O[0][a] = "T";
  for (let y = 0; y < 17; y++) {
    if (!keep.has("0," + y)) O[y][0] = "T";
    if (!keep.has("43," + y)) O[y][43] = "T";
  }
  [
    [10, 14],
    [18, 12],
    [33, 16],
  ].forEach(([a, y]) => {
    if (!O[y][a]) O[y][a] = "r";
  });
  m.spots = [];
  m.bld = [];
  m.npcs = [];
  if (!save.boss.r3) {
    O[13][43] = "X";
    O[14][43] = "X";
  }
  m.locks = [
    {
      tiles: [
        [43, 13],
        [43, 14],
      ],
      msg: "안개 문지기를 물리쳐야 지나갈 수 있어요",
      open: () => !!save.boss.r3,
    },
  ];
  m.mons = picks(m, 5, (a, y) => y >= 11 && a > 3 && a < 38, 41).map(([a, y]) => ["jelly", a, y]);
  m.nodes = picks(m, 5, (a, y) => y >= 15, 173).map(([a, y]) => ["shell", a, y]);
  if (!save.boss.r3) m.mons.push(["gate", 40, 14]);
  m.exits = [
    { x0: 0, y0: 6, x1: 0, y1: 7, to: "r2", at: [42, py2(43)], d: "l" },
    {
      x0: 43,
      y0: 13,
      x1: 43,
      y1: 14,
      to: "t2",
      at: [1, 14],
      d: "r",
      need: () => !!save.boss.r3 && partDone(0),
      msg: () =>
        !partDone(0)
          ? "1부 루멘 마을의 지워진 곳을 모두 다시 써야 2부로 넘어갈 수 있어요"
          : "안개 문지기를 물리쳐야 지나갈 수 있어요",
    },
  ];
  return m;
}
function bT2() {
  const m = nm(36, 24, "."),
    G = m.G,
    O = m.O;
  m.id = "t2";
  m.n = "2부 루멘 항구";
  m.short = "루멘 항구";
  m.kind = "town";
  m.theme = "town";
  m.bg = "coast";
  m.spawn = [17, 14];
  FL(G, 0, 0, 35, 5, "~");
  FL(G, 0, 6, 35, 7, "s");
  FL(G, 0, 14, 34, 15, ":");
  FL(G, 18, 6, 19, 13, ":");
  FL(G, 18, 1, 19, 5, "b");
  for (let y = 8; y < 23; y++) for (let a = 0; a < 35; a++) if (G[y][a] === "." && hsh(a, y) % 10 === 0) G[y][a] = ",";
  for (let a = 0; a < 36; a++) O[23][a] = "T";
  for (let y = 6; y < 23; y++) {
    if (y !== 14 && y !== 15) O[y][0] = "T";
    O[y][35] = "T";
  }
  O[14][35] = "X";
  O[15][35] = "X";
  [
    [3, 20],
    [12, 22],
    [28, 21],
    [33, 9],
    [2, 9],
  ].forEach(([a, y]) => (O[y][a] = "T"));
  [
    [14, 9],
    [23, 20],
  ].forEach(([a, y]) => (O[y][a] = "r"));
  m.bld = [
    {
      n: "덕배네 생선 가게",
      x: 4,
      y: 9,
      w: 5,
      h: 4,
      roof: "#1D9E75",
      roofD: "#0F6E56",
      wall: "#f3dcc0",
      icon: "anchor",
    },
    { n: "골드윈 상점", x: 10, y: 17, w: 5, h: 4, roof: "#7F77DD", roofD: "#534AB7", wall: "#f6e6c8", icon: "star" },
    { n: "소라네 집", x: 24, y: 9, w: 5, h: 4, roof: "#c0563f", roofD: "#9a3f2e", wall: "#efe2cc", icon: "star" },
    { n: "항구 등대", x: 30, y: 7, w: 3, h: 6, tower: 1, lit: 0 },
  ];
  m.bld.forEach((b) => {
    b.dx = b.x + Math.floor(b.w / 2);
    b.dy = b.y + b.h - 1;
    FL(O, b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, "B");
  });
  m.spots = [{ id: "t2board", kind: "board", tx: 15, ty: 12, n: "항구 게시판", t: "지문 9", no: 9 }];
  m.spots.forEach((s) => (O[s.ty][s.tx] = "K"));
  m.npcs = [
    [
      "sora",
      22,
      16,
      [
        "…누구야? 길목을 다 지나서 왔다고?",
        "등대 불이 꺼져서 배가 못 들어와. 2부 「꺼진 등대」 이야기는 여기서 시작돼!",
      ],
    ],
    ["marinda", 17, 9, ["갈매기호가 항구 밖에 갇혀 있다고! 등대만 켜지면 되는데!"]],
    ["deok", 7, 15, ["손님이 없어서 생선이 남아돌아… 휴."]],
  ];
  m.locks = [
    {
      tiles: [
        [35, 14],
        [35, 15],
      ],
      msg: "3부로 가는 길이에요. 2부 루멘 항구를 모두 되살려야 열려요",
      open: () => false,
    },
  ];
  m.mons = [];
  m.exits = [{ x0: 0, y0: 14, x1: 0, y1: 15, to: "r3", at: [42, 13], d: "l" }];
  return m;
}

const BUILD = { home: bHome, t1: bT1, r1: bR1, r2: bR2, d1: bD1, r3: bR3 };
const CHAIN = [
    "home",
    "t1",
    "r1",
    "r2",
    "r3",
    "t2",
    "r4",
    "r5",
    "r6",
    "t3",
    "r7",
    "r8",
    "r9",
    "t4",
    "r10",
    "r11",
    "r12",
    "t5",
    "r13",
    "r14",
    "t6",
  ],
  CNAME = {},
  DEADS = { r2: "d1", r5: "d2", r8: "d3", r11: "d4", r13: "d5" };
let M = null,
  G,
  O,
  MW,
  MH,
  WW,
  WH;
const MAPS = {};
