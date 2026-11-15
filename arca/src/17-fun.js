/* ════════ 한 판만 더 (2026-11-15, docs/작업_프롬프트.md 의 A) ════════
   1) 스킬을 진짜로 다르게: 효과 18종(범위·관통·연타·기절·독·밀치기·끌어오기·보호막·버티기·힌트·펫 합동…)을 직업 색에 맞게 나눈다.
      기사=지키기·버티기 · 전사=범위·연타 · 마법사=상태 이상·원거리 · 궁수=관통·연사
   2) 연속 정답 콤보: 3연속부터 피해 +20%, 5연속마다 필살기(피해 2배). 끊기면 "아깝다!" 한 줄. 최고 기록은 save.st.bestCombo
   3) 도감(몬스터·장비·지문)과 칭호: 빈칸이 보이고, 반·전부 채우면 칭호와 보상
   4) 숫자 직접 넣기: 깊은 길목(단계 4~5)과 보스 3단계에서 숫자 답 문제는 숫자 판으로 직접 넣는다
   기존 함수는 감싸기로 늘린다. 09-field.js 는 skMul·funDmg·skillAfter·takeDmg 를 부른다. */

/* ── 1) 스킬 ── */
Object.assign(EFF, {
  hit2: { c: 2, d: "공격력 1.5배 한 방" },
  hit3: { c: 3, d: "공격력 2배 한 방" },
  ult: { c: 3, d: "공격력 3배 + 주변 몬스터에 절반" },
  aoe: { c: 2, d: "가까운 몬스터 모두에게 공격력 1.2배" },
  aoe2: { c: 3, d: "넓은 범위 몬스터 모두에게 공격력 1.5배" },
  pierce: { c: 2, d: "바라보는 쪽 한 줄의 몬스터를 모두 꿰뚫기(1.5배)" },
  multi: { c: 2, d: "문제 하나로 세 번 공격(모두 2.4배)" },
  stun: { c: 2, d: "공격력 1배 + 몬스터 4초 멈춤" },
  sleep: { c: 3, d: "주변 몬스터 모두 5초 잠재우기" },
  poison: { c: 2, d: "공격력 1배 + 독(3초 동안 조금씩)" },
  push: { c: 1, d: "가까운 몬스터를 밀치고 2초 멈춤(문제 없음)" },
  pull: { c: 1, d: "주변 몬스터를 끌어오고 다음 부딪힘 1번 막기" },
  berserk: { c: 2, d: "잃은 하트가 많을수록 센 한 방(최대 3배)" },
  shield: { c: 2, d: "보호막 하트 +2(먼저 닳아요)" },
  wall: { c: 3, d: "보호막 하트 +4 + 다음 부딪힘 막기" },
  revive: { c: 2, d: "이 맵에서 쓰러질 때 한 번 하트 1로 버티기" },
  heal: { c: 2, d: "하트 2 + 레벨 4마다 1 더 회복" },
  guard: { c: 1, d: "다음 부딪힘 1번 막기" },
  double: { c: 2, d: "다음 공격 피해 2배" },
  hint: { c: 1, d: "다음 문제 3개 동안 틀린 보기 하나 지우기" },
  petjoint: { c: 2, d: "펫과 함께 공격력 2배(펫이 없으면 1.5배)" },
});
// 이름(SKL)은 그대로, 효과만 다시 짠다. 'p' 는 늘 켜진 공부 도움 스킬(STUDY)
Object.assign(SKE, {
  knight: ["guard", "p", "pull", "push", "berserk", "shield", "revive", "hit3", "heal", "petjoint", "wall", "ult"],
  warrior: ["hit2", "p", "aoe", "pierce", "revive", "multi", "heal", "aoe2", "hit3", "petjoint", "berserk", "ult"],
  mage: ["hit2", "guard", "stun", "p", "shield", "aoe", "hint", "heal", "sleep", "petjoint", "push", "ult"],
  archer: ["multi", "guard", "hit2", "multi", "p", "aoe", "hint", "pierce", "poison", "petjoint", "aoe2", "ult"],
});
const SK_HIT = new Set(["hit2", "hit3", "ult", "aoe", "aoe2", "pierce", "multi", "stun", "poison", "berserk", "petjoint"]);
function skMul(t) {
  if (t === "berserk") return 1 + 2 * (1 - Math.max(0, pl.hp) / maxHp());
  if (t === "petjoint") return save.pet ? 2 : 1.5;
  return { hit2: 1.5, hit3: 2, ult: 3, aoe: 1.2, aoe2: 1.5, pierce: 1.5, multi: 2.4, stun: 1, poison: 1 }[t] || 1.5;
}
// 화면 효과는 비슷한 기존 효과를 빌린다
const SK_VIS = { aoe: "hit3", aoe2: "ult", pierce: "hit2", multi: "hit2", stun: "hit2", poison: "hit2", berserk: "hit3", petjoint: "hit3", sleep: "guard", push: "guard", pull: "guard", shield: "guard", wall: "guard", revive: "heal", hint: "double" };
const FUN = { shield: 0, revive: 0, hint: 0 };
const near1 = (reach) => {
  let best = null,
    bd = reach;
  mons.forEach((m) => {
    if (m.dead) return;
    const d = Math.hypot(m.x - pl.x, m.y - pl.y);
    if (d < bd) {
      bd = d;
      best = m;
    }
  });
  return best;
};
const around = (cx, cy, r, but) => mons.filter((m) => !m.dead && m !== but && Math.hypot(m.x - cx, m.y - cy) < r);
fieldSkill = function (i) {
  if (busy || mode !== "map") return;
  const job = save.job;
  if (!job) return toast("먼저 스승님께 직업을 배워요");
  if (i >= slots()) return toast(SKEY[i] + " 칸은 Lv " + [1, 3, 5, 7][i] + "에 열려요");
  const k = (save.sk || [])[i];
  if (k == null) return toast(SKEY[i] + " 칸이 비어 있어요. 마이룸 책장에서 스킬을 장착해요");
  const t = SKE[job][k],
    nm = SKL[job][k][0],
    ef = EFF[t];
  if (!ef) return toast("「" + nm + "」 스킬은 늘 저절로 발동해요");
  if (FLD.g < ef.c) return toast("별빛 게이지가 모자라요(" + "◆".repeat(FLD.g) + "◇".repeat(ef.c - FLD.g) + "). 문제를 맞혀 채워요");
  if (SK_HIT.has(t)) {
    const reach = job === "archer" || job === "mage" || t === "pierce" ? 80 : t === "aoe" || t === "aoe2" ? 48 : 34;
    const best = near1(reach);
    if (!best) return toast("「" + nm + "」이 닿을 만큼 가까운 몬스터가 없어요");
    FLD.g -= ef.c;
    hud();
    B = { m: best, MI: mstat(best), hp: best.hpNow == null ? mstat(best).hp : best.hpNow, g: FLD.g, core: best.core, field: 1 };
    fxSkill(SK_VIS[t] || t, nm);
    busy = true;
    setTimeout(() => {
      busy = false;
      fieldStrike(best, { t, nm });
    }, 380);
    return;
  }
  // 문제 없이 바로 쓰는 스킬
  FLD.g -= ef.c;
  fxSkill(SK_VIS[t] || t, nm);
  let msg = "";
  if (t === "guard") (FLD.guard = 1), (msg = "다음에 부딪히는 공격을 막아요");
  if (t === "double") (FLD.dbl = 1), (msg = "다음 공격 피해 두 배");
  if (t === "heal") {
    const h = 2 + Math.floor(save.lv / 4);
    pl.hp = Math.min(maxHp(), pl.hp + h);
    msg = "하트 " + h + " 회복";
  }
  if (t === "shield" || t === "wall") {
    FUN.shield += t === "wall" ? 4 : 2;
    if (t === "wall") FLD.guard = 1;
    msg = "보호막 하트 " + FUN.shield;
  }
  if (t === "revive") (FUN.revive = M.id), (msg = "이 맵에서 한 번 버텨요");
  if (t === "hint") (FUN.hint = 3), (msg = "다음 문제 3개는 틀린 보기 하나가 지워져요");
  if (t === "push" || t === "sleep") {
    const L = around(pl.x, pl.y, t === "sleep" ? 80 : 44);
    L.forEach((m) => {
      if (t === "push") {
        const d = Math.hypot(m.x - pl.x, m.y - pl.y) || 1;
        if (!MON[m.type].boss) tryMove(m, ((m.x - pl.x) / d) * 26, ((m.y - pl.y) / d) * 26, false);
      }
      m.stun = Math.max(m.stun || 0, MON[m.type].boss ? 20 : t === "sleep" ? 100 : 40);
    });
    msg = L.length ? L.length + "마리를 " + (t === "sleep" ? "재웠어요" : "밀쳤어요") : "가까운 몬스터가 없어요";
  }
  if (t === "pull") {
    const L = around(pl.x, pl.y, 96).filter((m) => !MON[m.type].boss);
    L.forEach((m) => {
      const d = Math.hypot(m.x - pl.x, m.y - pl.y) || 1;
      tryMove(m, ((pl.x - m.x) / d) * Math.max(0, d - 22), ((pl.y - m.y) / d) * Math.max(0, d - 22), false);
    });
    FLD.guard = 1;
    msg = L.length + "마리를 끌어왔어요 · 다음 부딪힘 막기";
  }
  save.hp = pl.hp;
  store();
  hud();
  toast(nm + "! " + msg);
};
// 맞힌 뒤 스킬 뒷효과: 범위·관통·기절·독
function skillAfter(sk, m, d, ok) {
  const t = sk.t,
    hits = [];
  if (t === "aoe" || t === "aoe2" || t === "ult") around(m.x, m.y, t === "aoe" ? 44 : t === "aoe2" ? 70 : 50, m).forEach((o) => hits.push([o, t === "ult" ? Math.round(d / 2) : d]));
  if (t === "pierce") {
    const dx = m.x - pl.x,
      dy = m.y - pl.y,
      L = Math.hypot(dx, dy) || 1;
    mons.forEach((o) => {
      if (o === m || o.dead) return;
      const px = o.x - pl.x,
        py = o.y - pl.y,
        along = (px * dx + py * dy) / L,
        side = Math.abs(px * dy - py * dx) / L;
      if (along > 0 && along < 130 && side < 14) hits.push([o, d]);
    });
  }
  if (t === "multi") for (let i = 1; i < 3; i++) setTimeout(() => fxPop(m.x + (i - 1) * 6, m.y - 30 - i * 6, Math.round(d / 3), "#ffe14a"), i * 110);
  if (t === "stun") m.stun = ok ? 80 : 40;
  if (t === "poison") m.poison = { n: 3, t: 20, d: Math.max(1, Math.round(atk() * 0.3)) };
  if (t === "petjoint" && save.pet) fxPop(m.x, m.y - 40, jo(save.pet.name, "과", "와") + " 함께!", "#9fe0ff");
  hits.forEach(([o, dd]) => {
    if (o.hpNow == null) o.hpNow = mstat(o).hp;
    o.hpNow -= dd;
    if (MON[o.type].boss) o.hpNow = Math.max(1, o.hpNow);
    o.hit = 10;
    fxPop(o.x, o.y - 22, dd, "#ffe14a");
  });
  // 같이 맞은 몬스터가 쓰러졌으면 본 공격이 끝난 뒤 하나씩 보상
  // 다른 공격·문제가 진행 중이면 끝날 때까지 기다렸다가 처리한다(전투 정보 B 가 겹치지 않게)
  const dead = hits.map(([o]) => o).filter((o) => o.hpNow <= 0);
  const flush = () => {
    if (busy || B) return setTimeout(flush, 250);
    dead.forEach((o) => {
      if (o.dead || o.hpNow > 0) return;
      o.hpNow = null;
      B = { m: o, MI: mstat(o), hp: 0, g: FLD.g, core: o.core, field: 1 };
      win();
      B = null;
      busy = false;
    });
    hud();
  };
  if (dead.length) setTimeout(flush, 650);
}
// 보호막·버티기
function takeDmg(d) {
  if (FUN.shield > 0) {
    const a = Math.min(FUN.shield, d);
    FUN.shield -= a;
    d -= a;
    fxPop(pl.x, pl.y - 30, "보호막 -" + a, "#9fe0ff");
  }
  if (d > 0 && pl.hp - d <= 0 && FUN.revive === M.id) {
    FUN.revive = 0;
    d = pl.hp - 1;
    fxPop(pl.x, pl.y - 34, "버텼다!", "#ffd86b");
  }
  return Math.max(0, d);
}
// 기절한 몬스터는 움직이지도 부딪히지도 않는다. 독은 1초마다 조금씩(쓰러뜨리지는 않음)
{
  const up1 = update;
  update = function () {
    const st = mons.filter((m) => m.stun > 0).map((m) => [m, m.x, m.y]);
    up1();
    st.forEach(([m, x0, y0]) => {
      m.x = x0;
      m.y = y0;
      m.mv = false;
      m.stun--;
    });
    if (busy) return;
    mons.forEach((m) => {
      if (!m.poison || m.dead) return;
      if (--m.poison.t > 0) return;
      m.poison.t = 20;
      if (m.hpNow == null) m.hpNow = mstat(m).hp;
      const dd = Math.min(m.poison.d, m.hpNow - 1);
      if (dd > 0) {
        m.hpNow -= dd;
        fxPop(m.x, m.y - 24, dd, "#9be07a");
      }
      if (--m.poison.n <= 0) m.poison = null;
    });
  };
  const fc0 = fieldContact;
  fieldContact = function (m) {
    if (m.stun > 0) return;
    fc0(m);
  };
}

/* ── 2) 콤보 ── */
function comboTier(s) {
  return s >= 10 ? 3 : s >= 5 ? 2 : s >= 3 ? 1 : 0;
}
function funDmg(d, ok, m, sk) {
  if (!ok) return d;
  const s = FLD.streak;
  if (s >= 3) d = Math.round(d * 1.2);
  if (s === 3) fxPop(pl.x, pl.y - 34, "3연속! 힘 +20%", "#ffd86b");
  if (s >= 5 && s % 5 === 0) {
    d *= 2;
    fxSkill("ult", s + "연속 필살기");
    fxPop(m.x, m.y - 48, "필살기!", "#ffb84a");
    shakeT = UI.calm ? 0 : 8;
  }
  return d;
}
{
  const af2 = askField;
  askField = function (MI, title, cb) {
    const before = FLD.streak,
      key = Object.keys(MON).find((k) => MON[k].n === MI.n);
    // 숫자 직접 넣기를 쓸 자리인지(깊은 길목·보스 3단계)
    RQ.wantShort = !!(save.job && ((M.tier || 0) >= 4 || (B && B.m && B.m.ph >= 3)) && studyCfg.subj !== "eng");
    af2(MI, title, (ok) => {
      if (key) {
        const dm = dexMon(key);
        if (ok) dm.q++;
      }
      if (ok) {
        save.st.bestCombo = Math.max(save.st.bestCombo || 0, FLD.streak);
      } else if (before >= 3) setTimeout(() => toast("아깝다! " + before + "연속에서 끊겼어요 · 다시 3연속부터 힘이 세져요"), 300);
      cb(ok);
    });
    RQ.wantShort = false;
    if (key) dexMon(key).s = 1;
    // 힌트 스킬: 틀린 보기 하나 지우기(보기는 2개까지만)
    if (FUN.hint > 0 && !RQ.short) {
      const wrong = [...$("bc").children].filter((b) => !b.disabled && !b.hidden && b.dataset.v !== String(RQ.last && RQ.last.a));
      if (wrong.length >= 2) {
        wrong[0].hidden = true;
        FUN.hint--;
        $("bth").textContent += " · 힌트";
      }
    }
    // 콤보 표시
    if (FLD.streak >= 2) $("bth").textContent += " · " + FLD.streak + "연속 중";
  };
}
{
  const fx3 = drawFx;
  drawFx = function () {
    fx3();
    // 콤보는 상단 상태 줄(#hcb)에 늘 보이고, 3·5연속 순간에만 머리 위에 큰 글씨(funDmg)
    // 기절(별)·독(초록 방울)
    mons.forEach((m) => {
      if (m.dead) return;
      const sx = m.x - cam.x,
        sy = m.y - cam.y - (MON[m.type].boss ? 40 : 22);
      if (m.stun > 0) for (let i = 0; i < 3; i++) P(x, sx - 6 + i * 6 + Math.round(Math.sin((fr + i * 3) / 3) * 2), sy - (i % 2), 2, 2, "#ffd86b");
      if (m.poison && fr % 6 < 4) P(x, sx - 3 + (fr % 7), sy + 6 - (fr % 9), 2, 2, "#9be07a");
    });
    if (FUN.shield > 0) {
      x.globalAlpha = 0.25;
      x.strokeStyle = "#9fe0ff";
      x.lineWidth = 1;
      x.beginPath();
      x.ellipse(pl.x - cam.x, pl.y - cam.y - 10, 10, 13, 0, 0, 7);
      x.stroke();
      x.globalAlpha = 1;
    }
  };
  const hud3 = hud;
  hud = function () {
    hud3();
    const hg = $("hg");
    if (hg && !hg.hidden && FUN.shield > 0) hg.textContent += " · 보호막 " + FUN.shield;
    // 콤보 표시: 커질수록 색이 진해진다
    let cb = $("hcb");
    if (!cb) {
      cb = document.createElement("span");
      cb.id = "hcb";
      $("hud").insertBefore(cb, $("h3"));
    }
    const s = FLD.streak;
    cb.hidden = s < 2;
    cb.className = "combo c" + comboTier(s);
    cb.textContent = "🔥 " + s + "연속" + (s >= 3 ? " · 힘 +20%" : "") + (s >= 3 && s % 5 !== 0 ? " · 필살기까지 " + (5 - (s % 5)) : "");
  };
  // 맵을 옮기면 버티기는 사라진다
  const lm2 = loadMap;
  loadMap = function (id, tx, ty, q) {
    if (FUN.revive && FUN.revive !== id) FUN.revive = 0;
    return lm2(id, tx, ty, q);
  };
}

/* ── 3) 도감과 칭호 ── */
const DEXMON = Object.keys(MON);
function dexMon(k) {
  const D2 = (save.dex = save.dex || { mon: {}, item: {} });
  return (D2.mon[k] = D2.mon[k] || { s: 0, k: 0, q: 0 });
}
function dexItemsAll() {
  // 내가 얻을 수 있는 것만: 내 직업 무기 + 옷 + 장신구(이야기 보물 포함) + 가구
  return Object.keys(ITEMS).filter((id) => {
    const d = ITEMS[id];
    return d.s === "w" ? d.job === (save.job || "knight") : true;
  });
}
const TITLES = [
  ["mon", 16, "몬스터 관찰자", 100],
  ["mon", DEXMON.length, "몬스터 박사", 300],
  ["item", 0.5, "수집 견습생", 100],
  ["item", 1, "장비 수집가", 300],
  ["read", 30, "꼬마 독서가", 100],
  ["read", 105, "책벌레", 300],
  ["recov", 10, "기억을 되찾는 자", 150],
  ["combo", 10, "콤보 마스터", 150],
];
function dexCounts() {
  const D2 = save.dex || { mon: {}, item: {} },
    all = dexItemsAll();
  return {
    mon: DEXMON.filter((k) => D2.mon[k] && D2.mon[k].s).length,
    item: all.filter((id) => D2.item[id] != null).length,
    itemAll: all.length,
    read: Object.keys(save.read || {}).length,
    recov: save.st.recov || 0,
    combo: save.st.bestCombo || 0,
  };
}
function titleCheck() {
  const c = dexCounts(),
    got = (save.titles = save.titles || []);
  TITLES.forEach(([k, n, nm, gd]) => {
    const need = k === "item" ? Math.ceil(c.itemAll * n) : n;
    if (got.includes(nm) || c[k] < need) return;
    got.push(nm);
    save.title = nm;
    save.gold += gd;
    save.dust += 5;
    setTimeout(() => toast("칭호 「" + nm + "」! 금화 +" + gd + " · 별빛 가루 +5"), 1200);
    if (typeof sfx === "function") sfx("lvl");
  });
}
{
  const ra0 = rpgAdd;
  rpgAdd = function (id, g, quiet) {
    const it = ra0(id, g, quiet);
    if (it) {
      const D2 = (save.dex = save.dex || { mon: {}, item: {} });
      D2.item[id] = Math.max(D2.item[id] == null ? -1 : D2.item[id], it.g);
      titleCheck();
    }
    return it;
  };
  const win3 = win;
  win = function () {
    const m = B && B.m;
    if (m) {
      const dm = dexMon(m.type);
      dm.s = 1;
      dm.k++;
    }
    win3();
    titleCheck();
  };
  // 이미 가진 장비도 도감에(한 번)
  if (save.rpg && !save.dexInit) {
    save.dexInit = 1;
    save.dex = save.dex || { mon: {}, item: {} };
    save.rpg.bag.forEach((it) => (save.dex.item[it.id] = Math.max(save.dex.item[it.id] == null ? -1 : save.dex.item[it.id], it.g)));
  }
}
const dexImg = (k) => {
  if (HDA.mons[k]) return hdSrc("mons/" + k + ".png");
  const c = typeof HD_BOSSCHAR === "object" && HD_BOSSCHAR[k];
  return c && HDA.chars[c] ? hdSrc("chars/" + c + "/south.png") : null;
};
PANEL.dex = function () {
  const c = dexCounts(),
    D2 = save.dex || { mon: {}, item: {} };
  let h =
    '<p class="hint">칭호: ' +
    ((save.titles || []).length ? (save.titles || []).map((t) => "<b>「" + esc(t) + "」</b>").join(" ") : "아직 없어요") +
    " · 되찾은 기억 " +
    c.recov +
    "개 · 최고 콤보 " +
    c.combo +
    "연속</p>";
  h +=
    "<h4>몬스터 " +
    c.mon +
    " / " +
    DEXMON.length +
    '</h4><div class="dex">' +
    DEXMON.map((k) => {
      const e = D2.mon[k],
        src = dexImg(k);
      return (
        '<div class="dx' +
        (e && e.s ? "" : " no") +
        '">' +
        (src ? '<img src="' + src + '" alt="">' : "<i></i>") +
        "<b>" +
        (e && e.s ? esc(MON[k].n) : "???") +
        "</b><small>" +
        (e && e.s ? "물리침 " + e.k + " · 맞힘 " + e.q : "아직 못 만남") +
        "</small></div>"
      );
    }).join("") +
    "</div>";
  const all = dexItemsAll();
  h +=
    "<h4>장비·가구 " +
    c.item +
    " / " +
    c.itemAll +
    '</h4><div class="dex sm">' +
    all
      .map((id) => {
        const g = D2.item[id],
          d = ITEMS[id] || itemDef(id),
          src = HDA.icons && HDA.icons[id] ? hdSrc("icons/" + id + ".png") : d && d.s === "d" && HDA.props[d.art] ? hdSrc("props/" + d.art + ".png") : null;
        return (
          '<div class="dx' +
          (g == null ? " no" : "") +
          '" title="' +
          esc(d ? d.n : id) +
          '">' +
          (src ? '<img src="' + src + '" alt="">' : "<i></i>") +
          "<b" +
          (g != null ? ' style="color:' + GRADES[g].col + '"' : "") +
          ">" +
          (g == null ? "???" : esc(d.n)) +
          "</b>" +
          (g != null ? "<small>최고 " + GRADES[g].n + "</small>" : "") +
          "</div>"
        );
      })
      .join("") +
    "</div>";
  const spots = allSpots();
  h +=
    "<h4>지문 " +
    c.read +
    " / " +
    spots.length +
    '</h4><p class="hint">다 읽은 지문은 「책」 탭에서 다시 읽을 수 있어요.</p>';
  h +=
    "<h4>칭호 얻는 법</h4>" +
    TITLES.map(([k, n, nm, gd]) => {
      const need = k === "item" ? Math.ceil(c.itemAll * n) : n,
        have = c[k],
        on = (save.titles || []).includes(nm);
      return '<div class="it"><span><b>' + (on ? "✓ " : "") + esc(nm) + "</b><small>" + { mon: "몬스터 도감", item: "장비 도감", read: "지문 읽기", recov: "되찾은 기억", combo: "최고 콤보" }[k] + " " + Math.min(have, need) + " / " + need + " · 금화 " + gd + "</small></span></div>";
    }).join("");
  return h;
};
TABS.splice(TABS.findIndex((t) => t[0] === "pet"), 0, ["dex", "도감"]);
// 내 정보: 칭호·최고 콤보·되찾은 기억
{
  const me2 = PANEL.me;
  PANEL.me = function () {
    let h = me2();
    const extra =
      (save.title ? ' · 칭호 <b style="color:#9fe0c0">「' + esc(save.title) + "」</b>" : "") +
      " · 최고 콤보 " +
      (save.st.bestCombo || 0) +
      " · 되찾은 기억 " +
      (save.st.recov || 0);
    return h.replace(/(전투력 <b[^>]*>\d+<\/b>)/, "$1" + extra);
  };
}

/* ── 4) 숫자 직접 넣기 ── */
{
  const mq1 = makeQ;
  makeQ = function (d) {
    RQ.short = false;
    if (RQ.wantShort && window.QUIZ && Math.random() < 0.5) {
      try {
        const { term, unit } = partUnit(mapPart()),
          units = QUIZ.unitsOf(studyCfg.grade, term),
          nos = units.some((u) => u.no === unit) ? [unit] : null;
        const q = QUIZ.makeQuestion({ grade: studyCfg.grade, term, unitNos: nos, tier: d <= 2 ? 1 : d === 3 ? 2 : 3, contextMode: "plain", responseMode: "short" });
        if (q && q.responseMode === "short" && q.inputKind === "number" && Array.isArray(q.options)) {
          const a = String(q.answer),
            wr = [...new Set(q.options.map(String))].filter((v) => v !== a).slice(0, 2);
          if (wr.length === 2) {
            RQ.short = true;
            save.qn = (save.qn || 0) + 1;
            return (RQ.last = { q: q.q, a, ch: [a, ...wr], unit: q.unit, ex: q.explain || "", short: 1 });
          }
        }
      } catch (e) {}
    }
    return mq1(d);
  };
  // 숫자 판: 보기 버튼은 숨겨 두고, 맞으면 정답 버튼, 틀리면 오답 버튼을 대신 누른다
  const kp = document.createElement("div");
  kp.className = "kp";
  kp.id = "kp";
  kp.hidden = true;
  $("bc").after(kp);
  let val = "";
  const show = () => ($("kpv").textContent = val || " ");
  const submit = () => {
    if (!val) return;
    const q = RQ.last,
      ok = window.QUIZ ? QUIZ.answerKey(val) === QUIZ.answerKey(q.a) : val === q.a,
      bs = [...$("bc").children],
      b = ok ? bs.find((x) => x.dataset.v === String(q.a)) : bs.find((x) => x.dataset.v !== String(q.a));
    kp.hidden = true;
    $("bc").hidden = false;
    if (!ok) $("bm").textContent = "내 답 " + val;
    if (b) b.click();
  };
  kp.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "ok") return submit();
    if (k === "del") val = val.slice(0, -1);
    else if (val.length < 9) val += k;
    show();
  });
  addEventListener(
    "keydown",
    (e) => {
      if (kp.hidden) return;
      if (/^[0-9.]$/.test(e.key) && val.length < 9) val += e.key;
      else if (e.key === "Backspace") val = val.slice(0, -1);
      else if (e.key === "Enter") submit();
      else return;
      show();
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  const af3 = askField;
  askField = function (MI, title, cb) {
    af3(MI, title, cb);
    if (!RQ.short) {
      kp.hidden = true;
      $("bc").hidden = false;
      return;
    }
    val = "";
    $("bc").hidden = true;
    kp.hidden = false;
    $("bth").textContent += " · 숫자를 넣어요";
    kp.innerHTML =
      '<div class="kpv" id="kpv"> </div><div class="kpg">' +
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => '<button type="button" data-k="' + k + '">' + (k === "del" ? "←" : k) + "</button>").join("") +
      '</div><button type="button" class="kpok" data-k="ok">확인 (엔터)</button>';
  };
}
