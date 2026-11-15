/* ════════ 다시 하고 싶게 (프롬프트 E, 2026-11-15) ════════
   1) 보스 고유 패턴: 보스·문지기마다 다른 공격 하나. 바닥에 빨간 범위를 먼저 보여 주고(예고), 그 뒤에 친다.
      예고 시간은 어린 학년일수록 길게(3~4학년 2.4초, 5~6학년 1.6초). 답 구슬을 조준하는 동안·대화·문제 중에는 쉬어요.
   2) 오늘의 현상금: 하루 한 번, 가 본 길목 한 곳에 빛나는 특별 몬스터. 잡으면 레어 이상 장비 + 칭호 조각.
   3) 열쇠 조각 상자: 문제를 맞힐 때마다 조각 1개, 10개면 마이룸에 상자. 열면 등급이 드러난다.
   4) 그만둘 때 예고: 마이룸에 들어오거나 메뉴를 열 때 "다음엔 ○○가 기다려요" 한 줄.
   · 붙잡아 두는 장치(출석 줄 세우기, 놓치면 손해)는 넣지 않는다: 현상금은 그날 못 잡아도 벌이 없고, 조각은 사라지지 않는다. */
const LOOP_ST = () => save.st || (save.st = {});

/* ── 1) 보스 고유 패턴 ── */
// kind: ring(둘레) · rain(떨어지는 방울) · dash(돌진) · cross(십자 충격) · volley(부채꼴 탄) · hide(숨었다 튀어나옴) · call(부하+둘레) · chase(따라오는 표식)
const BOSS_PAT = {
  gate: { k: "ring", n: "안개 고리", every: 150 },
  queen: { k: "rain", n: "독 방울 비", every: 130 },
  gren: { k: "dash", n: "그림자 돌진", every: 130 },
  golem: { k: "cross", n: "톱니 충격파", every: 140 },
  kai: { k: "volley", n: "세 갈래 화살", every: 120 },
  mor: { k: "hide", n: "그림자 숨기", every: 150 },
  nox: { k: "call", n: "그림자 부르기", every: 170 },
  noxshade: { k: "chase", n: "잊힘의 표식", every: 130 },
  warden: { k: "cross", n: "탑의 빛줄기", every: 120 },
  noxf: { k: "rain", n: "지우개 비", every: 110 },
};
const BP = { m: null, t: 0, zones: [], kind: "", warn: 0, cool: 90 };
const bpWarn = () => ((studyCfg.grade || 5) <= 4 ? 48 : 32); // 장면 수(50ms) → 2.4초 / 1.6초
function bpBoss() {
  // 가까이(120점 안) 살아 있는 보스
  let best = null,
    bd = 120;
  for (const m of mons) {
    if (m.dead || !MON[m.type] || !MON[m.type].boss) continue;
    const d = Math.hypot(m.x - pl.x, m.y - pl.y);
    if (d < bd) (best = m), (bd = d);
  }
  return best;
}
const bpQuiet = () => busy || mode !== "map" || dl || (typeof ORB === "object" && ORB.on) || B;
function bpStart(m) {
  const P0 = BOSS_PAT[m.type] || BOSS_PAT.gate,
    zs = [];
  const px = pl.x,
    py = pl.y - 4;
  if (P0.k === "ring") zs.push({ c: 1, x: m.x, y: m.y - 4, r: 46, hole: 18 });
  else if (P0.k === "rain") for (let i = 0; i < 4; i++) zs.push({ c: 1, x: px + (i ? (Math.random() - 0.5) * 70 : 0), y: py + (i ? (Math.random() - 0.5) * 40 : 0), r: 13 });
  else if (P0.k === "dash") {
    const an = Math.atan2(py - m.y, px - m.x);
    zs.push({ l: 1, x: m.x, y: m.y - 4, an, len: 130, w: 18 });
  } else if (P0.k === "cross") {
    zs.push({ l: 1, x: m.x - 140, y: m.y - 4, an: 0, len: 280, w: 14 });
    zs.push({ l: 1, x: m.x, y: m.y - 100, an: Math.PI / 2, len: 200, w: 14 });
  } else if (P0.k === "volley") {
    const an = Math.atan2(py - m.y, px - m.x);
    [-0.35, 0, 0.35].forEach((da) => zs.push({ l: 1, x: m.x, y: m.y - 4, an: an + da, len: 140, w: 10 }));
  } else if (P0.k === "hide") {
    m.hidden = 1;
    zs.push({ c: 1, x: px, y: py, r: 22, pop: 1 });
  } else if (P0.k === "call") {
    if (typeof bossMinions === "function" && mons.filter((q) => q.minion && !q.dead).length < 3) bossMinions(m, 1);
    zs.push({ c: 1, x: m.x, y: m.y - 4, r: 40, hole: 16 });
  } else if (P0.k === "chase") zs.push({ c: 1, x: px, y: py, r: 16, follow: 1 });
  BP.m = m;
  BP.zones = zs;
  BP.kind = P0.k;
  BP.warn = bpWarn();
  BP.t = 0;
  toast("⚠ " + MON[m.type].n + " · " + P0.n + "! 빨간 곳에서 비켜요");
}
function bpInZone(z, X, Y) {
  if (z.c) {
    const d = Math.hypot(X - z.x, Y - z.y);
    return d < z.r && !(z.hole && d < z.hole);
  }
  // 선: 시작점에서 각도 an 으로 len 만큼, 폭 w
  const dx = X - z.x,
    dy = Y - z.y,
    u = dx * Math.cos(z.an) + dy * Math.sin(z.an),
    v = -dx * Math.sin(z.an) + dy * Math.cos(z.an);
  return u > -4 && u < z.len && Math.abs(v) < z.w / 2;
}
function bpHit() {
  const m = BP.m,
    hit = BP.zones.some((z) => bpInZone(z, pl.x, pl.y - 4));
  if (BP.kind === "dash" && m) {
    // 보스가 줄을 따라 달려갔다가 돌아온다(그림만)
    m.dashT = 10;
  }
  if (m) m.hidden = 0;
  if (hit && pl.inv <= 0 && pl.z < 5) {
    const MI = MON[m.type] || { dmg: 1 },
      d = typeof takeDmg === "function" ? takeDmg(MI.dmg || 1) : MI.dmg || 1;
    pl.hp -= d;
    pl.inv = 40;
    if (typeof fxHurt === "function") fxHurt(d);
    shakeT = UI.calm ? 0 : 6;
    hud();
    if (pl.hp <= 0) return lose();
    save.hp = pl.hp;
  } else if (!hit) fxPop(pl.x, pl.y - 26, "피했다!", "#9fe0ff");
}
{
  const upB = update;
  update = function () {
    upB();
    if (bpQuiet()) return;
    if (BP.zones.length) {
      // 따라오는 표식은 예고의 앞 절반 동안 나를 따라온다
      BP.zones.forEach((z) => {
        if (z.follow && BP.t < BP.warn / 2) {
          z.x += (pl.x - z.x) * 0.15;
          z.y += (pl.y - 4 - z.y) * 0.15;
        }
      });
      if (++BP.t >= BP.warn) {
        bpHit();
        BP.zones = [];
        BP.cool = (BOSS_PAT[BP.m && BP.m.type] || BOSS_PAT.gate).every;
      }
      return;
    }
    const m = bpBoss();
    if (!m) {
      BP.cool = Math.max(BP.cool, 60);
      return;
    }
    if (--BP.cool <= 0) bpStart(m);
  };
  // 그림: 예고 범위(빨간 바탕 + 깜빡이는 테두리), 숨은 보스
  const fxB = drawFx;
  drawFx = function () {
    fxB();
    if (!BP.zones.length) return;
    const k = BP.t / BP.warn,
      blink = 0.25 + 0.25 * Math.sin(BP.t / (k > 0.7 ? 1.2 : 2.5));
    x.save();
    BP.zones.forEach((z) => {
      x.fillStyle = "rgba(230,50,60," + (0.16 + 0.3 * k) + ")";
      x.strokeStyle = "rgba(255,90,90," + (0.6 + blink) + ")";
      x.lineWidth = 1;
      x.beginPath();
      if (z.c) {
        x.ellipse(z.x - cam.x, z.y - cam.y, z.r, z.r * 0.6, 0, 0, 7);
        if (z.hole) x.ellipse(z.x - cam.x, z.y - cam.y, z.hole, z.hole * 0.6, 0, 7, 0, true);
      } else {
        x.translate(z.x - cam.x, z.y - cam.y);
        x.rotate(z.an);
        x.rect(-4, -z.w / 2, z.len, z.w);
        x.setTransform(HDS, 0, 0, HDS, 0, 0);
      }
      x.fill("evenodd");
      x.stroke();
    });
    // 남은 시간 막대(글자 없이도 보이게 줄어드는 막대 + ! 표시)
    const bx = pl.x - cam.x - 10,
      by = pl.y - cam.y + 3; // 발밑(위쪽 상태 상자와 겹치지 않게)
    P(x, bx, by, 20, 3, "#1e1b3f");
    P(x, bx + 1, by + 1, 18 * (1 - k), 1, "#ff6b7a");
    x.restore();
  };
  // 숨은 보스는 흐리게
  const dmB = typeof drawMon === "function" ? drawMon : null;
  if (dmB)
    drawMon = function (m, ...a) {
      if (m && m.hidden) {
        x.globalAlpha = 0.15;
        dmB(m, ...a);
        x.globalAlpha = 1;
        return;
      }
      dmB(m, ...a);
    };
  // 맵이 바뀌면 패턴 초기화
  const lmB = loadMap;
  loadMap = function (...a) {
    BP.zones = [];
    BP.m = null;
    BP.cool = 90;
    return lmB(...a);
  };
}

/* ── 2) 오늘의 현상금 ── */
const loopDay = () => (typeof logDay === "function" ? logDay() : new Date().toISOString().slice(0, 10));
function bountyToday() {
  const st = LOOP_ST(),
    day = loopDay();
  if (st.bty && st.bty.d === day) return st.bty;
  const seen = Object.keys(save.vis || {}).filter((id) => MAPS[id] && MAPS[id].kind === "route" && (MAPS[id].mons || []).some(([t]) => MON[t] && !MON[t].boss));
  if (!seen.length) return null;
  const h = [...day].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  st.bty = { d: day, map: seen[h % seen.length], got: 0 };
  return st.bty;
}
function bountySpawn() {
  const b = bountyToday();
  if (!b || b.got || M.id !== b.map || mons.some((m) => m.bounty)) return;
  // 그 길목의 가장 센 일반 몬스터를, 들어온 곳에서 조금 떨어진 자리에
  const types = (M.mons || []).map((q) => q[0]).filter((t) => MON[t] && !MON[t].boss);
  if (!types.length) return;
  const t = types.sort((a, c) => (MON[c].hp || 0) - (MON[a].hp || 0))[0],
    src = (M.mons || []).find((q) => q[0] === t),
    X = src[1] * T + 8,
    Y = src[2] * T + 14;
  mons.push({ map: M.id, type: t, x: X, y: Y, hx: X, hy: Y, tx: X, ty: Y, wait: 20, dir: -1, f: 0, mv: false, dead: 0, hit: 0, bounty: 1 });
  setTimeout(() => toast("✦ 오늘의 현상금 몬스터가 이 길목에 있어요! 빛나는 " + MON[t].n), 800);
}
{
  // 현상금 몬스터는 체력 두 배
  const msB = mstat;
  mstat = function (m) {
    const r = msB(m);
    return m && m.bounty ? { ...r, hp: r.hp * 2, n: "현상금 " + r.n } : r;
  };
  const lmQ = loadMap;
  loadMap = function (...a) {
    const r = lmQ(...a);
    bountySpawn();
    return r;
  };
  const winQ = win;
  win = function () {
    const m = B && B.m;
    winQ();
    if (!m || !m.bounty) return;
    const b = bountyToday();
    if (b) b.got = 1;
    const st = LOOP_ST();
    st.bshard = (st.bshard || 0) + 1;
    rpgDrop("chest", save.lv + 1, m.x, m.y - 44); // 레어 이상(chest 표는 일반 0%)
    setTimeout(() => toast("현상금 성공! 칭호 조각 " + st.bshard + "개" + (st.bshard >= 5 ? "" : " · 5개면 칭호 「현상금 사냥꾼」")), 1600);
    if (typeof titleCheck === "function") titleCheck();
    store();
    hud();
  };
  // 빛나는 테두리
  const fxQ = drawFx;
  drawFx = function () {
    fxQ();
    mons.forEach((m) => {
      if (!m.bounty || m.dead) return;
      const X = m.x - cam.x,
        Y = m.y - cam.y;
      x.globalAlpha = 0.45 + 0.25 * Math.sin(fr / 3);
      x.strokeStyle = "#ffd86b";
      x.lineWidth = 1.5;
      x.beginPath();
      x.ellipse(X, Y - 9, 12, 13, 0, 0, 7);
      x.stroke();
      x.globalAlpha = 1;
      if (fr % 8 < 4) P(x, X + 9, Y - 22, 1.5, 1.5, "#fff6d0");
    });
  };
  // 칭호: 현상금 5마리 → 「현상금 사냥꾼」(17-fun 의 TITLES 모양 [종류, 수, 이름, 금화])
  if (typeof TITLES === "object" && !TITLES.some((t) => t[0] === "bounty")) TITLES.push(["bounty", 5, "현상금 사냥꾼", 200]);
  if (typeof dexCounts === "function") {
    const dcB = dexCounts;
    dexCounts = function () {
      return { ...dcB(), bounty: (save.st && save.st.bshard) || 0 };
    };
  }
}

/* ── 3) 열쇠 조각 상자 ── */
const KEY_N = 10;
function keyAdd() {
  const st = LOOP_ST();
  st.key = (st.key || 0) + 1;
  if (st.key >= KEY_N) {
    st.key -= KEY_N;
    st.kbox = (st.kbox || 0) + 1;
    setTimeout(() => toast("🔑 열쇠 조각 10개! 마이룸에 열쇠 상자가 왔어요"), 900);
    if (typeof sfx === "function") sfx("shard");
  }
}
{
  const afK = askField;
  askField = function (MI, title, cb) {
    afK(MI, title, (ok) => {
      if (ok) keyAdd();
      cb(ok);
    });
  };
  const qbK = quizBox;
  quizBox = function (title, dif, ok, bad) {
    qbK(
      title,
      dif,
      () => {
        keyAdd();
        ok();
      },
      bad,
    );
  };
  // 상단 작은 표시: 🔑 3/10 (상자가 있으면 + 상자 수)
  const hudK = hud;
  hud = function () {
    hudK();
    const st = LOOP_ST();
    let el = $("hkey");
    if (!el) {
      el = document.createElement("span");
      el.id = "hkey";
      el.className = "hkey";
      $("h3").after(el);
    }
    el.textContent = "🔑 " + (st.key || 0) + "/" + KEY_N + (st.kbox ? " · 상자 " + st.kbox : "");
    el.title = "문제를 맞히면 열쇠 조각이 모여요. 10개면 마이룸에 상자가 와요";
  };
}
// 마이룸 상자 자리(문 근처 바닥, 걸을 수 있는 칸)
const KBOX_AT = { x: 9 * T + 8, y: 7 * T + 14 };
function kboxNear() {
  return M.id === "home" && (LOOP_ST().kbox || 0) > 0 && Math.hypot(pl.x - KBOX_AT.x, pl.y - KBOX_AT.y) < 22;
}
function kboxOpen() {
  const st = LOOP_ST();
  if (!st.kbox) return;
  st.kbox--;
  busy = true;
  // 등급이 드러나는 연출: ? → 반짝반짝 → 등급
  const g = rollGrade("gate"),
    slot = Math.random() < 0.4 ? "w" : Math.random() < 0.55 ? "o" : "c",
    pool = lootPool(save.lv, save.job, slot).filter((id) => !(slot === "w" && !save.job));
  const el = document.createElement("div");
  el.className = "box kbox";
  el.innerHTML = '<div class="kbq">?</div><p>열쇠 상자를 여는 중…</p>';
  $("stage").appendChild(el);
  if (typeof sfx === "function") sfx("pick");
  setTimeout(() => {
    let txt;
    if (pool.length && Math.random() < 0.4) {
      const id = pool[Math.floor(Math.random() * pool.length)],
        it = rpgAdd(id, g);
      txt = it ? (g ? "[" + GRADES[g].n + "] " : "") + itemDef(id).n : null;
      if (!it) {
        save.gold += 30;
        txt = "가방이 가득 차서 금화 30";
      }
    } else {
      const gd = 10 + curPart() * 6,
        du = 3 + g * 2;
      save.gold += gd;
      save.dust += du;
      txt = "금화 " + gd + " · 별빛 가루 " + du;
    }
    el.classList.add("g" + g);
    el.innerHTML = '<div class="kbq">' + ["★", "★★", "★★★", "★★★★"][g] + '</div><p class="kbg">' + GRADES[g].n + "!</p><p>" + esc(txt) + '</p><button type="button">받기</button>';
    if (g >= 2 && typeof sfx === "function") sfx("lvl");
    el.querySelector("button").onclick = () => {
      el.remove();
      busy = false;
      store();
      hud();
      $("stage").focus();
    };
    el.querySelector("button").focus();
  }, 1100);
}
{
  const iaK = interact;
  interact = function (t) {
    if (kboxNear()) return kboxOpen();
    iaK(t);
  };
  // 상자 그림(그림 파일이 있으면 그것으로)
  const fxK = drawFx;
  drawFx = function () {
    fxK();
    if (M.id !== "home" || !(LOOP_ST().kbox > 0)) return;
    const X = KBOX_AT.x - cam.x,
      Y = KBOX_AT.y - cam.y,
      A = typeof HDA === "object" && HDA.misc && HDA.misc.chest,
      im = A && hdImg("misc/chest.png");
    if (A && HD.on && hdOk(im)) hdPut(x, im, A.w / 2, A.b[3], X, Y);
    else {
      P(x, X - 7, Y - 10, 14, 10, "#8a5a2b");
      P(x, X - 7, Y - 10, 14, 3, "#c08a3e");
      P(x, X - 1, Y - 7, 2, 3, "#ffd86b");
    }
    if (fr % 10 < 5) P(x, X + 6, Y - 14, 1.5, 1.5, "#fff6d0");
    if (kboxNear()) {
      x.font = "6px sans-serif";
      x.fillStyle = "#fff6d0";
      x.textAlign = "center";
      x.fillText("스페이스: 열기", X, Y - 16);
    }
  };
}

/* ── 4) 그만둘 때 예고 ── */
function loopNext() {
  const out = [],
    st = LOOP_ST();
  const g = typeof goal === "function" && goal();
  if (g && g.t) out.push("메인 「" + g.t.replace(/\s*\(.*\)$/, "") + "」");
  const b = bountyToday();
  if (b && !b.got && MAPS[b.map]) out.push("오늘의 현상금(" + MAPS[b.map].n + ")");
  const left = KEY_N - (st.key || 0);
  if (st.kbox) out.push("열어 보지 않은 열쇠 상자 " + st.kbox + "개");
  else out.push("열쇠 상자까지 조각 " + left + "개");
  return "다음엔 " + out.slice(0, 2).join(", ") + "가 기다려요";
}
{
  const lmN = loadMap;
  loadMap = function (id, ...a) {
    const from = M && M.id;
    const r = lmN(id, ...a);
    if (id === "home" && from && from !== "home") setTimeout(() => toast(loopNext()), 1500);
    return r;
  };
  const menu = document.querySelector(".box.menu");
  if (menu) {
    const add = () => {
      if (menu.hidden || menu.querySelector(".mnext") || !save || !M) return;
      const p = document.createElement("p");
      p.className = "mnext";
      p.textContent = loopNext();
      const h = menu.querySelector("h3");
      if (h) h.after(p);
    };
    new MutationObserver(add).observe(menu, { childList: true, attributes: true, attributeFilter: ["hidden"] });
  }
}
/* 퀘스트 상자에 오늘의 현상금 한 줄 */
{
  const q = document.createElement("div");
  q.id = "qbty";
  q.className = "qbty";
  q.hidden = true;
  $("qlist").appendChild(q);
  const hudQ = hud;
  hud = function () {
    hudQ();
    const b = save && save.vis ? bountyToday() : null;
    const show = !!(b && !b.got && MAPS[b.map]);
    q.hidden = !show;
    if (show) q.textContent = "✦ 오늘의 현상금 · " + MAPS[b.map].n;
    if (show) $("qlist").parentNode.hidden = false;
  };
}
