/* 화면·소리·메뉴 (엔진 뒤에 불러온다)
   · 휴대폰: 게임 창을 화면 가득 채우고, 화면 비율에 맞춰 보이는 범위(W×H)를 바꾼다.
   · 메뉴(☰): 도움말·소리·전체 화면·선생님 설정·처음부터.
   · 효과음: Web Audio 로 그 자리에서 만든다(소리 파일 없음). 끄기 설정은 localStorage "arca-ui". */

/* ── 설정 ── */
const UI = (() => {
  const d = { mute: false };
  try {
    return Object.assign(d, JSON.parse(localStorage.getItem("arca-ui") || "{}"));
  } catch (e) {
    return d;
  }
})();
function uiSave() {
  try {
    localStorage.setItem("arca-ui", JSON.stringify(UI));
  } catch (e) {}
}

/* ── 효과음 ── */
let AC = null;
function sfx(name) {
  if (UI.mute) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) {
    return;
  }
  const t0 = AC.currentTime;
  const tone = (f, at, dur, type, vol, f2) => {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f, t0 + at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + dur);
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g).connect(AC.destination);
    o.start(t0 + at);
    o.stop(t0 + at + dur + 0.02);
  };
  const S = {
    ok: () => (tone(660, 0, 0.09, "square", 0.06), tone(990, 0.08, 0.14, "square", 0.06)),
    bad: () => tone(220, 0, 0.22, "sawtooth", 0.05, 140),
    hit: () => tone(320, 0, 0.08, "triangle", 0.12, 90),
    hurt: () => tone(160, 0, 0.18, "square", 0.06, 80),
    skill: () => [0, 1, 2, 3].forEach((i) => tone(520 + i * 160, i * 0.05, 0.1, "triangle", 0.07)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.14, "square", 0.05)),
    fill: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.18, "triangle", 0.06)),
    restore: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, i * 0.1, 0.35, "triangle", 0.07)),
    lvl: () => [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.2, "square", 0.05)),
    talk: () => tone(880, 0, 0.03, "square", 0.025),
    quest: () => (tone(587, 0, 0.1, "triangle", 0.07), tone(880, 0.1, 0.18, "triangle", 0.07)),
    shard: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.12, 0.4, "sine", 0.08)),
    page: () => tone(1200, 0, 0.04, "triangle", 0.03, 700),
    pick: () => tone(1320, 0, 0.06, "sine", 0.05),
    run: () => tone(500, 0, 0.15, "triangle", 0.05, 900),
  };
  (S[name] || (() => {}))();
}

/* ── 휴대폰 화면 ── */
const MOBILE = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches) || innerWidth < 700;
function fitView() {
  let w = 320,
    h = 180;
  if (MOBILE) {
    const vw = innerWidth,
      vh = innerHeight;
    if (vh > vw) {
      w = 224;
      h = Math.min(420, Math.round((224 * vh) / vw / 2) * 2);
    } else {
      h = 180;
      w = Math.min(400, Math.round((180 * vw) / vh / 2) * 2);
    }
  }
  if (w === W && h === H) return;
  W = w;
  H = h;
  cv.width = W;
  cv.height = H;
}
if (MOBILE) {
  document.body.classList.add("mobile");
  if (!save.st.mobInit) {
    save.st.mobInit = 1;
    save.mm = false; // 휴대폰은 미니맵을 접어 두고 시작
    store();
    mmState();
  }
}
fitView();
addEventListener("resize", fitView);

/* ── 메뉴 ── */
{
  const stage = $("stage"),
    btn = document.createElement("button"),
    menu = document.createElement("div");
  btn.type = "button";
  btn.className = "ftb menub";
  btn.textContent = "☰ 메뉴";
  $("mm").prepend(btn);
  menu.className = "box menu";
  menu.hidden = true;
  stage.appendChild(menu);
  const render = () => {
    menu.innerHTML =
      '<button class="cx" type="button" data-m="x" aria-label="닫기">×</button><h3>메뉴</h3>' +
      '<div class="mrow"><button type="button" data-m="mute">' + (UI.mute ? "🔇 소리 켜기" : "🔊 소리 끄기") + "</button>" +
      '<button type="button" data-m="fs">⛶ 전체 화면</button>' +
      '<button type="button" data-m="study">선생님 설정</button>' +
      '<button type="button" data-m="reset">처음부터</button></div>' +
      '<h4>조작</h4><p class="mhelp">' +
      (MOBILE
        ? "왼쪽 아래 방향 버튼으로 걷고, 오른쪽 버튼으로 공격·점프·조사해요. 싸울 때는 답 버튼을 눌러요."
        : "방향키·WASD 이동 · 스페이스/엔터 조사 · Q 선제공격 · J/Z 점프 · M 지도 · 싸울 때 1·2·3 답, E·R·T·Y 스킬, Esc 도망") +
      "</p><h4>목표</h4><p class=\"mhelp\">마을의 지워진 곳을 별빛 가루로 다시 써요. 별빛 가루는 몬스터를 물리치고, 지문을 읽고, 부탁을 들어주면 모여요. 마을을 다 되살리고 길목 끝 문지기를 넘으면 다음 부로 가요.</p>";
  };
  const open = (v) => {
    if (v && busy) return;
    menu.hidden = !v;
    if (v) {
      render();
      busy = true;
      menu.querySelector("button").focus();
    } else {
      busy = false;
      stage.focus();
    }
  };
  btn.onclick = () => open(menu.hidden);
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const m = b.dataset.m;
    if (m === "x") open(false);
    else if (m === "mute") {
      UI.mute = !UI.mute;
      uiSave();
      render();
      sfx("ok");
    } else if (m === "fs") {
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("이 기기는 전체 화면을 지원하지 않아요"));
      else toast("이 기기는 전체 화면을 지원하지 않아요");
    } else if (m === "study") {
      open(false);
      const st = $("study");
      if (MOBILE) {
        st.classList.add("over");
        stage.appendChild(st);
      }
      st.hidden = false;
      if (typeof studyRender === "function") studyRender();
      st.scrollIntoView && !MOBILE && st.scrollIntoView({ behavior: "smooth" });
    } else if (m === "reset") $("reset").click();
  });
  // 휴대폰에서 선생님 설정 창 닫기 단추
  const st = $("study");
  if (st) {
    const x2 = document.createElement("button");
    x2.type = "button";
    x2.className = "cx sx";
    x2.textContent = "×";
    x2.setAttribute("aria-label", "닫기");
    x2.onclick = () => (st.hidden = true);
    st.prepend(x2);
  }
}

/* ════════ 전투 연출 ════════
   엔진이 부르는 것: fxHit(피해) · fxHurt(피해) · fxBlock() · fxLunge(대상) · drawFx() · noteWrong(문제) */
const FX = { pops: [], lunge: new Map(), flash: [] };
function fxPop(wx, wy, txt, col) {
  FX.pops.push({ x: wx, y: wy, t: 0, txt: String(txt), col: col || "#ffe14a" });
}
function fxHit(d) {
  if (!B) return;
  FX.lunge.set(pl, { t: 0, dir: B.m.x > pl.x ? 1 : -1 });
  fxPop(B.m.x, B.m.y - 22 - (MON[B.m.type].boss ? 18 : 0), d, "#ffe14a");
  FX.flash.push({ x: B.m.x, y: B.m.y - 10, t: 0, col: JOBCOL[save.job || "knight"] });
  sfx("hit");
  sfx("ok");
}
function fxHurt(d) {
  if (!B) return;
  FX.lunge.set(B.m, { t: 0, dir: pl.x > B.m.x ? 1 : -1 });
  fxPop(pl.x, pl.y - 24, "-" + d + "♥", "#ff8fa3");
  sfx("bad");
  setTimeout(() => sfx("hurt"), 120);
}
function fxBlock() {
  if (!B) return;
  FX.lunge.set(B.m, { t: 0, dir: pl.x > B.m.x ? 1 : -1 });
  fxPop(pl.x, pl.y - 24, "막음!", "#9fe0ff");
  sfx("bad");
}
/* 달려들기: 10장면 동안 앞으로 10칸 나갔다 돌아온다 */
function fxLunge(o) {
  const L = FX.lunge.get(o);
  if (!L) return 0;
  return Math.round(Math.sin((L.t / 10) * Math.PI) * 10 * L.dir);
}
const JOBCOL = { knight: "#9fd0ff", warrior: "#ffb35a", mage: "#d8b8ff", archer: "#b9f08a" };
function fxText(t, sx, sy, col) {
  x.font = "bold 10px sans-serif";
  x.textAlign = "center";
  x.lineWidth = 3;
  x.strokeStyle = "#1e1b3f";
  x.strokeText(t, sx, sy);
  x.fillStyle = col;
  x.fillText(t, sx, sy);
}
function drawFx() {
  FX.lunge.forEach((L, o) => {
    if (++L.t > 10) FX.lunge.delete(o);
  });
  FX.flash = FX.flash.filter((f) => f.t++ < 8);
  FX.flash.forEach((f) => {
    const r = 3 + f.t * 2,
      sx = f.x - cam.x,
      sy = f.y - cam.y;
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2 + f.t * 0.2;
      P(x, sx + Math.cos(an) * r, sy + Math.sin(an) * r * 0.7, 2, 2, i % 2 ? "#ffffff" : f.col);
    }
  });
  FX.pops = FX.pops.filter((p) => p.t++ < 22);
  FX.pops.forEach((p) => {
    x.globalAlpha = p.t < 16 ? 1 : 1 - (p.t - 16) / 6;
    fxText(p.txt, p.x - cam.x, p.y - cam.y - Math.min(14, p.t * 1.6), p.col);
    x.globalAlpha = 1;
  });
  // 싸우는 몬스터 머리 위 체력 막대
  if (B && B.m && !B.m.dead) {
    const big = MON[B.m.type].boss,
      sx = Math.round(B.m.x - cam.x),
      sy = Math.round(B.m.y - cam.y) - (big ? 44 : 26),
      w = big ? 36 : 22,
      k = Math.max(0, B.hp) / B.MI.hp;
    P(x, sx - w / 2 - 1, sy - 1, w + 2, 5, "#1e1b3f");
    P(x, sx - w / 2, sy, w, 3, "#5a2a3a");
    P(x, sx - w / 2, sy, Math.round(w * k), 3, k > 0.5 ? "#7ee07a" : k > 0.25 ? "#ffd86b" : "#ff6b7a");
  }
}

/* ════════ 틀린 문제 모음 ════════ */
function noteWrong(q) {
  if (!q || !q.q) return;
  q.wrong = 1;
  const L = (save.wrong = save.wrong || []);
  const i = L.findIndex((w) => w.q === q.q);
  if (i >= 0) L.splice(i, 1);
  L.unshift({ q: q.q, a: String(q.a), u: q.unit || "", ex: q.ex || "" });
  if (L.length > 40) L.length = 40;
  store();
}
PANEL.wrong = function () {
  const L = save.wrong || [];
  if (!L.length) return '<p class="hint">아직 틀린 문제가 없어요. 싸우다 틀린 문제가 여기에 모여요.</p>';
  return (
    '<p class="hint">최근에 틀린 문제 ' + L.length + "개예요. 눌러서 정답과 풀이를 확인해요.</p>" +
    L.map(
      (w) =>
        '<details class="wq"><summary>' +
        (w.u ? "<small>" + esc(w.u) + "</small>" : "") +
        "<span>" + esc(w.q).replace(/\n/g, "<br>") + "</span></summary><p><b>정답 " + esc(w.a) + "</b>" +
        (w.ex ? "<br>" + esc(w.ex).replace(/\n/g, "<br>") : "") +
        "</p></details>",
    ).join("") +
    '<div class="it"><span></span><button type="button" data-wclear="1">목록 비우기</button></div>'
  );
};
$("panel").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && b.dataset.wclear) {
    save.wrong = [];
    store();
    renderPanel();
  }
});

/* ════════ 대화 창 얼굴 그림 ════════
   말하는 사람의 모습(person·owl·petDraw)을 3배로 키워 대화 창 왼쪽에 그린다. 이야기(해설)는 그림 없음. */
function drawPortrait(n) {
  const c = $("dpf"),
    q = c.getContext("2d"),
    dlg = $("dlg");
  q.clearRect(0, 0, c.width, c.height);
  const S = 3,
    r = (a, y, w, h, col) => P(q, a * S, y * S, w * S, h * S, col);
  let ok = true;
  if (n.owl) owl((a, y, w, h, col) => P(q, (a + 0.5) * S, (y - 2) * S, w * S, h * S, col), 0, fr);
  else if (n.petSp) petDraw((a, y, w, h, col) => P(q, (a - 1) * S, (y - 4) * S, w * S, h * S, col), n.petSp, fr, false);
  else if (n.hair || n.top) person(r, 0, 0, { ...n, noSh: 1 }, false, "d");
  else ok = false;
  c.hidden = !ok;
  dlg.classList.toggle("pf", ok);
}
{
  const open0 = openDlg;
  openDlg = function (n, lines, cb, ch) {
    open0(n, lines, cb, ch);
    try {
      drawPortrait(n);
    } catch (e) {
      $("dpf").hidden = true;
      $("dlg").classList.remove("pf");
    }
  };
}

/* ════════ 별의 나침반 조각 ════════
   이야기 흐름: 2~5부 마을을 되살릴 때마다 1개(4개) → 6부 끝에 카이가 4개를 가져감(0개)
   → 7·8·9부 1개씩 → 10부 1개 + 카이가 돌려준 4개 → 11부 1개 → 12부 마지막 1개 = 10개 */
function shardCount() {
  let n = 0;
  for (let k = 1; k <= 4; k++) if (partDone(k)) n++;
  if (partDone(5)) n = 0;
  for (let k = 6; k <= 8; k++) if (partDone(k)) n++;
  if (partDone(9)) n += 5;
  if (partDone(10)) n++;
  if (partDone(11)) n++;
  return n;
}
function compassHTML(n) {
  let h = '<div class="cmp" aria-label="별의 나침반 조각 ' + n + "개 / 10개\">";
  for (let i = 0; i < 10; i++) h += '<i class="' + (i < n ? "on" : "") + '" style="--a:' + i * 36 + 'deg"></i>';
  return h + "<b>" + n + "/10</b></div>";
}
{
  const hs = document.createElement("span");
  hs.id = "hsh";
  $("hud").insertBefore(hs, $("h4"));
  const hud0 = hud;
  hud = function () {
    hud0();
    const n = shardCount(),
      seen = partDone(0);
    hs.hidden = !seen;
    hs.textContent = "◈ 나침반 조각 " + n + "/10";
  };
  // 조각 수가 바뀌면(이야기 장면이 끝난 뒤) 크게 알린다
  if (save.shards == null) save.shards = shardCount();
  const banner = document.createElement("div");
  banner.className = "box banner";
  banner.hidden = true;
  $("stage").appendChild(banner);
  setInterval(() => {
    if (busy || mode !== "map") return;
    const n = shardCount();
    if (n === save.shards) return;
    const up = n > save.shards;
    save.shards = n;
    store();
    hud();
    banner.innerHTML =
      compassHTML(n) +
      "<p>" +
      (up ? "별의 나침반 조각을 찾았어요!" : "카이가 나침반 조각을 가져갔어요…") +
      "</p><small>" +
      (n === 10 ? "열 조각이 모두 모였어요." : "모은 조각 " + n + " / 10") +
      "</small>";
    banner.hidden = false;
    sfx(up ? "shard" : "hurt");
    setTimeout(() => (banner.hidden = true), 3200);
  }, 700);
  const me0 = PANEL.me;
  PANEL.me = function () {
    return me0() + "<h4>별의 나침반</h4>" + compassHTML(shardCount());
  };
}

/* ════════ 되살리기 연출 ════════
   마을은 지워진 곳이 남은 만큼 색이 바래 있다가, 다시 쓸 때마다 색이 돌아온다. 모두 되살리면 별빛이 쏟아진다. */
function drawFade() {
  if (!M || !M.patch || !PATCH.length) return;
  const left = PATCH.filter((p) => !p.done).length;
  if (!left) return;
  x.save();
  x.globalCompositeOperation = "saturation";
  x.globalAlpha = 0.7 * (left / PATCH.length);
  x.fillStyle = "#808080";
  x.fillRect(0, 0, W, H);
  x.restore();
}
FX.burst = [];
function fxRestore() {
  sfx("restore");
  for (let i = 0; i < 90; i++)
    FX.burst.push({ x: Math.random() * W, y: -Math.random() * H, v: 0.8 + Math.random() * 1.6, t: 60 + Math.random() * 40, c: i % 3 });
  shakeT = 6;
}
{
  const fx0 = drawFx;
  drawFx = function () {
    fx0();
    FX.burst = FX.burst.filter((b) => b.t-- > 0);
    FX.burst.forEach((b) => {
      b.y += b.v;
      const col = ["#ffd86b", "#fff6d0", "#ff9fc0"][b.c];
      P(x, b.x - 1, b.y, 3, 1, col);
      P(x, b.x, b.y - 1, 1, 3, col);
    });
  };
}
