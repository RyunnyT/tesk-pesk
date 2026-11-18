/* ════════ 그림 있는 문제 · 조사 바로잡기 · 지문 근거 (프롬프트 N, 2026-11-15, docs/점검_고칠점.md 1-6·1-7) ════════
   · 도형·자료 단원은 문제 은행이 글로만 묻고 문제 수가 적다(40문제 중 서로 다른 문제 7개인 단원도). → 아르카 쪽 보충 생성기.
     단원 이름 낱말로 고르고, 그 단원 문제의 40% 쯤을 그림 문제로 낸다(문제 은행 quiz-bank.js 는 고치지 않는다).
   · 그림은 SVG 로 그 자리에서 그린다. 정답은 생성기 안에서 계산한 값 = 보기의 정답(검사: tools/check/figq.cjs).
   · 문제 은행 글의 조사 오류("7예요"·"10와"·"마름모은")는 보여 줄 때 바로잡는다(fixJosa).
   · 지문 확인 문제를 틀리면 "다시 읽어 보면 답이 있어요" 대신 지문에서 근거 문장을 찾아 보여 준다. */
const FQ = { rate: null, off: false }; // rate: null 이면 단원별 비율(FQ_MAP), 숫자를 넣으면 그 비율(검사용)
const fqR = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fqPick = (L) => L[Math.floor(Math.random() * L.length)];
const fqSvg = (w, h, body) => '<svg class="qfig" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="문제 그림">' + body + "</svg>";
const FQC = { line: "#fff6d6", fill: "#3d3570", hi: "#ffd86b", ok: "#7ee07a", dim: "#a59ec6" };
const fqT = (x, y, t, c, s, anchor) => '<text x="' + x + '" y="' + y + '" font-size="' + (s || 11) + '" fill="' + (c || FQC.line) + '" text-anchor="' + (anchor || "middle") + '">' + t + "</text>";
// 보기 만들기: 정답 + 그럴듯한 오답(겹치지 않게)
function fqChoices(a, wrongs) {
  const n = studyCfg.choices === 3 || studyCfg.choices === 4 ? studyCfg.choices : studyCfg.grade >= 5 ? 4 : 3,
    set = [...new Set(wrongs.map(String))].filter((v) => v !== String(a) && !/^-|NaN/.test(v));
  let k = 1;
  while (set.length < n - 1) {
    const v = String(typeof a === "number" ? a + (k % 2 ? k : -k) * (a > 20 ? 2 : 1) : a + k);
    if (v !== String(a) && !set.includes(v) && !v.startsWith("-")) set.push(v);
    k++;
  }
  return [String(a), ...set.sort(() => Math.random() - 0.5).slice(0, n - 1)].sort(() => Math.random() - 0.5);
}
const fqMake = (gen, q, a, wrongs, fig, ex, steps) => ({ q, a: String(a), ch: fqChoices(a, wrongs), fig, ex, steps, regen: gen });

/* ── 생성기 ── */
// 삼각형의 남은 한 각
function fqTriAngle() {
  const A = fqR(3, 9) * 10,
    B2 = fqR(3, Math.min(11, Math.floor((170 - A) / 10))) * 10,
    C = 180 - A - B2;
  const fig = fqSvg(220, 110, '<polygon points="20,95 200,95 ' + (60 + A) + ',18" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>' + fqT(46, 88, A + "°") + fqT(176, 88, B2 + "°") + fqT(60 + A, 40, "?", FQC.ok, 14));
  return fqMake(fqTriAngle, "삼각형의 두 각이 " + A + "°, " + B2 + "° 입니다. ?는 몇 도일까요?", C, [C + 10, C - 10, 180 - A, 180 - B2, 360 - A - B2], fig, "삼각형 세 각의 합은 180°예요.", "180 − " + A + " − " + B2 + " = " + C);
}
// 사각형의 남은 한 각
function fqQuadAngle() {
  const a = fqR(7, 11) * 10,
    b = fqR(7, 11) * 10,
    c = fqR(7, 10) * 10,
    d = 360 - a - b - c;
  if (d < 40 || d > 150) return fqQuadAngle();
  const fig = fqSvg(220, 110, '<polygon points="30,95 190,95 165,20 55,28" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>' + fqT(48, 88, a + "°") + fqT(172, 88, b + "°") + fqT(156, 38, c + "°") + fqT(66, 44, "?", FQC.ok, 14));
  return fqMake(fqQuadAngle, "사각형의 세 각이 " + a + "°, " + b + "°, " + c + "° 입니다. ?는 몇 도일까요?", d, [d + 10, d - 10, 180 - c, 360 - a - b], fig, "사각형 네 각의 합은 360°예요.", "360 − " + a + " − " + b + " − " + c + " = " + d);
}
// 각도기 읽기
function fqProtractor() {
  const v = fqR(2, 16) * 10,
    r = (v * Math.PI) / 180,
    ticks = Array.from({ length: 19 }, (_, i) => {
      const t = (i * 10 * Math.PI) / 180,
        L = i % 3 === 0 ? 68 : 74;
      return '<line x1="' + (110 + Math.cos(t) * L) + '" y1="' + (100 - Math.sin(t) * L) + '" x2="' + (110 + Math.cos(t) * 80) + '" y2="' + (100 - Math.sin(t) * 80) + '" stroke="' + FQC.dim + '"/>' + (i % 3 === 0 ? fqT(110 + Math.cos(t) * 58, 103 - Math.sin(t) * 58, i * 10, FQC.dim, 8) : "");
    }).join("");
  const fig = fqSvg(220, 112, '<path d="M30 100 A80 80 0 0 1 190 100" fill="none" stroke="' + FQC.dim + '" stroke-width="1.5"/>' + ticks + '<line x1="110" y1="100" x2="190" y2="100" stroke="' + FQC.line + '" stroke-width="2"/><line x1="110" y1="100" x2="' + (110 + Math.cos(r) * 84) + '" y2="' + (100 - Math.sin(r) * 84) + '" stroke="' + FQC.hi + '" stroke-width="2.5"/>');
  return fqMake(fqProtractor, "각도기로 잰 각의 크기는 몇 도일까요? (오른쪽 0에서 시작)", v, [180 - v, v + 10, v - 10, v + 20], fig, "0에서 시작해 노란 선이 가리키는 눈금을 읽어요.", "오른쪽 0부터 세면 " + v + "°");
}
// 모눈 위 직사각형·ㄱ자 도형의 넓이/둘레
function fqGrid() {
  const w = fqR(3, 7),
    h = fqR(2, 5),
    Lshape = Math.random() < 0.4 && w >= 4 && h >= 3,
    cw = Lshape ? fqR(1, w - 2) : 0,
    chh = Lshape ? fqR(1, h - 1) : 0,
    area = w * h - cw * chh,
    peri = 2 * (w + h),
    askPeri = !Lshape && Math.random() < 0.4,
    S = 16;
  let cells = "";
  for (let y = 0; y < h; y++) for (let a = 0; a < w; a++) if (!(Lshape && a >= w - cw && y < chh)) cells += '<rect x="' + (20 + a * S) + '" y="' + (10 + y * S) + '" width="' + S + '" height="' + S + '" fill="' + FQC.fill + '" stroke="' + FQC.hi + '"/>';
  let grid = "";
  for (let i = 0; i <= 9; i++) grid += '<line x1="' + (20 + i * S) + '" y1="10" x2="' + (20 + i * S) + '" y2="' + (10 + 6 * S) + '" stroke="rgba(255,255,255,.12)"/>';
  for (let i = 0; i <= 6; i++) grid += '<line x1="20" y1="' + (10 + i * S) + '" x2="' + (20 + 9 * S) + '" y2="' + (10 + i * S) + '" stroke="rgba(255,255,255,.12)"/>';
  const fig = fqSvg(190, 116, grid + cells + fqT(170, 112, "한 칸 = 1cm", FQC.dim, 8, "end"));
  if (askPeri) return fqMake(fqGrid, "모눈 한 칸의 길이가 1cm일 때, 색칠한 직사각형의 둘레는 몇 cm일까요?", peri, [w * h, w + h, peri + 2, peri - 2], fig, "둘레 = (가로 + 세로) × 2", "(" + w + " + " + h + ") × 2 = " + peri);
  return fqMake(fqGrid, "모눈 한 칸의 넓이가 1cm²일 때, 색칠한 도형의 넓이는 몇 cm²일까요?", area, [w * h + (Lshape ? 0 : w), peri, area + 2, area - 1, w * h], fig, Lshape ? "큰 직사각형에서 빠진 부분을 빼요." : "넓이 = 가로 × 세로 (칸을 세어도 돼요)", Lshape ? w + " × " + h + " − " + cw + " × " + chh + " = " + area : w + " × " + h + " = " + area);
}
// 삼각형·평행사변형 넓이(그림에 밑변·높이)
function fqAreaTri() {
  const b = fqR(3, 12) * 2,
    h = fqR(3, 10),
    par = Math.random() < 0.4,
    a = par ? b * h : (b * h) / 2;
  const fig = par
    ? fqSvg(220, 100, '<polygon points="50,80 170,80 200,22 80,22" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/><line x1="80" y1="22" x2="80" y2="80" stroke="' + FQC.ok + '" stroke-dasharray="4 3"/>' + fqT(110, 95, "밑변 " + b + "cm") + fqT(84, 55, "높이 " + h + "cm", FQC.ok, 10, "start"))
    : fqSvg(220, 100, '<polygon points="30,80 190,80 120,18" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/><line x1="120" y1="18" x2="120" y2="80" stroke="' + FQC.ok + '" stroke-dasharray="4 3"/>' + fqT(110, 95, "밑변 " + b + "cm") + fqT(124, 55, "높이 " + h + "cm", FQC.ok, 10, "start"));
  return fqMake(fqAreaTri, "그림의 " + (par ? "평행사변형" : "삼각형") + "의 넓이는 몇 cm²일까요?", a, [b * h, (b * h) / 2, b + h, a + b, 2 * (b + h)], fig, par ? "평행사변형의 넓이 = 밑변 × 높이" : "삼각형의 넓이 = 밑변 × 높이 ÷ 2", par ? b + " × " + h + " = " + a : b + " × " + h + " ÷ 2 = " + a);
}
// 다각형: 변의 수 · 이름
function fqPolygon() {
  const n = fqR(3, 8),
    name = ["", "", "", "삼각형", "사각형", "오각형", "육각형", "칠각형", "팔각형"],
    pts = Array.from({ length: n }, (_, i) => {
      const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return (110 + Math.cos(t) * 44).toFixed(1) + "," + (56 + Math.sin(t) * 44).toFixed(1);
    }).join(" "),
    fig = fqSvg(220, 112, '<polygon points="' + pts + '" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>');
  const kind = fqR(0, 2);
  if (kind === 0) return fqMake(fqPolygon, "그림의 도형은 변이 모두 몇 개일까요?", n, [n + 1, n - 1, n + 2, n * 2], fig, "변을 하나씩 짚으며 세어요.", "변을 세면 " + n + "개");
  if (kind === 1) return fqMake(fqPolygon, "그림과 같이 변의 길이와 각의 크기가 모두 같은 도형의 이름은?", "정" + name[n], ["정" + name[n === 8 ? 7 : n + 1], "정" + name[n === 3 ? 4 : n - 1], name[n], "정" + name[n === 5 ? 6 : 5]], fig, "변이 " + n + "개인 정다각형은 정" + name[n] + "이에요.", "변이 " + n + "개 → 정" + name[n]);
  const side = fqR(2, 9);
  return fqMake(fqPolygon, "그림의 정" + name[n] + "은 한 변이 " + side + "cm입니다. 모든 변의 길이의 합은 몇 cm일까요?", n * side, [n + side, (n - 1) * side, (n + 1) * side, n * side + side * 2], fig, "정다각형은 모든 변의 길이가 같아요.", side + " × " + n + " = " + n * side);
}
// 선대칭: 대칭축의 수
function fqSymmetry() {
  const S = fqPick([
    ["정삼각형", 3, '<polygon points="110,14 160,98 60,98"'],
    ["정사각형", 4, '<rect x="64" y="14" width="88" height="88"'],
    ["직사각형", 2, '<rect x="40" y="30" width="140" height="56"'],
    ["이등변삼각형", 1, '<polygon points="110,10 150,100 70,100"'],
    ["정오각형", 5, '<polygon points="110,10 156,44 138,98 82,98 64,44"'],
    ["정육각형", 6, '<polygon points="110,10 152,34 152,82 110,106 68,82 68,34"'],
    ["마름모", 2, '<polygon points="110,10 176,56 110,102 44,56"'],
  ]);
  const fig = fqSvg(220, 112, S[2] + ' fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>');
  return fqMake(fqSymmetry, "그림의 " + jo(S[0], "은", "는") + " 선대칭도형입니다. 대칭축은 모두 몇 개일까요?", S[1], [S[1] + 1, S[1] - 1, S[1] * 2, 0, 8], fig, "반으로 접었을 때 완전히 겹치게 하는 선이 대칭축이에요.", S[0] + "의 대칭축은 " + S[1] + "개");
}
// 합동: 대응변·대응각
function fqCongruent() {
  const a = fqR(3, 9),
    b = fqR(4, 12),
    ang = fqR(4, 8) * 10,
    askAng = Math.random() < 0.4;
  const tri = (dx, lab) => '<polygon points="' + (20 + dx) + ",90 " + (90 + dx) + ",90 " + (40 + dx) + ',22" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/>' + lab;
  const fig = fqSvg(240, 104, tri(0, fqT(55, 102, b + "cm") + fqT(22, 54, a + "cm") + fqT(34, 86, ang + "°", FQC.dim, 9)) + fqT(118, 60, "합동", FQC.ok, 10) + tri(130, fqT(185, 102, askAng ? "" : "?", FQC.ok, 13) + (askAng ? fqT(166, 86, "?", FQC.ok, 12) : "")));
  if (askAng) return fqMake(fqCongruent, "두 삼각형은 서로 합동입니다. ?로 표시한 각은 몇 도일까요?", ang, [180 - ang, ang + 10, ang - 10, 90], fig, "합동인 도형은 대응각의 크기가 같아요.", "대응각이니까 " + ang + "°");
  return fqMake(fqCongruent, "두 삼각형은 서로 합동입니다. ?로 표시한 변은 몇 cm일까요?", b, [a, a + b, b + 1, b - 1], fig, "합동인 도형은 대응변의 길이가 같아요.", "대응변이니까 " + b + "cm");
}
// 직육면체 겨냥도
function fqCuboid() {
  const a = fqR(2, 9),
    b = fqR(2, 9),
    c = fqR(2, 9),
    box =
      '<polygon points="50,40 150,40 150,100 50,100" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/><polygon points="50,40 80,14 180,14 150,40" fill="#4a418a" stroke="' + FQC.hi + '" stroke-width="2"/><polygon points="150,40 180,14 180,74 150,100" fill="#2b2552" stroke="' + FQC.hi + '" stroke-width="2"/>' +
      '<line x1="50" y1="100" x2="80" y2="74" stroke="' + FQC.hi + '" stroke-dasharray="4 3"/><line x1="80" y1="74" x2="180" y2="74" stroke="' + FQC.hi + '" stroke-dasharray="4 3"/><line x1="80" y1="74" x2="80" y2="14" stroke="' + FQC.hi + '" stroke-dasharray="4 3"/>',
    labs = fqT(100, 112, a + "cm") + fqT(176, 96, b + "cm", null, 10, "start") + fqT(186, 48, c + "cm", null, 10, "start"),
    k0 = fqR(0, 9),
    kind = k0 === 0 ? 0 : k0 === 1 ? 1 : k0 === 2 ? 4 : k0 % 2 ? 2 : 3; // 수가 바뀌는 문제(모서리 합·부피)를 더 자주
  if (kind === 0) return fqMake(fqCuboid, "직육면체의 겨냥도입니다. 점선으로 그린 보이지 않는 모서리는 몇 개일까요?", 3, [4, 6, 9, 12], fqSvg(220, 116, box), "보이는 모서리 9개는 실선, 보이지 않는 3개는 점선으로 그려요.", "점선을 세면 3개");
  if (kind === 1) return fqMake(fqCuboid, "직육면체의 겨냥도입니다. 실선으로 그린 보이는 모서리는 몇 개일까요?", 9, [3, 6, 8, 12], fqSvg(220, 116, box), "모서리 12개 중 보이지 않는 3개를 빼요.", "12 − 3 = 9");
  if (kind === 2) return fqMake(fqCuboid, "그림의 직육면체에서 모든 모서리의 길이의 합은 몇 cm일까요?", 4 * (a + b + c), [a + b + c, 2 * (a + b + c), a * b * c, 4 * (a + b + c) + 4], fqSvg(230, 116, box + labs), "길이가 같은 모서리가 4개씩 3쌍 있어요.", "(" + a + " + " + b + " + " + c + ") × 4 = " + 4 * (a + b + c));
  if (kind === 3) return fqMake(fqCuboid, "그림의 직육면체의 부피는 몇 cm³일까요?", a * b * c, [a + b + c, 2 * (a * b + b * c + a * c), a * b, a * b * c + a], fqSvg(230, 116, box + labs), "부피 = 가로 × 세로 × 높이", a + " × " + b + " × " + c + " = " + a * b * c);
  return fqMake(fqCuboid, "직육면체에서 한 면과 평행한 면은 몇 개일까요?", 1, [2, 3, 4, 6], fqSvg(220, 116, box), "마주 보는 면끼리 평행해요. 한 면과 마주 보는 면은 하나뿐이에요.", "마주 보는 면 1개");
}
// 막대그래프 읽기 · 평균
function fqBars() {
  const names = fqPick([
      ["사과", "귤", "포도", "딸기"],
      ["월", "화", "수", "목"],
      ["1모둠", "2모둠", "3모둠", "4모둠"],
      ["축구", "피구", "줄넘기", "달리기"],
    ]),
    avgMode = Math.random() < 0.35;
  let v = names.map(() => fqR(2, 10));
  if (avgMode) {
    const s = v.reduce((x, y) => x + y, 0);
    v[3] += (4 - (s % 4)) % 4; // 평균이 자연수가 되게
    if (v[3] > 12) v[3] -= 4;
  }
  const mx = 12,
    bars = v.map((n, i) => '<rect x="' + (44 + i * 44) + '" y="' + (96 - n * 7) + '" width="26" height="' + n * 7 + '" fill="#6a4fc0" stroke="' + FQC.hi + '"/>' + fqT(57 + i * 44, 110, names[i], null, 9)).join(""),
    axis = Array.from({ length: 7 }, (_, i) => '<line x1="34" y1="' + (96 - i * 14) + '" x2="216" y2="' + (96 - i * 14) + '" stroke="rgba(255,255,255,.14)"/>' + fqT(30, 99 - i * 14, i * 2, FQC.dim, 8, "end")).join(""),
    fig = fqSvg(224, 116, axis + bars),
    sum = v.reduce((x, y) => x + y, 0),
    hi = v.indexOf(Math.max(...v)),
    lo = v.indexOf(Math.min(...v));
  if (avgMode) return fqMake(fqBars, "막대그래프를 보고 네 항목의 평균을 구하세요.", sum / 4, [sum, v[hi], v[lo], sum / 4 + 1, sum / 4 - 1], fig, "평균 = 모두 더한 값 ÷ 개수", "(" + v.join(" + ") + ") ÷ 4 = " + sum / 4);
  const kind = fqR(0, 2);
  if (kind === 0) {
    const i = fqR(0, 3);
    return fqMake(fqBars, "막대그래프에서 " + names[i] + "의 값은 얼마일까요? (세로 눈금 한 칸 = 1)", v[i], [v[i] + 1, v[i] - 1, v[i] + 2, v[(i + 1) % 4]], fig, "막대의 끝이 가리키는 눈금을 읽어요.", names[i] + " 막대의 끝은 " + v[i]);
  }
  if (kind === 1) return fqMake(fqBars, "막대그래프에서 네 항목의 값을 모두 더하면 얼마일까요?", sum, [sum + 2, sum - 2, sum + 4, v[hi] * 2], fig, "막대마다 값을 읽어 모두 더해요.", v.join(" + ") + " = " + sum);
  if (v[hi] === v[lo]) return fqBars();
  return fqMake(fqBars, "막대그래프에서 가장 큰 값과 가장 작은 값의 차는 얼마일까요?", v[hi] - v[lo], [v[hi] + v[lo], v[hi], v[lo], v[hi] - v[lo] + 1], fig, "가장 긴 막대에서 가장 짧은 막대를 빼요.", v[hi] + " − " + v[lo] + " = " + (v[hi] - v[lo]));
}
// 색칠한 부분을 분수로
function fqShade() {
  const d = fqPick([3, 4, 5, 6, 8, 10]),
    n = fqR(1, d - 1),
    cells = Array.from({ length: d }, (_, i) => '<rect x="' + (20 + (i * 180) / d) + '" y="34" width="' + 180 / d + '" height="40" fill="' + (i < n ? FQC.ok : FQC.fill) + '" stroke="' + FQC.line + '"/>').join("");
  return fqMake(fqShade, "전체를 똑같이 " + d + "칸으로 나누었습니다. 색칠한 부분은 전체의 얼마일까요?", n + "/" + d, [d - n + "/" + d, n + "/" + (d + 1), d + "/" + n, n + 1 + "/" + d, "1/" + d], fqSvg(220, 100, cells), "분모는 전체 칸 수, 분자는 색칠한 칸 수예요.", "전체 " + d + "칸 중 " + n + "칸 → " + n + "/" + d);
}
// 원: 반지름·지름
function fqCircle() {
  const r = fqR(2, 12),
    askD = Math.random() < 0.6,
    fig = fqSvg(220, 112, '<circle cx="110" cy="56" r="46" fill="' + FQC.fill + '" stroke="' + FQC.hi + '" stroke-width="2"/><circle cx="110" cy="56" r="2" fill="' + FQC.line + '"/>' + (askD ? '<line x1="110" y1="56" x2="156" y2="56" stroke="' + FQC.ok + '" stroke-width="2"/>' + fqT(133, 50, r + "cm", FQC.ok, 10) : '<line x1="64" y1="56" x2="156" y2="56" stroke="' + FQC.ok + '" stroke-width="2"/>' + fqT(110, 50, r * 2 + "cm", FQC.ok, 10)));
  return askD
    ? fqMake(fqCircle, "그림의 원에서 초록 선은 반지름입니다. 이 원의 지름은 몇 cm일까요?", r * 2, [r, r + 2, r * 3, r * 4], fig, "지름 = 반지름 × 2", r + " × 2 = " + r * 2)
    : fqMake(fqCircle, "그림의 원에서 초록 선은 지름입니다. 이 원의 반지름은 몇 cm일까요?", r, [r * 2, r * 4, r + 1, r - 1], fig, "반지름 = 지름 ÷ 2", r * 2 + " ÷ 2 = " + r);
}
// 저울·눈금 읽기(들이와 무게, 길이)
function fqScale() {
  const unit = fqPick(["g", "mL"]),
    step = 100,
    v = fqR(2, 18) * step,
    max = 2000,
    t = Math.PI * (1 - v / max),
    ticks = Array.from({ length: 21 }, (_, i) => {
      const a = Math.PI * (1 - i / 20),
        big = i % 5 === 0;
      return '<line x1="' + (110 + Math.cos(a) * (big ? 62 : 68)) + '" y1="' + (96 - Math.sin(a) * (big ? 62 : 68)) + '" x2="' + (110 + Math.cos(a) * 76) + '" y2="' + (96 - Math.sin(a) * 76) + '" stroke="' + FQC.dim + '"/>' + (big ? fqT(110 + Math.cos(a) * 50, 99 - Math.sin(a) * 50, i * 100, FQC.dim, 8) : "");
    }).join("");
  const fig = fqSvg(220, 108, '<path d="M34 96 A76 76 0 0 1 186 96" fill="none" stroke="' + FQC.dim + '"/>' + ticks + '<line x1="110" y1="96" x2="' + (110 + Math.cos(t) * 70) + '" y2="' + (96 - Math.sin(t) * 70) + '" stroke="' + FQC.hi + '" stroke-width="2.5"/><circle cx="110" cy="96" r="3" fill="' + FQC.hi + '"/>');
  return fqMake(fqScale, "눈금을 읽어 보세요. 바늘이 가리키는 값은 몇 " + unit + "일까요? (작은 눈금 한 칸 = 100" + unit + ")", v, [v + 100, v - 100, v + 500, max - v], fig, "큰 눈금 사이의 작은 눈금이 몇 칸인지 세어요.", "바늘이 가리키는 눈금은 " + v + unit);
}

/* ── 단원 → 생성기(위에서부터 먼저 맞는 것) ── */
// [낱말들, 생성기들, 그림 문제 비율(문제 은행 문제가 적은 단원은 높게)]
const FQ_MAP = [
  [["각도"], [fqProtractor, fqTriAngle, fqQuadAngle], 0.3],
  [["삼각형"], [fqTriAngle, fqPolygon], 0.5],
  [["사각형"], [fqQuadAngle, fqPolygon, fqSymmetry], 0.5],
  [["다각형의 둘레", "넓이"], [fqGrid, fqAreaTri], 0.3],
  [["다각형", "평면도형"], [fqPolygon, fqSymmetry], 0.5],
  [["합동", "대칭"], [fqSymmetry, fqCongruent], 0.3],
  [["직육면체", "각기둥", "부피", "겉넓이"], [fqCuboid], 0.45],
  [["자료", "그래프", "평균"], [fqBars], 0.3],
  [["원의 넓이"], [], 0],
  [["원"], [fqCircle], 0.4],
  [["분수와 소수"], [fqShade], 0.3],
  [["들이", "무게"], [fqScale], 0.3],
];
function fqHit(unit) {
  return unit ? FQ_MAP.find(([ks]) => ks.some((k) => unit.includes(k))) : null;
}
function fqFor(unit) {
  const hit = fqHit(unit);
  return hit ? hit[1] : [];
}
function fqQuestion(unit) {
  const gens = fqFor(unit);
  if (!gens.length) return null;
  for (let i = 0; i < 4; i++) {
    try {
      const q = fqPick(gens)();
      if (q && q.ch.includes(q.a) && new Set(q.ch).size === q.ch.length) {
        q.unit = (typeof partUnit === "function" ? studyCfg.grade + "-" + partUnit(mapPart()).term + " " + partUnit(mapPart()).unit + "단원 " : "") + unit;
        return q;
      }
    } catch (e) {}
  }
  return null;
}

/* ── 조사 바로잡기(문제 은행 글을 보여 줄 때만) ── */
function fixJosa(t) {
  if (!t) return t;
  const bat = (d) => "013678".includes(d); // 숫자를 읽을 때 받침이 있는 끝자리(영·일·삼·육·칠·팔)
  return String(t)
    .replace(/(\d)(예요|이에요)/g, (m, d) => d + (bat(d) ? "이에요" : "예요"))
    .replace(/(\d)(와|과)(?=\s|\d)/g, (m, d) => d + (bat(d) ? "과" : "와"))
    .replace(/(\d)(은|는)(?=\s)/g, (m, d) => d + (bat(d) ? "은" : "는"))
    .replace(/(\d)(을|를)(?=\s)/g, (m, d) => d + (bat(d) ? "을" : "를"))
    .replace(/(마름모|사다리|평행|정사각|직사각)([가-힣]*?)(모|리)은(?=\s)/g, "$1$2$3는")
    .replace(/마름모은/g, "마름모는");
}

/* ── 문제 흐름에 넣기 ── */
{
  const mqF = makeQ;
  makeQ = function (d) {
    const lock = typeof LEARN === "object" && (LEARN.forceQ || LEARN.inRetry);
    const unit = typeof unitName === "function" && studyCfg.subj !== "eng" ? unitName(mapPart()) : null,
      hit = fqHit(unit);
    if (!FQ.off && !lock && hit && !RQ.forceShort && Math.random() < (FQ.rate != null ? FQ.rate : hit[2])) {
      const q = fqQuestion(unit);
      if (q) {
        save.qn = (save.qn || 0) + 1;
        RQ.short = false;
        return (RQ.last = q);
      }
    }
    const q = mqF(d);
    if (q && !q.fig) {
      q.q = fixJosa(q.q);
      q.ex = fixJosa(q.ex);
    }
    return q;
  };
  // 그림 보여 주기: 문제 상자(#bq 위)와 구슬 띠(#qsq 위)
  const figShow = () => {
    document.querySelectorAll(".qfigwrap").forEach((e) => e.remove());
    const Q = RQ.last;
    if (!Q || !Q.fig) return;
    const host = typeof ORB === "object" && ORB.on ? $("qsq") : $("bq");
    const w = document.createElement("div");
    w.className = "qfigwrap";
    w.innerHTML = Q.fig;
    host.before(w);
  };
  const afF = askField;
  askField = function (MI, title, cb) {
    afF(MI, title, (ok) => {
      document.querySelectorAll(".qfigwrap").forEach((e) => e.remove());
      cb(ok);
    });
    figShow();
  };
  // 마법사 '다시 생각'·다시 풀기처럼 띠를 다시 그릴 때도 그림이 남게
  const orF = orbRender;
  orbRender = function (title) {
    orF(title);
    figShow();
  };
  // 그림 문제는 말풍선이 아니라 띠로(그림을 봐야 하니까)
  const isS = isShortQ;
  isShortQ = function (t) {
    return RQ.last && RQ.last.fig && RQ.last.q === t ? false : isS(t);
  };
}
// 단계 풀이: 그림 문제는 생성기가 만든 풀이를 쓴다
{
  const ss0 = stepSolve;
  stepSolve = function (Q) {
    return Q && Q.steps ? Q.steps : ss0(Q);
  };
}

/* ── 지문 확인 문제: 틀리면 근거 문장을 보여 준다 ── */
function passageEvidence(s, qi) {
  try {
    const qq = s.q[qi],
      ans = String(qq[1][qq[2]]),
      text = (Array.isArray(s.p) ? s.p.join(" ") : String(s.p || "")).replace(/<[^>]+>/g, ""),
      sents = text.split(/(?<=[.!?。])\s+/).filter((t) => t.length > 6),
      words = (t) => (String(t).match(/[가-힣A-Za-z0-9]{2,}/g) || []).map((w) => w.replace(/(은|는|이|가|을|를|의|에|도|로|과|와|에서|으로|입니다|이다|했다|한다)$/, "")).filter((w) => w.length >= 2),
      aw = words(ans),
      qw = words(qq[0]);
    let best = null,
      bs = 0;
    sents.forEach((st) => {
      const sc = aw.reduce((n, w) => n + (st.includes(w) ? 2 : 0), 0) + qw.reduce((n, w) => n + (st.includes(w) ? 1 : 0), 0);
      if (sc > bs) (bs = sc), (best = st);
    });
    return bs >= 2 ? best : null;
  } catch (e) {
    return null;
  }
}
$("book").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-ans]");
  if (!b || !bk || !bk.s || !bk.s.q || !b.disabled) return; // 엔진이 먼저 처리: 틀린 단추는 꺼진다
  const ev = passageEvidence(bk.s, bk.qi),
    m = $("bkm");
  if (!m) return;
  m.innerHTML = ev ? '<span class="bkev"><i>지문의 이 문장을 다시 읽어 봐요</i>' + esc(ev) + "</span>" : "지문을 다시 읽어 보면 답이 있어요";
});
