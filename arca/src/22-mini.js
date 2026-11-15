/* ════════ 보스전 단원 미니 조작 (프롬프트 C, 2026-11-15, docs/설계_미니조작.md, 선생님 확인) ════════
   · 보스 3단계 중 2단계(체력 2/3)에서 부하를 부르는 대신, 그 부 단원에 맞는 조작 한 판.
     맞히면 보스에게 큰 피해(최대 체력의 1/3, 쓰러뜨리지는 않음). 보스가 없는 부(1·7부)는 핵심 자리를 다시 쓸 때 짧은 판.
   · 종류는 단원 이름 낱말로: 분수·소수 → 물약 조합, 계산 → 주문 순서, 재기·어림 → 저울·눈금. 맞는 것이 없으면 예전 그대로.
   · 틀려도 벌 없음: 1번 → 힌트, 2번 → 더 자세한 힌트, 3번 → 풀이를 보여 주고 쉬운 수로 다시.
   · 조작: 누르기(마우스·터치)만으로 다 되고, 물약은 끌어다 놓기도 된다. 키보드는 Tab·엔터(·←→ 다이얼).
   · 그림은 캔버스·SVG 로 직접(선생님 결정). 판 하나 = 학습 기록 1문제(처음에 틀림 없이 맞혔는지). */
const MINI = { on: false };
function miniKind(nm) {
  if (!nm || (typeof studyCfg === "object" && studyCfg.subj === "eng")) return null;
  const has = (...k) => k.some((w) => nm.includes(w));
  // 프롬프트 I(선생님이 고른 2종): 약수·배수 → 약점 숫자, 규칙 → 톱니 맞추기
  if (has("약수", "배수")) return "factor";
  if (has("규칙", "대응")) return "gear";
  if (has("분수", "소수", "약분", "통분")) return "potion";
  if (has("혼합", "덧셈", "뺄셈", "곱셈", "나눗셈", "큰 수")) return "order";
  if (has("길이", "시간", "들이", "무게", "각도", "어림", "범위", "넓이", "둘레")) return "scale";
  return null;
}
function miniUnit() {
  return typeof unitName === "function" ? unitName(mapPart()) : null;
}
const mnR = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const mnPick = (L) => L[Math.floor(Math.random() * L.length)];
const mnGcd = (a, b) => (b ? mnGcd(b, a % b) : a);
const mnGrade = () => (typeof studyCfg === "object" ? studyCfg.grade : 5) || 5;

/* ── 문제 만들기 ── */
function mkPotion(easy, unit) {
  const dec = unit && unit.includes("소수") && !unit.includes("분수");
  if (dec) {
    // 소수: 0.5·0.25·0.1·0.05 병, 목표는 0.05 단위
    const b = 20,
      a = easy ? mnPick([10, 15]) : mnR(7, 19);
    return { dec: 1, b, a, bottles: [10, 5, 2, 1], lab: (k) => (k / b).toFixed(2).replace(/0$/, "").replace(/\.$/, ""), target: (a / b).toFixed(2).replace(/0$/, "") };
  }
  const g = mnGrade(),
    fam = easy ? [4] : g <= 3 ? [4, 8] : g === 4 ? [4, 6, 8] : [6, 8, 12];
  const b = mnPick(fam),
    bottles = { 4: [2, 1], 6: [3, 2, 1], 8: [4, 2, 1], 12: [6, 4, 3, 2, 1] }[b].filter((k) => b / k === Math.round(b / k) || true);
  let a;
  do a = mnR(2, b - 1);
  while (mnGcd(a, b) === 1 && b > 4 && Math.random() < 0.6 && !easy); // 약분되는 목표를 조금 더 자주
  const fr = (k) => {
    const d = mnGcd(k, b);
    return k / d + "/" + b / d;
  };
  return { b, a, bottles, lab: fr, target: fr(a) };
}
function mkOrder(easy, unit) {
  const g = mnGrade(),
    plain = unit && !unit.includes("혼합") && (unit.includes("덧셈") || unit.includes("뺄셈"));
  for (let t = 0; t < 50; t++) {
    let toks;
    if (plain || g <= 3) {
      const n = () => mnR(easy ? 2 : 10, easy ? 9 : 60);
      toks = [n(), mnPick(["+", "−"]), n(), mnPick(["+", "−"]), n()];
    } else {
      const s = mnR(1, easy ? 2 : 4);
      const n = (lo, hi) => mnR(lo, hi);
      if (s === 1) toks = [n(10, 40), "−", n(2, 9), "×", n(2, 5), "+", n(1, 9)];
      else if (s === 2) toks = ["(", n(2, 15), "+", n(2, 9), ")", "×", n(2, 6), "−", n(1, 9)];
      else if (s === 3) {
        const d = n(2, 6);
        toks = [n(10, 30), "+", d * n(2, 8), "÷", d, "−", n(1, 9)];
      } else {
        const d = n(2, 5);
        toks = [n(2, 9), "×", "(", n(10, 20), "−", n(2, 9), ")", "÷", d];
        // 괄호 안 값이 d 로 나눠지게
        const v = toks[3] - toks[5];
        if ((toks[0] * v) % d) continue;
      }
    }
    const steps = orderSteps(toks);
    if (steps && steps.every((s) => s.v >= 0 && Number.isInteger(s.v))) return { toks, steps };
  }
  return mkOrder(true, "덧셈");
}
// 계산 순서: 괄호 → ×÷(왼쪽부터) → +−(왼쪽부터). 각 단계에서 계산할 연산자의 위치와 결과
function orderSteps(toks0) {
  let toks = toks0.slice();
  const steps = [];
  const val = (L) => L;
  for (let guard = 0; guard < 10; guard++) {
    // 괄호 안에 숫자 하나만 남으면 괄호를 지운다
    for (let i = 0; i + 2 < toks.length; i++)
      if (toks[i] === "(" && typeof toks[i + 1] === "number" && toks[i + 2] === ")") {
        toks.splice(i, 3, toks[i + 1]);
        i = -1;
      }
    const ops = toks.map((t, i) => (typeof t === "string" && "+−×÷".includes(t) ? i : -1)).filter((i) => i >= 0);
    if (!ops.length) break;
    // 가장 안쪽 괄호 범위
    let lo = 0,
      hi = toks.length;
    let depth = 0,
      best = -1,
      bd = 0;
    toks.forEach((t, i) => {
      if (t === "(") {
        depth++;
        if (depth > bd) (bd = depth), (best = i);
      } else if (t === ")") depth--;
    });
    if (best >= 0) {
      lo = best;
      hi = toks.indexOf(")", best);
    }
    const inR = ops.filter((i) => i > lo - (best >= 0 ? 0 : 1) && i < hi);
    const md = inR.find((i) => toks[i] === "×" || toks[i] === "÷");
    const i = md != null ? md : inR[0];
    const a = toks[i - 1],
      b = toks[i + 1],
      o = toks[i];
    const v = o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : a / b;
    steps.push({ i, o, a, b, v, toks: toks.slice() });
    toks.splice(i - 1, 3, v);
  }
  return steps;
}
function mkScale(easy, unit) {
  const u = unit || "";
  const g = mnGrade();
  if (u.includes("각도")) {
    const t = easy ? mnPick([90, 45, 180]) : mnR(2, 34) * 5;
    return { mode: "dial", unitTxt: "°", min: 0, max: 180, step: 5, target: t, cur: 90, q: "빛줄기를 " + t + "° 로 맞춰요", angle: 1 };
  }
  if (u.includes("어림") || u.includes("범위")) {
    const n = mnR(1200, 9800),
      how = easy ? "반올림" : mnPick(["올림", "버림", "반올림"]),
      t = how === "올림" ? Math.ceil(n / 100) * 100 : how === "버림" ? Math.floor(n / 100) * 100 : Math.round(n / 100) * 100;
    const lo = Math.floor(n / 1000) * 1000;
    return { mode: "dial", unitTxt: "", min: lo, max: lo + 1000, step: 100, target: t, cur: lo, q: n.toLocaleString() + " 을(를) " + how + "하여 백의 자리까지 → 눈금에 맞춰요" };
  }
  if (u.includes("넓이") || u.includes("둘레")) {
    const w = mnR(easy ? 2 : 3, easy ? 5 : 9),
      h = mnR(2, easy ? 4 : 7),
      peri = u.includes("둘레") && Math.random() < 0.5;
    const t = peri ? 2 * (w + h) : w * h;
    return { mode: "dial", unitTxt: peri ? "cm" : "cm²", min: 0, max: Math.max(40, Math.ceil(t / 10) * 10 + 10), step: 1, target: t, cur: 0, q: "가로 " + w + "cm, 세로 " + h + "cm 인 직사각형의 " + (peri ? "둘레" : "넓이") + "를 눈금에 맞춰요", rect: [w, h] };
  }
  // 저울: 단원에 맞는 단위
  const SETS = u.includes("시간")
    ? { w: [60, 30, 10, 1], f: (v) => (v >= 60 ? Math.floor(v / 60) + "시간 " : "") + (v % 60 ? (v % 60) + "분" : ""), lab: ["1시간", "30분", "10분", "1분"], top: 180 }
    : u.includes("길이")
      ? { w: [100, 50, 10, 1], f: (v) => (v >= 100 ? Math.floor(v / 100) + "m " : "") + (v % 100 ? (v % 100) + "cm" : ""), lab: ["1m", "50cm", "10cm", "1cm"], top: 400 }
      : u.includes("들이")
        ? { w: [1000, 500, 100, 10], f: (v) => (v >= 1000 ? Math.floor(v / 1000) + "L " : "") + (v % 1000 ? (v % 1000) + "mL" : ""), lab: ["1L", "500mL", "100mL", "10mL"], top: 4000 }
        : { w: [1000, 500, 100, 50], f: (v) => (v >= 1000 ? Math.floor(v / 1000) + "kg " : "") + (v % 1000 ? (v % 1000) + "g" : ""), lab: ["1kg", "500g", "100g", "50g"], top: 4000 };
  const unitW = SETS.w[SETS.w.length - 1];
  let t;
  do t = (easy ? mnR(2, 6) * SETS.w[1] : mnR(3, Math.floor(SETS.top / unitW))) * unitW;
  while (t < SETS.w[2] || t > SETS.top);
  return { mode: "weigh", set: SETS, target: t, cur: 0, placed: [], q: "저울이 " + SETS.f(t).trim() + " 일 때 수평이 돼요. 추를 올려요" };
}

function mkFactor(easy) {
  const g = mnGrade(),
    mul = !easy && Math.random() < 0.4;
  const n = easy ? mnPick([6, 8, 10]) : mul ? mnR(3, 9) : mnPick(g <= 4 ? [12, 16, 18, 20] : [18, 24, 30, 36, 40, 48]);
  const isAns = (v) => (mul ? v % n === 0 : n % v === 0);
  const pool = new Set();
  const ans = [];
  if (mul) for (let k = 1; k <= 6; k++) ans.push(n * k);
  else for (let d = 1; d <= n; d++) if (n % d === 0) ans.push(d);
  ans.sort(() => Math.random() - 0.5)
    .slice(0, Math.min(5, ans.length))
    .forEach((v) => pool.add(v));
  while (pool.size < 9) {
    const v = mul ? mnR(2, n * 6) : mnR(2, n + 6);
    if (!isAns(v)) pool.add(v);
  }
  const nums = [...pool].sort(() => Math.random() - 0.5);
  return { n, mul, nums, sel: new Set(), ans: nums.filter(isAns), target: n + (mul ? "의 배수" : "의 약수") };
}
function mkGear(easy) {
  const k = easy ? mnR(2, 3) : mnR(2, 6),
    add = !easy && Math.random() < 0.4,
    f = (x) => (add ? x + k : x * k);
  const xs = [1, 2, 3, 4, 5],
    blanks = easy ? [3] : [3, 5];
  const rows = xs.map((x) => ({ x, y: f(x), blank: blanks.includes(x), got: null }));
  const opts = (y) => [...new Set([y, y + (add ? 1 : k), y - (add ? 1 : 1), add ? y * 2 : y + 1])].filter((v) => v > 0).slice(0, 3).sort(() => Math.random() - 0.5);
  rows.forEach((r) => r.blank && (r.opts = opts(r.y)));
  const ruleOpts = [...new Set(["△ = □ × " + k, "△ = □ + " + k, add ? "△ = □ × " + (k + 1) : "△ = □ + " + (k + 1)])].sort(() => Math.random() - 0.5);
  return { k, add, rows, rule: add ? "△ = □ + " + k : "△ = □ × " + k, ruleOpts, ruleGot: null, target: "" };
}

/* ── 화면 ── */
const mini = document.createElement("div");
mini.className = "box mini";
mini.id = "mini";
mini.hidden = true;
$("stage").appendChild(mini);
const MINI_NAME = { potion: "물약 조합", order: "주문 순서", scale: "저울·눈금", factor: "약점 숫자", gear: "톱니 맞추기" };
const MINI_STORY = {
  potion: (t) => "이 보스는 딱 " + t + " 만큼의 물약에 약해요. 병을 솥에 넣어 맞춰요!",
  order: () => "주문이 엉켜 있어요. 먼저 계산할 곳부터 차례로 눌러 풀어요!",
  scale: () => "문지기의 저울과 눈금이 맞아야 빛이 열려요.",
  factor: () => "보스 몸에 숫자가 떠올랐어요. 약점 숫자만 모두 골라 맞혀요!",
  gear: () => "앞 톱니(□)가 돌면 뒤 톱니(△)가 따라 돌아요. 규칙을 찾아 문을 열어요!",
};
function miniOpen(kind, opt) {
  const unit = miniUnit();
  MINI.on = true;
  MINI.kind = kind;
  MINI.unit = unit;
  MINI.miss = 0;
  MINI.t0 = Date.now();
  MINI.done = opt.done;
  MINI.title = opt.title;
  MINI.easy = false;
  busy = true;
  miniNew();
  mini.hidden = false;
  document.body.classList.add("miniing");
}
function miniNew() {
  const k = MINI.kind;
  MINI.P = k === "potion" ? mkPotion(MINI.easy, MINI.unit) : k === "order" ? mkOrder(MINI.easy, MINI.unit) : k === "factor" ? mkFactor(MINI.easy) : k === "gear" ? mkGear(MINI.easy) : mkScale(MINI.easy, MINI.unit);
  MINI.cur = 0;
  MINI.added = [];
  MINI.si = 0;
  MINI.hint = "";
  miniRender();
}
function miniHint() {
  MINI.miss++;
  const k = MINI.kind,
    P = MINI.P;
  if (MINI.miss >= 3) {
    // 풀이를 보여 주고 쉬운 수로
    let sol = "";
    if (k === "potion") {
      let r = P.a;
      const use = [];
      P.bottles.forEach((v) => {
        while (r >= v) (r -= v), use.push(P.lab(v));
      });
      sol = P.target + " = " + use.join(" + ");
    } else if (k === "order") sol = P.steps.map((s) => s.a + " " + s.o + " " + s.b + " = " + s.v).join(" → ");
    else if (k === "factor") sol = P.target + ": " + P.ans.sort((a, b) => a - b).join(", ");
    else if (k === "gear") sol = P.rule + " (" + P.rows.map((r) => r.x + "→" + r.y).join(", ") + ")";
    else sol = "정답은 " + (P.mode === "weigh" ? P.set.f(P.target).trim() : P.target + P.unitTxt);
    MINI.hint = "풀이: " + sol + " · 쉬운 수로 다시 해 봐요!";
    MINI.easy = true;
    const h = MINI.hint;
    miniNew();
    MINI.hint = h;
    MINI.miss = 3;
    return miniRender();
  }
  const H = {
    potion: [
      "넘쳤어요! 큰 병부터 넣고, 남은 만큼 작은 병으로 채워 봐요.",
      "막대 한 칸 = 1/" + P.b + " 이에요. " + P.target + " 는 " + P.a + "칸이에요.",
    ],
    order: ["주문이 엉켰어요! 괄호 → 곱셈·나눗셈 → 덧셈·뺄셈 순서예요.", "같은 순서끼리는 왼쪽부터예요. 빛나는 곳을 봐요."],
    scale: ["아직 안 맞아요. 바늘이 어느 쪽으로 기울었는지 봐요.", "목표와 지금 값의 차이를 계산해서 그만큼 움직여요."],
    factor: P.mul ? [P.n + "의 배수는 " + P.n + "에 1, 2, 3…을 곱한 수예요.", P.n + " 단 곱셈구구를 떠올려 봐요."] : [P.n + "의 약수는 " + P.n + "을(를) 나누어떨어지게 하는 수예요.", "1과 " + P.n + "도 약수예요. 짝(곱해서 " + P.n + ")을 찾아봐요."],
    gear: ["□가 1 늘 때 △는 얼마씩 늘어나는지 봐요.", "표의 한 줄(□=1, 2)에서 △를 만들려면 □에 무엇을 해야 하나요?"],
  };
  MINI.hint = H[k][Math.min(1, MINI.miss - 1)];
  miniRender();
}
function miniWin() {
  const firstTry = MINI.miss === 0;
  if (typeof logAdd === "function") logAdd({ u: MINI.unit, k: "math", ok: firstTry, t: (Date.now() - MINI.t0) / 1000, q: "미니 조작(" + MINI_NAME[MINI.kind] + ")" });
  if (typeof keyAdd === "function") keyAdd();
  save.solved = (save.solved || 0) + 1;
  if (typeof sfx === "function") sfx("lvl");
  mini.innerHTML = '<div class="mnh"><b>' + MINI_NAME[MINI.kind] + ' 성공!</b></div><p class="mnwin">✦ 약점을 정확히 맞혔어요!</p><button type="button" class="mnok">계속</button>';
  const b = mini.querySelector(".mnok");
  b.focus();
  b.onclick = () => {
    mini.hidden = true;
    MINI.on = false;
    busy = false;
    document.body.classList.remove("miniing");
    $("stage").focus();
    const d = MINI.done;
    MINI.done = null;
    if (d) d(firstTry);
  };
}
function miniRender() {
  const k = MINI.kind,
    P = MINI.P;
  let body = "";
  if (k === "potion") {
    const segs = Array.from({ length: P.b }, (_, i) => '<i class="' + (i < MINI.cur ? "f" : "") + (i === P.a - 1 ? " tg" : "") + (MINI.miss >= 2 && i < P.a ? " hl" : "") + '"></i>').join("");
    body =
      '<p class="mnq">목표: <b>' + P.target + "</b> · 지금 솥: <b>" + (MINI.cur ? P.lab(MINI.cur) : "0") + "</b></p>" +
      '<div class="mnpot" id="mnpot" aria-label="솥(여기에 병을 넣어요)"><div class="mnbar">' + segs + "</div><small>솥 · 막대 한 칸 = " + P.lab(1) + "</small></div>" +
      '<div class="mnbots">' + P.bottles.map((v) => '<button type="button" draggable="true" data-bot="' + v + '"><span class="mnbt" style="--h:' + Math.round((v / P.b) * 100) + '%"></span>' + P.lab(v) + "</button>").join("") + "</div>" +
      '<div class="mnrow"><button type="button" data-act="undo">↶ 하나 빼기</button><button type="button" data-act="empty">솥 비우기</button></div>';
  } else if (k === "order") {
    const st = P.steps[MINI.si],
      toks = st ? st.toks : [P.steps[P.steps.length - 1].v];
    body =
      '<p class="mnq">' + (st ? "먼저 계산할 기호(룬)를 눌러요" : "") + "</p>" +
      '<div class="mnrunes">' +
      toks.map((t, i) => (typeof t === "string" && "+−×÷".includes(t) ? '<button type="button" class="rn op' + (MINI.miss >= 2 && st && i === st.i ? " hl" : "") + '" data-op="' + i + '">' + t + "</button>" : '<span class="rn">' + t + "</span>")).join("") +
      "</div>" +
      (MINI.si ? '<p class="mndone">' + P.steps.slice(0, MINI.si).map((s) => s.a + " " + s.o + " " + s.b + " = " + s.v).join(" → ") + "</p>" : "");
  } else if (k === "factor") {
    body =
      '<p class="mnq">보스의 약점: <b>' + P.target + "</b> 를 모두 골라요 (" + P.sel.size + "개 골랐어요)</p>" +
      '<div class="mnnums">' + P.nums.map((v) => '<button type="button" data-num="' + v + '" aria-pressed="' + P.sel.has(v) + '" class="' + (P.sel.has(v) ? "on" : "") + '">' + v + (P.sel.has(v) ? " ✓" : "") + "</button>").join("") + "</div>" +
      '<div class="mnrow"><button type="button" data-act="ok">고른 숫자로 공격!</button></div>';
  } else if (k === "gear") {
    const turn = P.rows.filter((r) => !r.blank || r.got === r.y).length;
    body =
      '<div class="mngears" aria-hidden="true"><span class="g1" style="--r:' + turn * 40 + 'deg">⚙</span><span class="g2" style="--r:' + -turn * 40 * (P.add ? 1 : P.k) + 'deg">⚙</span></div>' +
      '<table class="mntab"><tr><th>앞 톱니 □</th>' + P.rows.map((r) => "<td>" + r.x + "</td>").join("") + "</tr><tr><th>뒤 톱니 △</th>" +
      P.rows.map((r, i) => "<td>" + (r.blank && r.got !== r.y ? '<span class="mnsel">' + r.opts.map((o) => '<button type="button" data-gr="' + i + '" data-gv="' + o + '">' + o + "</button>").join("") + "</span>" : r.y) + "</td>").join("") +
      "</tr></table>" +
      (P.rows.every((r) => !r.blank || r.got === r.y) ? '<p class="mnq">규칙을 골라요</p><div class="mnrow">' + P.ruleOpts.map((o) => '<button type="button" data-rule="' + esc(o) + '">' + esc(o) + "</button>").join("") + "</div>" : '<p class="mnq">빈칸에 들어갈 수를 골라요</p>');
  } else if (P.mode === "weigh") {
    const diff = MINI.cur - P.target,
      tilt = Math.max(-18, Math.min(18, (diff / P.target) * 40));
    body =
      '<p class="mnq">' + esc(P.q) + "</p>" +
      '<svg class="mnscale" viewBox="0 0 200 90" role="img" aria-label="저울 ' + (diff === 0 ? "수평" : diff > 0 ? "추 쪽이 무거움" : "추 쪽이 가벼움") + '"><polygon points="92,86 108,86 100,40" fill="#8a6a3a"/><g transform="rotate(' + tilt + ' 100 40)"><rect x="20" y="38" width="160" height="4" fill="#c9a36a"/><line x1="40" y1="42" x2="40" y2="58" stroke="#c9a36a"/><line x1="160" y1="42" x2="160" y2="58" stroke="#c9a36a"/><rect x="18" y="58" width="44" height="5" rx="2" fill="#e7d3a8"/><rect x="138" y="58" width="44" height="5" rx="2" fill="#e7d3a8"/><text x="40" y="54" font-size="9" text-anchor="middle" fill="#ffe9a8">목표</text><text x="160" y="54" font-size="9" text-anchor="middle" fill="#ffe9a8">추</text></g><text x="100" y="20" font-size="10" text-anchor="middle" fill="#fff6d6">' + (diff === 0 ? "수평!" : diff > 0 ? "추 쪽이 무거워요 ↘" : "추 쪽이 가벼워요 ↗") + "</text></svg>" +
      '<p class="mnq">올린 추: <b>' + (MINI.cur ? P.set.f(MINI.cur).trim() : "없음") + "</b></p>" +
      '<div class="mnbots">' + P.set.w.map((v, i) => '<button type="button" data-w="' + v + '">' + P.set.lab[i] + " 추</button>").join("") + "</div>" +
      '<div class="mnrow"><button type="button" data-act="undo">↶ 하나 내리기</button><button type="button" data-act="ok">이대로 맞춰 보기</button></div>';
  } else {
    // 다이얼(각도·눈금)
    const v = P.cur,
      pct = (v - P.min) / (P.max - P.min);
    let vis;
    if (P.angle) {
      const a = (v * Math.PI) / 180,
        ta = (P.target * Math.PI) / 180;
      vis =
        '<svg class="mndial" viewBox="0 0 200 110" role="img" aria-label="각도 ' + v + '도"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#5d548a" stroke-width="2"/>' +
        Array.from({ length: 19 }, (_, i) => {
          const r = (i * 10 * Math.PI) / 180;
          return '<line x1="' + (100 + Math.cos(Math.PI - r) * 74) + '" y1="' + (100 - Math.sin(Math.PI - r) * 74) + '" x2="' + (100 + Math.cos(Math.PI - r) * 80) + '" y2="' + (100 - Math.sin(Math.PI - r) * 80) + '" stroke="#a59ec6"/>';
        }).join("") +
        '<line x1="100" y1="100" x2="180" y2="100" stroke="#fff6d6" stroke-width="2"/><line x1="100" y1="100" x2="' + (100 + Math.cos(a) * 78) + '" y2="' + (100 - Math.sin(a) * 78) + '" stroke="#ffd86b" stroke-width="3"/>' +
        (MINI.miss >= 2 ? '<line x1="100" y1="100" x2="' + (100 + Math.cos(ta) * 60) + '" y2="' + (100 - Math.sin(ta) * 60) + '" stroke="#7ee07a" stroke-dasharray="3 3"/>' : "") +
        '<text x="100" y="92" font-size="12" text-anchor="middle" fill="#fff6d6">' + v + "°</text></svg>";
    } else {
      vis =
        '<div class="mnline" role="img" aria-label="눈금 ' + v + '"><div class="mnticks">' +
        Array.from({ length: 11 }, (_, i) => "<span>" + (P.min + ((P.max - P.min) * i) / 10).toLocaleString() + "</span>").join("") +
        '</div><i class="mnptr" style="left:' + pct * 100 + '%"></i>' + (MINI.miss >= 2 ? '<i class="mntg" style="left:' + ((P.target - P.min) / (P.max - P.min)) * 100 + '%"></i>' : "") + "</div>" +
        (P.rect ? '<svg class="mnrect" viewBox="0 0 120 70"><rect x="4" y="4" width="' + P.rect[0] * 12 + '" height="' + P.rect[1] * 8 + '" fill="#3d3570" stroke="#ffd86b"/><text x="' + (4 + P.rect[0] * 6) + '" y="' + (P.rect[1] * 8 + 14) + '" font-size="8" fill="#fff6d6" text-anchor="middle">' + P.rect[0] + "cm</text></svg>" : "");
    }
    body =
      '<p class="mnq">' + esc(P.q) + "</p>" + vis +
      '<p class="mnq">지금: <b>' + v.toLocaleString() + P.unitTxt + "</b></p>" +
      '<div class="mnrow"><button type="button" data-d="-' + P.step * 5 + '">◀◀</button><button type="button" data-d="-' + P.step + '">◀ ' + P.step + '</button><button type="button" data-d="' + P.step + '">' + P.step + ' ▶</button><button type="button" data-d="' + P.step * 5 + '">▶▶</button></div>' +
      '<div class="mnrow"><button type="button" data-act="ok">이대로 맞춰 보기</button></div>';
  }
  mini.innerHTML =
    '<div class="mnh"><b>' + MINI_NAME[k] + "</b><small>" + esc(MINI.title || "") + (MINI.unit ? " · " + esc(MINI.unit) : "") + "</small></div>" +
    '<p class="mnstory">' + MINI_STORY[k](P.target) + "</p>" + body +
    (MINI.hint ? '<p class="mnhint" role="status">' + esc(MINI.hint) + "</p>" : "");
}
mini.addEventListener("click", (e) => {
  if (!MINI.on) return;
  const b = e.target.closest("button");
  if (!b) return;
  const P = MINI.P,
    k = MINI.kind;
  if (b.dataset.bot) return potionAdd(+b.dataset.bot);
  if (b.dataset.act === "undo") {
    if (k === "potion" && MINI.added.length) MINI.cur -= MINI.added.pop();
    if (k === "scale" && P.placed.length) MINI.cur -= P.placed.pop();
    return miniRender();
  }
  if (b.dataset.act === "empty") {
    MINI.cur = 0;
    MINI.added = [];
    return miniRender();
  }
  if (b.dataset.op != null) {
    const st = P.steps[MINI.si];
    if (!st) return;
    if (+b.dataset.op === st.i) {
      MINI.si++;
      MINI.hint = "";
      if (typeof sfx === "function") sfx("ok");
      if (MINI.si >= P.steps.length) return miniWin();
      return miniRender();
    }
    if (typeof sfx === "function") sfx("bad");
    return miniHint();
  }
  if (b.dataset.num) {
    const v = +b.dataset.num;
    P.sel.has(v) ? P.sel.delete(v) : P.sel.add(v);
    return miniRender();
  }
  if (b.dataset.gr != null) {
    const r = P.rows[+b.dataset.gr],
      v = +b.dataset.gv;
    if (v === r.y) {
      r.got = v;
      if (typeof sfx === "function") sfx("ok");
      return miniRender();
    }
    if (typeof sfx === "function") sfx("bad");
    return miniHint();
  }
  if (b.dataset.rule) {
    if (b.dataset.rule === P.rule) return miniWin();
    if (typeof sfx === "function") sfx("bad");
    return miniHint();
  }
  if (b.dataset.w) {
    P.placed.push(+b.dataset.w);
    MINI.cur += +b.dataset.w;
    return miniRender();
  }
  if (b.dataset.d) {
    P.cur = Math.max(P.min, Math.min(P.max, P.cur + +b.dataset.d));
    return miniRender();
  }
  if (b.dataset.act === "ok" && k === "factor") {
    const ok = P.ans.length === P.sel.size && P.ans.every((v) => P.sel.has(v));
    if (ok) return miniWin();
    if (typeof sfx === "function") sfx("bad");
    // 틀린 것은 빼 주고 힌트
    [...P.sel].forEach((v) => !P.ans.includes(v) && P.sel.delete(v));
    return miniHint();
  }
  if (b.dataset.act === "ok") {
    const v = P.mode === "weigh" ? MINI.cur : P.cur;
    if (v === P.target) return miniWin();
    if (typeof sfx === "function") sfx("bad");
    return miniHint();
  }
});
function potionAdd(v) {
  const P = MINI.P;
  MINI.cur += v;
  MINI.added.push(v);
  if (MINI.cur > P.a) {
    // 넘침: 솥을 비우고 힌트
    MINI.cur = 0;
    MINI.added = [];
    if (typeof sfx === "function") sfx("bad");
    return miniHint();
  }
  if (typeof sfx === "function") sfx("pick");
  if (MINI.cur === P.a) return miniWin();
  miniRender();
}
// 끌어다 놓기(물약 병 → 솥)
mini.addEventListener("dragstart", (e) => {
  const b = e.target.closest("[data-bot]");
  if (b) e.dataTransfer.setData("text/plain", b.dataset.bot);
});
mini.addEventListener("dragover", (e) => {
  if (e.target.closest("#mnpot")) e.preventDefault();
});
mini.addEventListener("drop", (e) => {
  if (!e.target.closest("#mnpot")) return;
  e.preventDefault();
  const v = +e.dataTransfer.getData("text/plain");
  if (v) potionAdd(v);
});
// 키보드: ←→ 다이얼
addEventListener(
  "keydown",
  (e) => {
    if (!MINI.on) return;
    const P = MINI.P;
    if (P && P.mode === "dial" && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
      P.cur = Math.max(P.min, Math.min(P.max, P.cur + (e.code === "ArrowLeft" ? -P.step : P.step)));
      miniRender();
    }
    // 게임 조작(이동·공격·숫자 답)은 막고, 엔터·Tab 은 단추에 맡긴다
    if (!["Tab", "Enter", "Space"].includes(e.code)) {
      e.stopImmediatePropagation();
      if (e.code.startsWith("Arrow")) e.preventDefault();
    }
  },
  true,
);

/* ── 보스 2단계 = 미니 조작 ── */
{
  const fhM = fxHit;
  fxHit = function (d) {
    const m = B && B.m,
      ph0 = m ? m.ph || 1 : 1;
    fhM(d);
    if (m && B && B.MI && B.MI.boss && ph0 < 2 && m.ph === 2 && miniKind(miniUnit())) m.miniWant = 1;
  };
  const bmM = bossMinions;
  bossMinions = function (boss, n) {
    if (!boss || !boss.miniWant) return bmM(boss, n);
    boss.miniWant = 0;
    const kind = miniKind(miniUnit()),
      go = () => {
        if (busy || B || mode !== "map" || dl) return setTimeout(go, 200);
        miniOpen(kind, {
          title: MON[boss.type].n + " 2단계",
          done: () => {
            const full = mstat(boss).hp;
            boss.hpNow = Math.max(1, (boss.hpNow == null ? full : boss.hpNow) - Math.round(full / 3));
            boss.hit = 12;
            fxPop(boss.x, boss.y - 44, "약점 대폭발!", "#ffd86b");
            for (let i = 0; i < 30; i++) sp.push({ a: boss.x - 14 + Math.random() * 28, y: boss.y - 30 + Math.random() * 24, t: 10 + Math.random() * 12 });
            hud();
          },
        });
      };
    toast(jo(MON[boss.type].n, "이", "가") + " 약점을 드러냈어요! (2단계 · " + MINI_NAME[kind] + ")");
    setTimeout(go, 300);
  };
  // 보스가 없는 부(1·7부): 핵심 자리를 다시 쓸 때 짧은 판 하나
  const dfM = doFill;
  doFill = function (p, cost) {
    const pi = typeof townPart === "function" ? townPart() : -1,
      P0 = PARTS[pi] || {},
      kind = miniKind(miniUnit());
    if (p && p.core && !P0.boss && kind && !p.miniDone) {
      return miniOpen(kind, {
        title: "핵심 자리 다시 쓰기",
        done: () => {
          p.miniDone = 1;
          dfM(p, cost);
        },
      });
    }
    return dfM(p, cost);
  };
}
