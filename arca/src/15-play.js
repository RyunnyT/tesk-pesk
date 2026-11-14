/* ════════ 놀이·배움 다듬기 ════════
   1) 틀린 문제 다시 만나기: 틀린 문제는 문제 6개쯤 뒤에 다시 나온다. 망각 유령·지우개 덩어리는 늘 틀린 문제를 들고 온다.
      다시 만난 문제를 맞히면 오답 노트에서 지운다.
   2) 몬스터마다 다른 움직임(들쥐는 도망, 박쥐·늑대는 돌진, 집게게는 옆걸음, 도깨비불은 흔들흔들, 유령은 깜빡 사라짐 …)
   3) 보스 3단계: 체력 2/3 아래에서 부하를 부르고, 1/3 아래에서 문제가 어려워진다.
   4) 이번 부의 단원을 퀘스트 상자 맨 위와 마을 첫 방문 때 알려 준다.
   5) 접근성: 글자 크게 · 대사 읽어 주기 · 화면 흔들림 끄기(메뉴 ☰, src/08-ui.js) */

/* ── 1) 다시 만나기 ── */
const RQ = { mon: null, last: null };
{
  const nw0 = noteWrong;
  noteWrong = function (q) {
    nw0(q);
    const w = (save.wrong || [])[0];
    if (w && q && w.q === q.q) {
      w.ch = (q.ch || []).map(String);
      w.n = save.qn || 0;
    }
  };
  const mq0 = makeQ;
  makeQ = function (d) {
    save.qn = (save.qn || 0) + 1;
    const L = (save.wrong || []).filter((w) => w.ch && w.ch.length >= 2),
      due = L.filter((w) => (save.qn || 0) - (w.n || 0) >= 6),
      force = RQ.mon && ["ghost", "eraser", "noxshade"].includes(RQ.mon) && L.length;
    if ((due.length && Math.random() < 0.2) || force) {
      const w = (due.length ? due : L)[Math.floor(Math.random() * (due.length ? due : L).length)];
      return (RQ.last = { q: w.q, a: w.a, ch: w.ch.slice().sort(() => Math.random() - 0.5), unit: w.u, ex: w.ex, re: 1 });
    }
    return (RQ.last = mq0(d));
  };
  const af0 = askField;
  askField = function (MI, title, cb) {
    const k = Object.keys(MON).find((key) => MON[key].n === MI.n);
    RQ.mon = k || null;
    af0(MI, title, (ok) => {
      const q = RQ.last;
      if (ok && q && q.re) {
        save.wrong = (save.wrong || []).filter((w) => w.q !== q.q);
        setTimeout(() => toast("다시 만난 문제를 맞혔어요! 오답 노트에서 지웠어요"), 500);
      }
      cb(ok);
    });
    RQ.mon = null;
    if (RQ.last && RQ.last.re) $("btt").textContent = title + " · 다시 만난 문제";
  };
}

/* ── 2) 몬스터마다 다른 움직임 ── */
const MOVE = {
  rat: "flee",
  bat: "dash",
  wolf: "dash",
  crow: "swoop",
  crab: "side",
  wisp: "wobble",
  moth: "wobble",
  ghost: "blink",
  sheep: "calm",
  windup: "march",
  jelly: "wobble",
  ice: "wobble",
};
{
  const up0 = update;
  update = function () {
    const before = new Map(mons.map((m) => [m, [m.x, m.y]]));
    up0();
    if (mons.some((m) => m.minion && m.dead)) mons = mons.filter((m) => !(m.minion && m.dead));
    if (busy || mode !== "map") return;
    mons.forEach((m) => {
      if (m.dead || MON[m.type].boss) return;
      const kind = MOVE[m.type],
        b = before.get(m);
      if (!kind || !b) return;
      const dx = pl.x - m.x,
        dy = pl.y - m.y,
        d = Math.hypot(dx, dy) || 1,
        sp = MON[m.type].spd;
      m.cd = (m.cd || 0) - 1;
      if (kind === "flee" && d < 48) tryMove(m, (-dx / d) * sp * 2.2, (-dy / d) * sp * 2.2, false);
      else if (kind === "dash" && d < 80 && pl.inv <= 0) {
        if (m.cd <= 0 && !m.dash) {
          m.dash = 14;
          m.cd = 90;
        }
        if (m.dash > 0) {
          m.dash--;
          tryMove(m, (dx / d) * sp * 2.2, (dy / d) * sp * 2.2, false);
        }
      } else if (kind === "swoop" && d < 90 && pl.inv <= 0) {
        const ph = (tk + (m.hx | 0)) % 120;
        if (ph < 25) tryMove(m, (dx / d) * sp * 2.6, (dy / d) * sp * 2.6, false);
        else if (ph < 45) tryMove(m, (-dx / d) * sp * 1.6, (-dy / d) * sp * 1.6, false);
      } else if (kind === "side") {
        // 옆걸음: 위아래로 움직인 것을 거의 되돌린다
        tryMove(m, 0, (b[1] - m.y) * 0.8, false);
      } else if (kind === "wobble") tryMove(m, Math.sin((tk + (m.hx | 0)) / 9) * 0.5, Math.cos((tk + (m.hy | 0)) / 11) * 0.4, false);
      else if (kind === "calm") {
        // 구름 양은 쫓아오지 않고 천천히 돌아다닌다
        if (d < 56) {
          m.x = b[0];
          m.y = b[1];
        }
      } else if (kind === "march") {
        // 태엽 병정: 집 자리 양옆으로 행진
        m.x = b[0];
        m.y = b[1];
        const t = ((tk + (m.hy | 0)) % 160) / 160;
        tryMove(m, (t < 0.5 ? 1 : -1) * sp * 0.7, 0, false);
        m.dir = t < 0.5 ? 1 : -1;
        m.mv = true;
      } else if (kind === "blink") {
        m.fade = Math.max(0, (m.fade || 0) - 1);
        if (m.cd <= 0 && d < 70) {
          m.cd = 150;
          m.fade = 40;
          tryMove(m, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, false);
        }
      }
    });
  };
  const dm0 = drawMon;
  drawMon = function (m) {
    if (m.fade > 0) x.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(m.fade / 6)) * 0.5;
    dm0(m);
    x.globalAlpha = 1;
  };
}

/* ── 3) 보스 3단계 ── */
{
  const fh0 = fxHit;
  fxHit = function (d) {
    fh0(d);
    if (!B || !B.MI || !B.MI.boss || !B.m) return;
    const m = B.m,
      full = B.MI.hp,
      k = m.hpNow / full;
    if (m.hpNow <= 0) return;
    if (k <= 2 / 3 && !(m.ph >= 2)) {
      m.ph = 2;
      setTimeout(() => {
        toast(B && B.MI ? jo(B.MI.n, "이", "가") + " 부하를 불렀어요! (2단계)" : "보스가 부하를 불렀어요! (2단계)");
        bossMinions(m, 2);
      }, 500);
    } else if (k <= 1 / 3 && !(m.ph >= 3)) {
      m.ph = 3;
      setTimeout(() => toast("마지막 힘! 보스 문제가 어려워져요 (3단계)"), 500);
    }
  };
  const ms1 = mstat;
  mstat = function (m) {
    const r = ms1(m);
    return m && m.ph >= 3 ? { ...r, dif: Math.min(5, r.dif + 1) } : r;
  };
}
function bossMinions(boss, n) {
  const types = [...new Set((M.mons || []).map((q) => q[0]).filter((t) => !MON[t].boss))];
  const t = types[0] || "shade";
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2,
      X = boss.x + Math.cos(ang) * 30,
      Y = boss.y + Math.sin(ang) * 20;
    mons.push({ map: M.id, type: t, x: X, y: Y, hx: X, hy: Y, tx: X, ty: Y, wait: 20, dir: -1, f: 0, mv: false, dead: 0, hit: 0, minion: 1 });
  }
}

/* ── 4) 이번 부의 단원 ── */
function unitName(part) {
  if (!window.QUIZ || typeof partUnit !== "function") return null;
  if (studyCfg.subj === "eng") return "영어 단어";
  const { term, unit } = partUnit(part),
    u = QUIZ.unitsOf(studyCfg.grade, term).find((x) => x.no === unit);
  return u ? u.name : null;
}
// 단원 이름의 낱말로 이 부의 이야기와 잇는 한 줄
function unitStory(nm) {
  const has = (...k) => k.some((w) => nm.includes(w));
  if (has("분수")) return "반으로, 셋으로 나뉜 것들을 다시 하나로 잇는 힘이 필요해요.";
  if (has("소수")) return "아주 작은 눈금까지 읽어야 지워진 길이 보여요.";
  if (has("나눗셈")) return "모두에게 똑같이 나누어야 마을이 다시 웃어요.";
  if (has("곱셈")) return "같은 것이 여러 번 모이면 큰 힘이 돼요.";
  if (has("덧셈", "뺄셈")) return "더하고 빼며 잃어버린 수를 되찾아요.";
  if (has("도형", "각", "삼각형", "사각형", "원", "다각형", "직육면체", "각기둥", "합동", "대칭")) return "무너진 건물은 바른 모양을 알아야 다시 세울 수 있어요.";
  if (has("길이", "시간", "들이", "무게", "넓이", "부피", "둘레")) return "재고 잴수록 세계의 크기가 또렷해져요.";
  if (has("자료", "그래프", "평균", "가능성")) return "흩어진 기록을 모아 보면 숨은 이야기가 보여요.";
  if (has("규칙", "대응", "비", "비율", "비례")) return "안개 속에도 규칙은 남아 있어요. 그 규칙이 길을 알려 줘요.";
  if (has("큰 수", "약수", "배수", "어림", "범위", "혼합")) return "수의 질서를 되찾으면 별빛이 다시 흘러요.";
  return "이 단원을 익히면 별빛이 더 밝아져요.";
}
{
  const q = document.createElement("div");
  q.id = "qunit";
  q.className = "qunit";
  $("qlist").prepend(q);
  const hud2 = hud;
  hud = function () {
    hud2();
    const nm = unitName(mapPart());
    $("qunit").hidden = !nm;
    if (nm) $("qunit").textContent = mapPart() + "부 단원 · " + nm;
    const any = !$("h4").hidden || !$("trk").hidden || !!nm;
    $("qlist").parentNode.hidden = !any;
  };
  if (typeof storyEnter === "function") {
    const se0 = storyEnter;
    storyEnter = function (id) {
      const first = MAPS[id] && MAPS[id].kind === "town" && !(save.st["unit_" + id]);
      se0(id);
      if (!first) return;
      const nm = unitName(mapPart());
      if (!nm) return;
      save.st["unit_" + id] = 1;
      store();
      setTimeout(() => !busy && toast(mapPart() + "부 단원 「" + nm + "」 · " + unitStory(nm)), 1800);
    };
  }
}

/* ── 5) 접근성 ── */
function a11yApply() {
  document.body.classList.toggle("bigtext", !!UI.big);
}
a11yApply();
// 대사·문제 읽어 주기(브라우저 음성, 한국어)
function speak(t) {
  if (!UI.tts || !window.speechSynthesis || !t) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(t).replace(/[◆◇♥♡·]/g, " "));
    u.lang = "ko-KR";
    u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch (e) {}
}
{
  const od0 = openDlg;
  openDlg = function (n, lines, cb, ch) {
    od0(n, lines, cb, ch);
    speak((n && n.n ? n.n + ". " : "") + $("dt").textContent);
  };
  const nd0 = nextDlg;
  nextDlg = function () {
    nd0();
    if (dl) speak($("dt").textContent);
  };
  $("dlg").onclick = () => nextDlg();
  const af1 = askField;
  askField = function (MI, title, cb) {
    af1(MI, title, cb);
    speak($("bq").textContent);
  };
  const fx2 = drawFx;
  drawFx = function () {
    if (UI.calm) shakeT = 0;
    fx2();
  };
}
hud();
