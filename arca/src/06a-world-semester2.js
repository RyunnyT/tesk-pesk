/* 2학기(7~12부) 세계
   1학기 생성기(genRoute·genDead·genTown)를 그대로 쓰고, 부 목록(PARTS·PARTTOWN·CHAIN·DEADS)에 이어 붙인다.
   6부 왕궁 광장 동쪽 끝이 「여름 바닷길」로 열린다(6부 결말 뒤). 이야기 대사는 src/06c-story.js 에 있다. */

if (!ITEM.cog) ITEM.cog = "녹슨 톱니";
if (!ITEM.spark) ITEM.spark = "불꽃 가루";

/* ── 2학기 지형 색 ── */
Object.assign(TH, {
  gold: { g: "#c9b85e", g1: "#b8a74e", g2: "#d9c870", edge: "#a8963f", tr: ["#5a6a2a", "#6a7a32", "#7f8f3a", "#9aa84a"] },
  dream: { g: "#9a9ad6", g1: "#8a8ac8", g2: "#aeaee4", edge: "#7a7ab8", tr: ["#3C3489", "#534AB7", "#7F77DD", "#9a93c9"] },
  white: { g: "#e6e4ee", g1: "#d9d6e4", g2: "#f2f0f8", edge: "#c6c2d6", tr: ["#8f8aa0", "#a19cb2", "#b3aec4", "#c5c0d4"] },
  snow: { g: "#dde8f2", g1: "#ccdae8", g2: "#edf3fa", edge: "#b6c8d8", tr: ["#2f4a5a", "#3a5a6a", "#4a6a7a", "#6a8a9a"] },
});

/* ── 2학기 보스 ── */
Object.assign(MON, {
  noxshade: {
    n: "잊힌 녹스의 그림자",
    hp: 13,
    dmg: 2,
    dif: 5,
    exp: 110,
    dust: 0,
    gold: 90,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => {
      aura(r, f, "#9a93c9");
      person(r, b, f, P_NOX, false, "d");
    },
  },
  warden: { n: "망각의 탑 수호자", hp: 15, dmg: 2, dif: 5, exp: 130, dust: 0, gold: 110, spd: 0, boss: 1, dr: golemD },
  noxf: {
    n: "회색 서기관 녹스",
    hp: 18,
    dmg: 2,
    dif: 5,
    exp: 200,
    dust: 0,
    gold: 150,
    spd: 0,
    boss: 1,
    dr: (r, b, f) => {
      aura(r, f, "#ffd86b");
      aura(r, f + 3, "#7F77DD");
      person(r, b, f, P_NOX, false, "d");
    },
  },
});

/* ── 2학기 인물 모양 ── */
Object.assign(D, {
  harold: { n: "해롤드 촌장", hair: "#c9b48a", ht: "short", top: "#BA7517", top2: "#633806", bot: "#5F5E5A" },
  kong: { n: "콩순네", hair: "#2a2a3a", ht: "bun", top: "#97C459", robe: 1 },
  pat: { n: "팥돌네", hair: "#5a3a22", ht: "short", top: "#a83a35", top2: "#7e2a25", bot: "#444441" },
  zip: { n: "짚돌이", hair: "#e8c56a", ht: "spiky", top: "#d9a63a", top2: "#a8742a", bot: "#a8742a", skin: "#f0d9a0" },
  momone: { n: "모모네", hair: "#8a6440", ht: "long", top: "#534AB7", top2: "#f5c84a", robe: 1 },
  noxy: { ...P_NOX, n: "젊은 녹스" },
  luke: { n: "루크", hair: "#c9c5d8", ht: "short", top: "#8fbde6", bot: "#3a5a7a", small: 1 },
  serena: { n: "세레나", hair: "#1f2a44", ht: "long", top: "#f5efe2", robe: 1 },
  icowl: { n: "얼음 부엉이", owl: 1 },
  lis2: { ...D.lis, n: "리스" },
});

/* ── 랜드마크 그림 ── */
Object.assign(LMD, {
  mill(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      cx = X + w / 2;
    P(c, X + 6, Y + h - 6, w - 12, 6, "rgba(0,0,0,0.2)");
    for (let y = Y + 30; y < Y + h; y++) {
      const ww = Math.round(18 + ((y - Y - 30) / (h - 30)) * 14);
      P(c, cx - ww, y, ww * 2, 1, (y >> 2) % 2 ? "#e8d4b0" : "#dcc6a0");
    }
    for (let i = 0; i < 12; i++) P(c, cx - 22 + i * 2, Y + 30 - i, 44 - i * 4, 1, "#a8342e");
    P(c, cx - 7, Y + h - 22, 14, 22, "#5e3f29");
    P(c, cx - 4, Y + 44, 8, 8, "#8fbde6");
    const sw = (b.lit ? 1 : 0) * 0;
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sy]) => {
      for (let k = 0; k < 26; k++) P(oc, cx + sx * k - 2, Y + 26 + sy * k - 2 + sw, 4, 4, k % 6 < 3 ? "#f3e7c8" : "#7a573b");
    });
    disc(oc, cx, Y + 26, 4, "#5e3f29");
  },
  spire(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      cx = X + w / 2;
    P(c, X + 4, Y + h - 6, w - 8, 6, "rgba(0,0,0,0.25)");
    for (let y = Y; y < Y + h; y++) {
      const ww = Math.round(4 + ((y - Y) / h) * (w / 2 - 6));
      P(c, cx - ww, y, ww * 2, 1, (y >> 3) % 2 ? "#5a5468" : "#4a4458");
      P(c, cx - ww, y, 2, 1, "#2e2a3a");
    }
    for (let y = Y + 20; y < Y + h - 20; y += 18) {
      P(c, cx - 3, y, 6, 8, "#2e2a3a");
      P(c, cx - 2, y + 1, 4, 7, "#b8b0e0");
    }
    P(c, cx - 8, Y + h - 24, 16, 24, "#2e2a3a");
    disc(oc, cx, Y + 2, 5, "#d9d3e6");
  },
  compass(c, oc, b) {
    const X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      cx = X + w / 2;
    P(c, X + 10, Y + h - 20, w - 20, 20, "#8a7a70");
    P(c, X + 12, Y + h - 18, w - 24, 16, "#b8aa9c");
    P(c, cx - 4, Y + 46, 8, h - 66, "#8a7a70");
    disc(c, cx, Y + 36, 30, "#c9a24a");
    disc(c, cx, Y + 36, 26, "#1f2a44");
    disc(c, cx, Y + 36, 24, "#2e3a66");
    for (let k = 0; k < 10; k++) {
      const an = (k / 10) * Math.PI * 2;
      disc(c, cx + Math.sin(an) * 18, Y + 36 - Math.cos(an) * 18, 2, partDone(11) || k < 9 ? "#ffd86b" : "#6a6a7a");
    }
    for (let i = 0; i < 16; i++) {
      P(c, cx - Math.max(0, 3 - i / 5), Y + 20 + i, Math.max(1, 6 - (2 * i) / 5), 1, "#ff8fd0");
      P(c, cx - Math.max(0, 3 - i / 5), Y + 52 - i, Math.max(1, 6 - (2 * i) / 5), 1, "#f5efe2");
    }
    disc(c, cx, Y + 36, 3, "#ffd86b");
  },
});

/* ── 길목 ── */
RSPEC.push(
  { id: "r15", n: "길목 15 · 여름 바닷길", theme: "coast", tier: 3, mons: [["jelly", 3], ["crab", 3]], node: "shell", prev: "t6", next: "r16" },
  { id: "r16", n: "길목 16 · 펫과 걷는 언덕", theme: "forest", tier: 3, mons: [["slime", 3], ["mush", 3]], node: "flower", prev: "r15", next: "t7", gate: "gate" },
  { id: "r17", n: "길목 17 · 황금 들길", theme: "gold", tier: 4, mons: [["bog", 3], ["mush", 3]], node: "herb", prev: "t7", next: "r18" },
  { id: "r18", n: "길목 18 · 허수아비 언덕", theme: "gold", tier: 4, mons: [["wolf", 3], ["fire", 2]], node: "flower", prev: "r17", next: "r19", dead: "d6" },
  { id: "d6", isDead: 1, n: "막다른 길 · 버려진 방앗간", theme: "dead", tier: 4, mons: [["shade", 3], ["mush", 2]], from: "r18" },
  { id: "r19", n: "길목 19 · 추수 강둑", theme: "coast", tier: 4, mons: [["crab", 3], ["bog", 3]], node: "shell", prev: "r18", next: "t8", gate: "gate" },
  { id: "r20", n: "길목 20 · 별빛 계단", theme: "stone", tier: 4, mons: [["gear", 3], ["shade", 2]], node: "cog", prev: "t8", next: "r21" },
  { id: "r21", n: "길목 21 · 꿈길", theme: "dream", tier: 4, mons: [["shade", 3], ["jelly", 3]], node: "herb", prev: "r20", next: "r22", dead: "d7" },
  { id: "d7", isDead: 1, n: "막다른 길 · 꿈속 서고 귀퉁이", theme: "dead", tier: 5, mons: [["shade", 4]], from: "r21" },
  { id: "r22", n: "길목 22 · 구름 다리", theme: "dream", tier: 5, mons: [["fire", 3], ["wolf", 3]], node: "spark", prev: "r21", next: "t9", gate: "gate" },
  { id: "r23", n: "길목 23 · 하얀 들판", theme: "white", tier: 5, mons: [["shade", 3], ["wolf", 3]], node: "herb", prev: "t9", next: "r24" },
  { id: "r24", n: "길목 24 · 지워진 고개", theme: "stone", tier: 5, mons: [["gear", 3], ["shade", 3]], node: "cog", prev: "r23", next: "t10", gate: "gate", dead: "d8" },
  { id: "d8", isDead: 1, n: "막다른 길 · 지워진 우물", theme: "dead", tier: 5, mons: [["shade", 4], ["wolf", 1]], from: "r24" },
  { id: "r25", n: "길목 25 · 얼어붙은 들", theme: "snow", tier: 5, mons: [["wolf", 3], ["shade", 3]], node: "cog", prev: "t10", next: "r26" },
  { id: "r26", n: "길목 26 · 설원의 끝", theme: "snow", tier: 5, mons: [["shade", 3], ["gear", 3]], node: "spark", prev: "r25", next: "t11", gate: "gate" },
  { id: "r27", n: "길목 27 · 하얀 세상", theme: "white", tier: 5, mons: [["shade", 4], ["fire", 2]], node: "spark", prev: "t11", next: "t12", gate: "gate" },
);

/* ── 마을 ── */
const TSPEC2 = [
  {
    id: "t7",
    part: 6,
    n: "7부 다시 찾은 루멘",
    short: "다시 찾은 루멘",
    theme: "coast",
    lm: { lm: "tower", n: "루멘 등대", x: 34, y: 3, w: 3, h: 6 },
    prev: "r16",
    next: "r17",
    blds: [
      ["마르타의 빵집", "#c0563f", "#9a3f2e"],
      ["모험가 길드", "#7a573b", "#5e3f29"],
      ["루멘 도서관", "#534AB7", "#3C3489"],
      ["숙소", "#3a7ac0", "#2f5a8a"],
    ],
    npcs: [
      ["dora", ["처음 오셨나요? 모험가 길드 루멘 지부예요. 견습생 등록부터 해 주세요."]],
      ["marta", ["어서 오렴, 처음 보는 얼굴이구나. …그런데 이상하지, 낯설지가 않네."]],
      ["toto", ["형, 누나! …어? 나 형, 누나 알아! 이 종이 배지, 형이 만들어 준 거잖아!"]],
      ["popo", ["아카데미에서 여기까지 왔어! 응원 편지를 보다가 네가 생각났거든."]],
      ["reno", ["(떠돌이 음유시인이 같은 노래 한 소절만 되풀이해 불러요.)"]],
    ],
    spots: [
      ["t7main", "board", "다시 쓰는 일기"],
      ["", "sign", "항구 길 표지판"],
      ["", "board", "길드 게시판"],
      ["", "stone", "등대 언덕 비석"],
      ["", "bottle", "모래밭 병 편지"],
      ["", "sign", "빵집 간판"],
    ],
  },
  {
    id: "t8",
    part: 7,
    n: "8부 보리내",
    short: "보리내",
    theme: "gold",
    lm: { lm: "mill", n: "보리내 풍차", x: 19, y: 1, w: 6, h: 8 },
    prev: "r19",
    next: "r20",
    blds: [
      ["곡식 창고", "#a8342e", "#7e2a25"],
      ["콩순네 집", "#5a9e3a", "#3B6D11"],
      ["팥돌네 집", "#c0563f", "#9a3f2e"],
      ["촌장 집", "#BA7517", "#854F0B"],
    ],
    npcs: [
      ["harold", ["추수제를 앞두고 창고 장부의 숫자가 지워졌네. 누가 몇 자루를 맡겼는지 몰라.", "이러다 이웃끼리 원수가 되겠어…"]],
      ["kong", ["우리 집이 열 자루는 맡겼어요!"]],
      ["pat", ["무슨 소리! 그 열 자루는 우리 거예요!"]],
      ["zip", ["나는 짚돌이! 별빛을 받고 깨어났어. 나 다 봤어! …근데 숫자를 셀 줄 몰라."]],
      ["lis", ["……", "(리스가 창고 그늘에서 지우개 가루 주머니를 만지작거려요.)"]],
    ],
    spots: [
      ["t8main", "board", "보리내 추수제"],
      ["", "sign", "들판 팻말"],
      ["", "board", "창고 장부판"],
      ["", "stone", "풍차 아래 비석"],
      ["", "bottle", "허수아비 주머니 쪽지"],
      ["", "sign", "추수제 안내판"],
    ],
  },
  {
    id: "t9",
    part: 8,
    n: "9부 하늘 도서관 (꿈속)",
    short: "하늘 도서관",
    theme: "dream",
    lm: { lm: "academy", n: "하늘 도서관", x: 14, y: 1, w: 16, h: 8 },
    prev: "r22",
    next: "r23",
    blds: [
      ["별의 서고", "#534AB7", "#3C3489"],
      ["바다의 서고", "#3a7ac0", "#2f5a8a"],
      ["숲의 서고", "#5a9e3a", "#3B6D11"],
      ["불과 땅의 서고", "#a83a35", "#7e2a25"],
    ],
    npcs: [
      ["momone", ["어서 와요, 낯선 아이. 여긴 하늘 도서관이에요. 나는 모모네, 책을 제일 좋아하는 현자예요."]],
      ["noxy", ["모모네, 또 책 읽다가 밥 먹는 걸 잊었구나. 하하."]],
      ["luke", ["형, 나 별 그림 그리는 중이야! 다 그리면 보여 줄게!"]],
      ["serafin", ["(꿈 밖에서 세라핀 교장의 목소리가 들려요.) 모모가 깨어날 때까지 꿈길을 잃지 마라."]],
    ],
    spots: [
      ["t9main", "board", "7현자 이야기"],
      ["", "sign", "서고 안내판"],
      ["", "board", "현자들의 게시판"],
      ["", "stone", "일곱 현자 비석"],
      ["", "bottle", "책장 틈 쪽지"],
      ["", "sign", "열람실 팻말"],
    ],
  },
  {
    id: "t10",
    part: 9,
    n: "10부 하얀 언덕",
    short: "하얀 언덕",
    theme: "white",
    lm: { lm: "oak", n: "노래꾼의 큰 나무", x: 19, y: 2, w: 6, h: 6 },
    prev: "r24",
    next: "r25",
    blds: [
      ["노래꾼의 집", "#c9c5d8", "#9a93c9"],
      ["마을 우물터", "#c9c5d8", "#9a93c9"],
      ["악기 공방", "#c9c5d8", "#9a93c9"],
      ["빈 집", "#c9c5d8", "#9a93c9"],
    ],
    npcs: [
      ["kai", ["…왔구나. 여기가 내 고향이었대. 아무것도 기억이 안 나."]],
      ["reno", ["카이… 너는 세레나 누나를 꼭 닮았구나."]],
      ["lis", ["…나도 도울게. 지우는 것보다 다시 쓰는 게 좋아."]],
    ],
    spots: [
      ["t10main", "board", "노래꾼 마을의 노래책"],
      ["", "sign", "언덕 길 표지판"],
      ["", "board", "마을 알림판"],
      ["", "stone", "우물가 비석"],
      ["", "bottle", "큰 나무 구멍 쪽지"],
      ["", "sign", "공방 간판"],
    ],
  },
  {
    id: "t11",
    part: 10,
    n: "11부 망각의 탑",
    short: "망각의 탑",
    theme: "snow",
    lm: { lm: "spire", n: "망각의 탑", x: 19, y: 0, w: 6, h: 9 },
    prev: "r26",
    next: "r27",
    blds: [
      ["동료들의 막사", "#5F5E5A", "#444441"],
      ["갈매기호 선원 천막", "#3a7ac0", "#2f5a8a"],
      ["왕국 군대 천막", "#7F77DD", "#534AB7"],
      ["대장간 천막", "#a83a35", "#7e2a25"],
    ],
    npcs: [
      ["icowl", ["후우… 이 탑에 오는 아이는 300년 만이구나. 모모네는 잘 지내니?"]],
      ["kai", ["이번엔 내가 지킬 차례야."]],
      ["sora", ["갈매기호를 타고 왔어! 마린다 선장님이 데려다줬어!"]],
      ["arien", ["왕국 군대를 데려왔어! 비밀 친구가 위험할 땐 와야지."]],
      ["mor", ["……", "(모르가 주머니 속 귤을 꼭 쥐고 있어요.)"]],
    ],
    spots: [
      ["beast", "board", "별짐승 전설"],
      ["", "sign", "탑 입구 표지판"],
      ["", "board", "막사 게시판"],
      ["", "stone", "얼음 비석"],
      ["", "bottle", "눈 속 병 편지"],
      ["", "sign", "설원 팻말"],
    ],
  },
  {
    id: "t12",
    part: 11,
    n: "12부 다시 쓰는 별",
    short: "별빛 언덕",
    theme: "town",
    lm: { lm: "compass", n: "별의 나침반 기념탑", x: 18, y: 1, w: 8, h: 8 },
    prev: "r27",
    next: null,
    blds: [
      ["졸업식 무대", "#d9a63a", "#BA7517"],
      ["루멘 사람들의 천막", "#c0563f", "#9a3f2e"],
      ["스승님들의 천막", "#534AB7", "#3C3489"],
      ["기록 보관소", "#1D9E75", "#0F6E56"],
    ],
    npcs: [
      ["momo", ["견습생님, 마지막이에요. 세상을 다시 써요. 우리 모두의 기억으로."]],
      ["kai", ["끝까지 같이 가자."]],
      ["toto", ["형, 누나! 나 종이 배지 아직 갖고 있어!"]],
      ["zip", ["나 걸어서 왔어! 다리 생겼거든!"]],
      ["sora", ["등대처럼, 꺼지지 않을 거야."]],
    ],
    spots: [
      ["t12main", "board", "내가 쓴 아르카 연대기"],
      ["", "sign", "언덕 표지판"],
      ["", "board", "졸업식 게시판"],
      ["", "stone", "현자들의 비석"],
      ["", "bottle", "바람에 날아온 쪽지"],
      ["", "sign", "기록 보관소 팻말"],
    ],
  },
];
TSPEC.push(...TSPEC2);

/* ── 부 목록 ── */
PARTS[5].gate = "r16";
PARTS.push(
  { town: "t7", gate: "r19", main: "t7main", hunt: "r16" },
  { town: "t8", gate: "r22", main: "t8main", boss: "mor", hunt: "r19" },
  { town: "t9", gate: "r24", main: "t9main", boss: "noxshade", hunt: "r22" },
  { town: "t10", gate: "r26", main: "t10main", boss: "gren", hunt: "r24" },
  { town: "t11", gate: "r27", main: "beast", boss: "warden", hunt: "r26" },
  { town: "t12", gate: null, main: "t12main", boss: "noxf", hunt: "r27" },
);
PARTTOWN.push("t7", "t8", "t9", "t10", "t11", "t12");
CHAIN.push("r15", "r16", "t7", "r17", "r18", "r19", "t8", "r20", "r21", "r22", "t9", "r23", "r24", "t10", "r25", "r26", "t11", "r27", "t12");
Object.assign(DEADS, { r18: "d6", r21: "d7", r24: "d8" });

/* ── 만들기 ── */
{
  // 6부 왕궁 광장에 동쪽 출구를 낸다
  const i6 = TSPEC.findIndex((s) => s.id === "t6");
  TSPEC[i6].next = "r15";
  MAPS.t6 = genTown(TSPEC[i6], 21 + i6);
  const base = RSPEC.findIndex((s) => s.id === "r15");
  RSPEC.slice(base).forEach((s, k) => {
    MAPS[s.id] = s.isDead ? genDead(s, base + k + 3) : genRoute(s, base + k + 3);
  });
  TSPEC2.forEach((s, k) => {
    MAPS[s.id] = genTown(s, 27 + k);
  });
  wireEntries();
  for (const id in MAPS) if (!CNAME[id]) CNAME[id] = MAPS[id].short;
  // 지문 번호를 처음부터 다시 매긴다 (06-world-semester1.js 의 번호 매기기와 같음)
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
