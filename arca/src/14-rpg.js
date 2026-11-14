/* ════════ RPG 화면: 내 정보 · 장비 · 상점 · 꾸미기 · 전리품 · 퀘스트 접기 ════════
   데이터와 계산은 src/04b-items.js(ITEMS·GRADES·makeItem·itemStats), 저장 연결은 src/04c-rpg-save.js(save.rpg).
   · 처음 직업을 얻으면 견습 무기만 받는다. 옷은 상점에서 사거나 몬스터·보물 상자에서 얻는다.
   · 몬스터 체력은 10배 단위(PWR)로 바꿔 장비 공격력과 맞춘다. */
rpgMigrateLate();
{
  const ms0 = mstat;
  mstat = function (m) {
    const r = ms0(m);
    return { ...r, hp: r.hp * PWR };
  };
}
const GCOL = (g) => GRADES[g].col;
const rpgName = (it) => '<b style="color:' + GCOL(it.g) + '">' + (it.g ? "[" + GRADES[it.g].n + "] " : "") + esc(itemDef(it.id).n) + "</b>";
const SLOTN = { w: "무기", o: "옷", c1: "장신구 1", c2: "장신구 2" };
const slotOf = (it) => {
  const s = itemDef(it.id).s;
  return s === "c" ? "c" : s;
};
const rpgEquipped = (u) => Object.values(save.rpg.eq).includes(u);
const rpgPlaced = (u) => save.rpg.room.some((r) => r.u === u);

/* ── 직업을 얻으면 견습 무기 하나 ── */
{
  const cj0 = chooseJob;
  chooseJob = function (n) {
    cj0(n);
    const R = save.rpg;
    if (!R.eq.w) {
      const it = rpgAdd("w_" + save.job + "_0", 0, true);
      R.eq.w = it.u;
      store();
      setTimeout(() => toast("「" + itemDef(it.id).n + "」을(를) 받았어요 · 옷은 상점에서 골라요"), 600);
    }
  };
}

/* ── 전리품 ── */
function rpgDrop(table, lv, x0, y0) {
  const slot = Math.random() < 0.38 ? "w" : Math.random() < 0.55 ? "o" : "c",
    pool = lootPool(lv, save.job, slot);
  if (!pool.length || (slot === "w" && !save.job)) return null;
  const id = pool[Math.floor(Math.random() * pool.length)],
    g = rollGrade(table);
  const it = rpgAdd(id, g);
  if (!it) {
    const gd = 10 + lv * 3;
    save.gold += gd;
    toast("가방이 가득 차서 금화 " + gd + "로 바꿨어요");
    return null;
  }
  if (typeof fxPop === "function" && x0 != null) fxPop(x0, y0, (g ? GRADES[g].n + " " : "") + itemDef(id).n, GCOL(g));
  setTimeout(() => toast("전리품! " + (g ? "[" + GRADES[g].n + "] " : "") + itemDef(id).n + " · 마이룸 옷장이나 장비(I)에서 장착"), 700);
  if (g >= 2 && typeof sfx === "function") sfx("lvl");
  return it;
}
{
  const win0 = win;
  win = function () {
    const m = B && B.m,
      MI = B && B.MI;
    win0();
    if (!m || !MI) return;
    const t = (MAPS[m.map] || M).tier || 1;
    if (MI.boss) rpgDrop(m.type === "gate" ? "gate" : "boss", save.lv + 1, m.x, m.y - 40);
    else if (Math.random() < 0.08 + 0.02 * t) rpgDrop("mon", save.lv, m.x, m.y - 30);
    store();
  };
  const it0 = interact;
  interact = function (t) {
    if (RP.place) return rpgPlaceHere();
    const ch = t && t.type === "chest" && M.chest && !save.chest[M.chest.id];
    it0(t);
    if (ch && save.chest[M.chest.id]) {
      rpgDrop("chest", save.lv + 1, M.chest.tx * T + 8, M.chest.ty * T - 10);
      store();
    }
  };
}

/* ── 상점: 마이룸 옷장, 마을 상점·대장간 문 ── */
function shopStock() {
  const lv = save.lv,
    ids = Object.keys(ITEMS).filter((id) => {
      const d = ITEMS[id];
      if (d.story || d.price === 0) return false;
      if (d.s === "w") return d.job === save.job && d.lv <= lv + 6;
      if (d.s === "d") return true;
      return d.lv <= lv + 6;
    });
  return ids.sort((a, b) => ITEMS[a].lv - ITEMS[b].lv || ITEMS[a].price - ITEMS[b].price);
}
// 오늘의 레어: 날짜와 레벨로 정해지는 레어 한 개(값 3배)
function shopRare() {
  const day = Math.floor(Date.now() / 864e5),
    pool = lootPool(save.lv, save.job).filter((id) => ITEMS[id].price);
  if (!pool.length) return null;
  return pool[(day * 7 + save.lv * 13) % pool.length];
}
function rpgBuy(id, rare) {
  const d = itemDef(id),
    price = d.price * (rare ? 3 : 1);
  if (save.gold < price) return toast("금화가 " + (price - save.gold) + " 모자라요");
  if (rare && save.rpg.rareDay === Math.floor(Date.now() / 864e5)) return toast("오늘의 레어는 하루에 한 번만 살 수 있어요");
  const it = rpgAdd(id, rare ? 1 : 0);
  if (!it) return toast("가방이 가득 찼어요. 안 쓰는 물건을 팔아요");
  save.gold -= price;
  if (rare) save.rpg.rareDay = Math.floor(Date.now() / 864e5);
  sfx("ok");
  toast((rare ? "[레어] " : "") + d.n + "을(를) 샀어요");
}
{
  const it1 = interact;
  interact = function (t) {
    if (t && t.type === "door" && !t.ref.to && t.ref.n && ["coin", "hammer"].includes(bldKind(t.ref.n).i)) return openPanel("shop");
    it1(t);
  };
}

/* ── 장착·팔기 ── */
function rpgEquip(u) {
  const it = rpgGet(u),
    d = it && itemDef(it.id);
  if (!d) return;
  if ((d.lv || 1) > save.lv) return toast("Lv " + d.lv + "부터 쓸 수 있어요");
  if (d.s === "w" && d.job !== save.job) return toast(JOB[d.job].n + " 무기예요");
  const R = save.rpg;
  if (d.s === "c") {
    if (R.eq.c1 === u || R.eq.c2 === u) return;
    if (!R.eq.c1) R.eq.c1 = u;
    else if (!R.eq.c2) R.eq.c2 = u;
    else R.eq.c1 = u;
  } else R.eq[d.s] = u;
  sfx("ok");
}
function rpgSell(u) {
  const it = rpgGet(u);
  if (!it || rpgEquipped(u) || rpgPlaced(u)) return;
  const p = sellPrice(it);
  if (!p) return toast("이야기 보물은 팔 수 없어요");
  save.rpg.bag = save.rpg.bag.filter((i) => i.u !== u);
  save.gold += p;
  toast(itemDef(it.id).n + "을(를) 금화 " + p + "에 팔았어요");
}

/* ── 패널: 내 정보 ── */
const RP = { filt: "all", place: null };
const power = () => {
  const S = rpgSum();
  return atk() + maxHp() * 10 + S.def * 3 + S.crit * 3 + Math.round((S.exp + S.gold + S.dust) / 2);
};
{
  const me0 = PANEL.me;
  PANEL.me = function () {
    const S = rpgSum(),
      R = save.rpg,
      row = (a, b) => '<div class="st"><span>' + a + "</span><b>" + b + "</b></div>";
    let h =
      '<div class="pethead"><canvas class="pv big" data-me="1" data-job="none" width="68" height="68"></canvas><div><b>' +
      esc(save.name || "견습생") +
      " · " +
      (save.job ? "견습 " + JOB[save.job].n : "직업 없음") +
      "</b><small>Lv " +
      save.lv +
      " · 전투력 <b style=\"color:#ffd86b\">" +
      power() +
      '</b></small><div class="rbody">겉모습 <button type="button" data-rbody="m" aria-pressed="' +
      (R.body !== "f") +
      '">남</button><button type="button" data-rbody="f" aria-pressed="' +
      (R.body === "f") +
      '">여</button></div></div></div>';
    h +=
      "<h4>능력</h4><div class=\"grid\">" +
      row("공격력", atk()) +
      row("하트", maxHp()) +
      row("막기", S.def + "%") +
      row("치명타", S.crit + "%") +
      row("경험치", "+" + S.exp + "%") +
      row("금화", "+" + S.gold + "%") +
      row("별빛 가루", "+" + S.dust + "%") +
      row("처치 회복", S.heal ? "하트 " + S.heal : "-") +
      "</div><p class=\"hint\">공격력 = 무기 + 레벨 보너스(레벨마다 +2) + 장비 추가 능력. 막기는 틀렸을 때 피해를 줄여 줘요.</p>";
    h +=
      "<h4>입고 있는 것</h4>" +
      ["w", "o", "c1", "c2"]
        .map((sl) => {
          const it = rpgGet(R.eq[sl]);
          return '<div class="it"><span><small>' + SLOTN[sl] + "</small>" + (it ? rpgName(it) + "<small>" + statText(itemStats(it)) + "</small>" : "<b>없음</b>") + "</span></div>";
        })
        .join("");
    // 원래 내 정보(진행 기록·나침반)는 아래에
    const old = me0();
    const i = old.indexOf('<div class="grid">');
    // 위에 이미 있는 레벨·하트·공격력은 빼고(같은 정보를 두 번 보이지 않게)
    const rest = (i >= 0 ? old.slice(i) : old).replace(/<div class="st"><span>(레벨|하트|공격력)<\/span><b>[^<]*<\/b><\/div>/g, "");
    return h + "<h4>모험 기록</h4>" + rest;
  };
}

/* ── 패널: 장비(가방) ── */
function itemRow(it, btns) {
  const d = itemDef(it.id),
    S = itemStats(it),
    low = (d.lv || 1) > save.lv;
  let cmp = "";
  if (d.s === "w" || d.s === "o") {
    const cur = rpgGet(save.rpg.eq[d.s]);
    if (cur && cur.u !== it.u) {
      const C = itemStats(cur),
        k = d.s === "w" ? "atk" : "def",
        df = S[k] - C[k];
      if (df) cmp = '<em class="' + (df > 0 ? "up" : "dn") + '">' + (df > 0 ? "▲" : "▼") + Math.abs(df) + " " + SUBS[k].n + "</em>";
    }
  }
  return (
    '<div class="it ri"><span>' +
    rpgName(it) +
    "<small>" +
    (d.lv ? '<i class="' + (low ? "lvno" : "") + '">Lv ' + d.lv + "</i> · " : "") +
    (statText(S) || (d.s === "d" ? "마이룸에 놓는 가구" : "")) +
    "</small>" +
    cmp +
    "</span><span class=\"rb\">" +
    btns +
    "</span></div>"
  );
}
PANEL.eq = function () {
  const R = save.rpg;
  let h =
    "<h4>입고 있는 것</h4>" +
    ["w", "o", "c1", "c2"]
      .map((sl) => {
        const it = rpgGet(R.eq[sl]);
        return it
          ? itemRow(it, sl === "w" ? "" : '<button type="button" data-runeq="' + sl + '">빼기</button>').replace("<span>", "<span><small>" + SLOTN[sl] + "</small>")
          : '<div class="it"><span><small>' + SLOTN[sl] + "</small><b>없음</b></span></div>";
      })
      .join("");
  const F = [
    ["all", "전체"],
    ["w", "무기"],
    ["o", "옷"],
    ["c", "장신구"],
    ["d", "가구"],
  ];
  const list = R.bag
    .filter((it) => !rpgEquipped(it.u) && (RP.filt === "all" || slotOf(it) === RP.filt))
    .sort((a, b) => {
      const A = itemDef(a.id),
        Bd = itemDef(b.id);
      return A.s.localeCompare(Bd.s) || (Bd.lv || 0) - (A.lv || 0) || b.g - a.g;
    });
  h +=
    "<h4>가방 " +
    R.bag.length +
    " / " +
    BAG_MAX +
    ' · 금화 ' +
    save.gold +
    '</h4><div class="rfilt">' +
    F.map(([k, n]) => '<button type="button" data-rfilt="' + k + '" aria-pressed="' + (RP.filt === k) + '">' + n + "</button>").join("") +
    "</div>" +
    (list.length
      ? list
          .map((it) => {
            const d = itemDef(it.id),
              placed = rpgPlaced(it.u);
            const b =
              d.s === "d"
                ? placed
                  ? "<small>방에 있음</small>"
                  : '<button type="button" data-rplace="' + it.u + '">놓기</button>'
                : '<button type="button" data-req="' + it.u + '"' + ((d.lv || 1) > save.lv || (d.s === "w" && d.job !== save.job) ? ' aria-disabled="true"' : "") + ">장착</button>";
            const sp = sellPrice(it);
            return itemRow(it, b + (sp && !placed ? '<button type="button" class="sell" data-rsell="' + it.u + '">팔기 ' + sp + "</button>" : ""));
          })
          .join("")
      : '<p class="hint">몬스터를 물리치거나 보물 상자를 열면 장비가 나와요. 상점에서도 살 수 있어요.</p>');
  return h + '<p class="hint">등급: <b style="color:' + GCOL(0) + '">일반</b> · <b style="color:' + GCOL(1) + '">레어</b> · <b style="color:' + GCOL(2) + '">유니크</b> · <b style="color:' + GCOL(3) + '">레전드</b> — 등급이 높을수록 능력이 크고 추가 능력이 붙어요.</p>';
};

/* ── 패널: 상점 ── */
PANEL.shop = function () {
  const ids = shopStock(),
    rare = shopRare(),
    sec = (s, n) => {
      const L = ids.filter((id) => ITEMS[id].s === s);
      if (!L.length) return "";
      return (
        "<h4>" +
        n +
        "</h4>" +
        L.map((id) => {
          const d = ITEMS[id],
            lock = (d.lv || 1) > save.lv;
          return itemRow(
            { u: -1, id, g: 0, s: [] },
            lock ? "<small>Lv " + d.lv + "부터</small>" : '<button type="button" data-rbuy="' + id + '"' + (save.gold < d.price ? ' aria-disabled="true"' : "") + ">금화 " + d.price + "</button>",
          );
        }).join("")
      );
    };
  let h = '<p class="hint">금화 <b style="color:#ffd86b">' + save.gold + "</b> · 상점 물건은 일반 등급이에요. 레어 이상은 몬스터·보물 상자·오늘의 레어에서 나와요.</p>";
  if (rare && save.job)
    h +=
      "<h4>오늘의 레어 (하루 한 번)</h4>" +
      itemRow({ u: -1, id: rare, g: 1, s: [] }, save.rpg.rareDay === Math.floor(Date.now() / 864e5) ? "<small>오늘 샀어요</small>" : '<button type="button" data-rbuyr="' + rare + '">금화 ' + ITEMS[rare].price * 3 + "</button>").replace(
        "<small>",
        "<small>추가 능력 1줄이 무작위로 붙어요 · ",
      );
  return h + (save.job ? sec("w", "무기 · " + JOB[save.job].n) : '<p class="hint">무기는 직업을 얻은 뒤에 살 수 있어요.</p>') + sec("o", "옷") + sec("c", "장신구") + sec("d", "마이룸 가구");
};

/* ── 패널: 꾸미기 ── */
PANEL.deco = function () {
  const R = save.rpg,
    mine = R.bag.filter((it) => itemDef(it.id).s === "d");
  return (
    '<p class="hint">가구를 골라 「놓기」를 누르면 마이룸에서 내 앞 칸에 놓을 수 있어요(조사 키로 놓기, Esc 취소). 놓은 가구 앞에서 조사하면 치울 수 있어요. 가구는 상점에서 사요.</p>' +
    (mine.length
      ? mine
          .map((it) =>
            itemRow(it, rpgPlaced(it.u) ? '<button type="button" data-runplace="' + it.u + '">치우기</button>' : '<button type="button" data-rplace="' + it.u + '">놓기</button>'),
          )
          .join("")
      : '<p class="hint">아직 가구가 없어요.</p>')
  );
};
TABS.splice(TABS.findIndex((t) => t[0] === "eq") + 1, 0, ["shop", "상점"], ["deco", "꾸미기"]);

{
  const rp0 = renderPanel;
  renderPanel = function () {
    rp0();
    const c = document.querySelector('#pc canvas[data-me]');
    if (c) {
      const q = c.getContext("2d"),
        k = rpgLook(),
        im = HDA.chars[k] && hdImg("chars/" + k + "/south.png");
      q.clearRect(0, 0, 68, 68);
      if (im && hdOk(im)) {
        q.imageSmoothingEnabled = false;
        q.drawImage(im, 0, 0);
      }
    }
  };
}
$("panel").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  let did = 1;
  if (d.req) rpgEquip(+d.req);
  else if (d.runeq) save.rpg.eq[d.runeq] = null;
  else if (d.rsell) rpgSell(+d.rsell);
  else if (d.rbuy) rpgBuy(d.rbuy, false);
  else if (d.rbuyr) rpgBuy(d.rbuyr, true);
  else if (d.rfilt) RP.filt = d.rfilt;
  else if (d.rbody) save.rpg.body = d.rbody;
  else if (d.rplace) {
    if (M.id !== "home") return toast("가구는 마이룸에서 놓을 수 있어요");
    RP.place = { u: +d.rplace };
    closePanel();
    toast("놓을 자리로 걸어가서 조사(스페이스)를 눌러요 · Esc 취소");
    return;
  } else if (d.runplace) {
    save.rpg.room = save.rpg.room.filter((r) => r.u !== +d.runplace);
    rpgRoomApply(true);
  } else did = 0;
  if (!did) return;
  pl.hp = Math.min(Math.max(pl.hp, 1), maxHp());
  store();
  hud();
  renderPanel();
});

/* ── 마이룸 꾸미기 ── */
FURD.deco = () => {};
function rpgRoomApply(repaint) {
  const m = MAPS.home;
  if (!m) return;
  (m._dc || []).forEach(([a, y]) => m.O[y][a] === "U" && (m.O[y][a] = ""));
  m._dc = [];
  m.fur = (m.fur || []).filter((f) => f.id !== "deco");
  save.rpg.room.forEach((r) => {
    const it = rpgGet(r.u),
      d = it && itemDef(it.id);
    if (!d) return;
    m.fur.push({ id: "deco", x: r.x, y: r.y, w: 1, h: 1, act: "deco", u: r.u, n: d.n + " 치우기" });
    if (!d.walk) {
      m.O[r.y][r.x] = "U";
      m._dc.push([r.x, r.y]);
    }
  });
  if (repaint && M === m && typeof hdRepaint === "function") hdRepaint();
}
{
  const pm1 = paintMap;
  paintMap = function (m) {
    pm1(m);
    if (m.id !== "home") return;
    const bc = m.base.getContext("2d");
    save.rpg.room.forEach((r) => {
      const it = rpgGet(r.u),
        d = it && itemDef(it.id),
        A = d && HDA.props[d.art],
        im = A && hdImg("props/" + d.art + ".png");
      if (A && hdOk(im)) hdPut(bc, im, A.w / 2, A.b[3], r.x * T + 8, r.y * T + 16);
      else if (d) {
        P(bc, r.x * T + 3, r.y * T + 5, 10, 10, "#a8742a");
        P(bc, r.x * T + 4, r.y * T + 6, 8, 3, "#d9b884");
      }
    });
  };
  const lm1 = loadMap;
  loadMap = function (id, tx, ty, quiet) {
    if (id === "home") rpgRoomApply(false);
    return lm1(id, tx, ty, quiet);
  };
  const fa0 = furAct;
  furAct = function (f) {
    if (f.act !== "deco") return fa0(f);
    const it = rpgGet(f.u);
    openDlg({ n: "꾸미기" }, [(it ? itemDef(it.id).n : "가구") + "을(를) 어떻게 할까요?"], null, [
      [
        "치워서 가방에 넣기",
        () => {
          save.rpg.room = save.rpg.room.filter((r) => r.u !== f.u);
          rpgRoomApply(true);
          store();
        },
      ],
      ["그대로 두기", () => {}],
    ]);
  };
}
function rpgPlaceTile() {
  const fx = pl.face === "s" ? pl.dir : 0,
    fy = pl.face === "d" ? 1 : pl.face === "u" ? -1 : 0;
  const a = Math.floor(pl.x / T) + fx,
    y = Math.floor((pl.y - 2) / T) + fy;
  const ok = M.id === "home" && G[y] && G[y][a] === "F" && !O[y][a] && y < MH - 2 && !save.rpg.room.some((r) => r.x === a && r.y === y);
  return { a, y, ok };
}
function rpgPlaceHere() {
  const p = rpgPlaceTile();
  if (!p.ok) return toast("여기에는 놓을 수 없어요. 빈 바닥을 바라보고 눌러요");
  save.rpg.room.push({ u: RP.place.u, x: p.a, y: p.y });
  RP.place = null;
  rpgRoomApply(true);
  store();
  sfx("ok");
  toast("놓았어요! 또 놓으려면 꾸미기 탭으로");
}
addEventListener("keydown", (e) => {
  if (RP.place && e.key === "Escape") {
    RP.place = null;
    toast("놓기를 그만뒀어요");
  }
  // I: 어디서든 장비 열기
  if ((e.key === "i" || e.key === "I" || e.code === "KeyI") && !busy && $("panel").hidden && !e.target.closest("input,select,textarea")) openPanel("eq");
});
{
  const fx0 = drawFx;
  drawFx = function () {
    fx0();
    if (!RP.place) return;
    if (M.id !== "home") {
      RP.place = null;
      return;
    }
    const p = rpgPlaceTile(),
      it = rpgGet(RP.place.u),
      d = it && itemDef(it.id),
      A = d && HDA.props[d.art],
      X = p.a * T - cam.x,
      Y = p.y * T - cam.y;
    x.globalAlpha = 0.55;
    if (A) hdPut(x, hdImg("props/" + d.art + ".png"), A.w / 2, A.b[3], X + 8, Y + 16);
    x.globalAlpha = 0.35 + 0.15 * Math.sin(fr / 3);
    P(x, X, Y, T, T, p.ok ? "#7ee07a" : "#ff6a6a");
    x.globalAlpha = 1;
    $("act").hidden = false;
    $("act").textContent = p.ok ? "여기에 놓기" : "놓을 수 없는 자리";
    lastAct = "";
  };
}

/* ── 겉모습: 입은 옷의 그림(없으면 견습생 옷) ── */
function rpgLook() {
  const R = save.rpg,
    o = rpgGet(R.eq.o),
    body = R.body === "f" ? "f" : "m";
  const key = o ? "av-" + body + "-" + o.id.slice(2) : null;
  if (key && HDA.chars[key]) return key;
  if (HDA.chars["av-" + body + "-base"]) return "av-" + body + "-base";
  return "hero-none";
}

/* ── 화면 정리: 왼쪽 위 = 상태·퀘스트(접기), 오른쪽 위 = 버튼·지도, 알림은 가운데 아래 ── */
{
  const st = $("stage"),
    col = document.createElement("div");
  col.className = "lcol";
  st.insertBefore(col, $("hud"));
  col.appendChild($("hud"));
  const qb = document.createElement("div");
  qb.className = "qbox";
  qb.innerHTML = '<button type="button" class="qhead" id="qhead" aria-expanded="true">퀘스트 ▾</button><div id="qlist"></div>';
  col.appendChild(qb);
  $("qlist").appendChild($("h4"));
  $("qlist").appendChild($("trk"));
  const setFold = () => {
    const f = !!UI.qFold;
    $("qlist").hidden = f;
    $("qhead").textContent = f ? "퀘스트 ▸" : "퀘스트 ▾";
    $("qhead").setAttribute("aria-expanded", String(!f));
  };
  $("qhead").onclick = () => {
    UI.qFold = !UI.qFold;
    uiSave();
    setFold();
    st.focus();
  };
  setFold();
  // 장비 버튼(오른쪽 위)
  const eb = document.createElement("button");
  eb.type = "button";
  eb.className = "ftb";
  eb.textContent = "장비 I";
  eb.onclick = () => !busy && openPanel("eq");
  $("homeb").parentNode.insertBefore(eb, $("homeb"));
}
{
  const hud0 = hud;
  hud = function () {
    hud0();
    // 하트가 많으면 숫자로
    const mh = maxHp();
    if (mh > 8) $("h2").textContent = "♥ " + Math.max(0, pl.hp) + "/" + mh + " · Lv " + save.lv;
    const q = $("qlist"),
      any = !$("h4").hidden || !$("trk").hidden;
    q.parentNode.hidden = !any;
  };
}
hud();
