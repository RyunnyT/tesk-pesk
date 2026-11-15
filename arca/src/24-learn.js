/* ════════ 배움 고치기 (프롬프트 J, 2026-11-15, docs/점검_고칠점.md 1-1·1-2·1-5, 선생님 확인) ════════
   점검: 아무 답이나 누르는 학생이 늑대 6마리를 19문제·38초·하트 0 손실로 잡았다(틀려도 피해 절반, 풀이는 2초 뒤 사라짐).
   1) 틀리면 피해 0. 풀이를 보고 「알겠어요」를 누르면 **같은 유형·다른 수** 문제를 한 번 더 → 맞히면 피해 절반("다시 해냈어요!"), 또 틀리면 0.
      학습 기록은 처음 답만 센다(다시 풀기는 LOG.retry 에 수만). 피하기 문제(몬스터가 부딪혀 옴)는 다시 풀기 없이 풀이만.
   2) 풀이 = 이 문제의 수로 푼 단계(stepSolve, 만들 수 있는 유형만·정답과 다르면 버림) + 문제 은행의 규칙 한 줄. 시간으로 넘기지 않는다.
   3) 찍기 알아채기: 1.5초 안에 답하고 틀리기를 3문제 안에 2번 → 몬스터가 5초 안개 보호막("천천히 읽어 봐요"). 벌은 없다.
   4) 틀린 유형을 수만 바꿔 다시: 다음 3문제 안에 한 번(st 0→1), 다음 날 처음 5문제 안에 한 번(st 1→2 = 기억을 되찾음).
   5) 보기 4개(5~6학년)는 06b-study 의 studyQ, 구슬 4개는 18-orb.
   · 검사용: LEARN.off = true 면 예전 규칙(틀리면 절반·시간으로 넘김)으로 돈다. */
const LEARN = { off: false, inRetry: false, forceQ: null, res: null, contact: false, wait: null, ansT: 0, fast: [] };
const lnSig = (t) => String(t || "").replace(/\d+(\.\d+)?/g, "N");
const lnDay = (add) => {
  const z = new Date(Date.now() + (add || 0) * 864e5);
  return z.getFullYear() + "-" + String(z.getMonth() + 1).padStart(2, "0") + "-" + String(z.getDate()).padStart(2, "0");
};

/* ── 같은 유형, 다른 수 ── */
function learnSimilar(src, sig, notQ) {
  if (!window.QUIZ || !src) return null;
  let fall = null;
  for (let i = 0; i < 16; i++) {
    let q;
    try {
      q = QUIZ.makeQuestion({ grade: src.g, term: src.t, unitNos: [src.no], tier: src.tier, contextMode: "plain", responseMode: "choice" });
    } catch (e) {
      return null;
    }
    if (!q || !Array.isArray(q.options) || q.q === notQ) continue;
    const a = String(q.answer),
      wr = [...new Set(q.options.map(String))].filter((v) => v !== a);
    if (wr.length < 2) continue;
    const nCh = studyCfg.choices === 3 || studyCfg.choices === 4 ? studyCfg.choices : studyCfg.grade >= 5 ? 4 : 3;
    const Q = { q: q.q, a, ch: [a, ...wr.sort(() => Math.random() - 0.5).slice(0, nCh - 1)].sort(() => Math.random() - 0.5), unit: q.unit, ex: q.explain || "", src };
    if (!sig || lnSig(q.q) === sig) return Q;
    fall = fall || Q;
  }
  return fall;
}

/* ── 단계 풀이: 이 문제의 수로. 답이 정답과 다르면 null(틀린 풀이를 보여 주지 않는다) ── */
const lnG = (a, b) => (b ? lnG(b, a % b) : Math.abs(a));
const lnFrac = (s) => {
  const m = /^\s*(?:(\d+)\s+)?(\d+)\/(\d+)\s*$/.exec(String(s));
  if (m) return { n: (+m[1] || 0) * +m[3] + +m[2], d: +m[3] };
  if (/^\s*\d+\s*$/.test(String(s))) return { n: +s, d: 1 };
  return null;
};
const lnMixed = (n, d) => {
  const g = lnG(n, d) || 1;
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  return n > d ? Math.floor(n / d) + " " + (n % d) + "/" + d : n + "/" + d;
};
const lnSame = (r, ans) => {
  const A = lnFrac(ans);
  return !!A && r.n * A.d === A.n * r.d;
};
function stepSolve(Q) {
  try {
    const raw = String(Q.q || ""),
      ans = String(Q.a),
      body = raw.replace(/^계산해 보세요\.\s*/, "").trim();
    let m;
    // 1) 자연수 식(혼합 계산·사칙)
    if (raw.startsWith("계산해 보세요") && /^[\d\s+\-−×÷()]+$/.test(body) && typeof orderSteps === "function") {
      const toks = (body.match(/\d+|[+\-−×÷()]/g) || []).map((t) => (/^\d+$/.test(t) ? +t : t === "-" ? "−" : t));
      const steps = orderSteps(toks);
      if (!steps || !steps.length || !steps.every((s) => Number.isInteger(s.v) && s.v >= 0)) return null;
      if (String(steps[steps.length - 1].v) !== ans) return null;
      if (steps.length === 1) {
        const s = steps[0];
        if (s.o === "×" && s.a >= 10 && s.b < 10) {
          const parts = String(s.a)
            .split("")
            .map((c, i, L) => +c * Math.pow(10, L.length - 1 - i))
            .filter((v) => v);
          return s.a + " × " + s.b + " = " + parts.map((p) => p + "×" + s.b).join(" + ") + " = " + parts.map((p) => p * s.b).join(" + ") + " = " + s.v;
        }
        if (s.o === "÷") return s.b + " × " + s.v + " = " + s.a + " 이니까 " + s.a + " ÷ " + s.b + " = " + s.v;
        return s.a + " " + s.o + " " + s.b + " = " + s.v;
      }
      return steps.map((s, i) => (i ? "" : "먼저 ") + s.a + " " + s.o + " " + s.b + " = " + s.v).join(" → ");
    }
    // 2) 분수의 덧셈·뺄셈
    if ((m = /^((?:\d+\s+)?\d+\/\d+|\d+)\s*([+\-−])\s*((?:\d+\s+)?\d+\/\d+|\d+)$/.exec(body)) && body.includes("/")) {
      const A = lnFrac(m[1]),
        B2 = lnFrac(m[3]),
        plus = m[2] === "+";
      if (!A || !B2) return null;
      const L = (A.d * B2.d) / lnG(A.d, B2.d),
        an = A.n * (L / A.d),
        bn = B2.n * (L / B2.d),
        rn = plus ? an + bn : an - bn;
      if (rn < 0 || !lnSame({ n: rn, d: L }, ans)) return null;
      const same = A.d === B2.d && A.d === L;
      return (same ? "분모가 같으니 분자끼리: " : "공통분모 " + L + " → ") + an + "/" + L + " " + (plus ? "+" : "−") + " " + bn + "/" + L + " = " + rn + "/" + L + (rn + "/" + L === ans ? "" : " = " + ans);
    }
    // 3) 분수 × 자연수
    if ((m = /^(\d+)\/(\d+)\s*×\s*(\d+)$/.exec(body))) {
      const n = +m[1] * +m[3],
        d = +m[2];
      if (!lnSame({ n, d }, ans)) return null;
      return "분자에만 곱해요: " + m[1] + " × " + m[3] + " = " + n + " → " + n + "/" + d + (n + "/" + d === ans ? "" : " = " + ans);
    }
    // 4) 소수 × 자연수
    if ((m = /^(\d+)\.(\d+)\s*×\s*(\d+)$/.exec(body))) {
      const k = m[2].length,
        whole = +(m[1] + m[2]) * +m[3],
        v = whole / Math.pow(10, k);
      if (Math.abs(v - Number(ans)) > 1e-9) return null;
      return "소수점을 떼고 " + +(m[1] + m[2]) + " × " + m[3] + " = " + whole + " → 소수 " + k + "자리이니까 " + ans;
    }
    // 5) 최대공약수·최소공배수
    if ((m = /(\d+)[와과]\s*(\d+)의\s*(최대공약수|최소공배수)/.exec(raw))) {
      const a = +m[1],
        b = +m[2];
      if (a > 300 || b > 300) return null;
      if (m[3] === "최대공약수") {
        const dv = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((v) => n % v === 0),
          g = lnG(a, b);
        if (String(g) !== ans) return null;
        return a + "의 약수: " + dv(a).join(", ") + " / " + b + "의 약수: " + dv(b).join(", ") + " → 둘 다에 있는 가장 큰 수는 " + g;
      }
      const l = (a * b) / lnG(a, b);
      if (String(l) !== ans || l / a > 12 || l / b > 12) return null;
      const mu = (n) => Array.from({ length: l / n }, (_, i) => n * (i + 1)).join(", ");
      return a + "의 배수: " + mu(a) + " / " + b + "의 배수: " + mu(b) + " → 처음 같아지는 수는 " + l;
    }
    // 6) 넓이·둘레·부피
    const chk = (v, txt) => (String(v) === ans ? txt + " = " + v : null);
    if ((m = /밑변이?\s*(\d+)cm,\s*높이가?\s*(\d+)cm인\s*삼각형의\s*넓이/.exec(raw))) return chk((+m[1] * +m[2]) / 2, m[1] + " × " + m[2] + " ÷ 2");
    if ((m = /밑변이?\s*(\d+)cm,\s*높이가?\s*(\d+)cm인\s*평행사변형의\s*넓이/.exec(raw))) return chk(+m[1] * +m[2], m[1] + " × " + m[2]);
    if ((m = /가로가?\s*(\d+)cm,\s*세로가?\s*(\d+)cm,\s*높이가?\s*(\d+)cm인\s*직육면체의\s*부피/.exec(raw))) return chk(+m[1] * +m[2] * +m[3], m[1] + " × " + m[2] + " × " + m[3]);
    if ((m = /가로가?\s*(\d+)cm,\s*세로가?\s*(\d+)cm인\s*직사각형의\s*(넓이|둘레)/.exec(raw)))
      return m[3] === "넓이" ? chk(+m[1] * +m[2], m[1] + " × " + m[2]) : chk(2 * (+m[1] + +m[2]), "(" + m[1] + " + " + m[2] + ") × 2");
    if ((m = /한 변(?:의 길이)?가?\s*(\d+)cm인\s*정사각형의\s*(넓이|둘레)/.exec(raw))) return m[2] === "넓이" ? chk(+m[1] * +m[1], m[1] + " × " + m[1]) : chk(4 * +m[1], m[1] + " × 4");
  } catch (e) {}
  return null;
}

/* ── 풀이 화면 + 「알겠어요」 ── */
function learnWrong(Q, end) {
  LEARN.ansT = Date.now();
  if (LEARN.off) return setTimeout(end, Q.ex ? 2200 : 1400);
  const steps = stepSolve(Q),
    retry = !LEARN.inRetry && !LEARN.contact,
    plain = "아쉬워요. 정답은 " + Q.a + (steps ? "\n이렇게 풀어요: " + steps : "") + (Q.ex ? "\n기억해요: " + Q.ex : "");
  $("bm").textContent = plain; // 구슬 띠가 이 글을 가져간다
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    LEARN.wait = null;
    end();
  };
  LEARN.wait = { go };
  setTimeout(() => {
    if (fired) return;
    const el = typeof ORB === "object" && ORB.on ? $("qsr") : $("bm");
    el.hidden = false;
    el.innerHTML =
      '<span class="lnans">아쉬워요. 정답은 <b>' + esc(Q.a) + "</b></span>" +
      (steps ? '<span class="lnstep"><i>이렇게 풀어요</i>' + esc(steps) + "</span>" : "") +
      (Q.ex ? '<span class="lnrule"><i>기억해요</i>' + esc(Q.ex) + "</span>" : "") +
      '<button type="button" class="lnok" id="lnok">' + (retry ? "알겠어요 · 비슷한 문제로 다시!" : "알겠어요") + "</button>";
    const b = $("lnok");
    b.onclick = go;
    b.focus();
    if (typeof speak === "function") speak(plain);
  }, 0);
}
// 엔터·스페이스로 「알겠어요」
addEventListener(
  "keydown",
  (e) => {
    if (!LEARN.wait) return;
    if (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      LEARN.wait.go();
    } else if (/^(Digit|Numpad)\d$/.test(e.code) || e.code === "KeyQ") {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);

/* ── 틀린 문제 노트: 유형(src)·단계 풀이 저장, 다시 풀기에서 틀린 것은 새로 넣지 않음 ── */
{
  const nwL = noteWrong;
  noteWrong = function (q) {
    if (LEARN.off) return nwL(q);
    if (LEARN.inRetry) {
      if (q) q.wrong = 1;
      return;
    }
    if (q && q.wq) {
      // 다시 만난 유형을 또 틀림: 원래 항목의 차례만 뒤로
      const w = (save.wrong || []).find((v) => v.q === q.wq);
      if (w) {
        w.n = save.qn || 0;
        w.miss = (w.miss || 0) + 1;
        store();
      }
      q.wrong = 1;
      return;
    }
    nwL(q);
    const w = (save.wrong || [])[0];
    if (w && q && w.q === q.q) {
      if (q.src) {
        w.src = q.src;
        w.sig = lnSig(q.q);
        w.st = 0;
      }
      const st = stepSolve(q);
      if (st) w.ex = "이렇게 풀어요: " + st + (w.ex ? " · " + w.ex : "");
      store();
    }
  };
}

/* ── 문제 고르기: 다시 풀기(forceQ) → 틀린 유형 다시 만나기 → 보통 ── */
function learnDue() {
  const L = (save.wrong || []).filter((w) => w.src);
  if (!L.length) return null;
  const st = save.st || (save.st = {}),
    today = lnDay();
  if (!st.dq || st.dq.d !== today) st.dq = { d: today, n: 0 };
  st.dq.n++;
  if (RQ.mon && ["ghost", "eraser", "noxshade"].includes(RQ.mon)) return L[Math.floor(Math.random() * L.length)];
  for (const w of L) {
    if (!w.st) {
      const gap = (save.qn || 0) - (w.n || 0);
      if (gap >= 3 || (gap >= 1 && Math.random() < 0.5)) return w;
    } else if (w.st === 1 && w.day && today >= w.day) {
      if (st.dq.n >= 5 || Math.random() < 0.4) return w;
    }
  }
  return null;
}
{
  const mqL = makeQ;
  makeQ = function (d) {
    if (LEARN.off) return mqL(d);
    if (LEARN.forceQ) {
      const q = LEARN.forceQ;
      LEARN.forceQ = null;
      RQ.short = false;
      return (RQ.last = q);
    }
    if (!LEARN.inRetry && studyCfg.subj !== "eng") {
      const w = learnDue();
      const q = w && learnSimilar(w.src, w.sig, null);
      if (q) {
        save.qn = (save.qn || 0) + 1;
        q.re = 1;
        q.wq = w.q;
        RQ.short = false;
        return (RQ.last = q);
      }
    }
    return mqL(d);
  };
}

/* ── 틀리면 다시 풀기 · 찍기 알아채기 · 되찾은 기억 ── */
function learnRecover(q) {
  const w = (save.wrong || []).find((v) => v.q === q.wq);
  if (!w) return;
  w.st = (w.st || 0) + 1;
  if (w.st >= 2) {
    save.wrong = save.wrong.filter((v) => v !== w);
    save.st.recov = (save.st.recov || 0) + 1;
    save.dust += 3;
    for (let i = 0; i < 30; i++) sp.push({ a: pl.x - 14 + Math.random() * 28, y: pl.y - 30 + Math.random() * 20, t: 10 + Math.random() * 14 });
    fxPop(pl.x, pl.y - 40, "기억을 되찾았어요!", "#ffd86b");
    sfx("shard");
    toastLater(() => "기억을 되찾았어요! 별빛 가루 +3 · 되찾은 기억 " + save.st.recov + "개", 500);
    if (typeof titleCheck === "function") titleCheck();
  } else {
    w.day = lnDay(1);
    fxPop(pl.x, pl.y - 40, "기억이 돌아와요!", "#9fe0ff");
    toastLater(() => "틀렸던 유형을 맞혔어요! 내일 한 번 더 맞히면 기억을 되찾아요", 500);
  }
  store();
}
function learnFast(t0, m) {
  const lim = UI.big || UI.tts ? 1000 : 1500,
    fast = (LEARN.ansT || Date.now()) - t0 < lim;
  LEARN.fast.push(fast ? 1 : 0);
  if (LEARN.fast.length > 3) LEARN.fast.shift();
  if (LEARN.fast.reduce((a, b) => a + b, 0) >= 2) {
    LEARN.fast = [];
    if (m) m.shieldT = Date.now() + 5000;
    save.st.fastN = (save.st.fastN || 0) + 1;
    toastLater(() => "안개 보호막! 문제를 천천히 읽어 봐요 (5초)", 300);
  }
}
{
  const afL = askField;
  askField = function (MI, title, cb) {
    if (LEARN.off) return afL(MI, title, cb);
    const t0 = Date.now(),
      contact = LEARN.contact,
      m = B && B.m;
    LEARN.ansT = 0;
    LEARN.res = null;
    afL(MI, title, (ok) => {
      const Q = RQ.last || {};
      if (ok) {
        LEARN.fast.push(0);
        if (LEARN.fast.length > 3) LEARN.fast.shift();
        if (Q.re && Q.wq) learnRecover(Q);
        return cb(true);
      }
      learnFast(t0, m);
      if (contact) return cb(false);
      // 다시 풀기: 같은 유형·다른 수(만들 수 없으면 그 단원의 다른 문제)
      LEARN.inRetry = true;
      LEARN.forceQ = Q.src ? learnSimilar(Q.src, lnSig(Q.q), Q.q) : typeof Q.regen === "function" ? Q.regen() : null; // 그림 문제(27-figq)는 같은 생성기로 다시
      if (LEARN.forceQ && Q.regen && !LEARN.forceQ.unit) LEARN.forceQ.unit = Q.unit;
      afL(MI, title + " · 다시 풀기", (ok2) => {
        LEARN.inRetry = false;
        LEARN.res = ok2 ? "half" : "zero";
        const L2 = typeof LOG === "object" ? LOG : null;
        if (L2) {
          L2.retry = L2.retry || { n: 0, ok: 0 };
          L2.retry.n++;
          if (ok2) L2.retry.ok++;
        }
        cb(false);
      });
      LEARN.forceQ = null;
    });
  };
  // 피하기 문제 표시
  const fcL = fieldContact;
  fieldContact = function (m) {
    LEARN.contact = true;
    try {
      fcL(m);
    } finally {
      LEARN.contact = false;
    }
  };
  // 다시 풀기는 학습 기록에 넣지 않는다(처음 답만)
  if (typeof logAdd === "function") {
    const laL = logAdd;
    logAdd = function (r) {
      if (LEARN.inRetry && !LEARN.off) return null;
      return laL(r);
    };
  }
  // 피해: 다시 풀어 맞히면 절반(원래 값), 또 틀리면 0
  const fdL = funDmg;
  funDmg = function (d, ok, m, sk) {
    const r = fdL(d, ok, m, sk);
    return !ok && LEARN.res === "zero" ? 0 : r;
  };
  const fpL = fxPop;
  fxPop = function (wx, wy, txt, col) {
    if (!LEARN.off) {
      if (txt === 0) return; // 피해 0 은 숫자를 띄우지 않는다
      if (txt === "절반") {
        if (LEARN.res === "zero") return;
        if (LEARN.res === "half") txt = "다시 해냈어요!";
      }
    }
    fpL(wx, wy, txt, col);
  };
  // 안개 보호막: 5초 동안 공격이 안 통한다
  const fsL = fieldStrike;
  fieldStrike = function (m, sk) {
    if (m && m.shieldT > Date.now()) return toast("안개 보호막이 있어요. 숨을 고르고 문제를 천천히 읽어요");
    fsL(m, sk);
  };
  const fxL = drawFx;
  drawFx = function () {
    fxL();
    const now = Date.now();
    mons.forEach((m) => {
      if (!(m.shieldT > now) || m.dead) return;
      x.globalAlpha = 0.5 + 0.2 * Math.sin(fr / 2);
      x.strokeStyle = "#cfc6ee";
      x.lineWidth = 1.5;
      x.beginPath();
      x.ellipse(m.x - cam.x, m.y - cam.y - 9, 13, 14, 0, 0, 7);
      x.stroke();
      x.globalAlpha = 1;
    });
  };
}
