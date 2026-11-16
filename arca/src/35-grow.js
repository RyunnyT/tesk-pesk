/* ════════ RPG 깊이 ① 키우는 선택 (프롬프트 R-1·R-2·R-5, 2026-11-16, docs/작업_프롬프트3_RPG와수학.md) ════════
   R-1 레벨업 선택: 레벨이 오를 때마다 성장 점 1. 힘(공격력 +2) · 체력(최대 하트 +1) · 별빛(맞힐 때 별빛 게이지 +0.5, 4점까지).
       기존 자동 성장(레벨마다 공격 +2, 하트 +1)은 그대로이고 성장 점은 덤. 옛 저장은 지난 레벨만큼 점을 돌려받는다.
       고르는 상자는 전투·대화가 끝난 뒤(busy 가 풀리면) 뜨고 「나중에」 가능. 패널 「나」에서 언제든 고르기·마이룸에서 되돌리기(금화 레벨×20).
   R-2 스킬 강화: 스킬마다 0~2단계, 재료 = 스킬 조각(보스·문지기 1, 도전의 탑 5층마다 1, 현상금 몬스터 1).
       공격 스킬: 1단계 피해 ×1.2, 2단계 ×1.4 + 게이지 -1 / 도움 스킬: 1단계 게이지 -1, 2단계 효과 +1(보호막·회복·힌트·멈춤 시간).
   R-5 쓰러짐의 무게(벌 없이): 연속 무사 기록 save.st.safe(쓰러지지 않고 물리친 몬스터 수), 10·25·50 에서 선물. 쓰러지면 0.
       쓰러질 때 그 맵의 다친 몬스터는 다친 채로 남는다(돌아오면 체력이 그대로).
   저장: save.st.grow = {pow,hp,star,free} · save.st.skup = {스킬번호: 단계} · save.st.skshard · save.st.safe·safeBest·safeGot. 끄기: GROW.auto = false(자동 상자만) */
const GROW = { auto: !navigator.webdriver, pow: 2, hp: 1, star: 0.5, starMax: 4, asked: 0 };
const growSt = () => {
  const st = (save.st = save.st || {});
  if (!st.grow) {
    // 옛 저장: 지난 레벨만큼 점수를 돌려준다
    st.grow = { pow: 0, hp: 0, star: 0, free: Math.max(0, (save.lv || 1) - 1) };
  }
  st.skup = st.skup || {};
  st.skshard = st.skshard || 0;
  st.safe = st.safe || 0;
  st.safeBest = st.safeBest || 0;
  st.safeGot = st.safeGot || {};
  return st;
};
growSt();

/* ── R-1 능력에 더하기: rpgSum(04c) 을 감싼다 → 공격력·하트·내 정보 화면이 모두 따라옴 ── */
{
  const rs0 = rpgSum;
  rpgSum = function () {
    const S = rs0.apply(this, arguments);
    const g = save.st && save.st.grow;
    if (g) {
      S.atk += (g.pow || 0) * GROW.pow;
      S.hp += (g.hp || 0) * GROW.hp;
    }
    return S;
  };
}
// 별빛: 맞힐 때 게이지 +0.5 × 점(모아서 1이 되면 ◆ 하나)
{
  let bank = 0;
  const af0 = askField;
  askField = function (MI, title, cb) {
    return af0.call(this, MI, title, (ok) => {
      const g = save.st && save.st.grow;
      if (ok && g && g.star) {
        bank += Math.min(GROW.starMax, g.star) * GROW.star;
        while (bank >= 1) {
          bank -= 1;
          FLD.g = Math.min(3, FLD.g + 1);
        }
      }
      cb(ok);
    });
  };
}
/* 레벨이 오르면 점 1 */
{
  const g0 = gain;
  gain = function () {
    const lv0 = save.lv;
    const r = g0.apply(this, arguments);
    if (save.lv > lv0) {
      growSt().grow.free += save.lv - lv0;
      store();
    }
    return r;
  };
}
const GROW_OPT = [
  ["pow", "힘", "공격력 +" + GROW.pow, "몬스터를 더 빨리 쓰러뜨려요"],
  ["hp", "체력", "최대 하트 +" + GROW.hp, "덤비기에 맞아도 오래 버텨요"],
  ["star", "별빛", "맞힐 때 별빛 게이지 +" + GROW.star, "스킬을 더 자주 써요(4점까지)"],
];
function growPick(k) {
  const g = growSt().grow;
  if (g.free <= 0) return false;
  if (k === "star" && g.star >= GROW.starMax) return false;
  g[k]++;
  g.free--;
  if (k === "hp") pl.hp = Math.min(maxHp(), pl.hp + GROW.hp);
  store();
  hud();
  return true;
}
function growOpen() {
  const g = growSt().grow;
  if (!g.free || typeof lsOpenBox !== "function") return;
  lsOpenBox(
    lsHead("성장 점 " + g.free + "개", "Lv " + save.lv + " · 무엇을 키울까요?") +
      '<div class="grow">' +
      GROW_OPT.map(([k, n, eff, why]) => {
        const full = k === "star" && g.star >= GROW.starMax;
        return (
          '<button type="button" class="growb" data-grow="' + k + '"' + (full ? " disabled" : "") + "><b>" + n + "</b><span>" + eff + "</span><small>" + why + " · 지금 " + g[k] + "점" + (full ? "(가득)" : "") + "</small></button>"
        );
      }).join("") +
      "</div>" +
      '<div class="lsrow"><button type="button" data-grow="later">나중에</button></div><p class="lstip">패널 「나」에서 언제든 고를 수 있고, 마이룸에서 되돌릴 수 있어요.</p>',
  );
  lsEl.onclick = (e) => {
    const b = e.target.closest("[data-grow]");
    if (!b || b.disabled) return;
    const k = b.dataset.grow;
    if (k === "later") {
      lsEl.onclick = null;
      return lsClose();
    }
    if (growPick(k)) {
      if (typeof sfx === "function") sfx("lvl");
      toast("「" + GROW_OPT.find((o) => o[0] === k)[1] + "」을 키웠어요!");
    }
    if (growSt().grow.free > 0) growOpen();
    else {
      lsEl.onclick = null;
      lsClose();
    }
  };
}
function growReset() {
  const g = growSt().grow,
    used = g.pow + g.hp + g.star,
    cost = save.lv * 20;
  if (!used) return toast("되돌릴 성장 점이 없어요");
  if (M.id !== "home") return toast("마이룸 거울 앞에서 되돌릴 수 있어요");
  if (save.gold < cost) return toast("금화가 " + (cost - save.gold) + " 모자라요");
  save.gold -= cost;
  g.free += used;
  g.pow = g.hp = g.star = 0;
  pl.hp = Math.min(pl.hp, maxHp());
  store();
  hud();
  toast("성장 점 " + g.free + "개를 돌려받았어요. 다시 골라요!");
}
// 전투·대화가 끝나면 상자(자동은 webdriver 에선 꺼짐)
setInterval(() => {
  if (!GROW.auto || busy || mode !== "map" || !save.job) return;
  const g = growSt().grow;
  if (g.free > 0 && GROW.asked !== save.lv) {
    GROW.asked = save.lv;
    growOpen();
  }
}, 700);

/* ── R-2 스킬 강화 ── */
const SKUP_COST = [1, 2]; // 0→1, 1→2
const skIdx = (nm) => (save.job ? SKL[save.job].findIndex((s) => s[0] === nm) : -1);
const skLv = (i) => (i >= 0 ? growSt().skup[i] || 0 : 0);
function skShard(n, why) {
  growSt().skshard += n;
  store();
  toastLater(() => "스킬 조각 +" + n + (why ? " (" + why + ")" : "") + " · 마이룸 책장에서 스킬을 강화해요", 1200);
}
function skUpgrade(i) {
  const st = growSt(),
    lv = st.skup[i] || 0;
  if (lv >= 2) return toast("이미 최대로 강화했어요");
  const c = SKUP_COST[lv];
  if (st.skshard < c) return toast("스킬 조각이 " + (c - st.skshard) + "개 모자라요");
  st.skshard -= c;
  st.skup[i] = lv + 1;
  store();
  if (typeof sfx === "function") sfx("lvl");
  toast("「" + SKL[save.job][i][0] + "」 강화 " + (lv + 1) + "단계!");
}
// 공격 스킬 피해 배수
{
  const fd0 = funDmg;
  funDmg = function (d, ok, m, sk) {
    let r = fd0.apply(this, arguments);
    if (ok && sk && sk.nm) {
      const L = skLv(skIdx(sk.nm));
      if (L) r = Math.round(r * (L >= 2 ? 1.4 : 1.2));
    }
    return r;
  };
}
// 게이지 줄이기·도움 스킬 효과 +1: fieldSkill(17-fun) 을 감싼다
{
  const fs0 = fieldSkill;
  fieldSkill = function (i) {
    const job = save.job,
      k = job && (save.sk || [])[i];
    const t = k != null && SKE[job] && SKE[job][k],
      ef = t && EFF[t],
      L = k != null ? skLv(k) : 0;
    const hit = typeof SK_HIT !== "undefined" && SK_HIT.has(t);
    const cut = ef && ((hit && L >= 2) || (!hit && L >= 1)) ? 1 : 0;
    const c0 = ef ? ef.c : 0,
      g0 = FLD.g,
      sh0 = typeof FUN === "object" ? FUN.shield : 0,
      hp0 = pl.hp;
    if (cut) ef.c = Math.max(1, c0 - 1);
    try {
      fs0.apply(this, arguments);
    } finally {
      if (cut) ef.c = c0;
    }
    // 2단계 도움 스킬: 효과 +1
    if (!hit && L >= 2 && FLD.g < g0) {
      if ((t === "shield" || t === "wall" || t === "guard" || t === "pull") && typeof FUN === "object") FUN.shield = (FUN.shield || 0) + 1;
      if (t === "heal") pl.hp = Math.min(maxHp(), pl.hp + 1);
      if (t === "hint" && typeof FUN === "object") FUN.hint += 1;
      if (t === "push" || t === "sleep") mons.forEach((m) => m.stun > 0 && (m.stun += 20));
      if (t === "revive") pl.hp = Math.min(maxHp(), pl.hp + 1);
    }
  };
}
// 조각 얻는 곳: 보스·문지기(win), 도전의 탑 5층마다·현상금(기록이 오른 것을 보고)
{
  const w0 = win;
  win = function () {
    const MI = B && B.MI;
    const r = w0.apply(this, arguments);
    if (MI && MI.boss) skShard(1, "강한 적을 물리침");
    if (MI) {
      const st = growSt();
      st.safe++;
      st.safeBest = Math.max(st.safeBest, st.safe);
      safeGift(st.safe);
    }
    return r;
  };
  setInterval(() => {
    if (!save.st) return;
    const st = growSt();
    const tw = Math.floor((st.towerBest || 0) / 5);
    if (tw > (st.skTower || 0)) {
      skShard(tw - (st.skTower || 0), "도전의 탑");
      st.skTower = tw;
    }
    const bs = st.bshard || 0;
    if (st.skBounty == null) st.skBounty = bs;
    if (bs > st.skBounty) {
      skShard(bs - st.skBounty, "현상금");
      st.skBounty = bs;
    }
  }, 1500);
}

/* ── R-5 무사 기록 · 다친 채 남는 몬스터 ── */
const SAFE_GIFT = { 10: ["heal", 1], 25: ["hint", 2], 50: ["ward", 2] };
function safeGift(n) {
  const st = growSt();
  const g = SAFE_GIFT[n];
  if (!g || st.safeGot[n]) return;
  st.safeGot[n] = 1;
  if (typeof useAdd === "function") useAdd(g[0], g[1], "무사 기록 " + n);
  toastLater(() => "🛡 무사 기록 " + n + "! 선물을 받았어요", 900);
}
const GROW_HURT = {};
{
  const lo0 = lose;
  lose = function () {
    const st = growSt(),
      was = st.safe,
      id = M && M.id;
    // 다친 몬스터 기억
    if (id && (M.kind === "route" || M.kind === "dead"))
      GROW_HURT[id] = mons.filter((m) => !m.dead && m.hpNow != null && !m.minion).map((m) => [m.type, Math.round(m.hx), Math.round(m.hy), m.hpNow]);
    st.safe = 0;
    st.safeGot = {};
    const r = lo0.apply(this, arguments);
    toast("쓰러졌어요… 무사 기록 " + was + "에서 멈췄어요. 마이룸에서 쉬고 다시 도전해요!");
    return r;
  };
  const lm0 = loadMap;
  loadMap = function (id) {
    const r = lm0.apply(this, arguments);
    const H = GROW_HURT[id];
    if (H) {
      H.forEach(([t, hx, hy, hp]) => {
        const m = mons.find((q) => q.type === t && Math.round(q.hx) === hx && Math.round(q.hy) === hy && !q.dead);
        if (m) m.hpNow = hp;
      });
      delete GROW_HURT[id];
    }
    return r;
  };
}

/* ── 패널: 「나」에 성장 점, 책장(스킬)에 강화 ── */
{
  const me0 = PANEL.me;
  PANEL.me = function () {
    const g = growSt().grow,
      st = growSt();
    return (
      me0.apply(this, arguments) +
      '<h4>성장 점</h4><div class="it"><span><small>힘 ' + g.pow + " · 체력 " + g.hp + " · 별빛 " + g.star + "</small><b>남은 점 " + g.free + "개</b><small>무사 기록 " + st.safe + " (최고 " + st.safeBest + ")</small></span>" +
      (g.free ? '<button type="button" data-growopen="1">고르기</button>' : "") +
      "</div>" +
      (g.pow + g.hp + g.star
        ? '<div class="it"><span><small>마이룸에서만 · 금화 ' + save.lv * 20 + "</small><b>성장 점 되돌리기</b></span><button type=\"button\" data-growreset=\"1\"" + (M.id !== "home" ? ' aria-disabled="true"' : "") + ">되돌리기</button></div>"
        : "")
    );
  };
  const sk0 = PANEL.skill;
  PANEL.skill = function () {
    let h = sk0.apply(this, arguments);
    const job = save.job;
    if (!job) return h;
    const st = growSt();
    const L = SKL[job]
      .map((s, i) => [s, i])
      .filter(([, i]) => skLearned(i) && i !== STUDY[job] && EFF[SKE[job][i]]);
    if (!L.length) return h;
    h +=
      '<h4>스킬 강화 · 조각 ' + st.skshard + "개</h4><p class=\"hint\">조각은 보스·문지기, 도전의 탑 5층마다, 현상금 몬스터에서 얻어요. 공격 스킬: 1단계 피해 ×1.2 · 2단계 ×1.4 + 게이지 -1 / 도움 스킬: 1단계 게이지 -1 · 2단계 효과 +1</p>" +
      L.map(([s, i]) => {
        const lv = st.skup[i] || 0;
        return (
          '<div class="it"><span><small>강화 ' + "★".repeat(lv) + "☆".repeat(2 - lv) + "</small><b>" + s[0] + "</b></span>" +
          (lv >= 2 ? "<em>최대</em>" : '<button type="button" data-skup="' + i + '"' + (st.skshard < SKUP_COST[lv] ? ' aria-disabled="true"' : "") + ">조각 " + SKUP_COST[lv] + "</button>") +
          "</div>"
        );
      }).join("");
    return h;
  };
  // 패널 단추(07-engine 의 처리보다 먼저)
  $("panel").addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const d = b.dataset;
      if (d.skup != null) {
        e.stopPropagation();
        skUpgrade(+d.skup);
        renderPanel();
      } else if (d.growopen) {
        e.stopPropagation();
        closePanel();
        setTimeout(growOpen, 30);
      } else if (d.growreset) {
        e.stopPropagation();
        growReset();
        renderPanel();
      }
    },
    true,
  );
}
{
  const st = document.createElement("style");
  st.textContent =
    ".grow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.growb{display:flex;flex-direction:column;gap:3px;padding:10px 6px;border-radius:10px;border:1px solid #f5e3a3;background:rgba(61,52,112,.85);color:#fff6d6;font:inherit;cursor:pointer}" +
    ".growb b{font-size:1.15em;color:#ffd86b}.growb small{opacity:.8;font-size:.8em}.growb:disabled{opacity:.4}body.mobile .grow{grid-template-columns:1fr}";
  document.head.appendChild(st);
}
