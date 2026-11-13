function setupPatches(m) {
  const sk2 = mk(m.w * T, m.h * T),
    kc = sk2.getContext("2d"),
    bc = m.base.getContext("2d"),
    d = bc.getImageData(0, 0, m.w * T, m.h * T).data,
    L = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11,
    WW2 = m.w * T;
  P(kc, 0, 0, WW2, m.h * T, "#f6f3ea");
  for (let y = 4; y < m.h * T; y += 7) P(kc, 0, y, WW2, 1, "#ebe5d6");
  kc.fillStyle = "#aaa292";
  for (let y = 0; y < m.h * T - 1; y++)
    for (let a = 0; a < WW2 - 1; a++) {
      const i = (y * WW2 + a) * 4,
        l = L(i);
      if ((Math.abs(l - L(i + 4)) > 34 || Math.abs(l - L(i + WW2 * 4)) > 34) && hsh(a, y) % 5) kc.fillRect(a, y, 1, 1);
    }
  m.sketch = sk2;
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
function masters() {
  if (M.id === "t7" && save.job) {
    // 7부: 내 스승이 다시 찾은 루멘에 와 있다 (처음엔 나를 기억하지 못함)
    const id7 = ["bran", "gord", "iset", "pila"].find((k) => D[k].mj === save.job);
    npcs.push({ ...D[id7], id: id7, x: 17 * T + 8, y: 12 * T + 14, hx: 17 * T + 8, hy: 12 * T + 14, tx: 17 * T + 8, ty: 12 * T + 14, lines: MPOST, wait: 0, dir: 1, face: "d", f: 0, mv: false, talk: 0 });
    return;
  }
  if (M.id !== "t1") return;
  const mk2 = (id, a, y, lines) => ({
    ...D[id],
    id,
    x: a * T + 8,
    y: y * T + 14,
    hx: a * T + 8,
    hy: y * T + 14,
    tx: a * T + 8,
    ty: y * T + 14,
    lines,
    wait: 0,
    dir: 1,
    face: "d",
    f: 0,
    mv: false,
    talk: 0,
  });
  if (!save.job)
    ["bran", "gord", "iset", "pila"].forEach((id, k) => npcs.push(mk2(id, 28 + k * 2, k % 2 ? 13 : 14, MLINES[id])));
  else {
    const id = ["bran", "gord", "iset", "pila"].find((k) => D[k].mj === save.job);
    npcs.push(mk2(id, 30, 14, MPOST));
  }
}
function loadMap(id, tx, ty, quiet) {
  M = MAPS[id];
  G = M.G;
  O = M.O;
  MW = M.w;
  MH = M.h;
  WW = MW * T;
  WH = MH * T;
  if (!M.base) {
    M.base = mk(WW, WH);
    M.over = mk(WW, WH);
    paintMap(M);
    if (M.patch) setupPatches(M);
  }
  if (M.patch) {
    PATCH = M.PATCH;
    ER = M.ER;
    const dn = save.done[id] || [];
    PATCH.forEach((p, i) => (p.done = !!dn[i]));
  } else {
    PATCH = [];
    ER = new Map();
  }
  npcs = M.npcs.map(([id2, a, y, lines]) => ({
    ...D[id2],
    id: id2,
    x: a * T + 8,
    y: y * T + 14,
    hx: a * T + 8,
    hy: y * T + 14,
    tx: a * T + 8,
    ty: y * T + 14,
    lines,
    wait: 30,
    dir: 1,
    face: "d",
    f: 0,
    mv: false,
    talk: 0,
  }));
  masters();
  mons = M.mons
    .map(([t, a, y]) => ({
      map: id,
      type: t,
      x: a * T + 8,
      y: y * T + 14,
      hx: a * T + 8,
      hy: y * T + 14,
      tx: a * T + 8,
      ty: y * T + 14,
      wait: Math.random() * 60,
      dir: -1,
      f: 0,
      mv: false,
      dead: 0,
      hit: 0,
    }))
    .filter((m) => !(MON[m.type].boss && save.boss[id]));
  nodes = (M.nodes || []).map(([t, a, y]) => ({ t, x: a * T + 8, y: y * T + 14, g: 0 }));
  pl.x = tx * T + 8;
  pl.y = ty * T + 12;
  pl.inv = 24;
  pl.air = 0;
  pl.z = 0;
  pet.x = pl.x - 12;
  pet.y = pl.y;
  const ex = save.ex[id];
  EXP = [];
  for (let y = 0; y < MH; y++) EXP.push(Array(MW).fill(false));
  if (ex) for (let i = 0; i < ex.length && i < MW * MH; i++) if (ex[i] === "1") EXP[Math.floor(i / MW)][i % MW] = true;
  const mc = $("mmc");
  mc.width = MW * 2;
  mc.height = MH * 2;
  save.map = id;
  const firstVisit = !save.vis[id];
  save.vis[id] = 1;
  if (M.kind === "town") {
    save.towns[id] = 1;
    save.lastTown = id;
  }
  if (M.kind !== "route" && M.kind !== "dead") pl.hp = maxHp();
  save.hp = pl.hp;
  store();
  hud();
  chain();
  drawMini();
  if (!quiet) toast(M.n + (M.rec ? " · 권장 " + M.rec : M.kind === "town" ? " · 안전 구역" : ""));
  if (firstVisit && typeof storyEnter === "function") storyEnter(id);
}
function saveEx() {
  let s = "";
  for (let y = 0; y < MH; y++) for (let a = 0; a < MW; a++) s += EXP[y][a] ? "1" : "0";
  save.ex[M.id] = s;
  store();
}
function links(m) {
  return [
    ...m.exits.map((e) => ({ to: e.to, x: ((e.x0 + e.x1) / 2) * T + 8, y: ((e.y0 + e.y1) / 2) * T + 8 })),
    ...m.bld.filter((b) => b.to).map((b) => ({ to: b.to, x: b.dx * T + 8, y: (b.dy + 1) * T + 6 })),
  ];
}
function hop(from, to) {
  if (from === to) return null;
  const prev = { [from]: null },
    q = [from];
  while (q.length) {
    const c = q.shift();
    for (const l of links(MAPS[c])) {
      if (l.to in prev) continue;
      prev[l.to] = { c, l };
      if (l.to === to) {
        let n = to,
          step = null;
        while (prev[n] && prev[n].c !== undefined) {
          step = prev[n];
          if (prev[n].c === from) break;
          n = prev[n].c;
        }
        return step.l;
      }
      q.push(l.to);
    }
  }
  return null;
}
function qOf(id) {
  return QS.find((q) => q.id === id);
}
function qCount(q) {
  const s0 = save.q[q.id];
  if (!s0) return 0;
  return Math.min(q.n, q.type === "kill" ? s0.k : save.inv[q.item] || 0);
}
function nearestIn(list) {
  let b = null,
    bd = 1e9;
  list.forEach((o) => {
    const d = Math.hypot(o.x - pl.x, o.y - pl.y);
    if (d < bd) {
      bd = d;
      b = o;
    }
  });
  return b;
}
function allSpots() {
  return Object.values(MAPS).flatMap((m) => m.spots);
}
function curPart() {
  for (let p = 0; p < PARTS.length; p++) if (!partDone(p)) return p;
  return PARTS.length;
}
function rawGoal() {
  const npcAt = (map, id) => {
      if (M.id === map) {
        const n = npcs.find((n) => n.id === id);
        if (n) return { map, x: n.x, y: n.y - 8 };
      }
      const r = MAPS[map].npcs.find((n) => n[0] === id);
      return { map, x: r ? r[1] * T + 8 : 0, y: r ? r[2] * T + 6 : 0 };
    },
    spotAt = (id) => {
      for (const k in MAPS) {
        const s = MAPS[k].spots.find((s) => s.id === id);
        if (s) return { map: k, x: s.tx * T + 8, y: s.ty * T + 6, t: s.t };
      }
    };
  if (save.fin) return null;
  if (!save.met.momo) return { t: "모모와 이야기하기", ...npcAt("t1", "momo") };
  if (!save.job) return { t: "수련장에서 스승님 고르기", map: "t1", x: 31 * T, y: 13 * T };
  const p = curPart();
  if (p >= PARTS.length) return null;
  const P0 = PARTS[p],
    tn = P0.town;
  if (p > 0 && !save.vis[tn]) {
    const gp = PARTS[p - 1].gate,
      gm = MAPS[gp];
    if (!save.boss[gp]) {
      const gpos = gm.gatePos || [40, 13];
      return { t: CNAME[gp] + " 끝 문지기 물리치기", map: gp, x: gpos[0] * T + 8, y: gpos[1] * T };
    }
    return { t: p + 1 + "부 " + CNAME[tn] + "(으)로", map: tn, x: MAPS[tn].spawn[0] * T, y: MAPS[tn].spawn[1] * T };
  }
  if (!save.read[P0.main]) {
    const s = spotAt(P0.main);
    return { ...s, t: "「" + s.t + "」 읽기" };
  }
  for (const q of QS.filter((q) => q.map === tn && !q.side)) {
    const s0 = save.q[q.id];
    if (s0 && s0.st === "done") continue;
    const nm2 = D[q.npc].n;
    if (!s0) return { t: nm2 + "의 부탁 듣기", ...npcAt(tn, q.npc) };
    if (qCount(q) >= q.n) return { t: nm2 + "에게 돌아가기", ...npcAt(tn, q.npc) };
    if (M.id === q.where) {
      const tg =
        q.type === "kill"
          ? nearestIn(mons.filter((m) => !m.dead && m.type === q.mon))
          : nearestIn(nodes.filter((n) => !n.g && n.t === q.item));
      if (tg) return { t: q.title + " " + qCount(q) + "/" + q.n, map: M.id, x: tg.x, y: tg.y - 10 };
    }
    return { t: q.title + " " + qCount(q) + "/" + q.n, map: q.where, x: 20 * T, y: 10 * T };
  }
  const dn = save.done[tn] || [];
  const left = [0, 1, 2, 3, 4, 5, 6].filter((i) => !dn[i]);
  const need = left.length ? 3 : 6;
  if (save.dust < need) {
    if (M.kind === "route" || M.kind === "dead") {
      const tg = nearestIn(mons.filter((m) => !m.dead && !MON[m.type].boss));
      if (tg)
        return {
          t: "몬스터를 물리쳐 별빛 가루 모으기 (" + save.dust + "/" + need + ")",
          map: M.id,
          x: tg.x,
          y: tg.y - 10,
        };
    }
    const un = MAPS[tn].spots.filter((s) => !save.read[s.id]);
    if (M.id === tn && un.length) {
      const s = nearestIn(un.map((s) => ({ x: s.tx * T + 8, y: s.ty * T + 6 })));
      return { t: "지문을 읽어 별빛 가루 모으기 (" + save.dust + "/" + need + ")", map: tn, ...s };
    }
    return { t: "길목에서 별빛 가루 모으기 (" + save.dust + "/" + need + ")", map: P0.hunt, x: 20 * T, y: 10 * T };
  }
  if (left.length) {
    if (M.id === tn && PATCH.length) {
      const pts = [];
      PATCH.filter((q) => !q.core && !q.done).forEach((q) =>
        q.tiles.forEach(([a, y]) => pts.push({ x: a * T + 8, y: y * T + 8 })),
      );
      return { t: "지워진 곳 다시 쓰기 " + (7 - left.length) + "/7", map: tn, ...nearestIn(pts) };
    }
    return { t: CNAME[tn] + "의 지워진 곳 다시 쓰기", map: tn, x: MAPS[tn].spawn[0] * T, y: MAPS[tn].spawn[1] * T };
  }
  const pc = (MAPS[tn].PCS || [
    [37, 13],
    [44, 15],
    [37, 26],
    [38, 29],
    [23, 20],
    [27, 4],
    [13, 29],
    [44, 19],
  ])[7];
  return {
    t: "금빛 핵심 자리 다시 쓰기" + (P0.boss ? " · 보스 " + MON[P0.boss].n : ""),
    map: tn,
    x: pc[0] * T + 8,
    y: pc[1] * T + 8,
  };
}
function goal() {
  const g = rawGoal();
  if (!g) return null;
  if (g.map === M.id) return g;
  const l = hop(M.id, g.map);
  if (!l) return g;
  return { t: g.t, x: l.x, y: l.y, via: CNAME[l.to] };
}
function hud() {
  $("h1").textContent = M.n;
  $("h2").textContent = "♥".repeat(Math.max(0, pl.hp)) + "♡".repeat(Math.max(0, maxHp() - pl.hp)) + " Lv " + save.lv;
  $("h3").textContent =
    "가루 " + save.dust + " · 금화 " + save.gold + (M.patch ? " · ★ " + PATCH.filter((p) => p.done).length + "/8" : "");
  const g = goal();
  $("h4").hidden = !g;
  if (g) {
    const t = g.t + (g.via ? " → " + g.via : "");
    $("h4").textContent = "메인 · " + t;
    if (window._lg && window._lg !== g.t.replace(/[0-9/() ]+$/, ""))
      setTimeout(() => {
        if (!busy) toast("다음 할 일: " + g.t);
      }, 900);
    window._lg = g.t.replace(/[0-9/() ]+$/, "");
  }
  $("ftb").hidden = !(M.kind === "town" && Object.keys(save.towns).length > 1);
  $("homeb").hidden = M.id === "home";
  trk();
}
function trk() {
  const act = QS.filter((q) => save.q[q.id] && save.q[q.id].st === "active");
  const t = $("trk");
  t.hidden = !act.length;
  t.innerHTML = act
    .map(
      (q) => "<div" + (qCount(q) >= q.n ? ' class="ok"' : "") + ">" + q.title + " " + qCount(q) + "/" + q.n + "</div>",
    )
    .join("");
}
function chain() {
  const lab = (id) => {
    const v = save.vis[id],
      m = MAPS[id];
    return (
      '<span class="' +
      (id === M.id ? "now " : "") +
      (v ? "" : "lk ") +
      (m.kind === "town" || id === "home" ? "town" : "") +
      '" title="' +
      (v ? m.n : "아직 가 보지 않은 곳") +
      '">' +
      (v ? CNAME[id] : "?") +
      "</span>"
    );
  };
  let i = CHAIN.indexOf(M.kind === "dead" ? Object.keys(DEADS).find((k) => DEADS[k] === M.id) : M.id);
  if (i < 0) i = 0;
  let s = i;
  while (s > 0 && !["town", "home"].includes(MAPS[CHAIN[s]].kind)) s--;
  let e = s + 1;
  while (e < CHAIN.length - 1 && MAPS[CHAIN[e]].kind !== "town") e++;
  const seg = CHAIN.slice(s, e + 1),
    dd = seg.map((id) => DEADS[id]).filter(Boolean);
  $("chain").innerHTML = seg.map(lab).join("<i>›</i>") + (dd.length ? "<i>갈림길:</i>" + dd.map(lab).join("") : "");
}
function blkPt(px, py, air) {
  const tx = Math.floor(px / T),
    ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const o = O[ty][tx],
    lx = px - tx * T,
    ly = py - ty * T;
  if (o === "T") return ly >= 7 && lx >= 4 && lx < 12;
  if (o === "g") return ly >= 4 && lx >= 3 && lx < 13;
  if (o === "r" || o === "l") return air ? false : ly >= 4 && lx >= 1 && lx < 15;
  return blk(tx, ty, air);
}
function hitbox(px, py, air) {
  for (const a of [px - 4, px, px + 3]) for (const y of [py - 3, py]) if (blkPt(a, y, air)) return true;
  return false;
}
function nudge(o, dy, dx, air) {
  for (let s = 1; s <= 6; s++)
    for (const g of [-1, 1]) {
      if (dy && !hitbox(o.x + g * s, o.y, air) && !hitbox(o.x + g * s, o.y + dy, air)) {
        o.x += g;
        return;
      }
      if (dx && !hitbox(o.x, o.y + g * s, air) && !hitbox(o.x + dx, o.y + g * s, air)) {
        o.y += g;
        return;
      }
    }
}
function tryMove(o, dx, dy, air) {
  if (dx) {
    if (!hitbox(o.x + dx, o.y, air)) o.x += dx;
    else if (o === pl && !air) nudge(o, 0, dx, air);
  }
  if (dy) {
    if (!hitbox(o.x, o.y + dy, air)) o.y += dy;
    else if (o === pl && !air) nudge(o, dy, 0, air);
  }
}
function dirKeys() {
  let dx = 0,
    dy = 0;
  if (keys.ArrowLeft || keys.KeyA) dx--;
  if (keys.ArrowRight || keys.KeyD) dx++;
  if (keys.ArrowUp || keys.KeyW) dy--;
  if (keys.ArrowDown || keys.KeyS) dy++;
  return [dx, dy];
}
function jump() {
  if (busy || pl.air || mode !== "map") return;
  pl.air = 1;
  pl.vz = 2.7;
  pl.sx = pl.x;
  pl.sy = pl.y;
  const [dx, dy] = dirKeys(),
    l = Math.hypot(dx, dy);
  pl.jx = l ? (dx / l) * 1.5 : 0;
  pl.jy = l ? (dy / l) * 1.3 : 0;
}
function attack() {
  if (busy || mode !== "map" || pl.atk > 0 || pl.air) return;
  pl.atk = 10;
  const fx = pl.x + (pl.face === "s" ? pl.dir * 12 : 0),
    fy = pl.y - 6 + (pl.face === "u" ? -12 : pl.face === "d" ? 10 : 0);
  const m = mons.find((m) => !m.dead && Math.hypot(m.x - fx, m.y - 6 - fy) < 16);
  if (m) setTimeout(() => startBattle(m, true), 120);
}
function near() {
  let best = null,
    bd = 99;
  const cand = (type, ref, px, py, lx, ly) => {
    const dx = Math.abs(px - pl.x),
      dy = Math.abs(py - pl.y);
    if (dx < lx && dy < ly && dx + dy < bd) {
      bd = dx + dy;
      best = { type, ref };
    }
  };
  npcs.forEach((n) => cand("npc", n, n.x, n.y, 15, 11));
  if (best) return best;
  (M.fur || []).forEach((f) => {
    if (f.act) {
      const w = f.w || 2,
        h = f.h || 1;
      cand("fur", f, (f.x + w / 2) * T, f.act === "pet" ? f.y * T + 8 : (f.y + h) * T + 6, 16, 12);
    }
  });
  M.spots.forEach((s) => cand("spot", s, s.tx * T + 8, s.ty * T + 10, 17, 17));
  if (M.chest && !save.chest[M.chest.id]) cand("chest", M.chest, M.chest.tx * T + 8, M.chest.ty * T + 10, 17, 17);
  M.bld.forEach((b) => cand("door", b, b.dx * T + 8, (b.dy + 1) * T + 6, 10, 10));
  (M.locks || []).forEach((L) => {
    if (!L.open()) L.tiles.forEach(([a, y]) => cand("lock", L, a * T + 8, y * T + 10, 22, 14));
  });
  if (best) return best;
  nodes.forEach((n) => {
    if (!n.g) cand("node", n, n.x, n.y, 11, 9);
  });
  mons.forEach((m) => {
    if (!m.dead) cand("mon", m, m.x, m.y, 16, 12);
  });
  if (best) return best;
  const k = Math.floor(pl.x / T) + "," + Math.floor((pl.y - 2) / T);
  if (ER.has(k) && !PATCH[ER.get(k)].done) return { type: "patch", ref: PATCH[ER.get(k)] };
  for (const p of PATCH) {
    if (p.done) continue;
    for (const [a, y] of p.tiles)
      if (Math.abs(a * T + 8 - pl.x) < 14 && Math.abs(y * T + 8 - pl.y) < 14) return { type: "patch", ref: p };
  }
  return null;
}
function openDlg(n, lines, cb, ch) {
  busy = true;
  n.talk = 1;
  n.dir = pl.x < n.x ? -1 : 1;
  dl = { n, lines, i: 0, cb, ch };
  $("dn").textContent = n.n;
  $("dt").textContent = lines[0];
  $("dlg").hidden = false;
  dlgCh();
}
function dlgCh() {
  const c = $("dch");
  if (dl && dl.ch && dl.i === dl.lines.length - 1) {
    c.innerHTML = "";
    dl.ch.forEach(([lab, fn]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = lab;
      b.onclick = (ev) => {
        ev.stopPropagation();
        endDlg();
        fn();
      };
      c.appendChild(b);
    });
    c.hidden = false;
    $("dnx").hidden = true;
    c.firstChild.focus();
  } else {
    c.hidden = true;
    c.innerHTML = "";
    $("dnx").hidden = false;
  }
}
function endDlg() {
  $("dlg").hidden = true;
  $("dch").hidden = true;
  $("dch").innerHTML = "";
  const d0 = dl;
  d0.n.talk = 0;
  d0.n.wait = 40;
  dl = null;
  busy = false;
  $("stage").focus();
  return d0;
}
function nextDlg() {
  if (!dl) return;
  if (typeof sfx === "function") sfx("talk");
  if (dl.ch && dl.i === dl.lines.length - 1) return;
  dl.i++;
  if (dl.i >= dl.lines.length) {
    const d0 = endDlg();
    if (d0.cb) d0.cb();
  } else {
    $("dt").textContent = dl.lines[dl.i];
    dlgCh();
  }
}
$("dlg").onclick = nextDlg;
function gain(ex, gd, du) {
  save.exp += ex;
  save.gold += gd;
  save.dust += du || 0;
  let up = false;
  while (save.exp >= save.lv * 30) {
    save.exp -= save.lv * 30;
    save.lv++;
    up = true;
  }
  if (up) {
    if (typeof sfx === "function") setTimeout(() => sfx("lvl"), 900);
    pl.hp = maxHp();
    setTimeout(
      () =>
        toast(
          "레벨 업! Lv " + save.lv + ([3, 5, 7].includes(save.lv) ? " · 스킬 칸이 늘었어요" : " · 하트가 늘었어요"),
        ),
      1400,
    );
  }
  save.hp = pl.hp;
  store();
  hud();
}
const GL = { "!": [".#.", ".#.", ".#.", ".#.", "...", ".#."], "?": ["###", "..#", ".##", ".#.", "...", ".#."] };
function glyph(ch, col, bx, by) {
  const gp = GL[ch];
  gp.forEach((row, yy) =>
    [...row].forEach((c, xx) => {
      if (c === "#") P(x, bx + xx - 2, by + yy - 1, 3, 3, "#2b2b2b");
    }),
  );
  gp.forEach((row, yy) =>
    [...row].forEach((c, xx) => {
      if (c === "#") P(x, bx + xx - 1, by + yy, 1, 1, col);
    }),
  );
}
/* 이 사람이 지금 줄 퀘스트: 끝나지 않은 것 먼저. 펫 퀘스트(pet:1)는 펫이 있을 때만 */
function qFor(n) {
  const L = QS.filter((q) => q.npc === n.id && q.map === M.id && (!q.pet || save.pet));
  return L.find((q) => !(save.q[q.id] && save.q[q.id].st === "done")) || L[0];
}
const qText = (a) => (typeof storyText === "function" ? a.map(storyText) : a);
function qmark(n) {
  if (n.mj && !save.job) return ["!", "#ffd86b"];
  if (n.id === "momo" && !save.met.momo) return ["!", "#ffd86b"];
  if (!save.job) return null;
  const q = qFor(n);
  if (!q) return null;
  const s0 = save.q[q.id];
  if (!s0) return ["!", "#ffd86b"];
  if (s0.st === "done") return null;
  return ["?", qCount(q) >= q.n ? "#ffd86b" : "#c9c5d8"];
}
function talk(n) {
  const met = () => {
    if (!save.met[n.id]) {
      save.met[n.id] = 1;
      store();
      hud();
    }
  };
  if (n.mj && !save.job) return masterTalk(n);
  if (n.id === "momo" && !save.job)
    return openDlg(
      n,
      [
        "좋은 아침이에요, 견습생님! 오늘은 「견습생의 날」이에요.",
        "먼저 수련장에 가 봐요. 마을 가운데 수련장에 스승님 네 분이 기다리고 계세요.",
        "어느 스승님께 배울지는 견습생님이 직접 정하는 거예요.",
      ],
      met,
    );
  const q = qFor(n),
    s0 = q && save.q[q.id];
  if (q && !save.job) return openDlg(n, ["먼저 수련장에서 스승님을 만나고 오렴. 직업을 정하면 부탁할게."], met);
  if (!q || (s0 && s0.st === "done")) {
    // 이야기 진행에 따른 대사 → src/06c-story.js
    if (typeof storyTalk === "function" && storyTalk(n, met)) return;
    return openDlg(n, (typeof storyLines === "function" && storyLines(n)) || n.lines, met);
  }
  if (!s0)
    return openDlg(n, qText(q.offer), () => {
      met();
      save.q[q.id] = { st: "active", k: 0 };
      store();
      hud();
      toast("퀘스트를 받았어요: " + q.title);
      if (typeof sfx === "function") sfx("quest");
    });
  if (qCount(q) >= q.n)
    return openDlg(n, qText(q.done), () => {
      if (q.type === "gather") save.inv[q.item] -= q.n;
      if (q.rw.item && !save.items.includes(q.rw.item)) {
        save.items.push(q.rw.item);
        const e2 = I2E[q.rw.item];
        if (e2 && !save.own.includes(e2)) save.own.push(e2);
      }
      save.q[q.id].st = "done";
      gain(q.rw.exp, q.rw.gold, q.rw.dust);
      if (typeof sfx === "function") sfx("win");
      toast(
        "퀘스트 완료! EXP +" +
          q.rw.exp +
          " · 금화 +" +
          q.rw.gold +
          " · 가루 +" +
          q.rw.dust +
          (q.rw.item ? " · " + q.rw.item : ""),
      );
    });
  openDlg(n, qText([q.prog + " (" + qCount(q) + " / " + q.n + ")"]));
}
function masterTalk(n) {
  openDlg(n, MLINES[n.id], null, [
    [n.n.replace(" 스승", "") + " 스승님께 배울래요", () => chooseJob(n)],
    ["다른 스승님도 만나 볼래요", () => {}],
  ]);
}
function chooseJob(n) {
  save.job = n.mj;
  store();
  npcs = npcs.filter((m) => !m.mj || m === n);
  n.lines = MPOST;
  hud();
  openDlg(
    n,
    (typeof storyJobLines === "function" && storyJobLines(n.mj)) || [
      "좋다. 오늘부터 너는 견습 " + JOB[n.mj].n + "다.",
      "배운 것은 별빛이 된다. 문제 세 개를 풀어 보거라.",
    ],
    () => train(n, 0),
  );
}
function quizBox(title, dif, ok, bad) {
  busy = true;
  $("btt").textContent = title;
  $("bth").hidden = true;
  $("bs").hidden = true;
  const Q2 = makeQ(dif);
  $("bq").textContent = Q2.q;
  $("bq").classList.toggle("long", Q2.q.length > 18);
  $("bm").textContent = "";
  const bc = $("bc");
  bc.innerHTML = "";
  Q2.ch.forEach((v, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = i + 1 + ". " + v;
    b.onclick = () => {
      if (v === Q2.a) {
        save.solved = (save.solved || 0) + 1;
        if (typeof sfx === "function") sfx("ok");
        ok();
      }
      else {
        b.disabled = true;
        if (typeof noteWrong === "function") noteWrong(Q2);
        bad();
      }
    };
    bc.appendChild(b);
  });
  $("bt").hidden = false;
  bc.firstChild.focus();
}
function closeBox() {
  $("bt").hidden = true;
  $("bth").hidden = false;
  $("bs").hidden = false;
  busy = false;
  $("stage").focus();
}
function train(n, k) {
  quizBox(
    n.n + "의 첫 수련 " + (k + 1) + " / 3",
    1,
    () => {
      closeBox();
      if (k < 2) {
        train(n, k + 1);
        return;
      }
      save.trained = 1;
      save.sk = [0];
      for (let i = 0; i < 24; i++)
        sp.push({ a: pl.x - 8 + Math.random() * 16, y: pl.y - 20 + Math.random() * 16, t: 8 + Math.random() * 10 });
      gain(10, 0, 3);
      openDlg(
        n,
        [
          "보거라, 손끝에 첫 별빛이 반짝이는구나.",
          "동쪽 길목에서 별빛 가루를 모아 마을의 지워진 곳을 다시 쓰거라. 길드의 도라도 의뢰를 줄 게다.",
        ],
        () => toast("견습 " + JOB[save.job].n + "가 되었어요! 첫 스킬 「" + SKL[save.job][0][0] + "」(E 키)"),
      );
    },
    () => {
      $("bm").textContent = "천천히, 다시 생각해 보거라";
    },
  );
}
function townPart() {
  return PARTS.findIndex((p) => p.town === M.id);
}
function fillPatch(p) {
  const pi = townPart(),
    P0 = PARTS[pi];
  if (p.core) {
    const others = PATCH.filter((q) => !q.core).every((q) => q.done);
    if (!others) {
      toast("금빛 테두리는 핵심 자리예요. 다른 곳을 먼저 모두 다시 써요");
      return;
    }
    const ms = allSpots().find((s) => s.id === P0.main);
    if (!save.read[P0.main]) {
      toast("핵심 자리예요. 「" + (ms ? ms.t : "메인 지문") + "」을(를) 먼저 읽어요");
      return;
    }
    if (!QS.filter((q) => q.map === M.id && !q.side).every((q) => save.q[q.id] && save.q[q.id].st === "done")) {
      toast("핵심 자리예요. 이 마을 사람들의 부탁을 먼저 끝내요");
      return;
    }
  }
  const cost = p.core ? 6 : 3;
  if (save.dust < cost) {
    toast("별빛 가루가 " + (cost - save.dust) + "개 더 필요해요. 길목에서 몬스터를 물리치거나 지문을 읽어요");
    return;
  }
  if (p.core && P0.boss) {
    const [a, y] = p.tiles[Math.floor(p.tiles.length / 2)];
    const m = {
      map: M.id,
      type: P0.boss,
      x: a * T + 8,
      y: y * T + 14,
      hx: a * T + 8,
      hy: y * T + 14,
      tx: a * T + 8,
      ty: y * T + 14,
      wait: 0,
      dir: -1,
      f: 0,
      mv: false,
      dead: 0,
      hit: 0,
    };
    mons.push(m);
    toast(jo(MON[P0.boss].n, "이", "가") + " 나타났어요!");
    const go = () => {
      if (busy) {
        mons = mons.filter((x2) => x2 !== m);
        return;
      }
      startBattle(m, false);
      if (B) B.core = p;
    };
    // 보스 직전 이야기 장면 → src/06c-story.js
    setTimeout(() => (typeof storyBoss === "function" ? storyBoss(pi, go) : go()), 800);
    return;
  }
  doFill(p, cost);
}
function doFill(p, cost) {
  save.dust -= cost;
  p.done = true;
  save.done[M.id] = PATCH.map((q) => !!q.done);
  store();
  p.tiles.forEach(([a, y]) => {
    for (let i = 0; i < 4; i++)
      sp.push({ a: a * T + Math.random() * 16, y: y * T + Math.random() * 16, t: 8 + Math.random() * 10 });
  });
  gain(3, 0, 0);
  if (typeof sfx === "function") sfx("fill");
  const pi = townPart();
  if (PATCH.every((q) => q.done)) {
    const bc = M.base.getContext("2d");
    M.bld.forEach((b) => {
      if (b.tower) {
        b.lit = 1;
        bldDraw(bc, b);
      }
      if (b.lm === "clock") LMD.clock(bc, M.over.getContext("2d"), b);
    });
    const job = save.job;
    let msg = pi + 1 + "부 " + M.short + "을(를) 모두 되살렸어요!";
    if (job && pi > 0) {
      msg += " 새 스킬 「" + SKL[job][pi][0] + "」";
      if (pi !== STUDY[job] && save.sk.length < slots() && !save.sk.includes(pi)) save.sk.push(pi);
      store();
    }
    toast(msg);
    hud();
    if (typeof fxRestore === "function") fxRestore();
    if (pi === 5) setTimeout(ending, 1500);
    else if (typeof storyPartDone === "function") setTimeout(() => storyPartDone(pi), 1500);
  } else toast("별빛 가루 " + cost + "개로 다시 썼어요");
}
function finishCore(p) {
  doFill(p, 6);
}
function openBook(s) {
  busy = true;
  bk = { s, stage: "read", qi: 0 };
  renderBook();
  $("book").hidden = false;
}
function renderBook() {
  const s = bk.s,
    el = $("bk");
  if (bk.stage === "read")
    el.innerHTML =
      "<h3>「" +
      s.t +
      '」</h3><p style="color:#8a7a60;font-size:.85em;margin-top:-4px">' +
      s.n +
      " · 지문 " +
      s.no +
      " / " + allSpots().length + "</p>" +
      (s.p ? s.p.map((t) => "<p>" + t + "</p>").join("") : PH.map((t) => '<p class="ph">' + t + "</p>").join("")) +
      '<div class="bkb"><button type="button" data-bq="1">' +
      (s.q ? "다 읽었어요 · 문제 풀기" : "다 읽었어요") +
      "</button></div>";
  else if (bk.stage === "q") {
    const [qq, ch] = s.q[bk.qi];
    el.innerHTML =
      "<h3>문제 " +
      (bk.qi + 1) +
      " / " +
      s.q.length +
      "</h3><p>" +
      qq +
      '</p><div class="bkc">' +
      ch.map((c, i) => '<button type="button" data-ans="' + i + '">' + c + "</button>").join("") +
      '</div><p class="qm" id="bkm"></p><div class="bkb"><button type="button" class="ghost" data-back="1">지문 다시 보기</button></div>';
  } else
    el.innerHTML =
      "<h3>다 읽었어요!</h3><p>" +
      bk.msg +
      '</p><div class="bkb"><button type="button" data-bc="1">닫기</button></div>';
  el.scrollTop = 0;
  const f = el.querySelector("button");
  if (f) f.focus();
}
function finishBook() {
  const s = bk.s,
    first = !save.read[s.id];
  save.read[s.id] = 1;
  if (first) gain(5, 0, 3);
  store();
  bk.msg = first ? "별빛 가루 +3 · EXP +5. 마이룸 책장의 「책」 칸에서 언제든 다시 읽을 수 있어요." : "다시 읽었어요.";
  bk.stage = "done";
  renderBook();
}
function closeBook() {
  $("book").hidden = true;
  bk = null;
  busy = false;
  $("stage").focus();
}
$("book").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || !bk) return;
  const d = b.dataset;
  if (b.id === "bx") {
    closeBook();
    return;
  }
  if (d.bq) {
    if (bk.s.q) {
      bk.stage = "q";
      renderBook();
    } else finishBook();
  } else if (d.back) {
    bk.stage = "read";
    renderBook();
  } else if (d.ans != null) {
    if (+d.ans === bk.s.q[bk.qi][2]) {
      save.solved = (save.solved || 0) + 1;
      if (typeof sfx === "function") sfx("ok");
      bk.qi++;
      if (bk.qi >= bk.s.q.length) finishBook();
      else renderBook();
    } else {
      b.disabled = true;
      $("bkm").textContent = "지문을 다시 읽어 보면 답이 있어요";
    }
  } else if (d.bc) closeBook();
});
function gather(n) {
  n.g = 500;
  save.inv[n.t] = (save.inv[n.t] || 0) + 1;
  if (typeof sfx === "function") sfx("pick");
  store();
  for (let i = 0; i < 10; i++)
    sp.push({ a: n.x - 5 + Math.random() * 10, y: n.y - 10 + Math.random() * 8, t: 6 + Math.random() * 8 });
  hud();
  toast(ITEM[n.t] + " +1 (가방 " + save.inv[n.t] + "개)");
}
function furAct(f) {
  if (f.act === "bed") {
    pl.hp = maxHp();
    save.hp = pl.hp;
    store();
    hud();
    toast("푹 쉬었어요. 하트가 가득 찼어요");
    return;
  }
  openPanel(f.act);
}
function interact(t) {
  if (!t) return;
  const o = t.ref;
  if (t.type === "npc") talk(o);
  else if (t.type === "spot") openBook(o);
  else if (t.type === "patch") fillPatch(o);
  else if (t.type === "node") gather(o);
  else if (t.type === "fur") furAct(o);
  else if (t.type === "chest") {
    save.chest[o.id] = 1;
    const X = o.tx * T,
      Y = o.ty * T;
    chestDraw(M.base.getContext("2d"), X, Y, true);
    for (let i = 0; i < 24; i++)
      sp.push({ a: X + Math.random() * 16, y: Y + Math.random() * 12, t: 10 + Math.random() * 10 });
    gain(20, 60, 8);
    toast("보물 상자! 금화 +60 · 별빛 가루 +8 · 숨은 별빛 조각 1개");
  } else if (t.type === "door") {
    if (o.to) {
      saveEx();
      loadMap(o.to, o.at[0], o.at[1]);
    } else toast(o.n + "은(는) 다음 단계에서 안을 들어가 볼 수 있어요");
  } else if (t.type === "lock") toast(o.msg);
  else if (t.type === "mon") startBattle(o, false);
}
$("act").onclick = () => interact(near());
function startBattle(m, first) {
  if (busy || mode !== "map" || m.dead) return;
  const MI = mstat(m);
  busy = true;
  mode = "battle";
  pl.mv = false;
  B = { m, MI, hp: MI.hp, g: first ? 1 : 0, end: 0 };
  if (first) B.hp = Math.max(1, B.hp - 1);
  $("toast").hidden = true;
  $("btt").textContent = jo(MI.n, "과", "와") + " 싸워요!";
  $("bt").hidden = false;
  $("bt").classList.add("battle");
  $("act").hidden = true;
  lastAct = "";
  m.dir = pl.x < m.x ? -1 : 1;
  pl.dir = m.x > pl.x ? 1 : -1;
  pl.face = "s";
  ask(
    first
      ? "선제공격! 피해 1, 별빛 게이지 한 칸을 들고 시작해요."
      : jo(MI.n, "이", "가") + " 나타났어요! 문제를 맞히면 공격해요.",
  );
}
const SKEY = ["E", "R", "T", "Y"];
function bhud() {
  $("bth").textContent =
    "적 " +
    "●".repeat(Math.max(0, B.hp)) +
    "○".repeat(Math.max(0, B.MI.hp - B.hp)) +
    "   나 " +
    "♥".repeat(Math.max(0, pl.hp)) +
    "♡".repeat(Math.max(0, maxHp() - pl.hp)) +
    "   별빛 " +
    "◆".repeat(B.g) +
    "◇".repeat(3 - B.g);
  const bs = $("bss");
  bs.innerHTML = "";
  const job = save.job || "knight",
    eqd = save.sk || [];
  for (let i = 0; i < 4; i++) {
    const b = document.createElement("button");
    b.type = "button";
    const k = eqd[i];
    if (i >= slots()) {
      b.textContent = SKEY[i] + " 잠김";
      b.setAttribute("aria-disabled", "true");
      b.onclick = () => {
        $("bm").textContent = "Lv " + [1, 3, 5, 7][i] + "이 되면 열리는 스킬 칸이에요.";
      };
    } else if (k == null) {
      b.textContent = SKEY[i] + " 빈 칸";
      b.setAttribute("aria-disabled", "true");
      b.onclick = () => {
        $("bm").textContent = "마이룸 책장에서 스킬을 장착해요.";
      };
    } else {
      const ef = EFF[SKE[job][k]];
      b.textContent = SKEY[i] + " " + SKL[job][k][0] + " " + "◆".repeat(ef.c);
      if (B.g < ef.c) b.setAttribute("aria-disabled", "true");
      b.onclick = () => useSkill(k);
    }
    bs.appendChild(b);
  }
  hud();
}
let Q = null;
function ask(msg) {
  Q = makeQ(B.MI.dif);
  const job = save.job || "knight";
  if (job === "archer" && skLearned(STUDY.archer)) {
    const i = Q.ch.findIndex((v) => v !== Q.a);
    Q.ch.splice(i, 1);
  }
  $("bq").textContent = Q.q;
  $("bq").classList.toggle("long", Q.q.length > 18);
  $("bm").textContent = msg || "";
  const bc = $("bc");
  bc.innerHTML = "";
  Q.ch.forEach((v, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = i + 1 + ". " + v;
    b.onclick = () => answer(v, b);
    bc.appendChild(b);
  });
  bhud();
  bc.firstChild.focus();
}
function hitMonster(d, msg) {
  B.m.hit = 10;
  if (typeof fxHit === "function") fxHit(d);
  B.hp -= d;
  for (let i = 0; i < 14; i++)
    sp.push({ a: B.m.x - 8 + Math.random() * 16, y: B.m.y - 18 + Math.random() * 16, t: 8 + Math.random() * 8 });
  bhud();
  if (B.hp <= 0) {
    B.end = 1;
    [...$("bc").children].forEach((b) => (b.disabled = true));
    $("bm").textContent = msg;
    setTimeout(win, 650);
  } else ask(msg + " 한 번 더!");
}
function answer(v, btn) {
  if (!B || B.end) return;
  const job = save.job || "knight",
    on = skLearned(STUDY[job]);
  if (v === Q.a) {
    save.solved = (save.solved || 0) + 1;
    let d = atk(),
      note = "";
    B.st = (B.st || 0) + 1;
    if (job === "warrior" && on && B.st >= 2) {
      d++;
      note += " 함성!";
    }
    if (petOn(0) && Math.random() < 0.25) {
      d++;
      note += " 꼬리 응원!";
    }
    if (B.dbl) {
      d *= 2;
      B.dbl = 0;
      note += " 두 배!";
    }
    B.g = Math.min(3, B.g + 1);
    if (Q.wrong && Q.ex) note += "\n방금 문제 풀이: " + Q.ex;
    hitMonster(d, "명중! 피해 " + d + "." + note);
    return;
  }
  btn.disabled = true;
  B.st = 0;
  B.g = Math.max(0, B.g - 1);
  let saved = "";
  if (B.guard) {
    B.guard = 0;
    saved = "스킬로 공격을 막았어요!";
  } else if (petOn(4) && !B.pb) {
    B.pb = 1;
    saved = jo(save.pet.name, "이", "가") + " 몸으로 막았어요!";
  } else if (job === "knight" && on && Math.random() < 0.5) saved = "굳센 마음으로 버텼어요!";
  else if (job === "mage" && on && !B.mg) {
    B.mg = 1;
    saved = "시간 늦추기! 다시 생각해 봐요.";
  }
  if (typeof noteWrong === "function") noteWrong(Q);
  if (saved) {
    if (typeof fxBlock === "function") fxBlock();
    $("bm").textContent = saved + " 다른 답을 골라 봐요.";
    bhud();
    return;
  }
  pl.hp -= B.MI.dmg;
  shakeT = 10;
  if (typeof fxHurt === "function") fxHurt(B.MI.dmg);
  bhud();
  if (pl.hp <= 0) {
    B.end = 1;
    $("bm").textContent = "앗… 쓰러지고 말았어요.";
    setTimeout(lose, 900);
  } else $("bm").textContent = "앗, 공격을 받았어요! 하트 -" + B.MI.dmg + ". 다른 답을 골라 봐요.";
}
function useSkill(k) {
  if (!B || B.end) return;
  const job = save.job,
    t = SKE[job][k],
    ef = EFF[t],
    nm = SKL[job][k][0];
  if (!ef) return;
  if (B.g < ef.c) {
    $("bm").textContent = "별빛 게이지가 모자라요. 문제를 맞혀서 채워요.";
    return;
  }
  B.g -= ef.c;
  if (t === "hit2" || t === "hit3" || t === "ult") {
    const d = { hit2: 2, hit3: 3, ult: 5 }[t];
    shakeT = 4;
    hitMonster(d, nm + "! 피해 " + d + ".");
    return;
  }
  if (t === "guard") B.guard = 1;
  if (t === "heal") pl.hp = Math.min(maxHp(), pl.hp + 2);
  if (t === "double") B.dbl = 1;
  bhud();
  $("bm").textContent = nm + "! " + ef.d + ".";
}
function endBattle() {
  $("bt").hidden = true;
  $("bt").classList.remove("battle");
  mode = "map";
  B = null;
  busy = false;
  save.hp = pl.hp;
  store();
  hud();
  $("stage").focus();
}
function win() {
  const m = B.m,
    MI = B.MI,
    core = B.core,
    c = save.eq.c && EQ[save.eq.c];
  let ex = MI.exp,
    gd = MI.gold;
  if (c && c.exp) ex = Math.round(ex * (1 + c.exp));
  if (c && c.gold) gd = Math.round(gd * (1 + c.gold));
  if (petOn(7)) gd += 2;
  if (c && c.heal) pl.hp = Math.min(maxHp(), pl.hp + c.heal);
  for (let i = 0; i < 20; i++)
    sp.push({ a: m.x - 8 + Math.random() * 16, y: m.y - 16 + Math.random() * 16, t: 8 + Math.random() * 10 });
  m.dead = MI.boss ? 1e9 : 1400;
  QS.forEach((q) => {
    const s0 = save.q[q.id];
    if (q.type === "kill" && q.mon === m.type && s0 && s0.st === "active") s0.k++;
  });
  save.kills++;
  if (typeof sfx === "function") sfx("win");
  endBattle();
  pl.inv = 30;
  gain(ex, gd, MI.dust);
  if (core) {
    mons = mons.filter((x2) => x2 !== m);
    finishCore(core);
    return;
  }
  if (MI.boss) {
    save.boss[M.id] = 1;
    (M.locks[0] || { tiles: [] }).tiles.forEach(([a, y]) => {
      O[y][a] = "";
      ground(M.base.getContext("2d"), a, y);
    });
    store();
    toast(jo(MI.n, "을", "를") + " 물리쳤어요! 길이 열렸어요");
    hud();
  } else toast(jo(MI.n, "을", "를") + " 물리쳤어요! EXP +" + ex + " · 금화 +" + gd + " · 가루 +" + MI.dust);
}
function lose() {
  if (B && B.core) mons = mons.filter((x2) => x2 !== B.m);
  endBattle();
  loadMap("home", 9, 9, true);
  pl.hp = maxHp();
  save.hp = pl.hp;
  store();
  hud();
  toast("쓰러졌어요… 마이룸에서 푹 쉬고 왔어요. 벌칙은 없어요");
}
function runAway() {
  if (!B || B.end) return;
  const m = B.m;
  if (B.core) mons = mons.filter((x2) => x2 !== m);
  endBattle();
  pl.inv = 60;
  const d = pl.x < m.x ? -1 : 1;
  tryMove(pl, d * 18, 0, false);
  toast("무사히 도망쳤어요");
  if (typeof sfx === "function") sfx("run");
}
$("brun").onclick = runAway;
let tab = "me";
const TABS = [
  ["me", "내 정보"],
  ["wrong", "틀린 문제"],
  ["eq", "장비"],
  ["skill", "스킬"],
  ["pet", "펫"],
  ["bag", "가방"],
  ["book", "책"],
];
function openPanel(t) {
  busy = true;
  tab = t;
  renderPanel();
  $("panel").hidden = false;
}
function closePanel() {
  $("panel").hidden = true;
  busy = false;
  hud();
  $("stage").focus();
}
const PANEL = {
  me() {
    const job = save.job,
      need = save.lv * 30,
      pct = Math.round((save.exp / need) * 100),
      stars = Object.values(save.done).reduce((a, d) => a + d.filter(Boolean).length, 0),
      qd = Object.values(save.q).filter((q) => q.st === "done").length;
    let h =
      '<div class="pethead"><canvas class="pv big" data-job="' +
      (job || "none") +
      '" width="22" height="24"></canvas><div><b>' +
      (job ? "견습 " + JOB[job].n : "견습생") +
      "</b><small>" +
      (job ? "스승 " + JOB[job].m : "아직 직업이 없어요. 1부 수련장에서 스승님을 만나 정해요.") +
      "</small></div></div>";
    h +=
      '<div class="grid">' +
      [
        ["레벨", "Lv " + save.lv],
        ["하트", maxHp() + "개"],
        ["공격력", atk()],
        ["금화", save.gold],
        ["별빛 가루", save.dust],
        ["다시 쓴 별빛", stars + "줄"],
        ["물리친 몬스터", save.kills + "마리"],
        ["끝낸 퀘스트", qd + "개"],
        ["읽은 지문", Object.keys(save.read).length + " / " + allSpots().length],
      ]
        .map(([a, b]) => '<div class="st"><span>' + a + "</span><b>" + b + "</b></div>")
        .join("") +
      "</div>";
    return (
      h +
      '<div class="xp"><span>경험치 ' +
      save.exp +
      " / " +
      need +
      '</span><div class="bar"><i style="width:' +
      pct +
      '%"></i></div></div>'
    );
  },
  eq() {
    const worn = Object.values(save.eq);
    let h =
      "<h4>지금 장비</h4>" +
      [
        ["w", "무기"],
        ["a", "옷"],
        ["c", "장신구"],
      ]
        .map(
          ([sl, nm]) =>
            '<div class="it"><span><small>' +
            nm +
            "</small><b>" +
            (save.eq[sl] ? eqName(save.eq[sl]) : "없음") +
            "</b>" +
            (save.eq[sl] ? "<small>" + eqDesc(save.eq[sl]) + "</small>" : "") +
            "</span>" +
            (sl === "c" && save.eq.c ? '<button type="button" data-uneq="c">빼기</button>' : "") +
            "</div>",
        )
        .join("");
    const rest = save.own.filter((id) => !worn.includes(id));
    h +=
      "<h4>가진 장비</h4>" +
      (rest.length
        ? rest
            .map(
              (id) =>
                '<div class="it"><span><b>' +
                eqName(id) +
                "</b><small>" +
                eqDesc(id) +
                '</small></span><button type="button" data-eq="' +
                id +
                '">장착</button></div>',
            )
            .join("")
        : '<p class="hint">퀘스트 보물이나 상점에서 산 장비가 여기에 모여요.</p>');
    const shop = ["w2", "w3", "a2", "a3"].filter((id) => !save.own.includes(id));
    return (
      h +
      "<h4>대장간 상점 · 금화 " +
      save.gold +
      "</h4>" +
      (shop.length
        ? shop
            .map(
              (id) =>
                '<div class="it"><span><b>' +
                eqName(id) +
                "</b><small>" +
                eqDesc(id) +
                '</small></span><button type="button" data-buy="' +
                id +
                '"' +
                (save.gold < EQ[id].price ? ' aria-disabled="true"' : "") +
                ">금화 " +
                EQ[id].price +
                "</button></div>",
            )
            .join("")
        : '<p class="hint">상점 물건을 모두 샀어요!</p>')
    );
  },
  skill() {
    const job = save.job;
    if (!job)
      return '<p class="hint">아직 직업이 없어요. 1부 수련장에서 스승님을 만나 직업을 정하면 스킬북이 채워져요.</p>';
    const sl = slots(),
      eqd = save.sk || [];
    return (
      '<p class="hint">전투 스킬 칸 ' +
      eqd.length +
      " / " +
      sl +
      " (E·R·T·Y, Lv 3·5·7에 한 칸씩 열려요). 문제를 맞히면 별빛 게이지 ◆가 차고, 게이지로 스킬을 써요.</p>" +
      SKL[job]
        .map((s2, i) => {
          const on = skLearned(i),
            st = i === STUDY[job],
            ef = EFF[SKE[job][i]],
            q = eqd.indexOf(i);
          let btn = "";
          if (on && !st)
            btn =
              q >= 0
                ? '<button type="button" data-skoff="' + i + '">' + SKEY[q] + " 빼기</button>"
                : '<button type="button" data-skon="' +
                  i +
                  '"' +
                  (eqd.length >= sl ? ' aria-disabled="true"' : "") +
                  ">장착</button>";
          return (
            '<div class="it' +
            (on ? "" : " lock") +
            '"><span><small>' +
            (i + 1) +
            "부" +
            (st ? " · ★ 늘 켜짐" : " · 게이지 " + ef.c) +
            "</small><b>" +
            s2[0] +
            "</b><small>" +
            (st ? STUDYD[job] : ef.d) +
            "</small></span>" +
            (on ? btn || "<em>배움</em>" : "<em>잠김</em>") +
            "</div>"
          );
        })
        .join("")
    );
  },
  pet() {
    if (!save.pet)
      return (
        '<p class="hint">별빛을 닮은 작은 친구를 데려가요. 모습을 고르고 이름을 지어 주세요.</p><div class="jobs">' +
        Object.entries(PETS)
          .map(
            ([k, v]) =>
              '<button type="button" data-pet="' +
              k +
              '" aria-pressed="' +
              (k === petPick) +
              '"><canvas class="pv" data-sp="' +
              k +
              '" width="20" height="20"></canvas><b>' +
              v +
              "</b></button>",
          )
          .join("") +
        '</div><div class="it"><input id="pname" maxlength="8" value="별이" aria-label="펫 이름"><button type="button" data-petok="1">함께하기</button></div>'
      );
    return (
      '<div class="pethead"><canvas class="pv big" data-sp="' +
      save.pet.sp +
      '" width="20" height="20"></canvas><div><b>' +
      esc(save.pet.name) +
      "</b><small>" +
      PETS[save.pet.sp] +
      ' · 별짐승</small></div></div><div class="it"><input id="pname" maxlength="8" value="' +
      esc(save.pet.name) +
      '" aria-label="펫 이름"><button type="button" data-rename="1">이름 바꾸기</button></div><h4>펫 스킬</h4>' +
      PSK.map(
        ([k2, n, d]) =>
          '<div class="it' +
          (partDone(k2) ? "" : " lock") +
          '"><span><small>' +
          (k2 + 1) +
          "부</small><b>" +
          n +
          "</b><small>" +
          d +
          "</small></span><em>" +
          (partDone(k2) ? "배움" : k2 + 1 + "부를 되살리면") +
          "</em></div>",
      ).join("")
    );
  },
  bag() {
    const mats = Object.entries(save.inv).filter(([k2, v]) => v > 0);
    return (
      "<h4>재료</h4>" +
      (mats.length
        ? mats
            .map(([k2, v]) => '<div class="it"><span><b>' + ITEM[k2] + "</b></span><em>" + v + "개</em></div>")
            .join("")
        : '<p class="hint">길목에서 캔 재료가 여기에 모여요.</p>') +
      "<h4>보물</h4>" +
      (save.items.length
        ? save.items
            .map(
              (n) =>
                '<div class="it"><span><b>' +
                n +
                "</b><small>" +
                (I2E[n] ? EQ[I2E[n]].d + " · 장비 탭에서 장착" : "") +
                "</small></span></div>",
            )
            .join("")
        : '<p class="hint">퀘스트를 끝내면 보물을 받아요.</p>')
    );
  },
  book() {
    const all = [];
    for (const id in MAPS) MAPS[id].spots.forEach((s) => all.push(s));
    all.sort((a, b) => a.no - b.no);
    return (
      '<p class="hint">모험하다 찾은 지문이에요. 지금 ' +
      Object.keys(save.read).length +
      " / " + allSpots().length + "개를 읽었어요.</p>" +
      all
        .map((s) => {
          const r = save.read[s.id];
          return (
            '<div class="it' +
            (r ? "" : " lock") +
            '"><span><small>지문 ' +
            s.no +
            "</small><b>" +
            (r ? "「" + s.t + "」 · " + s.n : "아직 못 찾은 지문") +
            "</b></span>" +
            (r ? '<button type="button" data-read="' + s.id + '">다시 읽기</button>' : "<em>?</em>") +
            "</div>"
          );
        })
        .join("")
    );
  },
};
function renderPanel() {
  $("tabs").innerHTML = TABS.map(
    ([id, n]) => '<button type="button" data-tab="' + id + '" aria-pressed="' + (id === tab) + '">' + n + "</button>",
  ).join("");
  $("pc").innerHTML = PANEL[tab]();
  document.querySelectorAll("#pc canvas.pv").forEach((c) => {
    const q = c.getContext("2d");
    q.clearRect(0, 0, c.width, c.height);
    if (c.dataset.sp) petDraw((a, y, w, h, col) => P(q, a + 2, y, w, h, col), c.dataset.sp, fr, false);
    else
      person((a, y, w, h, col) => P(q, a + 3, y + 4, w, h, col), 0, 1, { ...JL[c.dataset.job], n: "나" }, false, "d");
  });
}
$("panel").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.id === "px") return;
  const d = b.dataset;
  if (d.tab) {
    tab = d.tab;
    renderPanel();
    return;
  }
  if (d.read) {
    const s = Object.values(MAPS)
      .flatMap((m) => m.spots)
      .find((s) => s.id === d.read);
    closePanel();
    openBook(s);
    return;
  }
  if (d.eq) save.eq[EQ[d.eq].s] = d.eq;
  else if (d.uneq) save.eq.c = null;
  else if (d.buy) {
    const it = EQ[d.buy];
    if (save.gold < it.price) {
      toast("금화가 " + (it.price - save.gold) + " 모자라요");
      return;
    }
    save.gold -= it.price;
    save.own.push(d.buy);
    save.eq[it.s] = d.buy;
    toast(eqName(d.buy) + "을(를) 샀어요");
  } else if (d.skon != null) {
    if (save.sk.length >= slots()) {
      toast("스킬 칸이 가득 찼어요. 하나를 빼고 장착해요");
      return;
    }
    save.sk.push(+d.skon);
  } else if (d.skoff != null) save.sk = save.sk.filter((k) => k !== +d.skoff);
  else if (d.pet) petPick = d.pet;
  else if (d.petok || d.rename) {
    const nm2 = ($("pname").value || "").trim().slice(0, 8) || "별이";
    if (d.petok) {
      save.pet = { sp: petPick, name: nm2 };
      pet.x = pl.x - 12;
      pet.y = pl.y;
      toast(jo(nm2, "과", "와") + " 함께해요!");
    } else {
      save.pet.name = nm2;
      toast("이름을 " + nm2 + "(으)로 바꿨어요");
    }
  }
  pl.hp = Math.min(Math.max(pl.hp, 1), maxHp());
  if (M.kind !== "route" && M.kind !== "dead") pl.hp = maxHp();
  save.hp = pl.hp;
  store();
  hud();
  renderPanel();
});
$("px").onclick = closePanel;
function openFT() {
  if (busy) return;
  const L = $("ftl");
  L.innerHTML =
    '<b style="color:#f5e3a3;font-weight:400">별의 나침반 · 어디로 갈까요?</b>' +
    Object.keys(save.towns)
      .map(
        (id) =>
          '<button type="button" data-to="' +
          id +
          '">' +
          MAPS[id].n +
          (id === M.id ? " (지금 여기)" : "") +
          "</button>",
      )
      .join("") +
    '<button type="button" data-to="">닫기</button>';
  L.hidden = false;
  busy = true;
  L.querySelector("button").focus();
}
$("ftl").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  $("ftl").hidden = true;
  busy = false;
  const to = b.dataset.to;
  if (to && to !== M.id) {
    saveEx();
    loadMap(to, MAPS[to].spawn[0], MAPS[to].spawn[1]);
    toast("별의 나침반으로 " + M.short + "에 왔어요");
  }
});
$("ftb").onclick = openFT;
$("homeb").onclick = () => {
  if (busy || mode !== "map") return;
  saveEx();
  loadMap("home", 9, 10);
};
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  const c = e.code;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(c) && e.target.tagName !== "BUTTON")
    e.preventDefault();
  if (!$("panel").hidden) {
    if (c === "Escape") closePanel();
    return;
  }
  if (mode === "battle" && B) {
    if (/^Digit[1-3]$/.test(c)) {
      const b = $("bc").children[+c.slice(5) - 1];
      if (b && !b.disabled) b.click();
    }
    const si = SKEY.indexOf(c.replace("Key", ""));
    if (si >= 0 && c.startsWith("Key")) {
      const b = $("bss").children[si];
      if (b) b.click();
    }
    if (c === "Escape") runAway();
    return;
  }
  if (!$("bt").hidden) {
    if (/^Digit[1-3]$/.test(c)) {
      const b = $("bc").children[+c.slice(5) - 1];
      if (b && !b.disabled) b.click();
    }
    return;
  }
  if (c === "Escape" && bk) {
    closeBook();
    return;
  }
  if (c === "Space" || c === "Enter") {
    if (e.target.tagName === "BUTTON" && (!dl || e.target.closest("#dch"))) return;
    if (dl) {
      nextDlg();
      return;
    }
    if (!busy) interact(near());
    return;
  }
  if (c === "KeyJ" || c === "KeyZ") {
    jump();
    return;
  }
  if (c === "KeyQ") {
    attack();
    return;
  }
  if (c === "KeyM") {
    toggleMap();
    return;
  }
  keys[c] = true;
});
addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
const clearKeys = () => {
  for (const k in keys) keys[k] = false;
};
addEventListener("blur", clearKeys);
document.addEventListener("visibilitychange", clearKeys);
function petFollow() {
  if (!save.pet) return;
  const tx = pl.x - pl.dir * 12,
    ty = pl.y + 1,
    ex = tx - pet.x,
    ey = ty - pet.y,
    d = Math.hypot(ex, ey);
  if (d > 80) {
    pet.x = tx;
    pet.y = ty;
    return;
  }
  if (d > 3) {
    const v = Math.min(2.2, 0.4 + d * 0.06);
    pet.x += (ex / d) * v;
    pet.y += (ey / d) * v;
    pet.dir = ex > 0 ? 1 : -1;
    pet.mv = true;
    if (tk % 3 === 0) pet.f++;
  } else {
    pet.mv = false;
    pet.dir = pl.dir;
  }
}
function update() {
  if (pl.atk > 0) pl.atk--;
  if (shakeT > 0) shakeT--;
  if (busy || mode !== "map") {
    pl.mv = false;
    return;
  }
  if (pl.inv > 0) pl.inv--;
  const [dx, dy] = dirKeys();
  if (pl.air) {
    pl.z += pl.vz;
    pl.vz -= 0.32;
    tryMove(pl, pl.jx, 0, true);
    tryMove(pl, 0, pl.jy, true);
    if (pl.z <= 0) {
      pl.z = 0;
      if (hitbox(pl.x, pl.y, false)) {
        if (pl.air < 12 && (pl.jx || pl.jy)) {
          pl.z = 0.5;
          pl.vz = 0.6;
          pl.air++;
        } else {
          pl.x = pl.sx;
          pl.y = pl.sy;
          pl.air = 0;
        }
      } else pl.air = 0;
    }
  } else if (dx || dy) {
    const l = Math.hypot(dx, dy);
    tryMove(pl, (dx / l) * 1.4, 0, false);
    tryMove(pl, 0, (dy / l) * 1.2, false);
    if (dx) pl.dir = dx > 0 ? 1 : -1;
    pl.face = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "u" : "d") : "s";
    pl.mv = true;
    if (tk % 3 === 0) pl.f++;
  } else pl.mv = false;
  petFollow();
  const ptx = Math.floor(pl.x / T),
    pty = Math.floor((pl.y - 2) / T);
  for (const e of M.exits) {
    if (ptx >= e.x0 && ptx <= e.x1 && pty >= e.y0 && pty <= e.y1) {
      if (e.need && !e.need()) {
        if (tk - (window._xt || 0) > 50) {
          window._xt = tk;
          toast(e.msg ? e.msg() : "아직 지나갈 수 없어요");
        }
        pl.x -= e.d === "r" ? 6 : e.d === "l" ? -6 : 0;
        pl.y += e.d === "u" ? 6 : e.d === "d" ? -6 : 0;
        return;
      }
      saveEx();
      const at = e.at[1] === 0 && e.to === "r2" ? [1, py2(0)] : e.at;
      loadMap(e.to, at[0], at[1]);
      return;
    }
  }
  let ch = false;
  for (let y = pty - 6; y <= pty + 6; y++)
    for (let a = ptx - 8; a <= ptx + 8; a++)
      if (y >= 0 && a >= 0 && y < MH && a < MW && !EXP[y][a]) {
        EXP[y][a] = true;
        ch = true;
      }
  if (ch && tk % 40 === 0) saveEx();
  nodes.forEach((n) => {
    if (n.g > 0) n.g--;
  });
  npcs.forEach((n) => {
    if (n.still || n.talk) return;
    if (n.wait > 0) {
      n.wait--;
      n.mv = false;
      return;
    }
    const ex = n.tx - n.x,
      ey = n.ty - n.y,
      d = Math.hypot(ex, ey);
    if (d < 1) {
      n.wait = 40 + Math.random() * 90;
      n.tx = n.hx + (Math.random() - 0.5) * 56;
      n.ty = n.hy + (Math.random() - 0.5) * 40;
      n.mv = false;
      return;
    }
    const ox = n.x,
      oy = n.y;
    tryMove(n, (ex / d) * 0.5, (ey / d) * 0.5, false);
    if (ox === n.x && oy === n.y) {
      n.tx = n.x;
      n.ty = n.y;
    }
    n.dir = ex > 0 ? 1 : -1;
    n.face = Math.abs(ey) > Math.abs(ex) ? (ey < 0 ? "u" : "d") : "s";
    n.mv = true;
    if (tk % 4 === 0) n.f++;
  });
  for (const m of mons) {
    if (m.dead > 0) {
      if (m.dead < 1e8 && --m.dead === 0) {
        m.x = m.hx;
        m.y = m.hy;
      }
      continue;
    }
    const MI = MON[m.type];
    const ddx = pl.x - m.x,
      ddy = pl.y - m.y,
      d = Math.hypot(ddx, ddy);
    if (d < 10 && pl.inv <= 0 && pl.z < 5) {
      startBattle(m, false);
      return;
    }
    if (MI.boss) continue;
    if (d < 56 && pl.inv <= 0) {
      const ox = m.x,
        oy = m.y;
      tryMove(m, (ddx / d) * MI.spd, (ddy / d) * MI.spd * 0.85, false);
      m.dir = ddx > 0 ? 1 : -1;
      m.mv = !(ox === m.x && oy === m.y);
      if (tk % 4 === 0) m.f++;
      continue;
    }
    if (m.wait > 0) {
      m.wait--;
      m.mv = false;
      continue;
    }
    const ex = m.tx - m.x,
      ey = m.ty - m.y,
      dd = Math.hypot(ex, ey);
    if (dd < 1) {
      m.wait = 30 + Math.random() * 80;
      m.tx = m.hx + (Math.random() - 0.5) * 64;
      m.ty = m.hy + (Math.random() - 0.5) * 48;
      continue;
    }
    const ox = m.x,
      oy = m.y;
    tryMove(m, (ex / dd) * MI.spd * 0.6, (ey / dd) * MI.spd * 0.6, false);
    if (ox === m.x && oy === m.y) {
      m.tx = m.x;
      m.ty = m.y;
    }
    m.dir = ex > 0 ? 1 : -1;
    m.mv = true;
    if (tk % 4 === 0) m.f++;
  }
}
function mapper(px, py, fl, z, S) {
  S = S || 1;
  return (a, y, w, h, col) =>
    P(x, fl ? px + (8 - (a + w)) * S : px + (a - 8) * S, py + (y - 18) * S - (z || 0), w * S, h * S, col);
}
function drawNPC(n) {
  const px = Math.round(n.x - cam.x),
    py = Math.round(n.y - cam.y),
    r = mapper(px, py, n.dir < 0);
  if (n.owl) owl(r, Math.round(Math.sin((tk + px) / 9) * 1.5) - 4, fr);
  else person(r, n.mv ? n.f % 2 : (fr + px) % 8 < 4 ? 0 : 1, n.mv ? n.f : fr, n, n.mv, n.face);
}
function drawPl() {
  const px = Math.round(pl.x - cam.x) + (typeof fxLunge === "function" ? fxLunge(pl) : 0),
    py = Math.round(pl.y - cam.y),
    z = Math.round(pl.z);
  if (pl.inv > 0 && tk % 4 < 2 && (M.kind === "route" || M.kind === "dead")) return;
  P(x, px - 4, py, 8, 1, "rgba(0,0,0," + (z ? 0.15 : 0.22) + ")");
  person(
    mapper(px, py, pl.dir < 0, z),
    z ? 0 : pl.mv ? pl.f % 2 : fr % 8 < 4 ? 0 : 1,
    pl.mv ? pl.f : fr,
    { ...JL[save.job || "none"], n: "나", noSh: 1 },
    pl.mv && !z,
    pl.face,
  );
  if (pl.atk > 0) {
    const k = 10 - pl.atk,
      fx = px + (pl.face === "s" ? pl.dir * 12 : 0),
      fy = py - 8 + (pl.face === "u" ? -12 : pl.face === "d" ? 8 : 0);
    for (let i = 0; i < 6; i++) {
      const an = (k / 10) * Math.PI + i * 0.25;
      P(x, fx + Math.cos(an) * 8, fy + Math.sin(an) * 5, 2, 2, i % 2 ? "#ffffff" : "#ffd86b");
    }
  }
}
function drawPet() {
  const r = mapper(Math.round(pet.x - cam.x), Math.round(pet.y - cam.y), pet.dir < 0);
  petDraw(r, save.pet.sp, pet.mv ? pet.f : fr, pet.mv);
}
function drawMon(m) {
  if (m.dead) return;
  if (m.hit > 0) {
    m.hit--;
    if (m.hit % 2) return;
  }
  const MI = MON[m.type],
    px = Math.round(m.x - cam.x) + (typeof fxLunge === "function" ? fxLunge(m) : 0),
    py = Math.round(m.y - cam.y),
    S = MI.boss ? 2 : 1;
  MI.dr(mapper(px, py, m.dir < 0, 0, S), m.mv ? m.f % 2 : (fr + px) % 8 < 4 ? 0 : 1, m.mv ? m.f : fr, m.mv);
}
function drawNode(n) {
  (n.t === "cog" || n.t === "spark" ? nodeDraw2 : nodeDraw)(
    mapper(Math.round(n.x - cam.x), Math.round(n.y - cam.y), false),
    n.t,
    !n.g,
    fr + Math.round(n.x),
  );
}
function bubble(bx, by) {
  P(x, bx - 6, by - 6, 13, 8, "#2b2b2b");
  P(x, bx - 5, by - 5, 11, 6, "#ffffff");
  P(x, bx - 1, by + 2, 3, 2, "#2b2b2b");
  for (let i = 0; i < 3; i++) if ((fr >> 1) % 4 > i) P(x, bx - 3 + i * 3, by - 2, 1, 1, "#2b2b2b");
}
function star(cx, cy) {
  const s2 = fr % 6 < 3 ? 3 : 4;
  P(x, cx - s2, cy, 2 * s2 + 1, 1, "#ffd86b");
  P(x, cx, cy - s2, 1, 2 * s2 + 1, "#ffd86b");
  P(x, cx - 1, cy - 1, 3, 3, "#fff6d0");
}
function drawGoal() {
  const g = goal();
  if (!g) return;
  const sx = g.x - cam.x,
    sy = g.y - cam.y;
  if (sx > 10 && sx < W - 10 && sy > 30 && sy < H - 6) {
    const ax = Math.round(sx),
      ay = Math.round(sy) - 36 + Math.round(Math.sin(fr / 3) * 2);
    P(x, ax - 2, ay - 6, 5, 7, "#2b2b2b");
    P(x, ax - 1, ay - 5, 3, 6, "#ffd86b");
    for (let i = 0; i < 5; i++) {
      P(x, ax - 6 + i, ay + i, 13 - 2 * i, 2, "#2b2b2b");
      P(x, ax - 5 + i, ay + i, 11 - 2 * i, 1, i % 2 ? "#ffb84a" : "#ffd86b");
    }
    return;
  }
  const L0 = 14,
    R0 = W - 14,
    T0 = 40,
    B0 = H - 14,
    cx = (L0 + R0) / 2,
    cy = (T0 + B0) / 2,
    dx = sx - cx,
    dy = sy - cy,
    ang = Math.atan2(dy, dx),
    t = Math.min((R0 - cx) / Math.max(Math.abs(dx), 0.01), (B0 - cy) / Math.max(Math.abs(dy), 0.01)),
    ex = cx + dx * t;
  let ey = cy + dy * t;
  if (save.mm && ex > W - 90 && ey < 90) ey = 90;
  x.save();
  x.translate(Math.round(ex), Math.round(ey));
  x.rotate(ang);
  x.fillStyle = "#2b2b2b";
  x.beginPath();
  x.moveTo(10, 0);
  x.lineTo(-7, -8);
  x.lineTo(-3, 0);
  x.lineTo(-7, 8);
  x.closePath();
  x.fill();
  x.fillStyle = fr % 8 < 6 ? "#ffd86b" : "#fff1b0";
  x.beginPath();
  x.moveTo(7, 0);
  x.lineTo(-5, -5);
  x.lineTo(-2, 0);
  x.lineTo(-5, 5);
  x.closePath();
  x.fill();
  x.restore();
}
function drawMap() {
  // 싸울 때는 주인공과 몬스터 가운데를 화면 위쪽에 둔다(아래쪽은 문제 상자)
  const fx0 = B ? (pl.x + B.m.x) / 2 : pl.x,
    fy0 = B ? (pl.y + B.m.y) / 2 + H * 0.2 : pl.y;
  cam.x = Math.max(0, Math.min(WW - W, Math.round(fx0 - W / 2)));
  cam.y = Math.max(0, Math.min(WH - H, Math.round(fy0 - H / 2 - 6)));
  if (WW <= W) cam.x = Math.round((WW - W) / 2);
  if (WH <= H) cam.y = Math.round((WH - H) / 2);
  x.fillStyle = "#14112a";
  x.fillRect(0, 0, W, H);
  x.drawImage(M.base, -cam.x, -cam.y);
  if (typeof drawFade === "function") drawFade(); // 되살리기 전 바랜 마을 → src/08-ui.js
  const tx0 = Math.floor(cam.x / T),
    ty0 = Math.floor(cam.y / T);
  for (let y = Math.max(0, ty0); y <= ty0 + Math.ceil(H / T) && y < MH; y++)
    for (let a = Math.max(0, tx0); a <= tx0 + Math.ceil(W / T) && a < MW; a++) {
      const g = G[y][a],
        X = a * T - cam.x,
        Y = y * T - cam.y;
      if (g === "~") {
        const k = hsh(a, y);
        if ((fr + k) % 14 < 5) P(x, X + (k % 10), Y + ((k >> 4) % 14), 4, 1, "#cfe6f6");
      }
      if (g === "-") {
        const o = (fr + a * 3) % 16;
        P(x, X + 3, Y + o, 1, 3, "#b5dcf2");
      }
      if (O[y][a] === "X") {
        x.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) P(x, X - 6 + ((fr * 0.4 + i * 9 + y * 5) % 20), Y + i * 5, 18, 4, "#f6f3ea");
        x.globalAlpha = 1;
      }
      const key = a + "," + y;
      if (ER.has(key) && !PATCH[ER.get(key)].done) {
        const pi = ER.get(key),
          core = PATCH[pi].core;
        x.drawImage(M.sketch, a * T, y * T, T, T, X, Y, T, T);
        const nb = (dx, dy) => {
          const k2 = a + dx + "," + (y + dy);
          return ER.has(k2) && ER.get(k2) === pi;
        };
        const ec = core ? "#e0b040" : "#cfc7b5";
        if (!nb(0, -1)) for (let i = 0; i < 16; i++) P(x, X + i, Y + (hsh(a * 16 + i, y) % 2), 1, 1, ec);
        if (!nb(0, 1)) for (let i = 0; i < 16; i++) P(x, X + i, Y + 15 - (hsh(a * 16 + i, y + 1) % 2), 1, 1, ec);
        if (!nb(-1, 0)) for (let i = 0; i < 16; i++) P(x, X + (hsh(a, y * 16 + i) % 2), Y + i, 1, 1, ec);
        if (!nb(1, 0)) for (let i = 0; i < 16; i++) P(x, X + 15 - (hsh(a + 1, y * 16 + i) % 2), Y + i, 1, 1, ec);
        if ((fr + a * 5 + y * 3) % 23 === 0) P(x, X + (hsh(a, y) % 14), Y + (hsh(y, a) % 14), 2, 2, "#ffd86b");
      }
    }
  M.exits.forEach((e) => {
    if (e.need && !e.need()) return;
    if (fr % 12 >= 8) return;
    for (let yy = e.y0; yy <= e.y1; yy++)
      for (let a = e.x0; a <= e.x1; a++) {
        const X = a * T + 8 - cam.x,
          Y = yy * T + 8 - cam.y,
          d = e.d;
        for (let i = 0; i < 4; i++) {
          if (d === "r") P(x, X - 2 + i, Y - 3 + i, 1, 7 - 2 * i, "#ffd86b");
          if (d === "l") P(x, X + 2 - i, Y - 3 + i, 1, 7 - 2 * i, "#ffd86b");
          if (d === "u") P(x, X - 3 + i, Y + 2 - i, 7 - 2 * i, 1, "#ffd86b");
          if (d === "d") P(x, X - 3 + i, Y - 2 + i, 7 - 2 * i, 1, "#ffd86b");
        }
      }
  });
  M.spots.forEach((s) => {
    if (!save.read[s.id] && (fr + s.tx) % 16 < 8) P(x, s.tx * T + 13 - cam.x, s.ty * T - 2 - cam.y, 2, 2, "#ffd86b");
  });
  M.bld.forEach((b) => {
    if (b.tower && b.lit) {
      x.globalAlpha = 0.25 + 0.1 * Math.sin(fr / 5);
      disc(x, Math.round(b.x * T + (b.w * T) / 2 - cam.x), b.y * T + 9 - cam.y, 9, "#ffe9a0");
      x.globalAlpha = 1;
    }
  });
  const L = [
    ...nodes.map((n) => ({ y: n.y - 0.5, d: () => drawNode(n) })),
    ...npcs.map((n) => ({ y: n.y, d: () => drawNPC(n) })),
    ...mons.map((m) => ({ y: m.y, d: () => drawMon(m) })),
    { y: pl.y, d: drawPl },
    ...(save.pet ? [{ y: pet.y - 0.1, d: drawPet }] : []),
  ];
  L.sort((a, b) => a.y - b.y).forEach((o) => o.d());
  x.drawImage(M.over, -cam.x, -cam.y);
  npcs.forEach((n) => {
    const qm = qmark(n);
    if (qm)
      glyph(qm[0], qm[1], Math.round(n.x - cam.x), Math.round(n.y - cam.y) - 30 + (n.owl ? -4 : 0) + (n.small ? 2 : 0));
  });
  if (!busy) drawGoal();
  const t = busy ? null : near();
  if (t) {
    const o = t.ref;
    if (t.type === "npc") {
      if (!qmark(o)) bubble(Math.round(o.x - cam.x), Math.round(o.y - cam.y) - 26 + (o.owl ? -4 : 0));
    } else if (t.type === "spot" || t.type === "chest") star(o.tx * T + 8 - cam.x, o.ty * T - 6 - cam.y);
    else if (t.type === "door") star(o.dx * T + 8 - cam.x, o.dy * T - cam.y);
    else if (t.type === "node") star(Math.round(o.x - cam.x), Math.round(o.y - cam.y) - 16);
    else if (t.type === "fur") star(Math.round((o.x + (o.w || 2) / 2) * T - cam.x), o.y * T - 10 - cam.y);
    else if (t.type === "patch") star(Math.round(pl.x - cam.x), Math.round(pl.y - cam.y) - 26);
  }
  const lab = t
    ? {
        npc: () => t.ref.n + "에게 말 걸기",
        spot: () => t.ref.n + " 읽기",
        chest: () => "보물 상자 열기",
        door: () => t.ref.n + " 들어가기",
        lock: () => "막힌 길 살펴보기",
        mon: () => jo(MON[t.ref.type].n, "과", "와") + " 싸우기",
        node: () => ITEM[t.ref.t] + " 캐기",
        fur: () => t.ref.n,
        patch: () => (t.ref.core ? "핵심 자리 다시 쓰기 · 가루 6" : "다시 쓰기 · 가루 3"),
      }[t.type]()
    : "";
  if (lab !== lastAct) {
    lastAct = lab;
    $("act").textContent = lab;
    $("act").hidden = !lab;
  }
  if (typeof drawFx === "function") drawFx(); // 피해 숫자·이펙트 → src/08-ui.js
  sp = sp.filter((p) => p.t-- > 0);
  sp.forEach((p) => {
    p.y -= 0.5;
    P(x, p.a - cam.x, p.y - cam.y, 1, 3, "#ffd86b");
    P(x, p.a - 1 - cam.x, p.y + 1 - cam.y, 3, 1, "#fff3c4");
  });
  if (save.mm && tk % 6 === 0) drawMini();
}
function frame() {
  tk++;
  fr = tk >> 1;
  update();
  cv.style.transform = shakeT ? "translateX(" + (shakeT % 2 ? 3 : -3) + "px)" : "";
  drawMap();
}
const mcx = $("mmc").getContext("2d");
function drawMini() {
  const CL = {
      "~": "#3a6ea5",
      "-": "#5aa6dc",
      b: "#a07850",
      "#": "#6b5a48",
      "^": "#8fbd52",
      ":": "#d9b87e",
      s: "#e0cc98",
      q: "#cdb488",
      H: "#b9ad98",
      F: "#b9875a",
      W: "#e9dcc7",
    },
    th = TH[M.theme];
  for (let y = 0; y < MH; y++)
    for (let a = 0; a < MW; a++) {
      let col = "#14112a";
      if (EXP[y][a]) {
        const o = O[y][a],
          k = a + "," + y;
        col = CL[G[y][a]] || th.g1;
        if (o === "T") col = th.tr[0];
        if (o === "B" || o === "U") col = "#c0805a";
        if (o === "X") col = "#ffffff";
        if (o === "K") col = M.spots.some((s) => s.tx === a && s.ty === y && !save.read[s.id]) ? "#f48fb1" : "#c9a24a";
        if (o === "C") col = save.chest.d1c ? "#7a573b" : "#ffd86b";
        if (ER.has(k) && !PATCH[ER.get(k)].done) col = "#f6f3ea";
      }
      mcx.fillStyle = col;
      mcx.fillRect(a * 2, y * 2, 2, 2);
    }
  mons.forEach((m) => {
    const ty = Math.floor(m.y / T),
      tx = Math.floor(m.x / T);
    if (m.dead || !EXP[ty] || !EXP[ty][tx]) return;
    mcx.fillStyle = MON[m.type].boss ? "#ff4a6a" : "#e24b4a";
    mcx.fillRect(tx * 2, ty * 2, 2, 2);
  });
  if (fr % 4 < 3) {
    mcx.fillStyle = "#ffd86b";
    mcx.fillRect(Math.floor(pl.x / T) * 2 - 1, Math.floor(pl.y / T) * 2 - 1, 3, 3);
  }
  const g = goal();
  if (g && fr % 8 < 5) {
    mcx.fillStyle = "#ff9f43";
    mcx.fillRect(Math.floor(g.x / T) * 2 - 1, Math.floor(g.y / T) * 2 - 1, 3, 3);
  }
}
function mmState() {
  $("mmp").hidden = !save.mm;
  $("mmb").textContent = save.mm ? "지도 접기 ▴" : "지도 ▾";
  $("mmb").setAttribute("aria-expanded", String(!!save.mm));
}
function toggleMap() {
  save.mm = !save.mm;
  store();
  mmState();
  if (save.mm) drawMini();
}
$("mmb").onclick = toggleMap;
mmState();
$("reset").onclick = () => {
  if (!confirm("저장된 진행을 지우고 처음부터 시작할까요?")) return;
  try {
    localStorage.removeItem("arca-v2");
  } catch (e) {}
  location.reload();
};
if (window.matchMedia && matchMedia("(pointer: coarse)").matches) {
  $("pad").hidden = false;
  $("btns").hidden = false;
}
document.querySelectorAll("#pad button").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys[k] = true;
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => (keys[k] = false)));
});
$("bK").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  attack();
});
$("bJ").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  jump();
});
$("bA").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (dl) nextDlg();
  else if (!busy) interact(near());
});
pl.hp = save.hp || maxHp();
(function start() {
  const id = MAPS[save.map] ? save.map : "home";
  const m = MAPS[id],
    sp0 =
      m.spawn ||
      (id === "r1"
        ? [1, py1(1)]
        : id === "r2"
          ? [1, py2(1)]
          : id === "r3"
            ? [1, 6]
            : id === "d1"
              ? [14, 22]
              : [14, 19]);
  loadMap(id, sp0[0], sp0[1]);
  if (pl.hp <= 0) pl.hp = maxHp();
  hud();
  if (!save.met.momo)
    setTimeout(() => {
      if (M.id === "home") toast("아래쪽 문으로 나가 모험을 시작해요");
    }, 1600);
})();
setInterval(frame, 50);
