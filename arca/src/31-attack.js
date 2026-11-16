/* ════════ 몬스터 공격 모션 · 보스 범위 공격 · 화난 보스의 무차별 공격 (2026-11-16 선생님 요청) ════════
   1) 일반 몬스터: 가까이(30점 안) 오면 멈춰서 몸을 떨며 「!」(0.7초, 기 모으기) → 그 방향으로 짧게 덤벼듦(0.3초).
      덤벼서 닿거나 몸으로 부딪히면 문제 없이 바로 하트(막기·펫 막기 있음), 내가 비켜서면 헛손질 "휙!". 다시 덤비기까지 3.5~5초.
      문제는 내가 공격(Q·스킬)할 때만 뜬다(2026-11-16 선생님 요청: 닿을 때 문제가 뜨면 내 공격처럼 보임).
   2) 보스: 예고 동안 몸이 커졌다 작아지며 빛남(기 모으기) → 칠 때 땅이 울리고 충격파 고리.
      고유 패턴(21-loop BOSS_PAT)과 번갈아 「땅 울리기」 범위 공격(보스 둘레 큰 원, 멀리 떨어지면 피함).
   3) 무차별 공격: 보스와 싸우다 문제를 틀리면(공격 실패) 보스가 화가 나 빨간 범위가 연달아 3번(3~4학년 2번) 쏟아짐.
      한 번 맞을 때 하트 1(보스 원래 피해보다 작게), 예고는 그대로 보여 줘서 피할 수 있다. 풀이 화면이 닫힌 뒤 시작.
   · 흔들림 끄기(UI.calm)면 흔들림·충격파를 줄인다. 자동 검사에서 끄려면 MATK.off = true. */
const MATK = { off: false, rings: [] };
const matkWind = () => ((studyCfg.grade || 5) <= 4 ? 18 : 14);

/* 1) 일반 몬스터 */
{
  const up0 = update;
  update = function () {
    const live = MATK.off || busy || mode !== "map" ? null : mons.filter((m) => !m.dead && !MON[m.type].boss && !m.minion);
    const before = live ? new Map(live.map((m) => [m, [m.x, m.y]])) : null;
    // 덤비기는 엔진보다 먼저: 닿으면 문제 없이 바로 하트(2026-11-16 선생님 요청 — 문제가 뜨면 내 공격처럼 보임)
    if (live)
      for (const m of live) {
        const A = m.atk;
        if (!A || A.ph !== "go") continue;
        tryMove(m, A.ax * 3.4, A.ay * 3.4, false);
        m.mv = true;
        if (pl.inv <= 0 && pl.z < 5 && Math.hypot(pl.x - m.x, pl.y - m.y) < 12) {
          matkHit(m);
          A.t = 0;
        }
        if (--A.t <= 0) {
          if (m.atk && !A.hit && typeof fxPop === "function") fxPop(m.x, m.y - 20, "휙!", "#c9c5d8");
          m.atk = null;
          m.acd = 70 + (hsh(m.x | 0, tk) % 30);
        }
      }
    up0();
    if (!live || busy || mode !== "map") return;
    for (const m of live) {
      if (m.dead) continue;
      const A = m.atk;
      m.acd = (m.acd == null ? 30 + (hsh(m.hx | 0, m.hy | 0) % 60) : m.acd) - 1;
      const dx = pl.x - m.x,
        dy = pl.y - m.y,
        d = Math.hypot(dx, dy) || 1;
      if (!A) {
        if (m.acd <= 0 && d < 30 && d > 9 && pl.inv <= 0 && !(typeof ORB === "object" && ORB.on) && !B) {
          m.atk = { ph: "wind", t: matkWind(), ax: dx / d, ay: dy / d };
          if (typeof sfx === "function" && d < 40) sfx("warn");
        }
        continue;
      }
      if (A.ph === "wind") {
        // 기 모으는 동안은 제자리(방향만 나를 향함)
        const b = before.get(m);
        if (b) (m.x = b[0]), (m.y = b[1]);
        A.ax = dx / d;
        A.ay = dy / d;
        m.dir = dx > 0 ? 1 : -1;
        m.mv = false;
        if (--A.t <= 0) (A.ph = "go"), (A.t = 6), (A.hit = 0);
      }
    }
  };
}
// 덤비기에 맞음: 막기(옷·장신구 방어 확률) → 피해 1 줄이기, 아니면 몬스터 피해만큼. 뒤로 밀리고 잠깐 무적
function matkHit(m) {
  const MI = mstat(m);
  m.atk.hit = 1;
  let dm = MI.dmg || 1;
  if (FLD.guard) {
    FLD.guard = 0;
    dm = 0;
    fxPop(pl.x, pl.y - 24, "막음!", "#9fe0ff");
  } else if (typeof rpgSum === "function" && Math.random() * 100 < rpgSum().def) {
    dm = Math.max(0, dm - 1);
    fxPop(pl.x, pl.y - 24, dm ? "막기! -" + dm : "막기!", "#9fe0ff");
  }
  if (dm) {
    const d = typeof takeDmg === "function" ? takeDmg(dm) : dm;
    pl.hp -= d;
    if (typeof fxHurt === "function") fxHurt(d);
    shakeT = UI.calm ? 0 : 6;
    if (typeof sfx === "function") sfx("hurt");
  } else if (typeof sfx === "function") sfx("block");
  pl.inv = 45;
  const dd = Math.hypot(pl.x - m.x, pl.y - m.y) || 1;
  tryMove(pl, ((pl.x - m.x) / dd) * 12, ((pl.y - m.y) / dd) * 8, false);
  tryMove(m, ((m.x - pl.x) / dd) * 6, 0, false);
  hud();
  if (pl.hp <= 0) return lose();
  save.hp = pl.hp;
}
/* 그림: 기 모으기(떨림·!·발밑 빨간 표시), 덤비기(잔상) */
{
  const dm0 = drawMon;
  drawMon = function (m, ...a) {
    const A = m && !m.dead && m.atk;
    if (!A) return dm0(m, ...a);
    const sx = Math.round(m.x - cam.x),
      sy = Math.round(m.y - cam.y);
    if (A.ph === "wind") {
      const k = 1 - A.t / matkWind();
      P(x, sx - 7, sy - 1, 14, 3, "rgba(230,50,60," + (0.25 + 0.4 * k).toFixed(2) + ")");
      const ox = m.x,
        sh = UI.calm ? 0 : (tk % 2 ? 1 : -1) * (k > 0.5 ? 1 : 0.5);
      m.x += sh;
      dm0(m, ...a);
      m.x = ox;
      if (typeof glyph === "function") glyph("!", tk % 6 < 3 ? "#ff6b6b" : "#ffd86b", sx, sy - (MON[m.type].big ? 34 : 26));
      return;
    }
    // 덤비기: 뒤쪽 잔상 두 개
    const ox = m.x,
      oy = m.y;
    x.globalAlpha = 0.25;
    m.x = ox - A.ax * 8;
    m.y = oy - A.ay * 8;
    dm0(m, ...a);
    x.globalAlpha = 1;
    m.x = ox;
    m.y = oy;
    dm0(m, ...a);
  };
}
// 맞거나 문제가 뜨면 공격 취소
// 몸으로 닿아도 문제 없이 하트(문제는 내가 공격할 때만 — 2026-11-16 선생님 요청). MATK.off 면 예전(피하기 문제)
{
  const fc0 = fieldContact;
  fieldContact = function (m) {
    mons.forEach((q) => (q.atk = null));
    if (MATK.off) return fc0.apply(this, arguments);
    if (busy || mode !== "map" || m.dead || pl.inv > 0) return;
    if (typeof petOn === "function" && petOn(4) && !m.pb) {
      m.pb = 1;
      fxPop(pl.x, pl.y - 24, save.pet.name + " 막음!", "#9fe0ff");
      if (typeof sfx === "function") sfx("block");
      pl.inv = 45;
      return;
    }
    m.atk = { ph: "bump" };
    matkHit(m);
    m.atk = null;
  };
}

/* 2) 보스: 기 모으기·땅 울리기 범위 공격·충격파 */
{
  const bs0 = bpStart;
  let flip = 0;
  bpStart = function (m) {
    if (!MATK.off && BP.rage > 0) {
      if (!BP.rageToast) {
        BP.rageToast = 1;
        toast("💢 " + jo(MON[m.type].n, "이", "가") + " 화났어요! 무차별 공격 — 빨간 곳을 계속 피해요");
      }
      return matkRageWave(m);
    }
    if (MATK.off || flip++ % 2 === 0) return bs0(m);
    BP.m = m;
    BP.zones = [{ c: 1, x: m.x, y: m.y - 4, r: 74 }];
    BP.kind = "slam";
    BP.warn = Math.round(bpWarn() * 1.15);
    BP.t = 0;
    toast("⚠ " + MON[m.type].n + " · 땅 울리기! 멀리 떨어져요");
  };
}
// 무차별 공격 한 번(빨간 원 5~6개 + 내 자리)
function matkRageWave(m) {
  const px = pl.x,
    py = pl.y - 4,
    zs = [{ c: 1, x: px, y: py, r: 15 }];
  for (let i = 0; i < 5; i++) {
    const an = Math.random() * 6.28,
      r = 22 + Math.random() * 44;
    zs.push({ c: 1, x: px + Math.cos(an) * r, y: py + Math.sin(an) * r * 0.7, r: 13 + Math.random() * 5 });
  }
  BP.m = m;
  BP.zones = zs;
  BP.kind = "rage";
  BP.warn = Math.max(22, Math.round(bpWarn() * 0.8));
  BP.t = 0;
  BP.rageWave = 1;
}
{
  const bh0 = bpHit;
  bpHit = function () {
    if (BP.m && !UI.calm) MATK.rings.push({ x: BP.m.x, y: BP.m.y - 4, t: 0, big: BP.kind === "slam" });
    if (!BP.rageWave) return bh0();
    // 무차별 공격은 하트 1
    const hit = BP.zones.some((z) => bpInZone(z, pl.x, pl.y - 4));
    if (BP.m) BP.m.hidden = 0;
    if (hit && pl.inv <= 0 && pl.z < 5) {
      const dd = typeof takeDmg === "function" ? takeDmg(1) : 1;
      pl.hp -= dd;
      pl.inv = 24;
      if (typeof fxHurt === "function") fxHurt(dd);
      shakeT = UI.calm ? 0 : 5;
      hud();
      if (pl.hp <= 0) return lose();
      save.hp = pl.hp;
    } else if (!hit) fxPop(pl.x, pl.y - 26, "피했다!", "#9fe0ff");
    BP.rageWave = 0;
  };
}
{
  const up1 = update;
  update = function () {
    const had = BP.zones.length;
    up1();
    // 칠 때 땅 울림
    if (had && !BP.zones.length) {
      if (!UI.calm) shakeT = Math.max(shakeT, 4);
      if (typeof sfx === "function") sfx("hit");
      if (BP.kind === "rage" && BP.rage > 0 && --BP.rage > 0) BP.cool = 14;
    }
    MATK.rings.forEach((r) => r.t++);
    MATK.rings = MATK.rings.filter((r) => r.t < 16);
  };
}
// 틀리면(공격 실패) 보스가 화남 — 틀린 그 순간(noteWrong)에. 다시 풀기 흐름(24-learn)과 상관없이
function matkAnger() {
  if (MATK.off || !B || !B.m || !MON[B.m.type] || !MON[B.m.type].boss) return;
  BP.rage = (studyCfg.grade || 5) <= 4 ? 2 : 3;
  BP.rageToast = 0;
  BP.cool = 14;
  BP.zones = [];
}
{
  const nw0 = noteWrong;
  noteWrong = function () {
    matkAnger();
    return nw0.apply(this, arguments);
  };
}
// 그림: 보스 기 모으기(커졌다 작아짐·빛), 충격파 고리
{
  const dm1 = drawMon;
  drawMon = function (m, ...a) {
    if (m && !m.dead && MON[m.type] && MON[m.type].boss && BP.zones.length && BP.m === m && !m.hidden) {
      const k = BP.t / BP.warn,
        sx = Math.round(m.x - cam.x),
        sy = Math.round(m.y - cam.y);
      x.save();
      x.globalAlpha = 0.18 + 0.22 * Math.abs(Math.sin(BP.t / 3));
      x.fillStyle = BP.kind === "rage" ? "#ff3b3b" : "#ffb35a";
      x.beginPath();
      x.ellipse(sx, sy - 14, 22 + k * 6, 26 + k * 6, 0, 0, 7);
      x.fill();
      x.restore();
      const ox = m.x,
        oy = m.y;
      if (!UI.calm) {
        m.x += k > 0.6 ? (tk % 2 ? 1 : -1) : 0;
        m.y -= Math.round(Math.sin(k * Math.PI) * 3);
      }
      dm1(m, ...a);
      m.x = ox;
      m.y = oy;
      return;
    }
    dm1(m, ...a);
  };
  const fx1 = drawFx;
  drawFx = function () {
    fx1.apply(this, arguments);
    if (!MATK.rings.length) return;
    x.save();
    MATK.rings.forEach((r) => {
      const R = (r.big ? 80 : 46) * (r.t / 16);
      x.strokeStyle = "rgba(255,230,180," + (1 - r.t / 16).toFixed(2) + ")";
      x.lineWidth = 2;
      x.beginPath();
      x.ellipse(r.x - cam.x, r.y - cam.y, R, R * 0.6, 0, 0, 7);
      x.stroke();
    });
    x.restore();
  };
  const lm1 = loadMap;
  loadMap = function () {
    BP.rage = 0;
    BP.rageWave = 0;
    MATK.rings = [];
    return lm1.apply(this, arguments);
  };
}
