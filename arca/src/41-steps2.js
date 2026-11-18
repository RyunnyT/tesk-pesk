/* ════════ 3·4·6학년 단계 풀이 + 5학년 남은 꼴 (2026-11-16 선생님 요청 「1·2·3·4번」 중 ①·④) ════════
   40-steps 처럼 stepSolve 가 알아보지 못한(null) 문제만 본다. 문제 은행(../quiz-bank.js)의 꼴마다 갈래 하나.
   풀이는 「→」로 차례를 잇고 마지막 칸이 정답(문자열은 은행 정답 그대로 끝에 붙임). 끄기: TS.off */
const ts2N = (s) => Number(String(s).replace(/,/g, ""));
const ts2Dp = (s) => ((String(s).split(".")[1] || "").length);
const ts2Fv = (s) => {
  const m = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(String(s).trim());
  if (m) return (m[1] ? +m[1] : 0) + +m[2] / +m[3];
  return ts2N(s);
};
const ts2Fr = (n, d) => {
  const g = tsGcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  if (n < d) return n + "/" + d;
  return Math.floor(n / d) + " " + (n % d) + "/" + d;
};
const ts2Kor = { 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8 };
function ts2Solve(Q) {
  const raw = String(Q.q || "").replace(/\s+/g, " "),
    ans = String(Q.a);
  let m;
  // 값이 맞을 때만 풀이를 돌려준다(끝 칸 = 은행 정답 글자 그대로)
  const ok = (v) => Math.abs(ts2Fv(ans) - v) < 1e-6;
  // 마지막 칸이 이미 정답이면(「= 68°」) 정답을 또 붙이지 않는다
  const tail = (txt) => {
    const L = txt.split("→").pop(),
      m2 = L.match(/=\s*([\d.,]+(?:\s\d+\/\d+|\/\d+)?)\D*$/) || L.match(/^\s*([\d.,]+(?:\/\d+)?)\D*$/);
    return m2 && Math.abs(ts2Fv(m2[1]) - ts2Fv(ans)) < 1e-6 ? txt : txt + " → " + ans;
  };
  const fin = (txt, v) => (ok(v) ? tail(txt) : null);
  const finS = (txt, s) => (s === ans ? txt + " → " + ans : null);

  /* ── 3학년 ── */
  if ((m = /(직사각형|정사각형|직각삼각형)에 있는 직각은 모두 몇 개/.exec(raw)))
    return m[1] === "직각삼각형" ? fin("직각삼각형은 한 각만 직각인 삼각형", 1) : fin(m[1] + "은 네 각이 모두 직각", 4);
  if ((m = /(삼|사|오|육|칠|팔)각형의 변은 모두 몇 개/.exec(raw))) return fin(m[1] + "각형의 「" + m[1] + "」 = " + ts2Kor[m[1]] + " → 변(곧은 선)이 " + ts2Kor[m[1]] + "개", ts2Kor[m[1]]);
  if ((m = /(\d+)(cm|km) (\d+)(mm|m)는 몇 (mm|m)일까요/.exec(raw))) {
    const a = +m[1], b = +m[3], f = m[2] === "cm" ? 10 : 1000;
    return fin("1" + m[2] + " = " + f + m[4] + " → " + a + m[2] + " = " + a + " × " + f + " = " + a * f + m[4] + " → " + a * f + " + " + b + " = " + (a * f + b), a * f + b);
  }
  if ((m = /(\d+)분 (\d+)초는 몇 초/.exec(raw))) {
    const a = +m[1], b = +m[2];
    return fin("1분 = 60초 → " + a + "분 = " + a + " × 60 = " + a * 60 + "초 → " + a * 60 + " + " + b + " = " + (a * 60 + b), a * 60 + b);
  }
  if ((m = /전체를 똑같이 (\d+)[으]?로 나눈 것 중 (\d+)만큼을 분수로/.exec(raw))) return finS("분모(아래) = 똑같이 나눈 수 " + m[1] + ", 분자(위) = 그중 세는 수 " + m[2], m[2] + "/" + m[1]);
  if ((m = /1\/10 ?[이가] (\d+)개이면 소수로/.exec(raw))) return fin("1/10 = 0.1 → 0.1 이 " + m[1] + "개", +m[1] / 10);
  if ((m = /([\d,]+) ÷ (\d+) 의 나머지를 구하세요/.exec(raw))) {
    const a = ts2N(m[1]), b = +m[2], q = Math.floor(a / b), r = a % b;
    return fin(b + " × " + q + " = " + b * q + " (" + b + " × " + (q + 1) + " = " + b * (q + 1) + " → " + a + "보다 커요) → " + a + " − " + b * q + " = " + r + " (" + b + "보다 작아요)", r);
  }
  if ((m = /반지름이 (\d+)cm인 원의 지름은/.exec(raw))) return fin("지름 = 반지름 × 2 → " + m[1] + " × 2 = " + 2 * m[1], 2 * m[1]);
  if ((m = /지름이 (\d+)cm인 원의 반지름은/.exec(raw))) return fin("반지름 = 지름 ÷ 2 → " + m[1] + " ÷ 2 = " + m[1] / 2, m[1] / 2);
  if ((m = /(\d+)개의 (\d+)\/(\d+)[은는]? 몇 개/.exec(raw))) {
    const T = +m[1], n = +m[2], d = +m[3], g = T / d;
    if (!Number.isInteger(g)) return null;
    return fin(T + "개를 " + d + "묶음으로 똑같이 나눠요: " + T + " ÷ " + d + " = " + g + " → " + n + "묶음: " + g + " × " + n + " = " + g * n, g * n);
  }
  if ((m = /대분수 (\d+) (\d+)\/(\d+)[을를] 가분수로/.exec(raw))) {
    const w = +m[1], n = +m[2], d = +m[3];
    return finS("1 = " + d + "/" + d + (w > 1 ? " 이니까 " + w + " = " + w * d + "/" + d : "") + " → " + w * d + "/" + d + " + " + n + "/" + d + " → 분자끼리 " + w * d + " + " + n + " = " + (w * d + n), w * d + n + "/" + d);
  }
  if (/다음 분수 중 가장 큰 분수는/.test(raw) && (m = /^(\d+)\/(\d+)$/.exec(ans))) return "분모가 모두 같아요(" + m[2] + ") → 분자가 클수록 큰 분수 → 분자가 가장 큰 것 → " + ans;
  if ((m = /(\d+)(L|kg) (\d+)(mL|g) [은는] 몇 (mL|g)/.exec(raw))) {
    const a = +m[1], b = +m[3];
    return fin("1" + m[2] + " = 1000" + m[4] + " → " + a + m[2] + " = " + a * 1000 + m[4] + " → " + a * 1000 + " + " + b + " = " + (a * 1000 + b), a * 1000 + b);
  }
  if (/표를 보고 물음에 답하세요/.test(raw)) {
    const items = [...raw.matchAll(/([가-힣]+) (\d+)명/g)].map((x) => [x[1], +x[2]]);
    if (items.length >= 2 && /가장 많은/.test(raw)) {
      const top = items.slice().sort((a, b) => b[1] - a[1]);
      return finS("수를 비교해요: " + top.map((x) => x[1]).join(" > ") + " → 가장 큰 수는 " + top[0][1] + "명", top[0][0]);
    }
    if (items.length >= 2 && /모두 몇 명/.test(raw)) {
      const S = items.reduce((a, x) => a + x[1], 0);
      return fin("모두 더해요: " + items.map((x) => x[1]).join(" + ") + " = " + S, S);
    }
  }

  /* ── 4학년 ── */
  if ((m = /([\d,]+) 에서 (십|백|천|만)의 자리 숫자는/.exec(raw))) {
    const s = m[1].replace(/,/g, ""),
      names = ["일", "십", "백", "천", "만"],
      pos = names.indexOf(m[2]),
      L = [];
    for (let i = 0; i <= pos; i++) L.push(names[i] + " " + s[s.length - 1 - i]);
    return fin("오른쪽 끝부터 자리를 세요 → " + L.join(", ") + " → " + m[2] + "의 자리 숫자", +s[s.length - 1 - pos]);
  }
  if ((m = /([\d,]+) 의 (10|100|1000)배는 얼마/.exec(raw))) {
    const k = m[2].length - 1;
    return fin(m[2] + "배는 뒤에 0을 " + k + "개 더 붙여요 → " + m[1] + " 뒤에 0 " + k + "개", ts2N(m[1]) * +m[2]);
  }
  if ((m = /삼각형의 두 각이 (\d+)°, (\d+)° 일 때 나머지 한 각/.exec(raw))) {
    const a = +m[1], b = +m[2];
    return fin("삼각형 세 각의 합은 180° → 180 − " + a + " − " + b + " = " + (180 - a - b) + "°", 180 - a - b);
  }
  if ((m = /한 직선을 이루는 두 각 중 하나가 (\d+)°/.exec(raw))) return fin("한 직선이 이루는 각은 180° → 180 − " + m[1] + " = " + (180 - m[1]) + "°", 180 - m[1]);
  if ((m = /^계산해 보세요\. (\d+) × (\d+)$/.exec(raw.trim()))) {
    const a = +m[1], b = +m[2];
    if (b < 10) return null;
    const t = Math.floor(b / 10) * 10, o = b % 10;
    return fin(b + " = " + t + " + " + o + " → " + a + " × " + t + " = " + a * t + ", " + a + " × " + o + " = " + a * o + " → " + a * t + " + " + a * o + " = " + a * b, a * b);
  }
  if ((m = /([\d,]+) ÷ (\d+) 의 몫을 구하세요/.exec(raw))) {
    const a = ts2N(m[1]), b = +m[2], q = Math.floor(a / b), r = a % b;
    return fin(b + " × " + q + " = " + b * q + " (" + b + " × " + (q + 1) + " = " + b * (q + 1) + " → " + a + "보다 커요) → 나머지 " + r + " → 몫 = " + q, q);
  }
  if ((m = /규칙을 찾아 (\d+)번째 수를 구하세요\. ([\d, ]+)/.exec(raw))) {
    const n = +m[1], s = tsNums(m[2]), a = s[1] - s[0];
    if (!s.every((v, i) => !i || v - s[i - 1] === a)) return null;
    return fin(s[0] + ", " + s[1] + ", " + s[2] + " → " + a + "씩 커져요 → " + n + "번째 = 1번째 + " + a + " × " + (n - 1) + " = " + s[0] + " + " + a * (n - 1) + " = " + (s[0] + a * (n - 1)), s[0] + a * (n - 1));
  }
  if ((m = /이등변삼각형의 꼭지각이 (\d+)°/.exec(raw))) return fin("두 밑각은 크기가 같아요 → (180 − " + m[1] + ") ÷ 2 = " + (180 - m[1]) + " ÷ 2 = " + (180 - m[1]) / 2 + "°", (180 - m[1]) / 2);
  if ((m = /세 각이 ([\d°, ]+)인 삼각형에 대한 설명/.exec(raw))) {
    const A = tsNums(m[1]),
      big = A.find((v) => v > 90),
      right = A.find((v) => v === 90);
    if (big) return finS(big + "°는 90°보다 커서 둔각 → 둔각 삼각형", "둔각이 한 개 있다.");
    if (right) return finS("90°는 직각 → 직각삼각형", "직각이 한 개 있다.");
    return finS(A.join("°, ") + "° 모두 90°보다 작아 예각 → 예각삼각형", "세 각이 모두 예각이다.");
  }
  if ((m = /^계산해 보세요\. (\d+\.\d+|\d+) ([+\-]) (\d+\.\d+|\d+)$/.exec(raw.trim()))) {
    const p = Math.max(ts2Dp(m[1]), ts2Dp(m[3]));
    if (!p) return null;
    const k = Math.pow(10, p),
      A = Math.round(+m[1] * k),
      B = Math.round(+m[3] * k),
      C = m[2] === "+" ? A + B : A - B;
    return fin("소수점의 자리를 맞춰요 → 소수점을 떼고 " + A + " " + (m[2] === "+" ? "+" : "−") + " " + B + " = " + C + " → 소수 " + p + "자리이니까 " + C / k, C / k);
  }
  if ((m = /평행사변형의 한 각이 (\d+)° 일 때, 그 각과 이웃한 각/.exec(raw))) return fin("평행사변형에서 이웃한 두 각의 합은 180° → 180 − " + m[1] + " = " + (180 - m[1]) + "°", 180 - m[1]);
  if ((m = /(정사각형|직사각형|마름모|평행사변형)에 항상 알맞은 설명은/.exec(raw)))
    return finS({ 정사각형: "정사각형 = 네 변이 같고 네 각이 직각인 사각형", 직사각형: "직사각형 = 네 각이 모두 직각인 사각형", 마름모: "마름모 = 네 변의 길이가 모두 같은 사각형", 평행사변형: "평행사변형 = 마주 보는 두 쌍의 변이 평행한 사각형" }[m[1]], ans);
  if ((m = /정(삼|사|오|육|칠|팔)각형의 한 변의 길이가 (\d+)cm입니다\. 길이가 \d+cm인 변은 모두 몇 개/.exec(raw))) return fin("정다각형은 모든 변의 길이가 같아요 → 정" + m[1] + "각형의 변은 " + ts2Kor[m[1]] + "개 → 모두 " + m[2] + "cm", ts2Kor[m[1]]);
  if (/다각형의 대각선에 대한 설명/.test(raw)) return "대각선 = 서로 이웃하지 않는 두 꼭짓점을 이은 선분(변은 이웃한 꼭짓점끼리) → " + ans;

  /* ── 5학년 남은 꼴 ── */
  if ((m = /(\d+)의 약수는 모두 몇 개/.exec(raw))) {
    const n = +m[1], L = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) L.push(i);
    return fin(n + "을 나누어떨어지게 하는 수: " + L.join(", ") + " → 세면 " + L.length + "개", L.length);
  }
  if ((m = /윗변 (\d+)cm, 아랫변 (\d+)cm, 높이 (\d+)cm인 사다리꼴의 넓이/.exec(raw))) {
    const a = +m[1], b = +m[2], h = +m[3];
    return fin("(윗변 + 아랫변) × 높이 ÷ 2 → (" + a + " + " + b + ") × " + h + " ÷ 2 = " + (a + b) + " × " + h + " ÷ 2 = " + ((a + b) * h) / 2, ((a + b) * h) / 2);
  }
  if ((m = /두 대각선이 (\d+)cm, (\d+)cm인 마름모의 넓이/.exec(raw))) return fin("두 대각선의 곱 ÷ 2 → " + m[1] + " × " + m[2] + " ÷ 2 = " + m[1] * m[2] + " ÷ 2 = " + (m[1] * m[2]) / 2, (m[1] * m[2]) / 2);
  if ((m = /^계산해 보세요\. (\d+)\/(\d+) × (\d+)\/(\d+)$/.exec(raw.trim()))) {
    const [a, b, c, d] = m.slice(1).map(Number), N = a * c, D = b * d, r = ts2Fr(N, D);
    return finS("분자끼리 " + a + " × " + c + " = " + N + ", 분모끼리 " + b + " × " + d + " = " + D + " → " + N + "/" + D + (r !== N + "/" + D ? " → 약분하면" : ""), r);
  }
  if ((m = /^계산해 보세요\. (\d+(?:\.\d+)?) × (\d+(?:\.\d+)?)$/.exec(raw.trim()))) {
    const p = ts2Dp(m[1]) + ts2Dp(m[2]);
    if (!p) return null;
    const A = Math.round(+m[1] * Math.pow(10, ts2Dp(m[1]))), B = Math.round(+m[2] * Math.pow(10, ts2Dp(m[2]))), C = A * B;
    return fin("소수점을 떼고 " + A + " × " + B + " = " + C + " → 두 수의 소수 자리 " + ts2Dp(m[1]) + " + " + ts2Dp(m[2]) + " = " + p + "자리 → " + C / Math.pow(10, p), C / Math.pow(10, p));
  }

  /* ── 6학년 ── */
  if ((m = /^계산해 보세요\. (\d+)\/(\d+) ÷ (\d+)$/.exec(raw.trim()))) {
    const n = +m[1], d = +m[2], k = +m[3], r = ts2Fr(n, d * k);
    return finS("÷ " + k + " 는 × 1/" + k + " → 분모에 곱해요: " + n + "/(" + d + " × " + k + ") = " + n + "/" + d * k + (r !== n + "/" + d * k ? " → 약분하면" : ""), r);
  }
  if ((m = /^계산해 보세요\. (\d+)\/(\d+) ÷ (\d+)\/(\d+)$/.exec(raw.trim()))) {
    const [a, b, c, d] = m.slice(1).map(Number), N = a * d, D = b * c, r = ts2Fr(N, D);
    return finS("÷ 뒤의 분수를 뒤집어 곱해요 → " + a + "/" + b + " × " + d + "/" + c + " = " + N + "/" + D + (r !== N + "/" + D ? " → 약분·대분수로" : ""), r);
  }
  if ((m = /(삼|사|오|육|칠|팔)각(기둥|뿔)의 (면|모서리|꼭짓점)[은는] 모두 몇 개/.exec(raw))) {
    const n = ts2Kor[m[1]], pr = m[2] === "기둥", k = m[3];
    const t = pr
      ? { 면: ["밑면 2개 + 옆면 " + n + "개 → 2 + " + n, n + 2], 모서리: ["위 " + n + "개 + 아래 " + n + "개 + 옆 " + n + "개 → " + n + " × 3", 3 * n], 꼭짓점: ["위 " + n + "개 + 아래 " + n + "개 → " + n + " × 2", 2 * n] }[k]
      : { 면: ["밑면 1개 + 옆면 " + n + "개 → 1 + " + n, n + 1], 모서리: ["밑면 둘레 " + n + "개 + 꼭대기로 가는 " + n + "개 → " + n + " × 2", 2 * n], 꼭짓점: ["밑면 " + n + "개 + 꼭대기 1개 → " + n + " + 1", n + 1] }[k];
    return fin(m[1] + "각" + m[2] + ": 밑면이 " + m[1] + "각형(n = " + n + ") → " + t[0] + " = " + t[1], t[1]);
  }
  if ((m = /^계산해 보세요\. (\d+(?:\.\d+)?) ÷ (\d+(?:\.\d+)?)$/.exec(raw.trim()))) {
    const a = +m[1], b = +m[2], q = ts2Fv(ans);
    if (!(Math.abs(a / b - q) < 1e-9)) return null;
    const pb = ts2Dp(m[2]);
    if (pb) {
      const k = Math.pow(10, pb), A = Math.round(a * k * 1e6) / 1e6, B = Math.round(b * k);
      return fin("나누는 수를 자연수로: 두 수의 소수점을 " + pb + "칸 옮겨요 → " + A + " ÷ " + B + " → 확인: " + B + " × " + q + " = " + A, q);
    }
    let p = 0;
    while (p < 4 && (Math.abs(a * Math.pow(10, p) - Math.round(a * Math.pow(10, p))) > 1e-9 || Math.round(a * Math.pow(10, p)) % b)) p++;
    const A = Math.round(a * Math.pow(10, p)), Qn = A / b;
    if (!Number.isInteger(Qn)) return null;
    return fin((ts2Dp(m[1]) ? "소수점을 떼고 " : m[1] + " = " + (a * 1).toFixed(p) + " → 소수점을 떼면 ") + A + " ÷ " + b + " = " + Qn + " → 소수 " + p + "자리이니까 " + Qn / Math.pow(10, p), Qn / Math.pow(10, p));
  }
  if ((m = /(\d+)의 (\d+)%는 얼마/.exec(raw))) return fin(m[2] + "% = " + m[2] + "/100 → " + m[1] + " × " + m[2] + " ÷ 100 = " + (m[1] * m[2]) / 100, (m[1] * m[2]) / 100);
  if ((m = /(\d+) : (\d+) [을를] 가장 간단한 자연수의 비로/.exec(raw))) {
    const a = +m[1], b = +m[2], g = tsGcd(a, b);
    return finS(g === 1 ? a + "와 " + b + "는 1 말고 공약수가 없어요 → 그대로" : a + "와 " + b + "의 최대공약수 " + g + " → " + a + " ÷ " + g + " = " + a / g + ", " + b + " ÷ " + g + " = " + b / g, a / g + ":" + b / g);
  }
  if ((m = /가로 (\d+)cm, 세로 (\d+)cm, 높이 (\d+)cm인 직육면체의 겉넓이/.exec(raw))) {
    const a = +m[1], b = +m[2], c = +m[3];
    return fin("서로 다른 세 면: " + a + " × " + b + " = " + a * b + ", " + b + " × " + c + " = " + b * c + ", " + c + " × " + a + " = " + c * a + " → 같은 면이 2개씩 → (" + a * b + " + " + b * c + " + " + c * a + ") × 2 = " + 2 * (a * b + b * c + c * a), 2 * (a * b + b * c + c * a));
  }
  if ((m = /비례식 (\d+) : (\d+) = (\d+) : □/.exec(raw))) {
    const a = +m[1], b = +m[2], c = +m[3], k = c / a;
    if (!Number.isInteger(k)) return null;
    return fin("앞의 항: " + a + " × " + k + " = " + c + " → 뒤의 항도 " + k + "배: " + b + " × " + k + " = " + b * k, b * k);
  }
  if ((m = /([\d,]+)[을를] (\d+) : (\d+) 로 나눌 때, 앞의 몫/.exec(raw))) {
    const T = ts2N(m[1]), a = +m[2], b = +m[3], s = a + b, u = T / s;
    return fin("전체를 " + a + " + " + b + " = " + s + "칸으로 → 한 칸은 " + T + " ÷ " + s + " = " + u + " → 앞은 " + a + "칸: " + u + " × " + a + " = " + u * a, u * a);
  }
  if ((m = /반지름이 (\d+)cm인 원의 넓이는 몇 cm²일까요\? \(원주율 3\.14\)/.exec(raw))) {
    const r = +m[1], v = Math.round(r * r * 314) / 100;
    return fin("반지름 × 반지름 × 원주율 → " + r + " × " + r + " × 3.14 = " + r * r + " × 3.14 = " + v, v);
  }
  if ((m = /반지름이 (\d+)cm인 원의 둘레는 몇 cm일까요\? \(원주율 3\.14\)/.exec(raw))) {
    const r = +m[1], v = Math.round(2 * r * 314) / 100;
    return fin("지름 = " + r + " × 2 = " + 2 * r + " → 둘레 = 지름 × 원주율 = " + 2 * r + " × 3.14 = " + v, v);
  }
  if ((m = /(원기둥|원뿔|구)의 (밑면|옆면)[은는] 몇 개/.exec(raw))) {
    const t = { 원기둥밑면: ["위·아래에 평평한 원이 하나씩", 2], 원뿔밑면: ["아래에만 평평한 원 하나(위는 뾰족한 꼭짓점)", 1], 구밑면: ["공 모양이라 평평한 면이 없어요", 0], 원기둥옆면: ["옆을 둘러싼 굽은 면 하나(펼치면 직사각형)", 1] }[m[1] + m[2]];
    return t ? fin(m[1] + ": " + t[0], t[1]) : null;
  }
  return null;
}
{
  const ssT2 = stepSolve;
  stepSolve = function (Q) {
    const r = ssT2(Q);
    if (r || TS.off || !Q) return r;
    try {
      const t = ts2Solve(Q);
      return t && typeof fixJosa === "function" ? fixJosa(t) : t;
    } catch (e) {
      return null;
    }
  };
}
