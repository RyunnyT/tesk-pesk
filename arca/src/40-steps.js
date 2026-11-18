/* ════════ 5학년 구멍 메우기 (프롬프트 T, 2026-11-16, docs/작업_프롬프트3_RPG와수학.md) ════════
   ① 단계 풀이 갈래 더하기: 24-learn 의 stepSolve 가 알아보지 못한(null) 문제만 여기서 본다(기존 갈래는 그대로).
      규칙과 대응(대응표) · 약분(기약분수)·통분(공통분모) · 수의 범위(포함)·어림(올림·버림·반올림) · 합동(대응변·각)
      · 직육면체(면·모서리·꼭짓점 수, 모서리 길이의 합) · 평균 · 가능성. 풀이 글은 그 문제의 수로, 마지막 칸 = 정답.
   ② 겹치는 단원 넓히기(27-figq 에 생성기 더하기): 5-1 규칙과 대응 `fqRule`(대응표 빈칸·성냥개비 무늬·대응 문장제),
      5-2 직육면체 `fqCuboid2`(보이는/안 보이는 면·꼭짓점, 수직인 면, 전개도에서 마주 보는 면, 점선 모서리 합, 정육면체 모서리 합, 평행한 면의 넓이).
   끄기: TS.off = true (풀이 갈래만; 생성기는 FQ.off) */
const TS = { off: false };
const tsComma = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const tsGcd = (a, b) => (b ? tsGcd(b, a % b) : a);
const tsNums = (s) => (String(s).match(/\d+/g) || []).map(Number);

/* ── ① 단계 풀이 ── */
function tsSolve(Q) {
  const raw = String(Q.q || "").replace(/\s+/g, " "),
    ans = String(Q.a);
  let m;
  const end = (txt, v) => (String(v) === ans ? txt : null);
  // 규칙과 대응: 대응표
  if ((m = /([○□])가 (\d+)일 때 △를 구하세요\.?\s*[○□] : ([\d, ]+?)\s*△ : ([\d, ]+)/.exec(raw))) {
    const s = m[1],
      X = +m[2],
      xs = tsNums(m[3]),
      ys = tsNums(m[4]);
    if (xs.length < 2 || xs.length !== ys.length) return null;
    const pair = s + " " + xs[0] + " → △ " + ys[0] + ", " + s + " " + xs[1] + " → △ " + ys[1];
    const k = ys[0] / xs[0];
    if (Number.isInteger(k) && xs.every((x, i) => ys[i] === x * k)) return end(pair + " → △ ÷ " + s + " = " + k + " 로 늘 같아요 → 규칙: △ = " + s + " × " + k + " → " + X + " × " + k + " = " + X * k, X * k);
    const d = ys[0] - xs[0];
    if (xs.every((x, i) => ys[i] - x === d)) return end(pair + " → △ − " + s + " = " + d + " 로 늘 같아요 → 규칙: △ = " + s + " + " + d + " → " + X + " + " + d + " = " + (X + d), X + d);
    return null;
  }
  // 약분: 기약분수
  if ((m = /(\d+)\/(\d+)[을를] 기약분수로/.exec(raw))) {
    const a = +m[1],
      b = +m[2],
      g = tsGcd(a, b);
    if (g === 1) return end(a + "와 " + b + "는 1 말고 공약수가 없어요 → 이미 기약분수 " + a + "/" + b, a + "/" + b);
    const x = a / g,
      y = b / g,
      r = y === 1 ? String(x) : x + "/" + y;
    return end(a + "와 " + b + "의 공약수 중 가장 큰 수(최대공약수)는 " + g + " → 분자·분모를 " + g + "로 나눠요: " + a + " ÷ " + g + " = " + x + ", " + b + " ÷ " + g + " = " + y + " → 더 나눌 공약수가 없으니 끝: " + r, r);
  }
  // 통분: 가장 작은 공통분모
  if ((m = /(\d+)분의 □ 와 (\d+)분의 □ 를 통분할 때, 공통분모로 알맞은 가장 작은 수/.exec(raw))) {
    const a = +m[1],
      b = +m[2],
      L = (a * b) / tsGcd(a, b);
    if (L / a > 10 || L / b > 10) return null;
    const mu = (n) => [...Array(L / n).keys()].map((i) => n * (i + 1)).join(", ");
    return end(a + "의 배수: " + mu(a) + " / " + b + "의 배수: " + mu(b) + " → 두 분모의 최소공배수가 가장 작은 공통분모 → " + L, L);
  }
  // 수의 범위: 경계의 수가 들어가는지
  if ((m = /(\d+) (이상|이하|초과|미만)인 수의 범위에 \d+[은는] 포함될까요/.exec(raw))) {
    const n = m[1],
      k = m[2],
      inc = k === "이상" || k === "이하";
    const what = { 이상: n + "과 같거나 큰 수", 이하: n + "과 같거나 작은 수", 초과: n + "보다 큰 수", 미만: n + "보다 작은 수" }[k];
    return end(n + " " + k + "는 " + what + " → " + (inc ? "이상·이하는 경계의 수를 넣어요(수직선에 ● 점)" : "초과·미만은 경계의 수를 넣지 않아요(수직선에 ○ 점)") + " → " + (inc ? "포함된다" : "포함되지 않는다"), inc ? "포함된다" : "포함되지 않는다");
  }
  // 어림: 올림·버림·반올림
  if ((m = /([\d,]+)[을를] (반올림|올림|버림)하여 (십|백|천)의 자리까지/.exec(raw))) {
    const n = +m[1].replace(/,/g, ""),
      kind = m[2],
      p = { 십: 10, 백: 100, 천: 1000 }[m[3]],
      below = { 10: "일", 100: "십", 1000: "백" }[p],
      dg = Math.floor(n / (p / 10)) % 10,
      rest = n % p,
      down = n - rest,
      up = rest ? down + p : down;
    let r, why;
    if (kind === "반올림") (r = dg >= 5 ? up : down), (why = below + "의 자리 숫자 " + dg + (dg >= 5 ? " 는 5 이상이니 올려요" : " 는 4 이하이니 버려요"));
    else if (kind === "올림") (r = up), (why = rest ? "아래 자리 수 " + rest + " 가 0이 아니니 " + m[3] + "의 자리를 1 올려요" : "아래 자리가 모두 0이라 그대로");
    else (r = down), (why = "아래 자리 수 " + rest + " 를 모두 0으로 버려요");
    return end("구하는 자리: " + m[3] + "의 자리 → 바로 아래 " + below + "의 자리 숫자를 봐요: " + dg + " → " + why + " → " + tsComma(r), tsComma(r));
  }
  // 합동: 대응변·대응각
  if ((m = /합동인 두 도형에서, 한 도형의 (변|각)이 (\d+)(cm|°)/.exec(raw))) {
    const v = m[2];
    return end("합동인 두 도형은 포개면 꼭 맞아요 → 대응" + m[1] + "의 " + (m[1] === "변" ? "길이" : "크기") + "는 서로 같아요 → " + v + m[3], v);
  }
  // 직육면체: 면·모서리·꼭짓점 수
  if ((m = /직육면체의 (면|모서리|꼭짓점)[은는] 모두 몇 개/.exec(raw))) {
    const t = {
      면: ["위·아래, 앞·뒤, 왼쪽·오른쪽 면이 2개씩 3쌍 → 2 × 3 = 6", 6],
      모서리: ["가로·세로·높이 방향으로 4개씩 → 4 × 3 = 12", 12],
      꼭짓점: ["윗면 꼭짓점 4개 + 아랫면 꼭짓점 4개 → 4 + 4 = 8", 8],
    }[m[1]];
    return end(t[0], t[1]);
  }
  // 직육면체: 모든 모서리 길이의 합
  if ((m = /가로 (\d+)cm, 세로 (\d+)cm, 높이 (\d+)cm인 직육면체의 모든 모서리 길이의 합/.exec(raw))) {
    const a = +m[1],
      b = +m[2],
      c = +m[3];
    return end("길이가 같은 모서리가 4개씩 3종류 → (" + a + " + " + b + " + " + c + ") × 4 = " + (a + b + c) + " × 4 = " + 4 * (a + b + c), 4 * (a + b + c));
  }
  // 평균
  if ((m = /다음 자료의 평균을 구하세요\.?\s*([\d, ]+)/.exec(raw))) {
    const L = tsNums(m[1]),
      S = L.reduce((x, y) => x + y, 0);
    if (S % L.length) return null;
    return end("모두 더해요: " + L.join(" + ") + " = " + S + " → 자료는 " + L.length + "개 → " + S + " ÷ " + L.length + " = " + S / L.length, S / L.length);
  }
  // 가능성
  if (/가능성을 수로 나타내면/.test(raw)) {
    if (/7이 나올/.test(raw)) return end("주사위 눈은 1~6 → 7은 나올 수 없어요(불가능) → 0", "0");
    if (/6 이하가 나올/.test(raw)) return end("주사위 눈 1~6 은 모두 6 이하 → 반드시 일어나요(확실) → 1", "1");
    if (/짝수가 나올/.test(raw)) return end("짝수 눈 2, 4, 6 은 3개, 홀수 눈도 3개 → 반반 → 1/2", "1/2");
    if (/동전/.test(raw)) return end("그림 면과 숫자 면 2가지 중 하나 → 반반 → 1/2", "1/2");
  }
  return null;
}
{
  const ssT = stepSolve;
  stepSolve = function (Q) {
    const r = ssT(Q);
    if (r || TS.off || !Q) return r;
    try {
      return tsSolve(Q);
    } catch (e) {
      return null;
    }
  };
}

/* ── ② 그림·문장 문제 생성기 ── */
// 대응표 그림
function tsTable(r1, r2, xs, ys) {
  const n = xs.length,
    cw = 34,
    w = 56 + cw * n;
  let b = '<rect x="2" y="2" width="' + (w - 4) + '" height="56" rx="4" fill="' + FQC.fill + '" stroke="' + FQC.hi + '"/>' + '<line x1="2" y1="30" x2="' + (w - 2) + '" y2="30" stroke="' + FQC.hi + '"/>';
  b += fqT(28, 21, r1, FQC.hi, 11) + fqT(28, 49, r2, FQC.hi, 11);
  for (let i = 0; i < n; i++) {
    const x = 56 + cw * i;
    b += '<line x1="' + x + '" y1="2" x2="' + x + '" y2="58" stroke="' + FQC.hi + '"/>';
    b += fqT(x + cw / 2, 21, xs[i], xs[i] === "?" ? FQC.ok : null, 12) + fqT(x + cw / 2, 49, ys[i], ys[i] === "?" ? FQC.ok : null, 12);
  }
  return fqSvg(w, 60, b);
}
const TS_THING = [
  ["세발자전거", "바퀴", 3, "대"],
  ["자동차", "바퀴", 4, "대"],
  ["오리", "다리", 2, "마리"],
  ["무당벌레", "다리", 6, "마리"],
  ["문어", "다리", 8, "마리"],
  ["거미", "다리", 8, "마리"],
  ["꽃 한 송이", "꽃잎", 5, "송이"],
];
function fqRule() {
  const kind = fqR(0, 9);
  // 대응표 빈칸(곱·합·차)
  if (kind < 5) {
    const t = fqPick(["mul", "mul", "add", "sub"]),
      k = t === "mul" ? fqR(2, 9) : fqR(3, 15),
      x0 = t === "sub" ? k + fqR(1, 5) : fqR(1, 5),
      f = (x) => (t === "mul" ? x * k : t === "add" ? x + k : x - k),
      xs = [0, 1, 2, 3].map((i) => x0 + i),
      X = x0 + fqR(5, 30),
      rev = Math.random() < 0.3,
      Y = f(X),
      sym = t === "mul" ? "×" : t === "add" ? "+" : "−";
    const fig = tsTable("○", "△", [...xs, rev ? "?" : X], [...xs.map(f), rev ? Y : "?"]);
    const pair = "○ " + xs[0] + " → △ " + f(xs[0]) + ", ○ " + xs[1] + " → △ " + f(xs[1]);
    const how = t === "mul" ? "△ ÷ ○ = " + k : t === "add" ? "△ − ○ = " + k : "○ − △ = " + k;
    const rule = "△ = ○ " + sym + " " + k;
    if (rev) {
      const inv = t === "mul" ? Y + " ÷ " + k : t === "add" ? Y + " − " + k : Y + " + " + k;
      return fqMake(fqRule, "대응표를 보고 △가 " + Y + "일 때 ○를 구하세요.", X, [Y, X + 1, t === "mul" ? Y * k : Y + k, X - 1], fig, "규칙을 거꾸로 쓰면 ○를 구할 수 있어요.", pair + " → " + how + " 로 늘 같아요 → 규칙: " + rule + " → 거꾸로: ○ = " + inv + " = " + X);
    }
    const wr = t === "mul" ? [X + k, (X + 1) * k, X * (k + 1)] : t === "add" ? [X * 2, X + k + 1, X + k - 1] : [X + k, X - k + 1, X - k - 1];
    return fqMake(fqRule, "대응표를 보고 ○가 " + X + "일 때 △를 구하세요.", Y, wr, fig, "○가 1씩 늘 때 △가 어떻게 바뀌는지 보면 규칙이 보여요.", pair + " → " + how + " 로 늘 같아요 → 규칙: " + rule + " → " + X + " " + sym + " " + k + " = " + Y);
  }
  // 성냥개비·탁자 무늬(n번째 그림의 개수)
  if (kind < 8) {
    const P = fqPick([
      ["정사각형", "성냥개비", 3, 1, "sq"],
      ["삼각형", "성냥개비", 2, 1, "tri"],
      ["탁자", "의자", 2, 2, "tab"],
    ]);
    const [shape, cnt, a, b, look] = P,
      n = fqR(6, 30),
      v = (i) => a * i + b;
    let body = "";
    for (let s = 1; s <= 3; s++) {
      const ox = 6 + (s - 1) * (s === 3 ? 62 : 58) + (s === 3 ? 18 : 0) + (s - 1) * 6;
      for (let i = 0; i < s; i++) {
        const x = ox + i * 16;
        if (look === "sq") body += '<rect x="' + x + '" y="16" width="16" height="16" fill="none" stroke="' + FQC.hi + '" stroke-width="2"/>';
        else if (look === "tri") body += '<polygon points="' + x + ",34 " + (x + 16) + ",34 " + (x + 8) + ',18" fill="none" stroke="' + FQC.hi + '" stroke-width="2"/>';
        else body += '<rect x="' + x + '" y="18" width="15" height="12" fill="#4a418a" stroke="' + FQC.hi + '"/><circle cx="' + (x + 7.5) + '" cy="13" r="3" fill="' + FQC.ok + '"/><circle cx="' + (x + 7.5) + '" cy="35" r="3" fill="' + FQC.ok + '"/>';
      }
      if (look === "tab") body += '<circle cx="' + (ox - 4) + '" cy="24" r="3" fill="' + FQC.ok + '"/><circle cx="' + (ox + s * 16 + 3) + '" cy="24" r="3" fill="' + FQC.ok + '"/>';
      body += fqT(ox + s * 8, 52, s + "번째: " + v(s), FQC.dim, 9);
    }
    const what = look === "tab" ? "탁자 " + n + "개를 한 줄로 붙이면 의자는 몇 개 놓을 수 있을까요?" : shape + " " + n + "개를 한 줄로 이어 만들려면 성냥개비는 몇 개 필요할까요?";
    return fqMake(fqRule, "그림처럼 " + what, v(n), [a * n, (a + 1) * n, v(n) + a, v(n) - 1], fqSvg(232, 58, body), shape + "이 하나 늘 때 " + cnt + "가 몇 개씩 느는지 봐요.", "1번째 " + v(1) + ", 2번째 " + v(2) + ", 3번째 " + v(3) + " → 하나 늘 때마다 " + a + "개씩 늘어요 → 규칙: " + cnt + " = " + shape + " 수 × " + a + " + " + b + " → " + n + " × " + a + " + " + b + " = " + v(n));
  }
  // 대응 문장제(나이·물건·시간)
  const w = fqR(0, 2);
  if (w === 0) {
    const k = fqR(2, 9),
      x = fqR(8, 13),
      X = x + fqR(3, 40);
    return fqMake(fqRule, "언니는 나보다 " + k + "살 많아요. 내가 " + X + "살일 때 언니는 몇 살일까요?", X + k, [X - k, X * 2, X + k + 1, k], tsTable("나", "언니", [x, x + 1, X], [x + k, x + 1 + k, "?"]), "두 사람의 나이 차는 늘 같아요.", "나 " + x + " → 언니 " + (x + k) + ", 나 " + (x + 1) + " → 언니 " + (x + 1 + k) + " → 언니 − 나 = " + k + " 로 늘 같아요 → 규칙: 언니 = 나 + " + k + " → " + X + " + " + k + " = " + (X + k));
  }
  if (w === 1) {
    const [th, part, k, unit] = fqPick(TS_THING),
      X = fqR(6, 15),
      rev = Math.random() < 0.4;
    const fig = tsTable(th.split(" ")[0], part, [1, 2, 3, rev ? "?" : X], [k, 2 * k, 3 * k, rev ? X * k : "?"]);
    if (rev) return fqMake(fqRule, th + "의 " + part + "가 모두 " + X * k + "개예요. " + th + "는 몇 " + unit + "일까요?", X, [X * k, X + 1, X - 1, X * 2], fig, "규칙을 거꾸로 쓰면 돼요.", th.split(" ")[0] + " 1 → " + part + " " + k + ", 2 → " + 2 * k + " → 규칙: " + part + " = " + th.split(" ")[0] + " × " + k + " → 거꾸로: " + X * k + " ÷ " + k + " = " + X);
    return fqMake(fqRule, th + "가 " + X + unit + " 있어요. " + part + "는 모두 몇 개일까요?", X * k, [X + k, X * (k + 1), (X - 1) * k, X * k + 1], fig, "하나에 " + k + "개씩이에요.", th.split(" ")[0] + " 1 → " + part + " " + k + ", 2 → " + 2 * k + " → 규칙: " + part + " = " + th.split(" ")[0] + " × " + k + " → " + X + " × " + k + " = " + X * k);
  }
  const k = fqR(2, 9),
    X = fqR(5, 15);
  return fqMake(fqRule, "수도꼭지에서 1분에 " + k + "L씩 물이 나와요. " + X + "분 동안 받은 물은 몇 L일까요?", X * k, [X + k, (X + 1) * k, X * k - k, X * k + 1], tsTable("분", "물(L)", [1, 2, 3, X], [k, 2 * k, 3 * k, "?"]), "1분이 늘 때마다 물이 " + k + "L씩 늘어요.", "1분 → " + k + "L, 2분 → " + 2 * k + "L → 물 ÷ 분 = " + k + " 로 늘 같아요 → 규칙: 물 = 분 × " + k + " → " + X + " × " + k + " = " + X * k);
}
// 직육면체 더 넓히기
function tsBox(labs, mark) {
  const H = FQC.hi;
  return (
    '<polygon points="50,40 150,40 150,100 50,100" fill="' + (mark === "front" ? "#6a5bb8" : FQC.fill) + '" stroke="' + H + '" stroke-width="2"/>' +
    '<polygon points="50,40 80,14 180,14 150,40" fill="#4a418a" stroke="' + H + '" stroke-width="2"/>' +
    '<polygon points="150,40 180,14 180,74 150,100" fill="#2b2552" stroke="' + H + '" stroke-width="2"/>' +
    '<line x1="50" y1="100" x2="80" y2="74" stroke="' + H + '" stroke-dasharray="4 3"/><line x1="80" y1="74" x2="180" y2="74" stroke="' + H + '" stroke-dasharray="4 3"/><line x1="80" y1="74" x2="80" y2="14" stroke="' + H + '" stroke-dasharray="4 3"/>' +
    (mark === "dots" ? [[50, 40], [150, 40], [150, 100], [50, 100], [80, 14], [180, 14], [180, 74]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="3" fill="' + FQC.ok + '"/>').join("") + '<circle cx="80" cy="74" r="3" fill="none" stroke="' + FQC.ok + '"/>' : "") +
    (labs || "")
  );
}
function fqCuboid2() {
  const k = fqR(0, 13);
  if (k === 0) {
    const vis = Math.random() < 0.5;
    return fqMake(fqCuboid2, "직육면체의 겨냥도에서 " + (vis ? "보이는" : "보이지 않는") + " 면은 몇 개일까요?", 3, [2, 4, 6, 1], fqSvg(220, 116, tsBox()), "겨냥도에서는 앞·위·옆 세 면이 보여요.", vis ? "앞면·윗면·옆면 → 3개" : "면 6개 − 보이는 면 3개 = 3개");
  }
  if (k === 1) {
    const vis = Math.random() < 0.5;
    return fqMake(fqCuboid2, "직육면체의 겨냥도에서 " + (vis ? "보이는" : "보이지 않는") + " 꼭짓점은 몇 개일까요?", vis ? 7 : 1, vis ? [8, 6, 4, 1] : [0, 2, 3, 7], fqSvg(220, 116, tsBox("", "dots")), "점선 세 개가 만나는 꼭짓점 하나만 보이지 않아요.", vis ? "꼭짓점 8개 − 안 보이는 1개 = 7개" : "점선 3개가 모이는 곳 → 1개");
  }
  if (k === 2) return fqMake(fqCuboid2, "직육면체에서 색칠한 면과 수직인 면은 몇 개일까요?", 4, [1, 2, 3, 5], fqSvg(220, 116, tsBox("", "front")), "색칠한 면과 만나는 면은 모두 수직이에요.", "면 6개 − 색칠한 면 1개 − 마주 보는(평행한) 면 1개 = 4개");
  if (k <= 4) {
    // 전개도: 가로로 4면 + 위·아래 날개(어느 칸에나 붙어도 정육면체 전개도)
    const L = fqPick([["가", "나", "다", "라", "마", "바"], ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"]]).slice().sort(() => Math.random() - 0.5),
      up = fqR(0, 3),
      dn = fqR(0, 3),
      s = 30,
      ox = 22,
      oy = 6;
    const cell = (c, r, t, hi) => '<rect x="' + (ox + c * s) + '" y="' + (oy + r * s) + '" width="' + s + '" height="' + s + '" fill="' + (hi ? "#6a5bb8" : FQC.fill) + '" stroke="' + FQC.hi + '" stroke-width="2"/>' + fqT(ox + c * s + s / 2, oy + r * s + s / 2 + 4, t, hi ? FQC.ok : null, 12);
    const pos = [[0, 1], [1, 1], [2, 1], [3, 1], [up, 0], [dn, 2]],
      opp = [2, 3, 0, 1, 5, 4],
      ask = fqR(0, 5),
      a = L[opp[ask]];
    const fig = fqSvg(170, 100, pos.map(([c, r], i) => cell(c, r, L[i], i === ask)).join(""));
    const others = L.filter((t, i) => i !== ask && i !== opp[ask]);
    return fqMake(fqCuboid2, "전개도를 접어 정육면체를 만들 때, 면 " + L[ask] + "와 마주 보는 면은 어느 것일까요?", a, others, fig, "한 줄로 이어진 네 면에서는 한 칸 건너 있는 면끼리 마주 봐요. 위·아래 날개는 서로 마주 봐요.", ask >= 4 ? "위·아래 날개끼리 마주 봐요 → 면 " + a : "한 줄 네 면에서 한 칸 건너 있는 면 → 면 " + a);
  }
  if (k <= 7) {
    const a = fqR(2, 12),
      b = fqR(2, 12),
      c = fqR(2, 12);
    return fqMake(fqCuboid2, "가로 " + a + "cm, 세로 " + b + "cm, 높이 " + c + "cm인 직육면체의 겨냥도입니다. 점선으로 그린 모서리의 길이의 합은 몇 cm일까요?", a + b + c, [4 * (a + b + c), a * b * c, a + b, 3 * a], fqSvg(230, 116, tsBox(fqT(100, 112, a + "cm") + fqT(176, 96, b + "cm", null, 10, "start") + fqT(186, 48, c + "cm", null, 10, "start"))), "보이지 않는 모서리는 가로·세로·높이 하나씩이에요.", "점선은 가로 1개·세로 1개·높이 1개 → " + a + " + " + b + " + " + c + " = " + (a + b + c));
  }
  if (k <= 10) {
    const a = fqR(3, 20);
    return fqMake(fqCuboid2, "한 모서리가 " + a + "cm인 정육면체의 모든 모서리 길이의 합은 몇 cm일까요?", 12 * a, [6 * a, 8 * a, 4 * a, a * a], fqSvg(140, 104, '<polygon points="20,40 80,40 80,100 20,100" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/><polygon points="20,40 46,14 106,14 80,40" fill="#4a418a" stroke="' + FQC.hi + '" stroke-width="2"/><polygon points="80,40 106,14 106,74 80,100" fill="#2b2552" stroke="' + FQC.hi + '" stroke-width="2"/>' + fqT(50, 98, a + "cm", null, 10)), "정육면체는 모서리 12개의 길이가 모두 같아요.", "모서리 12개가 모두 " + a + "cm → " + a + " × 12 = " + 12 * a);
  }
  const a = fqR(2, 12),
    b = fqR(2, 12),
    c = fqR(2, 9);
  return fqMake(fqCuboid2, "가로 " + a + "cm, 세로 " + b + "cm, 높이 " + c + "cm인 직육면체에서 윗면과 평행한 면의 넓이는 몇 cm²일까요?", a * b, [a * c, b * c, 2 * a * b, a + b], fqSvg(230, 116, tsBox(fqT(100, 112, a + "cm") + fqT(176, 96, b + "cm", null, 10, "start") + fqT(186, 48, c + "cm", null, 10, "start"))), "평행한 두 면은 모양과 크기가 같아요.", "윗면과 평행한 면 = 아랫면 → 가로 × 세로 = " + a + " × " + b + " = " + a * b);
}
// 합동: 문장에 수가 들어간 합동 삼각형(대응변·대응각·둘레·남은 각)
function fqCong2() {
  const a = fqR(4, 15),
    b = fqR(4, 15),
    c = Math.min(a + b - 1, fqR(Math.abs(a - b) + 1, 15)),
    A = fqR(3, 9) * 10,
    Bg = fqR(3, 8) * 10,
    k = fqR(0, 3);
  const tri = (dx, L, lab) => '<polygon points="' + (20 + dx) + ",86 " + (96 + dx) + ",86 " + (44 + dx) + ',20" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>' + fqT(14 + dx, 98, L[0], FQC.dim, 10) + fqT(102 + dx, 98, L[1], FQC.dim, 10) + fqT(44 + dx, 14, L[2], FQC.dim, 10) + lab;
  const fig = fqSvg(240, 104, tri(0, ["ㄱ", "ㄴ", "ㄷ"], fqT(58, 100, a + "cm") + fqT(24, 52, b + "cm") + fqT(78, 52, c + "cm")) + fqT(120, 56, "합동", FQC.ok, 10) + tri(126, ["ㄹ", "ㅁ", "ㅂ"], ""));
  const head = "삼각형 ㄱㄴㄷ과 삼각형 ㄹㅁㅂ은 서로 합동입니다(ㄱ↔ㄹ, ㄴ↔ㅁ, ㄷ↔ㅂ). 변 ㄱㄴ이 " + a + "cm, 변 ㄱㄷ이 " + b + "cm, 변 ㄴㄷ이 " + c + "cm일 때, ";
  if (k === 0) return fqMake(fqCong2, head + "변 ㄹㅁ은 몇 cm일까요?", a, [b, c, a + 1, a + b], fig, "대응변의 길이는 같아요.", "변 ㄹㅁ의 대응변은 변 ㄱㄴ → 길이가 같아요 → " + a + "cm");
  if (k === 1) return fqMake(fqCong2, head + "삼각형 ㄹㅁㅂ의 둘레는 몇 cm일까요?", a + b + c, [a + b, 2 * (a + b + c), a * 3, a + b + c + 1], fig, "합동이면 세 변이 모두 같아서 둘레도 같아요.", "대응변끼리 길이가 같아요 → 둘레도 같아요 → " + a + " + " + b + " + " + c + " = " + (a + b + c) + "cm");
  const h2 = "삼각형 ㄱㄴㄷ과 삼각형 ㄹㅁㅂ은 서로 합동입니다(ㄱ↔ㄹ, ㄴ↔ㅁ, ㄷ↔ㅂ). 각 ㄱ이 " + A + "°, 각 ㄴ이 " + Bg + "°일 때, ";
  if (k === 2) return fqMake(fqCong2, h2 + "각 ㅁ은 몇 도일까요?", Bg, [A, 180 - A - Bg, 180 - Bg, Bg + 10], fig, "대응각의 크기는 같아요.", "각 ㅁ의 대응각은 각 ㄴ → 크기가 같아요 → " + Bg + "°");
  const C = 180 - A - Bg;
  return fqMake(fqCong2, h2 + "각 ㅂ은 몇 도일까요?", C, [A, Bg, 180 - A, C + 10], fig, "대응각은 같고, 삼각형 세 각의 합은 180°예요.", "각 ㅂ = 각 ㄷ → 180 − " + A + " − " + Bg + " = " + C + "°");
}
// 27-figq 에 넣기: 5-1 규칙과 대응 · 5-2 직육면체(6학년 「직육면체의 부피와 겉넓이」는 그대로)
const TS_FQ = { rule: [["규칙과 대응"], [fqRule], 0.6], cub: [["직육면체"], [fqCuboid, fqCuboid2, fqCuboid2, fqCuboid2, fqCuboid2], 0.75], cong: [["합동과 대칭"], [fqSymmetry, fqCongruent, fqCong2, fqCong2], 0.5] };
{
  const fh0 = fqHit;
  fqHit = function (unit) {
    if (unit === "규칙과 대응") return TS_FQ.rule;
    if (unit === "직육면체") return TS_FQ.cub;
    if (unit === "합동과 대칭") return TS_FQ.cong;
    return fh0(unit);
  };
}
