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

/* ── 랜드마크 안: 등대·큰 나무(2026-11-16 선생님 요청 「참나무나 등대에는 못 들어가」) ──
   각 마을 랜드마크 중 등대(tower)·큰 나무(oak)에 문을 달고 안을 만든다. 1부 등대(lh1)는 원래 있음.
   안 사람은 있는 인물 그림을 빌리고, 마을을 다 되살렸는지(partDone)에 따라 말이 바뀐다. 상자는 처음 한 번 선물. */
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
    fur: [
      { id: "rug", x: 7, y: 6 },
      { id: "plant", x: 1, y: 3, w: 1, h: 1 },
      { id: "plant", x: 16, y: 3, w: 1, h: 1 },
      { id: "plant", x: 1, y: 9, w: 1, h: 1 },
      { id: "plant", x: 16, y: 9, w: 1, h: 1 },
      { id: "shelf", x: 6, y: 3, w: 3, h: 1 },
      { id: "desk", x: 12, y: 5, w: 2, h: 1 },
      { id: "chest", x: 3, y: 3, w: 1, h: 1, act: "gift", n: "상자 열어 보기" },
    ],
    npc: ["layla", "숲지기"],
    before: (n) => ["쉿… 여기는 " + n + " 속 빈 방이에요.", "나무가 자기 이름을 잊어서 속이 이렇게 차가워요. 마을을 다 되살리면 따뜻해질 거예요."],
    after: (n) => [jo(n, "이", "가") + " 이름을 되찾았어요! 나무 속이 따뜻해요.", "벽의 나이테를 세어 보면 천 년도 넘었대요. 백 년씩 묶어 세면 금방이에요."],
  },
};
PARTTOWN.forEach((town) => {
  const m = MAPS[town];
  if (!m) return;
  (m.bld || []).forEach((b) => {
    const R = LMROOM[b.lm];
    if (!R || b.to) return;
    const id = "lm_" + town,
      nid = "lmn_" + b.lm + "_" + town;
    D[nid] = { ...D[R.npc[0]], n: R.npc[1] };
    if (typeof HD_ALIAS === "object") HD_ALIAS[nid] = R.npc[0];
    bRoom(id, b.n + " 안", town, [b.dx, b.dy + 1], R.fur.map((f) => ({ ...f })), [[nid, 10, 8, ["…"]]]);
    MAPS[id].roomKind = "lm";
    MAPS[id].roomTown = town;
    b.to = id;
    b.at = [8, 9];
  });
});
{
  const tk1 = talk;
  talk = function (n) {
    if (!n.id || !n.id.startsWith("lmn_")) return tk1(n);
    const [, kind, town] = n.id.split("_"),
      R = LMROOM[kind],
      nm2 = (MAPS[town].bld.find((b) => b.lm === kind) || {}).n || "",
      done = typeof partDone === "function" && partDone((MAP_PART[town] || 1) - 1);
    return openDlg(n, (done ? R.after : R.before)(nm2));
  };
}
