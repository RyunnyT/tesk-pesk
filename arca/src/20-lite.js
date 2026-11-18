/* ════════ 학교 기기: 가볍게 (프롬프트 F, 2026-11-15) ════════
   · 연필 밑그림(setupPatches): 예전엔 맵 전체(3배, 큰 마을 350만 점)를 훑었다 → 지워진 칸 둘레만 훑는다.
   · 가벼운 모드(UI.lite): 화면 배율 HDS 3 → 2(01-core 가 시작할 때 읽음, 바꾸면 다시 불러옴), 흔들림 끄기, 반짝이 줄이기,
     전 맵 바탕을 남기지 않기. 그림 크기는 ART(3)로 정해져 있어 그대로다.
   · 느린 기기 알아채기: 맵에서 처음 몇 초의 그리기 시간을 재서 느리면 "가벼운 화면으로 바꿀까요?"를 한 번만 묻는다.
   · 메뉴(☰)에 '가벼운 화면 켜기/끄기'. */

/* ── 1) 지워진 칸 둘레만 훑는 연필 밑그림 ── */
function patchList(m) {
  const PC = m.PCS || [
    [37, 13],
    [44, 15],
    [37, 26],
    [38, 29],
    [23, 20],
    [27, 4],
    [13, 29],
    [44, 19],
  ];
  m.ER = new Map();
  m.PATCH = PC.map((c, i) => ({ i, tiles: [], core: i === 7 }));
  let sv = 7;
  const rn = () => (sv = (sv * 16807) % 2147483647) / 2147483647;
  PC.forEach(([cx, cy], i) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const a = cx + dx,
          y = cy + dy;
        if (a < 0 || y < 0 || a >= m.w || y >= m.h) continue;
        const dd = Math.hypot(dx, dy * 1.2) + rn() * 0.8;
        if (dd > 2.2) continue;
        if (m.O[y][a] || ["~", "-", "#", "b"].includes(m.G[y][a]) || m.ER.has(a + "," + y)) continue;
        m.ER.set(a + "," + y, i);
        m.PATCH[i].tiles.push([a, y]);
      }
  });
}
function sketchFast(m, src) {
  // src: 가장자리를 읽을 바탕(보통 m.base). 칸마다 그 칸 + 오른쪽·아래 1점만 읽는다.
  const S = HDS,
    TS = T * S,
    sk = mk(m.w * TS, m.h * TS),
    kc = sk.getContext("2d"),
    bc = src.getContext("2d");
  kc.fillStyle = "#aaa292";
  m.ER.forEach((_, key) => {
    const [a, y] = key.split(",").map(Number),
      X = a * TS,
      Y = y * TS,
      w = Math.min(TS + 1, m.w * TS - X),
      h = Math.min(TS + 1, m.h * TS - Y),
      d = bc.getImageData(X, Y, w, h).data,
      L = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    // 종이 바탕과 줄
    kc.fillStyle = "#f6f3ea";
    kc.fillRect(X, Y, TS, TS);
    kc.fillStyle = "#ebe5d6";
    for (let yy = 4; yy < T; yy += 7) kc.fillRect(X, Y + yy * S, TS, S);
    kc.fillStyle = "#aaa292";
    for (let yy = 0; yy < Math.min(TS, h - 1); yy++)
      for (let xx = 0; xx < Math.min(TS, w - 1); xx++) {
        const i = (yy * w + xx) * 4,
          l = L(i);
        if ((Math.abs(l - L(i + 4)) > 34 || Math.abs(l - L(i + w * 4)) > 34) && hsh(X + xx, Y + yy) % 5) kc.fillRect(X + xx, Y + yy, 1, 1);
      }
  });
  m.sketch = sk;
}
setupPatches = function (m) {
  patchList(m);
  try {
    sketchFast(m, m.base);
  } catch (e) {
    // 파일로 바로 열어 픽셀을 읽을 수 없을 때: 옛 그림으로 따로 그려 읽는다(13-hd 와 같은 방법)
    const b = m.base,
      o = m.over,
      on = HD.on;
    m.base = mk(m.w * T * HDS, m.h * T * HDS);
    m.over = mk(m.w * T * HDS, m.h * T * HDS);
    m.base.getContext("2d").setTransform(HDS, 0, 0, HDS, 0, 0);
    m.over.getContext("2d").setTransform(HDS, 0, 0, HDS, 0, 0);
    HD.on = false;
    try {
      paintMap(m);
      sketchFast(m, m.base);
    } finally {
      HD.on = on;
      m.base = b;
      m.over = o;
    }
  }
};

/* ── 2) 가벼운 모드 ── */
const LITE = { on: !!UI.lite, t: [], asked: !!UI.liteAsked };
function liteSet(v) {
  UI.lite = v ? 1 : 0;
  UI.liteAsked = 1;
  if (v) UI.calm = true;
  uiSave();
  toast(v ? "가벼운 화면으로 바꿔요. 잠깐 다시 불러올게요." : "보통 화면으로 바꿔요. 잠깐 다시 불러올게요.");
  try {
    if (typeof store === "function") store();
  } catch (e) {}
  setTimeout(() => location.reload(), 700);
}
if (LITE.on) {
  // 반짝이 가루를 적게(한 번에 40개까지). frame 은 setInterval 이 잡고 있어 drawMap 을 감싼다
  const dm1 = drawMap;
  drawMap = function () {
    if (sp.length > 40) sp.splice(0, sp.length - 40);
    dm1();
  };
  // 전 맵 바탕도 지운다(메모리)
  const lmL = loadMap;
  loadMap = function (id, tx, ty, quiet) {
    if (M && M.id !== id) M.base = M.over = M.sketch = null;
    return lmL(id, tx, ty, quiet);
  };
}
/* 느린 기기 알아채기: 맵에서 그리기 시간을 30장 재서 평균이 20ms 넘으면 한 번 묻는다(장면 사이 50ms 중 40%) */
{
  const dmL = drawMap;
  drawMap = function () {
    if (LITE.on || LITE.asked || mode !== "map" || busy || !HD.ready || dl) return dmL();
    const a = performance.now();
    dmL();
    LITE.t.push(performance.now() - a);
    if (LITE.t.length >= 30) {
      const avg = LITE.t.reduce((s, v) => s + v, 0) / LITE.t.length;
      LITE.t = [];
      LITE.avg = avg;
      if (avg > 20) liteAsk();
      else LITE.okRuns = (LITE.okRuns || 0) + 1;
      if (LITE.okRuns >= 3) LITE.asked = true; // 충분히 빠르면 더 재지 않음
    }
  };
}
function liteAsk() {
  if (LITE.asked) return;
  LITE.asked = true;
  UI.liteAsked = 1;
  uiSave();
  const el = document.createElement("div");
  el.className = "box liteask";
  el.innerHTML = "<p>이 기기에서는 화면이 조금 느려요.<br><b>가벼운 화면</b>으로 바꿀까요?</p><small>그림은 그대로이고 조금 덜 선명해져요. 메뉴 ☰ 에서 언제든 바꿀 수 있어요.</small><div><button type=\"button\" data-l=\"1\">가볍게 바꾸기</button><button type=\"button\" data-l=\"0\">그대로 하기</button></div>";
  $("stage").appendChild(el);
  busy = true; // 묻는 동안은 멈춤
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-l]");
    if (!b) return;
    el.remove();
    busy = false;
    if (b.dataset.l === "1") liteSet(true);
  });
}
/* 메뉴에 켜고 끄기(메뉴는 열 때마다 다시 그려지므로 그때 단추를 붙인다) */
{
  const menu = document.querySelector(".box.menu");
  if (menu) {
    const add = () => {
      const row = menu.querySelector(".mrow");
      if (!row || row.querySelector('[data-m="lite"]')) return;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.m = "lite";
      b.textContent = UI.lite ? "보통 화면" : "가벼운 화면";
      b.title = "느린 기기에서 화면을 가볍게(덜 선명하게) 그려요";
      row.appendChild(b);
    };
    new MutationObserver(add).observe(menu, { childList: true });
    menu.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest('[data-m="lite"]');
        if (!b) return;
        e.stopPropagation();
        liteSet(!UI.lite);
      },
      true,
    );
  }
}
