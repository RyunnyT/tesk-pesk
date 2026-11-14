const OLDBOOKS = {
  oscar: {
    t: "등대지기 오스카의 일지",
    part: 1,
    where: "등대 안",
    rw: "등대 렌즈 조각",
    p: [
      "○월 ○일, 맑음. 물이 빠지자 등대 아래로 넓은 갯벌이 드러났다.",
      "갯벌은 바닷물이 하루에 두 번 들어왔다 나가는 진흙 땅이다. 겉으로는 텅 빈 것 같지만, 그 속에는 게와 조개, 갯지렁이가 숨 쉬며 살고 있다.",
      "갯벌은 바다로 흘러가는 더러운 물을 걸러 주어서 「바다의 콩팥」이라고도 불린다.",
      "젊은 브란이 오늘 처음으로 작은 게를 손바닥에 올려 보고는 한참을 웃었다.",
    ],
    q: [
      ["갯벌에는 바닷물이 하루에 몇 번 들어왔다 나가나요?", ["한 번", "두 번", "세 번"], 1],
      [
        "갯벌을 「바다의 콩팥」이라고 부르는 까닭은 무엇인가요?",
        ["더러운 물을 걸러 주어서", "콩이 많이 자라서", "생김새가 콩팥을 닮아서"],
        0,
      ],
      ["일지에 나온 갯벌 생물이 아닌 것은?", ["게", "조개", "다람쥐"], 2],
    ],
  },
  time: {
    t: "시간을 잰 사람들",
    part: 3,
    where: "시계탑 안",
    rw: "멈춘 회중시계",
    p: [
      "옛날 사람들은 시계 없이 어떻게 시간을 알았을까요?",
      "조선 세종 때 만든 앙부일구는 솥처럼 오목하게 생긴 해시계예요. 해가 움직이면 바늘의 그림자도 움직여서, 그림자가 가리키는 곳을 보고 시각을 알 수 있었어요.",
      "같은 때에 만든 측우기는 비가 얼마나 왔는지 재는 그릇이에요. 비의 양을 꾸준히 적어 두니 농사를 미리 준비할 수 있었지요.",
      "크로노 영감은 이 이야기를 들려줄 때마다 「기록이 있어야 시간이 흐른다」고 말해요.",
    ],
    q: [
      ["앙부일구는 무엇을 보고 시각을 알 수 있었나요?", ["바늘의 그림자", "종소리", "떨어지는 물방울"], 0],
      ["측우기로 잰 것은 무엇인가요?", ["바람의 세기", "비의 양", "땅의 온도"], 1],
      [
        "비의 양을 적어 두어서 좋았던 점은?",
        ["농사를 미리 준비할 수 있었다", "비가 오지 않게 되었다", "시계가 필요 없어졌다"],
        0,
      ],
    ],
  },
  beast: {
    t: "별짐승 전설",
    part: 10,
    where: "망각의 탑 1층",
    rw: "별짐승의 깃털",
    p: [
      "아주 오래전 아르카의 밤하늘에는 별짐승들이 뛰어다녔대요. 그런데 사람들이 별짐승을 잊어버리자, 별짐승도 하나둘 모습을 감추었어요.",
      "우리 세상에도 사라질 위기에 놓인 동물들이 있어요. 살 곳이 줄어들거나 사람들이 함부로 잡으면 동물의 수가 크게 줄어들어요.",
      "그래서 사람들은 보호 구역을 만들고, 그 동물들을 기억하고 기록해요.",
      "얼음 부엉이는 「잊지 않는 것이 지키는 것의 시작」이라고 말해요.",
    ],
    q: [
      ["별짐승이 모습을 감춘 까닭은 무엇인가요?", ["사람들이 잊어버려서", "겨울이 길어서", "먹이가 없어서"], 0],
      [
        "동물이 사라질 위기에 놓이는 까닭으로 알맞은 것은?",
        ["비가 자주 와서", "살 곳이 줄어들어서", "밤이 길어져서"],
        1,
      ],
      ["동물을 지키려고 사람들이 하는 일은?", ["더 많이 잡기", "숲을 없애기", "보호 구역 만들기"], 2],
    ],
  },
};

const hood = (c) => (r, b) => {
  r(4, 0 + b, 8, 2, c);
  r(3, 1 + b, 2, 1, c);
  r(11, 1 + b, 2, 1, c);
  r(3, 2 + b, 1, 7, c);
  r(12, 2 + b, 1, 7, c);
};
TH.stone = {
  g: "#a9a49a",
  g1: "#9a958b",
  g2: "#b8b3a9",
  edge: "#8a857b",
  tr: ["#3a5f3a", "#456e45", "#527f4f", "#6a9a5a"],
};
TH.garden = {
  g: "#9bd062",
  g1: "#8ac152",
  g2: "#b0dc7a",
  edge: "#7fb04a",
  tr: ["#2f7a3a", "#3a8a45", "#4f9a52", "#78c060"],
};
D.halmi = {
  n: "할미꽃 할머니",
  hair: "#d9d3e6",
  ht: "bun",
  top: "#7F77DD",
  robe: 1,
  ex: (r, b) => {
    r(13, 6 + b, 1, 11, "#7a5236");
    r(12, 5 + b, 3, 2, "#D4537E");
  },
};
D.evan = {
  n: "에반",
  hair: "#5a3a22",
  ht: "short",
  top: "#3B6D11",
  top2: "#854F0B",
  bot: "#633806",
  ex: (r, b) => {
    r(14, 6 + b, 1, 1, "#854F0B");
    r(15, 7 + b, 1, 6, "#854F0B");
    r(14, 13 + b, 1, 1, "#854F0B");
    r(14, 7 + b, 1, 6, "#ece8dc");
  },
};
D.lis = {
  n: "리스",
  hair: "#FAC775",
  ht: "short",
  top: "#888780",
  bot: "#5F5E5A",
  ex: (r, b) => hood("#5F5E5A")(r, b),
};
D.mor = {
  n: "모르",
  hair: "#993C1D",
  ht: "short",
  top: "#5F5E5A",
  bot: "#444441",
  grin: 1,
  ex: (r, b) => {
    hood("#444441")(r, b);
    r(12, 12 + b, 2, 2, "#EF9F27");
  },
};
D.gren = {
  n: "그렌",
  hair: "#2C2C2A",
  ht: "short",
  top: "#5F5E5A",
  bot: "#444441",
  eye: "sharp",
  ex: (r, b) => {
    hood("#444441")(r, b);
    r(13, 8 + b, 1, 4, "#c9ced6");
  },
};
D.kron = {
  n: "크로노 영감",
  hair: "#D3D1C7",
  ht: "bald",
  beard: "#D3D1C7",
  top: "#5F5E5A",
  top2: "#c9a24a",
  bot: "#2C2C2A",
  ex: (r, b) => {
    r(5, 4 + b, 3, 1, "#c9a24a");
    r(8, 4 + b, 3, 1, "#c9a24a");
  },
};
D.brida = {
  n: "브리다",
  hair: "#993C1D",
  ht: "braid",
  top: "#8a5a35",
  arm: SK,
  bot: "#633806",
  ex: (r, b) => {
    r(13, 6 + b, 1, 8, "#7a5236");
    r(12, 5 + b, 4, 3, "#5F5E5A");
  },
};
D.jay = {
  n: "제이",
  hair: "#2C2C2A",
  ht: "short",
  top: "#d9cfb8",
  bot: "#5F5E5A",
  small: 1,
  ex: (r, b) => {
    r(4, 1 + b, 8, 2, "#5F5E5A");
    r(10, 3 + b, 3, 1, "#5F5E5A");
    r(12, 10 + b, 3, 4, "#f5f2ea");
  },
};
D.serafin = {
  n: "세라핀 교장",
  hair: "#F1EFE8",
  ht: "long",
  top: "#534AB7",
  top2: "#FAC775",
  robe: 1,
  ex: (r, b) => {
    r(3, 1 + b, 10, 1, "#26215C");
    r(5, -1 + b, 6, 2, "#3C3489");
    r(7, -2 + b, 3, 1, "#3C3489");
  },
};
D.popo = {
  n: "포포",
  hair: "#ED93B1",
  ht: "short",
  top: "#0C447C",
  bot: "#2C2C2A",
  ex: (r, b) => r(12, 10 + b, 3, 4, "#f5f2ea"),
};
D.ruru = {
  n: "루루",
  hair: "#EF9F27",
  ht: "pony",
  top: "#F4C0D1",
  bot: "#D4537E",
  ex: (r, b) => {
    r(13, 8 + b, 3, 3, "#f5efe2");
    r(15, 7 + b, 2, 2, "#ED93B1");
  },
};
D.arien = {
  n: "아리엔 왕녀",
  hair: "#FAC775",
  ht: "long",
  top: "#ED93B1",
  robe: 1,
  small: 1,
  ex: (r, b) => {
    r(5, 0 + b, 6, 1, "#f5c84a");
    r(5, -1 + b, 1, 1, "#f5c84a");
    r(7, -1 + b, 2, 1, "#f5c84a");
    r(10, -1 + b, 1, 1, "#f5c84a");
  },
};
D.pung = {
  n: "펑펑 할아버지",
  hair: "#F1EFE8",
  ht: "bald",
  beard: "#F1EFE8",
  top: "#d6453d",
  bot: "#2C2C2A",
  ex: (r, b) => {
    r(13, 8 + b, 2, 6, "#d6453d");
    r(13, 7 + b, 1, 1, "#FAC775");
  },
};
D.reno = {
  n: "레노",
  hair: "#712B13",
  ht: "long",
  top: "#1D9E75",
  top2: "#FAC775",
  bot: "#444441",
  ex: (r, b) => {
    r(12, 10 + b, 4, 4, "#BA7517");
    r(13, 6 + b, 1, 5, "#633806");
  },
};
D.goldwin = { n: "골드윈", hair: "#c9a24a", ht: "short", top: "#7F77DD", top2: "#f5c84a", bot: "#2C2C2A" };
D.gris = { n: "그리셀다 교수", hair: "#444441", ht: "bun", top: "#26215C", top2: "#c9a24a", robe: 1 };
D.layla = { n: "레일라", hair: "#2C2C2A", ht: "pony", top: "#5F5E5A", top2: "#a83a35", bot: "#2C2C2A" };
D.doto = { n: "도토", hair: "#854F0B", ht: "short", top: "#97C459", bot: "#633806", small: 1 };
D.sora = D.sora;
function gbugD(r, b, f) {
  r(2, 18, 12, 1, "rgba(0,0,0,0.2)");
  const lg = f % 2;
  [
    [3, 15],
    [6, 16],
    [10, 16],
    [13, 15],
  ].forEach(([a, y], i) => r(a, y + ((i + lg) % 2), 1, 3 - ((i + lg) % 2), "#444441"));
  for (let dy = -5; dy <= 5; dy++) {
    const w = Math.floor(Math.sqrt(25 - dy * dy));
    r(8 - w, 11 + dy + b, 2 * w + 1, 1, "#8a8a96");
  }
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2 + f * 0.3;
    r(Math.round(8 + Math.cos(an) * 6) - 1, Math.round(11 + Math.sin(an) * 6) + b - 1, 2, 2, "#6e6e7a");
  }
  r(7, 10 + b, 2, 2, "#c9a24a");
  r(10, 8 + b, 2, 2, "#e24b4a");
  r(4, 9 + b, 2, 1, "#a8a8b4");
}
function wolfD(r, b, f, mv) {
  r(2, 18, 13, 1, "rgba(0,0,0,0.2)");
  const a1 = mv && f % 2 ? 1 : 0;
  [
    [4, a1],
    [7, 1 - a1],
    [10, a1],
    [12, 1 - a1],
  ].forEach(([a, l]) => r(a, 14, 2, 4 - l, "#a8b6c7"));
  r(3, 9 + b, 10, 5, "#cfd8e3");
  r(4, 13 + b, 8, 1, "#b3c1d1");
  r(11, 6 + b, 5, 5, "#cfd8e3");
  r(15, 8 + b, 2, 2, "#cfd8e3");
  r(16, 8 + b, 1, 1, "#2b2b2b");
  r(12, 4 + b, 2, 2, "#a8b6c7");
  r(13, 7 + b, 1, 1, "#3a7ac0");
  r(0, 7 + b, 3, 2, "#cfd8e3");
  r(1, 6 + b, 2, 1, "#e6eef6");
  r(5, 9 + b, 4, 1, "#e6eef6");
}

function crabD(r, b, f, mv) {
  r(2, 18, 12, 1, "rgba(0,0,0,0.2)");
  const l = mv && f % 2 ? 1 : 0;
  [
    [2, 14],
    [4, 15],
    [10, 15],
    [12, 14],
  ].forEach(([a, y], i) => r(a, y + ((i + l) % 2), 1, 3, "#a8342e"));
  r(3, 9 + b, 10, 6, "#d6453d");
  r(4, 8 + b, 8, 1, "#e86a5a");
  r(5, 11 + b, 2, 2, "#ffffff");
  r(9, 11 + b, 2, 2, "#ffffff");
  r(6, 12 + b, 1, 1, "#2b2b2b");
  r(10, 12 + b, 1, 1, "#2b2b2b");
  r(0, 6 + b + l, 3, 3, "#d6453d");
  r(13, 6 + b - l, 3, 3, "#d6453d");
  r(1, 6 + b + l, 1, 1, "#f5efe2");
  r(14, 6 + b - l, 1, 1, "#f5efe2");
}
function queenD(r, b, f) {
  jellyD(r, b, f);
  const y = b - 4;
  r(4, 1 + y, 8, 2, "#f5c84a");
  r(4, 0 + y, 1, 1, "#f5c84a");
  r(7, -1 + y, 2, 2, "#f5c84a");
  r(11, 0 + y, 1, 1, "#f5c84a");
  r(7, 0 + y, 2, 1, "#E24B4A");
}
function golemD(r, b, f) {
  r(1, 18, 14, 1, "rgba(0,0,0,0.25)");
  r(2, 4 + b, 12, 12, "#6e6a72");
  r(2, 4 + b, 12, 2, "#8a8590");
  r(3, 16, 4, 2, "#4f4b55");
  r(9, 16, 4, 2, "#4f4b55");
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2 + f * 0.25;
    r(Math.round(8 + Math.cos(an) * 4) - 1, Math.round(10 + Math.sin(an) * 4) + b - 1, 2, 2, "#c9a24a");
  }
  r(7, 9 + b, 2, 2, "#3a3530");
  r(4, 5 + b, 2, 2, "#7fd6ff");
  r(10, 5 + b, 2, 2, "#7fd6ff");
  r(0, 7 + b, 2, 6, "#5a5660");
  r(14, 7 + b, 2, 6, "#5a5660");
}
const P_GREN = {
    n: "그렌",
    hair: "#2C2C2A",
    ht: "short",
    top: "#5F5E5A",
    bot: "#444441",
    eye: "sharp",
    ex: (r, b) => {
      hood("#444441")(r, b);
      r(13, 8 + b, 1, 4, "#c9ced6");
    },
  },
  P_MOR = {
    n: "모르",
    hair: "#993C1D",
    ht: "short",
    top: "#5F5E5A",
    bot: "#444441",
    grin: 1,
    ex: (r, b) => {
      hood("#444441")(r, b);
      r(12, 12 + b, 2, 2, "#EF9F27");
    },
  };
const P_NOX = {
  n: "녹스",
  skin: "#d9cfe0",
  hair: "#D3D1C7",
  ht: "long",
  top: "#3a3550",
  top2: "#7F77DD",
  robe: 1,
  ex: (r, b, f) => {
    hood("#26215C")(r, b);
    r(6, 5 + b, 1, 1, "#ff8fd0");
    r(9, 5 + b, 1, 1, "#ff8fd0");
    r(13, 10 + b, 3, 2, "#F4C0D1");
    r(13, 12 + b, 3, 1, "#185FA5");
  },
};
const aura = (r, f, c) => {
  if (f % 6 < 3) {
    r(1, 2, 1, 1, c);
    r(14, 6, 1, 1, c);
    r(2, 15, 1, 1, c);
  } else {
    r(14, 1, 1, 1, c);
    r(1, 9, 1, 1, c);
    r(13, 15, 1, 1, c);
  }
};
Object.assign(MON, {
  crab: { n: "안개 집게게", hp: 3, dmg: 1, dif: 2, exp: 9, dust: 1, gold: 5, spd: 0.5, dr: crabD },
  bog: {
    n: "늪 슬라임",
    hp: 3,
    dmg: 1,
    dif: 2,
    exp: 9,
    dust: 1,
    gold: 5,
    spd: 0.45,
    dr: (r, b) => slimeD(r, b, "#7fb05a", "#5f9040", "#2c3a24"),
  },
  wolf: { n: "안개 늑대", hp: 4, dmg: 1, dif: 3, exp: 12, dust: 2, gold: 7, spd: 0.65, dr: wolfD },
  gear: { n: "톱니 벌레", hp: 4, dmg: 1, dif: 3, exp: 12, dust: 2, gold: 8, spd: 0.55, dr: gbugD },
  fire: {
    n: "불꽃 슬라임",
    hp: 4,
    dmg: 2,
    dif: 3,
    exp: 14,
    dust: 2,
    gold: 9,
    spd: 0.55,
    dr: (r, b) => slimeD(r, b, "#f0995a", "#d6643a", "#5a1e10"),
  },
  queen: { n: "안개 해파리 여왕", hp: 8, dmg: 1, dif: 3, exp: 50, dust: 0, gold: 50, spd: 0, boss: 1, dr: queenD },
  gren: {
    n: "그림자 견습생 그렌",
    hp: 9,
    dmg: 1,
    dif: 4,
    exp: 60,
    dust: 0,
    gold: 60,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => {
      aura(r, f, "#7F77DD");
      person(r, b, f, P_GREN, false, "d");
    },
  },
  golem: { n: "안개 톱니 골렘", hp: 10, dmg: 2, dif: 4, exp: 70, dust: 0, gold: 70, spd: 0, boss: 1, dr: golemD },
  kai: {
    n: "결승 상대 카이",
    hp: 10,
    dmg: 1,
    dif: 5,
    exp: 80,
    dust: 0,
    gold: 80,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => person(r, b, f, D.kai, false, "d"),
  },
  mor: {
    n: "그림자 견습생 모르",
    hp: 9,
    dmg: 2,
    dif: 5,
    exp: 60,
    dust: 6,
    gold: 50,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => {
      aura(r, f, "#EF9F27");
      person(r, b, f, P_MOR, false, "d");
    },
  },
  nox: {
    n: "녹스의 그림자",
    hp: 14,
    dmg: 2,
    dif: 5,
    exp: 120,
    dust: 0,
    gold: 100,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => {
      aura(r, f, "#ff8fd0");
      aura(r, f + 3, "#7F77DD");
      person(r, b, f, P_NOX, false, "d");
    },
  },
});
function mstat(m) {
  const B0 = MON[m.type],
    t = (MAPS[m.map] || M).tier || 1;
  if (B0.boss) {
    if (m.type === "gate")
      return { ...B0, hp: B0.hp + 2 * (t - 1), dif: Math.min(5, 2 + t), exp: B0.exp * t, dust: B0.dust + t };
    return { ...B0 };
  }
  return {
    ...B0,
    hp: B0.hp + Math.floor((t - 1) * 0.8),
    dmg: B0.dmg + (t >= 4 ? 1 : 0),
    dif: Math.min(5, B0.dif + t - 1),
    exp: Math.round(B0.exp * (1 + 0.4 * (t - 1))),
    gold: Math.round(B0.gold * (1 + 0.4 * (t - 1))),
    dust: B0.dust + Math.floor((t - 1) / 2),
  };
}
Object.assign(ITEM, { cog: "녹슨 톱니", spark: "불꽃 가루" });
EQ.c_ribbon = { s: "c", n: "왕녀의 리본", hp: 1, exp: 0.1, d: "체력 +1 · 경험치 +10%" };
EQ.c_scarf = { s: "c", n: "따끈한 목도리", hp: 1, d: "체력 +1" };
I2E["왕녀의 리본"] = "c_ribbon";
I2E["따끈한 목도리"] = "c_scarf";
function nodeDraw2(r, t, ok, f) {
  if (!ok) {
    r(7, 16, 2, 2, "#5a8f2e");
    return;
  }
  if (t === "cog") {
    r(4, 15, 9, 3, "#5a4a3e");
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * Math.PI * 2;
      r(Math.round(8 + Math.cos(an) * 3), Math.round(12 + Math.sin(an) * 3), 2, 2, "#a0522d");
    }
    r(7, 11, 3, 3, "#b8693a");
  }
  if (t === "spark") {
    r(6, 13, 5, 4, "#d6453d");
    r(7, 12, 3, 1, "#f5c84a");
    if (f % 6 < 3) {
      r(8, 9, 1, 2, "#ffd86b");
      r(6, 10, 1, 1, "#ffd86b");
      r(10, 10, 1, 1, "#ffd86b");
    }
  }
}
QS.push(
  {
    id: "q3",
    map: "t2",
    npc: "marinda",
    type: "kill",
    mon: "jelly",
    n: 4,
    title: "안개 해파리 쫓기",
    where: "r3",
    offer: ["해안길에서 안개 해파리가 몰려와 갈매기호가 못 들어와!", "4마리만 쫓아내 줄 수 있겠나?"],
    prog: "해파리는 해안 절벽길에 있지.",
    done: ["좋아! 이제 바닷길이 좀 트이겠군!"],
    rw: { exp: 30, gold: 40, dust: 5 },
  },
  {
    id: "q4",
    map: "t2",
    npc: "sora",
    type: "gather",
    item: "shell",
    n: 5,
    title: "반짝 조개 찾기",
    where: "r3",
    offer: ["렌즈를 닦으려면 반짝 조개 가루가 필요해.", "해안길 모래밭에서 조개 5개만 주워 줄래?"],
    prog: "해안길 모래밭에 조개가 있어.",
    done: ["고마워! 이거 받아. 내 조개 피리야."],
    rw: { exp: 20, gold: 15, dust: 5, item: "소라의 조개 피리" },
  },
  {
    id: "q5",
    map: "t3",
    npc: "halmi",
    type: "gather",
    item: "herb",
    n: 6,
    title: "약초 캐기",
    where: "r5",
    offer: ["숲이 시들어서 마을 사람들이 기운이 없단다.", "습지길에서 약초 6뿌리만 캐다 주렴."],
    prog: "약초는 습지길과 숲 어귀에 자란단다.",
    done: ["고맙구나. 이 약초 주머니를 가져가렴."],
    rw: { exp: 30, gold: 20, dust: 5, item: "이끼골 약초 주머니" },
  },
  {
    id: "q6",
    map: "t3",
    npc: "evan",
    type: "kill",
    mon: "wolf",
    n: 4,
    title: "안개 늑대 쫓기",
    where: "r6",
    offer: ["숲 어귀에 안개 늑대가 나타나 쌍둥이가 숲에 못 나가.", "4마리만 쫓아 줄래?"],
    prog: "늑대는 안개 숲 어귀에 있어.",
    done: ["역시! 필라 스승님이 칭찬하시겠는걸."],
    rw: { exp: 40, gold: 35, dust: 5 },
  },
  {
    id: "q7",
    map: "t4",
    npc: "brida",
    type: "kill",
    mon: "gear",
    n: 5,
    title: "톱니 벌레 잡기",
    where: "r8",
    offer: ["바위 고개에 톱니 벌레가 들끓어서 광석을 못 가져와!", "5마리만 잡아 줘!"],
    prog: "톱니 벌레는 바위 고개에 있어!",
    done: ["하하, 시원하다! 오빠한테 자랑해야지!"],
    rw: { exp: 45, gold: 45, dust: 5 },
  },
  {
    id: "q8",
    map: "t4",
    npc: "kron",
    type: "gather",
    item: "cog",
    n: 4,
    title: "녹슨 톱니 모으기",
    where: "r9",
    offer: ["뭐라고? 톱니? 그래, 시계탑 톱니가 모자라.", "철로 옆길에서 녹슨 톱니 4개만 가져오너라."],
    prog: "뭐라고? 톱니는 철로 옆길에 있다니까.",
    done: ["오, 이거면 시계를 고칠 수 있겠구먼."],
    rw: { exp: 35, gold: 30, dust: 5, item: "멈춘 회중시계" },
  },
  {
    id: "q9",
    map: "t5",
    npc: "gris",
    type: "kill",
    mon: "wolf",
    n: 5,
    title: "왕의 길 정리",
    where: "r11",
    offer: ["대회 손님들이 왕의 길에서 늑대 때문에 못 온다는군.", "5마리를 정리해 오게. 공정하게 점수에 반영하지."],
    prog: "늑대는 왕의 길에 있네.",
    done: ["훌륭하군. 결승에서 보세."],
    rw: { exp: 50, gold: 50, dust: 5 },
  },
  {
    id: "q10",
    map: "t5",
    npc: "popo",
    type: "gather",
    item: "flower",
    n: 5,
    title: "포포의 응원 꽃",
    where: "r10",
    offer: ["시험이 너무 무서워… 들꽃을 보면 마음이 편해지는데.", "들꽃 평원에서 5송이만 따다 줄래?"],
    prog: "들꽃 평원에 꽃이 많대.",
    done: ["고마워! 이제 덜 떨려. 이거 내 응원 편지야."],
    rw: { exp: 35, gold: 25, dust: 5, item: "포포의 응원 편지" },
  },
  {
    id: "q11",
    map: "t6",
    npc: "arien",
    type: "kill",
    mon: "fire",
    n: 4,
    title: "축제 길 지키기",
    where: "r13",
    offer: ["축제 손님들이 별빛 다리에서 불꽃 슬라임 때문에 못 온대.", "4마리만 물리쳐 줄래? 견습생 대표님!"],
    prog: "불꽃 슬라임은 별빛 다리길에 있어.",
    done: ["고마워! 이거 내 리본이야. 우리 비밀 친구 표시!"],
    rw: { exp: 60, gold: 60, dust: 5, item: "왕녀의 리본" },
  },
  {
    id: "q12",
    map: "t6",
    npc: "pung",
    type: "gather",
    item: "spark",
    n: 4,
    title: "불꽃 가루 모으기",
    where: "r14",
    offer: ["불꽃 창고가 지워져 버렸어! 축제를 어쩌나!", "축제 거리 외곽에서 불꽃 가루 4봉지만 구해 주게!"],
    prog: "불꽃 가루는 축제 거리 외곽에 떨어져 있다네.",
    done: ["이걸로 하늘을 밝힐 수 있겠어! 고맙네!"],
    rw: { exp: 45, gold: 40, dust: 5 },
  },
);
const PARTS = [
  { town: "t1", gate: "r3", main: "song", hunt: "r1" },
  { town: "t2", gate: "r6", main: "oscar", boss: "queen", hunt: "r3" },
  { town: "t3", gate: "r9", main: "t3main", boss: "gren", hunt: "r6" },
  { town: "t4", gate: "r12", main: "time", boss: "golem", hunt: "r9" },
  { town: "t5", gate: "r14", main: "t5main", boss: "kai", hunt: "r12" },
  { town: "t6", gate: null, main: "t6main", boss: "nox", hunt: "r14" },
];
const RSPEC = [
  {
    id: "r4",
    n: "길목 4 · 해송 오솔길",
    theme: "coast",
    tier: 2,
    mons: [
      ["jelly", 3],
      ["crab", 3],
    ],
    node: "shell",
    prev: "t2",
    next: "r5",
  },
  {
    id: "r5",
    n: "길목 5 · 갈대 습지길",
    theme: "forest",
    tier: 2,
    mons: [
      ["bog", 4],
      ["mush", 2],
    ],
    node: "herb",
    prev: "r4",
    next: "r6",
    dead: "d2",
  },
  {
    id: "d2",
    isDead: 1,
    n: "막다른 길 · 바닷가 동굴",
    theme: "dead",
    tier: 3,
    mons: [
      ["shade", 3],
      ["crab", 2],
    ],
    from: "r5",
  },
  {
    id: "r6",
    n: "길목 6 · 안개 숲 어귀",
    theme: "forest",
    tier: 3,
    mons: [
      ["wolf", 4],
      ["mush", 2],
    ],
    node: "herb",
    prev: "r5",
    next: "t3",
    gate: "gate",
  },
  {
    id: "r7",
    n: "길목 7 · 이끼 계곡",
    theme: "forest",
    tier: 3,
    mons: [
      ["wolf", 3],
      ["bog", 3],
    ],
    node: "herb",
    prev: "t3",
    next: "r8",
  },
  {
    id: "r8",
    n: "길목 8 · 바위 고개",
    theme: "stone",
    tier: 3,
    mons: [
      ["gear", 4],
      ["shade", 1],
    ],
    node: "cog",
    prev: "r7",
    next: "r9",
    dead: "d3",
  },
  {
    id: "d3",
    isDead: 1,
    n: "막다른 길 · 버려진 광산",
    theme: "dead",
    tier: 4,
    mons: [
      ["gear", 3],
      ["shade", 2],
    ],
    from: "r8",
  },
  {
    id: "r9",
    n: "길목 9 · 철로 옆길",
    theme: "stone",
    tier: 4,
    mons: [
      ["gear", 4],
      ["wolf", 2],
    ],
    node: "cog",
    prev: "r8",
    next: "t4",
    gate: "gate",
  },
  {
    id: "r10",
    n: "길목 10 · 들꽃 평원",
    theme: "garden",
    tier: 4,
    mons: [
      ["fire", 4],
      ["wolf", 2],
    ],
    node: "flower",
    prev: "t4",
    next: "r11",
  },
  {
    id: "r11",
    n: "길목 11 · 왕의 길",
    theme: "garden",
    tier: 4,
    mons: [
      ["wolf", 3],
      ["fire", 3],
    ],
    node: "flower",
    prev: "r10",
    next: "r12",
    dead: "d4",
  },
  { id: "d4", isDead: 1, n: "막다른 길 · 안개 호수", theme: "dead", tier: 5, mons: [["shade", 4]], from: "r11" },
  {
    id: "r12",
    n: "길목 12 · 성벽 아래 길",
    theme: "stone",
    tier: 5,
    mons: [
      ["shade", 3],
      ["gear", 3],
    ],
    node: "herb",
    prev: "r11",
    next: "t5",
    gate: "gate",
  },
  {
    id: "r13",
    n: "길목 13 · 별빛 다리길",
    theme: "garden",
    tier: 5,
    mons: [
      ["fire", 3],
      ["shade", 3],
    ],
    node: "spark",
    prev: "t5",
    next: "r14",
    dead: "d5",
  },
  {
    id: "d5",
    isDead: 1,
    n: "막다른 길 · 그림자 골목",
    theme: "dead",
    tier: 5,
    mons: [
      ["shade", 4],
      ["wolf", 2],
    ],
    from: "r13",
  },
  {
    id: "r14",
    n: "길목 14 · 축제 거리 외곽",
    theme: "garden",
    tier: 5,
    mons: [
      ["fire", 3],
      ["shade", 3],
    ],
    node: "spark",
    prev: "r13",
    next: "t6",
    gate: "mor",
  },
];
const PATHY = {};
function genRoute(sp, seed) {
  const w = 40,
    h = 22,
    m = nm(w, h, "."),
    G = m.G,
    O = m.O;
  Object.assign(m, {
    id: sp.id,
    n: sp.n,
    short: sp.n.split(" · ")[1],
    kind: "route",
    theme: sp.theme,
    tier: sp.tier,
    rec: "Lv " + (sp.tier * 2 - 1) + "~" + sp.tier * 2,
  });
  const py = (a) => 10 + Math.round(2 * Math.sin(a / 6 + seed)),
    bxf = (y) => 15 + Math.round(1.5 * Math.sin(y / 3 + seed));
  PATHY[sp.id] = { py, bx: bxf };
  for (let a = 0; a < w; a++) {
    G[py(a)][a] = ":";
    G[py(a) + 1][a] = ":";
  }
  if (sp.dead)
    for (let y = 0; y <= py(16); y++) {
      const b = bxf(y);
      G[y][b] = ":";
      G[y][b + 1] = ":";
    }
  if (sp.theme === "coast") {
    FL(G, 0, 19, w - 1, 21, "~");
    FL(G, 0, 17, w - 1, 18, "s");
  }
  const sx = 24 + (seed % 5);
  for (let y = 1; y < h - 1; y++) {
    if (G[y][sx] === "~" || G[y][sx] === "s") continue;
    G[y][sx] = G[y][sx] === ":" ? "b" : "-";
  }
  const keep = new Set(["0," + py(0), "0," + (py(0) + 1), w - 1 + "," + py(w - 1), w - 1 + "," + (py(w - 1) + 1)]);
  if (sp.dead) {
    keep.add(bxf(0) + ",0");
    keep.add(bxf(0) + 1 + ",0");
  }
  border(m, keep);
  const dens = sp.theme === "forest" ? 3 : sp.theme === "stone" ? 7 : sp.theme === "garden" ? 6 : 5;
  for (let y = 1; y < h - 1; y++)
    for (let a = 1; a < w - 1; a++) {
      const g = G[y][a];
      if (g !== ".") continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy,
            aa = a + dx;
          if (yy >= 0 && yy < h && aa >= 0 && aa < w && (G[yy][aa] === ":" || G[yy][aa] === "b")) {
            near = true;
            break;
          }
        }
      const k = hsh(a * 13 + seed, y * 7);
      if (!near && k % dens === 0) O[y][a] = "T";
      else if (!near && sp.theme === "stone" && k % 9 === 1) O[y][a] = "r";
      else if (k % (sp.theme === "garden" ? 3 : 6) === 0) G[y][a] = ",";
    }
  for (let i = 0; i < 4; i++) {
    const k = hsh(i * 31 + seed, seed * 7),
      a = 3 + (k % (w - 6)),
      y = 2 + ((k >>> 8) % (h - 4));
    if (G[y][a] === "." || G[y][a] === ",") if (!O[y][a]) O[y][a] = i % 2 ? "r" : "l";
  }
  m.bld = [];
  m.npcs = [];
  m.locks = [];
  m.spots = [{ id: sp.id + "s", kind: "sign", tx: 6, ty: Math.max(2, py(6) - 2), n: m.short + " 표지판", t: "지문" }];
  m.spots.forEach((s) => {
    O[s.ty][s.tx] = "K";
    G[s.ty][s.tx] = ".";
  });
  const used = new Set();
  m.mons = [];
  sp.mons.forEach(([t, c], j) =>
    picks(m, c, (a, y) => a > 5 && a < w - 4 && !used.has(a + "," + y), seed * 11 + j).forEach(([a, y]) => {
      used.add(a + "," + y);
      m.mons.push([t, a, y]);
    }),
  );
  m.nodes = sp.node
    ? picks(m, 5, (a, y) => a > 3 && Math.abs(y - py(a)) > 1, seed * 17).map(([a, y]) => [sp.node, a, y])
    : [];
  m.exits = [
    { x0: 0, y0: py(0), x1: 0, y1: py(0) + 1, to: sp.prev, side: "e", d: "l" },
    { x0: w - 1, y0: py(w - 1), x1: w - 1, y1: py(w - 1) + 1, to: sp.next, side: "w", d: "r" },
  ];
  if (sp.dead) m.exits.push({ x0: bxf(0), y0: 0, x1: bxf(0) + 1, y1: 0, to: sp.dead, side: "s", d: "u" });
  if (sp.gate) {
    const gx = w - 3,
      gy = py(w - 3);
    m.gatePos = [gx, gy];
    if (!save.boss[sp.id]) {
      O[py(w - 1)][w - 1] = "X";
      O[py(w - 1) + 1][w - 1] = "X";
    }
    m.locks = [
      {
        tiles: [
          [w - 1, py(w - 1)],
          [w - 1, py(w - 1) + 1],
        ],
        msg: jo(MON[sp.gate].n, "을", "를") + " 물리쳐야 지나갈 수 있어요",
        open: () => !!save.boss[sp.id],
      },
    ];
    m.mons.push([sp.gate, gx, gy]);
  }
  return m;
}
function genDead(sp, seed) {
  const w = 30,
    h = 24,
    m = nm(w, h, "."),
    G = m.G,
    O = m.O;
  Object.assign(m, {
    id: sp.id,
    n: sp.n,
    short: sp.n.split(" · ")[1],
    kind: "dead",
    theme: sp.theme,
    tier: sp.tier,
    rec: "Lv " + sp.tier * 2 + "~ · 보물",
  });
  FL(G, 14, 16, 15, 23, ":");
  FL(G, 22, 4, 26, 8, "-");
  FL(G, 23, 5, 25, 7, ".");
  for (let y = 1; y < h - 1; y++)
    for (let a = 1; a < w - 1; a++) {
      if (G[y][a] === "-") continue;
      const inC = ((a - 15) / 11) ** 2 + ((y - 10) / 6) ** 2 < 1,
        cor = a >= 13 && a <= 16 && y >= 15,
        isl = a >= 23 && a <= 25 && y >= 5 && y <= 7;
      if (!inC && !cor && !isl && hsh(a + seed, y) % 4 !== 0) O[y][a] = "T";
      else if (G[y][a] === "." && hsh(a * 5, y + seed) % 6 === 0) G[y][a] = ",";
    }
  border(m, new Set(["14,23", "15,23"]));
  O[6][8] = "C";
  m.chest = { id: sp.id + "c", tx: 8, ty: 6 };
  m.spots = [{ id: sp.id + "h", kind: "bottle", tx: 24, ty: 6, n: m.short + "의 숨은 쪽지", t: "숨은 지문" }];
  m.spots.forEach((s) => (O[s.ty][s.tx] = "K"));
  m.bld = [];
  m.npcs = [];
  m.locks = [];
  m.nodes = [];
  const used = new Set();
  m.mons = [];
  sp.mons.forEach(([t, c], j) =>
    picks(m, c, (a, y) => y < 15 && !used.has(a + "," + y), seed * 13 + j).forEach(([a, y]) => {
      used.add(a + "," + y);
      m.mons.push([t, a, y]);
    }),
  );
  m.exits = [{ x0: 14, y0: h - 1, x1: 15, y1: h - 1, to: sp.from, side: "n", d: "d" }];
  return m;
}
const TSPEC = [
  {
    id: "t2",
    part: 1,
    n: "2부 루멘 항구",
    short: "루멘 항구",
    theme: "coast",
    lm: { lm: "tower", n: "항구 등대", x: 34, y: 3, w: 3, h: 6 },
    prev: "r3",
    next: "r4",
    blds: [
      ["덕배네 생선 가게", "#1D9E75", "#0F6E56"],
      ["골드윈 상점", "#7F77DD", "#534AB7"],
      ["소라네 집", "#c0563f", "#9a3f2e"],
      ["선원 숙소", "#3a7ac0", "#2f5a8a"],
    ],
    npcs: [
      ["sora", ["안개는 무섭지만… 렌즈라면 내가 제일 잘 알아.", "지워진 곳을 다 다시 쓰면 등대가 켜질 거야!"]],
      ["marinda", ["갈매기호가 항구 밖에 갇혀 있다고!"]],
      ["deok", ["손님이 없어서 생선이 남아돌아… 휴."]],
      ["goldwin", ["배가 안 오면 값이 오르는 거지, 흐흐.", "…뭐? 공정한 값? 그런 건 몰라."]],
    ],
    spots: [
      ["oscar", "board", "등대지기 오스카의 일지"],
      ["", "sign", "항구 표지판"],
      ["", "stone", "방파제 비석"],
      ["", "board", "시장 게시판"],
      ["", "bottle", "모래밭 병 편지"],
      ["", "sign", "부두 안내판"],
    ],
  },
  {
    id: "t3",
    part: 2,
    n: "3부 이끼골",
    short: "이끼골",
    theme: "forest",
    lm: { lm: "oak", n: "할아버지 참나무", x: 19, y: 2, w: 6, h: 6 },
    prev: "r6",
    next: "r7",
    blds: [
      ["할미꽃 약초방", "#7F77DD", "#534AB7"],
      ["사냥꾼 오두막", "#7a573b", "#5e3f29"],
      ["쌍둥이네 집", "#5a9e3a", "#3B6D11"],
      ["도토리 우체국", "#BA7517", "#854F0B"],
    ],
    npcs: [
      [
        "halmi",
        ["쌍둥이 도토와 리토가 숲에서 길을 잃었었단다.", "참나무 할아버지가 자기 이름을 잊어 숲이 시들고 있어."],
      ],
      ["evan", ["필라 스승님께 활을 배웠지."]],
      ["doto", ["리토가 용감한 척만 해… 사실 나보다 겁쟁이야!"]],
      ["lis", ["……", "(리스는 아무 말 없이 고개를 돌려요.)"]],
    ],
    spots: [
      ["t3main", "stone", "참나무가 들려준 이야기"],
      ["", "sign", "숲길 표지판"],
      ["", "board", "마을 게시판"],
      ["", "stone", "이끼 비석"],
      ["", "bottle", "나무 구멍 속 쪽지"],
      ["", "sign", "약초밭 팻말"],
    ],
  },
  {
    id: "t4",
    part: 3,
    n: "4부 철의 도시 카르딘",
    short: "카르딘",
    theme: "stone",
    lm: { lm: "clock", n: "카르딘 시계탑", x: 20, y: 1, w: 4, h: 8 },
    prev: "r9",
    next: "r10",
    blds: [
      ["브리다 대장간", "#a83a35", "#7e2a25"],
      ["카르딘 기차역", "#5F5E5A", "#444441"],
      ["신문 가판대", "#3a7ac0", "#2f5a8a"],
      ["공장", "#8a5a35", "#633806"],
    ],
    npcs: [
      ["kron", ["뭐라고? 오늘이 며칠이냐고? 6월 3일이지!", "…어제도 6월 3일이었던가?"]],
      ["brida", ["오빠 고르드랑 목소리 똑같다는 말 많이 듣지!"]],
      ["layla", ["기차가 멈춘 지 한참이야. 시간이 흘러야 달릴 텐데."]],
      ["jay", ["이 신문, 어제도 판 것 같아…", "시간이 다시 흐르면 어제와 다른 기사를 쓸 거야!"]],
    ],
    spots: [
      ["time", "board", "시간을 잰 사람들"],
      ["", "sign", "역 안내판"],
      ["", "board", "공장 게시판"],
      ["", "stone", "광장 기념비"],
      ["", "bottle", "철로 옆 쪽지"],
      ["", "sign", "대장간 간판"],
    ],
  },
  {
    id: "t5",
    part: 4,
    n: "5부 수도 아르카스",
    short: "아르카스",
    theme: "garden",
    lm: { lm: "academy", n: "왕립 아카데미", x: 14, y: 1, w: 16, h: 8 },
    prev: "r12",
    next: "r13",
    blds: [
      ["기숙사", "#534AB7", "#3C3489"],
      ["서점", "#c0563f", "#9a3f2e"],
      ["대회장 매표소", "#d9a63a", "#BA7517"],
      ["여관", "#1D9E75", "#0F6E56"],
    ],
    npcs: [
      ["serafin", ["「별빛 겨루기」에 온 걸 환영한다.", "…녹스라는 이름을 들어 본 적 있니?"]],
      ["gris", ["규칙은 규칙이네. 공정하게 겨루게."]],
      ["popo", ["카이는 밤마다 빈 지도만 봐."]],
      ["ruru", ["여러분, 견습생 대회 「별빛 겨루기」가 곧 시작됩니다!"]],
    ],
    spots: [
      ["t5main", "board", "아카데미 300년 역사"],
      ["", "sign", "아카데미 안내판"],
      ["", "board", "대회 게시판"],
      ["", "stone", "창립자 동상 받침돌"],
      ["", "bottle", "기숙사 창가 쪽지"],
      ["", "sign", "서점 간판"],
    ],
  },
  {
    id: "t6",
    part: 5,
    n: "6부 왕궁 광장",
    short: "왕궁 광장",
    theme: "garden",
    lm: { lm: "palace", n: "아르카 왕궁", x: 12, y: 1, w: 20, h: 8 },
    prev: "r14",
    next: null,
    blds: [
      ["불꽃 창고", "#d6453d", "#a8342e"],
      ["축제 본부", "#d9a63a", "#BA7517"],
      ["기념품 가게", "#1D9E75", "#0F6E56"],
      ["손님 숙소", "#7F77DD", "#534AB7"],
    ],
    npcs: [
      ["arien", ["견습생 대표님, 이 별 등불을 맡아 줄래?", "궁 밖은 처음이야! 축제 안내해 줄 거지?"]],
      ["pung", ["불꽃이 망가졌다니까! 발을 동동 구를 노릇이야!"]],
      ["marta", ["루멘에서 구경 왔단다. 축제가 참 곱구나."]],
      ["toto", ["형, 누나! 축제 진짜 멋지다!"]],
    ],
    spots: [
      ["t6main", "board", "별빛 축제의 유래"],
      ["", "sign", "광장 안내판"],
      ["", "board", "축제 게시판"],
      ["", "stone", "7현자 기념비"],
      ["", "bottle", "분수 옆 쪽지"],
      ["", "sign", "불꽃 창고 팻말"],
    ],
  },
];
function genTown(sp, seed) {
  const w = 44,
    h = 28,
    m = nm(w, h, "."),
    G = m.G,
    O = m.O;
  Object.assign(m, {
    id: sp.id,
    n: sp.n,
    short: sp.short,
    kind: "town",
    theme: sp.theme,
    part: sp.part,
    spawn: [22, 16],
    patch: 1,
  });
  FL(G, 0, 14, w - 1, 15, ":");
  for (let y = 10; y <= 19; y++)
    for (let a = 15; a <= 29; a++) if (((a - 22) / 7) ** 2 + ((y - 14.5) / 4.5) ** 2 < 1) G[y][a] = "q";
  FL(G, 0, 14, w - 1, 15, ":");
  FL(G, 4, 16, 4, 23, ":");
  FL(G, 39, 16, 39, 23, ":");
  FL(G, 4, 23, 39, 23, ":");
  if (sp.theme === "coast") {
    FL(G, 0, 0, w - 1, 2, "~");
    FL(G, 0, 3, w - 1, 3, "s");
    FL(G, 10, 0, 11, 2, "b");
  }
  const L = sp.lm,
    ldx = L.lm === "tower" ? L.x + 1 : 21;
  FL(G, ldx, L.y + L.h, ldx + 1, 13, ":");
  const lm = { ...L, dx: ldx, dy: L.y + L.h - 1 };
  if (L.lm === "tower") {
    lm.tower = 1;
    lm.lit = partDone(sp.part);
  }
  const slots = [
    [3, 7, 5, 4],
    [8, 18, 5, 4],
    [17, 18, 5, 4],
    [30, 18, 5, 4],
  ];
  if (L.x >= 30) slots[0] = [3, 7, 5, 4];
  else slots.push([33, 7, 5, 4]);
  m.bld = [lm];
  sp.blds.forEach(([nm2, roof, roofD], i) => {
    const s = slots[i];
    if (!s) return;
    const b = {
      n: nm2,
      x: s[0],
      y: s[1],
      w: s[2],
      h: s[3],
      roof,
      roofD,
      wall: ["#f3dcc0", "#f6e6c8", "#efe2cc", "#e8d4b0"][i % 4],
    };
    m.bld.push(b);
  });
  m.bld.forEach((b) => {
    if (!b.dx) {
      b.dx = b.x + Math.floor(b.w / 2);
      b.dy = b.y + b.h - 1;
    }
    FL(O, b.x, b.y, b.x + b.w - 1, b.y + b.h - 1, "B");
    if (!b.lm) {
      const yy = b.dy + 1;
      if (yy < h && yy !== 14 && yy !== 15) {
        for (let y = yy; y < 23 && G[y][b.dx] !== ":"; y++) G[y][b.dx] = ":";
        if (b.dy + 1 < 14) for (let y = b.dy + 1; y < 14; y++) G[y][b.dx] = ":";
      }
    }
  });
  const keep = new Set(["0,14", "0,15", w - 1 + ",14", w - 1 + ",15"]);
  border(m, keep);
  if (!sp.next) {
    O[14][w - 1] = "T";
    O[15][w - 1] = "T";
  }
  if (sp.theme === "forest") {
    for (let y = 1; y < h - 1; y++)
      for (let a = 1; a < w - 1; a++)
        if (!O[y][a] && G[y][a] === "." && (y < 5 || y > 24 || a < 3 || a > 40) && hsh(a, y + seed) % 2 === 0)
          O[y][a] = "T";
  }
  for (let y = 1; y < h - 1; y++)
    for (let a = 1; a < w - 1; a++) {
      if (O[y][a] || G[y][a] !== ".") continue;
      const k = hsh(a * 7 + seed, y * 3);
      if (k % 17 === 0) O[y][a] = "T";
      else if (k % 5 === 0) G[y][a] = ",";
    }
  for (let y = 12; y <= 17; y++) for (let a = 0; a < w; a++) if (O[y][a] === "T" && a > 0 && a < w - 1) O[y][a] = "";
  m.spots = sp.spots.map(([id, kind, n], i) => ({
    id: id || sp.id + "s" + i,
    kind,
    n,
    t: id ? n : "지문",
    main: i === 0,
  }));
  const sp0 = picks(
    m,
    6,
    (a, y) => y > 3 && y < 25 && Math.abs(y - 14.5) > 1.5 && !(a >= 20 && a <= 23 && y < 13),
    seed * 5,
  );
  m.spots.forEach((s, i) => {
    const p = i === 0 ? [24, 12] : sp0[i] || [6 + i * 5, 25];
    s.tx = p[0];
    s.ty = p[1];
    O[s.ty][s.tx] = "K";
    if (G[s.ty][s.tx] === "~") G[s.ty][s.tx] = "s";
  });
  const pos = [
    [13, 12],
    [31, 12],
    [12, 17],
    [32, 17],
    [26, 17],
    [17, 12],
  ];
  m.npcs = sp.npcs.map(([id, lines], i) => [id, pos[i][0], pos[i][1], lines]);
  m.PCS = [...picks(m, 7, (a, y) => Math.abs(a - 22) > 3 || y > 17, seed * 9).map(([a, y]) => [a, y]), [22, 12]];
  m.exits = [{ x0: 0, y0: 14, x1: 0, y1: 15, to: sp.prev, side: "e", d: "l" }];
  if (sp.next) m.exits.push({ x0: w - 1, y0: 14, x1: w - 1, y1: 15, to: sp.next, side: "w", d: "r" });
  m.mons = [];
  m.locks = [];
  m.nodes = [];
  return m;
}
const LMD = {
  oak(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      cx = X + w / 2;
    P(c, X + 4, Y + h - 6, w - 8, 6, "rgba(0,0,0,0.2)");
    for (let y = Y + 20; y < Y + h; y++) {
      const sp2 = y > Y + h - 12 ? Math.round((y - (Y + h - 12)) * 1.6) : 0;
      P(c, cx - 14 - sp2, y, 28 + 2 * sp2, 1, "#5e412c");
      P(c, cx - 12 - sp2, y, 5, 1, "#7a573b");
      P(c, cx + 9 + sp2, y, 5, 1, "#47301f");
    }
    disc(c, cx, Y + 56, 5, "#2e1e12");
    ["#24572a", "#2f6b2f", "#3d8238", "#4f9a42", "#6db456"].forEach((col, li) => {
      for (let i = 0; i < 5; i++)
        disc(oc, cx - 40 + i * 20 + (li % 2) * 6, Y + 18 - li * 3 + ((i * 7) % 9), 18 - li * 2, col);
    });
  },
  clock(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      cx = X + w / 2;
    P(c, X, Y + 14, w, h - 14, "#4a3f3c");
    P(c, X + 2, Y + 16, w - 4, h - 16, "#8a7a70");
    for (let y = Y + 20; y < Y + h; y += 6) {
      P(c, X + 2, y, w - 4, 1, "#76675e");
    }
    for (let i = 0; i < 16; i++) P(c, X - 2 + i, Y + 14 - i, w + 4 - 2 * i, 1, i % 3 ? "#4f7f7c" : "#3e6663");
    disc(c, cx, Y + 38, 13, "#c9a24a");
    disc(c, cx, Y + 38, 11, partDone(3) ? "#fff6d0" : "#f2e8c8");
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * Math.PI * 2;
      P(c, cx + Math.sin(an) * 9, Y + 38 - Math.cos(an) * 9, 1, 1, "#3a2f2a");
    }
    P(c, cx, Y + 30, 1, 9, "#2a2420");
    P(c, cx, Y + 38, 7, 1, "#2a2420");
    P(c, cx - 6, Y + h - 18, 12, 18, "#3a2f2a");
  },
  academy(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      OL = "#4f4a5c";
    P(c, X + 4, Y + 40, w - 8, h - 40, OL);
    P(c, X + 5, Y + 41, w - 10, h - 42, "#d9d3c8");
    for (let y = Y + 46; y < Y + h; y += 6) P(c, X + 5, y, w - 10, 1, "#bdb5a6");
    for (let a = X + 4; a < X + w - 4; a += 8) P(c, a, Y + 36, 5, 5, OL);
    [
      [X, 22],
      [X + w - 22, 22],
      [X + w / 2 - 14, 28],
    ].forEach(([tx, tw]) => {
      const ty = Y + 18;
      P(c, tx - 1, ty, tw + 2, h - 18, OL);
      P(c, tx, ty + 1, tw, h - 19, "#d9d3c8");
      const rh = Math.round(tw * 1.1);
      for (let i = 0; i < rh; i++) {
        const ww = Math.max(1, Math.round((tw + 4) * (1 - i / rh)));
        P(c, tx + tw / 2 - ww / 2, ty - i, ww, 1, i % 4 ? "#534AB7" : "#3C3489");
      }
      for (let y = ty + 10; y < Y + h - 8; y += 14) {
        P(c, tx + tw / 2 - 3, y, 6, 8, OL);
        P(c, tx + tw / 2 - 2, y + 1, 4, 7, "#8fbde6");
      }
    });
    P(c, X + w / 2 - 10, Y + h - 26, 20, 26, OL);
    P(c, X + w / 2 - 8, Y + h - 24, 16, 24, "#2e2a40");
    P(c, X + w / 2 - 2, Y + h - 34, 4, 4, "#f5c84a");
  },
  palace(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T;
    P(c, X, Y + 40, w, h - 40, "#3a2f55");
    P(c, X + 2, Y + 42, w - 4, h - 44, "#d9cfe8");
    for (let y = Y + 48; y < Y + h; y += 8)
      for (let a = X + 8; a < X + w - 8; a += 12) {
        P(c, a, y, 5, 6, "#3a2f55");
        P(c, a + 1, y + 1, 3, 4, "#ffcf6b");
      }
    disc(c, X + w / 2, Y + 36, 26, "#3a2f55");
    disc(c, X + w / 2, Y + 36, 24, "#e6dcf2");
    P(c, X + w / 2 - 1, Y + 4, 2, 10, "#3a2f55");
    disc(c, X + w / 2, Y + 6, 3, "#f5c84a");
    [[X + 8], [X + w - 30]].forEach(([tx]) => {
      P(c, tx, Y + 18, 22, h - 18, "#3a2f55");
      P(c, tx + 2, Y + 20, 18, h - 20, "#e6dcf2");
      for (let i = 0; i < 14; i++) {
        const ww = Math.max(1, Math.round(24 * (1 - i / 14)));
        P(c, tx + 11 - ww / 2, Y + 18 - i, ww, 1, "#7F77DD");
      }
    });
    P(c, X + w / 2 - 12, Y + h - 28, 24, 28, "#3a2f55");
    P(c, X + w / 2 - 10, Y + h - 26, 20, 26, "#c9a24a");
    P(c, X + w / 2 - 8, Y + h - 24, 16, 24, "#5a3a22");
  },
};
function wireEntries() {
  const entry = (to, side) => {
    const t = MAPS[to];
    if (t.kind === "town") return side === "w" ? [1, 14] : [t.w - 2, 14];
    if (t.kind === "dead") return [14, t.h - 2];
    const PY = PATHY[to];
    if (PY) {
      if (side === "w") return [1, PY.py(0)];
      if (side === "e") return [t.w - 2, PY.py(t.w - 1)];
      if (side === "s") return [PY.bx(0), 1];
    }
    return t.spawn || [2, 2];
  };
  for (const id in MAPS)
    MAPS[id].exits.forEach((e) => {
      if (e.side) e.at = entry(e.to, e.side);
    });
  MAPS.r3.exits[1].at = [1, 14];
  MAPS.r3.exits[1].to = "t2";
  MAPS.t2.exits[0].at = [42, 13];
  for (const sp of RSPEC.concat(TSPEC)) {
    const m = MAPS[sp.id];
    if (m.kind === "route" && sp.next && MAPS[sp.next].kind === "town") {
      const pi = PARTS.findIndex((p) => p.town === sp.next),
        pp = pi - 1;
      const e = m.exits[1];
      e.need = () => !!save.boss[sp.id] && partDone(pp);
      e.msg = () =>
        !partDone(pp)
          ? pp +
            1 +
            "부 " +
            MAPS[PARTS[pp].town].short +
            "의 지워진 곳을 모두 다시 써야 " +
            (pi + 1) +
            "부로 넘어갈 수 있어요"
          : jo(MON[sp.gate].n, "을", "를") + " 물리쳐야 지나갈 수 있어요";
    }
  }
  MAPS.r1.exits[0].at = [46, 19];
  MAPS.t1.exits[0].at = [1, PATHY.r1 ? PATHY.r1.py(0) : 10];
}
function ending() {
  busy = true;
  const nox = { n: "녹스" },
    momo = { n: "모모" },
    nar = { n: "이야기" };
  openDlg(
    nox,
    ["…제법이구나, 견습생.", "300년 전 나는 슬픔을 지우려 했다. 이번엔 끝낼 것이다.", "「큰 지우개」!"],
    () =>
      openDlg(momo, ["안 돼요, 견습생님!"], () => {
        const f = $("flash");
        f.hidden = false;
        f.style.opacity = "1";
        setTimeout(() => {
          f.style.opacity = "0";
        }, 1400);
        setTimeout(() => {
          f.hidden = true;
          openDlg(
            nar,
            [
              "눈을 뜨니 스승님도, 도라도, 아리엔도 「누구세요?」 해요.",
              save.pet
                ? jo(save.pet.name, "만이", "만이") + " 꼬리를 흔들며 달려와요."
                : "멀리서 작은 별짐승 하나가 꼬리를 흔들며 달려와요.",
              "1학기가 끝났어요. 여름방학이에요.",
              "왕궁 광장 동쪽 끝, 바다로 이어지는 길이 열렸어요. " + (save.pet ? jo(save.pet.name, "과", "와") + " 단둘이" : "혼자서") + " 루멘으로 돌아가 봐요.",
            ],
            () => {
              save.sem1 = 1;
              store();
              hud();
              toast("1학기 완료! 수고했어요");
            },
          );
        }, 2600);
      }),
  );
}

for (const id in BUILD) MAPS[id] = BUILD[id]();
RSPEC.forEach((s, i) => {
  MAPS[s.id] = s.isDead ? genDead(s, i + 3) : genRoute(s, i + 3);
});
TSPEC.forEach((s, i) => {
  MAPS[s.id] = genTown(s, i + 21);
});
wireEntries();
for (const id in MAPS) CNAME[id] = MAPS[id].short;
CNAME.home = "마이룸";
CNAME.t1 = "루멘 마을";
CNAME.r1 = "들판길";
CNAME.r2 = "숲길";
CNAME.d1 = "막다른 숲";
CNAME.r3 = "해안길";
{
  let no = 1;
  CHAIN.forEach((id) => {
    MAPS[id].spots.forEach((s) => (s.no = no++));
    const dd = DEADS[id];
    if (dd) MAPS[dd].spots.forEach((s) => (s.no = no++));
  });
  for (const id in MAPS)
    MAPS[id].spots.forEach((s) => {
      if (OLDBOOKS[s.id]) {
        s.p = OLDBOOKS[s.id].p;
        s.q = OLDBOOKS[s.id].q;
        s.t = OLDBOOKS[s.id].t;
      }
      if (s.t === "지문" || s.t === "숨은 지문") s.t = "지문 " + s.no;
    });
}
