/* ════════ 수학이 놀이가 되게 ① 길목 장치에 단원 수학 (프롬프트 S-1, 2026-11-16, docs/작업_프롬프트3_RPG와수학.md) ════════
   30-routes 의 장치는 그대로 두고, 그 부 단원 낱말(unitName(mapPart()))에 맞는 「수학 판」을 얹는다. 안 풀어도 길은 막히지 않는다.
   H 꽃길 → 숫자 꽃: 꽃 6~8송이에 수, 규칙에 맞는 꽃만 밟으면 보물(틀린 꽃은 시들었다 다시 핌)
   A 무너진 다리 → 징검돌: 개울에 답 돌 3개(그 단원 문제), 맞는 돌만 디딜 수 있고 틀린 돌은 가라앉아 물가로
   G 움직이는 발판 → 눈금 뗏목: 강가 수직선에서 「3/4 지점」처럼 맞는 눈금에서 내리면 보물
   E 숨은 샛길 → 표지판 수수께끼: 샛길 앞 표지판에 그 단원 수수께끼(29-quests 의 QX_RIDDLE), 맞히면 틈이 환히 빛남
   B 어두운 길 → 등불 차례: 등불에 수, 작은 수부터 켜면 길 전체가 밝아지고 보물
   D 바람길 → 바람 세기: 예고에 「바람 = 3 × 2 − 4 칸」, 답만큼 밀림(그만큼 떨어진 바위 뒤로)
   C·F·I 는 그대로. 수학 판을 풀면 학습 기록 1문제(처음 시도만)·열쇠 조각 1. 길목 보물은 하루 한 번 다시 열림.
   만들기 표 MR_GEN(단원 낱말 → 수 목록·규칙). 끄기: MR.off = true */
const MR = { off: false, cur: null };
const mrR = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const mrPick = (L) => L[Math.floor(Math.random() * L.length)];
const mrShuffle = (L) => L.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const mrDay = () => Math.floor(Date.now() / 864e5);
const mrUnit = () => (typeof unitName === "function" && typeof studyCfg === "object" && studyCfg.subj !== "eng" ? unitName(mapPart()) || "" : "");
const mrHas = (u, ...k) => k.some((w) => u.includes(w));
const mrFrac = (p, q) => ({ t: p + "/" + q, v: p / q });
const mrDec = (v) => ({ t: String(Math.round(v * 10) / 10), v: Math.round(v * 10) / 10 });
const mrGrade = () => (typeof studyCfg === "object" && studyCfg.grade) || 5;

/* ── 만들기 표 ── */
const MR_GEN = {
  // 숫자 꽃: {rule, items:[{t, v, ok}]}
  flower(u) {
    const g = mrGrade();
    if (mrHas(u, "약수")) {
      const N = mrPick(g <= 4 ? [12, 16, 18, 20] : [18, 20, 24, 30, 36]);
      const yes = [...Array(N).keys()].map((i) => i + 1).filter((d) => N % d === 0 && d > 1 && d < N);
      const no = [...Array(N).keys()].map((i) => i + 1).filter((d) => N % d && d > 1);
      return { rule: N + "의 약수 꽃만 밟아요", items: mrShuffle([...mrShuffle(yes).slice(0, 4), ...mrShuffle(no).slice(0, 4)].map((v) => ({ t: String(v), v, ok: N % v === 0 }))) };
    }
    if (mrHas(u, "배수", "규칙", "대응", "곱셈", "나눗셈", "혼합")) {
      const k = mrR(3, g <= 3 ? 5 : 9);
      const yes = mrShuffle([1, 2, 3, 4, 5, 6, 7].map((i) => i * k)).slice(0, 3);
      const no = [];
      while (no.length < 4) {
        const v = mrR(k + 1, k * 7);
        if (v % k && !no.includes(v)) no.push(v);
      }
      return { rule: k + "의 배수 꽃만 밟아요", items: mrShuffle([...yes, ...no].map((v) => ({ t: String(v), v, ok: v % k === 0 }))) };
    }
    if (mrHas(u, "약분", "통분", "분수")) {
      const [p, q] = mrPick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]);
      const yes = [2, 3, 4, 5].map((k) => mrFrac(p * k, q * k)).slice(0, 3);
      const no = [mrFrac(p + 1, q + 1), mrFrac(p * 2 + 1, q * 2), mrFrac(p, q + 1), mrFrac(q, p + q), mrFrac(p * 3 + 1, q * 3)].filter((f, i, A) => Math.abs(f.v - p / q) > 1e-9 && A.findIndex((g) => g.t === f.t) === i && !yes.some((y) => y.t === f.t));
      return { rule: p + "/" + q + "과 크기가 같은 분수 꽃만 밟아요", items: mrShuffle([...yes.map((f) => ({ ...f, ok: true })), ...no.slice(0, 4).map((f) => ({ ...f, ok: false }))]) };
    }
    if (mrHas(u, "소수")) {
      const c = mrPick([0.5, 1, 1.5]);
      const L = [], n10 = Math.round(c * 10);
      const add = (lo, hi, k) => { for (let tries = 0; L.length < k && tries < 99; tries++) { const v = mrR(lo, hi) / 10; if (!L.some((q) => q.v === v)) L.push(mrDec(v)); } };
      add(1, n10 - 1, 3);
      add(n10 + 1, n10 + 15, 7);
      return { rule: c + "보다 큰 수 꽃만 밟아요", items: mrShuffle(L).map((f) => ({ ...f, ok: f.v > c })) };
    }
    if (mrHas(u, "범위", "어림")) {
      const a = mrR(2, 7) * 10,
        b = a + 10,
        L = mrShuffle([a - 2, a, a + 3, a + 7, b, b + 2, a - 5, b - 1]);
      return { rule: a + " 이상 " + b + " 미만인 수 꽃만 밟아요", items: L.map((v) => ({ t: String(v), v, ok: v >= a && v < b })) };
    }
    // 기본: 짝수
    const ev = mrShuffle([...Array(25).keys()].map((i) => 12 + i * 2)).slice(0, mrR(3, 4)),
      od = mrShuffle([...Array(25).keys()].map((i) => 11 + i * 2)).slice(0, 3);
    return { rule: "짝수 꽃만 밟아요", items: mrShuffle([...ev, ...od]).map((v) => ({ t: String(v), v, ok: v % 2 === 0 })) };
  },
  // 등불 차례: 크기가 다른 수 4~5개 (작은 수부터)
  lamps(u, n) {
    let L = [];
    if (mrHas(u, "약분", "통분", "분수")) {
      const pool = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8]].map(([p, q]) => mrFrac(p, q));
      L = mrShuffle(pool).filter((f, i, A) => A.findIndex((g) => Math.abs(g.v - f.v) < 1e-9) === i);
    } else if (mrHas(u, "소수")) {
      L = mrShuffle([...Array(30).keys()].map((i) => mrDec((i + 1) / 10 + (i > 15 ? 1 : 0))));
    } else {
      const big = mrHas(u, "큰 수") ? 1000 : mrHas(u, "범위", "어림") ? 10 : 1;
      L = mrShuffle([...Array(60).keys()].map((i) => ({ t: String((i + 2) * big), v: (i + 2) * big })));
    }
    return L.slice(0, n);
  },
  // 눈금 뗏목: 0~1(또는 0~100) 위의 목표
  raft(u) {
    if (mrHas(u, "소수")) {
      const v = mrPick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]);
      return { t: String(v), v, ends: ["0", "1"] };
    }
    if (mrHas(u, "약분", "통분", "분수")) {
      const [p, q] = mrPick([[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [2, 5], [3, 5]]);
      return { t: p + "/" + q, v: p / q, ends: ["0", "1"] };
    }
    const v = mrPick([20, 25, 40, 50, 60, 75, 80]);
    return { t: String(v), v: v / 100, ends: ["0", "100"] };
  },
  // 바람 세기: 답이 2~5인 식
  wind(u) {
    const n = mrR(2, 5);
    if (mrHas(u, "소수")) return { t: "0.5 × " + n * 2, n };
    if (mrHas(u, "분수", "약분", "통분")) return { t: n * 4 + "/4", n };
    if (mrHas(u, "혼합")) {
      const a = mrR(2, 4);
      return { t: a + " × " + (n + 1) + " − " + (a * (n + 1) - n), n };
    }
    const a = mrR(2, 4);
    return { t: n * a + " ÷ " + a, n };
  },
};

/* ── 보물: 하루 한 번 다시 ── */
function mrGift(id, what, why) {
  const st = (save.st = save.st || {});
  st.rdev = st.rdev || {};
  st.rdev[id] = st.rdev[id] || {};
  if (st.rdev[id][what] === mrDay()) return false;
  st.rdev[id][what] = mrDay();
  const tier = (M && M.tier) || 1,
    gd = 10 + tier * 8,
    du = 2 + Math.floor(tier / 2);
  gain(5 + tier * 4, gd, du);
  if (typeof keyAdd === "function") keyAdd();
  if (typeof sfx === "function") sfx("chest");
  toast("✦ " + why + " 금화 +" + gd + " · 가루 +" + du + " · 열쇠 조각");
  store();
  hud();
  return true;
}
function mrLog(ok, q, a, t0) {
  const c = MR.cur;
  if (!c || c.logged) return;
  c.logged = 1;
  if (typeof logAdd === "function") logAdd({ u: c.unit || "기타", k: "math", ok, t: (Date.now() - (t0 || c.t0)) / 1000, q: "길목 수학 판: " + q, a });
  if (ok) save.solved = (save.solved || 0) + 1;
}
// 30-routes 의 숨은 샛길·꽃길 보물도 하루 한 번 다시
{
  const rg0 = rdGift;
  rdGift = function (id, what) {
    const r = rg0.apply(this, arguments);
    const st = save.st;
    if (st && st.rdev && st.rdev[id] && st.rdev[id][what] === 1) st.rdev[id][what] = mrDay();
    return r;
  };
}

/* ── 맵에 들어올 때 수학 판 만들기 ── */
function mrMake() {
  MR.cur = null;
  const d = M && M.dev;
  if (!d || M.kind !== "route") return;
  // 원래 장치 상태로(끈 경우에도)
  if (d.fl0) d.fl = d.fl0;
  if (d.k0) d.k = d.k0;
  if (MR.off) return;
  // 지난날 보물 다시 열기
  const st = (save.st = save.st || {});
  st.rdev = st.rdev || {};
  const R0 = st.rdev[M.id];
  if (R0) for (const k in R0) if (R0[k] !== mrDay()) delete R0[k];
  const u = mrUnit();
  if (!u) return;
  const c = { unit: u, t0: Date.now(), k: d.k };
  if (d.k === "H") {
    // 숫자 꽃: 큰길 아래쪽에 6~8송이
    const F = MR_GEN.flower(u),
      spots = [];
    for (let a = 5; a < M.w - 4 && spots.length < F.items.length; a += 3) {
      if (Math.abs(a - (d.s || -9)) <= 1 || M.G.some((row) => false)) continue;
      const P0 = rdPathRows(M, a);
      if (!P0.length) continue;
      const y = P0[P0.length - 1] + 1;
      if (rdWalk(M, a, y)) spots.push([a, y]);
    }
    d.fl0 = d.fl0 || d.fl;
    d.fl = []; // 30-routes 의 색 꽃은 쉬게
    c.flowers = spots.map(([a, y], i) => ({ a, y, ...F.items[i] })).filter((f) => f.t != null);
    c.rule = F.rule;
    c.need = c.flowers.filter((f) => f.ok).length;
    c.got = 0;
    c.done = (st.rdev[M.id] || {}).mflower === mrDay();
  } else if (d.k === "A" && d.B && d.B.length) {
    // 징검돌: 그 단원 문제 하나, 개울에 답 돌 3개
    const Q = makeQ(2),
      ch = mrShuffle([String(Q.a), ...(Q.ch || []).map(String).filter((v) => v !== String(Q.a))].slice(0, 3));
    const y0 = d.B[0];
    const rows = [y0 - 1, y0, y0 + 1].filter((y) => y > 0 && y < M.h - 1 && M.G[y][d.s] === "-");
    c.q = Q.q;
    c.a = String(Q.a);
    c.stones = rows.map((y, i) => ({ a: d.s, y, t: ch[i], ok: ch[i] === String(Q.a), sunk: false })).filter((s) => s.t != null);
    if (!c.stones.some((s) => s.ok) && c.stones.length) c.stones[0].t = c.a;
    c.stones.forEach((s) => (s.ok = s.t === c.a));
  } else if (d.k === "G") {
    c.raft = MR_GEN.raft(u);
    c.done = (st.rdev[M.id] || {}).mraft === mrDay();
  } else if (d.k === "E" && d.door) {
    c.sign = { a: d.door[0] + 1, y: d.door[1] };
    c.solved = false;
  } else if (d.k === "B" && d.lamps && d.lamps.length >= 3) {
    const L = MR_GEN.lamps(u, d.lamps.length);
    c.lamps = d.lamps.map(([a, y], i) => ({ a, y, ...L[i] }));
    c.order = c.lamps.slice().sort((p, q) => p.v - q.v);
    c.lit = [];
    c.bright = false;
  } else if (d.k === "D") {
    c.wind = MR_GEN.wind(u);
  } else return;
  MR.cur = c;
  if (!st.mrHint) st.mrHint = {};
  if (!st.mrHint[d.k]) {
    st.mrHint[d.k] = 1;
    const tip = { H: "숫자 꽃: 규칙에 맞는 꽃만 밟으면 보물이 나와요", A: "징검돌: 문제의 답이 적힌 돌만 디딜 수 있어요", G: "눈금 뗏목: 맞는 눈금에서 내리면 보물이 나와요", E: "샛길 앞 표지판에 수수께끼가 있어요", B: "등불 차례: 작은 수부터 켜면 길 전체가 밝아져요", D: "바람 세기: 예고된 식의 답만큼 밀려요" }[d.k];
    toastLater(() => "🔢 " + tip, 1800);
  }
}
{
  const lm0 = loadMap;
  loadMap = function () {
    const r = lm0.apply(this, arguments);
    mrMake();
    return r;
  };
}

/* ── 막힘: 징검돌(맞는 돌·아직 안 가라앉은 돌은 디딜 수 있음) ── */
{
  const bk0 = blk;
  blk = function (tx, ty, air) {
    const c = MR.cur;
    if (c && c.stones) {
      const s = c.stones.find((q) => q.a === tx && q.y === ty);
      if (s && !s.sunk) return false;
    }
    return bk0(tx, ty, air);
  };
}

/* ── 매 장면 ── */
{
  let prevOn = null;
  const up0 = update;
  update = function () {
    const ox = pl.x;
    up0();
    const c = MR.cur,
      d = M && M.dev;
    if (!c || !d || busy || mode !== "map") return;
    const tx = Math.floor(pl.x / T),
      ty = Math.floor(pl.y / T);
    // 숫자 꽃
    if (c.flowers && !c.done) {
      const f = c.flowers.find((q) => q.a === tx && q.y === ty);
      if (f && f.st !== "on" && f.st !== "bad") {
        if (!c.tried) (c.tried = 1), (c.t0 = Date.now());
        if (f.ok) {
          f.st = "on";
          c.got++;
          if (typeof sfx === "function") sfx("ok");
          if (c.got >= c.need) {
            c.done = true;
            mrLog(!c.miss, c.rule, c.flowers.filter((q) => q.ok).map((q) => q.t).join(","));
            st0().rdev[M.id] = st0().rdev[M.id] || {};
            mrGift(M.id, "mflower", "숫자 꽃을 모두 찾았어요!");
          }
        } else {
          f.st = "bad";
          f.badT = 60;
          c.miss = (c.miss || 0) + 1;
          if (typeof sfx === "function") sfx("bad");
          toastLater(() => "그 꽃은 규칙에 맞지 않아요: " + c.rule, 50);
        }
      }
      c.flowers.forEach((q) => q.st === "bad" && --q.badT <= 0 && (q.st = ""));
    }
    // 징검돌
    if (c.stones) {
      const s = c.stones.find((q) => q.a === tx && q.y === ty && !q.sunk);
      if (s) {
        if (!c.tried) (c.tried = 1), (c.t0 = Date.now());
        if (s.ok) {
          if (!c.solved) {
            c.solved = 1;
            mrLog(!c.miss, c.q, c.a);
            if (typeof sfx === "function") sfx("ok");
            fxPop(pl.x, pl.y - 28, "정답 돌!", "#9fe0ff");
          }
        } else {
          s.sunk = true;
          c.miss = (c.miss || 0) + 1;
          if (typeof sfx === "function") sfx("bad");
          fxPop(pl.x, pl.y - 28, "퐁! 가라앉았어요", "#c9c5d8");
          // 물가로
          pl.x = (s.a + (ox < s.a * T + 8 ? -1 : 1)) * T + 8;
          if (typeof plUnstick === "function") plUnstick();
        }
      }
    }
    // 눈금 뗏목: 발판에서 물가로 내린 순간
    if (c.raft && d.k === "G" && RD.plat) {
      const onP = tx >= d.s - 1 && tx <= d.s + 1 && M.G[ty] && M.G[ty][tx] === "-";
      if (prevOn && !onP && !c.done) {
        const v = (RD.plat.y - d.lo) / Math.max(1, d.hi - d.lo);
        if (!c.tried) (c.tried = 1), (c.t0 = Date.now());
        if (Math.abs(v - c.raft.v) < 0.07) {
          c.done = true;
          mrLog(!c.miss, c.raft.t + " 지점에서 내리기", c.raft.t);
          mrGift(M.id, "mraft", c.raft.t + " 지점에 딱 맞게 내렸어요!");
        } else {
          c.miss = (c.miss || 0) + 1;
          toast(v < c.raft.v ? "조금 더 아래(" + c.raft.ends[1] + " 쪽)에서 내려요" : "조금 더 위(" + c.raft.ends[0] + " 쪽)에서 내려요");
        }
      }
      prevOn = onP;
    } else prevOn = null;
    // 표지판 수수께끼
    if (c.sign && !c.solved && !c.asked && Math.hypot(c.sign.a * T + 8 - pl.x, c.sign.y * T + 10 - pl.y) < 16) {
      c.asked = 1;
      mrSignAsk(c);
    }
    // 등불 차례
    if (c.lamps && !c.bright) {
      c.lamps.forEach((L) => {
        const key = L.a + "," + L.y;
        if (RD.lit.has(key) && !c.lit.includes(L)) {
          if (!c.tried) (c.tried = 1), (c.t0 = Date.now());
          c.lit.push(L);
          const want = c.order[c.lit.length - 1];
          if (L !== want) {
            c.miss = (c.miss || 0) + 1;
            toast("작은 수부터 켜 봐요! 처음부터 다시");
            c.lit = [];
            RD.lit.clear();
          } else if (c.lit.length === c.order.length) {
            c.bright = true;
            d.k0 = d.k0 || d.k;
            d.k = "Bx"; // 어둠을 걷어냄(다음에 들어오면 다시 어두움)
            mrLog(!c.miss, "작은 수부터 등불 켜기", c.order.map((q) => q.t).join("<"));
            mrGift(M.id, "mlamp", "등불을 차례대로 켜서 길이 환해졌어요!");
          }
        }
      });
    }
    // 바람 세기: 예고된 칸만큼 밀기(30-routes 는 바람마다 약 7칸 → 맞춰서 덜 밀거나 더 밈)
    if (c.wind && d.k === "D") {
      if (RD.warn && !c.windNew) {
        c.windNew = 1;
        c.wind = MR_GEN.wind(c.unit);
      }
      if (!RD.warn && !RD.gust) c.windNew = 0;
      if (RD.gust && !pl.z) {
        const shelter = [0, -1].some((dy) => {
          const o = (M.O[ty + dy] || [])[tx + 1];
          return o === "r" || o === "T" || o === "l";
        });
        if (!shelter) tryMove(pl, 1.1 - (c.wind.n * T) / 100, 0, false);
      }
    }
  };
}
const st0 = () => (save.st = save.st || {});
function mrSignAsk(c) {
  if (typeof qxGen !== "function" || typeof lsOpenBox !== "function") return;
  const R = qxGen(QX_RIDDLE, qxRiddleFb),
    ch = qxChoices(R.a, R.w || []),
    t0 = Date.now();
  let first = true;
  lsOpenBox(
    lsHead("샛길 표지판", "수수께끼 · " + R.unit) +
      '<p class="lsp">표지판에 이렇게 적혀 있어요. 맞히면 숨은 샛길이 보여요!</p><p class="lsq">' + esc(R.q) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div><div class="lsrow"><button type="button" data-mr="x">그냥 지나갈래요</button></div>',
  );
  lsEl.onclick = (e) => {
    if (e.target.closest('[data-mr="x"]')) {
      lsEl.onclick = null;
      lsClose();
    }
  };
  lsChoices({ ch }, (v, b) => {
    const ok = v === String(R.a);
    if (first) {
      first = false;
      c.t0 = t0;
      mrLog(ok, R.q, R.a, t0);
    }
    if (!ok) {
      b.disabled = true;
      $("lsfb").innerHTML = '<span class="lsno">음… 다시 생각해 봐요.</span>';
      return;
    }
    c.solved = true;
    if (typeof sfx === "function") sfx("ok");
    $("lsfb").innerHTML = '<span class="lsok">정답! ' + esc(R.ex) + ' — 반짝이는 나무 사이로 지나갈 수 있어요.</span>';
    setTimeout(() => {
      lsEl.onclick = null;
      lsClose();
    }, 1400);
  });
}

/* ── 그리기 ── */
{
  const fx0 = drawFx;
  drawFx = function () {
    fx0.apply(this, arguments);
    const c = MR.cur,
      d = M && M.dev;
    if (!c || !d) return;
    try {
      const sx = (a) => Math.round(a * T + 8 - cam.x),
        sy = (y) => Math.round(y * T + 8 - cam.y);
      x.save();
      x.textAlign = "center";
      x.font = "bold 7px sans-serif";
      const lab = (X, Y, t, bg, fg) => {
        const w = Math.max(12, x.measureText(t).width + 5);
        P(x, X - w / 2, Y - 6, w, 9, bg);
        x.fillStyle = fg || "#1e1b3f";
        x.fillText(t, X, Y + 1);
      };
      const head = (t) => {
        x.font = "bold 8px sans-serif";
        const w = x.measureText(t).width + 12;
        P(x, W / 2 - w / 2, 22, w, 12, "rgba(30,27,63,.85)");
        x.fillStyle = "#ffd86b";
        x.fillText(t, W / 2, 31);
        x.font = "bold 7px sans-serif";
      };
      if (c.flowers) {
        c.flowers.forEach((f) => {
          const X = sx(f.a), Y = sy(f.y);
          const col = f.st === "on" ? "#ffd86b" : f.st === "bad" ? "#8a8a8a" : "#ff9ec4";
          P(x, X - 1, Y - 1, 2, 6, "#3B6D11");
          P(x, X - 4, Y - 6, 8, 6, col);
          lab(X, Y - 11, f.t, f.st === "on" ? "#ffe9a8" : "rgba(255,255,255,.9)");
        });
        if (!c.done && Math.abs(pl.x - sx(c.flowers[0].a) - cam.x) < 400) head("🌸 " + c.rule + " (" + c.got + "/" + c.need + ")");
      }
      if (c.stones) {
        c.stones.forEach((s) => {
          if (s.sunk) return;
          const X = sx(s.a), Y = sy(s.y);
          P(x, X - 7, Y - 4, 14, 9, "#8a8a94");
          P(x, X - 6, Y - 4, 12, 2, "#b8b8c4");
          lab(X, Y + 1, s.t, "rgba(255,255,255,.92)");
        });
        if (!c.solved) head("🪨 " + String(c.q).replace(/^계산해 보세요\.\s*/, "").slice(0, 40) + " → 답 돌을 밟아요");
      }
      if (c.raft && RD.plat) {
        const X = sx(d.s + 2) + 4,
          y0 = sy(d.lo),
          y1 = sy(d.hi);
        P(x, X, y0, 2, y1 - y0, "#fff6d6");
        [0, 0.25, 0.5, 0.75, 1].forEach((k) => P(x, X - 2, Math.round(y0 + (y1 - y0) * k), 6, 1, "#fff6d6"));
        lab(X + 10, y0, c.raft.ends[0], "rgba(255,255,255,.9)");
        lab(X + 12, y1, c.raft.ends[1], "rgba(255,255,255,.9)");
        const ty = Math.round(y0 + (y1 - y0) * c.raft.v);
        if (!c.done) {
          P(x, X - 4, ty, 10, 1, "#ff6b7a");
          head("🛶 " + c.raft.t + " 지점에서 내려요(" + c.raft.ends[0] + "~" + c.raft.ends[1] + ")");
        }
        const py = Math.round(y0 + (y1 - y0) * ((RD.plat.y - d.lo) / Math.max(1, d.hi - d.lo)));
        P(x, X - 3, py - 1, 8, 3, "#7ee07a");
      }
      if (c.sign) {
        const X = sx(c.sign.a), Y = sy(c.sign.y);
        P(x, X - 1, Y - 2, 2, 8, "#6b4a2a");
        P(x, X - 6, Y - 8, 12, 7, "#c9a06a");
        lab(X, Y - 13, c.solved ? "!" : "?", "#ffd86b");
        if (c.solved) (d.pass || []).forEach((k) => {
          const [a, y] = k.split(",").map(Number);
          if (tk % 20 < 12) P(x, sx(a) - 2, sy(y) - 6, 4, 4, "#fff6d0");
        });
      }
      if (c.lamps) {
        c.lamps.forEach((L) => lab(sx(L.a), sy(L.y) - 14, L.t, c.lit.includes(L) ? "#ffe28a" : "rgba(255,255,255,.85)"));
        if (!c.bright) head("🏮 작은 수부터 등불을 켜요 (" + c.lit.length + "/" + c.order.length + ")");
      }
      if (c.wind && (RD.warn || RD.gust)) head("🌬 바람 = " + c.wind.t + " 칸만큼 밀어요");
      x.restore();
    } catch (e) {}
  };
}
