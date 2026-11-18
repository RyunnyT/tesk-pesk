/* ════════ 제품답게 (프롬프트 P, 2026-11-15, docs/점검_고칠점.md 2-4·3-3·4) ════════
   1) 첫 5분 튜토리얼: 부엉이 모모가 한 걸음씩(걷기 → 조사 → 밖으로 → 스승 찾기 → 조준 → 답 구슬 → 다시 쓰기). 해야 할 것만 알려 주고, 하면 다음으로. 건너뛰기 가능.
   2) 저장 백업: 메뉴 「저장 내보내기·가져오기」(진행 + 학습 기록 + 설정을 글 하나로). 깨진 저장이면 멈추지 않고 알린다.
   3) 도전의 탑: 가 본 부의 단원을 섞은 층별 도전(층마다 5문제, 4개 이상이면 다음 층). 내 최고 층만 기록(친구 순위 없음). 횟수 제한·놓치면 손해 없음.
   4) 제품 표시: 버전·날짜, 「오류 알리기」(상황을 글로 만들어 복사), 그림·글꼴 출처.
   · 자동으로 뜨는 튜토리얼은 자동 검사(navigator.webdriver)에서 꺼 둔다. 검사에서는 TUT.auto = true. */
const ARCA_VER = "0.9.0",
  ARCA_DATE = "2026-11-15";
const PRODUCT_ERRS = [];
addEventListener("error", (e) => {
  PRODUCT_ERRS.push(String(e.message || e).slice(0, 160) + (e.filename ? " @" + String(e.filename).split("/").pop() + ":" + e.lineno : ""));
  if (PRODUCT_ERRS.length > 5) PRODUCT_ERRS.shift();
});

/* ── 공용: 글 상자(내보내기·오류 알리기·출처) ── */
const pbox = document.createElement("div");
pbox.className = "box pbox";
pbox.id = "pbox";
pbox.hidden = true;
$("stage").appendChild(pbox);
function pboxOpen(html) {
  pbox.innerHTML = '<button class="cx" type="button" data-p="x" aria-label="닫기">×</button>' + html;
  pbox.hidden = false;
  busy = true;
  const f = pbox.querySelector("textarea, button:not(.cx)");
  if (f) f.focus();
}
function pboxClose() {
  pbox.hidden = true;
  busy = false;
  $("stage").focus();
}
const pInFrame = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();
function pCopy(ta, msgEl) {
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => (msgEl.textContent = "복사했어요."), () => {});
  msgEl.textContent = ok ? "복사했어요." : "글을 길게 눌러 복사해요.";
}

/* ── 2) 저장 백업 ── */
function backupMake() {
  const get = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch (e) {
      return null;
    }
  };
  store();
  return { app: "arca-save", v: 1, ver: ARCA_VER, at: new Date().toISOString(), nick: save.name || "", save, log: typeof LOG === "object" ? LOG : get("arca-log"), study: get("arca-study"), ui: get("arca-ui") };
}
function backupApply(txt) {
  let o;
  try {
    o = JSON.parse(txt);
  } catch (e) {
    return "글을 읽지 못했어요. 처음부터 끝까지 다 복사했는지 봐 주세요.";
  }
  if (!o || o.app !== "arca-save" || !o.save || typeof o.save !== "object" || !o.save.map) return "아르카 연대기 저장 파일이 아니에요.";
  try {
    localStorage.setItem("arca-v2", JSON.stringify(o.save));
    if (o.log) localStorage.setItem("arca-log", JSON.stringify(o.log));
    if (o.study) localStorage.setItem("arca-study", JSON.stringify(o.study));
    if (o.ui) localStorage.setItem("arca-ui", JSON.stringify(o.ui));
    localStorage.removeItem("arca-v2-broken");
  } catch (e) {
    return "이 기기에 저장할 수 없어요(저장 공간·사생활 보호 모드를 확인해 주세요).";
  }
  return null;
}
function backupOpen(mode) {
  if (mode === "out") {
    const txt = JSON.stringify(backupMake());
    pboxOpen(
      "<h3>저장 내보내기</h3><p>지금까지의 진행·학습 기록·설정이 모두 들어 있어요. 파일로 저장하거나 글을 복사해 두면, 다른 기기나 지워진 뒤에도 「저장 가져오기」로 되살릴 수 있어요.</p>" +
        '<textarea id="pbta" readonly rows="5" aria-label="저장 글"></textarea><div class="prow"><button type="button" data-p="dl">파일로 저장</button><button type="button" data-p="copy">글 복사</button><small id="pbmsg"></small></div>',
    );
    $("pbta").value = txt;
  } else {
    pboxOpen(
      "<h3>저장 가져오기</h3><p>내보낸 저장 글을 붙여 넣거나 파일을 골라요. <b>지금 기록은 가져온 기록으로 바뀌어요.</b></p>" +
        '<textarea id="pbta" rows="5" placeholder="여기에 저장 글을 붙여 넣어요" aria-label="저장 글"></textarea><input type="file" id="pbfile" accept=".json,application/json" hidden>' +
        '<div class="prow"><button type="button" data-p="file">파일 고르기</button><button type="button" data-p="load">이 기록으로 바꾸기</button><small id="pbmsg"></small></div>',
    );
    $("pbfile").onchange = async (e) => {
      const f = e.target.files[0];
      if (f) $("pbta").value = await f.text();
    };
  }
}
pbox.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]");
  if (!b) return;
  const a = b.dataset.p;
  if (a === "x") return pboxClose();
  if (a === "copy") return pCopy($("pbta"), $("pbmsg"));
  if (a === "file") return $("pbfile").click();
  if (a === "dl") {
    if (pInFrame) return ($("pbmsg").textContent = "이 화면에서는 파일 저장이 막혀 있어요. 「글 복사」로 메모장에 붙여 두세요.");
    try {
      const el = document.createElement("a");
      el.href = URL.createObjectURL(new Blob([$("pbta").value], { type: "application/json" }));
      el.download = "arca-save-" + (save.name || "player").replace(/[^\w가-힣]/g, "") + "-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(el);
      el.click();
      el.remove();
      $("pbmsg").textContent = "저장했어요.";
    } catch (err) {
      $("pbmsg").textContent = "파일 저장이 안 돼요. 「글 복사」를 써 주세요.";
    }
    return;
  }
  if (a === "load") {
    const t = $("pbta").value.trim();
    if (!t) return ($("pbmsg").textContent = "저장 글을 붙여 넣어 주세요.");
    if (b.dataset.sure !== "1") {
      b.dataset.sure = "1";
      b.textContent = "정말 바꿀까요? 한 번 더 누르기";
      return;
    }
    const err = backupApply(t);
    if (err) {
      b.dataset.sure = "";
      b.textContent = "이 기록으로 바꾸기";
      return ($("pbmsg").textContent = err);
    }
    $("pbmsg").textContent = "가져왔어요. 다시 불러올게요…";
    setTimeout(() => location.reload(), 600);
  }
});
// 깨진 저장 알림
if (window.ARCA_SAVE_BROKEN)
  setTimeout(() => {
    pboxOpen(
      "<h3>저장을 읽지 못했어요</h3><p>이 기기의 저장 기록이 깨져 있어서 처음부터 시작했어요. 깨진 기록은 지우지 않고 따로 보관했어요.</p><p>내보내 둔 저장 글이 있나요?</p>" +
        '<div class="prow"><button type="button" id="pbimp">저장 가져오기</button><button type="button" data-p="x">그냥 새로 시작</button></div>',
    );
    $("pbimp").onclick = () => backupOpen("in");
  }, 1200);

/* ── 4) 메뉴: 저장·오류 알리기·출처·버전 ── */
function reportText() {
  const st = save.st || {};
  return [
    "아르카 연대기 오류 알리기",
    "버전 " + ARCA_VER + " (" + ARCA_DATE + ")",
    "어디: " + (M ? M.id + " " + M.n : "-") + " · " + (typeof mapPart === "function" ? mapPart() + "부" : "") + " · Lv " + save.lv + " · 직업 " + (save.job || "없음"),
    "설정: " + studyCfg.grade + "학년 · " + (studyCfg.subj || "math") + " · 전투 " + (studyCfg.battle || "orb") + (UI.lite ? " · 가벼운 화면" : "") + (UI.big ? " · 큰 글자" : ""),
    "화면: " + innerWidth + "×" + innerHeight + " · " + navigator.userAgent,
    "최근 오류: " + (PRODUCT_ERRS.length ? PRODUCT_ERRS.join(" / ") : "기록 없음"),
    "무슨 일이 있었나요? (여기에 적어 주세요)",
    "",
  ].join("\n");
}
{
  const menu = document.querySelector(".box.menu");
  if (menu) {
    const add = () => {
      const row = menu.querySelector(".mrow");
      if (!row || menu.querySelector(".mprod")) return;
      const d = document.createElement("div");
      d.className = "mprod";
      d.innerHTML =
        '<div class="mrow"><button type="button" data-m="savout">💾 저장 내보내기</button><button type="button" data-m="savin">📂 저장 가져오기</button><button type="button" data-m="bug">오류 알리기</button><button type="button" data-m="credit">만든 것들</button>' +
        (typeof tutStart === "function" ? '<button type="button" data-m="tut">처음 안내 다시 보기</button>' : "") +
        '</div><p class="mver">아르카 연대기 ' + ARCA_VER + " · " + ARCA_DATE + "</p>";
      menu.appendChild(d);
    };
    new MutationObserver(add).observe(menu, { childList: true });
    menu.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest("[data-m]");
        if (!b || !["savout", "savin", "bug", "credit", "tut"].includes(b.dataset.m)) return;
        e.stopPropagation();
        menu.hidden = true;
        const m = b.dataset.m;
        if (m === "savout") backupOpen("out");
        else if (m === "savin") backupOpen("in");
        else if (m === "bug") {
          pboxOpen('<h3>오류 알리기</h3><p>아래 글을 복사해 선생님(또는 만든 사람)에게 보내 주세요. 이름 같은 개인 정보는 들어 있지 않아요.</p><textarea id="pbta" rows="8" aria-label="오류 알림 글"></textarea><div class="prow"><button type="button" data-p="copy">글 복사</button><small id="pbmsg"></small></div>');
          $("pbta").value = reportText();
        } else if (m === "credit")
          pboxOpen(
            "<h3>만든 것들</h3><ul class=\"pcred\"><li><b>그림</b>: 인물·몬스터·지도·아이콘·스킬 효과는 PixelLab(pixellab.ai)으로 만들었어요.</li><li><b>글꼴</b>: Gowun Batang · Gowun Dodum (SIL Open Font License)</li><li><b>음악·효과음</b>: 게임 안에서 그 자리에서 만드는 칩튠(파일 없음)</li><li><b>수학 문제</b>: Pesk 문제 은행 + 아르카 그림 문제</li><li><b>읽기 지문</b>: 아르카 지문 은행 225편</li></ul><p class=\"mver\">버전 " + ARCA_VER + " · " + ARCA_DATE + '</p><div class="prow"><button type="button" data-p="x">닫기</button></div>',
          );
        else if (m === "tut") {
          busy = false;
          tutStart(true);
        }
      },
      true,
    );
  }
}

/* ── 1) 첫 5분 튜토리얼 ── */
const TUT = { auto: !navigator.webdriver, on: false, i: 0, x0: 0, y0: 0, t: null };
const tutEl = document.createElement("div");
tutEl.className = "tut";
tutEl.id = "tut";
tutEl.hidden = true;
tutEl.innerHTML = '<span class="tutowl" aria-hidden="true">🦉</span><div><b id="tutn"></b><p id="tutt"></p></div><button type="button" id="tutx">건너뛰기</button>';
$("stage").appendChild(tutEl);
const tutMob = () => document.body.classList.contains("mobile");
const TUT_STEPS = [
  { n: "걷기", t: () => (tutMob() ? "왼쪽 아래 방향 버튼으로 걸어 봐요." : "방향키(또는 W·A·S·D)로 걸어 봐요."), init: () => ((TUT.x0 = pl.x), (TUT.y0 = pl.y)), ok: () => Math.hypot(pl.x - TUT.x0, pl.y - TUT.y0) > 28, glow: ".pad" },
  { n: "조사하기", t: () => (tutMob() ? "가구 앞에서 「조사」 버튼을 눌러 봐요. (침대·책장·거울…)" : "가구 앞에서 스페이스를 눌러 봐요. (침대·책장·거울…)"), init: () => (TUT.act = 0), ok: () => TUT.act > 0, glow: "#bA" },
  { n: "밖으로", t: () => "아래쪽 문으로 나가면 루멘 마을이에요. 노란 화살표가 다음 할 일을 가리켜요.", ok: () => M.id !== "home" },
  { n: "스승 찾기", t: () => "수련장의 스승 네 분 중 한 분에게 말을 걸어 직업을 배워요. 왼쪽 위 「메인」 줄을 봐요.", ok: () => !!save.job && !!save.trained, wait: true },
  { n: "길목으로", t: () => "이제 마을 동쪽 출구로 나가 몬스터를 만나 봐요.", ok: () => M.kind === "route" },
  { n: "조준하기", t: () => (tutMob() ? "몬스터에게 다가가 「공격」을 눌러요." : "몬스터에게 다가가 Q 를 눌러요."), ok: () => (typeof ORB === "object" && ORB.on) || !$("bt").hidden || (save.kills || 0) > TUT.k0, init: () => (TUT.k0 = save.kills || 0), glow: "#bK" },
  { n: "답 구슬", t: () => "문제를 읽고 답 구슬을 던져요. 숫자 키나 아래 구슬 버튼! 틀려도 풀이를 보고 다시 할 수 있어요.", ok: () => (save.kills || 0) > TUT.k0, wait: true },
  { n: "다시 쓰기", t: () => "별빛 가루가 모였어요! 마을로 돌아가 연필 밑그림만 남은 '지워진 곳' 앞에서 조사하면 다시 쓸 수 있어요.", ok: () => Object.values(save.done || {}).some((d) => d && d.some(Boolean)) },
];
function tutShow() {
  const S = TUT_STEPS[TUT.i];
  if (!S) return tutEnd(true);
  if (S.init) S.init();
  $("tutn").textContent = "모모의 안내 " + (TUT.i + 1) + "/" + TUT_STEPS.length + " · " + S.n;
  $("tutt").textContent = S.t();
  document.querySelectorAll(".tutglow").forEach((e) => e.classList.remove("tutglow"));
  if (S.glow) document.querySelectorAll(S.glow).forEach((e) => e.classList.add("tutglow"));
  if (typeof speak === "function") speak(S.t());
}
function tutStart(force) {
  const st = save.st || (save.st = {});
  if (!force && st.tut) return;
  TUT.on = true;
  TUT.i = force ? 0 : st.tutI || 0;
  tutShow();
  clearInterval(TUT.t);
  TUT.t = setInterval(() => {
    if (!TUT.on) return;
    // 대화·문제·패널이 떠 있을 때는 안내를 잠깐 숨긴다(겹치지 않게)
    const hide = !!dl || !$("panel").hidden || !pbox.hidden || (typeof LESSON === "object" && LESSON.on) || (typeof MINI === "object" && MINI.on) || !$("bt").hidden || (typeof ORB === "object" && ORB.on && !TUT_STEPS[TUT.i].wait);
    tutEl.hidden = hide;
    const S = TUT_STEPS[TUT.i];
    if (S && S.ok()) {
      TUT.i++;
      (save.st || (save.st = {})).tutI = TUT.i;
      if (typeof sfx === "function") sfx("quest");
      tutShow();
    }
  }, 300);
}
function tutEnd(done) {
  TUT.on = false;
  clearInterval(TUT.t);
  tutEl.hidden = true;
  document.querySelectorAll(".tutglow").forEach((e) => e.classList.remove("tutglow"));
  (save.st || (save.st = {})).tut = 1;
  store();
  if (done) toast("안내 끝! 이제 혼자서도 할 수 있어요. 막히면 메뉴 ☰ 를 봐요");
}
$("tutx").onclick = () => tutEnd(false);
{
  const iaT = interact;
  interact = function (t) {
    if (TUT.on) TUT.act = (TUT.act || 0) + 1;
    iaT(t);
  };
  // 새 게임(직업이 없고 아직 안내를 안 본 저장)이면 시작 화면이 닫힌 뒤 시작
  const iv = setInterval(() => {
    if (!TUT.auto) return clearInterval(iv);
    if (document.querySelector(".titlebox") || busy || !M) return;
    clearInterval(iv);
    if (!save.job && !(save.st && save.st.tut) && M.id === "home") tutStart(false);
    else if (save.st && !save.st.tut && save.st.tutI) tutStart(false);
  }, 500);
}

/* ── 3) 도전의 탑 ── */
function towerParts() {
  // 가 본 부(되살리기를 시작한 마을까지)
  const n = Math.max(1, Math.min(12, curPart() + 1));
  return Array.from({ length: n }, (_, i) => i + 1).filter((p) => typeof lsUnit === "function" && lsUnit(p));
}
function towerRun() {
  const st = save.st || (save.st = {}),
    floor = (st.towerNow || 0) + 1,
    parts = towerParts();
  if (!parts.length || typeof lsOpenBox !== "function") return toast("수학 과목일 때 도전할 수 있어요");
  const tier = floor <= 3 ? 1 : floor <= 8 ? 2 : 3;
  let n = 0,
    ok = 0;
  const ask = () => {
    if (n >= 5) return end();
    const part = parts[Math.floor(Math.random() * parts.length)],
      Q = (typeof fqQuestion === "function" && Math.random() < 0.3 && fqQuestion(lsUnit(part))) || lsQ(part, Math.max(1, Math.min(3, tier + (n === 4 ? 1 : 0))));
    lsOpenBox(lsHead("도전의 탑 " + floor + "층 · " + (n + 1) + "/5", part + "부 · " + (lsUnit(part) || "")) + (Q.fig ? '<div class="qfigwrap">' + Q.fig + "</div>" : "") + '<p class="lsq">' + esc(Q.q) + '</p><div class="lsch"></div><div class="lsfb" id="lsfb"></div>');
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
      $("lsfb").innerHTML = (right ? '<span class="lsok">정답!</span>' : '<span class="lsno">아쉬워요. 정답은 <b>' + esc(Q.a) + "</b></span>" + lsSol(Q)) + '<div class="lsrow"><button type="button" class="lsmain" id="lsn">' + (n < 4 ? "다음 ▶" : "결과 보기") + "</button></div>";
      $("lsn").focus();
      $("lsn").onclick = () => (n++, ask());
    });
  };
  const end = () => {
    const pass = ok >= 4;
    let rw = "";
    if (pass) {
      st.towerNow = floor;
      if (floor > (st.towerBest || 0)) {
        st.towerBest = floor;
        const gd = 20 + floor * 5;
        save.gold += gd;
        save.dust += 2;
        rw = "새 기록! 금화 +" + gd + " · 별빛 가루 +2";
        const T2 = { 5: "탑을 오르는 자", 10: "구름 위의 견습생", 20: "별빛 탑의 주인" }[floor];
        if (T2) {
          save.titles = save.titles || [];
          if (!save.titles.includes(T2)) save.titles.push(T2);
          save.title = T2;
          rw += " · 칭호 「" + T2 + "」";
        }
      }
    } else st.towerNow = floor - 1; // 못 넘으면 같은 층에서 다시
    sfx(pass ? "restore" : "quest");
    lsOpenBox(
      lsHead("도전의 탑 " + floor + "층", "내 최고 " + (st.towerBest || 0) + "층") + '<p class="lsbig">' + "★".repeat(ok) + "☆".repeat(5 - ok) + "  " + ok + "/5</p><p class=\"lsp\">" + (pass ? floor + "층을 넘었어요! " + rw : "4개 이상 맞히면 다음 층이에요. 같은 층에 다시 도전할 수 있어요.") + "</p>" +
        '<div class="lsrow"><button type="button" class="lsmain" data-l="go">' + (pass ? "다음 층 도전" : "다시 도전") + '</button><button type="button" data-l="x">그만하기</button></div>',
    );
    lsEl.onclick = (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b) return;
      lsEl.onclick = null;
      if (b.dataset.l === "go") return towerRun();
      lsClose();
    };
  };
  ask();
}
if (typeof TABS !== "undefined") {
  TABS.push(["tower", "도전의 탑"]);
  PANEL.tower = function () {
    const st = save.st || {},
      parts = towerParts();
    return (
      '<p class="hint">가 본 부의 단원이 섞여 나오는 층별 도전이에요. 한 층에 5문제, 4개 이상 맞히면 다음 층! 내 기록만 남아요. 횟수 제한도, 놓치면 손해 보는 것도 없어요.</p>' +
      '<div class="nt on"><div class="nth"><b>지금 ' + ((st.towerNow || 0) + 1) + "층에 도전</b><span class=\"ntcap\">내 최고 " + (st.towerBest || 0) + "층</span></div>" +
      '<p class="hint">나오는 단원: ' + (parts.length ? parts.map((p) => p + "부 " + esc(lsUnit(p))).join(" · ") : "수학 과목일 때 열려요") + "</p>" +
      '<p class="hint">5층 · 10층 · 20층에서 칭호를 받아요.</p><div class="ntb">' + (parts.length ? '<button type="button" data-tower="1">도전하기</button>' : "") + (st.towerNow ? '<button type="button" data-tower="0">1층부터 다시</button>' : "") + "</div></div>"
    );
  };
  $("pc").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tower]");
    if (!b) return;
    if (b.dataset.tower === "0") {
      save.st.towerNow = 0;
      return renderPanel();
    }
    closePanel();
    towerRun();
  });
}
