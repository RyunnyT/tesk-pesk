/* 공부 연결
   · 선생님 설정(학년·지문 수준·문제 범위)은 localStorage "arca-study" 에 저장한다.
   · 문제: 상위 폴더의 quiz-bank.js(Pesk 와 같은 문제 은행). N부 = 그 학기 N단원(7~12부는 2학기 1~6단원).
     길목 단계(dif 1~5)를 문제 은행 난이도(tier 1~3)로 바꾼다. 은행이 없으면 makeQ 의 임시 문제를 쓴다.
   · 지문: data/passages.js(지문 은행 225편). 이야기 전용 지문(본문이 이미 있거나 main 인 자리)은 건드리지 않고,
     나머지 빈자리를 부마다 어울리는 지문부터 채운다. */
const STUDY_KEY = "arca-study";
const studyCfg = (() => {
  const d = { grade: 5, level: "auto", scope: "part" };
  try {
    return Object.assign(d, JSON.parse(localStorage.getItem(STUDY_KEY) || "{}"));
  } catch (e) {
    return d;
  }
})();
function studySave() {
  try {
    localStorage.setItem(STUDY_KEY, JSON.stringify(studyCfg));
  } catch (e) {}
}
function studyLevel() {
  return studyCfg.level === "adv" ? "심화" : studyCfg.grade <= 4 ? "34" : "56";
}

/* 맵 → 부. 마을 tk 와 그 뒤 길목·막다른 길은 k부. */
const MAP_PART = { home: 1 };
{
  let part = 1;
  CHAIN.forEach((id) => {
    const i = PARTTOWN.indexOf(id);
    if (i >= 0) part = i + 1;
    MAP_PART[id] = part;
    if (DEADS[id]) MAP_PART[DEADS[id]] = part;
  });
}
function mapPart() {
  return (M && MAP_PART[M.id]) || 1;
}
function partUnit(part) {
  return { term: part <= 6 ? 1 : 2, unit: ((part - 1) % 6) + 1 };
}

/* 단원 문제 한 개. makeQ 와 같은 모양 {q, a, ch} 로 돌려준다. */
function studyQ(d) {
  if (!window.QUIZ) return null;
  const { term, unit } = partUnit(mapPart());
  const units = QUIZ.unitsOf(studyCfg.grade, term);
  if (!units.length) return null;
  let nos = null;
  if (studyCfg.scope !== "term") {
    // 문제 은행에 아직 없는 단원이면 그 앞 단원들로 복습한다
    nos = units.some((u) => u.no === unit) ? [unit] : units.filter((u) => u.no < unit).map((u) => u.no);
    if (!nos.length) nos = null;
  }
  const tier = d <= 2 ? 1 : d === 3 ? 2 : 3;
  const q = QUIZ.makeQuestion({
    grade: studyCfg.grade,
    term,
    unitNos: nos,
    tier,
    contextMode: "plain",
    responseMode: "choice",
  });
  if (!q || !Array.isArray(q.options)) return null;
  const a = String(q.answer);
  const wrong = [...new Set(q.options.map(String))].filter((v) => v !== a);
  if (wrong.length < 2) return null;
  const pickW = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
  return { q: q.q, a, ch: [a, ...pickW].sort(() => Math.random() - 0.5), unit: q.unit };
}

/* 부마다 먼저 넣을 지문 (전체 줄거리 문서의 서브 퀘스트 지문). 고른 수준에 없는 제목은 건너뛴다. */
const PART_PICKS = {
  1: ["방위로 길을 찾아요", "지도의 약속, 기호와 범례", "땅 이름에 숨은 이야기", "우리 땅, 우리 바다, 우리 하늘"],
  2: ["생산과 소비", "사과가 우리 집에 오기까지", "바다가 숨 쉬는 땅, 갯벌", "나라와 나라가 주고받는 무역"],
  3: ["촌락과 도시", "날씨에 맞춘 옷과 음식과 집", "숲은 무슨 일을 할까", "한 그루 나무를 심는 마음", "사람들은 어디에 모여 살까"],
  4: ["교통수단은 어떻게 바뀌었을까", "그림자로 시각을 알려 준 앙부일구", "비의 양을 잰 측우기", "우리나라 산업은 어떻게 바뀌었을까", "세종 시대의 과학 기술"],
  5: ["모두를 위해 일하는 공공기관", "옛날 학교, 서당", "다수결과 소수 의견 존중", "법은 왜 필요할까"],
  6: ["여름을 맞는 명절, 단오", "조상의 숨결, 문화유산", "누구나 누려야 할 권리, 인권"],
};
function bankQs(x, bank, k) {
  const out = [];
  if (x.g && x.g.length) {
    const [term, mean] = x.g[0];
    const others = [];
    for (let j = 1; others.length < 2 && j < bank.length; j++) {
      const y = bank[(k + j * 7) % bank.length];
      if (y !== x && y.g && y.g[0] && y.g[0][1] !== mean && !others.includes(y.g[0][1])) others.push(y.g[0][1]);
    }
    if (others.length === 2) {
      const r = k % 3,
        ch = [others[0], others[1]];
      ch.splice(r, 0, mean);
      out.push(["‘" + term + "’의 뜻으로 알맞은 것은?", ch, r]);
    }
  }
  if (x.q && x.q[1]) out.push([x.q[0], x.q[1], x.q[2] - 1]);
  return out;
}
function fillPassages() {
  const bank = (window.ARCA_BANK || {})[studyLevel()];
  if (!bank || !bank.length) return;
  const byTitle = {},
    picked = new Set();
  bank.forEach((x) => (byTitle[x.t] = x));
  Object.values(PART_PICKS).forEach((l) => l.forEach((t) => byTitle[t] && picked.add(byTitle[t])));
  // 나머지는 분야를 돌아가며 섞는다
  const bySub = {};
  bank.forEach((x) => picked.has(x) || (bySub[x.s] = bySub[x.s] || []).push(x));
  const pool = [];
  for (let i = 0, more = true; more; i++) {
    more = false;
    for (const s in bySub)
      if (bySub[s][i]) {
        pool.push(bySub[s][i]);
        more = true;
      }
  }
  const order = [];
  CHAIN.forEach((id) => {
    order.push(id);
    if (DEADS[id]) order.push(DEADS[id]);
  });
  const used = new Set();
  order.forEach((id) => {
    const part = MAP_PART[id] || 1,
      picks = (PART_PICKS[part] || []).map((t) => byTitle[t]).filter(Boolean);
    MAPS[id].spots.forEach((s) => {
      if (s.fromBank === undefined) s.fromBank = !s.p && !s.main;
      if (!s.fromBank) return;
      let x = picks.find((y) => !used.has(y)) || pool.find((y) => !used.has(y));
      if (!x) return;
      used.add(x);
      s.t = x.t;
      s.p = x.p;
      s.q = bankQs(x, bank, bank.indexOf(x));
      s.src = x.id;
    });
  });
}
fillPassages();

/* 선생님 설정 창 */
function studyInfo() {
  const g = studyCfg.grade,
    rows = [];
  for (let part = 1; part <= 12; part++) {
    const { term, unit } = partUnit(part),
      units = window.QUIZ ? QUIZ.unitsOf(g, term) : [],
      u = units.find((x) => x.no === unit);
    rows.push(
      "<tr><td>" + part + "부</td><td>" + g + "-" + term + " " + unit + "단원</td><td>" +
        (u ? u.name : units.length ? "<i>문제 준비 중 → 앞 단원 복습</i>" : "<i>문제 은행 없음</i>") +
        "</td></tr>",
    );
  }
  return rows.join("");
}
function studyRender() {
  const el = document.getElementById("study");
  if (!el) return;
  el.querySelector("#sg").value = String(studyCfg.grade);
  el.querySelector("#sl").value = studyCfg.level;
  el.querySelector("#ss").value = studyCfg.scope;
  el.querySelector("#st").innerHTML = studyInfo();
  el.querySelector("#sw").textContent = window.QUIZ
    ? ""
    : "문제 은행(quiz-bank.js)을 찾지 못해 임시 계산 문제가 나와요. 저장소 최상위에서 열어 주세요.";
}
{
  const el = document.getElementById("study"),
    btn = document.getElementById("studyb");
  if (el && btn) {
    btn.onclick = () => {
      el.hidden = !el.hidden;
      studyRender();
    };
    el.addEventListener("change", () => {
      const lvBefore = studyLevel();
      studyCfg.grade = +el.querySelector("#sg").value;
      studyCfg.level = el.querySelector("#sl").value;
      studyCfg.scope = el.querySelector("#ss").value;
      studySave();
      if (studyLevel() !== lvBefore) fillPassages();
      studyRender();
    });
    studyRender();
  }
}
