/* ════════ 마을 건물 안 (1~12부) ════════
   랜드마크·등대를 뺀 마을 건물은 모두 들어갈 수 있다. 건물 이름으로 종류를 정한다(src/08-ui.js 의 bldKind).
   · 상점(가게·상점·대장간·공방·매표소·생선·빵): 주인에게 말 걸면 상점 패널
   · 숙소(숙소·여관·기숙사): 침대에서 쉬면 하트 회복
   · 서고(도서관·서고·서점·기록): 사서가 틀린 문제 복습(오답 노트)
   · 길드(길드·본부·군대·무대·천막·막사): 다음에 할 일 알려 주기
   · 집(그 밖): 주민 이야기 + 처음 한 번 작은 선물 */
const ROOMKIND = (n) => {
  const k = bldKind(n).i;
  if (["coin", "hammer", "fish", "bread"].includes(k)) return "shop";
  if (k === "bed") return "inn";
  if (k === "book") return "lib";
  if (["flag", "tent"].includes(k)) return "guild";
  return "house";
};
// 안에 있는 사람: 이미 그린 인물 그림을 빌려 쓴다(그림 이름 = 빌린 인물)
const ROOMNPC = {
  shop: ["goldwin", "가게 주인"],
  inn: ["deok", "숙소 주인"],
  lib: ["lumi", "서고지기"],
  guild: ["fin", "길드 안내원"],
  house: [["kong", "pat", "harold", "barg", "brida", "layla"], "주민"],
};
const ROOMFUR = {
  shop: [
    { id: "window", x: 2, y: 0 },
    { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 13, y: 3, w: 3, h: 1 },
    { id: "desk", x: 8, y: 6, w: 2, h: 1 },
    { id: "plant", x: 16, y: 9, w: 1, h: 1 },
  ],
  inn: [
    { id: "window", x: 2, y: 0 },
    { id: "window", x: 12, y: 0 },
    { id: "bed", x: 1, y: 4, w: 2, h: 3, act: "bed", n: "침대에서 쉬기" },
    { id: "bed", x: 4, y: 4, w: 2, h: 3, act: "bed", n: "침대에서 쉬기" },
    { id: "rug", x: 8, y: 6 },
    { id: "ward", x: 13, y: 3, w: 2, h: 1 },
    { id: "plant", x: 16, y: 3, w: 1, h: 1 },
  ],
  lib: [
    { id: "window", x: 2, y: 0 },
    { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 10, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
    { id: "desk", x: 12, y: 7, w: 2, h: 1 },
    { id: "globe", x: 2, y: 7, w: 1, h: 1 },
  ],
  guild: [
    { id: "window", x: 2, y: 0 },
    { id: "window", x: 12, y: 0 },
    { id: "desk", x: 7, y: 5, w: 2, h: 1 },
    { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
    { id: "globe", x: 14, y: 4, w: 1, h: 1 },
    { id: "rug", x: 7, y: 7 },
    { id: "plant", x: 16, y: 9, w: 1, h: 1 },
  ],
  house: [
    { id: "window", x: 2, y: 0 },
    { id: "bed", x: 1, y: 4, w: 2, h: 3 },
    { id: "ward", x: 6, y: 3, w: 2, h: 1 },
    { id: "rug", x: 7, y: 6 },
    { id: "desk", x: 12, y: 4, w: 2, h: 1 },
    { id: "chest", x: 15, y: 3, w: 1, h: 1, act: "gift", n: "상자 열어 보기" },
    { id: "plant", x: 16, y: 9, w: 1, h: 1 },
  ],
};
const ROOMLINE = {
  shop: ["어서 와요! 오늘 들어온 물건을 볼래요?"],
  inn: ["푹 쉬어 가요. 침대에 누우면 하트가 다 차요.", "모험이 길면 쉬는 것도 실력이랍니다."],
  lib: ["조용히… 여기는 틀린 문제를 다시 만나는 서가예요.", "한 번 틀린 문제는 다시 보면 내 것이 돼요."],
  guild: ["모험가 길드예요. 다음에 할 일을 알려 줄게요."],
  house: [
    "어서 와요, 견습생! 우리 마을을 되살려 줘서 고마워요.",
    "안개가 오기 전엔 매일 저녁 별을 셌단다.",
    "우리 아이가 견습생처럼 되고 싶대요.",
    "문제를 틀려도 괜찮아요. 다시 풀면 되니까요.",
  ],
};
const ROOMS = {};
// 새 인물 모양: 빌린 인물 그림을 쓰도록 HD_ALIAS 에 적는다
function roomNpc(kind, town, i) {
  let [base, nm] = ROOMNPC[kind];
  if (Array.isArray(base)) base = base[hsh(i, town.length) % base.length];
  const id = "rn_" + kind + "_" + town + "_" + i;
  D[id] = { ...D[base], n: nm };
  if (typeof HD_ALIAS === "object") HD_ALIAS[id] = base;
  return id;
}
PARTTOWN.forEach((town) => {
  const m = MAPS[town];
  if (!m) return;
  (m.bld || []).forEach((b, i) => {
    if (b.lm || b.tower || b.to || !b.n) return;
    const kind = ROOMKIND(b.n),
      id = "in_" + town + "_" + i,
      npc = roomNpc(kind, town, i),
      fur = ROOMFUR[kind].map((f) => ({ ...f }));
    bRoom(id, b.n, town, [b.dx, b.dy + 1], fur, [[npc, kind === "shop" ? 11 : 10, kind === "shop" ? 7 : 8, ROOMLINE[kind]]]);
    MAPS[id].roomKind = kind;
    MAPS[id].roomTown = town;
    b.to = id;
    b.at = [8, 9];
    ROOMS[id] = kind;
  });
});
// 말 걸기: 종류마다 다른 일
{
  const tk0 = talk;
  talk = function (n) {
    const kind = n.id && n.id.startsWith("rn_") ? n.id.split("_")[1] : null;
    if (!kind) return tk0(n);
    if (kind === "shop") return openDlg(n, ROOMLINE.shop, () => openPanel("shop"));
    if (kind === "inn") {
      pl.hp = maxHp();
      save.hp = pl.hp;
      store();
      hud();
      return openDlg(n, [ROOMLINE.inn[hsh(tk, 3) % 2], "(하트가 가득 찼어요)"]);
    }
    if (kind === "lib") {
      const k = (save.wrong || []).length;
      return openDlg(n, k ? [ROOMLINE.lib[0], "지금 오답 노트에 " + k + "문제가 있어요. 같이 볼까요?"] : ["오답 노트가 비어 있네요! 대단해요.", ROOMLINE.lib[1]], k ? () => openPanel("wrong") : null);
    }
    if (kind === "guild") {
      const g = rawGoal();
      return openDlg(n, [ROOMLINE.guild[0], g ? "지금 할 일: " + g.t : "지금은 급한 일이 없어요. 길목에서 장비를 모아 봐요!", "장비는 I 키(가방)에서, 상점은 마을 가게에서 볼 수 있어요."]);
    }
    return openDlg(n, [ROOMLINE.house[hsh(n.x | 0, n.y | 0) % ROOMLINE.house.length]]);
  };
  // 집 안 상자: 처음 한 번 선물(금화 + 가끔 장비)
  const fa1 = furAct;
  furAct = function (f) {
    if (f.act !== "gift") return fa1(f);
    const key = "gift_" + M.id;
    if (save.chest[key]) return toast("빈 상자예요");
    save.chest[key] = 1;
    const gd = 15 + 5 * (MAP_PART[M.id] || 1);
    gain(0, gd, 1);
    if (Math.random() < 0.35 && typeof rpgDrop === "function") rpgDrop("chest", save.lv, f.x * T + 8, f.y * T - 6);
    store();
    hud();
    toast("상자 안에 금화 " + gd + "개와 별빛 가루가 있었어요!");
  };
}

/* ── 랜드마크 안(2026-11-16 선생님 요청 「참나무나 등대에는 못 들어가」 → 「다른 랜드마크도·참나무 안 꾸미기」) ──
   12마을 랜드마크(등대·큰 나무·시계탑·아카데미·왕궁·풍차·하늘 도서관·망각의 탑·나침반 기념탑)에 문을 달고 안을 만든다.
   1부 등대(lh1)는 원래 있음. 방마다 벽·바닥 무늬 `LMSTYLE`(바닥·벽을 그린 뒤, 가구보다 먼저)와 전용 가구(톱니·왕좌·맷돌 등, 캔버스로 직접).
   안 사람은 있는 인물 그림을 빌리고, 마을을 다 되살렸는지(partDone)에 따라 말이 바뀐다. 상자는 처음 한 번 선물. */
const LMGIFT = { id: "chest", x: 16, y: 9, w: 1, h: 1, act: "gift", n: "상자 열어 보기" };
const LMROOM = {
  tower: {
    fur: [
      { id: "window", x: 2, y: 0 },
      { id: "window", x: 12, y: 0 },
      { id: "lens", x: 7, y: 3, w: 2, h: 2 },
      { id: "desk", x: 12, y: 7, w: 2, h: 1 },
      { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
      { id: "chest", x: 15, y: 3, w: 1, h: 1, act: "gift", n: "상자 열어 보기" },
      { id: "plant", x: 2, y: 9, w: 1, h: 1 },
    ],
    npc: ["pat", "등대 견습생"],
    before: (n) => ["여기는 " + n + " 안이에요. 맨 위 렌즈 보이죠?", "렌즈 속 「빛의 기록」이 지워져서 불이 안 켜져요… 마을의 지워진 곳을 다 다시 쓰면 다시 빛날 거래요."],
    after: (n) => [jo(n, "이", "가") + " 다시 빛나요! 배들이 길을 잃지 않아요.", "렌즈는 별빛으로 닦아요. 문제를 맞힐 때 모은 그 별빛이요!"],
  },
  oak: {
    style: "oak",
    fur: [
      { id: "root", x: 2, y: 3, w: 2, h: 1 },
      { id: "root", x: 13, y: 3, w: 2, h: 1 },
      { id: "shroom", x: 1, y: 9, w: 1, h: 1 },
      { id: "shroom", x: 5, y: 4, w: 1, h: 1 },
      { id: "shroom", x: 15, y: 6, w: 1, h: 1 },
      { id: "shelf", x: 6, y: 3, w: 3, h: 1 },
      { id: "chest", x: 3, y: 9, w: 1, h: 1, act: "gift", n: "상자 열어 보기" },
    ],
    npc: ["layla", "숲지기"],
    before: (n) => ["쉿… 여기는 " + n + " 속 빈 방이에요.", "나무가 자기 이름을 잊어서 속이 이렇게 차가워요. 마을을 다 되살리면 따뜻해질 거예요."],
    after: (n) => [jo(n, "이", "가") + " 이름을 되찾았어요! 나무 속이 따뜻해요.", "바닥의 나이테를 세어 보세요. 한 줄이 한 해예요. 천 년도 넘었대요!"],
  },
  clock: {
    style: "clock",
    fur: [
      { id: "gear", x: 2, y: 3, w: 2, h: 2 },
      { id: "gear", x: 13, y: 3, w: 2, h: 2 },
      { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
      { id: "desk", x: 12, y: 7, w: 2, h: 1 },
      LMGIFT,
    ],
    npc: ["harold", "시계공"],
    before: (n) => [n + " 안이에요. 톱니가 멈춰서 도시의 시간도 멈췄어요…", "지워진 곳을 다 다시 쓰면 톱니가 다시 맞물릴 거예요."],
    after: () => ["째깍째깍! 톱니가 다시 돌아요.", "톱니 수가 20개와 10개인 톱니가 맞물리면, 큰 톱니가 한 바퀴 돌 때 작은 톱니는 두 바퀴 돌아요. 20 ÷ 10 = 2!"],
  },
  academy: {
    style: "academy",
    fur: [
      { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
      { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
      { id: "desk", x: 3, y: 6, w: 2, h: 1 },
      { id: "desk", x: 6, y: 6, w: 2, h: 1 },
      { id: "desk", x: 12, y: 6, w: 2, h: 1 },
      { id: "globe", x: 2, y: 9, w: 1, h: 1 },
      LMGIFT,
    ],
    npc: ["brida", "아카데미 조교"],
    before: (n) => [n + " 강의실이에요. 칠판의 공식이 다 지워져 버렸어요…", "마을을 다 되살리면 칠판도 다시 채워질 거예요."],
    after: () => ["칠판이 다시 채워졌어요!", "여기 학생들은 틀린 문제를 다시 풀어 보는 걸 제일 좋아해요. 한 번 틀린 문제가 제일 오래 기억나거든요."],
  },
  sky: {
    style: "sky",
    fur: [
      { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
      { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
      { id: "shelf", x: 10, y: 3, w: 3, h: 1 },
      { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
      { id: "globe", x: 2, y: 7, w: 1, h: 1 },
      { id: "desk", x: 13, y: 7, w: 2, h: 1 },
      LMGIFT,
    ],
    npc: ["lumi", "꿈 사서"],
    before: (n) => ["여기는 꿈속의 " + n + "이에요. 책장이 둥둥 떠 있죠?", "책 속 글자가 안개에 지워져 가요. 마을을 다 되살려 주세요."],
    after: () => ["책들이 다시 반짝여요!", "꿈에서 읽은 책도, 깨어서 다시 읽으면 내 것이 돼요."],
  },
  palace: {
    style: "palace",
    fur: [
      { id: "throne", x: 8, y: 3, w: 2, h: 2 },
      { id: "pillar", x: 3, y: 3, w: 1, h: 2 },
      { id: "pillar", x: 14, y: 3, w: 1, h: 2 },
      { id: "pillar", x: 3, y: 7, w: 1, h: 2 },
      { id: "pillar", x: 14, y: 7, w: 1, h: 2 },
      LMGIFT,
    ],
    npc: ["kong", "왕궁 시종"],
    before: (n) => [n + " 알현실이에요. 왕좌가 비어 있어요…", "왕국의 기록이 지워져서 모두가 왕을 잊었대요. 마을을 다 되살리면 기억이 돌아올 거예요."],
    after: () => ["왕국의 기억이 돌아왔어요! 견습생 덕분이에요.", "왕좌 앞 붉은 길은 마을 사람 모두가 함께 걷는 길이래요."],
  },
  mill: {
    style: "mill",
    fur: [
      { id: "mstone", x: 8, y: 3, w: 2, h: 2 },
      { id: "sack", x: 2, y: 3, w: 1, h: 1 },
      { id: "sack", x: 3, y: 3, w: 1, h: 1 },
      { id: "sack", x: 2, y: 4, w: 1, h: 1 },
      { id: "hay", x: 13, y: 3, w: 2, h: 1 },
      { id: "hay", x: 13, y: 7, w: 2, h: 1 },
      LMGIFT,
    ],
    npc: ["deok", "방앗간 일꾼"],
    before: (n) => [n + " 안이에요. 날개가 멈춰서 맷돌도 안 돌아요…", "마을을 다 되살리면 바람이 다시 불 거예요."],
    after: () => ["맷돌이 다시 돌아요! 오늘은 보리 자루가 24개나 나왔어요.", "자루 24개를 3집에 똑같이 나누면 한 집에 8개씩이에요."],
  },
  spire: {
    style: "spire",
    fur: [
      { id: "lens", x: 8, y: 3, w: 2, h: 2 },
      { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
      { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
      LMGIFT,
    ],
    npc: ["harold", "탑지기"],
    before: (n) => [n + " 1층이에요. 벽의 글자들이 하나씩 희미해지고 있어요…", "여기서 오래 있으면 나도 잊혀질 것 같아요. 마을을 다 되살려 주세요."],
    after: () => ["희미하던 글자들이 다시 또렷해졌어요!", "잊었던 것도 다시 읽으면 돌아와요. 이 탑이 그걸 알려 줬어요."],
  },
  compass: {
    style: "compass",
    fur: [
      { id: "pedestal", x: 8, y: 3, w: 2, h: 2 },
      { id: "globe", x: 2, y: 4, w: 1, h: 1 },
      { id: "globe", x: 15, y: 4, w: 1, h: 1 },
      LMGIFT,
    ],
    npc: ["fin", "기념탑 안내원"],
    before: (n) => [n + " 안이에요. 나침반 바늘이 아직 떨리고 있어요…", "마지막 기록을 다시 쓰면 바늘이 멈출 거예요."],
    after: () => ["별의 나침반이 제자리를 찾았어요!", "바닥의 별은 열두 마을을 가리켜요. 견습생이 걸어온 길이에요."],
  },
};
function lmMakeRooms() {
  PARTTOWN.forEach((town) => {
    const m = MAPS[town];
    if (!m) return;
    (m.bld || []).forEach((b) => {
      const kind = b.lm === "academy" && town === "t9" ? "sky" : b.lm,
        R = LMROOM[kind];
      if (!R || b.to) return;
      const id = "lm_" + town,
        nid = "lmn_" + kind + "_" + town;
      D[nid] = { ...D[R.npc[0]], n: R.npc[1] };
      if (typeof HD_ALIAS === "object") HD_ALIAS[nid] = R.npc[0];
      bRoom(id, b.n.replace(/ \(꿈속\)/, "") + " 안", town, [b.dx, b.dy + 1], R.fur.map((f) => ({ ...f })), [[nid, 10, 8, ["…"]]]);
      MAPS[id].roomKind = "lm";
      MAPS[id].roomTown = town;
      MAPS[id].lmStyle = R.style || null;
      b.to = id;
      b.at = [8, 9];
    });
  });
}
lmMakeRooms();
{
  const tk1 = talk;
  talk = function (n) {
    if (!n.id || !n.id.startsWith("lmn_")) return tk1(n);
    const [, kind, town] = n.id.split("_"),
      R = LMROOM[kind],
      nm2 = ((MAPS[town].bld.find((b) => b.to === "lm_" + town) || {}).n || "").replace(/ \(꿈속\)/, ""),
      done = typeof partDone === "function" && partDone((MAP_PART[town] || 1) - 1);
    return openDlg(n, (done ? R.after : R.before)(nm2));
  };
}
/* 방 무늬: 바닥·벽을 그린 뒤 → 무늬 → 가구(가구가 무늬에 덮이지 않게) */
const lmR = (k, a, b) => a + (hsh(k, 77) % (b - a + 1));
const LMSTYLE = {
  oak(c) {
    // 나무껍질 벽
    for (let a = 0; a < 288; a += 4) P(c, a, 0, 4, 46, a % 8 ? "#6b4a2b" : "#5a3d22");
    for (let k = 0; k < 14; k++) P(c, lmR(k, 4, 280), lmR(k + 30, 4, 38), 3, lmR(k + 60, 5, 12), "#4a311b");
    for (let k = 0; k < 6; k++) disc(c, lmR(k + 90, 20, 270), lmR(k + 99, 10, 34), 4, "#5f8a3a");
    P(c, 0, 0, 16, 192, "#5a3d22");
    P(c, 272, 0, 16, 192, "#5a3d22");
    P(c, 0, 176, 128, 16, "#5a3d22");
    P(c, 160, 176, 128, 16, "#5a3d22");
    P(c, 0, 44, 288, 4, "#3e2914");
    // 나이테 바닥
    P(c, 16, 48, 256, 128, "#b98a55");
    for (let r = 120, i = 0; r > 4; r -= 9, i++) {
      for (let dy = -r; dy <= r; dy++) {
        const y = 112 + dy;
        if (y < 48 || y >= 176) continue;
        const w = Math.floor(Math.sqrt(r * r - dy * dy)),
          w2 = Math.floor(Math.sqrt(Math.max(0, (r - 2) * (r - 2) - dy * dy)));
        const x0 = Math.max(16, 144 - w), x1 = Math.min(272, 144 + w);
        if (x1 > x0) {
          P(c, x0, y, Math.max(0, Math.min(272, 144 - w2) - x0), 1, i % 2 ? "#a0743f" : "#8a6234");
          P(c, Math.max(16, 144 + w2), y, Math.max(0, x1 - Math.max(16, 144 + w2)), 1, i % 2 ? "#a0743f" : "#8a6234");
        }
      }
    }
    disc(c, 144, 112, 3, "#7a5530");
  },
  clock(c) {
    P(c, 0, 0, 288, 46, "#4a4e58");
    for (let a = 8; a < 288; a += 16) P(c, a, 6, 2, 2, "#8a8f9a"), P(c, a, 36, 2, 2, "#8a8f9a");
    for (const [x, r] of [[60, 14], [150, 18], [236, 12]]) {
      disc(c, x, 24, r, "#8a6a2a");
      disc(c, x, 24, r - 4, "#c9993f");
      disc(c, x, 24, 3, "#4a4e58");
    }
    P(c, 0, 0, 16, 192, "#3a3e47");
    P(c, 272, 0, 16, 192, "#3a3e47");
    P(c, 0, 176, 128, 16, "#3a3e47");
    P(c, 160, 176, 128, 16, "#3a3e47");
    for (let y = 48; y < 176; y += 16) for (let a = 16; a < 272; a += 16) P(c, a, y, 16, 16, ((a + y) / 16) % 2 ? "#6b6f78" : "#5d616a");
  },
  academy(c) {
    P(c, 0, 0, 288, 46, "#efe4cc");
    P(c, 64, 6, 160, 32, "#5a3d22");
    P(c, 66, 8, 156, 28, "#2f5a44");
    P(c, 74, 14, 40, 1, "#e8f0e0"), P(c, 74, 20, 60, 1, "#e8f0e0"), P(c, 140, 14, 30, 1, "#e8f0e0"), P(c, 150, 24, 50, 1, "#e8f0e0");
    P(c, 16, 48, 256, 128, "#c9b48a");
    P(c, 104, 48, 80, 128, "#3d4f8a");
    P(c, 104, 48, 2, 128, "#c9a640"), P(c, 182, 48, 2, 128, "#c9a640");
  },
  sky(c) {
    P(c, 0, 0, 288, 46, "#1e2350");
    for (let k = 0; k < 40; k++) P(c, lmR(k, 2, 284), lmR(k + 50, 2, 42), 1, 1, k % 5 ? "#c9d4ff" : "#ffd86b");
    P(c, 0, 0, 16, 192, "#181c44");
    P(c, 272, 0, 16, 192, "#181c44");
    P(c, 0, 176, 128, 16, "#181c44");
    P(c, 160, 176, 128, 16, "#181c44");
    P(c, 16, 48, 256, 128, "#dfe6f5");
    for (let k = 0; k < 18; k++) disc(c, lmR(k + 7, 30, 258), lmR(k + 77, 56, 168), lmR(k + 33, 4, 9), "#eef2fb");
  },
  palace(c) {
    P(c, 0, 0, 288, 46, "#efe0c0");
    P(c, 0, 40, 288, 3, "#c9a640");
    for (const x of [40, 232]) P(c, x, 4, 16, 34, "#a3283a"), P(c, x + 6, 36, 4, 6, "#c9a640");
    for (let y = 48; y < 176; y += 16) for (let a = 16; a < 272; a += 16) P(c, a, y, 16, 16, ((a + y) / 16) % 2 ? "#e8e2d6" : "#d6cfc0");
    P(c, 124, 80, 40, 112, "#a3283a");
    P(c, 124, 80, 2, 112, "#c9a640"), P(c, 162, 80, 2, 112, "#c9a640");
  },
  mill(c) {
    for (let y = 0; y < 46; y += 6) P(c, 0, y, 288, 6, y % 12 ? "#b88a55" : "#a77a48"), P(c, 0, y + 5, 288, 1, "#7a5530");
    P(c, 16, 48, 256, 128, "#d9b860");
    for (let k = 0; k < 60; k++) P(c, lmR(k, 18, 266), lmR(k + 40, 50, 172), lmR(k + 9, 3, 7), 1, k % 2 ? "#b8963a" : "#e8cf80");
  },
  spire(c) {
    P(c, 0, 0, 288, 46, "#3a2f4f");
    for (let k = 0; k < 24; k++) P(c, lmR(k, 6, 276), lmR(k + 20, 6, 36), lmR(k + 3, 4, 10), 2, "#6a5a8a");
    P(c, 0, 0, 16, 192, "#2c2540");
    P(c, 272, 0, 16, 192, "#2c2540");
    P(c, 0, 176, 128, 16, "#2c2540");
    P(c, 160, 176, 128, 16, "#2c2540");
    P(c, 16, 48, 256, 128, "#3e3558");
    for (let k = 0; k < 12; k++) P(c, lmR(k + 5, 20, 220), lmR(k + 55, 52, 170), lmR(k + 15, 20, 50), 2, "#5a4f78");
  },
  compass(c) {
    P(c, 0, 0, 288, 46, "#22305a");
    for (let k = 0; k < 30; k++) P(c, lmR(k, 2, 284), lmR(k + 60, 2, 42), 1, 1, "#ffd86b");
    P(c, 16, 48, 256, 128, "#2e3d6e");
    const cx = 144, cy = 120;
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * Math.PI * 2,
        L = i % 3 ? 34 : 50;
      for (let t = 6; t < L; t += 2) P(c, Math.round(cx + Math.cos(an) * t), Math.round(cy + Math.sin(an) * t * 0.8), 2, 2, i % 3 ? "#c9a640" : "#ffd86b");
    }
    disc(c, cx, cy, 6, "#ffd86b");
  },
};
// 전용 가구(그림 파일 없이 캔버스로)
Object.assign(FURD, {
  root(c, X, Y) {
    P(c, X, Y + 8, 32, 6, "#6b4a2b");
    P(c, X + 4, Y + 5, 8, 4, "#6b4a2b");
    P(c, X + 20, Y + 12, 10, 4, "#5a3d22");
    P(c, X, Y + 8, 32, 1, "#8a6234");
  },
  shroom(c, X, Y) {
    P(c, X + 7, Y + 8, 3, 7, "#efe4cc");
    disc(c, X + 8, Y + 7, 5, "#7fd6b8");
    P(c, X + 6, Y + 5, 2, 2, "#e8fff6");
  },
  gear(c, X, Y) {
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      P(c, X + 16 + Math.round(Math.cos(an) * 14) - 2, Y + 16 + Math.round(Math.sin(an) * 14) - 2, 5, 5, "#8a6a2a");
    }
    disc(c, X + 16, Y + 16, 12, "#8a6a2a");
    disc(c, X + 16, Y + 16, 9, "#c9993f");
    disc(c, X + 16, Y + 16, 3, "#4a3a18");
  },
  throne(c, X, Y) {
    P(c, X + 6, Y - 6, 20, 24, "#c9a640");
    P(c, X + 8, Y - 4, 16, 20, "#a3283a");
    P(c, X + 3, Y + 16, 26, 7, "#c9a640");
    P(c, X + 5, Y + 23, 3, 8, "#8a6a2a"), P(c, X + 24, Y + 23, 3, 8, "#8a6a2a");
    disc(c, X + 16, Y - 8, 3, "#ffd86b");
  },
  pillar(c, X, Y) {
    P(c, X + 3, Y, 10, 32, "#e8dcc0");
    P(c, X + 4, Y, 2, 32, "#fff4dc");
    P(c, X + 1, Y, 14, 3, "#c9a640");
    P(c, X + 1, Y + 29, 14, 3, "#c9a640");
  },
  mstone(c, X, Y) {
    disc(c, X + 16, Y + 18, 14, "#8a857c");
    disc(c, X + 16, Y + 16, 13, "#b5b0a6");
    disc(c, X + 16, Y + 16, 3, "#5a564f");
    P(c, X + 16, Y + 6, 2, 10, "#7a5530");
  },
  sack(c, X, Y) {
    P(c, X + 3, Y + 4, 10, 11, "#d8c08a");
    P(c, X + 5, Y + 2, 6, 3, "#b89a60");
    P(c, X + 3, Y + 14, 10, 1, "#9a7d48");
  },
  hay(c, X, Y) {
    P(c, X + 1, Y + 3, 30, 12, "#e0c45a");
    for (let a = 3; a < 30; a += 5) P(c, X + a, Y + 4, 1, 10, "#b89a30");
    P(c, X + 1, Y + 8, 30, 1, "#a07a20");
  },
  pedestal(c, X, Y) {
    P(c, X + 8, Y + 14, 16, 18, "#c9b98f");
    P(c, X + 5, Y + 12, 22, 4, "#e8dcb0");
    disc(c, X + 16, Y + 6, 7, "#ffd86b");
    P(c, X + 15, Y - 4, 2, 20, "#fff6d6");
    P(c, X + 6, Y + 5, 20, 2, "#fff6d6");
  },
});
{
  const pmL = paintMap;
  paintMap = function (m) {
    const St = m && m.lmStyle && LMSTYLE[m.lmStyle];
    if (!St) return pmL(m);
    const fur = m.fur;
    m.fur = [];
    pmL(m);
    m.fur = fur;
    const bc = m.base.getContext("2d");
    St(bc, m);
    (fur || []).forEach((f) => FURD[f.id](bc, f.x * T, f.y * T));
  };
}
