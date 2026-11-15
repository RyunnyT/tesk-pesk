/* ════════ 학습 기록 + 선생님 보고서 (프롬프트 D, 2026-11-15) ════════
   · 기록은 save 와 따로 localStorage "arca-log"(버전 v). 개인정보 없음: 게임 속 별명(save.name)만.
   · 한 문제 = { d 날짜, p 부, u 단원, k 유형(math·eng·read), ok 0/1, t 초, re 다시 만난 문제 0/1, q 문제 글, a 정답 }
   · 최근 300문제는 낱개(recent), 그 이전은 날짜·단원별 합계(agg)로 접는다. 자주 틀린 문제는 miss(최대 60개).
   · 기록 지점: 길 위 전투(askField, 구슬·상자 모두), 문제 상자(quizBox: 첫 수련·풀어 주기 퀘스트), 지문 확인 문제(책).
   · 구조와 Pesk 로 보낼 때의 안내는 docs/학습기록_구조.md */
const LOG_KEY = "arca-log",
  LOG_V = 1,
  LOG_KEEP = 300;
const LOG = (() => {
  const d = { v: LOG_V, recent: [], agg: {}, miss: {} };
  try {
    const o = JSON.parse(localStorage.getItem(LOG_KEY) || "null");
    if (o && o.v === LOG_V) return Object.assign(d, o);
  } catch (e) {}
  return d;
})();
function logSave() {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(LOG));
  } catch (e) {}
}
const logDay = (t) => {
  const z = new Date(t || Date.now());
  return z.getFullYear() + "-" + String(z.getMonth() + 1).padStart(2, "0") + "-" + String(z.getDate()).padStart(2, "0");
};
// 한 문제 기록
function logAdd(r) {
  const e = {
    d: logDay(),
    p: typeof mapPart === "function" ? mapPart() : 0,
    u: String(r.u || "기타").slice(0, 40),
    k: r.k || "math",
    ok: r.ok ? 1 : 0,
    t: Math.max(0, Math.min(600, Math.round(r.t || 0))),
    re: r.re ? 1 : 0,
    q: String(r.q || "").slice(0, 200),
    a: String(r.a == null ? "" : r.a).slice(0, 40),
  };
  LOG.recent.push(e);
  // 오래된 것은 날짜·단원별 합계로 접기
  while (LOG.recent.length > LOG_KEEP) {
    const o = LOG.recent.shift(),
      key = o.d + "|" + o.k + "|" + o.u,
      g = LOG.agg[key] || (LOG.agg[key] = { d: o.d, p: o.p, u: o.u, k: o.k, n: 0, ok: 0, t: 0, re: 0 });
    g.n++;
    g.ok += o.ok;
    g.t += o.t;
    g.re += o.re;
  }
  // 자주 틀린 문제(문제 글 기준), 다시 맞히면 '되찾음' 표시
  if (e.q) {
    const m = LOG.miss[e.q];
    if (!e.ok) LOG.miss[e.q] = { a: e.a, u: e.u, n: (m ? m.n : 0) + 1, last: e.d, fix: 0 };
    else if (m) m.fix = 1;
    const ks = Object.keys(LOG.miss);
    if (ks.length > 60) {
      ks.sort((x, y) => LOG.miss[x].n - LOG.miss[y].n || (LOG.miss[x].last < LOG.miss[y].last ? -1 : 1));
      ks.slice(0, ks.length - 60).forEach((k) => delete LOG.miss[k]);
    }
  }
  logSave();
  return e;
}
const logKind = (Q) => (Q && Q.unit === "영어 단어" ? "eng" : "math");

/* ── 기록 지점 ── */
{
  // 1) 길 위 전투(가장 바깥에서 감싸 구슬·상자·숫자 판 모두)
  const afL = askField;
  askField = function (MI, title, cb) {
    const t0 = Date.now();
    afL(MI, title, (ok) => {
      const Q = RQ.last || {};
      const tA = typeof LEARN === "object" && LEARN.ansT > t0 ? LEARN.ansT : Date.now();
      logAdd({ u: Q.unit, k: logKind(Q), ok, t: (tA - t0) / 1000, re: Q.re, q: Q.q, a: Q.a });
      cb(ok);
    });
  };
  // 2) 문제 상자(첫 수련·풀어 주기 퀘스트): 처음 고른 답만 센다
  const qbL = quizBox;
  quizBox = function (title, dif, ok, bad) {
    const t0 = Date.now();
    let done = false,
      Q = null;
    const rec = (v) => {
      if (done || !Q) return;
      done = true;
      logAdd({ u: Q.unit, k: logKind(Q), ok: v, t: (Date.now() - t0) / 1000, re: Q.re, q: Q.q, a: Q.a });
    };
    qbL(
      title,
      dif,
      () => {
        rec(1);
        ok();
      },
      () => {
        rec(0);
        bad();
      },
    );
    Q = RQ.last;
  };
  // 3) 지문 확인 문제: 문제마다 처음 고른 답만
  let bkT = 0,
    bkKey = "";
  $("book").addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("button");
      if (!b || !bk || b.dataset.ans == null || !bk.s || !bk.s.q) return;
      const qq = bk.s.q[bk.qi];
      if (!qq) return;
      const key = (bk.s.t || "") + "#" + bk.qi;
      if (key === bkKey) return;
      bkKey = key;
      logAdd({ u: "지문 · " + (bk.s.t || "읽기"), k: "read", ok: +b.dataset.ans === qq[2], t: bkT ? (Date.now() - bkT) / 1000 : 0, q: qq[0], a: qq[1][qq[2]] });
      bkT = Date.now();
    },
    true,
  );
  const rb0 = renderBook;
  renderBook = function () {
    rb0();
    if (bk && bk.stage === "q") bkT = bkT || Date.now();
    else {
      bkT = 0;
      bkKey = ""; // 다시 열면 다시 센다
    }
  };
}

/* ── 보고서용 계산(학급 모아 보기 teacher.html 도 같은 계산을 씀) ── */
function logRows(L) {
  // 낱개 + 합계를 한 모양으로
  const rows = Object.values(L.agg || {}).map((g) => ({ ...g }));
  (L.recent || []).forEach((e) => rows.push({ d: e.d, p: e.p, u: e.u, k: e.k, n: 1, ok: e.ok, t: e.t, re: e.re }));
  return rows;
}
function logSummary(L) {
  const rows = logRows(L),
    sum = (f) => rows.reduce((a, r) => a + f(r), 0),
    n = sum((r) => r.n),
    ok = sum((r) => r.ok),
    days = [...new Set(rows.map((r) => r.d))].sort(),
    units = {};
  rows.forEach((r) => {
    const u = units[r.u] || (units[r.u] = { u: r.u, k: r.k, p: r.p, n: 0, ok: 0, t: 0 });
    u.n += r.n;
    u.ok += r.ok;
    u.t += r.t;
    u.p = Math.min(u.p || 99, r.p || 99);
  });
  // 최근 7일
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = logDay(Date.now() - i * 864e5),
      rs = rows.filter((r) => r.d === d);
    week.push({ d, n: rs.reduce((a, r) => a + r.n, 0), ok: rs.reduce((a, r) => a + r.ok, 0) });
  }
  const miss = Object.entries(L.miss || {})
    .filter(([, m]) => !m.fix)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 5)
    .map(([q, m]) => ({ q, ...m }));
  return { n, ok, rate: n ? Math.round((ok / n) * 100) : 0, days: days.length, first: days[0] || "", last: days[days.length - 1] || "", week, units: Object.values(units).sort((a, b) => (a.p || 0) - (b.p || 0) || b.n - a.n), miss };
}
function logProgress() {
  const towns = (typeof PARTTOWN !== "undefined" ? PARTTOWN : []).filter((_, k) => partDone(k)).length;
  return { part: Math.min(12, curPart() + 1), towns, lv: save.lv, solved: save.solved || 0, recov: (save.st && save.st.recov) || 0, bestCombo: (save.st && save.st.bestCombo) || 0, job: save.job || "",
    // 단원 마무리 도장(부 번호 목록)·들은 수업 수·찍기 보호막 횟수(src/24-learn.js·26-lesson.js)
    caps: Object.keys((save.st && save.st.cap) || {}).map(Number), lessons: Object.keys((save.st && save.st.les) || {}).length, fast: (save.st && save.st.fastN) || 0 };
}
// 내보내기 묶음(이름 없음, 게임 속 별명만)
function logExport() {
  return { app: "arca", v: LOG_V, nick: save.name || "견습생", at: new Date().toISOString(), grade: studyCfg.grade, progress: logProgress(), log: LOG };
}
function logCSV() {
  const H = ["날짜", "부", "단원", "유형", "문제수", "맞음", "정답률", "평균초", "다시만난문제"],
    q = (s) => '"' + String(s).replace(/"/g, '""') + '"',
    rows = {};
  logRows(LOG).forEach((r) => {
    const k = r.d + "|" + r.k + "|" + r.u,
      g = rows[k] || (rows[k] = { ...r, n: 0, ok: 0, t: 0, re: 0 });
    g.n += r.n;
    g.ok += r.ok;
    g.t += r.t;
    g.re += r.re;
  });
  const K = { math: "수학", eng: "영어", read: "지문" };
  return (
    "﻿" +
    [H.join(",")]
      .concat(
        Object.values(rows)
          .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.p - b.p))
          .map((r) => [r.d, r.p, q(r.u), K[r.k] || r.k, r.n, r.ok, Math.round((r.ok / r.n) * 100) + "%", (r.t / r.n).toFixed(1), r.re].join(",")),
      )
      .join("\n")
  );
}

/* ── 보고서 화면 ── */
{
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "reportb";
  btn.textContent = "학습 보고서";
  $("studyb").after(btn);
  const el = document.createElement("div");
  el.className = "report";
  el.id = "report";
  el.hidden = true;
  $("study").after(el);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const K = { math: "수학", eng: "영어", read: "지문" };
  window.reportRender = function () {
    const S = logSummary(LOG),
      P = logProgress(),
      mx = Math.max(1, ...S.week.map((w) => w.n));
    const low = (r) => r.n >= 5 && pct(r.ok, r.n) < 60;
    el.innerHTML =
      '<button class="cx rpx" type="button" data-r="close" aria-label="닫기">×</button><div class="rph"><b>학습 보고서 · ' + esc(save.name || "견습생") + "</b><small>이 기기에 저장된 기록이에요(이름 대신 게임 속 별명)</small></div>" +
      '<div class="rpsum">' +
      [
        ["푼 문제", S.n + "개"],
        ["정답률", S.rate + "%"],
        ["공부한 날", S.days + "일"],
        ["지금 진도", P.part + "부 · 마을 " + P.towns + "/12 · Lv " + P.lv],
        ["되찾은 기억", P.recov + "개"],
        ["마무리 도장 · 수업", "★ " + P.caps.length + "/12 · " + P.lessons + "개"],
      ]
        .map((a) => "<div><small>" + a[0] + "</small><b>" + a[1] + "</b></div>")
        .join("") +
      "</div>" +
      '<h4>최근 7일</h4><div class="rpweek" role="img" aria-label="최근 7일 푼 문제 수">' +
      S.week
        .map((w) => '<div><i style="height:' + Math.round((w.n / mx) * 100) + '%"></i><b>' + w.n + "</b><small>" + w.d.slice(5).replace("-", "/") + "</small></div>")
        .join("") +
      "</div>" +
      '<h4>단원별</h4><table class="rpt"><thead><tr><th>부</th><th>단원</th><th>문제</th><th>정답률</th><th>평균 시간</th></tr></thead><tbody>' +
      (S.units.length
        ? S.units
            .map(
              (u) =>
                '<tr class="' + (low(u) ? "low" : "") + '"><td>' + (u.p || "-") + "</td><td>" + esc(u.u) + (u.k !== "math" ? " <small>(" + K[u.k] + ")</small>" : "") + "</td><td>" + u.n + "</td><td>" +
                (low(u) ? "▼ " : "") + pct(u.ok, u.n) + "%</td><td>" + (u.t / u.n).toFixed(1) + "초</td></tr>",
            )
            .join("")
        : '<tr><td colspan="5">아직 기록이 없어요</td></tr>') +
      "</tbody></table><p class=\"rpnote\">▼ = 5문제 이상 풀었는데 정답률 60% 아래인 단원</p>" +
      "<h4>자주 틀리는 문제</h4>" +
      (S.miss.length
        ? '<ol class="rpmiss">' + S.miss.map((m) => "<li>" + esc(String(m.q).replace(/^계산해 보세요\.\s*/, "")) + " <small>→ 정답 " + esc(m.a) + " · 틀린 횟수 " + m.n + " · " + esc(m.u) + "</small></li>").join("") + "</ol>"
        : '<p class="rpnote">아직 없어요</p>') +
      '<div class="rpbtn"><button type="button" data-r="json">기록 내보내기(JSON)</button><button type="button" data-r="csv">표로 내보내기(CSV)</button><button type="button" data-r="text">글로 보기·복사</button></div>' +
      '<div class="rpout" id="rpout" hidden><textarea id="rpta" readonly rows="6" aria-label="내보낸 기록"></textarea><button type="button" data-r="copy">복사</button><small id="rpmsg"></small></div>' +
      '<p class="rpnote">여러 학생의 JSON 파일을 모아 보려면 <b>teacher.html</b>(학급 모아 보기)을 열어 파일을 끌어다 놓아요.</p>';
  };
  // 파일 저장: 아티팩트(틀 안)에서는 막히니 글 상자로
  const inFrame = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();
  const fname = (ext) => "arca-" + (save.name || "student").replace(/[^\w가-힣]/g, "") + "-" + logDay() + "." + ext;
  const showText = (txt, msg) => {
    $("rpout").hidden = false;
    $("rpta").value = txt;
    $("rpmsg").textContent = msg || "";
  };
  const download = (txt, ext, type) => {
    if (inFrame) return showText(txt, "이 화면에서는 파일 저장이 막혀 있어요. 복사해서 메모장에 붙여 넣고 ." + ext + " 로 저장해요.");
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([txt], { type }));
      a.download = fname(ext);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
      showText(txt, fname(ext) + " 로 저장했어요.");
    } catch (e) {
      showText(txt, "파일 저장이 안 돼요. 복사해서 써요.");
    }
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-r]");
    if (!b) return;
    const r = b.dataset.r;
    if (r === "close") el.hidden = true;
    else if (r === "json") download(JSON.stringify(logExport()), "json", "application/json");
    else if (r === "csv") download(logCSV(), "csv", "text/csv");
    else if (r === "text") showText(JSON.stringify(logExport()), "아래 글을 복사해 선생님께 보내요(teacher.html 에 붙여 넣을 수 있어요).");
    else if (r === "copy") {
      const ta = $("rpta");
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {}
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => ($("rpmsg").textContent = "복사했어요."), () => {});
      $("rpmsg").textContent = ok ? "복사했어요." : "글을 길게 눌러 복사해요.";
    }
  });
  const openR = (v) => {
    el.hidden = !v;
    if (!v) return;
    const st = $("study");
    // 휴대폰(선생님 설정이 게임 위에 떠 있을 때)은 보고서도 게임 위에
    if (st.classList.contains("over") || (typeof MOBILE !== "undefined" && MOBILE)) {
      el.classList.add("over");
      $("stage").appendChild(el);
    }
    st.hidden = true;
    reportRender();
    if (!el.classList.contains("over") && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth" });
  };
  btn.onclick = () => openR(el.hidden);
  // 선생님 설정 안에서도 열 수 있게(휴대폰은 메뉴 → 선생님 설정 → 학습 보고서)
  const b2 = document.createElement("button");
  b2.type = "button";
  b2.className = "rpopen";
  b2.textContent = "📊 학습 보고서 보기";
  b2.onclick = () => openR(true);
  $("study").querySelector(".snote").before(b2);
  // 설정을 열면 보고서는 닫기(겹치지 않게)
  $("studyb").addEventListener("click", () => (el.hidden = true));
}
