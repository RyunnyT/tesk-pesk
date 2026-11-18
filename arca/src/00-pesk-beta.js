/* ════════ Pesk 안 체험판(베타) 연결 (2026-11-17 선생님 요청) ════════
   Pesk 학생 앱의 「🧪 아르카(베타)」 메뉴가 arca.html?p=<학급>-<번호>&g=<학년> 으로 연다(Pesk 의 ⚔️ 모험과는 따로).
   · p(학생 칸): 학교 태블릿을 여러 학생이 같이 써도 저장이 섞이지 않게, "arca…" 로 시작하는 저장 이름 뒤에 "@p" 를 붙인다
     (게임 저장 arca-v2·학습 기록 arca-log·설정 arca-study·화면 arca-ui 모두). 진행·기록은 그 기기에만 저장(서버 저장은 체험 뒤).
   · g(학년): Pesk 학급의 문제 학년(3~6)을 선생님 설정 학년으로 넣는다.
   · Pesk 안에서는 제목·설명·「처음부터」·「선생님 설정」 단추를 숨긴다(학생이 학년·저장을 바꾸지 않게).
   이 파일은 다른 모든 파일보다 먼저 불러온다(저장을 읽기 전에 이름을 바꿔야 하므로). 주소에 p 가 없으면 아무것도 안 한다. */
const ARCA_BETA = (() => {
  let q;
  try {
    q = new URLSearchParams(location.search);
  } catch (e) {
    q = new URLSearchParams("");
  }
  const p = (q.get("p") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60),
    g = Number(q.get("g"));
  return { p, g: [3, 4, 5, 6].includes(g) ? g : 0, on: !!p };
})();
if (ARCA_BETA.on) {
  const S = Storage.prototype,
    gi = S.getItem,
    si = S.setItem,
    ri = S.removeItem,
    nk = (key) => (typeof key === "string" && key.startsWith("arca") ? key + "@" + ARCA_BETA.p : key);
  S.getItem = function (key) {
    return gi.call(this, nk(key));
  };
  S.setItem = function (key, v) {
    return si.call(this, nk(key), v);
  };
  S.removeItem = function (key) {
    return ri.call(this, nk(key));
  };
  // Pesk 학급 학년을 선생님 설정에 넣기(처음 한 번이 아니라 열 때마다 — 선생님이 Pesk 에서 학년을 바꾸면 따라감)
  if (ARCA_BETA.g) {
    try {
      const c = JSON.parse(localStorage.getItem("arca-study") || "{}");
      if (c.grade !== ARCA_BETA.g) {
        c.grade = ARCA_BETA.g;
        localStorage.setItem("arca-study", JSON.stringify(c));
      }
    } catch (e) {}
  }
  // Pesk 로 돌아갈 때(창을 닫거나 틀이 사라질 때) 한 번 더 저장
  window.arcaSaveNow = () => {
    try {
      if (typeof store === "function") store();
    } catch (e) {}
  };
  addEventListener("pagehide", () => window.arcaSaveNow());
  document.documentElement.classList.add("arca-beta");
  const st = document.createElement("style");
  st.textContent =
    ".arca-beta .wrap>h1,.arca-beta .lead,.arca-beta #reset,.arca-beta #studyb,.arca-beta #study{display:none!important}" +
    ".arca-beta .wrap{padding-top:6px}";
  document.head.appendChild(st);
}
