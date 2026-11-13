const SK = "#f6d2b0",
  EY = "#2b2b2b",
  CH = "#f2a7a0";
/* 옆모습(face "s"): 오른쪽을 보는 모습. 왼쪽은 mapper 가 좌우를 뒤집는다 */
function personSide(r, b, f, p, mv) {
  const skin = p.skin || SK,
    h = p.hair,
    o = p.small ? 2 : 0,
    B = b + o,
    st = mv ? [0, 1, 0, -1][f % 4] : 0,
    blink = (f + p.n.length * 7) % 40 === 0;
  if (!p.noSh) r(4, 18, 8, 1, "rgba(0,0,0,0.22)");
  if (p.robe) {
    r(5, 13 + B, 6, Math.max(1, 4 - B), p.top);
    r(6 + st, 17, 2, 1, "#2C2C2A");
    r(8 - st, 17, 2, 1, "#2C2C2A");
  } else {
    r(7 - st, 14 + o, 2, Math.max(0, 3 - o), p.bot);
    r(7 - st, 17, 2, 1, "#1b1b1a");
    r(7 + st, 14 + o, 2, Math.max(0, 3 - o), p.bot);
    r(7 + st, 17, 2, 1, "#2C2C2A");
  }
  r(5, 8 + B, 6, 6, p.top);
  if (p.top2) r(9, 8 + B, 1, 6, p.top2);
  const ac = p.arm || p.top;
  r(7 + st, 9 + B, 2, 4, ac);
  r(7 + st, 13 + B, 2, 1, skin);
  if (p.ht === "long") r(5, 2 + B, 2, 8, h);
  r(6, 2 + B, 6, 6, skin);
  r(12, 5 + B, 1, 1, skin);
  r(10, 5 + B, 1, 1, blink ? "#b07a5a" : EY);
  if (p.beard) r(9, 6 + B, 3, 2, p.beard);
  else r(10, 6 + B, 1, 1, CH);
  const t = p.ht;
  if (t !== "none") {
    if (t === "bald") r(6, 3 + B, 1, 2, h);
    else {
      r(6, 1 + B, 6, 2, h);
      r(6, 3 + B, 2, 3, h);
      r(11, 3 + B, 1, 1, h);
    }
    if (t === "spiky") {
      r(5, 1 + B, 1, 3, h);
      r(7, 0 + B, 1, 1, h);
      r(10, 0 + B, 1, 1, h);
    }
    if (t === "bun") {
      r(5, 0 + B, 2, 2, h);
      r(5, 2 + B, 1, 3, h);
    }
    if (t === "pony") {
      r(4, 3 + B, 2, 1, h);
      r(4, 4 + B, 1, 4, h);
    }
  }
  if (p.ex) p.ex(r, B, f, false);
}
function person(r, b, f, p, mv, face) {
  if (face === "s") return personSide(r, b, f, p, mv);
  const skin = p.skin || SK,
    h = p.hair,
    o = p.small ? 2 : 0,
    B = b + o,
    blink = (f + p.n.length * 7) % 40 === 0,
    lL = mv && f % 4 === 1 ? 1 : 0,
    lR = mv && f % 4 === 3 ? 1 : 0,
    back = face === "u";
  if (!p.noSh) r(4, 18, 8, 1, "rgba(0,0,0,0.22)");
  if (p.robe) {
    r(4, 13 + B, 8, Math.max(1, 4 - B), p.top);
    r(5, 17, 2, 1, "#2C2C2A");
    r(9, 17, 2, 1, "#2C2C2A");
  } else {
    r(5, 14 + o, 2, Math.max(0, 3 - o - lL), p.bot);
    r(9, 14 + o, 2, Math.max(0, 3 - o - lR), p.bot);
    r(5, 17 - lL, 2, 1, "#2C2C2A");
    r(9, 17 - lR, 2, 1, "#2C2C2A");
  }
  r(4, 8 + B, 8, 6, p.top);
  if (p.top2 && !back) r(7, 8 + B, 2, 6, p.top2);
  const ac = p.arm || p.top,
    sw = mv ? (f % 4 < 2 ? 1 : -1) : 0;
  r(3, 9 + B + sw, 1, 4, ac);
  r(12, 9 + B - sw, 1, 4, ac);
  r(3, 13 + B + sw, 1, 1, skin);
  r(12, 13 + B - sw, 1, 1, skin);
  if (p.ht === "long") {
    r(4, 2 + B, 1, 8, h);
    r(11, 2 + B, 1, 8, h);
  }
  r(5, 2 + B, 6, 6, skin);
  if (back) {
    r(5, 2 + B, 6, 5, p.backc || h || "#5a3a22");
  } else {
    if (blink) {
      r(6, 5 + B, 1, 1, "#b07a5a");
      r(9, 5 + B, 1, 1, "#b07a5a");
    } else {
      r(6, 5 + B, 1, 1, EY);
      r(9, 5 + B, 1, 1, EY);
    }
    if (p.beard) {
      r(5, 6 + B, 6, 2, p.beard);
      r(6, 8 + B, 4, 1, p.beard);
    } else {
      r(5, 6 + B, 1, 1, CH);
      r(10, 6 + B, 1, 1, CH);
    }
  }
  const t = p.ht;
  if (t !== "none") {
    if (t === "bald") {
      r(4, 3 + B, 1, 2, h);
      r(11, 3 + B, 1, 2, h);
    } else {
      r(5, 1 + B, 6, 2, h);
      r(5, 3 + B, 1, 1, h);
      r(10, 3 + B, 1, 1, h);
    }
    if (t === "spiky") {
      r(4, 1 + B, 1, 2, h);
      r(11, 1 + B, 1, 2, h);
      r(6, 0 + B, 1, 1, h);
      r(9, 0 + B, 1, 1, h);
    }
    if (t === "bun") {
      r(7, -1 + B, 2, 2, h);
      r(4, 2 + B, 1, 3, h);
      r(11, 2 + B, 1, 3, h);
    }
    if (t === "pony") {
      r(11, 2 + B, 2, 1, h);
      r(12, 3 + B, 1, 5, h);
    }
  }
  if (p.ex) p.ex(r, B, f, back);
}
function owl(r, b, f) {
  const fl = f % 8 < 4 ? 0 : 1;
  r(4, 18, 8, 1, "rgba(0,0,0,0.18)");
  r(4, 2 + b, 2, 2, "#633806");
  r(10, 2 + b, 2, 2, "#633806");
  r(5, 3 + b, 6, 1, "#854F0B");
  r(4, 4 + b, 8, 11, "#854F0B");
  r(5, 15 + b, 6, 1, "#854F0B");
  r(3, 8 + b - fl, 1, 5, "#633806");
  r(12, 8 + b - fl, 1, 5, "#633806");
  r(6, 10 + b, 4, 5, "#FAEEDA");
  r(5, 5 + b, 3, 3, "#2C2C2A");
  r(8, 5 + b, 3, 3, "#2C2C2A");
  r(6, 6 + b, 1, 1, "#ffffff");
  r(9, 6 + b, 1, 1, "#ffffff");
  r(7, 8 + b, 2, 1, "#EF9F27");
  r(6, 12 + b, 4, 3, "#534AB7");
}

const JOB = {
  knight: { n: "기사", m: "브란", d: "튼튼하게 버텨요" },
  warrior: { n: "전사", m: "고르드", d: "연속 정답에 강해져요" },
  mage: { n: "마법사", m: "이세트", d: "한 번 더 생각해요" },
  archer: { n: "궁수", m: "필라", d: "틀린 보기를 지워요" },
};
const STUDY = { knight: 1, warrior: 1, mage: 3, archer: 4 };
const STUDYD = {
  knight: "틀려도 절반 확률로 피해를 막아요",
  warrior: "연속으로 맞히면 공격력 +1",
  mage: "싸움마다 첫 오답은 피해 없이 다시 생각해요",
  archer: "전투에서 틀린 보기 하나를 지워 줘요",
};
const SKL = {
  knight: [
    ["방패 막기", "적 공격 1번 막기"],
    ["굳센 마음", ""],
    ["도발 외침", "적이 나만 공격"],
    ["방패 돌진", "적을 밀어 넘어뜨림"],
    ["맹세의 검", "체력이 적을수록 강해짐"],
    ["수호의 빛", "펫·동료 모두 보호"],
    ["다시 드는 방패", "쓰러져도 한 번 일어남"],
    ["정의의 일격", "안개 괴물에 2배"],
    ["성스러운 기록", "지워진 땅 안전하게 걷기"],
    ["함께 지키는 방패", "카이와 협동기"],
    ["빛의 성벽", "모두 3턴 보호"],
    ["별빛 성기사", "궁극기"],
  ],
  warrior: [
    ["힘껏 베기", "큰 한 방"],
    ["함성", ""],
    ["회오리 도끼", "적 여럿 한 번에"],
    ["대지 가르기", "땅을 갈라 큰 피해"],
    ["버티기", "1번은 쓰러지지 않음"],
    ["분노의 연타", "맞힐 때마다 한 번 더"],
    ["다시 일어서기", "체력 크게 회복"],
    ["수확의 큰 휘두르기", "주변 적 모두"],
    ["산 부수기", "막힌 바위 길 열기"],
    ["쌍도끼 폭풍", "카이와 협동기"],
    ["불굴", "체력 1로 버티며 반격"],
    ["별빛 파괴자", "궁극기"],
  ],
  mage: [
    ["별빛 화살", "빛 한 줄기 쏘기"],
    ["빛의 등불", "어두운 곳 밝히기"],
    ["덩굴 묶기", "적 1턴 멈춤"],
    ["시간 늦추기", ""],
    ["마법 방패", "피해 흡수 막"],
    ["별똥별", "하늘에서 별 떨어뜨리기"],
    ["기억의 주문", "지워진 물건·길 되살리기"],
    ["풍요의 비", "모두 회복"],
    ["꿈길 걷기", "꿈속 세계에서 날기"],
    ["노래 마법", "카이와 협동기"],
    ["별자리 결계", "적 기술 봉인"],
    ["다시 쓰는 별", "궁극기"],
  ],
  archer: [
    ["빠른 찌르기", "단검으로 두 번 찌르기"],
    ["그림자 걸음", "적 공격 피하기"],
    ["첫 활: 조준 사격", "먼 거리 한 방"],
    ["연속 쏘기", "화살 세 발"],
    ["매의 눈", ""],
    ["화살비", "하늘에서 화살 쏟기"],
    ["발자국 읽기", "지워진 길 찾기"],
    ["바람 화살", "바람 타고 꿰뚫기"],
    ["꿈의 화살", "안 보이는 적 맞히기"],
    ["쌍둥이 화살", "카이와 협동기"],
    ["별빛 화살비", "모든 적에 큰 피해"],
    ["유성 사격", "궁극기"],
  ],
};
const PSK = [
  [0, "꼬리 응원", "정답일 때 가끔 한 번 더 공격해요"],
  [2, "냄새로 길 찾기", "다음 할 일 쪽을 반짝 알려 줘요"],
  [4, "몸으로 막기", "싸움마다 첫 피해를 한 번 막아요"],
  [7, "보물 파기", "몬스터를 이기면 금화 +2"],
  [10, "별짐승 각성", "정체가 밝혀지며 공격 기술을 써요"],
  [11, "새 모습", "펫이 진화해요"],
];
const PETS = { dog: "강아지", cat: "고양이", fox: "여우", rabbit: "토끼", chick: "병아리" };
/* 펫 성장: 1 아기 · 2 4부를 되살리면 목걸이 · 3 11부(정체 공개) 별 표식과 반짝임 · 4 12부 별날개 */
function petStage() {
  if (partDone(11)) return 4;
  if (partDone(10)) return 3;
  if (partDone(3)) return 2;
  return 1;
}
const WN = {
  none: ["나무 막대", "강철 무기", "별빛 무기"],
  knight: ["견습 검", "강철 검", "별빛 검"],
  warrior: ["견습 도끼", "강철 도끼", "별빛 도끼"],
  mage: ["견습 지팡이", "수정 지팡이", "별빛 지팡이"],
  archer: ["견습 단검", "튼튼한 활", "별빛 활"],
};
const WC = ["#c9ced6", "#9fc4ea", "#ffd86b"];
const EQ = {
  w1: { s: "w", atk: 1, price: 0 },
  w2: { s: "w", atk: 2, price: 80 },
  w3: { s: "w", atk: 3, price: 220 },
  a1: { s: "a", n: "견습생 옷", hp: 0, price: 0 },
  a2: { s: "a", n: "튼튼한 망토", hp: 1, price: 60 },
  a3: { s: "a", n: "수호자의 갑옷", hp: 2, price: 180 },
  c_badge: { s: "c", n: "토토의 종이 배지", hp: 1, d: "체력 +1" },
  c_flute: { s: "c", n: "소라의 조개 피리", exp: 0.2, d: "경험치 +20%" },
  c_pouch: { s: "c", n: "이끼골 약초 주머니", heal: 1, d: "싸움에서 이기면 하트 1 회복" },
  c_watch: { s: "c", n: "멈춘 회중시계", gold: 0.2, d: "금화 +20%" },
  c_tang: { s: "c", n: "모르의 귤", hp: 1, d: "체력 +1" },
};
const I2E = {
  "토토의 종이 배지": "c_badge",
  "소라의 조개 피리": "c_flute",
  "이끼골 약초 주머니": "c_pouch",
  "멈춘 회중시계": "c_watch",
  "모르의 귤": "c_tang",
};
const tier = () => ({ w1: 0, w2: 1, w3: 2 })[save.eq.w] || 0;
const JL = {
  none: { hair: "#5a3a22", ht: "short", top: "#c9b48a", top2: "#8a6a45", bot: "#5F5E5A" },
  knight: {
    ht: "none",
    top: "#378ADD",
    top2: "#FAC775",
    arm: "#9aa3b0",
    bot: "#5F5E5A",
    ex: (r, b) => {
      r(4, 1 + b, 8, 3, "#b8c0cc");
      r(4, 4 + b, 1, 3, "#b8c0cc");
      r(11, 4 + b, 1, 3, "#b8c0cc");
      r(4, 3 + b, 8, 1, "#888780");
      r(7, -1 + b, 2, 2, "#E24B4A");
      r(0, 9 + b, 3, 5, "#185FA5");
      r(1, 10 + b, 1, 3, "#FAC775");
      r(13, 4 + b, 1, 8, WC[tier()]);
      r(12, 12 + b, 3, 1, "#854F0B");
    },
  },
  warrior: {
    hair: "#993C1D",
    ht: "short",
    top: "#8a5a35",
    arm: SK,
    bot: "#633806",
    boot: "#412402",
    ex: (r, b) => {
      r(5, 3 + b, 6, 1, "#E24B4A");
      r(11, 3 + b, 2, 1, "#E24B4A");
      r(13, 3 + b, 1, 11, "#633806");
      r(14, 3 + b, 2, 4, WC[tier()]);
      r(16, 4 + b, 1, 2, WC[tier()]);
    },
  },
  mage: {
    hair: "#5a3a22",
    ht: "short",
    top: "#7F77DD",
    top2: "#FAC775",
    robe: 1,
    ex: (r, b) => {
      r(3, 2 + b, 10, 1, "#3C3489");
      r(4, 0 + b, 8, 2, "#534AB7");
      r(6, -1 + b, 4, 1, "#534AB7");
      r(8, -2 + b, 2, 1, "#534AB7");
      r(4, 1 + b, 8, 1, "#FAC775");
      r(14, 3 + b, 1, 12, "#854F0B");
      r(13, 1 + b, 3, 2, tier() ? WC[tier()] : "#FAC775");
    },
  },
  archer: {
    hair: "#5a3a22",
    ht: "short",
    top: "#639922",
    bot: "#854F0B",
    boot: "#633806",
    ex: (r, b) => {
      r(4, 1 + b, 8, 2, "#3B6D11");
      r(4, 3 + b, 1, 4, "#3B6D11");
      r(11, 3 + b, 1, 4, "#3B6D11");
      r(5, 0 + b, 6, 1, "#3B6D11");
      r(2, 8 + b, 2, 5, "#854F0B");
      if (!tier()) {
        r(13, 9 + b, 1, 4, "#c9ced6");
        r(13, 13 + b, 1, 1, "#633806");
      } else {
        const c = tier() === 2 ? "#c9a24a" : "#854F0B";
        r(14, 6 + b, 1, 1, c);
        r(15, 7 + b, 1, 5, c);
        r(14, 12 + b, 1, 1, c);
        r(14, 7 + b, 1, 5, "#ece8dc");
      }
    },
  },
};

function petDraw(r, sp, f, mv) {
  const C = {
      dog: ["#d9a066", "#a8743f", "#f3dcc0"],
      cat: ["#9aa3b0", "#6e7684", "#e6e9ee"],
      fox: ["#e07a3a", "#a8521f", "#ffffff"],
      rabbit: ["#efe9e4", "#c9bfb8", "#ffd1dc"],
      chick: ["#ffd84a", "#e0a92a", "#fff3b0"],
    }[sp],
    l = mv && f % 2 ? 1 : 0,
    w = f % 4 < 2 ? 0 : 1;
  r(4, 18, 9, 1, "rgba(0,0,0,0.2)");
  r(5, 16 + l, 1, 2 - l, C[1]);
  r(10, 17 - l, 1, 1 + l, C[1]);
  r(4, 12, 8, 5, C[0]);
  r(5, 16, 6, 1, C[2]);
  if (sp === "dog") {
    r(1, 10 + w, 3, 1, C[0]);
    r(3, 11, 1, 1, C[0]);
  }
  if (sp === "cat") {
    r(3, 7 + w, 1, 5, C[0]);
    r(6, 13, 1, 1, C[1]);
    r(8, 12, 1, 1, C[1]);
  }
  if (sp === "fox") {
    r(0, 11 + w, 4, 3, C[0]);
    r(0, 12 + w, 2, 2, C[2]);
  }
  r(9, 8, 5, 5, C[0]);
  r(13, 10, 2, 2, C[2]);
  r(14, 10, 1, 1, "#2b2b2b");
  r(11, 10, 1, 1, EY);
  r(11, 8, 1, 1, "#ffd86b");
  if (sp === "dog") r(9, 7, 2, 4, C[1]);
  else if (sp === "rabbit") {
    r(10, 2, 1, 6, C[0]);
    r(12, 3, 1, 5, C[0]);
    r(10, 3, 1, 3, C[2]);
    r(3, 12, 2, 2, "#ffffff");
  } else if (sp === "chick") {
    r(14, 10, 2, 1, "#f08a2a");
    r(13, 11, 2, 1, "#f08a2a");
    r(10, 7, 1, 1, C[1]);
    r(5, 12, 3, 2, C[1]);
  } else {
    r(9, 6, 1, 2, sp === "fox" ? C[1] : C[0]);
    r(12, 6, 1, 2, sp === "fox" ? C[1] : C[0]);
  }
  // 성장 단계 표시 (petStage)
  const st = typeof petStage === "function" ? petStage() : 1;
  if (st >= 2) {
    r(9, 12, 4, 1, "#E24B4A");
    r(10, 13, 1, 1, "#ffd86b");
  }
  if (st >= 3) {
    r(10, 7, 3, 1, "#ffd86b");
    r(11, 6, 1, 3, "#ffd86b");
    if (f % 8 < 4) {
      r(2, 6, 1, 1, "#fff6d0");
      r(15, 5, 1, 1, "#fff6d0");
    } else {
      r(1, 9, 1, 1, "#fff6d0");
      r(15, 8, 1, 1, "#fff6d0");
    }
  }
  if (st >= 4) {
    r(5, 9, 3, 2, "#fff6d0");
    r(4, 8, 2, 1, "#fff6d0");
    r(6, 10, 2, 1, "#ffd86b");
  }
}

const EFF = {
  hit2: { c: 2, d: "바로 피해 2" },
  hit3: { c: 3, d: "바로 피해 3" },
  ult: { c: 3, d: "바로 피해 5" },
  guard: { c: 2, d: "다음 공격 1번 막기" },
  heal: { c: 2, d: "하트 2 회복" },
  double: { c: 2, d: "다음 정답 피해 2배" },
};
const SKE = {
  knight: ["guard", "p", "guard", "hit2", "double", "guard", "heal", "hit3", "heal", "guard", "guard", "ult"],
  warrior: ["hit2", "p", "hit2", "hit3", "guard", "double", "heal", "hit3", "hit3", "hit3", "guard", "ult"],
  mage: ["hit2", "guard", "guard", "p", "guard", "hit3", "heal", "heal", "guard", "double", "guard", "ult"],
  archer: ["hit2", "guard", "hit2", "hit3", "p", "hit3", "double", "hit3", "hit3", "double", "hit3", "ult"],
};

JL.knight.backc = "#b8c0cc";
JL.none.backc = "#5a3a22";
EQ.c_badge.d = "체력 +1";
const D = {
  momo: { n: "모모", owl: 1 },
  dora: { n: "도라", hair: "#854F0B", ht: "pony", top: "#F0997B", top2: "#712B13", bot: "#444441" },
  toto: { n: "토토", hair: "#5a3a22", ht: "short", top: "#E24B4A", bot: "#3a5a7a", small: 1 },
  kai: { n: "카이", hair: "#1f2a44", ht: "spiky", top: "#0C447C", bot: "#2C2C2A" },
  marta: { n: "마르타 할머니", hair: "#F1EFE8", ht: "bun", top: "#D4537E", robe: 1 },
  oscar: {
    n: "오스카",
    hair: "#F1EFE8",
    ht: "short",
    beard: "#F1EFE8",
    top: "#0C447C",
    top2: "#FAC775",
    bot: "#2C2C2A",
    ex: (r, b) => {
      r(4, 0 + b, 8, 2, "#042C53");
      r(4, 2 + b, 9, 1, "#0C447C");
    },
  },
  sora: { n: "소라", hair: "#2a2a3a", ht: "long", top: "#5DCAA5", bot: "#3a5a7a", small: 1 },
  marinda: {
    n: "마린다 선장",
    hair: "#993C1D",
    ht: "pony",
    top: "#1f2a44",
    top2: "#d6453d",
    bot: "#2C2C2A",
    ex: (r, b) => {
      r(3, 0 + b, 10, 2, "#2C2C2A");
      r(7, 0 + b, 2, 1, "#FAC775");
    },
  },
  deok: {
    n: "덕배 아저씨",
    hair: "#2C2C2A",
    ht: "bald",
    beard: "#444441",
    top: "#3a7ac0",
    top2: "#ffffff",
    bot: "#2C2C2A",
  },
  bran: {
    n: "브란 스승",
    hair: "#B4B2A9",
    ht: "short",
    beard: "#B4B2A9",
    top: "#9aa3b0",
    top2: "#378ADD",
    bot: "#5F5E5A",
    still: 1,
    mj: "knight",
    ex: (r, b, f, bk) => {
      if (!bk) {
        r(0, 9 + b, 3, 5, "#185FA5");
        r(1, 10 + b, 1, 3, "#FAC775");
      }
    },
  },
  gord: {
    n: "고르드 스승",
    hair: "#993C1D",
    ht: "bald",
    beard: "#993C1D",
    top: "#8a5a35",
    arm: "#f6d2b0",
    bot: "#633806",
    still: 1,
    mj: "warrior",
    ex: (r, b) => {
      r(14, 3 + b, 1, 11, "#633806");
      r(15, 3 + b, 2, 4, "#c9ced6");
    },
  },
  iset: {
    n: "이세트 스승",
    hair: "#F1EFE8",
    ht: "long",
    top: "#1D9E75",
    top2: "#FAC775",
    robe: 1,
    still: 1,
    mj: "mage",
    ex: (r, b) => {
      r(3, 1 + b, 10, 1, "#085041");
      r(5, -1 + b, 6, 2, "#0F6E56");
      r(7, -2 + b, 3, 1, "#0F6E56");
      r(14, 3 + b, 1, 12, "#854F0B");
      r(13, 1 + b, 3, 2, "#5DCAA5");
    },
  },
  pila: {
    n: "필라 스승",
    hair: "#712B13",
    ht: "pony",
    top: "#639922",
    top2: "#3B6D11",
    bot: "#854F0B",
    still: 1,
    mj: "archer",
    ex: (r, b) => {
      r(14, 5 + b, 1, 1, "#854F0B");
      r(15, 6 + b, 1, 6, "#854F0B");
      r(14, 12 + b, 1, 1, "#854F0B");
      r(14, 6 + b, 1, 6, "#ece8dc");
    },
  },
};
function slimeD(r, b, c1, c2, e) {
  r(2, 18, 12, 1, "rgba(0,0,0,0.18)");
  r(3, 9 + b, 10, 9 - b, c1);
  r(5, 7 + b, 6, 2, c1);
  r(2, 13, 12, 5, c1);
  r(1, 16, 14, 2, c2);
  r(4, 9 + b, 3, 1, "#f6f4ee");
  r(5, 11 + b, 2, 2, e);
  r(9, 11 + b, 2, 2, e);
  r(7, 15, 2, 1, c2);
}
function jellyD(r, b, f) {
  r(5, 18, 6, 1, "rgba(0,0,0,0.15)");
  const y = b - 4;
  r(3, 4 + y, 10, 6, "#c9a7e8");
  r(4, 3 + y, 8, 1, "#c9a7e8");
  r(2, 7 + y, 12, 3, "#c9a7e8");
  r(5, 5 + y, 2, 2, "#efe0fb");
  r(6, 7 + y, 1, 1, "#3C3489");
  r(9, 7 + y, 1, 1, "#3C3489");
  [3, 6, 9, 12].forEach((a, i) => r(a, 10 + y, 1, 3 + ((f + i) % 3), "#AFA9EC"));
}
function mushD(r, b, f, mv) {
  r(3, 18, 10, 1, "rgba(0,0,0,0.2)");
  const l = mv && f % 2 ? 1 : 0;
  r(5, 16 - l, 2, 2, "#c9b48a");
  r(9, 15 + l, 2, 2, "#c9b48a");
  r(5, 10 + b, 6, 6, "#efe2c8");
  r(6, 11 + b, 1, 2, "#2b2b2b");
  r(9, 11 + b, 1, 2, "#2b2b2b");
  r(5, 10 + b, 2, 1, "#2b2b2b");
  r(9, 10 + b, 2, 1, "#2b2b2b");
  r(2, 5 + b, 12, 4, "#b33a2e");
  r(4, 3 + b, 8, 2, "#b33a2e");
  r(3, 9 + b, 10, 1, "#7a2620");
  r(4, 5 + b, 2, 2, "#f5efe2");
  r(9, 4 + b, 2, 2, "#f5efe2");
}
function gateD(r, b, f) {
  r(2, 18, 13, 1, "rgba(0,0,0,0.25)");
  r(4, 0 + b, 8, 8, "#4a4a5a");
  r(5, 3 + b, 6, 4, "#1e1e2a");
  const gl = f % 10 < 7 ? "#7fd6ff" : "#cfeeff";
  r(6, 4 + b, 1, 1, gl);
  r(9, 4 + b, 1, 1, gl);
  r(3, 8 + b, 10, 10 - b, "#5F5E5A");
  r(3, 8 + b, 1, 10 - b, "#444441");
  r(5, 9 + b, 6, 3, "#9aa3b0");
  r(3, 12 + b, 10, 1, "#2c2c2a");
  r(13, 3 + b, 1, 12, "#cfe0f0");
  r(12, 12 + b, 3, 1, "#c9a24a");
  r(1, 15, 2, 1, "#e6e6ee");
  r(14, 16, 2, 1, "#e6e6ee");
}
const MON = {
  slime: {
    n: "안개 슬라임",
    hp: 2,
    dmg: 1,
    dif: 1,
    exp: 5,
    dust: 1,
    gold: 3,
    spd: 0.45,
    dr: (r, b, f) => slimeD(r, b, "#d9d6cc", "#c9c5b8", "#444441"),
  },
  mush: { n: "버섯도깨비", hp: 3, dmg: 1, dif: 2, exp: 8, dust: 1, gold: 5, spd: 0.5, dr: mushD },
  jelly: { n: "안개 해파리", hp: 3, dmg: 1, dif: 3, exp: 10, dust: 2, gold: 6, spd: 0.42, dr: jellyD },
  shade: {
    n: "그림자 슬라임",
    hp: 4,
    dmg: 2,
    dif: 4,
    exp: 16,
    dust: 3,
    gold: 10,
    spd: 0.62,
    dr: (r, b, f) => slimeD(r, b, "#6a5a8c", "#4f4270", "#ff8fd0"),
  },
  gate: { n: "안개 문지기", hp: 6, dmg: 1, dif: 3, exp: 30, dust: 6, gold: 30, spd: 0, boss: 1, dr: gateD },
};

MON.slime.dust = 1;
function makeQ(d) {
  // 문제 은행(quiz-bank.js)이 있으면 단원 문제를 쓴다 → src/06b-study.js
  const sq = typeof studyQ === "function" ? studyQ(d) : null;
  if (sq) return sq;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let q, a;
  if (d <= 1) {
    const m = R(11, 59),
      n = R(11, 39);
    q = m + " + " + n;
    a = m + n;
  } else if (d === 2) {
    if (Math.random() < 0.5) {
      const m = R(25, 89),
        n = R(12, 69);
      q = m + " + " + n;
      a = m + n;
    } else {
      const m = R(40, 99),
        n = R(11, m - 5);
      q = m + " − " + n;
      a = m - n;
    }
  } else if (d === 3) {
    if (Math.random() < 0.5) {
      const m = R(12, 49),
        n = R(3, 9);
      q = m + " × " + n;
      a = m * n;
    } else {
      const n = R(3, 9),
        k = R(6, 15);
      q = n * k + " ÷ " + n;
      a = k;
    }
  } else if (d === 4) {
    const t = R(0, 2);
    if (t === 0) {
      const m = R(120, 499),
        n = R(110, 399);
      q = m + " + " + n;
      a = m + n;
    } else if (t === 1) {
      const m = R(300, 899),
        n = R(110, m - 50);
      q = m + " − " + n;
      a = m - n;
    } else {
      const m = R(21, 79),
        n = R(4, 9);
      q = m + " × " + n;
      a = m * n;
    }
  } else {
    if (Math.random() < 0.5) {
      const m = R(12, 39),
        n = R(11, 19);
      q = m + " × " + n;
      a = m * n;
    } else {
      const n = R(3, 9),
        k = R(21, 99);
      q = n * k + " ÷ " + n;
      a = k;
    }
  }
  const ch = new Set([a]);
  while (ch.size < 3) {
    const dd = R(1, Math.max(3, Math.round(a * 0.12))) * (Math.random() < 0.5 ? -1 : 1);
    if (a + dd > 0) ch.add(a + dd);
  }
  return { q: q + " = ?", a, ch: [...ch].sort(() => Math.random() - 0.5) };
}

function nodeDraw(r, t, ok, f) {
  if (!ok) {
    r(7, 16, 2, 2, "#5a8f2e");
    return;
  }
  const gl = f % 16 < 2;
  if (t === "flower") {
    r(7, 11, 1, 7, "#3B6D11");
    r(5, 14, 2, 1, "#5a9e3a");
    r(9, 15, 2, 1, "#5a9e3a");
    r(6, 8, 3, 3, "#AFA9EC");
    r(5, 9, 5, 1, "#AFA9EC");
    r(7, 9, 1, 1, "#ffd86b");
  }
  if (t === "shell") {
    r(5, 14, 6, 4, "#f4c0d1");
    r(6, 13, 4, 1, "#f4c0d1");
    r(7, 14, 1, 4, "#d4537e");
    r(9, 14, 1, 4, "#d4537e");
  }
  if (t === "herb") {
    r(6, 12, 4, 6, "#4f9a42");
    r(4, 14, 3, 3, "#5a9e3a");
    r(9, 13, 3, 3, "#3d8238");
    r(7, 11, 2, 2, "#f5efe2");
  }
  if (gl) r(10, 8, 1, 1, "#ffffff");
}
