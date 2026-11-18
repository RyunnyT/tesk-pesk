/* 이동 편의 (2026-11-14 선생님 요청)
   · 정복한 맵에서는 어디서든 「별의 나침반 · 순간이동」. 갈 수 있는 곳: 가 본 마을 + 정복한 길목·막다른 길.
     정복: 마을 = 지워진 곳을 모두 되살림, 길목·막다른 길 = 그 부 마을을 되살렸거나 그 길목의 문지기를 물리침.
   · 마이룸에 들어갔다 나오면 들어가기 전 자리로 돌아간다(쓰러져서 들어온 때는 마지막 마을로). */
function conquered(id) {
  const m = MAPS[id];
  if (!m) return false;
  if (id === "home" || m.kind === "room") return true;
  if (m.kind === "town") return partDone(PARTTOWN.indexOf(id));
  return !!save.vis[id] && (partDone((MAP_PART[id] || 1) - 1) || !!save.boss[id]);
}
// 길목·막다른 길에도 순간이동으로 도착할 자리(첫 출구 바로 안쪽)
for (const id in MAPS) {
  const m = MAPS[id];
  if (m.spawn || !m.exits || !m.exits.length) continue;
  const e = m.exits[0],
    dx = e.x0 === 0 ? 1 : e.x0 === m.w - 1 ? -1 : 0,
    dy = e.y0 === 0 ? 1 : e.y0 === m.h - 1 ? -1 : 0;
  m.spawn = [e.x0 + dx * 2, e.y0 + dy * 2];
}
{
  const hud2 = hud;
  hud = function () {
    hud2();
    $("ftb").hidden = !(conquered(M.id) || (M.kind === "town" && Object.keys(save.towns).length > 1)) || M.id === "home";
  };
  openFT = function () {
    if (busy) return;
    const L = $("ftl"),
      btn = (id) =>
        '<button type="button" data-to="' + id + '">' + esc(MAPS[id].n) + (id === M.id ? " (지금 여기)" : "") + "</button>";
    const towns = Object.keys(save.towns).filter((id) => MAPS[id]),
      roads = CHAIN.concat(Object.values(DEADS)).filter((id) => MAPS[id] && MAPS[id].kind !== "town" && id !== "home" && conquered(id));
    L.innerHTML =
      '<b style="color:#f5e3a3;font-weight:400">별의 나침반 · 어디로 갈까요?</b>' +
      "<small>마을</small>" +
      towns.map(btn).join("") +
      (roads.length ? "<small>정복한 길</small>" + roads.map(btn).join("") : "") +
      '<button type="button" data-to="">닫기</button>';
    L.hidden = false;
    busy = true;
    L.querySelector("button").focus();
  };
  $("ftb").onclick = openFT;
  // 마이룸: 들어가기 전 자리를 기억했다가 나갈 때 그 자리로
  const lm1 = loadMap;
  loadMap = function (id, tx, ty, quiet) {
    if (id === "home" && M && M.id !== "home") {
      const back =
        pl.hp <= 0 || !MAPS[M.id]
          ? { map: save.lastTown || "t1", tx: MAPS[save.lastTown || "t1"].spawn[0], ty: MAPS[save.lastTown || "t1"].spawn[1] }
          : { map: M.id, tx: Math.floor(pl.x / T), ty: Math.floor(pl.y / T) }; // 발이 있는 칸(예전 (pl.y-12)/T 는 한 칸 위 = 건물 안으로 갈 때가 있었다)
      save.ret = back;
    }
    lm1(id, tx, ty, quiet);
    plUnstick();
    if (id === "home") {
      const e = MAPS.home.exits[0],
        r = save.ret;
      if (r && MAPS[r.map]) {
        e.to = r.map;
        e.at = [r.tx, r.ty];
      } else {
        e.to = "t1";
        e.at = [10, 15];
      }
    }
  };
}

/* 끼임 풀기: 내 자리가 막힌 곳(건물·나무·물)이면 가장 가까운 빈 칸으로. 맵에 들어올 때와, 움직일 수 없이 1초 넘게 막혀 있을 때 */
function plUnstick() {
  if (!M || typeof hitbox !== "function" || !hitbox(pl.x, pl.y, false)) return false;
  const sx = Math.floor(pl.x / T),
    sy = Math.floor(pl.y / T),
    seen = new Set([sx + "," + sy]),
    q = [[sx, sy]];
  while (q.length) {
    const [a, y] = q.shift();
    if (!hitbox(a * T + 8, y * T + 12, false)) {
      pl.x = a * T + 8;
      pl.y = y * T + 12;
      return true;
    }
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const na = a + dx,
        ny = y + dy,
        k = na + "," + ny;
      if (na < 0 || ny < 0 || na >= MW || ny >= MH || seen.has(k)) continue;
      seen.add(k);
      q.push([na, ny]);
    }
  }
  return false;
}
{
  let stuckT = 0;
  const upU = update;
  update = function () {
    upU();
    if (busy || mode !== "map" || pl.z > 0) return (stuckT = 0);
    stuckT = hitbox(pl.x, pl.y, false) ? stuckT + 1 : 0;
    if (stuckT > 20 && plUnstick()) {
      stuckT = 0;
      toast("끼어 있던 자리에서 빠져나왔어요");
    }
  };
}
