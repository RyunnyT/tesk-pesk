/* ─────────────────────────────────────────────────────────────────────────
   quiz-rating.js — 학습 RPG 1단계: 실력 레이팅 + 유형별 문항 생성기

   설계 근거: 학습게임_개발_프롬프트.md 2-2 / 5학년_문항설계_v1.md

   · 보이는 레벨(누적)과 안 보이는 레이팅(실력)을 분리한다.
     레벨은 quiz-bank.js 의 XP 체계가 그대로 담당하고, 여기서는 레이팅만 다룬다.
   · 문항은 '유형 코드 + 목표 난이도'로 만든다. 목표 난이도를 받아 파라미터를
     역산하므로, 같은 유형이라도 학생마다 다른 크기의 수가 나온다.
   · 오답 보기는 무작위가 아니라 학생이 실제로 저지르는 오류에서 만든다.
     (괄호 무시, 분자만 약분, 분모를 그냥 곱하기 …)

   브라우저와 node 양쪽에서 쓴다. DOM 을 만지지 않는다.
   ───────────────────────────────────────────────────────────────────────── */
(function (root) {
'use strict';

/* ── 레이팅 수학 (프롬프트 2-2 공식 그대로) ── */
const K_STUDENT = 32;   // 학생 레이팅은 빠르게 따라간다
const K_ITEM    = 4;    // 문항 난이도는 천천히 보정한다

/* 이 학생이 이 문항을 맞힐 것으로 보는 확률 */
function expectedScore(rating, difficulty) {
  return 1 / (1 + Math.pow(10, (Number(difficulty) - Number(rating)) / 400));
}
/* 결과를 반영한 새 레이팅 */
function updateRating(rating, difficulty, correct, k) {
  const p = expectedScore(rating, difficulty);
  return Math.round(Number(rating) + (k == null ? K_STUDENT : k) * ((correct ? 1 : 0) - p));
}
/* 결과를 반영한 새 문항 난이도 — 많이 틀리는 문항은 어려워진다 */
function updateDifficulty(difficulty, rating, correct, k) {
  const p = expectedScore(rating, difficulty);
  return Math.round(Number(difficulty) + (k == null ? K_ITEM : k) * (p - (correct ? 1 : 0)));
}
/* 경험치는 절대 난이도가 아니라 '그 학생에게 어려운 정도'에 비례한다 */
function expGain(base, rating, difficulty) {
  return Math.max(1, Math.round(Number(base) * (1 - expectedScore(rating, difficulty))));
}
/* 같은 몬스터를 연속으로 잡을 때의 감쇠 (1·2회 100% / 3·4회 50% / 5회부터 20%) */
function streakDecay(n) {
  const c = Math.max(1, Number(n) || 1);
  return c >= 5 ? 0.2 : c >= 3 ? 0.5 : 1;
}

/* ── 작은 시드 난수 — 같은 시드면 같은 문제가 나온다 ── */
function makeRng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed == null ? Math.random() : seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return function () {
    h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));          // a..b 정수
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const clampDiff = d => Math.max(600, Math.min(1900, Math.round(d)));

/* 보기를 정답 + 오답 3개로 — 중복과 음수 답을 걸러내고 모자라면 근처 값으로 채운다.
   근처 값 채우기는 '마지막 안전장치'이고, 평소에는 오류 기반 오답이 먼저 쓰인다. */
/* 답의 생김새(정수·분수·대분수)에 맞춰 그럴듯한 변형을 만들어 낸다.
   오류 기반 오답이 모자랄 때만 쓰는 마지막 채움이라, 보기가 3개로 줄지 않게 보장한다. */
function autoVariants(answer) {
  const s = String(answer);
  const out = [];
  const mMixed = s.match(/^(\d+)과 (\d+)\/(\d+)$/);
  const mFrac  = s.match(/^(\d+)\/(\d+)$/);
  if (mMixed) {
    const w = +mMixed[1], n = +mMixed[2], d = +mMixed[3];
    [1, -1, 2].forEach(k => { if (w + k > 0) out.push((w + k) + '과 ' + n + '/' + d); });
    [1, -1].forEach(k => { if (n + k > 0 && n + k < d) out.push(w + '과 ' + (n + k) + '/' + d); });
    out.push(w + '과 ' + n + '/' + (d + 1));
  } else if (mFrac) {
    const n = +mFrac[1], d = +mFrac[2];
    [1, -1, 2].forEach(k => { if (n + k > 0 && n + k !== d) out.push((n + k) + '/' + d); });
    [1, -1, 2].forEach(k => { if (d + k > 1 && d + k !== n) out.push(n + '/' + (d + k)); });
  } else if (Number.isFinite(Number(s))) {
    const v = Number(s), isInt = Number.isInteger(v);
    [1, -1, 2, -2, 3, -3, 10, -10].forEach(k => {
      const c = isInt ? v + k : +(v + k / 10).toFixed(2);
      if (c > 0) out.push(c);
    });
  }
  return out;
}
function buildOptions(r, answer, wrongCandidates, fallback) {
  const key = v => {
    const s=String(v),m=s.match(/^(?:(\d+)과 )?(\d+)\/(\d+)$/);
    const n=m&&Number(m[3])?Number(m[1]||0)+Number(m[2])/Number(m[3]):Number(s);
    return Number.isFinite(n)?'n:'+n.toFixed(10):'s:'+s;
  };
  const out = [];
  const seen = new Set([key(answer)]);
  const take = w => {
    if (w == null) return false;
    const k = key(w);
    if (!String(w) || /NaN|Infinity|undefined/.test(String(w)) || seen.has(k)) return false;
    if (typeof w === 'number' && (!Number.isFinite(w) || w < 0)) return false;
    seen.add(k); out.push(w);
    return true;
  };
  for (const w of wrongCandidates) { if (out.length === 3) break; take(w); }
  let guard = 0;
  while (out.length < 3 && guard++ < 40) { if (fallback) take(fallback(r, out.length)); else break; }
  // 그래도 모자라면 답의 생김새에서 만들어 낸다 — 보기는 반드시 4개여야 한다
  for (const v of autoVariants(answer)) { if (out.length === 3) break; take(v); }
  return out.slice(0, 3);
}
const numFallback = answer => (r, i) => {
  const step = [1, -1, 2, -2, 10, -10, 3, -3][i % 8] || 1;
  return typeof answer === 'number' ? answer + step * ri(r, 1, 3) : null;
};

/* ─────────────────────────────────────────────────────────
   유형 생성기
   각 유형은 목표 난이도를 받아 파라미터를 역산하고,
   실제로 만들어진 문제의 난이도(actualDifficulty)를 함께 돌려준다.
   ───────────────────────────────────────────────────────── */
const TYPES = {};

/* MIX-01 · 덧셈과 뺄셈만 섞인 식 (괄호 없음) — 기준 900
   흔한 오류: a − b + c 를 a − (b + c) 로 묶어 계산한다 */
TYPES['MIX-01'] = {
  code: 'MIX-01', subject: 'math', unit: '5-1 ① 자연수의 혼합 계산',
  name: '덧셈·뺄셈 혼합', base: 900, range: [760, 1100],
  make(target, r) {
    // 난이도 → 항의 개수와 자릿수
    const terms  = target >= 1080 ? 5 : target >= 980 ? 4 : 3;
    const digits = target >= 1140 ? 3 : target >= 900 ? 2 : 1;
    const lo = digits === 1 ? 2 : digits === 2 ? 11 : 101;
    const hi = digits === 1 ? 9 : digits === 2 ? 99 : 499;

    // 중간값이 음수로 내려가지 않게 만든다 (5학년 과정에서 음수는 다루지 않는다)
    let nums = [ri(r, Math.max(lo, hi >> 1), hi)];
    let ops = [];
    let acc = nums[0];
    for (let i = 1; i < terms; i++) {
      const op = r() < 0.5 ? '+' : '-';
      let v = ri(r, lo, hi);
      if (op === '-' && v >= acc) v = ri(r, 1, Math.max(1, acc - 1));
      ops.push(op); nums.push(v);
      acc = op === '+' ? acc + v : acc - v;
    }
    // 뺄셈이 하나도 없으면 이 유형의 의미가 없다
    if (!ops.includes('-') && ops.length) {
      const i = ri(r, 0, ops.length - 1);
      if (nums[i + 1] < acc) { ops[i] = '-'; acc -= 2 * nums[i + 1]; }
    }
    const expr = nums.reduce((s, n, i) => i ? s + ' ' + ops[i - 1] + ' ' + n : String(n), '');
    const answer = acc;

    // 오류 ①: 첫 뺄셈 뒤를 통째로 묶어 계산
    let wrongGroup = null;
    const mi = ops.indexOf('-');
    if (mi >= 0) {
      let head = nums[0];
      for (let i = 0; i < mi; i++) head = ops[i] === '+' ? head + nums[i + 1] : head - nums[i + 1];
      let tail = nums[mi + 1];
      for (let i = mi + 1; i < ops.length; i++) tail += nums[i + 1];   // 뒤를 전부 더해서 뺌
      wrongGroup = head - tail;
    }
    // 오류 ②: 모든 부호를 덧셈으로 봄
    const wrongAllPlus = nums.reduce((a, b) => a + b, 0);
    // 오류 ③: 마지막 항의 부호를 뒤집음
    const lastOp = ops[ops.length - 1];
    const wrongLast = lastOp === '-' ? answer + 2 * nums[nums.length - 1]
                                     : answer - 2 * nums[nums.length - 1];

    return {
      prompt: '계산해 보세요.\n\n' + expr,
      answer,
      distractors: buildOptions(r, answer, [wrongGroup, wrongAllPlus, wrongLast], numFallback(answer)),
      actualDifficulty: clampDiff(760 + (terms - 3) * 90 + (digits - 1) * 80),
      explain: '덧셈과 뺄셈만 있을 때는 앞에서부터 차례로 계산해요.'
    };
  }
};

/* MIX-03 · 괄호가 있는 2연산 — 기준 1000
   흔한 오류: 괄호를 무시하고 앞에서부터 계산한다 */
TYPES['MIX-03'] = {
  code: 'MIX-03', subject: 'math', unit: '5-1 ① 자연수의 혼합 계산',
  name: '괄호가 있는 2연산', base: 1000, range: [960, 1170],
  make(target, r) {
    const big = target >= 1120;
    const shape = pick(r, ['mulAdd', 'mulSub', 'divAdd', 'subSub']);
    let a, b, c, expr, answer, wrongNoParen, wrongMisapply;

    if (shape === 'mulAdd') {                       // a × (b + c)
      a = ri(r, 2, big ? 19 : 9); b = ri(r, 2, big ? 40 : 12); c = ri(r, 2, big ? 40 : 12);
      expr = a + ' × (' + b + ' + ' + c + ')';
      answer = a * (b + c);
      wrongNoParen = a * b + c;                      // 괄호 무시
      wrongMisapply = a * b + a * c + a;             // 분배하다 한 번 더 더함
    } else if (shape === 'mulSub') {                // a × (b − c)
      a = ri(r, 2, big ? 19 : 9); b = ri(r, 6, big ? 50 : 18); c = ri(r, 2, b - 1);
      expr = a + ' × (' + b + ' - ' + c + ')';
      answer = a * (b - c);
      wrongNoParen = a * b - c;
      wrongMisapply = a * b - a * c - c;
    } else if (shape === 'divAdd') {                // (a + b) ÷ c  — 나누어떨어지게
      c = ri(r, 2, big ? 12 : 6);
      const q = ri(r, 2, big ? 30 : 12);
      const total = c * q;
      a = ri(r, 1, total - 1); b = total - a;
      expr = '(' + a + ' + ' + b + ') ÷ ' + c;
      answer = q;
      wrongNoParen = a + Math.floor(b / c);          // 괄호 무시 (뒤만 나눔)
      wrongMisapply = Math.floor(a / c) + Math.floor(b / c);
    } else {                                        // a − (b − c)
      c = ri(r, 1, big ? 30 : 9); b = ri(r, c + 1, big ? 60 : 20);
      a = ri(r, b, big ? 120 : 40);
      expr = a + ' - (' + b + ' - ' + c + ')';
      answer = a - (b - c);
      wrongNoParen = a - b - c;                      // 괄호 무시
      wrongMisapply = a - b + b - c;
    }

    return {
      prompt: '계산해 보세요.\n\n' + expr,
      answer,
      distractors: buildOptions(r, answer, [wrongNoParen, wrongMisapply], numFallback(answer)),
      actualDifficulty: clampDiff(960 + (big ? 150 : 0) + (shape === 'subSub' ? 60 : shape === 'divAdd' ? 40 : 0)),
      explain: '괄호가 있으면 괄호 안을 가장 먼저 계산해요.'
    };
  }
};

/* FRC-02 · 약분하기 — 기준 1050
   흔한 오류: 분자만 나눈다 / 분모만 나눈다 / 분자와 분모에서 같은 수를 뺀다 */
TYPES['FRC-02'] = {
  code: 'FRC-02', subject: 'math', unit: '5-1 ④ 약분과 통분',
  name: '약분하기', base: 1050, range: [940, 1130],
  make(target, r) {
    // 난이도 → 약분할 수(g)의 크기와 기약분수의 크기
    const gPool = target >= 1160 ? [6, 7, 8, 9, 12] : target >= 1060 ? [3, 4, 6, 8] : [2, 3, 4];
    const g = pick(r, gPool);
    const nBase = ri(r, 1, target >= 1160 ? 9 : 5);
    let dBase = ri(r, nBase + 1, target >= 1160 ? 13 : 8);
    if (gcd(nBase, dBase) !== 1) dBase = nBase + 1;         // 기약분수가 되도록
    const n = nBase * g, d = dBase * g;
    const answer = nBase + '/' + dBase;

    const wrongs = [
      (n / g) + '/' + d,                                    // 분자만 나눔
      n + '/' + (d / g),                                    // 분모만 나눔
      Math.max(1, n - g) + '/' + Math.max(2, d - g),        // 같은 수를 뺌
      (g > 2 ? (n / 2) + '/' + (d / 2) : null)              // 끝까지 약분하지 않음
    ].filter(x => x && !/(^|\/)0(\/|$)/.test(x) && x !== answer);

    return {
      prompt: n + '/' + d + ' 를 기약분수로 나타내세요.',
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => {
        const dd = dBase + [1, -1, 2][i % 3];
        return dd > nBase ? nBase + '/' + dd : null;
      }),
      actualDifficulty: clampDiff(940 + (g >= 6 ? 130 : g >= 4 ? 70 : 0) + (dBase >= 9 ? 60 : 0)),
      explain: '분자와 분모를 두 수의 최대공약수 ' + g + '(으)로 나누면 기약분수가 돼요.'
    };
  }
};

/* FRC-04 · 두 분수 통분하기 (공통분모 구하기) — 기준 1200
   흔한 오류: 최소공배수 대신 두 분모를 그냥 곱한다 / 최대공약수를 답한다 */
TYPES['FRC-04'] = {
  code: 'FRC-04', subject: 'math', unit: '5-1 ④ 약분과 통분',
  name: '통분 — 공통분모 구하기', base: 1200, range: [1090, 1270],
  make(target, r) {
    // 두 분모의 관계가 난이도를 가른다: 배수관계(쉬움) < 일반 < 서로소(곱해야 함)
    const rel = target >= 1280 ? 'general' : target >= 1180 ? pick(r, ['general', 'coprime']) : 'multiple';
    let d1, d2;
    if (rel === 'multiple') {                    // d2 가 d1 의 배수 → 공통분모는 d2
      d1 = ri(r, 2, 9); d2 = d1 * ri(r, 2, 4);
    } else if (rel === 'coprime') {              // 서로소 → 공통분모는 d1 × d2
      const pool = [3, 4, 5, 7, 8, 9, 11];
      d1 = pick(r, pool);
      do { d2 = pick(r, pool); } while (gcd(d1, d2) !== 1 || d2 === d1);
    } else {                                     // 공약수가 있지만 배수관계는 아님
      const g = pick(r, [2, 3, 4, 6]);
      let a = ri(r, 2, 7), b = ri(r, 2, 7);
      while (gcd(a, b) !== 1 || a === b) { a = ri(r, 2, 7); b = ri(r, 2, 7); }
      d1 = g * a; d2 = g * b;
    }
    const answer = lcm(d1, d2);
    const product = d1 * d2;
    const wrongs = [
      (product !== answer ? product : null),     // 최소공배수 대신 그냥 곱함
      gcd(d1, d2),                               // 최대공약수를 답함
      Math.max(d1, d2),                          // 큰 분모를 그대로 씀
      d1 + d2                                    // 분모끼리 더함
    ];

    return {
      prompt: '1/' + d1 + ' 과(와) 1/' + d2 + ' 를 통분하려고 해요.\n공통분모가 될 수 있는 가장 작은 수는?',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1090 + (rel === 'multiple' ? 0 : rel === 'general' ? 130 : 90)
                                 + (Math.max(d1, d2) >= 12 ? 50 : 0)),
      explain: '공통분모 중 가장 작은 수는 두 분모의 최소공배수예요. ' + d1 + '과 ' + d2 + '의 최소공배수는 ' + answer + '이에요.'
    };
  }
};

/* ─────────────────────────────────────────────────────────
   유형 확충 — 난이도 폭을 760~1270 에서 700~1620 으로 넓힌다.
   위쪽이 비면 잘하는 학생이 계속 다 맞히고, 아래쪽이 비면 힘든 학생이
   계속 틀린다. 두 끝을 다 채워야 목표 정답률 70~80% 가 성립한다.
   ───────────────────────────────────────────────────────── */

/* 분수 표기 도우미 */
const frac = (n, d) => n + '/' + d;
const mixed = (w, n, d) => w > 0 ? (w + '과 ' + n + '/' + d) : frac(n, d);
/* 가분수 → 대분수 문자열 */
function toMixed(n, d) {
  const g = gcd(n, d) || 1;
  let nn = n / g, dd = d / g;
  const w = Math.floor(nn / dd);
  const rem = nn - w * dd;
  if (rem === 0) return String(w);
  return mixed(w, rem, dd);
}

/* FAD-01 · 분모가 같은 분수의 덧셈·뺄셈 — 기준 850 (가장 쉬운 축)
   흔한 오류: 분모끼리도 더한다 */
TYPES['FAD-01'] = {
  code: 'FAD-01', subject: 'math', unit: '5-1 ⑤ 분수의 덧셈과 뺄셈',
  name: '분모가 같은 분수의 덧셈·뺄셈', base: 850, range: [700, 890],
  make(target, r) {
    const d = ri(r, 4, target >= 880 ? 12 : 7);
    const plus = r() < 0.5;
    let a = ri(r, 1, d - 1), b = ri(r, 1, d - 1);
    if (!plus && b > a) { const t = a; a = b; b = t; }
    if (!plus && a === b) b = Math.max(1, a - 1);
    const sum = plus ? a + b : a - b;
    const answer = toMixed(sum, d);
    const wrongs = [
      frac(sum, plus ? d + d : d),                 // 분모끼리도 더함
      frac(plus ? a + b : a - b, d) === answer ? null : frac(sum, d),
      toMixed(plus ? a + b + 1 : a - b + 1, d),    // 한 칸 밀림
      frac(plus ? a * b : Math.max(1, a), d)
    ];
    return {
      prompt: '계산해 보세요.\n\n' + frac(a, d) + (plus ? ' + ' : ' - ') + frac(b, d),
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => toMixed(Math.max(1, sum + [1, -1, 2][i % 3]), d)),
      actualDifficulty: clampDiff(700 + (d >= 8 ? 90 : 0) + (sum > d ? 100 : 0) + (plus ? 0 : 40)),
      explain: '분모가 같으면 분자끼리만 더하거나 빼요. 분모는 그대로예요.'
    };
  }
};

/* DIV-01 · 배수 판별 — 기준 900
   흔한 오류: 약수와 배수를 바꿔 생각한다 */
TYPES['DIV-01'] = {
  code: 'DIV-01', subject: 'math', unit: '5-1 ② 약수와 배수',
  name: '배수 판별', base: 900, range: [780, 970],
  make(target, r) {
    const base = pick(r, target >= 920 ? [6, 7, 8, 9, 12] : [2, 3, 4, 5]);
    const k = ri(r, 3, target >= 920 ? 14 : 9);
    const answer = base * k;
    const wrongs = [
      answer + base - 1, answer + 1, base + k,      // 배수가 아닌 근처 수 / 두 수를 더함
      Math.max(2, Math.floor(answer / 2) + 1)
    ].filter(v => v % base !== 0);
    return {
      prompt: '다음 중 ' + base + '의 배수인 것은?',
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => {
        const v = answer + ri(rr, 1, base - 1) * (i % 2 ? -1 : 1);
        return v > 0 && v % base !== 0 ? v : null;
      }),
      actualDifficulty: clampDiff(780 + (base >= 6 ? 130 : 0) + (answer >= 60 ? 60 : 0)),
      explain: base + '의 배수는 ' + base + '로 나누어떨어지는 수예요. ' + answer + ' ÷ ' + base + ' = ' + k + '.'
    };
  }
};

/* MIX-02 · 곱셈·나눗셈 혼합 — 기준 950
   흔한 오류: 나눗셈을 뒤에서부터 계산한다 */
TYPES['MIX-02'] = {
  code: 'MIX-02', subject: 'math', unit: '5-1 ① 자연수의 혼합 계산',
  name: '곱셈·나눗셈 혼합', base: 950, range: [880, 1090],
  make(target, r) {
    const big = target >= 1000;
    const b = ri(r, 2, big ? 9 : 5);
    const c = ri(r, 2, big ? 9 : 5);
    const q = ri(r, 2, big ? 20 : 9);
    const a = b * q;                                  // a ÷ b 가 나누어떨어지게
    const answer = a / b * c;
    const wrongs = [
      a / (b * c),                                    // 뒤부터 계산 (a ÷ (b × c))
      a * b / c,                                      // 순서 뒤바꿈
      a - b + c
    ].filter(v => Number.isInteger(v) && v > 0);
    return {
      prompt: '계산해 보세요.\n\n' + a + ' ÷ ' + b + ' × ' + c,
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(880 + (big ? 130 : 0) + (a >= 60 ? 60 : 0)),
      explain: '곱셈과 나눗셈만 있을 때는 앞에서부터 차례로 계산해요.'
    };
  }
};

/* REL-01 · 대응 규칙 찾기 — 기준 1000
   흔한 오류: 곱셈 규칙을 덧셈으로 본다 */
TYPES['REL-01'] = {
  code: 'REL-01', subject: 'math', unit: '5-1 ③ 규칙과 대응',
  name: '대응 규칙 찾기', base: 1000, range: [920, 1150],
  make(target, r) {
    const hard = target >= 1060;
    const a = ri(r, 2, hard ? 9 : 5);
    const b = 0; // 학년군 기준: 하나의 연산으로 나타내는 간단한 대응 관계
    const xs = [1, 2, 3, 4];
    const ys = xs.map(x => a * x + b);
    const askX = ri(r, 6, 12);
    const answer = a * askX + b;
    const wrongs = [
      askX + a + b,                                   // 곱셈을 덧셈으로 봄
      a * askX,                                       // 상수항을 빠뜨림
      ys[3] + a,                                      // 표의 마지막에서 한 칸만 더함
      a * (askX + 1) + b
    ];
    return {
      prompt: '표에서 ○와 △ 사이의 규칙을 찾아, ○가 ' + askX + '일 때 △를 구하세요.\n\n'
            + '○ : ' + xs.join(', ') + '\n△ : ' + ys.join(', '),
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(920 + (b > 0 ? 160 : 0) + (a >= 6 ? 50 : 0)),
      explain: '규칙은 △ = ○ × ' + a + (b ? ' + ' + b : '') + ' 예요.'
    };
  }
};

/* AVG-01 · 평균 구하기 — 기준 1000
   흔한 오류: 자료 수 대신 다른 수로 나눈다 */
TYPES['AVG-01'] = {
  code: 'AVG-01', subject: 'math', unit: '5-2 ⑥ 평균과 가능성',
  name: '평균 구하기', base: 1000, range: [920, 1130],
  make(target, r) {
    const n = ri(r, 3, target >= 1050 ? 6 : 4);
    const avg = ri(r, 5, target >= 1050 ? 40 : 15);
    const vals = [];
    let rest = avg * n;
    for (let i = 0; i < n - 1; i++) {
      const lo = Math.max(1, rest - (n - 1 - i) * (avg * 2));
      const v = ri(r, Math.max(1, Math.min(lo, avg)), Math.min(rest - (n - 1 - i), avg * 2));
      vals.push(v); rest -= v;
    }
    vals.push(rest);
    if (vals.some(v => v < 1)) return TYPES['AVG-01'].make(target, r);
    const sum = vals.reduce((a, b) => a + b, 0);
    const answer = sum / n;
    const wrongs = [
      sum,                                            // 합을 그대로 답함
      Math.round(sum / (n - 1)),                      // 자료 수를 하나 적게 봄
      Math.round(sum / (n + 1)),
      Math.max(...vals)
    ];
    return {
      prompt: '다음 자료의 평균을 구하세요.\n\n' + vals.join(', '),
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(920 + (n >= 5 ? 110 : 0) + (avg >= 20 ? 60 : 0)),
      explain: '평균 = 자료의 합 ÷ 자료의 수 = ' + sum + ' ÷ ' + n + ' = ' + answer + ' 예요.'
    };
  }
};

/* ARE-02 · 직사각형·정사각형의 넓이 — 기준 1000
   흔한 오류: 넓이 대신 둘레를 구한다 */
TYPES['ARE-02'] = {
  code: 'ARE-02', subject: 'math', unit: '5-1 ⑥ 다각형의 둘레와 넓이',
  name: '직사각형의 넓이', base: 1000, range: [930, 1110],
  make(target, r) {
    const big = target >= 1040;
    const w = ri(r, 3, big ? 25 : 12), h = ri(r, 3, big ? 25 : 12);
    const answer = w * h;
    const wrongs = [
      2 * (w + h),                                    // 둘레를 구함
      w + h,                                          // 그냥 더함
      Math.round(w * h / 2)                           // 삼각형 공식을 씀
    ];
    return {
      prompt: '가로 ' + w + 'cm, 세로 ' + h + 'cm인 직사각형의 넓이는 몇 cm²일까요?',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(930 + (big ? 120 : 0) + (w > 15 && h > 15 ? 50 : 0)),
      explain: '직사각형의 넓이 = 가로 × 세로 = ' + w + ' × ' + h + ' = ' + answer + ' cm² 예요.'
    };
  }
};

/* DML-01 · (소수) × (자연수) — 기준 1100
   흔한 오류: 소수점을 빠뜨리거나 자리를 잘못 찍는다 */
TYPES['DML-01'] = {
  code: 'DML-01', subject: 'math', unit: '5-2 ④ 소수의 곱셈',
  name: '(소수) × (자연수)', base: 1100, range: [1020, 1220],
  make(target, r) {
    const dp = target >= 1140 ? 2 : 1;                // 소수 자릿수
    const whole = ri(r, 2, target >= 1140 ? 24 : 9);
    const raw = ri(r, dp === 1 ? 11 : 101, dp === 1 ? 99 : 999);
    const dec = raw / Math.pow(10, dp);
    const answer = +(dec * whole).toFixed(dp);
    const wrongs = [
      +(raw * whole).toFixed(0),                      // 소수점을 아예 빼먹음
      +(dec * whole * 10).toFixed(dp),                // 소수점 한 자리 밀림
      +(dec * whole / 10).toFixed(dp + 1),
      +(dec + whole).toFixed(dp)
    ];
    return {
      prompt: '계산해 보세요.\n\n' + dec + ' × ' + whole,
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => +(answer + [0.1, -0.1, 1][i % 3]).toFixed(dp)),
      actualDifficulty: clampDiff(1020 + (dp === 2 ? 120 : 0) + (whole >= 10 ? 70 : 0)),
      explain: '소수를 자연수처럼 곱한 뒤, 소수 ' + dp + '자리만큼 소수점을 찍어요.'
    };
  }
};

/* DIV-04 · 최대공약수 — 기준 1150
   흔한 오류: 최소공배수를 답한다 */
TYPES['DIV-04'] = {
  code: 'DIV-04', subject: 'math', unit: '5-1 ② 약수와 배수',
  name: '최대공약수 구하기', base: 1150, range: [1060, 1270],
  make(target, r) {
    const g = pick(r, target >= 1180 ? [6, 8, 9, 12] : [2, 3, 4, 6]);
    let a = ri(r, 2, 9), b = ri(r, 2, 9);
    while (gcd(a, b) !== 1 || a === b) { a = ri(r, 2, 9); b = ri(r, 2, 9); }
    const x = g * a, y = g * b;
    const answer = g;
    const wrongs = [lcm(x, y), Math.min(x, y), x * y, g * 2].filter(v => v !== g);
    return {
      prompt: x + '과(와) ' + y + '의 최대공약수를 구하세요.',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1060 + (g >= 8 ? 130 : g >= 4 ? 70 : 0) + (Math.max(x, y) >= 60 ? 50 : 0)),
      explain: x + ' = ' + g + '×' + a + ', ' + y + ' = ' + g + '×' + b + ' 이므로 최대공약수는 ' + g + '예요.'
    };
  }
};

/* ARE-04 · 평행사변형의 넓이 — 기준 1150
   흔한 오류: 밑변 × 높이를 2로 나눈다 (삼각형과 헷갈림) */
TYPES['ARE-04'] = {
  code: 'ARE-04', subject: 'math', unit: '5-1 ⑥ 다각형의 둘레와 넓이',
  name: '평행사변형의 넓이', base: 1150, range: [1130, 1250],
  make(target, r) {
    const big = target >= 1160;
    const b = ri(r, 3, big ? 24 : 12), h = ri(r, 3, big ? 20 : 10);
    const side = ri(r, h + 1, h + 8);                 // 헷갈리라고 주는 빗변
    const answer = b * h;
    const wrongs = [b * h / 2, b * side, 2 * (b + side)].filter(Number.isFinite);
    return {
      prompt: '밑변이 ' + b + 'cm, 높이가 ' + h + 'cm인 평행사변형의 넓이는 몇 cm²일까요?\n'
            + '(빗변의 길이는 ' + side + 'cm 입니다)',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1070 + (big ? 120 : 0) + 60),
      explain: '평행사변형의 넓이 = 밑변 × 높이 예요. 빗변은 넓이 계산에 쓰지 않아요.'
    };
  }
};

/* FML-01 · (진분수) × (자연수) — 기준 1150
   흔한 오류: 분모에도 자연수를 곱한다 */
TYPES['FML-01'] = {
  code: 'FML-01', subject: 'math', unit: '5-2 ② 분수의 곱셈',
  name: '(진분수) × (자연수)', base: 1150, range: [1070, 1260],
  make(target, r) {
    const d = ri(r, 3, target >= 1180 ? 12 : 8);
    const n = ri(r, 1, d - 1);
    const k = ri(r, 2, target >= 1180 ? 12 : 7);
    const answer = toMixed(n * k, d);
    const wrongs = [
      frac(n * k, d * k),                             // 분모에도 곱함
      toMixed(n + k, d),                              // 더해버림
      frac(n, d * k),
      toMixed(n * k, Math.max(2, d - 1))
    ];
    return {
      prompt: '계산해 보세요.\n\n' + frac(n, d) + ' × ' + k,
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => toMixed(Math.max(1, n * k + [1, -1, 2][i % 3]), d)),
      actualDifficulty: clampDiff(1070 + (n * k > d ? 100 : 0) + (d >= 9 ? 80 : 0)),
      explain: '분자에만 자연수를 곱해요. 분모는 그대로예요.'
    };
  }
};

/* RNG-06 · 반올림 — 기준 1200
   흔한 오류: 올림·버림과 헷갈리거나 한 자리 아래를 본다 */
TYPES['RNG-06'] = {
  code: 'RNG-06', subject: 'math', unit: '5-2 ① 수의 범위와 어림하기',
  name: '반올림', base: 1200, range: [1110, 1300],
  make(target, r) {
    const place = target >= 1230 ? pick(r, [100, 1000]) : pick(r, [10, 100]);
    const num = ri(r, place * 3, place * 90);
    const answer = Math.round(num / place) * place;
    const wrongs = [
      Math.floor(num / place) * place,                // 버림
      Math.ceil(num / place) * place,                 // 올림
      Math.round(num / (place * 10)) * place * 10
    ].filter(v => v !== answer);
    const label = place === 10 ? '십의 자리' : place === 100 ? '백의 자리' : '천의 자리';
    return {
      prompt: num + '을(를) 반올림하여 ' + label + '까지 나타내세요.',
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => answer + place * [1, -1, 2][i % 3]),
      actualDifficulty: clampDiff(1110 + (place >= 100 ? 100 : 0) + (place >= 1000 ? 90 : 0)),
      explain: label + ' 아래 수가 5 이상이면 올리고, 5보다 작으면 버려요.'
    };
  }
};

/* ARE-05 · 삼각형의 넓이 — 기준 1200
   흔한 오류: 2로 나누는 것을 잊는다 */
TYPES['ARE-05'] = {
  code: 'ARE-05', subject: 'math', unit: '5-1 ⑥ 다각형의 둘레와 넓이',
  name: '삼각형의 넓이', base: 1200, range: [1170, 1300],
  make(target, r) {
    const big = target >= 1220;
    let b = ri(r, 3, big ? 26 : 14), h = ri(r, 2, big ? 22 : 12);
    if ((b * h) % 2) b += 1;                          // 답이 정수가 되게
    const answer = b * h / 2;
    const wrongs = [b * h, b + h, Math.round(b * h / 4)];
    return {
      prompt: '밑변이 ' + b + 'cm, 높이가 ' + h + 'cm인 삼각형의 넓이는 몇 cm²일까요?',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1120 + (big ? 130 : 0) + 50),
      explain: '삼각형의 넓이 = 밑변 × 높이 ÷ 2 예요. 2로 나누는 걸 잊지 마세요.'
    };
  }
};

/* DIV-05 · 최소공배수 — 기준 1200
   흔한 오류: 두 수를 그냥 곱한다 */
TYPES['DIV-05'] = {
  code: 'DIV-05', subject: 'math', unit: '5-1 ② 약수와 배수',
  name: '최소공배수 구하기', base: 1200, range: [1120, 1330],
  make(target, r) {
    const g = pick(r, target >= 1240 ? [4, 6, 8, 9] : [2, 3, 4]);
    let a = ri(r, 2, 8), b = ri(r, 2, 8);
    while (gcd(a, b) !== 1 || a === b) { a = ri(r, 2, 8); b = ri(r, 2, 8); }
    const x = g * a, y = g * b;
    const answer = lcm(x, y);
    const wrongs = [x * y, gcd(x, y), Math.max(x, y), x + y].filter(v => v !== answer);
    return {
      prompt: x + '과(와) ' + y + '의 최소공배수를 구하세요.',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1120 + (g >= 6 ? 120 : 0) + (answer >= 100 ? 80 : 0)),
      explain: '최소공배수 = 두 수의 곱 ÷ 최대공약수 = ' + (x * y) + ' ÷ ' + g + ' = ' + answer + ' 예요.'
    };
  }
};

/* MIX-06 · 사칙연산 + 괄호 — 기준 1300
   흔한 오류: 곱셈·나눗셈을 뒤로 미루고 앞에서부터 계산한다 */
TYPES['MIX-06'] = {
  code: 'MIX-06', subject: 'math', unit: '5-1 ① 자연수의 혼합 계산',
  name: '사칙연산 + 괄호', base: 1300, range: [1220, 1450],
  make(target, r) {
    const big = target >= 1330;
    const a = ri(r, 10, big ? 90 : 40);
    const b = ri(r, 2, big ? 12 : 8);
    const c = ri(r, 2, big ? 12 : 8);
    const d = ri(r, 2, 9);
    const q = ri(r, 2, big ? 12 : 6);
    const dividend = d * q;
    // a + (b × c) − dividend ÷ d
    const answer = a + b * c - q;
    const expr = a + ' + (' + b + ' × ' + c + ') - ' + dividend + ' ÷ ' + d;
    const wrongs = [
      Math.round((a + b) * c - dividend / d),         // 앞에서부터 계산
      a + b * c - dividend,                           // 나눗셈을 빠뜨림
      a + b * c - dividend / d + q                    // 부호 실수
    ].filter(v => Number.isFinite(v) && v > 0);
    return {
      prompt: '계산해 보세요.\n\n' + expr,
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1220 + (big ? 160 : 0) + (a >= 50 ? 60 : 0)),
      explain: '괄호 → 곱셈·나눗셈 → 덧셈·뺄셈 순서로 계산해요.'
    };
  }
};

/* DML-04 · (소수) × (소수) — 기준 1300
   흔한 오류: 소수점 자리 수를 더하지 않고 하나만 찍는다 */
TYPES['DML-04'] = {
  code: 'DML-04', subject: 'math', unit: '5-2 ④ 소수의 곱셈',
  name: '(소수) × (소수)', base: 1300, range: [1290, 1420],
  make(target, r) {
    const dp1 = 1, dp2 = target >= 1330 ? 2 : 1;
    const r1 = ri(r, 11, 99), r2 = ri(r, dp2 === 1 ? 11 : 101, dp2 === 1 ? 99 : 999);
    const x = r1 / 10, y = r2 / Math.pow(10, dp2);
    const dp = dp1 + dp2;
    const answer = +(x * y).toFixed(dp);
    const wrongs = [
      +(x * y * 10).toFixed(dp),                      // 소수점을 한 자리만 찍음
      +(r1 * r2).toFixed(0),                          // 소수점을 아예 안 찍음
      +(x * y / 10).toFixed(dp + 1),
      +(x + y).toFixed(dp)
    ];
    return {
      prompt: '계산해 보세요.\n\n' + x + ' × ' + y,
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => +(answer + [0.01, -0.01, 0.1][i % 3]).toFixed(dp)),
      actualDifficulty: clampDiff(1230 + (dp2 === 2 ? 130 : 0) + 60),
      explain: '두 수의 소수 자리 수를 더한 만큼(' + dp + '자리) 소수점을 찍어요.'
    };
  }
};

/* AVG-03 · 평균이 주어질 때 빠진 값 구하기 — 기준 1300
   흔한 오류: 평균을 그대로 답한다 */
TYPES['AVG-03'] = {
  code: 'AVG-03', subject: 'math', unit: '5-2 ⑥ 평균과 가능성',
  name: '평균에서 빠진 값 구하기', base: 1300, range: [1220, 1410],
  make(target, r) {
    const n = ri(r, 4, target >= 1330 ? 6 : 5);
    const avg = ri(r, 8, target >= 1330 ? 45 : 20);
    const known = [];
    for (let i = 0; i < n - 1; i++) known.push(ri(r, Math.max(1, avg - 6), avg + 6));
    const sumKnown = known.reduce((a, b) => a + b, 0);
    const answer = avg * n - sumKnown;
    if (answer < 1) return TYPES['AVG-03'].make(target, r);
    const wrongs = [avg, sumKnown, avg * n, Math.round(sumKnown / (n - 1))].filter(v => v !== answer);
    return {
      prompt: n + '개 자료의 평균이 ' + avg + '입니다.\n' + (n - 1) + '개가 다음과 같을 때, 나머지 하나는?\n\n'
            + known.join(', '),
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1220 + (n >= 6 ? 110 : 0) + (avg >= 30 ? 70 : 0)),
      explain: '전체 합 = 평균 × 자료 수 = ' + (avg * n) + '. 여기서 아는 값의 합 ' + sumKnown + '을 빼면 ' + answer + ' 예요.'
    };
  }
};

/* ARE-07 · 사다리꼴의 넓이 — 기준 1350
   흔한 오류: 두 밑변을 더하지 않거나 2로 나누지 않는다 */
TYPES['ARE-07'] = {
  code: 'ARE-07', subject: 'math', unit: '5-1 ⑥ 다각형의 둘레와 넓이',
  name: '사다리꼴의 넓이', base: 1350, range: [1320, 1460],
  make(target, r) {
    const big = target >= 1360;
    let a = ri(r, 3, big ? 20 : 12), b = ri(r, a + 1, a + (big ? 18 : 9));
    let h = ri(r, 2, big ? 18 : 10);
    if (((a + b) * h) % 2) h += 1;
    const answer = (a + b) * h / 2;
    const wrongs = [(a + b) * h, a * h / 2 + b, (b - a) * h / 2, a * b];
    return {
      prompt: '윗변이 ' + a + 'cm, 아랫변이 ' + b + 'cm, 높이가 ' + h + 'cm인 사다리꼴의 넓이는 몇 cm²일까요?',
      answer,
      distractors: buildOptions(r, answer, wrongs, numFallback(answer)),
      actualDifficulty: clampDiff(1270 + (big ? 140 : 0) + 50),
      explain: '사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2 = (' + a + '+' + b + ') × ' + h + ' ÷ 2 = ' + answer + ' 예요.'
    };
  }
};

/* FAD-04 · 대분수의 덧셈 (받아올림) — 기준 1400
   흔한 오류: 통분을 안 하고 분자끼리 더한다 / 받아올림을 빠뜨린다 */
TYPES['FAD-04'] = {
  code: 'FAD-04', subject: 'math', unit: '5-1 ⑤ 분수의 덧셈과 뺄셈',
  name: '대분수의 덧셈 (받아올림)', base: 1400, range: [1380, 1510],
  make(target, r) {
    const pool = target >= 1430 ? [[3, 4], [4, 6], [6, 8], [5, 6]] : [[2, 3], [3, 4], [2, 5], [4, 6]];
    const [d1, d2] = pick(r, pool);
    const L = lcm(d1, d2);
    let n1 = ri(r, 1, d1 - 1), n2 = ri(r, 1, d2 - 1);
    // 받아올림이 생기도록
    if (n1 * (L / d1) + n2 * (L / d2) <= L) { n1 = d1 - 1; n2 = d2 - 1; }
    const w1 = ri(r, 1, 4), w2 = ri(r, 1, 4);
    const totalN = n1 * (L / d1) + n2 * (L / d2);
    const answer = toMixed((w1 + w2) * L + totalN, L);
    const wrongs = [
      mixed(w1 + w2, n1 + n2, d1 + d2),               // 분모끼리 더함
      toMixed((w1 + w2) * L + totalN - L, L),         // 받아올림 빠뜨림
      mixed(w1 + w2, n1 + n2, Math.max(d1, d2))
    ];
    return {
      prompt: '계산해 보세요.\n\n' + mixed(w1, n1, d1) + ' + ' + mixed(w2, n2, d2),
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => toMixed((w1 + w2) * L + totalN + [1, -1, L][i % 3], L)),
      actualDifficulty: clampDiff(1320 + (L >= 12 ? 130 : 0) + 60),
      explain: '통분해서 분자끼리 더하고, 가분수가 되면 자연수 쪽으로 받아올려요.'
    };
  }
};

/* ARE-08 · 넓이가 주어질 때 변의 길이 구하기 — 기준 1450 (역산) */
TYPES['ARE-08'] = {
  code: 'ARE-08', subject: 'math', unit: '5-1 ⑥ 다각형의 둘레와 넓이',
  name: '넓이에서 변의 길이 역산', base: 1450, range: [1370, 1580],
  make(target, r) {
    const shape = target >= 1470 ? pick(r, ['tri', 'trap']) : pick(r, ['rect', 'tri']);
    if (shape === 'rect') {
      const w = ri(r, 4, 24), h = ri(r, 4, 24);
      const area = w * h;
      return {
        prompt: '넓이가 ' + area + 'cm²인 직사각형의 가로가 ' + w + 'cm일 때, 세로는 몇 cm일까요?',
        answer: h,
        distractors: buildOptions(r, h, [area - w, Math.round(area / 2 / w), area], numFallback(h)),
        actualDifficulty: clampDiff(1370 + (area >= 200 ? 60 : 0)),
        explain: '세로 = 넓이 ÷ 가로 = ' + area + ' ÷ ' + w + ' = ' + h + ' cm 예요.'
      };
    }
    if (shape === 'tri') {
      const b = ri(r, 4, 24); let h = ri(r, 4, 24);
      if ((b * h) % 2) h += 1;
      const area = b * h / 2;
      return {
        prompt: '넓이가 ' + area + 'cm²인 삼각형의 밑변이 ' + b + 'cm일 때, 높이는 몇 cm일까요?',
        answer: h,
        distractors: buildOptions(r, h, [Math.round(area / b), area * 2, area - b], numFallback(h)),
        actualDifficulty: clampDiff(1450 + (area >= 150 ? 60 : 0)),
        explain: '높이 = 넓이 × 2 ÷ 밑변 = ' + area + ' × 2 ÷ ' + b + ' = ' + h + ' cm 예요.'
      };
    }
    const a = ri(r, 3, 15); let h = ri(r, 4, 18);
    const bb = ri(r, a + 1, a + 12);
    if (((a + bb) * h) % 2) h += 1;
    const area = (a + bb) * h / 2;
    return {
      prompt: '넓이가 ' + area + 'cm²이고 높이가 ' + h + 'cm인 사다리꼴이 있어요.\n'
            + '윗변이 ' + a + 'cm일 때, 아랫변은 몇 cm일까요?',
      answer: bb,
      distractors: buildOptions(r, bb, [Math.round(area * 2 / h), Math.round(area / h) - a, area - a], numFallback(bb)),
      actualDifficulty: clampDiff(1560),
      explain: '(윗변 + 아랫변) = 넓이 × 2 ÷ 높이 = ' + (area * 2 / h) + '. 여기서 윗변 ' + a + '를 빼면 ' + bb + ' 예요.'
    };
  }
};

/* FAD-05 · 대분수의 뺄셈 (받아내림) — 기준 1500 (가장 어려운 축)
   흔한 오류: 받아내림을 안 하고 큰 분자에서 작은 분자를 뺀다 */
TYPES['FAD-05'] = {
  code: 'FAD-05', subject: 'math', unit: '5-1 ⑤ 분수의 덧셈과 뺄셈',
  name: '대분수의 뺄셈 (받아내림)', base: 1500, range: [1480, 1620],
  make(target, r) {
    const pool = target >= 1520 ? [[4, 6], [6, 8], [5, 6], [6, 9]] : [[2, 3], [3, 4], [4, 6]];
    const [d1, d2] = pick(r, pool);
    const L = lcm(d1, d2);
    let n1 = ri(r, 1, d1 - 1), n2 = ri(r, 1, d2 - 1);
    // 받아내림이 반드시 생기도록 (앞의 분자 < 뒤의 분자)
    if (n1 * (L / d1) >= n2 * (L / d2)) { n1 = 1; n2 = d2 - 1; }
    if (n1 * (L / d1) >= n2 * (L / d2)) return TYPES['FAD-05'].make(target + 40, r);
    const w2 = ri(r, 1, 3), w1 = w2 + ri(r, 1, 3);
    const totalN = (w1 - w2) * L + n1 * (L / d1) - n2 * (L / d2);
    const answer = toMixed(totalN, L);
    const wrongs = [
      toMixed((w1 - w2) * L + Math.abs(n1 * (L / d1) - n2 * (L / d2)), L),   // 큰 분자에서 작은 분자를 뺌
      mixed(w1 - w2, Math.abs(n1 - n2), Math.abs(d1 - d2) || d1),            // 통분 안 함
      toMixed(totalN + L, L)                                                 // 받아내림 빠뜨림
    ];
    return {
      prompt: '계산해 보세요.\n\n' + mixed(w1, n1, d1) + ' - ' + mixed(w2, n2, d2),
      answer,
      distractors: buildOptions(r, answer, wrongs, (rr, i) => toMixed(Math.max(1, totalN + [1, -1, 2][i % 3]), L)),
      actualDifficulty: clampDiff(1410 + (L >= 12 ? 140 : 0) + 70),
      explain: '통분한 뒤 앞의 분자가 작으면 자연수에서 1을 빌려와(받아내림) 계산해요.'
    };
  }
};

/* ── 공개 인터페이스 ── */
function generateQuestion(typeCode, targetDifficulty, seed) {
  const T = TYPES[typeCode];
  if (!T) return null;
  const r = makeRng(seed == null ? (typeCode + ':' + targetDifficulty + ':' + Math.random()) : seed);
  const made = T.make(Number(targetDifficulty) || T.base, r);
  const options = made.distractors.concat([made.answer]);
  // 보기 섞기 (같은 시드면 같은 순서)
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = options[i]; options[i] = options[j]; options[j] = t;
  }
  return {
    typeCode: T.code, subject: T.subject, unit: T.unit, typeName: T.name,
    prompt: made.prompt, answer: made.answer,
    distractors: made.distractors, options,
    actualDifficulty: made.actualDifficulty,
    explain: made.explain
  };
}

/* 목표 난이도에 가장 잘 맞는 유형 고르기.
   유형마다 만들 수 있는 난이도 폭이 정해져 있다(MIX-01 은 아무리 어렵게 해도 1100 근처).
   목표가 폭 안에 드는 유형 중에서 고르고, 없으면 가장 가까운 유형을 쓴다.
   → 유형이 4개뿐인 지금은 840~1270 만 덮는다. 나머지 유형이 붙어야 폭이 넓어진다. */
function pickTypeFor(target, codes, r) {
  const rnd = r || Math.random;
  const list = (codes && codes.length ? codes : Object.keys(TYPES)).filter(c => TYPES[c]);
  if (!list.length) return null;
  const inside = list.filter(c => {
    const g = TYPES[c].range || [TYPES[c].base - 100, TYPES[c].base + 100];
    return target >= g[0] && target <= g[1];
  });
  if (inside.length) return inside[Math.floor(rnd() * inside.length)];
  let best = list[0], bestGap = Infinity;
  for (const c of list) {
    const g = TYPES[c].range || [TYPES[c].base, TYPES[c].base];
    const gap = target < g[0] ? g[0] - target : target - g[1];
    if (gap < bestGap) { bestGap = gap; best = c; }
  }
  return best;
}
/* 커버 가능한 난이도 폭 — 학생 레이팅이 이 밖으로 나가면 문항이 모자란다는 뜻 */
function coverage(codes) {
  const list = (codes && codes.length ? codes : Object.keys(TYPES)).filter(c => TYPES[c]);
  let lo = Infinity, hi = -Infinity;
  list.forEach(c => {
    const g = TYPES[c].range || [TYPES[c].base, TYPES[c].base];
    lo = Math.min(lo, g[0]); hi = Math.max(hi, g[1]);
  });
  return { min: lo, max: hi, types: list.length };
}

/* 출제 정책 — 목표 정답률 70~80% 를 만드는 난이도 구간.
   p = 0.75 가 되려면 문항이 학생 레이팅보다 약 190 낮아야 한다.
   편하게만 풀면 실력이 안 늘고 경험치도 안 붙으므로, 위쪽을 조금 섞는다. */
/* 정답률 75% 가 되는 지점은 '학생 레이팅 −190' 이다.
     p = 1/(1+10^((D−R)/400)) 에서 p=0.75 → D−R = −190
   그래서 조준선의 평균이 −190 이 되도록 분포를 잡는다.
   위쪽(+60)도 가끔 나와야 실력이 늘고 경험치도 붙는다.
     평균 = LOW + (HIGH−LOW)/(POW+1) = −340 + 400/2.667 ≈ −190 */
const AIM_LOW = -340, AIM_HIGH = 60, AIM_POW = 1.667;
function pickTargetDifficulty(rating, r) {
  const rnd = r || Math.random;
  const offset = AIM_LOW + (AIM_HIGH - AIM_LOW) * Math.pow(rnd(), AIM_POW);
  return clampDiff(Number(rating) + offset);
}

/* ─────────────────────────────────────────────────────────
   2단계 · 진단 10문항 — 처음 들어온 학생의 레이팅을 빠르게 잡는다

   왜 필요한가: 모두를 1000 에서 시작시키면, 잘하는 학생은 한동안 너무 쉬운 문제를,
   힘든 학생은 한동안 너무 어려운 문제를 받는다. 30문항을 푸는 내내 그 구간이
   섞여 정답률이 목표(70~80%)를 벗어난다.

   방식: 적응형. 매 문항을 '지금 추정치와 같은 난이도'로 낸다.
   정답률 50% 지점이 정보량이 가장 크기 때문이다. (평소 출제와 반대로 간다)
   K 를 크게 시작해 빠르게 좁히고 점점 줄여 안정시킨다.
   ───────────────────────────────────────────────────────── */
const DIAG_N = 10;
const DIAG_K = [180, 160, 140, 120, 100, 85, 70, 60, 50, 40];
const DIAG_START = 1100;            // 5학년 중간 언저리에서 시작

function newDiagnostic(seed, startRating, codes) {
  return {
    step: 0, n: DIAG_N,
    rating: startRating == null ? DIAG_START : startRating,
    seed: seed == null ? String(Math.random()) : String(seed),
    history: [], usedTypes: [], current: null, done: false,
    codes: Array.isArray(codes) ? codes.filter(c=>TYPES[c]) : Object.keys(TYPES)
  };
}
/* 다음 문항 — 같은 유형이 연달아 나오지 않게 살짝 피한다 */
function diagnosticNext(st) {
  if (st.done || st.step >= st.n) { st.done = true; st.current = null; return null; }
  const r = makeRng(st.seed + ':pick:' + st.step);
  const recent = st.usedTypes.slice(-2);
  const available = Array.isArray(st.codes) ? st.codes : Object.keys(TYPES);
  let codes = available.filter(c => !recent.includes(c));
  if (!codes.length) codes = available;
  if(!codes.length){st.done=true;st.current=null;return null;}
  const code = pickTypeFor(st.rating, codes, r);
  const q = generateQuestion(code, st.rating, st.seed + ':q:' + st.step);
  st.current = q;
  return q;
}
/* 답을 채점하고 추정치를 갱신 */
function diagnosticAnswer(st, correct) {
  if (!st.current || st.done) return st;
  const d = st.current.actualDifficulty;
  const k = DIAG_K[Math.min(DIAG_K.length - 1, st.step)];
  const before = st.rating;
  st.rating = updateRating(st.rating, d, correct, k);
  st.history.push({ step: st.step + 1, code: st.current.typeCode, difficulty: d,
                    correct: !!correct, before, after: st.rating });
  st.usedTypes.push(st.current.typeCode);
  st.step++;
  st.current = null;
  if (st.step >= st.n) st.done = true;
  return st;
}
/* 결과 — 추정 레이팅과 신뢰도.
   맞은 개수가 0 이거나 만점이면 실제 실력이 문항 범위 밖일 수 있어 신뢰도를 낮춘다. */
function diagnosticResult(st) {
  const cov = coverage();
  const correct = st.history.filter(h => h.correct).length;
  const rating = clampDiff(st.rating);
  const extreme = correct === 0 || correct === st.history.length;
  const outOfBand = rating <= cov.min + 40 || rating >= cov.max - 40;
  return {
    rating,
    correct, total: st.history.length,
    confidence: extreme || outOfBand ? 'low' : (st.history.length >= DIAG_N ? 'ok' : 'low'),
    note: extreme ? '전부 맞히거나 전부 틀려서 실제 실력이 문항 범위 밖일 수 있어요.'
        : outOfBand ? '지금 문항이 덮는 난이도의 끝에 있어 더 정확히 재려면 유형이 더 필요해요.'
        : '',
    history: st.history
  };
}
/* 가상 학생으로 진단을 돌려 본다 (검증용) */
function simulateDiagnostic(trueSkill, seed) {
  const st = newDiagnostic(seed);
  const r = makeRng('ds:' + seed);
  while (!st.done) {
    const q = diagnosticNext(st);
    if (!q) break;
    diagnosticAnswer(st, r() < expectedScore(trueSkill, q.actualDifficulty));
  }
  return diagnosticResult(st);
}

/* ─────────────────────────────────────────────────────────
   오답 복습 — 간격 반복
   틀린 문제를 1일 → 3일 → 7일 뒤에 같은 유형·같은 난이도로 다시 낸다.
   세 번 연속 맞히면 목록에서 뺀다. 문항 자체가 아니라 '유형 + 난이도'를
   기억하므로 숫자는 매번 달라진다 (답을 외우는 게 아니라 방법을 익힌다).
   ───────────────────────────────────────────────────────── */
const REVIEW_GAPS = [1, 3, 7];        // 며칠 뒤에 다시 낼지
const REVIEW_MAX  = 40;               // 기록은 최근 40개까지만

function reviewNormalize(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(x => x && TYPES[x.code])
    .map(x => ({
      code: String(x.code),
      d: clampDiff(Number(x.d) || TYPES[x.code].base),
      due: String(x.due || '').slice(0, 10),
      n: Math.max(0, Math.min(REVIEW_GAPS.length, Math.round(Number(x.n) || 0)))
    }))
    .slice(-REVIEW_MAX);
}
const _ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
                + '-' + String(d.getDate()).padStart(2, '0');
function _plusDays(days) { const d = new Date(); d.setDate(d.getDate() + days); return _ymd(d); }

/* 틀렸을 때 — 목록에 넣거나 처음부터 다시 */
function reviewOnWrong(list, typeCode, difficulty) {
  if (!TYPES[typeCode]) return reviewNormalize(list);
  const out = reviewNormalize(list).filter(x => x.code !== typeCode);
  out.push({ code: typeCode, d: clampDiff(difficulty), due: _plusDays(REVIEW_GAPS[0]), n: 0 });
  return out.slice(-REVIEW_MAX);
}
/* 맞혔을 때 — 다음 간격으로 미루고, 끝까지 가면 졸업시킨다 */
function reviewOnRight(list, typeCode) {
  const cur = reviewNormalize(list);
  const i = cur.findIndex(x => x.code === typeCode);
  if (i < 0) return cur;
  const n = cur[i].n + 1;
  if (n >= REVIEW_GAPS.length) { cur.splice(i, 1); return cur; }   // 졸업
  cur[i] = Object.assign({}, cur[i], { n, due: _plusDays(REVIEW_GAPS[n]) });
  return cur;
}
/* 오늘 다시 낼 것이 있으면 하나 꺼낸다 (가장 오래 기다린 것부터) */
function reviewDue(list, todayStr) {
  const today = todayStr || _ymd(new Date());
  const due = reviewNormalize(list).filter(x => x.due && x.due <= today);
  if (!due.length) return null;
  due.sort((a, b) => a.due.localeCompare(b.due));
  return due[0];
}
function reviewCount(list, todayStr) {
  const today = todayStr || _ymd(new Date());
  return reviewNormalize(list).filter(x => x.due && x.due <= today).length;
}

/* ── 검증용 시뮬레이션 ──
   실력이 trueSkill 인 가상 학생이 n문항을 풀었을 때
   ① 정답률이 70~80% 로 수렴하는지 ② 레이팅이 실력에 수렴하는지 본다. */
function simulate(opts) {
  const o = opts || {};
  const trueSkill = o.trueSkill == null ? 1200 : o.trueSkill;
  const n = o.n || 30;
  const codes = o.codes || Object.keys(TYPES);
  const r = makeRng(o.seed == null ? 'sim' : o.seed);
  let rating = o.startRating == null ? 1000 : o.startRating;
  // 진단을 먼저 치르고 시작하면 첫 문항부터 제 수준으로 나온다
  if (o.diagnose) rating = simulateDiagnostic(trueSkill, (o.seed || 's') + ':diag').rating;
  let correctCount = 0, exp = 0;
  const itemDiff = {};                       // 유형별 난이도 보정 상태
  const log = [];

  for (let i = 0; i < n; i++) {
    const target = pickTargetDifficulty(rating, r);
    const code = pickTypeFor(target, codes, r);
    if (!code) break;
    const q = generateQuestion(code, target, 'sim:' + o.seed + ':' + i);
    if (!q) continue;
    const d = itemDiff[q.typeCode] == null ? q.actualDifficulty : itemDiff[q.typeCode];
    // 가상 학생은 실제 실력 대비 확률로 맞힌다
    const pTrue = expectedScore(trueSkill, d);
    const correct = r() < pTrue;
    if (correct) correctCount++;
    exp += expGain(20, rating, d);
    rating = updateRating(rating, d, correct);
    itemDiff[q.typeCode] = updateDifficulty(d, rating, correct);
    log.push({ i: i + 1, code: q.typeCode, d, pTrue: +pTrue.toFixed(2), correct, rating });
  }
  return {
    n, trueSkill,
    finalRating: rating,
    accuracy: +(correctCount / n).toFixed(3),
    correctCount,
    exp,
    ratingError: Math.abs(rating - trueSkill),
    itemDiff, log
  };
}

const API = {
  TYPES, K_STUDENT, K_ITEM,
  expectedScore, updateRating, updateDifficulty, expGain, streakDecay,
  generateQuestion, pickTargetDifficulty, pickTypeFor, coverage, simulate, makeRng,
  DIAG_N, newDiagnostic, diagnosticNext, diagnosticAnswer, diagnosticResult, simulateDiagnostic,
  REVIEW_GAPS, reviewNormalize, reviewOnWrong, reviewOnRight, reviewDue, reviewCount
};
if (typeof module === 'object' && module.exports) module.exports = API;
root.QRATE = API;

})(typeof window !== 'undefined' ? window : globalThis);
