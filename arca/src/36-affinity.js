/* ════════ RPG 깊이 ② 몬스터 약점 · 숨은 강적 (프롬프트 R-3·R-6, 2026-11-16) ════════
   R-3 몬스터마다 약점 하나(MON[k].weak). 맞혔을 때만 덤(찍기를 부추기지 않게):
     fast ⚡빨리 = 문제가 뜬 뒤 5초 안에 맞히면 ×1.5 (찍기 보호막 shieldT 가 켜져 있으면 무효)
     combo 🔥콤보 = 연속 정답 3 이상이면 ×1.5
     skill ✦스킬 = 스킬 피해 ×1.5, 일반 공격 ×0.8
     first ①첫 타 = 체력이 가득일 때 첫 타 ×2 (그래서 스킬을 아끼다 처음에 쓰면 좋음)
     calm ♻만회 = 틀린 바로 다음 정답 ×1.5 (틀려도 만회)
   같은 길목의 몬스터는 서로 다른 약점이 되게 맞춘다(AFF_PREF → affFix). 조준하면 발밑 표식, 처음 본 약점은 한 줄 안내, 도감에 약점.
   R-6 숨은 강적 3곳(막다른 길 d3·d5·d8): 그 부를 끝낸 뒤에만 나타남. 기존 보스 그림을 색만 바꿔 씀. 물리치면 유니크 장신구 + 스킬 조각 2.
   일지에 「숨은 강적 n/3」. 메인 길 안내는 가리키지 않는다. 끄기: AFF.off = true */
const AFF = { off: false, t0: 0, lastWrong: false };
const WEAK = {
  fast: { i: "⚡", n: "빨리", d: "문제가 뜬 뒤 5초 안에 맞히면 피해 1.5배" },
  combo: { i: "🔥", n: "콤보", d: "연속 정답 3번 이상일 때 피해 1.5배" },
  skill: { i: "✦", n: "스킬", d: "스킬 피해 1.5배(일반 공격은 0.8배)" },
  first: { i: "①", n: "첫 타", d: "체력이 가득일 때 첫 타 피해 2배" },
  calm: { i: "♻", n: "만회", d: "틀린 바로 다음에 맞히면 피해 1.5배" },
};
// 처음 고른 약점(성격에 맞게). 같은 길목에서 겹치면 affFix 가 고친다
const AFF_PREF = {
  slime: "first", rat: "fast", mush: "combo", bat: "fast", jelly: "skill", crab: "first", bog: "calm", hog: "combo",
  wolf: "fast", gear: "skill", shade: "calm", windup: "first", fire: "combo", ink: "calm", wisp: "skill", crow: "fast",
  scare: "first", moth: "calm", sheep: "combo", ice: "skill", ghost: "calm", eraser: "first",
};
function affFix() {
  // 같은 길목에 함께 나오는 몬스터끼리 약점이 겹치지 않게(그래프 색칠 · 처음 고른 약점을 먼저 시도하는 되짚기)
  const kinds = Object.keys(MON).filter((k) => !MON[k].boss);
  const routes = Object.keys(MAPS).filter((id) => MAPS[id].kind === "route" || MAPS[id].kind === "dead");
  const nb = {};
  kinds.forEach((k) => (nb[k] = new Set()));
  routes.forEach((id) => {
    const L = [...new Set(MAPS[id].mons.map((r) => r[0]).filter((t) => MON[t] && !MON[t].boss))];
    L.forEach((a) => L.forEach((b) => a !== b && nb[a] && nb[a].add(b)));
  });
  const W = Object.keys(WEAK),
    order = kinds.slice().sort((a, b) => nb[b].size - nb[a].size),
    res = {};
  const go = (i) => {
    if (i >= order.length) return true;
    const k = order[i],
      pref = AFF_PREF[k] || W[0],
      tries = [pref, ...W.filter((w) => w !== pref)];
    for (const w of tries) {
      if ([...nb[k]].some((q) => res[q] === w)) continue;
      res[k] = w;
      if (go(i + 1)) return true;
      delete res[k];
    }
    return false;
  };
  if (!go(0)) kinds.forEach((k) => (res[k] = res[k] || AFF_PREF[k] || W[0]));
  kinds.forEach((k) => (MON[k].weak = res[k]));
}
affFix();

/* ── 피해 계산 ── */
{
  const af0 = askField;
  askField = function () {
    AFF.t0 = Date.now();
    return af0.apply(this, arguments);
  };
  const nw0 = noteWrong;
  noteWrong = function () {
    AFF.lastWrong = true;
    return nw0.apply(this, arguments);
  };
  const fd0 = funDmg;
  funDmg = function (d, ok, m, sk) {
    let r = fd0.apply(this, arguments);
    if (AFF.off || !m || !MON[m.type]) return r;
    const w = MON[m.type].weak;
    const was = AFF.lastWrong;
    if (ok) AFF.lastWrong = false;
    if (!w || !ok) return r;
    let mul = 1;
    if (w === "fast") {
      const t = (typeof LEARN === "object" && LEARN.ansT > AFF.t0 ? LEARN.ansT : Date.now()) - AFF.t0;
      if (t < 5000 && !(m.shieldT > Date.now())) mul = 1.5;
    } else if (w === "combo" && FLD.streak >= 3) mul = 1.5;
    else if (w === "skill") mul = sk ? 1.5 : 0.8;
    else if (w === "first") {
      const MI = mstat(m);
      if (m.hpNow == null || m.hpNow >= MI.hp) mul = 2;
    } else if (w === "calm" && was) mul = 1.5;
    if (mul !== 1) {
      r = Math.max(1, Math.round(r * mul));
      if (mul > 1 && typeof fxPop === "function") fxPop(m.x, m.y - 40, WEAK[w].i + " 약점!", "#ffd86b");
      const st = save.st || (save.st = {});
      st.weakHit = (st.weakHit || 0) + (mul > 1 ? 1 : 0);
    }
    return r;
  };
}

/* ── 조준하면 머리 위 약점 표식 · 처음 본 약점 안내 ── */
{
  const fx0 = drawFx;
  drawFx = function () {
    fx0.apply(this, arguments);
    if (AFF.off) return;
    const m = (typeof ORB === "object" && ORB.on && ORB.m) || (B && B.m);
    if (!m || m.dead || !MON[m.type] || !MON[m.type].weak) return;
    const w = WEAK[MON[m.type].weak],
      X = Math.round(m.x - cam.x),
      Y = Math.round(m.y - cam.y) + 12; // 발밑(머리 위는 문제 말풍선 자리)
    x.save();
    x.font = "bold 8px sans-serif";
    x.textAlign = "center";
    P(x, X - 12, Y - 7, 24, 10, "rgba(30,27,63,.85)");
    x.fillStyle = "#ffd86b";
    x.fillText(w.i + w.n, X, Y);
    x.restore();
    const st = save.st || (save.st = {});
    st.weakSeen = st.weakSeen || {};
    if (!st.weakSeen[MON[m.type].weak]) {
      st.weakSeen[MON[m.type].weak] = 1;
      toastLater(() => w.i + " " + MON[m.type].n + "의 약점 「" + w.n + "」: " + w.d, 300);
    }
  };
}
// 도감에 약점
{
  const dx0 = PANEL.dex;
  PANEL.dex = function () {
    const h = dx0.apply(this, arguments);
    const met = Object.keys(MON).filter((k) => !MON[k].boss && MON[k].weak && save.dex && save.dex.mon && save.dex.mon[k] && save.dex.mon[k].s);
    if (!met.length) return h;
    return (
      h +
      '<h4>만난 몬스터의 약점</h4><p class="hint">약점에 맞춰 싸우면 피해가 커져요. 맞혔을 때만 커지니 천천히 정확하게!</p>' +
      met.map((k) => '<div class="it"><span><small>' + WEAK[MON[k].weak].i + " " + WEAK[MON[k].weak].n + "</small><b>" + MON[k].n + "</b><small>" + WEAK[MON[k].weak].d + "</small></span></div>").join("")
    );
  };
}

/* ── R-6 숨은 강적 ── */
const XBOSS = {
  d3: { k: "xb_golem", base: "golem", n: "녹슨 광산의 왕 골렘", tint: "sepia(0.6) hue-rotate(-20deg) saturate(1.6)", item: "c_xb1" },
  d5: { k: "xb_gren", base: "gren", n: "그림자 골목의 대장", tint: "hue-rotate(200deg) saturate(1.4) brightness(0.9)", item: "c_xb2" },
  d8: { k: "xb_shade", base: "noxshade", n: "지워진 우물의 그림자", tint: "hue-rotate(120deg) saturate(1.3) brightness(1.1)", item: "c_xb3" },
};
// 보상 장신구(유니크 고정, 상점·전리품에 안 나옴)
Object.assign(ITEMS, {
  c_xb1: { s: "c", n: "광산왕의 톱니 반지", lv: 8, b: { crit: 8, def: 4 }, price: 0, story: 1, fixG: 2 },
  c_xb2: { s: "c", n: "그림자 대장의 망토 핀", lv: 12, b: { crit: 10, exp: 8 }, price: 0, story: 1, fixG: 2 },
  c_xb3: { s: "c", n: "지워진 우물의 별 목걸이", lv: 17, b: { hp: 3, dust: 15 }, price: 0, story: 1, fixG: 2 },
});
(function xbMake() {
  for (const id in XBOSS) {
    const X = XBOSS[id],
      B0 = MON[X.base],
      m = MAPS[id];
    if (!B0 || !m) continue;
    const dr0 = B0.dr;
    MON[X.k] = {
      ...B0,
      n: X.n,
      hp: Math.round(B0.hp * 1.3),
      exp: Math.round(B0.exp * 1.5),
      gold: Math.round((B0.gold || 30) * 1.5),
      xb: id,
      weak: "skill",
      dr(r, ...a) {
        const can = typeof x === "object" && "filter" in x;
        if (can) x.filter = X.tint;
        try {
          dr0.call(this, r, ...a);
        } finally {
          if (can) x.filter = "none";
        }
      },
    };
    if (typeof BOSS_PAT === "object" && BOSS_PAT[X.base]) BOSS_PAT[X.k] = { ...BOSS_PAT[X.base], n: BOSS_PAT[X.base].n + "(강함)" };
    if (typeof HDA === "object" && HDA.mons && HDA.mons[X.base] && typeof HD_ALIAS === "object") HD_ALIAS[X.k] = X.base;
    // 막다른 길 가운데쯤 걸어서 갈 수 있는 자리
    const e0 = m.exits[0],
      R = typeof tReach === "function" ? tReach(m, e0.x0, e0.y0) : null;
    let best = [Math.floor(m.w / 2), Math.floor(m.h / 3)],
      bd = 1e9;
    if (R)
      R.forEach((k) => {
        const [a, y] = k.split(",").map(Number);
        const d = Math.abs(a - m.w / 2) + Math.abs(y - m.h / 3);
        if (a > 3 && y > 2 && a < m.w - 3 && y < m.h - 3 && d < bd) (bd = d), (best = [a, y]);
      });
    m.mons.push([X.k, best[0], best[1]]);
  }
})();
const xbOpen = (id) => {
  const p = typeof MAP_PART === "object" ? MAP_PART[id] : 0;
  return p && partDone(p - 1);
};
{
  const lm0 = loadMap;
  loadMap = function (id) {
    const r = lm0.apply(this, arguments);
    const X = XBOSS[id];
    if (X) {
      if (!xbOpen(id)) mons = mons.filter((m) => m.type !== X.k);
      else if (mons.some((m) => m.type === X.k && !m.dead)) toastLater(() => "⚠ 숨은 강적 「" + X.n + "」이 이곳에 있어요(물리치지 않아도 괜찮아요)", 1200);
    }
    return r;
  };
  const w0 = win;
  win = function () {
    const m = B && B.m;
    const X = m && MON[m.type] && MON[m.type].xb && XBOSS[MON[m.type].xb];
    const r = w0.apply(this, arguments);
    if (X) {
      const st = save.st || (save.st = {});
      st.xboss = st.xboss || {};
      if (!st.xboss[X.k]) {
        st.xboss[X.k] = 1;
        if (typeof rpgGiveStory === "function") rpgGiveStory(X.item);
        if (typeof skShard === "function") skShard(1, "숨은 강적");
        toastLater(() => "🏆 숨은 강적을 물리쳤어요! 유니크 「" + ITEMS[X.item].n + "」 · 스킬 조각", 1500);
        store();
      }
    }
    return r;
  };
  const lg0 = PANEL.log;
  if (lg0)
    PANEL.log = function () {
      const h = lg0.apply(this, arguments);
      const st = save.st || {};
      const n = Object.values(XBOSS).filter((X) => st.xboss && st.xboss[X.k]).length;
      const open = Object.keys(XBOSS).filter(xbOpen).length;
      return h + "<h4>숨은 강적 " + n + " / 3</h4><p class=\"hint\">" + (open ? "막다른 길 어딘가에 강한 적이 기다려요. 물리치지 않아도 이야기는 이어져요." : "부를 끝내면 막다른 길에 강한 적이 나타나요.") + "</p>";
    };
}
