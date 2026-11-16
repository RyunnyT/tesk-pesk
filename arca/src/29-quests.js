/* ════════ 퀘스트 다양하게 (프롬프트 O 3단계, 2026-11-15, docs/설계_다양함.md §3) ════════
   새 종류 6가지:
   · riddle  수수께끼   — 그 부 단원 개념으로 푸는 수수께끼 n개(보기 고르기). 틀려도 벌 없이 다시.
   · teach   가르쳐 주기 — NPC 가 틀리게 푼 풀이에서 「틀린 줄」을 찾는다(오개념 찾기). 찾으면 바른 풀이를 보여 줌.
   · choice  고민 듣기   — 이야기를 듣고 선택지를 고르면 고른 것에 따라 다른 대사·답례(opts[i].rw 가 보상을 덮어씀).
   · dex     도감 사진   — 그 길목 몬스터 여러 종을 만나(문제가 뜰 만큼 가까이) 도감에 담기. s0.seen 에 종류를 모음.
   · deliver 시간 안 배달 — 받는 사람(to·toMap)에게 time 초 안에. 늦어도 벌 없이 보상만 70%. 위쪽에 줄어드는 막대.
   · escort  호위       — 부탁한 사람이 뒤따라 걷고(몬스터가 가까우면 멈춤 "!"), where 맵의 exitTo 출구 근처에 닿으면 끝.
   바꾼 퀘스트는 id 를 그대로 두고(저장 호환) 종류만 바꾼다(QX_CONV). 이미 예전 방식으로 다 모은/잡은 저장은 그대로 끝낼 수 있게 한 번 옮긴다.
   서브 사연: after(앞 퀘스트 id)가 끝나야 받는 이어지는 퀘스트(QX_CHAIN). 진행 상태는 모두 save.q[id].k (진행 봇과 같은 규칙). */
const QX = { types: ["riddle", "teach", "choice", "dex", "deliver", "escort"], esc: null, trail: [] };
const qxR = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const qxPick = (a) => a[Math.floor(Math.random() * a.length)];
const qxGcd = (a, b) => (b ? qxGcd(b, a % b) : a);
const qxNch = () => (typeof studyCfg !== "undefined" && studyCfg.choices) || 3;
const qxDec = (v) => String(Math.round(v * 1000) / 1000);
// 정답 + 그럴듯한 오답 → 섞은 보기
function qxChoices(a, wrong) {
  const L = [String(a)];
  for (const w of wrong) if (L.length < qxNch() && !L.includes(String(w)) && String(w) !== "NaN") L.push(String(w));
  let g = 1;
  while (L.length < qxNch() && g < 40) {
    const n = Number(a);
    const w = isFinite(n) ? (Number.isInteger(n) ? n + (g % 2 ? g : -g) : qxDec(n + (g % 2 ? 0.1 : -0.1) * g)) : a + g;
    if (!L.includes(String(w)) && !(isFinite(n) && Number(w) < 0)) L.push(String(w));
    g++;
  }
  return L.sort(() => Math.random() - 0.5);
}

/* ── 수수께끼: 단원 이름 낱말 → 만들기. {q, a, ch, ex} ── */
const QX_RIDDLE = [
  [["각기둥", "각뿔"], () => {
    const n = qxR(3, 6), [w, k] = qxPick([["면", n + 2], ["모서리", 3 * n], ["꼭짓점", 2 * n]]);
    return { q: "나는 밑면이 " + n + "각형인 각기둥이야. 내 " + w + "은 몇 개일까?", a: k + "개", w: [n + 2 + "개", 3 * n + "개", 2 * n + "개", n + "개"].filter((v) => v !== k + "개"), ex: n + "각기둥: 면 " + (n + 2) + ", 모서리 " + 3 * n + ", 꼭짓점 " + 2 * n };
  }],
  [["부피", "겉넓이"], () => {
    const a = qxR(2, 6), b = qxR(2, 5), c = qxR(2, 4);
    return { q: "나는 가로 " + a + " cm, 세로 " + b + " cm, 높이 " + c + " cm인 상자야. 쌓기나무(1 cm³)가 몇 개 들어갈까?", a: a * b * c, w: [a + b + c, a * b, a * b * c + a * b], ex: a + " × " + b + " × " + c + " = " + a * b * c };
  }],
  [["원"], () => {
    const r = qxR(2, 9);
    if (Math.random() < 0.5) return { q: "나는 반지름이 " + r + " cm인 원이야. 내 지름은?", a: r * 2 + " cm", w: [r + " cm", r * 3 + " cm", r * 4 + " cm"], ex: "지름 = 반지름 × 2" };
    return { q: "나는 원이야. 원주율을 3으로 하면, 반지름이 " + r + " cm일 때 내 넓이는?", a: 3 * r * r + " cm²", w: [6 * r + " cm²", 3 * r + " cm²", r * r + " cm²"], ex: "원의 넓이 = 반지름 × 반지름 × 원주율 = " + r + " × " + r + " × 3" };
  }],
  [["혼합"], () => {
    const a = qxR(2, 4), age = qxR(6, 12), b = qxR(1, 9), c = age * a - b;
    return { q: "내 나이에 " + a + "을 곱하고 " + b + "를 빼면 " + c + "이야. 나는 몇 살일까?", a: age, w: [age + 1, age - 1, c + b], ex: "거꾸로 풀어요: (" + c + " + " + b + ") ÷ " + a + " = " + age };
  }],
  [["약수", "배수"], () => {
    if (Math.random() < 0.5) {
      const n = qxPick([12, 18, 20, 24, 30, 36]), p = [2, 3, 5].find((p) => n % p === 0);
      return { q: "나는 " + n + "의 약수야. 1과 " + n + "을 빼면 약수 중에 내가 가장 커. 나는?", a: n / p, w: [...Array(n).keys()].filter((d) => d > 1 && d < n / p && n % d === 0).reverse().concat([n - 1]), ex: n + " = " + p + " × " + n / p + " → 가장 작은 약수(1 빼고)로 나눈 몫이 가장 커요" };
    }
    const [a, b] = qxPick([[4, 6], [6, 8], [3, 4], [6, 9], [4, 10]]), l = (a * b) / qxGcd(a, b);
    return { q: "나는 " + a + "로도 " + b + "로도 나누어떨어지는 가장 작은 수야. 나는?", a: l, w: [a * b === l ? l * 2 : a * b, l + a, qxGcd(a, b)], ex: a + "의 배수와 " + b + "의 배수에 함께 있는 가장 작은 수 = 최소공배수 " + l };
  }],
  [["규칙", "대응"], () => {
    const k = qxR(3, 6), n = qxR(4, 9);
    return { q: "이 탑은 한 층에 창문이 " + k + "개씩 있어. " + n + "층까지 있으면 창문은 모두 몇 개일까?", a: k * n, w: [k + n, k * (n - 1), k * n + k], ex: "창문 수 = 층수 × " + k + " → " + n + " × " + k + " = " + k * n };
  }],
  [["약분", "통분"], () => {
    const d = qxPick([4, 6, 8, 10, 12, 14]);
    return { q: "나는 분모가 " + d + "인 분수야. 약분하면 1/2 이 돼. 나는 누구?", a: d / 2 + "/" + d, w: [d / 2 + 1 + "/" + d, "2/" + d, "1/" + d], ex: "1/2 의 분모·분자에 " + d / 2 + "를 곱하면 " + d / 2 + "/" + d };
  }],
  [["분수의 곱셈"], () => {
    const k = qxR(2, 5), L = k * qxR(2, 6);
    return { q: "리본이 " + L + " m 있어. 그 1/" + k + "만큼 잘라 머리에 묶었어. 머리에 묶은 리본은 몇 m?", a: L / k, w: [L - k, L * k, L / k + 1], ex: L + " × 1/" + k + " = " + L + " ÷ " + k + " = " + L / k };
  }],
  [["분수의 나눗셈"], () => {
    const b = qxR(3, 7), a = qxR(1, b - 1);
    return { q: "물 " + a + " L를 컵 " + b + "개에 똑같이 나눠 담았어. 컵 하나에 몇 L?", a: a + "/" + b, w: [b + "/" + a, "1/" + b, a + "/" + (b + 1)], ex: a + " ÷ " + b + " = " + a + "/" + b };
  }],
  [["분수"], () => {
    const d = qxR(6, 9), a = qxR(1, 3), b = qxR(1, d - a - 1);
    return { q: "케이크를 " + d + "조각으로 똑같이 나눴어. 나는 " + a + "조각, 동생은 " + b + "조각 먹었어. 둘이 먹은 것은 케이크의 얼마?", a: a + b + "/" + d, w: [a + b + "/" + d * 2, a * b + "/" + d, d - a - b + "/" + d], ex: "분모가 같으면 분자끼리 더해요: " + a + "/" + d + " + " + b + "/" + d + " = " + (a + b) + "/" + d };
  }],
  [["소수의 곱셈"], () => {
    const k = qxR(2, 9), n = qxR(3, 9);
    return { q: "한 걸음에 0." + k + " m 가는 꼬마 부엉이가 " + n + "걸음 걸었어. 모두 몇 m?", a: qxDec((k * n) / 10), w: [k * n, qxDec((k * n) / 100), qxDec((k + n) / 10)], ex: "0." + k + " × " + n + " = " + k * n + " ÷ 10 = " + qxDec((k * n) / 10) };
  }],
  [["소수의 나눗셈"], () => {
    const n = qxR(2, 5), k = qxR(2, 9);
    return { q: "끈 " + qxDec((n * k) / 10) + " m를 " + n + "명이 똑같이 나눠 가졌어. 한 사람은 몇 m?", a: qxDec(k / 10), w: [k, qxDec(k / 100), qxDec((k + 1) / 10)], ex: qxDec((n * k) / 10) + " ÷ " + n + " = " + qxDec(k / 10) };
  }],
  [["소수"], () => {
    const n = qxR(13, 39);
    return { q: "나는 0.1 이 " + n + "개 모인 수야. 나는?", a: qxDec(n / 10), w: [n, qxDec(n / 100), qxDec(n / 10 + 1)], ex: "0.1 이 10개면 1 → " + n + "개면 " + qxDec(n / 10) };
  }],
  [["둘레", "넓이", "다각형"], () => {
    const [nm, s] = qxPick([["정삼각형", 3], ["정사각형", 4], ["정오각형", 5], ["정육각형", 6]]), a = qxR(3, 9);
    if (nm === "정사각형" && Math.random() < 0.5) return { q: "나는 한 변이 " + a + " cm인 정사각형이야. 내 넓이는?", a: a * a + " cm²", w: [a * 4 + " cm²", a * 2 + " cm²", a * a + a + " cm²"], ex: a + " × " + a + " = " + a * a };
    return { q: "나는 한 변이 " + a + " cm인 " + nm + "이야. 내 둘레는?", a: a * s + " cm", w: [a + s + " cm", a * (s - 1) + " cm", a * s + a + " cm"], ex: nm + "은 변이 " + s + "개 → " + a + " × " + s };
  }],
  [["사각형"], () => {
    const a = qxR(70, 110), b = qxR(60, 100), c = qxR(60, 100);
    return { q: "사각형인데 세 각이 " + a + "°, " + b + "°, " + c + "°야. 나머지 한 각은?", a: 360 - a - b - c + "°", w: [360 - a - b - c + 10 + "°", 360 - a - b - c - 10 + "°", 540 - a - b - c + "°"], ex: "사각형 네 각의 합은 360° → 360 − " + a + " − " + b + " − " + c };
  }],
  [["각", "삼각형"], () => {
    const a = qxR(30, 80), b = qxR(30, 80);
    return { q: "삼각형인데 두 각이 " + a + "°, " + b + "°야. 나머지 한 각은?", a: 180 - a - b + "°", w: [360 - a - b + "°", 180 - a - b + 10 + "°", a + b + "°"], ex: "삼각형 세 각의 합은 180° → 180 − " + a + " − " + b };
  }],
  [["합동", "대칭"], () => {
    const [nm, k] = qxPick([["정사각형", 4], ["정삼각형", 3], ["직사각형", 2], ["정육각형", 6], ["정오각형", 5]]);
    return { q: "나는 " + nm + "이야. 접어서 딱 겹치게 하는 선(대칭축)은 몇 개일까?", a: k + "개", w: [k - 1 + "개", k + 1 + "개", k * 2 + "개"], ex: nm + "의 대칭축은 " + k + "개" };
  }],
  [["직육면체", "정육면체"], () => {
    const [w, k] = qxPick([["면", 6], ["모서리", 12], ["꼭짓점", 8]]);
    return { q: "나는 직육면체야. 내 " + w + "은 모두 몇 개일까?", a: k + "개", w: ["6개", "8개", "12개", "24개"].filter((v) => v !== k + "개"), ex: "직육면체: 면 6개, 모서리 12개, 꼭짓점 8개" };
  }],
  [["평균", "가능성", "자료"], () => {
    const m = qxR(5, 12), d1 = qxR(1, 4), d2 = qxR(0, 3), L = [m - d1, m + d1 - d2, m + d2];
    return { q: "사흘 동안 별빛 가루를 " + L.join("개, ") + "개 모았어. 하루에 평균 몇 개씩 모았을까?", a: m, w: [m + 1, m * 3, m - 1], ex: "평균 = 합 ÷ 날수 = " + m * 3 + " ÷ 3 = " + m };
  }],
  [["범위", "어림"], () => {
    const n = qxR(11, 99) * 10 + qxR(1, 9), up = Math.random() < 0.5, r = up ? Math.ceil(n / 10) * 10 : Math.floor(n / 10) * 10;
    return { q: n + "을 " + (up ? "올림" : "버림") + "하여 십의 자리까지 나타내면 나야. 나는?", a: r, w: [up ? r - 10 : r + 10, n, Math.round(n / 100) * 100], ex: (up ? "올림: 일의 자리가 0이 아니면 십의 자리를 1 올려요" : "버림: 일의 자리를 0으로") + " → " + r };
  }],
  [["비례", "비율", "비"], () => {
    const a = qxR(2, 5), b = qxR(2, 7), k = qxR(2, 4);
    return { q: a + " : " + b + " = " + a * k + " : □ 야. □ 에 들어갈 나는?", a: b * k, w: [b + k, a * k, b * k + 1], ex: "앞의 수가 " + k + "배 → 뒤의 수도 " + k + "배: " + b + " × " + k };
  }],
  [["큰 수"], () => {
    const a = qxR(2, 9), b = qxR(1, 9);
    return { q: "나는 10000 이 " + a + "개, 1000 이 " + b + "개인 수야. 나는?", a: a * 10000 + b * 1000, w: [a * 1000 + b * 100, a * 10000 + b * 100, b * 10000 + a * 1000], ex: a * 10000 + " + " + b * 1000 };
  }],
  [["곱셈"], () => {
    const a = qxR(3, 9), b = qxR(4, 12);
    return { q: "상자 하나에 사과가 " + a + "개씩 들어 있어. 상자가 " + b + "개면 사과는 모두 몇 개?", a: a * b, w: [a + b, a * (b - 1), a * b + a], ex: a + " × " + b + " = " + a * b };
  }],
  [["나눗셈"], () => {
    const b = qxR(3, 8), q = qxR(3, 12);
    return { q: "구슬 " + b * q + "개를 " + b + "명이 똑같이 나눠 가졌어. 한 사람은 몇 개?", a: q, w: [q + 1, b * q - b, b], ex: b * q + " ÷ " + b + " = " + q };
  }],
  [["평면도형"], () => {
    const [q, a] = qxPick([["나는 직각이 4개, 네 변의 길이가 모두 같아. 나는?", "정사각형"], ["나는 직각이 4개인데 마주 보는 두 변끼리만 길이가 같아. 나는?", "직사각형"], ["나는 한 각이 직각인 삼각형이야. 나는?", "직각삼각형"]]);
    return { q, a, w: ["정사각형", "직사각형", "직각삼각형", "원"].filter((v) => v !== a), ex: "직각과 변의 길이를 살펴봐요" };
  }],
  [["시간", "길이"], () => {
    const m = qxR(5, 55);
    return { q: "나는 1시간 " + m + "분이야. 분으로 나타내면?", a: 60 + m + "분", w: [100 + m + "분", 1 + m + "분", 60 + m + 10 + "분"], ex: "1시간 = 60분 → 60 + " + m };
  }],
  [["들이", "무게"], () => {
    const m = qxR(1, 9) * 100;
    return { q: "물병에 물이 1 L " + m + " mL 들어 있어. mL 로 나타내면?", a: 1000 + m + " mL", w: [100 + m + " mL", 1 + m + " mL", 10000 + m + " mL"], ex: "1 L = 1000 mL → 1000 + " + m };
  }],
  [["덧셈", "뺄셈"], () => {
    const age = qxR(8, 13), b = qxR(11, 39);
    return { q: "내 나이에 " + b + "를 더하면 " + (age + b) + "이야. 나는 몇 살?", a: age, w: [age + 1, age + b, age - 1], ex: "거꾸로: " + (age + b) + " − " + b + " = " + age };
  }],
];

/* ── 가르쳐 주기: 틀린 풀이. {p: 문제, L: 줄들, bad: 틀린 줄 번호, fix: 바른 풀이} ── */
const QX_TEACH = [
  [["부피", "겉넓이"], () => {
    const a = qxR(2, 5), b = qxR(2, 5), c = qxR(2, 5);
    return { p: "가로 " + a + ", 세로 " + b + ", 높이 " + c + " (cm) 직육면체의 부피", L: ["부피 = 가로, 세로, 높이를 모두 더해요", "= " + a + " + " + b + " + " + c, "= " + (a + b + c) + " cm³"], bad: 0, fix: "부피는 곱해요: " + a + " × " + b + " × " + c + " = " + a * b * c + " cm³" };
  }],
  [["직육면체", "정육면체", "각기둥", "각뿔"], () => ({ p: "직육면체의 모서리 수", L: ["직육면체의 면은 6개", "면마다 모서리가 4개 → 6 × 4 = 24개", "그래서 모서리는 24개"], bad: 1, fix: "모서리 하나는 두 면이 함께 써요 → 24 ÷ 2 = 12개" })],
  [["원"], () => {
    const r = qxR(2, 9);
    return { p: "반지름이 " + r + " cm 인 원의 지름", L: ["원의 중심을 지나는 선이 지름이에요", "지름 = 반지름 ÷ 2 = " + r / 2 + " cm"], bad: 1, fix: "지름은 반지름의 2배: " + r * 2 + " cm" };
  }],
  [["혼합"], () => {
    const a = qxR(2, 9), b = qxR(2, 6), c = qxR(2, 6);
    return { p: a + " + " + b + " × " + c, L: [a + " + " + b + " × " + c + " 를 앞에서부터 계산해요", "= " + (a + b) + " × " + c, "= " + (a + b) * c], bad: 0, fix: "곱셈을 먼저 해요: " + b + " × " + c + " = " + b * c + ", " + a + " + " + b * c + " = " + (a + b * c) };
  }],
  [["약수"], () => {
    const n = qxPick([12, 18, 20, 24]), P = [];
    for (let i = 1; i * i <= n; i++) if (n % i === 0) P.push([i, n / i]);
    const bi = qxR(1, P.length - 1), L = P.map(([a, b], i) => n + " = " + a + " × " + (i === bi ? b + 1 : b));
    const ds = P.flatMap(([a, b], i) => [a, i === bi ? b + 1 : b]).sort((x, y) => x - y);
    L.push("그래서 " + n + "의 약수는 " + ds.join(", "));
    return { p: n + "의 약수 구하기", L, bad: bi, fix: P[bi][0] + " × " + (P[bi][1] + 1) + " = " + P[bi][0] * (P[bi][1] + 1) + " 이라 틀려요. " + n + " = " + P[bi][0] + " × " + P[bi][1] };
  }],
  [["배수"], () => {
    const [a, b] = qxPick([[4, 6], [6, 8], [6, 9], [4, 10]]), l = (a * b) / qxGcd(a, b);
    return { p: a + "와 " + b + "의 최소공배수", L: [a + "의 배수: " + [1, 2, 3, 4, 5].map((k) => a * k).join(", ") + " …", b + "의 배수: " + [1, 2, 3, 4].map((k) => b * k).join(", ") + " …", "두 수를 곱하면 되니까 최소공배수는 " + a * b], bad: 2, fix: "두 줄에 함께 있는 가장 작은 수 " + l + " 이 최소공배수예요" };
  }],
  [["규칙", "대응"], () => {
    const k = qxR(2, 5), bi = qxR(1, 3);
    const L = [1, 2, 3, 4].map((v, i) => "□ = " + v + " 이면 △ = " + (i === bi ? v + k : v * k));
    L.unshift("규칙: △ = □ × " + k);
    return { p: "△ 와 □ 의 대응표", L, bad: bi + 1, fix: "□ = " + (bi + 1) + " 이면 △ = " + (bi + 1) + " × " + k + " = " + (bi + 1) * k };
  }],
  [["약분", "통분"], () => {
    const a = 1, b = qxPick([2, 3, 4]), c = 1, d = b === 3 ? 5 : qxPick([3, 5]);
    return { p: a + "/" + b + " 과 " + c + "/" + d + " 통분하기", L: ["두 분모의 최소공배수 " + b * d + " 을 공통분모로 해요", a + "/" + b + " = " + a * d + "/" + b * d, c + "/" + d + " = " + c + "/" + b * d], bad: 2, fix: "분모에 " + b + " 를 곱했으면 분자에도 곱해요: " + c + "/" + d + " = " + c * b + "/" + b * d };
  }],
  [["분수의 곱셈"], () => {
    const a = qxR(1, 3), b = qxR(4, 6), c = qxR(1, 3), d = qxR(4, 7);
    return { p: a + "/" + b + " × " + c + "/" + d, L: ["분자끼리 곱해요: " + a + " × " + c + " = " + a * c, "분모끼리 더해요: " + b + " + " + d + " = " + (b + d), "= " + a * c + "/" + (b + d)], bad: 1, fix: "분모끼리도 곱해요: " + b + " × " + d + " = " + b * d + " → " + a * c + "/" + b * d };
  }],
  [["분수의 나눗셈"], () => {
    const a = qxR(1, 4), b = 5, c = qxR(1, 3), d = 4;
    return { p: a + "/" + b + " ÷ " + c + "/" + d, L: ["나눗셈을 곱셈으로 바꿔요", "= " + a + "/" + b + " × " + c + "/" + d, "= " + a * c + "/" + b * d], bad: 1, fix: "나누는 분수를 뒤집어 곱해요: " + a + "/" + b + " × " + d + "/" + c + " = " + a * d + "/" + b * c };
  }],
  [["분수"], () => {
    const d = qxR(5, 9), a = qxR(1, 3), b = qxR(1, d - a - 1);
    return { p: a + "/" + d + " + " + b + "/" + d, L: ["분모가 같아요", "분자끼리, 분모끼리 더해요: (" + a + " + " + b + ")/(" + d + " + " + d + ")", "= " + (a + b) + "/" + d * 2], bad: 1, fix: "분모가 같으면 분자만 더해요: " + (a + b) + "/" + d };
  }],
  [["소수의 곱셈"], () => {
    const a = qxR(2, 9), b = qxR(2, 9);
    return { p: "0." + a + " × 0." + b, L: [a + " × " + b + " = " + a * b, "소수점 아래 자리 수: 1 + 1 = 2자리", "그래서 답은 " + qxDec((a * b) / 10)], bad: 2, fix: "2자리로 옮겨요: " + qxDec((a * b) / 100) };
  }],
  [["소수"], () => {
    const a = qxR(11, 49), b = qxR(11, 49);
    return { p: qxDec(a / 10) + " + " + qxDec(b / 100), L: ["소수점을 맞추지 않고 " + a + " + " + b + " = " + (a + b), "그래서 답은 " + qxDec((a + b) / 100)], bad: 0, fix: "소수점끼리 맞춰 써요: " + qxDec(a / 10) + " + " + qxDec(b / 100) + " = " + qxDec(a / 10 + b / 100) };
  }],
  [["넓이", "다각형", "둘레"], () => {
    const b = qxR(4, 10), h = qxR(3, 8);
    if (Math.random() < 0.5) return { p: "가로 " + b + " cm, 세로 " + h + " cm 직사각형의 둘레", L: ["둘레 = (가로 + 세로) × 2", "= " + b + " + " + h, "= " + (b + h) + " cm"], bad: 1, fix: "× 2 를 빠뜨렸어요: (" + b + " + " + h + ") × 2 = " + (b + h) * 2 + " cm" };
    return { p: "밑변 " + b + " cm, 높이 " + h + " cm 삼각형의 넓이", L: ["삼각형의 넓이 = 밑변 × 높이 ÷ 2", "= " + b + " × " + h, "= " + b * h + " cm²"], bad: 1, fix: "÷ 2 를 빠뜨렸어요: " + b + " × " + h + " ÷ 2 = " + (b * h) / 2 + " cm²" };
  }],
  [["사각형"], () => {
    const a = qxR(70, 100), b = qxR(70, 100), c = qxR(60, 90);
    return { p: "세 각이 " + a + "°, " + b + "°, " + c + "° 인 사각형의 나머지 각", L: ["사각형 네 각의 합은 180°", "나머지 = 180° − " + a + "° − " + b + "° − " + c + "°"], bad: 0, fix: "사각형 네 각의 합은 360°: 360 − " + a + " − " + b + " − " + c + " = " + (360 - a - b - c) + "°" };
  }],
  [["각", "삼각형"], () => {
    const a = qxR(40, 80), b = qxR(30, 70);
    return { p: "두 각이 " + a + "°, " + b + "° 인 삼각형의 나머지 각", L: ["삼각형 세 각의 합은 360°", "나머지 = 360° − " + a + "° − " + b + "°", "= " + (360 - a - b) + "°"], bad: 0, fix: "삼각형 세 각의 합은 180°: 180 − " + a + " − " + b + " = " + (180 - a - b) + "°" };
  }],
  [["합동", "대칭"], () => ({ p: "정사각형의 대칭축은 몇 개?", L: ["접어서 딱 겹치는 선을 찾아요", "가로로 1개, 세로로 1개뿐이에요", "그래서 대칭축은 2개"], bad: 1, fix: "대각선 2개로 접어도 겹쳐요 → 모두 4개" })],
  [["평균", "가능성", "자료"], () => {
    const m = qxR(5, 12), d = qxR(1, 3), L3 = [m - d, m, m + d];
    return { p: L3.join(", ") + " 의 평균", L: ["합: " + L3.join(" + ") + " = " + m * 3, "개수는 3개", "평균 = " + m * 3 + " ÷ 2 = " + (m * 3) / 2], bad: 2, fix: "개수 3으로 나눠요: " + m * 3 + " ÷ 3 = " + m };
  }],
  [["범위", "어림"], () => {
    const n = qxR(1, 8) * 100 + qxR(11, 89);
    return { p: n + " 을 올림하여 백의 자리까지", L: ["백의 자리 아래 수 " + (n % 100) + " 을 봐요", "올림이니까 아래 수를 버려요", "그래서 " + Math.floor(n / 100) * 100], bad: 1, fix: "올림은 아래 수가 0이 아니면 백의 자리를 1 올려요 → " + Math.ceil(n / 100) * 100 };
  }],
  [["비례", "비율", "비"], () => {
    const a = qxR(2, 5), b = qxR(6, 9);
    return { p: b + " 에 대한 " + a + " 의 비율", L: ["기준량은 " + b + ", 비교하는 양은 " + a, "비율 = 기준량 ÷ 비교하는 양 = " + b + "/" + a], bad: 1, fix: "비율 = 비교하는 양 ÷ 기준량 = " + a + "/" + b };
  }],
  [["평면도형"], () => ({ p: "정사각형과 직사각형", L: ["정사각형은 네 각이 모두 직각이에요", "직사각형도 네 각이 모두 직각이에요", "그래서 직사각형은 모두 정사각형이에요"], bad: 2, fix: "정사각형은 네 변도 같아야 해요 → 정사각형은 직사각형이지만, 직사각형이 모두 정사각형은 아니에요" })],
  [["시간", "길이"], () => {
    const m = qxR(10, 50);
    return { p: "1시간 " + m + "분은 몇 분?", L: ["1시간은 100분이에요", "100 + " + m + " = " + (100 + m) + "분"], bad: 0, fix: "1시간은 60분: 60 + " + m + " = " + (60 + m) + "분" };
  }],
  [["들이", "무게"], () => {
    const m = qxR(1, 9) * 100;
    return { p: "1 L " + m + " mL 는 몇 mL?", L: ["1 L 는 100 mL", "100 + " + m + " = " + (100 + m) + " mL"], bad: 0, fix: "1 L = 1000 mL: 1000 + " + m + " = " + (1000 + m) + " mL" };
  }],
  [["곱셈"], () => {
    const a = qxR(1, 4), b = qxR(4, 9), c = qxR(3, 6), u = b * c;
    return { p: a + "" + b + " × " + c, L: ["일의 자리: " + b + " × " + c + " = " + u + ", " + (u % 10) + " 을 쓰고 " + Math.floor(u / 10) + " 을 올려요", "십의 자리: " + a + " × " + c + " = " + a * c + " (올린 수는 잊었어요)", "답: " + (a * c * 10 + (u % 10))], bad: 1, fix: "올린 " + Math.floor(u / 10) + " 을 더해요 → " + (a * 10 + b) * c };
  }],
  [["나눗셈"], () => {
    const d = qxR(3, 7), q = qxR(4, 9), r = qxR(1, d - 1), n = d * q + r;
    return { p: n + " ÷ " + d, L: [d + " × " + (q - 1) + " = " + d * (q - 1), "그래서 몫은 " + (q - 1) + ", 나머지는 " + (r + d)], bad: 1, fix: "나머지 " + (r + d) + " 가 나누는 수 " + d + " 보다 커요 → 몫 " + q + ", 나머지 " + r };
  }],
  [["덧셈", "뺄셈", "큰 수"], () => {
    const a = qxR(15, 49), b = qxR(15, 49), s = a + b;
    const c1 = (a % 10) + (b % 10) >= 10;
    return { p: a + " + " + b, L: ["일의 자리: " + (a % 10) + " + " + (b % 10) + " = " + ((a % 10) + (b % 10)) + (c1 ? ", " + (((a % 10) + (b % 10)) % 10) + " 을 써요" : ""), "십의 자리: " + Math.floor(a / 10) + " + " + Math.floor(b / 10) + " = " + (Math.floor(a / 10) + Math.floor(b / 10)), "답: " + (c1 ? s - 10 : s + 10)], bad: c1 ? 1 : 2, fix: c1 ? "받아올린 1 을 십의 자리에 더해요 → " + s : "답은 " + s };
  }],
];
function qxGen(T, fb) {
  const u = (typeof lsUnit === "function" && lsUnit(mapPart())) || "";
  const g = T.find(([ks]) => ks.some((w) => u.includes(w)));
  try {
    return { ...(g ? g[1]() : fb()), unit: u || "기타" };
  } catch (e) {
    return { ...fb(), unit: u || "기타" };
  }
}
const qxRiddleFb = () => QX_RIDDLE.find((r) => r[0][0] === "덧셈")[1]();
const qxTeachFb = () => QX_TEACH.find((r) => r[0][0] === "덧셈")[1]();

/* ── 고민 듣기 내용(퀘스트 id → 선택지). 고른 것마다 다른 대사·답례 ── */
const QX_CHOICE = {
  s4: { ask: "용기가 없는 나… 어떻게 하면 좋을까?", opts: [
    { t: "무서운 건 괜찮아. 무서워도 해 보는 게 용기야", say: ["무서워도… 해 보는 거. 응, 그거라면 나도 할 수 있을 것 같아!"], rw: { dust: 6 } },
    { t: "처음엔 친구랑 같이 해 봐", say: ["같이…! 그럼 내일 에반 형한테 같이 숲에 가자고 해 볼래."], rw: { gold: 40 } },
    { t: "작은 일부터 하나씩 해 봐", say: ["작은 일부터. 오늘은 혼자 우물까지 물 길러 가 볼게!"], rw: { exp: 50 } },
  ] },
  s8: { ask: "노래 마지막 한 소절이 생각이 안 나. 어떤 말로 끝낼까?", opts: [
    { t: "「다시 만나자, 별빛 아래서」", say: ["다시 만나자, 별빛 아래서… 좋아, 이 노래는 약속의 노래가 됐어."], rw: { dust: 6 } },
    { t: "「잊어도 괜찮아, 내가 기억할게」", say: ["잊어도 괜찮아, 내가 기억할게… 마르타 할머니가 들으면 우시겠다."], rw: { exp: 60 } },
    { t: "「오늘을 노래해, 지금 여기서」", say: ["지금 여기서! 신나는 노래가 됐어. 바닷가에서 같이 부르자!"], rw: { gold: 50 } },
  ] },
  s9: { ask: "나는 허수아비라 걸을 수가 없어. 그래도 소원을 빌어도 될까?", opts: [
    { t: "당연하지! 무엇이든 빌어도 돼", say: ["그럼… 들판 친구들이 배고프지 않게 해 주세요. 휴, 말하고 나니 가벼워."], rw: { dust: 7 } },
    { t: "네가 지키는 들판이 네 다리야", say: ["들판이 내 다리…! 그렇구나, 나는 이미 아주 멀리까지 닿아 있었네."], rw: { exp: 70 } },
    { t: "내가 대신 세상을 보고 와서 이야기해 줄게", say: ["정말? 그럼 다녀올 때마다 꼭 들려 줘. 기다리는 것도 소원이 될 수 있구나."], rw: { gold: 50 } },
  ] },
  s11: { ask: "이름을 잃어버렸어. 새 이름을 지어도 예전의 나일까?", opts: [
    { t: "이름이 바뀌어도 너는 너야", say: ["이름이 바뀌어도 나는 나… 그 말, 꼭 붙잡고 있을게."], rw: { dust: 7 } },
    { t: "예전 이름을 같이 찾아보자", say: ["같이 찾아 준다니… 그럼 내가 좋아하던 것부터 떠올려 볼게. 별, 바람, 그리고…"], rw: { exp: 80 } },
    { t: "지금 마음에 드는 이름을 골라 봐", say: ["지금 마음에 드는 이름… '리스'. 처음 만난 날 네가 불러 준 이름이 좋아."], rw: { gold: 50 } },
  ] },
  c6: { ask: "풍선이 하늘로 날아갔어. 다시 사 달라고 할까, 그냥 보내 줄까?", opts: [
    { t: "하늘에 사는 친구한테 주는 선물이라고 생각해", say: ["선물…! 그럼 내 풍선이 구름한테 인사하고 있겠네. 헤헤."], rw: { dust: 5 } },
    { t: "같이 새 풍선을 만들어 보자", say: ["만들 수 있어? 그럼 종이로 만들자! 이건 안 날아가겠다."], rw: { gold: 35 } },
  ] },
  c11: { ask: "귤을 전해 줘서 고마워. 이제 나는 무엇을 하면 좋을까?", opts: [
    { t: "탑에 온 사람들에게 따뜻한 귤을 나눠 줘", say: ["그래, 추운 탑에서 귤 하나면 다들 웃겠지. 내가 할 수 있는 일이 생겼어."], rw: { dust: 6 } },
    { t: "잊은 사람들의 이름을 적어 두는 일을 해 줘", say: ["이름을 적는 사람… 망각의 탑에 꼭 필요한 일이네. 오늘부터 해 볼게."], rw: { exp: 90 } },
  ] },
  c3b: { ask: "리토가 준 쪽지를 받았어. 나도 답장을 써야 할까?", opts: [
    { t: "짧아도 좋으니 답장을 써 줘", say: ["짧아도 좋으니… '너도 용감했어'라고 써야지. 고마워!"], rw: { dust: 5 } },
    { t: "직접 만나서 말해 주는 게 더 좋겠어", say: ["직접 말하기는 떨리지만… 리토도 용기를 냈으니 나도 해 볼게."], rw: { exp: 45 } },
  ] },
  c12b: { ask: "졸업식에서 한마디 해 달래요. 무슨 말을 할까요, 견습생님?", opts: [
    { t: "「우리가 함께 다시 쓴 세상이에요」", say: ["함께 다시 쓴 세상… 네, 그 말로 시작할게요!"], rw: { dust: 8 } },
    { t: "「틀려도 다시 쓰면 돼요」", say: ["틀려도 다시 쓰면 돼요. 견습생님이 한 해 동안 보여 준 거네요."], rw: { exp: 120 } },
    { t: "「고마워요, 모두」", say: ["짧지만 제일 큰 말이에요. 고마워요, 견습생님도!"], rw: { gold: 80 } },
  ] },
};

/* ── 바꾸는 퀘스트(id 유지) ── */
const QX_CONV = {
  q2: { type: "dex", n: 2, title: "토토의 몬스터 그림책", offer: ["견습생 형! 나 몬스터 그림책을 만들 거야.", "들판길에 사는 몬스터를 두 종류만 가까이서 보고 와 줄래? 싸울 만큼 가까이 가면 도감에 담겨!"], prog: "들판길 몬스터를 가까이서 보고 와 줘!", done: ["우와, 그림책에 두 쪽이 생겼어! 이거 내 보물 배지야, 형 줄게."] },
  s2: { type: "escort", exitTo: "r3", title: "바르그와 짐수레 길", offer: ["어이, 견습생. 짐수레를 끌고 숲길 끝까지 가야 하는데 안개 몬스터가 무섭군.", "내가 뒤따라갈 테니 앞장서 주겠나? 몬스터가 가까우면 나는 멈춰 서니 길을 열어 줘."], prog: "숲길 끝(해안길 쪽 출구)까지 바르그를 데려다줘요.", done: ["휴, 무사히 왔군! 이 길이면 짐을 나를 수 있겠어. 고맙네, 견습생."] },
  q4: { type: "riddle", n: 2, title: "소라의 바닷가 수수께끼", offer: ["안녕! 나는 수수께끼가 좋아. 조개 껍데기에 수수께끼를 적어 뒀거든.", "두 개 다 맞히면 내 반짝 조개를 줄게!"], prog: "소라의 수수께끼를 풀어 줘요.", done: ["둘 다 맞혔어! 약속대로 내 반짝 조개야."] },
  s3: { type: "deliver", to: "marinda", toMap: "t2", time: 90, title: "따뜻한 조개 수프 배달", offer: ["수프가 다 됐다! 마린다 선장님께 따뜻할 때 갖다 드려야 하는데.", "식기 전에 부탁해! 항구 어딘가에 계실 거야."], got: ["오, 덕배 수프! 아직 따끈하구먼. 덕배한테 고맙다고 전해 주게."], prog: "마린다 선장님께 수프를 전하고 덕배 아저씨께 돌아가요.", done: ["선장님이 좋아하셨다고? 하하, 이 국자 가져가!"] },
  q5: { type: "teach", n: 2, title: "손주의 숙제 봐 주기", offer: ["얘야, 내 손주가 숙제를 했는데 어딘가 틀렸다는구나.", "이 할미는 눈이 침침해서 못 찾겠어. 틀린 줄을 찾아 주겠니?"], prog: "할머니 손주의 숙제에서 틀린 줄을 찾아 줘요.", done: ["어디가 틀렸는지 알려 주니 손주가 '아하!' 하더구나. 고맙다, 이 약초 주머니 가져가렴."] },
  s4: { type: "choice", title: "리토의 고민", offer: ["견습생 형, 나 고민이 있어.", "다들 나보고 겁쟁이래. 숲에 가면 다리가 떨려."], prog: "리토의 이야기를 들어 줘요.", done: [] },
  q8: { type: "riddle", n: 2, title: "시계공의 톱니 수수께끼", offer: ["흠, 젊은이. 톱니는 셈을 할 줄 알아야 맞물린다네.", "내 수수께끼 두 개를 풀면 아끼던 시계를 주지."], prog: "크로노 영감의 수수께끼를 풀어 줘요.", done: ["허허, 톱니처럼 딱딱 맞아떨어지는군. 약속한 시계일세."] },
  s5: { type: "dex", n: 3, title: "제이의 특종 사진", offer: ["특종이야! 버려진 광산에 몬스터가 산대.", "세 종류를 가까이서 보고 와 줘. 내 신문 1면에 실을 거야!"], prog: "버려진 광산 몬스터 세 종류를 도감에 담아요.", done: ["세 종류나! 내일 신문 1면은 이거다. 이 기자 수첩 가져가!"] },
  q9: { type: "teach", n: 2, title: "교수님의 채점 돕기", offer: ["견습생, 마침 잘 왔어요. 학생들 답안지를 채점하는 중인데.", "틀린 풀이에서 어디부터 틀렸는지 찾아 줄 수 있나요? 틀린 곳을 알아야 고쳐 줄 수 있거든요."], prog: "답안지에서 틀린 줄을 찾아요.", done: ["정확하군요. 틀린 곳을 찾는 눈이 있으면 배움이 빨라요."] },
  s6: { type: "deliver", to: "serafin", toMap: "t5", time: 70, title: "응원 깃발 배달", offer: ["큰일이야! 결승 무대에 걸 응원 깃발을 세라핀 교장님께 드려야 해.", "무대가 곧 시작돼. 빨리 갖다 드려 줄래?"], got: ["오, 루루의 깃발이군요. 시간에 딱 맞췄어요."], prog: "세라핀 교장님께 깃발을 전하고 루루에게 돌아가요.", done: ["무대에 깃발이 걸렸어! 고마워, 이거 내 리본이야."] },
  q12: { type: "escort", exitTo: "r13", title: "펑펑 할아버지의 불꽃 자리", offer: ["껄껄, 축제 불꽃을 쏠 자리를 보러 가야 하는데 다리가 예전 같지 않구먼.", "축제 거리 바깥 끝까지 같이 가 주겠나? 몬스터가 오면 난 멈춰 있을 테니."], prog: "축제 거리 외곽 끝(별빛 다리길 쪽)까지 할아버지를 모셔요.", done: ["여기야, 여기! 여기서 쏘면 왕궁 하늘이 다 보이지. 고맙네!"] },
  s7: { type: "escort", exitTo: "t5", title: "토토와 풍선 찾기", offer: ["형, 내 풍선이 별빛 다리 쪽으로 날아갔어!", "같이 가 줘. 혼자 가기는 무서워."], prog: "별빛 다리길 끝(아르카스 쪽)까지 토토와 함께 가요.", done: ["풍선은 저 멀리 갔지만… 형이랑 와서 하나도 안 무서웠어!"] },
  q14: { type: "teach", n: 2, title: "토토의 숙제 검사", offer: ["형, 나 숙제 다 했다! 근데 엄마가 틀린 데가 있대.", "어디가 틀렸는지 형이 찾아 줘!"], prog: "토토의 숙제에서 틀린 줄을 찾아요.", done: ["아하, 거기였구나! 이제 다시 안 틀려. 형한테 배지 새로 만들어 줄게!"] },
  s8: { type: "choice", title: "레노의 마지막 소절", offer: ["안녕, 견습생. 노래를 만들고 있는데…", "마지막 한 소절이 도무지 안 떠올라."], prog: "레노의 노래를 들어 줘요.", done: [] },
  q16: { type: "deliver", to: "pat", toMap: "t8", time: 60, title: "화해의 약초차 배달", offer: ["팥돌네랑 다퉜는데… 먼저 사과하고 싶어. 약초차를 끓였어.", "식기 전에 팥돌네에게 전해 줄래? 따뜻해야 마음도 전해질 것 같아."], got: ["콩순네가…? 아직 따뜻하네. 나도 미안했다고 전해 줘."], prog: "팥돌네에게 약초차를 전하고 콩순네에게 돌아가요.", done: ["팥돌네도 미안했대? 다행이다… 정말 고마워."] },
  s9: { type: "choice", title: "짚돌이의 소원", offer: ["안녕, 나는 짚돌이. 들판을 지키는 허수아비야.", "별이 떨어지는 밤에 소원을 빌고 싶은데…"], prog: "짚돌이의 이야기를 들어 줘요.", done: [] },
  q17: { type: "riddle", n: 2, title: "별빛 계단의 열쇠 수수께끼", offer: ["별빛 계단의 문은 수수께끼로 잠겨 있어요.", "두 개를 풀면 열쇠가 나타나요. 같이 풀어 볼래요?"], prog: "별빛 계단의 수수께끼를 풀어요.", done: ["찰칵! 열쇠가 나타났어요. 이제 위로 올라갈 수 있어요."] },
  s10: { type: "dex", n: 3, title: "루크의 구름 그림", offer: ["구름 다리에 사는 꿈 몬스터들을 그리고 싶어.", "세 종류만 가까이서 보고 와서 어떻게 생겼는지 알려 줘!"], prog: "구름 다리 몬스터 세 종류를 도감에 담아요.", done: ["이렇게 생겼구나! 그림이 살아 움직이는 것 같아. 이 그림 너 줄게."] },
  q20: { type: "teach", n: 2, title: "레노의 악보 계산", offer: ["우물가에 꽃을 심을 자리를 계산했는데 아무래도 이상해.", "내 풀이에서 틀린 줄을 찾아 줄래?"], prog: "레노의 풀이에서 틀린 줄을 찾아요.", done: ["고친 대로 하니 꽃자리가 딱 맞아! 우물가가 다시 환해지겠어."] },
  s11: { type: "choice", title: "리스의 이름", offer: ["견습생… 나, 내 이름이 잘 기억나지 않아.", "안개가 지워 갔나 봐."], prog: "리스의 이야기를 들어 줘요.", done: [] },
  q21: { type: "riddle", n: 2, title: "얼어붙은 문의 수수께끼", offer: ["부엉— 이 문은 톱니가 얼어 셈을 잊었다네.", "수수께끼 두 개를 풀어 톱니를 깨워 주게."], prog: "얼어붙은 문의 수수께끼를 풀어요.", done: ["부엉! 톱니가 돌기 시작했네. 문이 열리겠어."] },
  s12: { type: "deliver", to: "sora", toMap: "t11", time: 70, title: "얼기 전에 귤 배달", offer: ["이 귤을 소라에게 주고 싶어. 그런데 탑은 너무 추워서 금방 얼어.", "얼기 전에 갖다 줄래?"], got: ["모르 아저씨 귤? 아직 말랑해! 고맙다고 전해 줘."], prog: "소라에게 귤을 전하고 모르에게 돌아가요.", done: ["소라가 웃었다고? 그럼 됐어. 이거, 나한테 남은 마지막 귤이야."] },
  q23: { type: "escort", exitTo: "t11", title: "모모와 마지막 별빛 길", offer: ["견습생님, 하얀 세상 끝까지 같이 가 줄래요?", "마지막 별빛이 남아 있는지 제 눈으로 보고 싶어요. 몬스터가 오면 저는 멈춰 있을게요."], prog: "하얀 세상 끝(망각의 탑 쪽)까지 모모와 함께 가요.", done: ["보여요… 별빛이 아직 남아 있어요! 견습생님 덕분이에요."] },
  s13: { type: "dex", n: 3, title: "졸업 앨범 사진", offer: ["졸업 앨범에 우리가 만난 몬스터들도 넣고 싶어!", "하얀 세상 몬스터 세 종류를 가까이서 보고 와 줘."], prog: "하얀 세상 몬스터 세 종류를 도감에 담아요.", done: ["앨범 완성! 무서웠던 몬스터도 이렇게 보니 추억이네."] },
};

/* ── 이어지는 서브 사연(after 가 끝나야 받음) ── */
const QX_CHAIN = [
  { id: "c1", after: "s14", map: "t1", npc: "fin", type: "talk", to: "sora", toMap: "t2", n: 1, title: "오스카 할아버지의 답장", where: "t2",
    offer: ["오스카 할아버지가 답장을 쓰셨대! 소라한테 가는 거야.", "항구에 가면 소라에게 전해 줄래?"], prog: "루멘 항구의 소라에게 답장을 전해요.",
    got: ["할아버지 답장이다! '바다는 늘 같은 자리에 있단다'… 헤헤, 고마워."], done: ["소라가 좋아했어? 편지가 오가니 바다가 가까워진 것 같아."], rw: { exp: 25, gold: 20, dust: 3 } },
  { id: "c1b", after: "c1", map: "t1", npc: "barg", type: "riddle", n: 1, title: "바르그의 짐 수수께끼",
    offer: ["편지 심부름을 했다며? 나도 하나 묻지. 짐꾼은 셈이 빨라야 하거든."], prog: "바르그의 수수께끼를 풀어요.", done: ["허, 제법이군! 짐꾼 해도 되겠어."], rw: { exp: 25, gold: 25, dust: 3 } },
  { id: "c2", after: "s3", map: "t2", npc: "deok", type: "teach", n: 1, title: "덕배의 장부 검사",
    offer: ["수프 값을 장부에 적었는데 계산이 안 맞아.", "어디서 틀렸는지 봐 줄래?"], prog: "덕배 아저씨 장부에서 틀린 줄을 찾아요.", done: ["거기였군! 이제 손님한테 바르게 받을 수 있겠어."], rw: { exp: 30, gold: 25, dust: 3 } },
  { id: "c3", after: "s4", map: "t3", npc: "rito", type: "talk", to: "lis", toMap: "t3", n: 1, title: "리토의 용기 쪽지", where: "t3",
    offer: ["형 말 듣고 용기 내서 쪽지를 썼어. 리스 누나한테 전해 줄래?", "직접 주기는… 아직 좀 떨려서."], prog: "이끼골의 리스에게 쪽지를 전해요.",
    got: ["리토가…? '고마워, 누나 덕분에 숲이 덜 무서워'래. 귀엽다."], done: ["누나가 웃었어? 다음엔 내가 직접 줄 거야!"], rw: { exp: 35, gold: 20, dust: 3 } },
  { id: "c3b", after: "c3", map: "t3", npc: "lis", type: "choice", n: 1, title: "리스의 답장 고민",
    offer: ["견습생, 잠깐만."], prog: "리스의 고민을 들어 줘요.", done: [], rw: { exp: 35, gold: 20, dust: 3 } },
  { id: "c4", after: "s5", map: "t4", npc: "jay", type: "riddle", n: 2, title: "신문 수수께끼 칸",
    offer: ["특종 고마워! 이번 신문엔 수수께끼 칸도 만들 거야.", "독자들이 풀 수 있는지 네가 먼저 풀어 봐 줘!"], prog: "제이의 수수께끼 칸을 풀어요.", done: ["좋아, 문제없어! 신문 나오면 네 이름도 넣을게."], rw: { exp: 40, gold: 30, dust: 3 } },
  { id: "c5", after: "s17", map: "t5", npc: "popo", type: "teach", n: 2, title: "포포의 오답 고치기",
    offer: ["시험 공부 덕분에 많이 맞혔어! 그런데 두 문제를 틀렸어.", "어디서 틀렸는지 같이 찾아 줄래?"], prog: "포포의 오답에서 틀린 줄을 찾아요.", done: ["틀린 곳을 알면 다음엔 안 틀려! 고마워!"], rw: { exp: 45, gold: 25, dust: 4 } },
  { id: "c6", after: "s7", map: "t6", npc: "toto", type: "choice", n: 1, title: "날아간 풍선",
    offer: ["형… 풍선 말이야."], prog: "토토의 이야기를 들어 줘요.", done: [], rw: { exp: 45, gold: 25, dust: 3 } },
  { id: "c7", after: "s8", map: "t7", npc: "reno", type: "deliver", to: "marta", toMap: "t7", time: 70, n: 1, title: "새 노래 악보 배달", where: "t7",
    offer: ["노래가 완성됐어! 마르타 할머니께 악보를 드리고 싶어.", "할머니가 낮잠 드시기 전에 빨리!"], got: ["레노의 노래구나… 이 늙은이 가슴이 따뜻해지는구먼."], prog: "마르타 할머니께 악보를 전하고 레노에게 돌아가요.",
    done: ["할머니가 흥얼거리셨대? 그거면 충분해."], rw: { exp: 55, gold: 30, dust: 4 } },
  { id: "c8", after: "s9", map: "t8", npc: "zip", type: "dex", n: 2, title: "짚돌이가 못 본 언덕", where: "r18",
    offer: ["허수아비 언덕엔 어떤 몬스터가 사는지 늘 궁금했어.", "나는 못 가니까… 두 종류만 보고 와서 알려 줄래?"], prog: "허수아비 언덕 몬스터 두 종류를 도감에 담아요.", done: ["그렇게 생겼구나! 이제 밤에 덜 무섭겠어."], rw: { exp: 60, gold: 30, dust: 4 } },
  { id: "c9", after: "s10", map: "t9", npc: "luke", type: "teach", n: 2, title: "루크의 별자리 계산",
    offer: ["별자리 사이 거리를 계산했는데 별이 엉뚱한 데 찍혔어.", "내 풀이 좀 봐 줘!"], prog: "루크의 풀이에서 틀린 줄을 찾아요.", done: ["이제 별이 제자리에 찍혀! 별자리 지도가 완성됐어."], rw: { exp: 70, gold: 30, dust: 4 } },
  { id: "c10", after: "s11", map: "t10", npc: "lis", type: "riddle", n: 2, title: "이름을 찾는 수수께끼",
    offer: ["예전 내 이름을 기억하는 방법이 있대. 수수께끼를 풀면 조각이 떠오른대.", "같이 풀어 줄래?"], prog: "리스의 수수께끼를 풀어요.", done: ["떠올랐어… 이름보다 소중한 건, 불러 주는 사람이라는 거."], rw: { exp: 80, gold: 30, dust: 4 } },
  { id: "c11", after: "s12", map: "t11", npc: "mor", type: "choice", n: 1, title: "모르의 할 일",
    offer: ["이보게."], prog: "모르의 이야기를 들어 줘요.", done: [], rw: { exp: 85, gold: 35, dust: 4 } },
  { id: "c12", after: "s13", map: "t12", npc: "toto", type: "talk", to: "momo", toMap: "t12", n: 1, title: "졸업식 초대장", where: "t12",
    offer: ["졸업식 초대장을 만들었어! 모모 누나한테 제일 먼저 주고 싶어.", "대신 전해 줄래?"], prog: "모모에게 초대장을 전해요.",
    got: ["초대장이요? 토토가 만들었구나… 꼭 갈게요!"], done: ["누나가 온대? 야호!"], rw: { exp: 90, gold: 40, dust: 4 } },
  { id: "c12b", after: "c12", map: "t12", npc: "momo", type: "choice", n: 1, title: "졸업식 한마디",
    offer: ["견습생님, 상의할 게 있어요."], prog: "모모의 이야기를 들어 줘요.", done: [], rw: { exp: 100, gold: 50, dust: 5 } },
];

/* 적용: 퀘스트 바꾸기 + 사연 붙이기 */
(function qxApply() {
  for (const id in QX_CONV) {
    const q = QS.find((x) => x.id === id);
    if (!q) continue;
    const c = QX_CONV[id];
    q.was = { type: q.type, n: q.n, mon: q.mon, item: q.item };
    Object.assign(q, c);
    if (c.type === "choice") q.n = 1;
    if (c.type === "deliver" || c.type === "escort") q.n = 1;
    if (c.type === "riddle" || c.type === "teach" || c.type === "choice") q.where = q.map;
    if (c.type === "deliver") q.where = q.toMap;
    delete q.mon;
    delete q.item;
  }
  for (const c of QX_CHAIN) if (!QS.some((x) => x.id === c.id)) QS.push({ side: 1, where: c.map, ...c });
  for (const q of QS) {
    if (q.type === "choice" && !QX_CHOICE[q.id]) console.warn("고민 듣기 내용 없음", q.id);
    if (q.type === "dex") {
      const L = qxDexKinds(q.where);
      q.n = Math.min(q.n || 3, L.length) || 1;
    }
  }
})();
function qxDexKinds(map) {
  const m = MAPS[map];
  if (!m) return [];
  return [...new Set((m.mons || []).map((r) => r[0]).filter((t) => MON[t] && !MON[t].boss && t !== "gate"))];
}

/* 옛 저장 옮기기: 예전 방식으로 이미 다 했으면 그대로 끝낼 수 있게, 아니면 새 방식 0부터 */
function qxMigrate() {
  if (!save || !save.q) return;
  const st = (save.st = save.st || {});
  if (st.qconv) return;
  st.qconv = 1;
  for (const id in QX_CONV) {
    const s0 = save.q[id],
      q = QS.find((x) => x.id === id);
    if (!s0 || s0.st !== "active" || !q || !q.was) continue;
    const old = q.was.type === "gather" ? save.inv[q.was.item] || 0 : s0.k || 0;
    s0.k = old >= q.was.n ? q.n : 0;
    if (q.type === "deliver") s0.t0 = Date.now();
  }
  store();
}
qxMigrate();
if (typeof loadSave === "function") {
  const ls0 = loadSave;
  loadSave = function () {
    const r = ls0.apply(this, arguments);
    qxMigrate();
    return r;
  };
}

/* 진행 수: 새 종류는 모두 save.q[id].k */
const qxC0 = qCount;
qCount = function (q) {
  if (!QX.types.includes(q.type)) return qxC0(q);
  const s0 = save.q[q.id];
  return s0 ? Math.min(q.n, s0.k || 0) : 0;
};
/* 이어지는 사연: 앞 퀘스트가 끝나야 보임 */
const qxAfterOk = (q) => !q.after || (save.q[q.after] && save.q[q.after].st === "done");
qFor = function (n) {
  const L = QS.filter((q) => q.npc === n.id && q.map === M.id && (!q.pet || save.pet) && qxAfterOk(q));
  return L.find((q) => !(save.q[q.id] && save.q[q.id].st === "done")) || L[0];
};

/* 끝내기(보상). mul: 늦은 배달 0.7 */
function qxFinish(n, q, lines, rwOver) {
  const rw = { ...q.rw, ...(rwOver || {}) },
    s0 = save.q[q.id],
    mul = s0 && s0.late ? 0.7 : 1;
  const ex = Math.round((rw.exp || 0) * mul),
    gd = Math.round((rw.gold || 0) * mul),
    du = Math.max(1, Math.round((rw.dust || 0) * mul));
  const fin = () => {
    if (rw.item && !save.items.includes(rw.item)) {
      save.items.push(rw.item);
      const e2 = typeof I2E !== "undefined" && I2E[rw.item];
      if (e2) rpgGiveStory(e2);
    }
    s0.st = "done";
    gain(ex, gd, du);
    if (typeof sfx === "function") sfx("win");
    toast("퀘스트 완료! EXP +" + ex + " · 금화 +" + gd + " · 가루 +" + du + (rw.item ? " · " + rw.item : "") + (mul < 1 ? " (조금 늦었지만 괜찮아요)" : ""));
    store();
    hud();
  };
  const L = qText(lines && lines.length ? lines : q.done && q.done.length ? q.done : ["고마워!"]);
  if (mul < 1) L.unshift("조금 식었지만… 마음은 다 전해졌어. 고마워!");
  openDlg(n, L, fin);
}

/* ── 수수께끼·가르쳐 주기 화면 ── */
function qxRiddleRun(n, q, after) {
  const s0 = save.q[q.id],
    R = qxGen(QX_RIDDLE, qxRiddleFb),
    ch = qxChoices(R.a, R.w || []),
    t0 = performance.now();
  let first = true;
  lsOpenBox(
    lsHead("수수께끼 " + ((s0.k || 0) + 1) + " / " + q.n, D[q.npc].n + " · " + R.unit) +
      '<p class="lsq">' + esc(R.q) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div>',
  );
  lsEl.onclick = null;
  lsChoices({ ch }, (v, b) => {
    const ok = v === String(R.a);
    if (first && typeof logAdd === "function") logAdd({ u: R.unit, k: "math", ok, t: (performance.now() - t0) / 1000, q: "수수께끼: " + R.q, a: R.a });
    first = false;
    if (!ok) {
      b.disabled = true;
      if (typeof sfx === "function") sfx("bad");
      $("lsfb").innerHTML = '<span class="lsno">음… 아니야. 다시 생각해 봐! <small>' + esc(R.ex.split("→")[0].split(":")[0]) + "</small></span>";
      return;
    }
    if (typeof sfx === "function") sfx("ok");
    lsEl.querySelectorAll(".lsch button").forEach((x) => (x.disabled = true));
    s0.k = (s0.k || 0) + 1;
    store();
    $("lsfb").innerHTML = '<span class="lsok">정답! ' + esc(R.ex) + '</span><div class="lsrow"><button type="button" class="lsmain" id="qxn">' + (s0.k < q.n ? "다음 수수께끼 ▶" : "돌려주기 ▶") + "</button></div>";
    $("qxn").focus();
    $("qxn").onclick = () => {
      if (s0.k < q.n) qxRiddleRun(n, q, after);
      else {
        lsClose();
        after();
      }
    };
  });
  $("lsfb").insertAdjacentHTML("afterend", '<div class="lsrow"><button type="button" data-x="later">나중에 할래요</button></div>');
  lsEl.querySelector('[data-x="later"]').onclick = () => lsClose();
}
function qxTeachRun(n, q, after) {
  const s0 = save.q[q.id],
    R = qxGen(QX_TEACH, qxTeachFb),
    t0 = performance.now();
  let first = true;
  lsOpenBox(
    lsHead("가르쳐 주기 " + ((s0.k || 0) + 1) + " / " + q.n, D[q.npc].n + " · " + R.unit) +
      '<p class="lsp">이렇게 풀었대요. <b>처음 틀린 줄</b>을 눌러 주세요.</p><p class="lsq">' + esc(R.p) + "</p>" +
      '<div class="lsch qxlines">' + R.L.map((t, i) => '<button type="button" data-i="' + i + '"><i>' + (i + 1) + "</i>" + esc(t) + "</button>").join("") + "</div>" +
      '<div class="lsfb" id="lsfb"></div><div class="lsrow"><button type="button" data-x="later">나중에 할래요</button></div>',
  );
  lsEl.onclick = (e) => {
    if (e.target.closest('[data-x="later"]')) return lsClose();
    const b = e.target.closest("button[data-i]");
    if (!b || b.disabled) return;
    const ok = +b.dataset.i === R.bad;
    if (first && typeof logAdd === "function") logAdd({ u: R.unit, k: "math", ok, t: (performance.now() - t0) / 1000, q: "틀린 줄 찾기: " + R.p, a: R.bad + 1 + "번 줄" });
    first = false;
    if (!ok) {
      b.disabled = true;
      b.classList.add("qxok");
      if (typeof sfx === "function") sfx("bad");
      $("lsfb").innerHTML = '<span class="lsno">이 줄은 맞게 했어요. 다른 줄을 볼까요?</span>';
      return;
    }
    if (typeof sfx === "function") sfx("ok");
    lsEl.querySelectorAll(".qxlines button").forEach((x) => (x.disabled = true));
    b.classList.add("qxbad");
    s0.k = (s0.k || 0) + 1;
    store();
    lsEl.onclick = null;
    $("lsfb").innerHTML = '<span class="lsok">찾았어요! ' + esc(R.fix) + '</span><div class="lsrow"><button type="button" class="lsmain" id="qxn">' + (s0.k < q.n ? "다음 풀이 ▶" : "알려 주기 ▶") + "</button></div>";
    $("qxn").focus();
    $("qxn").onclick = () => {
      if (s0.k < q.n) qxTeachRun(n, q, after);
      else {
        lsClose();
        after();
      }
    };
  };
}
function qxChoiceRun(n, q) {
  const C = QX_CHOICE[q.id];
  if (!C) return qxFinish(n, q);
  openDlg(n, qText([C.ask]), null, C.opts.map((o, i) => [o.t, () => {
    save.q[q.id].k = 1;
    save.q[q.id].c = i;
    store();
    qxFinish(n, q, o.say, o.rw);
  }]));
}

/* ── 말 걸기: 새 종류 처리 ── */
const qxTalk0 = talk;
talk = function (n) {
  if (n.qxEsc) {
    const q = QS.find((x) => x.id === n.qxEsc);
    return openDlg(n, [q ? (n.qxScared ? "몬스터가 가까워요! 먼저 길을 열어 줘요." : q.prog) : "같이 가요!"]);
  }
  if (!save.job || (n.mj && !save.job)) return qxTalk0(n);
  // 시간 안 배달: 받는 사람
  const dq = QS.find((q) => q.type === "deliver" && q.to === n.id && q.toMap === M.id && save.q[q.id] && save.q[q.id].st === "active" && !save.q[q.id].k);
  if (dq) {
    const s0 = save.q[dq.id];
    return openDlg(n, qText(dq.got), () => {
      s0.k = 1;
      s0.late = (Date.now() - (s0.t0 || Date.now())) / 1000 > dq.time ? 1 : 0;
      store();
      hud();
      toast(dq.title + " · " + (s0.late ? "전했어요! (조금 늦었어요)" : "시간 안에 전했어요!") + " " + D[dq.npc].n + "에게 알려요");
    });
  }
  const q = qFor(n),
    s0 = q && save.q[q.id];
  if (!q || !QX.types.includes(q.type) || (s0 && s0.st === "done")) return qxTalk0(n);
  const back = () => qxFinish(n, q);
  if (!s0)
    return openDlg(n, qText(q.offer), () => {
      if (!save.met[n.id]) save.met[n.id] = 1;
      save.q[q.id] = { st: "active", k: 0 };
      const s1 = save.q[q.id];
      if (q.type === "deliver") s1.t0 = Date.now();
      if (q.type === "dex") s1.seen = [];
      store();
      hud();
      toast("퀘스트를 받았어요: " + q.title);
      if (typeof sfx === "function") sfx("quest");
      if (q.type === "riddle") setTimeout(() => qxRiddleRun(n, q, back), 400);
      if (q.type === "teach") setTimeout(() => qxTeachRun(n, q, back), 400);
      if (q.type === "choice") setTimeout(() => qxChoiceRun(n, q), 300);
      if (q.type === "escort") setTimeout(() => qxEscortStart(q), 300);
    });
  if (qCount(q) >= q.n) {
    const C = q.type === "choice" && QX_CHOICE[q.id];
    return C ? qxFinish(n, q, C.opts[s0.c || 0].say, C.opts[s0.c || 0].rw) : back();
  }
  if (q.type === "riddle") return qxRiddleRun(n, q, back);
  if (q.type === "teach") return qxTeachRun(n, q, back);
  if (q.type === "choice") return qxChoiceRun(n, q);
  openDlg(n, qText([q.prog + (q.type === "dex" ? " (" + qCount(q) + " / " + q.n + ")" : "")]));
};

/* ── 도감 사진: 몬스터 앞에서 문제가 뜨면(가까이 만남) 담김 ── */
const qxAf0 = askField;
askField = function (MI, title, cb) {
  try {
    const key = Object.keys(MON).find((k) => MON[k].n === MI.n);
    if (key && save.q)
      for (const q of QS)
        if (q.type === "dex" && q.where === M.id) {
          const s0 = save.q[q.id];
          if (!s0 || s0.st !== "active") continue;
          s0.seen = s0.seen || [];
          if (!s0.seen.includes(key) && qxDexKinds(q.where).includes(key) && s0.k < q.n) {
            s0.seen.push(key);
            s0.k = Math.min(q.n, s0.seen.length);
            store();
            toastLater(() => "📷 " + MON[key].n + " · " + q.title + " " + s0.k + "/" + q.n + (s0.k >= q.n ? " · " + D[q.npc].n + "에게 돌아가요" : ""), 200);
            if (typeof trk === "function") trk();
          }
        }
  } catch (e) {}
  return qxAf0.apply(this, arguments);
};

/* ── 호위: 뒤따라 걷는 사람 ── */
const qxEscQ = () => QS.find((q) => q.type === "escort" && save.q[q.id] && save.q[q.id].st === "active" && !save.q[q.id].k);
function qxEscortStart(q) {
  QX.trail = [];
  npcs = npcs.filter((m) => m.id !== q.npc);
  qxEscSpawn(q);
  toast(D[q.npc].n + "이(가) 뒤따라와요 · " + CNAME[q.where] + " 끝까지");
}
function qxEscSpawn(q) {
  if (M.id === "home" || M.kind === "home" || M.kind === "room") return;
  if (npcs.some((m) => m.qxEsc)) return;
  const f = { ...D[q.npc], id: q.npc, x: pl.x - 10, y: pl.y + 2, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, lines: [], wait: 0, dir: 1, face: "d", f: 0, mv: false, talk: 0, still: 1, qxEsc: q.id };
  npcs.push(f);
  QX.esc = f;
}
function qxEscTarget(q) {
  const m = MAPS[q.where],
    e = m && (m.exits || []).find((e) => e.to === q.exitTo);
  if (!e) return null;
  return { x: ((e.x0 + e.x1) / 2) * T + 8, y: ((e.y0 + e.y1) / 2) * T + 8 };
}
const qxLm0 = loadMap;
loadMap = function () {
  const r = qxLm0.apply(this, arguments);
  QX.esc = null;
  QX.trail = [];
  const q = save.q && qxEscQ();
  if (q) {
    npcs = npcs.filter((m) => m.id !== q.npc || m.qxEsc);
    qxEscSpawn(q);
  }
  return r;
};
const qxUp0 = update;
update = function () {
  qxUp0();
  const f = QX.esc;
  if (!f || busy) return;
  const q = QS.find((x) => x.id === f.qxEsc),
    s0 = q && save.q[q.id];
  if (!s0 || s0.st !== "active" || s0.k) {
    npcs = npcs.filter((m) => m !== f);
    QX.esc = null;
    return;
  }
  const tr = QX.trail;
  const last = tr[tr.length - 1];
  if (!last || Math.hypot(last.x - pl.x, last.y - pl.y) > 2) tr.push({ x: pl.x, y: pl.y });
  if (tr.length > 60) tr.shift();
  f.qxScared = mons.some((m) => !m.dead && !MON[m.type].boss && Math.hypot(m.x - f.x, m.y - f.y) < 34);
  const tg = tr.length > 9 ? tr[tr.length - 10] : null;
  f.mv = false;
  if (tg && !f.qxScared) {
    const dx = tg.x - f.x,
      dy = tg.y - f.y,
      d = Math.hypot(dx, dy);
    if (d > 3) {
      const sp = Math.min(d, d > 40 ? 3 : 2);
      f.x += (dx / d) * sp;
      f.y += (dy / d) * sp;
      f.dir = dx > 0 ? 1 : -1;
      f.face = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "u" : "d") : "s";
      f.mv = true;
      if (tk % 4 === 0) f.f++;
    }
  }
  if (M.id === q.where) {
    const t = qxEscTarget(q);
    if (t && Math.hypot(f.x - t.x, f.y - t.y) < 56 && Math.hypot(pl.x - t.x, pl.y - t.y) < 64) {
      s0.k = 1;
      store();
      hud();
      qxFinish(f, q);
    }
  }
};

/* ── 그리기: 배달 막대, 겁먹은 호위 "!" ── */
const qxFx0 = drawFx;
drawFx = function () {
  qxFx0.apply(this, arguments);
  try {
    const f = QX.esc;
    if (f && f.qxScared && npcs.includes(f)) glyph("!", "#ff8a7a", Math.round(f.x - cam.x), Math.round(f.y - cam.y) - 30);
    const dq = save.q && QS.find((q) => q.type === "deliver" && save.q[q.id] && save.q[q.id].st === "active" && !save.q[q.id].k);
    if (dq && !busy) {
      const left = Math.max(0, 1 - (Date.now() - (save.q[dq.id].t0 || Date.now())) / 1000 / dq.time),
        w = 60,
        bx = Math.round(W / 2 - w / 2),
        by = 26;
      P(x, bx - 1, by - 1, w + 2, 5, "rgba(20,16,30,.75)");
      P(x, bx, by, Math.round(w * left), 3, left > 0.3 ? "#ffb86b" : left > 0 ? "#ff7a6b" : "#8a8298");
      P(x, bx - 6, by - 1, 4, 4, "#ffe2a0");
    }
  } catch (e) {}
};

/* ── 길 안내(메인 퀘스트가 새 종류일 때) ── */
const qxGoal0 = rawGoal;
rawGoal = function () {
  const g = qxGoal0();
  if (!g || !save.job) return g;
  try {
    const p = curPart();
    if (p >= PARTS.length) return g;
    const tn = PARTS[p].town;
    const q = QS.find((q) => q.map === tn && !q.side && !(save.q[q.id] && save.q[q.id].st === "done"));
    if (!q || !QX.types.includes(q.type)) return g;
    const s0 = save.q[q.id];
    if (!s0 || qCount(q) >= q.n || !g.t.startsWith(q.title)) return g;
    const at = (map, id) => {
      if (M.id === map) {
        const n = npcs.find((n) => n.id === id && !n.qxEsc);
        if (n) return { map, x: n.x, y: n.y - 8 };
      }
      const r = MAPS[map].npcs.find((n) => n[0] === id);
      return { map, x: r ? r[1] * T + 8 : 0, y: r ? r[2] * T + 6 : 0 };
    };
    const lab = q.title + " " + qCount(q) + "/" + q.n;
    if (q.type === "riddle" || q.type === "teach" || q.type === "choice") return { t: D[q.npc].n + "에게 " + (q.type === "choice" ? "이야기 듣기" : "말 걸기"), ...at(q.map, q.npc) };
    if (q.type === "deliver") return { t: D[q.to].n + "에게 전하기", ...at(q.toMap, q.to) };
    if (q.type === "escort") {
      const t = qxEscTarget(q);
      return { t: lab + " · " + CNAME[q.where] + " 끝까지", map: q.where, x: t ? t.x : 20 * T, y: t ? t.y : 10 * T };
    }
    if (q.type === "dex" && M.id === q.where) {
      const seen = s0.seen || [];
      const tg = nearestIn(mons.filter((m) => !m.dead && qxDexKinds(q.where).includes(m.type) && !seen.includes(m.type)));
      if (tg) return { t: lab + " · 가까이 가기", map: M.id, x: tg.x, y: tg.y - 10 };
    }
  } catch (e) {}
  return g;
};

/* 퀘스트 종류 이름(일지·검사용) */
const QX_NAME = { kill: "잡기", gather: "모으기", talk: "전하기", solve: "문제 풀어 주기", riddle: "수수께끼", teach: "가르쳐 주기", choice: "고민 듣기", dex: "도감 사진", deliver: "시간 안 배달", escort: "호위" };
function qxStats() {
  const c = {};
  QS.forEach((q) => (c[q.type] = (c[q.type] || 0) + 1));
  return c;
}

/* 화면 꾸밈(가르쳐 주기 줄) */
(function () {
  const st = document.createElement("style");
  st.textContent =
    ".qxlines{display:flex;flex-direction:column;gap:6px}.qxlines button{text-align:left;justify-content:flex-start}" +
    ".qxlines button.qxok{opacity:.55}.qxlines button.qxbad{outline:2px solid #ff8a7a;background:#4a2630}";
  document.head.appendChild(st);
})();
