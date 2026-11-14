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
  if (w === W && h === H && cv.width === W * HDS) return;
  W = w;
  H = h;
  cv.width = W * HDS;
  cv.height = H * HDS;
  x.setTransform(HDS, 0, 0, HDS, 0, 0);
  x.imageSmoothingEnabled = false;
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
      (typeof HD === "object" ? '<button type="button" data-m="hd">' + (UI.oldArt ? "🎨 새 그림으로" : "🎨 옛 그림으로") + "</button>" : "") +
      '<button type="button" data-m="study">선생님 설정</button>' +
      '<button type="button" data-m="reset">처음부터</button></div>' +
      '<h4>조작</h4><p class="mhelp">' +
      (MOBILE
        ? "왼쪽 아래 방향 버튼으로 걷고, 오른쪽 버튼으로 공격·점프·조사해요. 스킬은 오른쪽 위 줄 버튼이에요. 공격이 닿으면 문제가 떠요."
        : "방향키·WASD 이동 · 스페이스/엔터 조사 · Q 공격 · E·R·T·Y 스킬 · J/Z 점프 · M 지도 · 문제가 뜨면 1·2·3 으로 답") +
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
    } else if (m === "hd") {
      // 48점 새 그림(PixelLab) ↔ 옛 그림 → src/13-hd.js
      UI.oldArt = !UI.oldArt;
      uiSave();
      HD.on = !UI.oldArt;
      hdRepaint();
      render();
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

/* ════════ 마을 꾸미기 ════════
   paintMap 이 지도를 처음 그릴 때 부른다(decoMap). 건물 이름을 보고 간판 그림·차양·굴뚝을 붙이고,
   마을 풀밭 빈자리에 지형에 맞는 소품을 놓는다. 소품은 그림일 뿐 길을 막지 않는다. */
const ICON = {
  bread: (c, x0, y0) => (P(c, x0, y0 + 1, 6, 3, "#c98a3a"), P(c, x0 + 1, y0, 4, 1, "#e0a85a"), P(c, x0 + 1, y0 + 2, 1, 1, "#f5e3a3"), P(c, x0 + 4, y0 + 2, 1, 1, "#f5e3a3")),
  fish: (c, x0, y0) => (P(c, x0, y0 + 1, 4, 2, "#5aa6dc"), P(c, x0 + 4, y0, 2, 4, "#3a7ac0"), P(c, x0 + 1, y0 + 1, 1, 1, "#1e1b3f")),
  hammer: (c, x0, y0) => (P(c, x0, y0, 5, 2, "#5F5E5A"), P(c, x0 + 2, y0 + 2, 1, 3, "#8a5a35")),
  book: (c, x0, y0) => (P(c, x0, y0, 6, 4, "#534AB7"), P(c, x0 + 1, y0 + 1, 4, 2, "#f5efe2"), P(c, x0 + 3, y0, 1, 4, "#3C3489")),
  coin: (c, x0, y0) => (P(c, x0 + 1, y0, 4, 4, "#d9a63a"), P(c, x0 + 2, y0 + 1, 2, 2, "#ffd86b")),
  bed: (c, x0, y0) => (P(c, x0, y0 + 2, 6, 2, "#3a7ac0"), P(c, x0, y0 + 1, 2, 1, "#ffffff"), P(c, x0, y0, 1, 4, "#5e3f29")),
  flag: (c, x0, y0) => (P(c, x0, y0, 1, 5, "#5e3f29"), P(c, x0 + 1, y0, 4, 3, "#E24B4A")),
  wheat: (c, x0, y0) => (P(c, x0 + 2, y0 + 1, 1, 4, "#8a7a2a"), P(c, x0 + 1, y0, 3, 2, "#e8c56a"), P(c, x0, y0 + 2, 2, 1, "#e8c56a"), P(c, x0 + 3, y0 + 2, 2, 1, "#e8c56a")),
  note: (c, x0, y0) => (P(c, x0 + 3, y0, 1, 4, "#1e1b3f"), P(c, x0 + 1, y0 + 3, 3, 2, "#1e1b3f"), P(c, x0 + 4, y0, 2, 1, "#1e1b3f")),
  star: (c, x0, y0) => (P(c, x0 + 2, y0, 2, 5, "#ffd86b"), P(c, x0, y0 + 2, 6, 1, "#ffd86b")),
  tent: (c, x0, y0) => (P(c, x0 + 2, y0, 2, 1, "#c0563f"), P(c, x0 + 1, y0 + 1, 4, 2, "#c0563f"), P(c, x0, y0 + 3, 6, 1, "#c0563f")),
};
function bldKind(n) {
  const has = (...k) => k.some((w) => n.includes(w));
  if (has("빵")) return { i: "bread", awn: 1, smoke: 1 };
  if (has("생선", "조개")) return { i: "fish", awn: 1 };
  if (has("대장", "공장", "공방")) return { i: "hammer", smoke: 1 };
  if (has("도서", "서고", "서점", "기록", "책")) return { i: "book", awn: has("서점") };
  if (has("상점", "가게", "기념품", "매표", "골드윈")) return { i: "coin", awn: 1 };
  if (has("숙소", "여관", "기숙사")) return { i: "bed" };
  if (has("길드", "본부", "군대", "무대")) return { i: "flag", flag: 1 };
  if (has("창고", "곡식", "촌장", "콩순", "팥돌")) return { i: "wheat" };
  if (has("노래", "악기")) return { i: "note" };
  if (has("천막", "막사")) return { i: "tent", flag: 1 };
  return { i: "star" };
}
const PROPS = {
  barrel: (c, X, Y) => (P(c, X + 4, Y + 5, 8, 10, "#7a4e2d"), P(c, X + 4, Y + 7, 8, 1, "#4a3020"), P(c, X + 4, Y + 12, 8, 1, "#4a3020"), P(c, X + 5, Y + 5, 2, 10, "#9a6a40")),
  crate: (c, X, Y) => (P(c, X + 3, Y + 6, 10, 9, "#a8742a"), P(c, X + 3, Y + 6, 10, 1, "#7a5220"), P(c, X + 7, Y + 6, 2, 9, "#7a5220")),
  net: (c, X, Y) => { for (let i = 0; i < 4; i++) (P(c, X + 2 + i * 3, Y + 6, 1, 8, "#c9b48a"), P(c, X + 2, Y + 7 + i * 2, 11, 1, "#c9b48a")); },
  lamp: (c, X, Y) => (P(c, X + 7, Y + 4, 2, 11, "#3a3a44"), P(c, X + 5, Y + 1, 6, 4, "#3a3a44"), P(c, X + 6, Y + 2, 4, 2, "#ffd86b"), P(c, X + 5, Y + 14, 6, 1, "#3a3a44")),
  hay: (c, X, Y) => (P(c, X + 2, Y + 7, 12, 8, "#d9b84a"), P(c, X + 4, Y + 5, 8, 2, "#e8c56a"), P(c, X + 2, Y + 10, 12, 1, "#a8892a")),
  pumpkin: (c, X, Y) => (P(c, X + 4, Y + 9, 8, 6, "#e07a2a"), P(c, X + 7, Y + 9, 1, 6, "#b85a1a"), P(c, X + 7, Y + 7, 2, 2, "#3B6D11")),
  mush: (c, X, Y) => (P(c, X + 3, Y + 9, 6, 3, "#c0563f"), P(c, X + 5, Y + 12, 2, 3, "#efe2c8"), P(c, X + 9, Y + 11, 4, 2, "#e0a040"), P(c, X + 10, Y + 13, 2, 2, "#efe2c8")),
  log: (c, X, Y) => (P(c, X + 1, Y + 10, 14, 5, "#7a573b"), P(c, X + 1, Y + 10, 3, 5, "#c9a67a"), P(c, X + 2, Y + 11, 1, 3, "#a8845a")),
  pot: (c, X, Y) => (P(c, X + 5, Y + 10, 6, 5, "#c0563f"), P(c, X + 4, Y + 9, 8, 2, "#a8342e"), P(c, X + 5, Y + 6, 2, 3, "#ff9fc0"), P(c, X + 9, Y + 5, 2, 4, "#ffd86b"), P(c, X + 7, Y + 7, 2, 2, "#5a9e3a")),
  bench: (c, X, Y) => (P(c, X + 1, Y + 8, 14, 2, "#8a5a35"), P(c, X + 1, Y + 11, 14, 2, "#8a5a35"), P(c, X + 2, Y + 13, 2, 3, "#5e3f29"), P(c, X + 12, Y + 13, 2, 3, "#5e3f29")),
  snowman: (c, X, Y) => (P(c, X + 4, Y + 9, 8, 6, "#f6f8fb"), P(c, X + 5, Y + 4, 6, 5, "#f6f8fb"), P(c, X + 6, Y + 6, 1, 1, "#1e1b3f"), P(c, X + 9, Y + 6, 1, 1, "#1e1b3f"), P(c, X + 7, Y + 7, 2, 1, "#e07a2a"), P(c, X + 5, Y + 3, 6, 1, "#c0563f")),
  crystal: (c, X, Y) => (P(c, X + 6, Y + 4, 3, 11, "#9fd0f0"), P(c, X + 3, Y + 8, 3, 7, "#bfe6ff"), P(c, X + 10, Y + 9, 3, 6, "#bfe6ff"), P(c, X + 7, Y + 5, 1, 4, "#ffffff")),
  lantern: (c, X, Y) => (P(c, X + 7, Y + 2, 2, 13, "#9a93a8"), P(c, X + 5, Y + 4, 6, 5, "#f6f3ea"), P(c, X + 6, Y + 5, 4, 3, "#fff6c9")),
  paper: (c, X, Y) => (P(c, X + 2, Y + 8, 10, 7, "#fffdf6"), P(c, X + 3, Y + 10, 6, 1, "#c9c2b4"), P(c, X + 3, Y + 12, 4, 1, "#c9c2b4")),
  fbook: (c, X, Y) => (P(c, X + 3, Y + 4, 9, 6, "#534AB7"), P(c, X + 4, Y + 5, 7, 4, "#f5efe2"), P(c, X + 7, Y + 4, 1, 6, "#3C3489"), P(c, X + 5, Y + 14, 6, 1, "rgba(0,0,0,0.15)")),
  star: (c, X, Y) => (P(c, X + 7, Y + 3, 2, 8, "#ffd86b"), P(c, X + 4, Y + 6, 8, 2, "#ffd86b"), P(c, X + 7, Y + 6, 2, 2, "#fff6d0")),
};
const PROPSET = {
  coast: ["barrel", "crate", "net", "lamp"],
  stone: ["crate", "lamp", "barrel", "crate"],
  gold: ["hay", "pumpkin", "hay", "crate"],
  forest: ["mush", "log", "mush", "pot"],
  garden: ["pot", "bench", "lamp", "pot"],
  town: ["pot", "bench", "barrel", "lamp"],
  snow: ["snowman", "crystal", "lamp", "crystal"],
  white: ["lantern", "paper", "lantern", "paper"],
  dream: ["fbook", "star", "fbook", "lamp"],
  dead: ["log", "mush", "lantern", "log"],
};
function decoMap(m, bc) {
  (m.bld || []).forEach((b) => {
    if (b.lm || b.tower || !b.n) return;
    const k = bldKind(b.n),
      X = b.x * T,
      Y = b.y * T,
      w = b.w * T,
      h = b.h * T,
      rh = Math.round(h * 0.5),
      wy = Y + rh,
      dxp = b.dx * T + 3;
    // 간판 그림
    P(bc, dxp, Y + rh - 8, 10, 6, "#f5e3a3");
    ICON[k.i](bc, dxp + 2, Y + rh - 7);
    // 차양(줄무늬)
    if (k.awn)
      for (let a = X + 3; a < X + w - 3; a++) {
        P(bc, a, wy + 1, 1, 3, Math.floor((a - X) / 3) % 2 ? "#ffffff" : b.roof);
        if ((a - X) % 3 === 1) P(bc, a, wy + 4, 1, 1, b.roofD);
      }
    // 굴뚝
    if (k.smoke) {
      P(bc, X + w - 15, Y + 1, 7, 10, "#3a2418");
      P(bc, X + w - 14, Y + 2, 5, 9, "#a8574a");
      b.smoke = [X + w - 12, Y];
    }
    // 지붕 깃발
    if (k.flag) {
      P(bc, X + w / 2, Y - 8, 1, 10, "#3a2418");
      P(bc, X + w / 2 + 1, Y - 8, 6, 4, b.roofD || "#E24B4A");
    }
  });
  if (m.kind !== "town") return;
  const set = PROPSET[m.theme] || PROPSET.town;
  let n = 0;
  for (let y = 2; y < m.h - 2 && n < 14; y++)
    for (let a = 2; a < m.w - 2 && n < 14; a++) {
      const g = m.G[y][a];
      if ((g !== "." && g !== ",") || m.O[y][a]) continue;
      let free = true;
      for (let dy = -1; dy <= 1 && free; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const o = (m.O[y + dy] || [])[a + dx],
            g2 = (m.G[y + dy] || [])[a + dx];
          if (o || g2 === ":" || g2 === "b") {
            free = false;
            break;
          }
        }
      if (!free || hsh(a * 31, y * 17 + m.w) % 23) continue;
      PROPS[set[n % set.length]](bc, a * T, y * T);
      n++;
    }
}

/* ════════ 스킬 이펙트 ════════ */
FX.sk = [];
function fxSkill(t, nm) {
  sfx("skill");
  FX.sk.push({ t: 0, job: save.job || "knight", eff: t, nm, tg: B ? B.m : null });
  if (t === "heal") fxPop(pl.x, pl.y - 26, "+2♥", "#7ee07a");
}
{
  const fx1 = drawFx;
  drawFx = function () {
    fx1();
    // 굴뚝 연기
    (M.bld || []).forEach((b) => {
      if (!b.smoke) return;
      for (let i = 0; i < 3; i++) {
        const k = (fr + i * 7) % 21,
          sx = b.smoke[0] - cam.x + Math.sin((fr + i * 5) / 4) * 2,
          sy = b.smoke[1] - cam.y - k;
        x.globalAlpha = 0.55 * (1 - k / 21);
        P(x, sx - 2, sy, 4 + (k >> 3), 3, "#e9e6f0");
        x.globalAlpha = 1;
      }
    });
    FX.sk = FX.sk.filter((s) => s.t++ < 24);
    FX.sk.forEach((s) => {
      const tg = s.tg || (B && B.m) || pl,
        k = s.t,
        mx = tg.x - cam.x,
        my = tg.y - cam.y - 8,
        px = pl.x - cam.x,
        py = pl.y - cam.y - 8,
        col = JOBCOL[s.job],
        atk = s.eff === "hit2" || s.eff === "hit3" || s.eff === "ult";
      if (s.eff === "guard") {
        for (let i = 0; i < 16; i++) {
          const an = (i / 16) * Math.PI * 2;
          P(x, px + Math.cos(an) * 12, py + Math.sin(an) * 12, 2, 2, k % 4 < 2 ? col : "#ffffff");
        }
      } else if (s.eff === "heal") {
        for (let i = 0; i < 4; i++) P(x, px - 8 + i * 5, py - k - i * 3, 2, 2, "#7ee07a");
      } else if (s.eff === "double") {
        for (let i = 0; i < 6; i++) P(x, px - 6 + i * 2, py - 14 - (k % 6), 1, 4, col);
      } else if (atk && s.job === "archer") {
        const q = Math.min(1, k / 8);
        for (let j = 0; j < 3; j++) {
          const ax = px + (mx - px) * q,
            ay = py + (my - py) * q - j * 4 + 4;
          P(x, ax - 6, ay, 7, 1, col);
          P(x, ax, ay - 1, 2, 3, "#ffffff");
        }
      } else if (atk && s.job === "mage") {
        for (let j = 0; j < 5; j++) {
          const sx = mx - 12 + j * 6,
            sy = my - 40 + Math.min(40, k * 4) - j * 3;
          P(x, sx, sy, 3, 3, "#ffd86b");
          P(x, sx + 1, sy - 3, 1, 3, "#fff6d0");
        }
      } else if (atk && s.job === "warrior") {
        const r = k * 2;
        for (let i = 0; i < 20; i++) {
          const an = (i / 20) * Math.PI * 2;
          P(x, mx + Math.cos(an) * r, my + 8 + Math.sin(an) * r * 0.4, 2, 2, i % 2 ? col : "#ffffff");
        }
      } else if (atk) {
        for (let i = -6; i <= 6; i++) {
          P(x, mx + i, my + i, 2, 2, k % 4 < 2 ? "#ffffff" : col);
          P(x, mx + i, my - i, 2, 2, k % 4 < 2 ? col : "#ffffff");
        }
      }
      if (k < 18) {
        x.globalAlpha = k < 12 ? 1 : 1 - (k - 12) / 6;
        fxText(s.nm + "!", W / 2, 30, col);
        x.globalAlpha = 1;
      }
    });
  };
}

/* ════════ 건물 안 (루멘 도서관 · 루멘 등대) ════════ */
Object.assign(FURD, {
  desk(c, X, Y) {
    P(c, X, Y + 2, 32, 12, "#5e3f29");
    P(c, X + 1, Y + 3, 30, 9, "#8a5a3b");
    P(c, X + 4, Y - 2, 8, 5, "#f5efe2");
    P(c, X + 5, Y - 1, 6, 1, "#c9c2b4");
    P(c, X + 20, Y - 4, 3, 7, "#FAC775");
    P(c, X + 21, Y - 6, 1, 2, "#ff9f43");
  },
  lens(c, X, Y) {
    disc(c, X + 16, Y + 8, 14, "#3a3c4a");
    disc(c, X + 16, Y + 8, 12, "#bfe6ff");
    disc(c, X + 16, Y + 8, 8, "#e8f6ff");
    disc(c, X + 12, Y + 4, 3, "#ffffff");
    P(c, X + 13, Y + 20, 6, 10, "#3a3c4a");
  },
  globe(c, X, Y) {
    disc(c, X + 8, Y + 4, 6, "#3a7ac0");
    P(c, X + 5, Y + 2, 4, 3, "#5a9e3a");
    P(c, X + 9, Y + 5, 3, 2, "#5a9e3a");
    P(c, X + 7, Y + 10, 2, 5, "#8a5a35");
    P(c, X + 4, Y + 15, 8, 1, "#5e3f29");
  },
});
function bRoom(id, name, back, backAt, fur, npcs, floor) {
  const m = nm(18, 12, floor || "F"),
    G = m.G,
    O = m.O;
  Object.assign(m, { id, n: name, short: name, kind: "room", theme: "town", spawn: [8, 9] });
  FL(G, 0, 0, 17, 2, "W");
  FL(G, 0, 11, 17, 11, "W");
  FL(G, 0, 0, 0, 11, "W");
  FL(G, 17, 0, 17, 11, "W");
  G[11][8] = floor || "F";
  G[11][9] = floor || "F";
  m.fur = fur;
  fur.forEach((f) => f.w && FL(O, f.x, f.y, f.x + f.w - 1, f.y + f.h - 1, "U"));
  Object.assign(m, { bld: [], spots: [], npcs, mons: [], locks: [], nodes: [] });
  m.exits = [{ x0: 8, y0: 11, x1: 9, y1: 11, to: back, at: backAt, d: "d" }];
  MAPS[id] = m;
  CNAME[id] = name;
  MAP_PART[id] = MAP_PART[back] || 1;
  return m;
}
D.lumi = { n: "사서 루미", hair: "#3a2a5a", ht: "long", top: "#7F77DD", top2: "#f5e3a3", robe: 1 };
bRoom(
  "lib1",
  "루멘 도서관",
  "t1",
  [19, 27],
  [
    { id: "window", x: 2, y: 0 },
    { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 10, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
    { id: "rug", x: 5, y: 6 },
    { id: "desk", x: 12, y: 7, w: 2, h: 1 },
    { id: "globe", x: 2, y: 7, w: 1, h: 1 },
  ],
  [["lumi", 13, 9, ["모모 선생님은 늘 바쁘셔. 그래서 내가 책장을 지키지.", "도서관 맨 위 받침대, 보이지? 별의 나침반이 놓여 있던 자리야."]]],
);
bRoom(
  "lh1",
  "루멘 등대 안",
  "t1",
  [34, 7],
  [
    { id: "window", x: 2, y: 0 },
    { id: "window", x: 12, y: 0 },
    { id: "lens", x: 7, y: 3, w: 2, h: 2 },
    { id: "desk", x: 12, y: 7, w: 2, h: 1 },
    { id: "plant", x: 2, y: 4, w: 1, h: 1 },
  ],
  [["oscar", 4, 8, ["등대 렌즈는 별빛으로 닦는다네. 30년 동안 하루도 거르지 않았지.", "젊은 시절 자네 스승을 이 등대에서 처음 만났다네. 「새벽의 넷」… 허허, 그립구먼."]]],
);
{
  const lib = MAPS.t1.bld.find((b) => b.n === "루멘 도서관"),
    lh = MAPS.t1.bld.find((b) => b.n === "등대");
  if (lib) Object.assign(lib, { to: "lib1", at: [8, 9] });
  if (lh) Object.assign(lh, { to: "lh1", at: [8, 9] });
}

/* ════════ 새 퀘스트 형식: 전하기(talk) · 문제 풀어 주기(solve) ════════ */
QS.push(
  { id: "s14", side: 1, map: "t1", npc: "fin", type: "talk", to: "oscar", toMap: "lh1", n: 1, title: "등대로 가는 편지",
    where: "lh1", offer: ["또 부탁해서 미안! 항구에 사는 소라가 오스카 할아버지께 편지를 보냈대.", "등대 안에 계실 거야. 대신 전해 줄래?"],
    prog: "오스카 할아버지는 등대 안에 계셔.", got: ["오, 손녀 소라의 편지로구먼! 「할아버지, 등대가 꺼져서 무서워요」라…", "핀에게 고맙다고 전해 주게. 답장은 내가 직접 가져가겠네."],
    done: ["전해 줬구나! 우체부 친구, 고마워!"], rw: { exp: 15, gold: 15, dust: 3 } },
  { id: "s15", side: 1, map: "lib1", npc: "lumi", type: "solve", n: 3, dif: 1, title: "뒤섞인 책장 정리",
    where: "lib1", offer: ["책 번호가 뒤섞여 버렸어! 번호를 맞춰야 제자리에 꽂을 수 있는데…", "문제 3개만 같이 풀어 줄래?"],
    prog: "책 번호 문제를 같이 풀자!", done: ["책장이 반듯해졌어! 이 책갈피 가져가."], rw: { exp: 20, gold: 10, dust: 4, item: "도서관 책갈피" } },
  { id: "s16", side: 1, map: "t2", npc: "goldwin", type: "solve", n: 3, dif: 2, title: "공정한 값 계산",
    where: "t2", offer: ["…좋아, 인정하지. 값을 너무 올렸어. 그런데 공정한 값이 얼마인지 계산을 못 하겠어.", "계산 3개만 도와주면 오늘부터 바른 값에 팔지."],
    prog: "계산을 도와주게.", done: ["이제 손님들이 다시 오는군. 흥, 고맙네."], rw: { exp: 30, gold: 30, dust: 4 } },
  { id: "s17", side: 1, map: "t5", npc: "popo", type: "solve", n: 3, dif: 3, title: "포포의 시험 공부",
    where: "t5", offer: ["내일 시험인데 하나도 모르겠어… 같이 풀어 줄래?", "딱 3문제만!"],
    prog: "같이 풀자! 천천히!", done: ["다 맞았다! 나도 할 수 있구나!"], rw: { exp: 40, gold: 20, dust: 4 } },
  { id: "s18", side: 1, map: "t8", npc: "harold", type: "solve", n: 4, dif: 3, title: "창고 장부 다시 쓰기",
    where: "t8", offer: ["장부의 지워진 숫자를 다시 셈해야 하네.", "4줄만 함께 계산해 주겠나?"],
    prog: "장부 숫자를 함께 셈해 보세.", done: ["장부가 다시 바르게 쓰였어! 이웃끼리 다툴 일이 없겠군."], rw: { exp: 70, gold: 40, dust: 5 } },
  { id: "s19", side: 1, map: "t9", npc: "momone", type: "talk", to: "luke", toMap: "t9", n: 1, title: "루크에게 줄 별자리 책",
    where: "t9", offer: ["루크가 별 그림을 그리는데 별자리 책이 필요하대요.", "이 책을 루크에게 전해 줄래요?"],
    prog: "루크는 도서관 마당에서 그림을 그리고 있어요.", got: ["우와, 별자리 책이다! 형한테 보여 줄 그림을 더 잘 그릴 수 있겠다!"],
    done: ["전해 줬군요. 루크가 웃는 얼굴, 오래 기억하고 싶어요."], rw: { exp: 70, gold: 30, dust: 4 } },
);
EQ.c_mark = { s: "c", n: "도서관 책갈피", exp: 0.1, d: "경험치 +10%" };
if (typeof I2E === "object") I2E["도서관 책갈피"] = "c_mark";

/* ════════ 일지 · 세계 지도 (마이룸 창 칸) ════════ */
TABS.push(["log", "일지"], ["world", "지도"]);
function sceneList() {
  const L = [];
  PARTTOWN.forEach((id, k) => {
    if (save.st["in_" + id]) L.push(["in_" + id, k + 1 + "부 · " + MAPS[id].short + "에 오다"]);
    if (save.st["boss_" + k]) L.push(["boss_" + k, k + 1 + "부 · 보스 앞"]);
    if (save.st["done_" + k]) L.push(["done_" + k, k + 1 + "부 · 마을을 되살리다"]);
  });
  if (save.st.finale) L.push(["finale", "12부 · 졸업식"]);
  return L;
}
function sceneLines(key) {
  if (key === "finale") return SC_FINALE;
  const [kind, k] = key.split("_");
  return kind === "in" ? SC[k] : kind === "boss" ? SC_BOSS[k] : SC_DONE[k];
}
PANEL.log = function () {
  const act = QS.filter((q) => save.q[q.id] && save.q[q.id].st === "active"),
    done = QS.filter((q) => save.q[q.id] && save.q[q.id].st === "done").length,
    g = goal(),
    tagOf = (q) => (q.pet ? "펫" : q.side ? "서브" : "메인"),
    where = (q) => CNAME[q.type === "talk" ? q.toMap : q.where] || "";
  return (
    "<h4>지금 할 일</h4>" +
    (g ? '<div class="it"><span><small>메인</small><b>' + esc(g.t) + "</b></span></div>" : '<p class="hint">메인 이야기를 모두 끝냈어요!</p>') +
    "<h4>받은 부탁 " + act.length + "개 · 끝낸 부탁 " + done + "개</h4>" +
    (act.length
      ? act.map((q) => '<div class="it"><span><small>' + tagOf(q) + " · " + esc(where(q)) + "</small><b>" + esc(storyText(q.title)) + "</b></span><em>" + qCount(q) + " / " + q.n + "</em></div>").join("")
      : '<p class="hint">머리 위에 ! 가 있는 사람에게 말을 걸면 부탁을 받아요.</p>') +
    "<h4>지난 이야기 다시 보기</h4>" +
    (sceneList().length
      ? sceneList().map(([k, n]) => '<div class="it"><span><b>' + n + '</b></span><button type="button" data-replay="' + k + '">다시 보기</button></div>').join("")
      : '<p class="hint">아직 본 이야기가 없어요.</p>')
  );
};
PANEL.world = function () {
  const now = curPart();
  return (
    '<p class="hint">별의 나침반으로 가 본 마을 사이를 오갈 수 있어요(마을 안 「별의 나침반 · 순간이동」).</p>' +
    compassHTML(shardCount()) +
    '<div class="wmap">' +
    PARTTOWN.map((id, k) => {
      const st = partDone(k) ? "done" : save.vis[id] ? "seen" : k === now ? "next" : "lock";
      const lab = { done: "되살림", seen: "가 봄", next: "다음 목적지", lock: "아직" }[st];
      return (
        '<div class="wn ' + st + (M.id === id ? " here" : "") + '"><small>' + (k + 1) + "부" + (k === 5 ? " · 1학기 끝" : "") + "</small><b>" +
        (save.vis[id] ? esc(MAPS[id].short) : "???") + "</b><em>" + (M.id === id ? "지금 여기" : lab) + "</em></div>"
      );
    }).join("") +
    "</div>"
  );
};
$("panel").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || !b.dataset.replay) return;
  const L = sceneLines(b.dataset.replay);
  closePanel();
  if (L) setTimeout(() => playScene(L, () => {}), 100);
});

/* ════════ 시작 화면 ════════ */
{
  const tl = document.createElement("div"),
    started = !!(save.met.momo || save.job);
  tl.className = "titlebox";
  tl.innerHTML =
    '<div class="tin"><small>ARCA CHRONICLES</small><h2>아르카 연대기</h2><p>배운 것이 별빛이 되는 왕국의 1년</p>' +
    (started
      ? '<button type="button" data-t="go">이어하기</button><button type="button" class="ghost" data-t="new">처음부터</button><small class="tsave">' +
        esc(save.name || "견습생") + " · " + esc(MAPS[save.map] ? MAPS[save.map].n : "") + " · Lv " + save.lv + "</small>"
      : '<label>견습생 이름 <input id="tname" maxlength="8" value="' + esc(save.name || "") + '" placeholder="이름을 적어요"></label><button type="button" data-t="start">모험 시작</button>') +
    "</div>";
  $("stage").appendChild(tl);
  busy = true;
  const close = () => {
    tl.remove();
    busy = false;
    sfx("restore");
    $("stage").focus();
    if (typeof storyEnter === "function") storyEnter(M.id);
  };
  tl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const t = b.dataset.t;
    if (t === "go") close();
    else if (t === "new") $("reset").click();
    else if (t === "start") {
      const v = ($("tname").value || "").trim().slice(0, 8);
      save.name = v || "견습생";
      store();
      close();
    }
  });
  tl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") (tl.querySelector("[data-t=start]") || tl.querySelector("[data-t=go]")).click();
  });
}
