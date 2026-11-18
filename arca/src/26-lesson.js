/* ════════ 스승의 짧은 수업 · 배움 수첩 · 실력 맞춤 · 단원 마무리 (프롬프트 L·M, 2026-11-15, 선생님 확인) ════════
   L) 각 부의 마을에 처음 들어가면(직업을 얻은 뒤) 내 스승이 짧은 수업을 권한다: ① 보여 주기(예시를 한 단계씩) → ② 같이 하기(틀리면 바로 힌트, 벌 없음)
      → ③ 혼자 하기 2문제. 「이미 알아요」로 건너뛸 수 있고, 건너뛴 뒤 처음 5문제에서 2개 이상 틀리면 한 번 다시 권한다.
      들은 수업은 배움 수첩(패널 [공부] → 배움 수첩, 마이룸 책장)에 모인다. 전투 중 「?」 단추 = 그 단원 핵심 한 줄(답은 안 알려 줌).
      수업 내용은 data/lessons.js(단원 이름 낱말로 고름). 수업 뒤 처음 5문제는 쉬운 단계.
   M) 실력 맞춤: 그 단원 최근 10문제(처음 답) 정답률이 80%↑ 면 한 단계 위, 50%↓ 면 한 단계 아래 + 보기 하나 지워 주기. 5문제마다 다시 계산.
      선생님 설정 '난이도: 자동/길목대로'(studyCfg.adapt). 단원 마무리 5문제: 그 부 마을을 모두 되살리면 권한다(쉬움 2·보통 2·어려움 1).
      4개 이상 → ★ 도장(save.st.cap[부]), 아니면 수업 다시 보기를 권하고 언제든 다시 도전. 진행은 막지 않는다.
   · 자동으로 권하는 것은 자동 검사(navigator.webdriver)에서는 꺼 둔다. 검사에서는 LESSON.auto = true 로 켠다. */
const LESSON = { auto: !navigator.webdriver, on: false, pending: null, cnt: {} };
const lsSt = () => {
  const s = save.st || (save.st = {});
  s.les = s.les || {};
  s.lesSkip = s.lesSkip || {};
  s.cap = s.cap || {};
  s.capAsk = s.capAsk || {};
  s.adapt = s.adapt || {};
  return s;
};
function lessonFor(unit) {
  if (!unit || typeof LESSONS === "undefined") return null;
  return LESSONS.find((L) => L.k.some((w) => unit.includes(w))) || null;
}
const lsUnit = (part) => (typeof unitName === "function" && studyCfg.subj !== "eng" ? unitName(part || mapPart()) : null);
// 그 부 단원의 문제 하나(tier 1~3). 문제 은행에 그 단원이 없으면 보통 문제
function lsQ(part, tier) {
  try {
    const { term, unit } = partUnit(part),
      ok = QUIZ.unitsOf(studyCfg.grade, term).some((u) => u.no === unit);
    if (ok) {
      const q = learnSimilar({ g: studyCfg.grade, t: term, no: unit, tier }, null, null);
      if (q) return q;
    }
  } catch (e) {}
  const q = studyQ(tier === 1 ? 1 : tier === 2 ? 3 : 4);
  return q || { q: "계산해 보세요.\n3 + 4", a: "7", ch: ["7", "8", "6"], unit: "", ex: "" };
}

/* ── 화면 ── */
const lsEl = document.createElement("div");
lsEl.className = "box lesson";
lsEl.id = "lesson";
lsEl.hidden = true;
$("stage").appendChild(lsEl);
function lsClose() {
  lsEl.hidden = true;
  LESSON.on = false;
  busy = false;
  document.body.classList.remove("lessoning");
  store();
  hud();
  $("stage").focus();
}
function lsOpenBox(html) {
  lsEl.innerHTML = html;
  lsEl.hidden = false;
  LESSON.on = true;
  busy = true;
  document.body.classList.add("lessoning");
  const b = lsEl.querySelector("button.lsmain") || lsEl.querySelector("button");
  if (b) b.focus();
}
const lsMentor = () => {
  try {
    return (D[MENTOR_OF[save.job || "knight"]] || {}).n || "스승";
  } catch (e) {
    return "스승";
  }
};
const lsHead = (t, sub) => '<div class="lsh"><b>' + esc(t) + "</b><small>" + esc(sub || "") + "</small></div>";
// 보기 단추들. onPick(값, 단추)
function lsChoices(Q, onPick) {
  const wrap = lsEl.querySelector(".lsch");
  wrap.innerHTML = Q.ch.map((v, i) => '<button type="button" data-v="' + esc(v) + '"><i>' + (i + 1) + "</i>" + esc(v) + "</button>").join("");
  wrap.onclick = (e) => {
    const b = e.target.closest("button[data-v]");
    if (b && !b.disabled) onPick(b.dataset.v, b);
  };
  const f = wrap.querySelector("button");
  if (f) f.focus();
}
const lsSol = (Q) => {
  const st = typeof stepSolve === "function" ? stepSolve(Q) : null;
  return (st ? '<span class="lnstep"><i>이렇게 풀어요</i>' + esc(st) + "</span>" : "") + (Q.ex ? '<span class="lnrule"><i>기억해요</i>' + esc(Q.ex) + "</span>" : "");
};

/* ── 수업: 권하기 → 보여 주기 → 같이 하기 → 혼자 하기 ── */
function lessonOffer(L, part, again) {
  lsOpenBox(
    lsHead(lsMentor() + "의 짧은 수업", part + "부 · " + (lsUnit(part) || "")) +
      '<p class="lsp">' + (again ? "조금 헷갈리나 보구나. 같이 한 번 짚어 볼까?" : "새 단원이구나. 길을 나서기 전에 " + esc(jo("「" + L.title + "」", "을", "를")) + " 잠깐 배워 볼까? (2~3분)") + "</p>" +
      '<div class="lsrow"><button type="button" class="lsmain" data-l="go">수업 듣기</button><button type="button" data-l="skip">이미 알아요</button></div>',
  );
  lsEl.onclick = (e) => {
    const b = e.target.closest("button[data-l]");
    if (!b) return;
    lsEl.onclick = null;
    if (b.dataset.l === "go") return lessonRun(L, part);
    const st = lsSt();
    st.lesSkip[L.key] = (st.lesSkip[L.key] || 0) + 1;
    st.lesEase = { key: L.key, n: 5 };
    lsClose();
    toast("배움 수첩(책장)에서 언제든 수업을 들을 수 있어요");
  };
}
function lessonRun(L, part, review) {
  let i = 0;
  const unit = lsUnit(part) || L.title;
  const show = () => {
    lsOpenBox(
      lsHead("① 보여 줄게 · " + L.title, lsMentor()) +
        (L.fig ? L.fig() : "") +
        '<ol class="lsshow">' + L.show.slice(0, i + 1).map((t, k) => '<li class="' + (k === i ? "now" : "") + '">' + esc(t) + "</li>").join("") + "</ol>" +
        '<div class="lsrow"><button type="button" class="lsmain" data-l="next">' + (i < L.show.length - 1 ? "다음 ▶" : "같이 해 보기 ▶") + "</button></div>",
    );
    if (typeof speak === "function") speak(L.show[i]);
    lsEl.onclick = (e) => {
      if (!e.target.closest('button[data-l="next"]')) return;
      if (++i < L.show.length) show();
      else together();
    };
  };
  const together = () => {
    const Q = lsQ(part, 1);
    let miss = 0;
    lsOpenBox(
      lsHead("② 같이 해 보자", unit) +
        '<p class="lsq">' + esc(Q.q) + '</p><p class="lstip">힌트: ' + esc(L.tip || L.core) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div>',
    );
    lsEl.onclick = null;
    lsChoices(Q, (v, b) => {
      if (v === String(Q.a)) {
        sfx("ok");
        $("lsfb").innerHTML = '<span class="lsok">맞았어! 잘했어.</span><div class="lsrow"><button type="button" class="lsmain" id="lsn">혼자 해 보기 ▶</button></div>';
        lsEl.querySelectorAll(".lsch button").forEach((x) => (x.disabled = true));
        $("lsn").focus();
        $("lsn").onclick = () => solo(0, 0);
        return;
      }
      b.disabled = true;
      miss++;
      sfx("bad");
      $("lsfb").innerHTML = '<span class="lsno">괜찮아, 다시 보자.</span>' + (miss >= 2 ? lsSol(Q) : '<span class="lnrule"><i>기억해요</i>' + esc(L.core) + "</span>");
    });
  };
  const solo = (n, ok) => {
    if (n >= 2) return finish(ok);
    const Q = lsQ(part, n ? 2 : 1);
    lsOpenBox(lsHead("③ 혼자 해 보기 " + (n + 1) + "/2", unit) + '<p class="lsq">' + esc(Q.q) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div>');
    lsEl.onclick = null;
    lsChoices(Q, (v) => {
      const right = v === String(Q.a);
      lsEl.querySelectorAll(".lsch button").forEach((x) => {
        x.disabled = true;
        if (x.dataset.v === String(Q.a)) x.classList.add("ans");
      });
      sfx(right ? "ok" : "bad");
      $("lsfb").innerHTML =
        (right ? '<span class="lsok">정답!</span>' : '<span class="lsno">아쉬워요. 정답은 <b>' + esc(Q.a) + "</b></span>" + lsSol(Q)) +
        '<div class="lsrow"><button type="button" class="lsmain" id="lsn">' + (n ? "수업 마치기" : "다음 ▶") + "</button></div>";
      $("lsn").focus();
      $("lsn").onclick = () => solo(n + 1, ok + (right ? 1 : 0));
    });
  };
  const finish = (ok) => {
    const st = lsSt(),
      first = !st.les[L.key];
    st.les[L.key] = 1;
    st.lesEase = { key: L.key, n: 5 };
    if (first) save.dust += 2;
    sfx("quest");
    lsOpenBox(
      lsHead("수업 끝!", lsMentor()) +
        '<p class="lsp">' + (ok >= 2 ? "훌륭해! 이제 길목에서 써 보자." : "잘 따라왔어. 헷갈리면 배움 수첩을 펴 보렴.") + '</p><p class="lscore">' + esc(L.core) + "</p>" +
        '<p class="lsp small">배움 수첩에 ' + esc(jo("「" + L.title + "」", "을", "를")) + " 적었어요" + (first ? " · 별빛 가루 +2" : "") + '</p><div class="lsrow"><button type="button" class="lsmain" data-l="x">닫기</button></div>',
    );
    lsEl.onclick = (e) => e.target.closest('button[data-l="x"]') && ((lsEl.onclick = null), lsClose(), review && openPanel("note"));
  };
  show();
}

/* ── 단원 마무리 5문제 ── */
function capRun(part) {
  const tiers = [1, 1, 2, 2, 3],
    unit = lsUnit(part) || "";
  let n = 0,
    ok = 0;
  const ask = () => {
    if (n >= 5) return end();
    const Q = lsQ(part, tiers[n]);
    lsOpenBox(lsHead("단원 마무리 " + (n + 1) + "/5", part + "부 · " + unit) + '<p class="lsq">' + esc(Q.q) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div>');
    lsEl.onclick = null;
    const t0 = Date.now();
    lsChoices(Q, (v) => {
      const right = v === String(Q.a);
      lsEl.querySelectorAll(".lsch button").forEach((x) => {
        x.disabled = true;
        if (x.dataset.v === String(Q.a)) x.classList.add("ans");
      });
      if (right) ok++;
      else if (typeof noteWrong === "function") noteWrong(Q);
      sfx(right ? "ok" : "bad");
      if (typeof logAdd === "function") logAdd({ u: Q.unit, k: "math", ok: right, t: (Date.now() - t0) / 1000, q: Q.q, a: Q.a });
      $("lsfb").innerHTML =
        (right ? '<span class="lsok">정답!</span>' : '<span class="lsno">아쉬워요. 정답은 <b>' + esc(Q.a) + "</b></span>" + lsSol(Q)) +
        '<div class="lsrow"><button type="button" class="lsmain" id="lsn">' + (n < 4 ? "다음 ▶" : "결과 보기") + "</button></div>";
      $("lsn").focus();
      $("lsn").onclick = () => (n++, ask());
    });
  };
  const end = () => {
    const st = lsSt(),
      pass = ok >= 4,
      first = pass && !st.cap[part];
    st.capTry = st.capTry || {};
    st.capTry[part] = Math.max(st.capTry[part] || 0, ok);
    if (pass) st.cap[part] = 1;
    if (first) {
      save.dust += 5;
      save.gold += 30;
    }
    sfx(pass ? "restore" : "quest");
    lsOpenBox(
      lsHead("단원 마무리 결과", part + "부 · " + unit) +
        '<p class="lsbig">' + "★".repeat(ok) + "☆".repeat(5 - ok) + "  " + ok + "/5</p>" +
        '<p class="lsp">' + (pass ? "★ 도장을 받았어요!" + (first ? " 별빛 가루 +5 · 금화 +30" : "") : "4개 이상 맞히면 ★ 도장이에요. 수업을 다시 보고 또 도전해 봐요. (다음 부로는 갈 수 있어요)") + "</p>" +
        '<div class="lsrow">' + (pass ? "" : '<button type="button" data-l="les">수업 다시 보기</button>') + '<button type="button" class="lsmain" data-l="x">닫기</button></div>',
    );
    lsEl.onclick = (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b) return;
      lsEl.onclick = null;
      const L = lessonFor(lsUnit(part));
      if (b.dataset.l === "les" && L) return lessonRun(L, part, true);
      lsClose();
    };
  };
  ask();
}
function capOffer(part) {
  lsSt().capAsk[part] = 1;
  lsOpenBox(
    lsHead("단원 마무리 5문제", part + "부 · " + (lsUnit(part) || "")) +
      '<p class="lsp">마을을 모두 되살렸구나! 이 단원을 얼마나 익혔는지 5문제로 확인해 볼까? 4개 이상 맞히면 ★ 도장이야.</p>' +
      '<div class="lsrow"><button type="button" class="lsmain" data-l="go">도전!</button><button type="button" data-l="skip">나중에</button></div>',
  );
  lsEl.onclick = (e) => {
    const b = e.target.closest("button[data-l]");
    if (!b) return;
    lsEl.onclick = null;
    if (b.dataset.l === "go") return capRun(part);
    lsClose();
    toast("배움 수첩에서 언제든 단원 마무리에 도전할 수 있어요");
  };
}

/* ── 언제 권하나: 한가할 때(대화·전투·패널이 없을 때) 1초마다 살핀다 ── */
setInterval(() => {
  if (!LESSON.auto || LESSON.on || busy || dl || mode !== "map" || !M || !save.job || studyCfg.subj === "eng") return;
  if (!$("panel").hidden || !$("bt").hidden || (typeof ORB === "object" && ORB.on) || (typeof MINI === "object" && MINI.on)) return;
  const st = lsSt();
  if (st.lessonOff) return;
  const part = mapPart(),
    L = lessonFor(lsUnit(part));
  if (LESSON.pending && L && LESSON.pending === L.key) {
    LESSON.pending = null;
    return lessonOffer(L, part, true);
  }
  if (M.kind !== "town") return;
  const k = PARTTOWN.indexOf(M.id);
  if (k < 0 || k + 1 !== part) return;
  if (L && !st.les[L.key] && !st.lesSkip[L.key]) return lessonOffer(L, part, false);
  if (partDone(k) && !st.cap[part] && !st.capAsk[part]) return capOffer(part);
}, 1000);

/* ── 문제 흐름: 수업 뒤 쉬운 5문제 · 실력 맞춤 · 건너뛴 뒤 다시 권하기 · 「?」 ── */
const adaptKey = () => studyCfg.grade + ":" + mapPart();
function adaptCalc() {
  // 그 단원 최근 10문제(처음 답) 정답률 → -1 / 0 / +1
  const u = lsUnit();
  if (!u || typeof LOG !== "object") return 0;
  const R = LOG.recent.filter((e) => e.k === "math" && e.u && e.u.includes(u)).slice(-10);
  if (R.length < 5) return 0;
  const rate = R.reduce((a, e) => a + e.ok, 0) / R.length;
  return rate >= 0.8 ? 1 : rate <= 0.5 ? -1 : 0;
}
{
  const mqA = makeQ;
  makeQ = function (d) {
    const st = lsSt(),
      L = lessonFor(lsUnit());
    let d2 = d;
    if (L && st.lesEase && st.lesEase.key === L.key && st.lesEase.n > 0) {
      st.lesEase.n--;
      d2 = Math.min(d, 2); // 쉬운 단계
    } else if (studyCfg.adapt !== "route" && studyCfg.subj !== "eng") {
      const key = adaptKey(),
        A = st.adapt[key] || (st.adapt[key] = { off: 0, n: 0 });
      if (A.n++ % 5 === 0) A.off = adaptCalc();
      const t = d <= 2 ? 1 : d === 3 ? 2 : 3,
        t2 = Math.max(1, Math.min(3, t + A.off));
      d2 = t2 === t ? d : t2 === 1 ? 1 : t2 === 2 ? 3 : 4;
    }
    return mqA(d2);
  };
  const afA = askField;
  askField = function (MI, title, cb) {
    const st = lsSt(),
      L = lessonFor(lsUnit()),
      A = st.adapt[adaptKey()] || (studyCfg.adapt !== "route" ? (st.adapt[adaptKey()] = { off: adaptCalc(), n: 1 }) : null);
    // 어려워하는 단원: 보기 하나 지워 주기(17-fun 의 힌트와 같은 방식)
    if (A && A.off < 0 && studyCfg.adapt !== "route" && typeof FUN === "object" && FUN.hint < 1 && !(typeof LEARN === "object" && LEARN.inRetry)) FUN.hint = 1;
    afA(MI, title, (ok) => {
      // 수업을 건너뛴 단원: 처음 5문제에서 2개 이상 틀리면 한 번 다시 권한다
      if (L && st.lesSkip[L.key] === 1 && !st.les[L.key]) {
        const c = LESSON.cnt[L.key] || (LESSON.cnt[L.key] = { n: 0, w: 0 });
        c.n++;
        if (!ok) c.w++;
        if (c.n <= 5 && c.w >= 2) {
          st.lesSkip[L.key] = 2;
          LESSON.pending = L.key;
        }
      }
      cb(ok);
    });
    lsHelpShow(false);
  };
}
// 「?」 단추: 그 단원의 핵심 한 줄(답은 알려 주지 않는다)
function lsHelpShow(v) {
  const L = lessonFor(lsUnit());
  document.querySelectorAll(".lscorehint").forEach((e) => e.remove());
  if (!v || !L) return;
  const host = typeof ORB === "object" && ORB.on ? $("qsq") : $("bq");
  const p = document.createElement("p");
  p.className = "lscorehint";
  p.textContent = "💡 " + L.core;
  host.after(p);
  if (typeof LOG === "object") {
    LOG.hints = (LOG.hints || 0) + 1;
    logSave();
  }
}
{
  const mk = (id) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lshelp";
    b.id = id;
    b.textContent = "?";
    b.title = "이 단원의 핵심 한 줄 보기";
    b.setAttribute("aria-label", "핵심 한 줄 보기");
    b.onclick = (e) => {
      e.stopPropagation();
      lsHelpShow(!document.querySelector(".lscorehint"));
    };
    return b;
  };
  $("qst").after(mk("qhelp"));
  $("btt").after(mk("bhelp"));
  const hudH = hud;
  hud = function () {
    hudH();
    const has = !!lessonFor(lsUnit());
    $("qhelp").hidden = $("bhelp").hidden = !has;
  };
}

/* ── 배움 수첩(패널 [공부] 묶음) ── */
TABS.push(["note", "배움 수첩"]);
PANEL.note = function () {
  const st = lsSt(),
    parts = [];
  for (let p = 1; p <= 12; p++) {
    const u = lsUnit(p),
      L = lessonFor(u);
    if (u) parts.push({ p, u, L });
  }
  if (!parts.length) return '<p class="hint">수학 과목일 때 배움 수첩이 열려요.</p>';
  const got = parts.filter((x) => x.L && st.les[x.L.key]).length,
    caps = parts.filter((x) => st.cap[x.p]).length;
  return (
    '<p class="hint">스승에게 배운 것이 여기에 모여요. 수업 ' + got + "/" + parts.length + " · 단원 마무리 ★ " + caps + "/" + parts.length + "</p>" +
    parts
      .map(({ p, u, L }) => {
        const seen = L && st.les[L.key],
          open = p <= curPart() + 1;
        return (
          '<div class="nt' + (seen ? " on" : "") + '"><div class="nth"><b>' + p + "부 · " + esc(u) + "</b>" + (st.cap[p] ? '<span class="ntcap">★ 마무리 도장</span>' : "") + "</div>" +
          (!L
            ? '<p class="hint">이 단원은 수업이 아직 없어요.</p>'
            : seen
              ? '<p class="ntcore">' + esc(L.core) + '</p><ol class="ntex">' + L.show.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ol>"
              : '<p class="hint">' + (open ? "아직 듣지 않은 수업이에요." : "그 부에 가면 열려요.") + "</p>") +
          '<div class="ntb">' +
          (L && open ? '<button type="button" data-les="' + p + '">' + (seen ? "수업 다시 보기" : "수업 듣기") + "</button>" : "") +
          (open && typeof partDone === "function" && partDone(p - 1) ? '<button type="button" data-cap="' + p + '">단원 마무리 ' + (st.cap[p] ? "다시" : "도전") + (st.capTry && st.capTry[p] != null ? " (최고 " + st.capTry[p] + "/5)" : "") + "</button>" : "") +
          "</div></div>"
        );
      })
      .join("")
  );
};
$("pc").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-les],button[data-cap]");
  if (!b) return;
  const p = +(b.dataset.les || b.dataset.cap);
  closePanel();
  if (b.dataset.cap) return capRun(p);
  const L = lessonFor(lsUnit(p));
  if (L) lessonRun(L, p, true);
});
// 숫자 키 1~4 로 보기 고르기, 수업 중에는 게임 조작을 막는다
addEventListener(
  "keydown",
  (e) => {
    if (!LESSON.on) return;
    const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
    if (m) {
      const b = lsEl.querySelectorAll(".lsch button")[+m[1] - 1];
      if (b && !b.disabled) b.click();
    }
    if (!["Tab", "Enter", "Space", "NumpadEnter"].includes(e.code)) {
      e.stopImmediatePropagation();
      if (e.code.startsWith("Arrow")) e.preventDefault();
    }
  },
  true,
);
