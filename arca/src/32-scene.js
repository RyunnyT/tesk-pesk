/* ════════ 장면 컷 (프롬프트 O 4단계, 2026-11-16) ════════
   부의 시작(마을 첫 방문 장면 in_<마을>)과 끝(마을을 다 되살린 장면 done_<부>)에, 대화창 위에 큰 장면 한 장.
   새 그림을 받지 않고 지금 게임 그림으로 만든다: 카메라를 그 마을 랜드마크 앞에 두고, 장면에 나오는 인물 둘을 곁에 세운 뒤
   한 번 그려서(drawMap) 가운데를 1.6배로 잘라 붙인다. 천천히 다가가는 움직임(흔들림 끄기면 없음), 위에 「N부 · 마을 · 단원」.
   장면이 끝나면 사라진다. 끄기: SCUT.off = true */
const SCUT = { off: false, on: false };
const scEl = document.createElement("div");
scEl.className = "scut";
scEl.id = "scut";
scEl.hidden = true;
scEl.innerHTML = '<canvas id="scutc"></canvas><div class="scutt"><b id="scutb"></b><small id="scuts"></small></div>';
$("stage").appendChild(scEl);
{
  const st = document.createElement("style");
  st.textContent =
    ".scut{position:absolute;left:50%;top:6%;width:min(76%,640px);transform:translateX(-50%);z-index:30;border-radius:10px;overflow:hidden;" +
    "box-shadow:0 6px 24px rgba(0,0,0,.45);border:2px solid #ffe6a8;background:#1e1b3f;animation:scutIn .6s ease-out;pointer-events:none}" +
    ".scut canvas{display:block;width:100%;height:auto;image-rendering:pixelated;animation:scutPan 9s ease-out forwards}" +
    ".scutt{position:absolute;left:0;right:0;bottom:0;padding:6px 12px;background:linear-gradient(transparent,rgba(20,16,40,.85));color:#fff6d8;display:flex;gap:10px;align-items:baseline}" +
    ".scutt b{font-family:'Gowun Batang',serif;font-size:1.05rem}.scutt small{opacity:.85}" +
    "@keyframes scutIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%)}}" +
    "@keyframes scutPan{from{transform:scale(1)}to{transform:scale(1.08)}}" +
    "body.calm .scut canvas,body.calm .scut{animation:none}" +
    "body.mobile .scut{top:4%;width:94%}";
  document.head.appendChild(st);
}
// 이 마을의 랜드마크(없으면 가장 큰 건물, 그것도 없으면 처음 자리)
function scutFocus() {
  const B0 = (M.bld || []).find((b) => b.lm) || (M.bld || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (B0) return { x: (B0.x + B0.w / 2) * T, y: (B0.y + B0.h) * T + 6, lmTop: B0.y * T };
  return { x: (M.spawn ? M.spawn[0] : 10) * T, y: (M.spawn ? M.spawn[1] : 8) * T, lmTop: 0 };
}
function scutShot(lines) {
  const c = $("scutc"),
    f = scutFocus(),
    keep = { x: pl.x, y: pl.y, dir: pl.dir, face: pl.face, busy },
    moved = [];
  // 장면에 나오는 인물 둘을 곁에 세운다
  const ids = [...new Set((lines || []).map((l) => l[0]).filter((w) => npcs.some((n) => n.id === w)))].slice(0, 2);
  ids.forEach((id, i) => {
    const n = npcs.find((q) => q.id === id);
    moved.push([n, n.x, n.y, n.dir, n.face]);
    n.x = f.x + (i ? 22 : -22);
    n.y = f.y + 4;
    n.dir = i ? -1 : 1;
    n.face = "d";
  });
  pl.x = f.x;
  pl.y = f.y + 8;
  pl.dir = 1;
  pl.face = "u";
  busy = true;
  try {
    drawMap();
  } catch (e) {}
  // 가운데를 잘라 1.6배: 랜드마크 꼭대기가 보이게 위쪽으로 조금 치우침
  const sw = Math.round(cv.width / 1.6),
    sh = Math.round(sw * 0.5),
    cx = Math.round((pl.x - cam.x) * (cv.width / W)),
    cyMid = Math.round((Math.max(f.lmTop, f.y - 120) * 0.45 + (f.y + 20) * 0.55 - cam.y) * (cv.height / H)),
    sx = Math.max(0, Math.min(cv.width - sw, cx - sw / 2)),
    sy = Math.max(0, Math.min(cv.height - sh, cyMid - sh / 2));
  c.width = sw;
  c.height = sh;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
  // 영화처럼 위아래 띠
  g.fillStyle = "rgba(0,0,0,.35)";
  g.fillRect(0, 0, sw, Math.round(sh * 0.06));
  g.fillRect(0, sh - Math.round(sh * 0.06), sw, Math.round(sh * 0.06));
  moved.forEach(([n, a, y, d, fc]) => ((n.x = a), (n.y = y), (n.dir = d), (n.face = fc)));
  Object.assign(pl, { x: keep.x, y: keep.y, dir: keep.dir, face: keep.face });
  busy = keep.busy;
}
function scutShow(key, lines) {
  if (SCUT.off || !M || M.kind !== "town") return false;
  const pi = key.startsWith("done_") ? +key.slice(5) : PARTTOWN.indexOf(key.slice(3));
  if (pi < 0) return false;
  scutShot(lines);
  const part = pi + 1,
    un = typeof unitName === "function" ? unitName(part) : "";
  $("scutb").textContent = part + "부 · " + (CNAME[M.id] || M.short || "");
  $("scuts").textContent = key.startsWith("done_") ? "모두 다시 썼어요!" + (un ? " · " + un : "") : un ? "이번 단원 · " + un : "";
  scEl.hidden = false;
  document.body.classList.toggle("calm", !!UI.calm);
  SCUT.on = true;
  return true;
}
function scutHide() {
  scEl.hidden = true;
  SCUT.on = false;
}
{
  const so0 = storyOnce;
  storyOnce = function (key, lines, done) {
    if (save.st[key] || !lines) return so0(key, lines, done);
    const show = (key.startsWith("in_") || key.startsWith("done_")) && scutShow(key, lines);
    return so0(key, lines, show ? () => (scutHide(), done && done()) : done);
  };
  const lm0 = loadMap;
  loadMap = function () {
    scutHide();
    return lm0.apply(this, arguments);
  };
}
