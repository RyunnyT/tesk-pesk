const BLOCKG = new Set(["~", "-", "#", "W"]),
  JUMPG = new Set(["-"]),
  JUMPO = new Set(["f", "r", "l"]);
function blk(tx, ty, air) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const o = O[ty][tx],
    g = G[ty][tx];
  if (o) {
    if (air && JUMPO.has(o)) return false;
    return true;
  }
  if (BLOCKG.has(g)) return !(air && JUMPG.has(g));
  return false;
}
const isGrass = (c) => c === "." || c === "," || c === "^";
function ground(c, tx, ty) {
  const X = tx * T,
    Y = ty * T,
    g = G[ty][tx],
    th = TH[M.theme],
    nb = (dx, dy) => {
      const y = ty + dy,
        a = tx + dx;
      return y < 0 || a < 0 || y >= MH || a >= MW ? g : G[y][a];
    };
  if (g === "." || g === ",") {
    P(c, X, Y, T, T, th.g);
    for (let i = 0; i < 6; i++) {
      const k = hsh(tx * 7 + i, ty * 3);
      P(c, X + (k % 16), Y + ((k >> 4) % 16), 1, 1 + ((k >> 8) % 2), (k >> 9) % 2 ? th.g1 : th.g2);
    }
    if (g === ",") {
      for (let i = 0; i < 3; i++) {
        const k = hsh(tx + i * 31, ty * 5 + i);
        const col =
          M.theme === "dead"
            ? ["#b39ddb", "#7fd6ff", "#d6c8f0"][k % 3]
            : ["#f48fb1", "#ffd54f", "#ffffff", "#b39ddb"][k % 4];
        P(c, X + 2 + (k % 12), Y + 2 + ((k >> 5) % 12), 1, 1, col);
        P(c, X + 3 + (k % 12), Y + 3 + ((k >> 5) % 12), 1, 1, th.g1);
      }
    }
  } else if (g === "^") {
    P(c, X, Y, T, T, "#a3c96a");
    for (let i = 0; i < 5; i++) {
      const k = hsh(tx * 5 + i, ty * 9);
      P(c, X + (k % 16), Y + ((k >> 4) % 16), 1, 1, (k >> 9) % 2 ? "#93bb5c" : "#b4d47e");
    }
    if (nb(0, 1) === "#") P(c, X, Y + 14, T, 2, "#bcd98c");
  } else if (g === ":" || g === "q") {
    P(c, X, Y, T, T, g === ":" ? (M.theme === "dead" ? "#9a8a6e" : "#e0c08a") : "#d9c193");
    for (let i = 0; i < 5; i++) {
      const k = hsh(tx * 11 + i, ty * 13);
      P(c, X + (k % 16), Y + ((k >> 4) % 16), 1 + ((k >> 8) % 2), 1, M.theme === "dead" ? "#857660" : "#c9a46a");
    }
    [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ].forEach(([dx, dy]) => {
      if (isGrass(nb(dx, dy))) {
        const col = th.edge;
        if (dy === -1) for (let i = 0; i < 16; i += 2) P(c, X + i, Y, 1, 1 + (hsh(tx + i, ty) % 2), col);
        if (dy === 1)
          for (let i = 0; i < 16; i += 2)
            P(c, X + i, Y + 15 - (hsh(tx + i, ty + 1) % 2), 1, 1 + (hsh(tx + i, ty + 1) % 2), col);
        if (dx === -1) for (let i = 0; i < 16; i += 2) P(c, X, Y + i, 1 + (hsh(tx, ty + i) % 2), 1, col);
        if (dx === 1)
          for (let i = 0; i < 16; i += 2)
            P(c, X + 15 - (hsh(tx + 1, ty + i) % 2), Y + i, 1 + (hsh(tx + 1, ty + i) % 2), 1, col);
      }
    });
  } else if (g === "s") {
    P(c, X, Y, T, T, "#ead6a6");
    for (let i = 0; i < 5; i++) {
      const k = hsh(tx * 3 + i, ty * 7);
      P(c, X + (k % 16), Y + ((k >> 4) % 16), 1, 1, "#d9c08a");
    }
  } else if (g === "~") {
    P(c, X, Y, T, T, "#4a8fca");
    for (let i = 0; i < 3; i++) {
      const k = hsh(tx * 17 + i, ty * 19);
      P(c, X + (k % 12), Y + ((k >> 4) % 16), 4, 1, "#5f9fd6");
    }
  } else if (g === "-" || g === "b") {
    P(c, X, Y, T, T, M.theme === "dead" ? "#4a6fa0" : "#5aa6dc");
    [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ].forEach(([dx, dy]) => {
      const n = nb(dx, dy);
      if (n !== "-" && n !== "b") {
        if (dx) P(c, dx < 0 ? X : X + 15, Y, 1, T, "#3d7aa8");
        else P(c, X, dy < 0 ? Y : Y + 15, T, 1, "#3d7aa8");
      }
    });
    for (let i = 0; i < 2; i++) {
      const k = hsh(tx * 23 + i, ty * 29);
      P(c, X + 2 + (k % 10), Y + ((k >> 4) % 16), 3, 1, "#86c0e4");
    }
    if (g === "b") {
      const hor = [":", "b"].includes(nb(-1, 0)) || [":", "b"].includes(nb(1, 0));
      if (hor) {
        P(c, X, Y + 1, T, 14, "#a07850");
        for (let a = 0; a < 16; a += 4) P(c, X + a, Y + 1, 1, 14, "#7a573b");
        P(c, X, Y + 1, T, 1, "#5e3f29");
        P(c, X, Y + 14, T, 1, "#5e3f29");
      } else {
        P(c, X + 1, Y, 14, T, "#a07850");
        for (let y = 0; y < 16; y += 4) P(c, X + 1, Y + y, 14, 1, "#7a573b");
      }
    }
  } else if (g === "#") {
    P(c, X, Y, T, T, "#8c7a66");
    for (let i = 0; i < 4; i++) {
      const k = hsh(tx * 5 + i, ty);
      P(c, X + (k % 14), Y + 4 + ((k >> 4) % 10), 2, 1, "#7a6856");
    }
    P(c, X, Y + 5, T, 1, "#7a6856");
    P(c, X, Y + 10, T, 1, "#7a6856");
    P(c, X, Y, T, 3, "#a3c96a");
    P(c, X, Y + 14, T, 2, "#5a4a3a");
  } else if (g === "F") {
    P(c, X, Y, T, T, "#b9875a");
    for (let y = 0; y < 16; y += 8) P(c, X, Y + y, T, 1, "#a37449");
    P(c, X + (ty % 2 ? 4 : 12), Y, 1, 8, "#a37449");
    P(c, X + (ty % 2 ? 12 : 4), Y + 8, 1, 8, "#a37449");
    const k = hsh(tx, ty);
    P(c, X + (k % 14), Y + ((k >> 4) % 14), 2, 1, "#c4935f");
  } else if (g === "W") {
    P(c, X, Y, T, T, "#e9dcc7");
    for (let a = 0; a < 16; a += 8) P(c, X + a, Y, 4, T, "#e2d3bb");
    if (nb(0, 1) === "F") {
      P(c, X, Y + 8, T, 8, "#a8774f");
      P(c, X, Y + 8, T, 1, "#c99a6c");
      P(c, X, Y + 15, T, 1, "#6b4a32");
    }
    if (nb(0, -1) !== "W" && ty === 0) P(c, X, Y, T, 3, "#c9b291");
  } else if (g === "H") {
    P(c, X, Y, T, T, "#b9ad98");
    for (let y = 0; y < 16; y += 4) {
      P(c, X, Y + y, T, 1, "#8c7a66");
      P(c, X, Y + y + 1, T, 1, "#d0c6b4");
    }
    P(c, X, Y, 1, T, "#8c7a66");
    P(c, X + 15, Y, 1, T, "#8c7a66");
  }
}
function objDraw(bc, oc, tx, ty) {
  const o = O[ty][tx],
    X = tx * T,
    Y = ty * T,
    c = bc,
    tr = TH[M.theme].tr;
  if (!o || o === "B" || o === "K") return;
  if (o === "T") {
    P(c, X + 2, Y + 12, 12, 3, "rgba(0,0,0,0.18)");
    P(c, X + 6, Y + 6, 4, 9, M.theme === "dead" ? "#3a2a3a" : "#6b4a32");
    disc(oc, X + 8, Y + 2, 10, tr[0]);
    disc(oc, X + 7, Y + 1, 9, tr[1]);
    disc(oc, X + 6, Y - 1, 6, tr[2]);
    disc(oc, X + 4, Y - 3, 3, tr[3]);
  }
  if (o === "f") {
    const hz = O[ty][tx - 1] === "f" || O[ty][tx + 1] === "f";
    if (hz) {
      P(c, X, Y + 6, T, 2, "#a8865c");
      P(c, X, Y + 10, T, 1, "#a8865c");
      P(c, X + 1, Y + 4, 2, 10, "#8a6a45");
    } else {
      P(c, X + 6, Y, 1, T, "#a8865c");
      P(c, X + 9, Y, 1, T, "#a8865c");
      P(c, X + 6, Y + 5, 4, 8, "#8a6a45");
    }
  }
  if (o === "r") {
    disc(c, X + 8, Y + 12, 6, "rgba(0,0,0,0.15)");
    disc(c, X + 8, Y + 9, 5, "#8f8f8f");
    disc(c, X + 7, Y + 8, 3, "#b5b5b5");
  }
  if (o === "l") {
    P(c, X + 1, Y + 13, 14, 2, "rgba(0,0,0,0.15)");
    P(c, X + 1, Y + 7, 14, 6, "#7a573b");
    P(c, X + 1, Y + 7, 14, 1, "#9a7350");
    disc(c, X + 14, Y + 10, 3, "#5e3f29");
    disc(c, X + 14, Y + 10, 2, "#c49a6c");
  }
  if (o === "g") {
    P(c, X + 7, Y + 4, 2, 11, "#7a5236");
    P(c, X + 4, Y + 5, 8, 7, "#e6c25a");
    P(c, X + 2, Y + 6, 12, 2, "#7a5236");
    disc(c, X + 8, Y + 2, 3, "#e6c25a");
    disc(c, X + 8, Y + 8, 2, "#d6453d");
  }
  if (o === "w") {
    disc(c, X + 8, Y + 9, 7, "#7d7690");
    disc(c, X + 8, Y + 9, 5, "#3a7ac0");
    P(c, X + 2, Y - 2, 2, 10, "#6b4a32");
    P(c, X + 12, Y - 2, 2, 10, "#6b4a32");
    P(c, X, Y - 4, 16, 3, "#8a3a35");
  }
  if (o === "C") chestDraw(c, X, Y, !!save.chest[M.chest.id]);
  if (o === "X") {
    P(c, X + 1, Y + 3, 14, 3, "#8a3f2e");
    for (let a = 0; a < 14; a += 4) P(c, X + 1 + a, Y + 3, 2, 3, "#f5efe2");
  }
}
function chestDraw(c, X, Y, open) {
  P(c, X + 1, Y + 13, 14, 2, "rgba(0,0,0,0.2)");
  P(c, X + 2, Y + 6, 12, 8, "#5e2a14");
  P(c, X + 3, Y + 7, 10, 6, "#a0522d");
  P(c, X + 2, Y + 9, 12, 1, "#c9a24a");
  if (open) {
    P(c, X + 2, Y + 3, 12, 3, "#5e2a14");
    P(c, X + 3, Y + 7, 10, 2, "#2a1410");
  } else {
    P(c, X + 2, Y + 4, 12, 3, "#8a3f20");
    P(c, X + 7, Y + 8, 2, 3, "#ffd86b");
  }
}
function spotDraw(c, s) {
  const X = s.tx * T,
    Y = s.ty * T;
  if (s.kind === "cart") {
    P(c, X + 1, Y + 5, 14, 8, "#6b4a32");
    P(c, X + 2, Y + 6, 12, 6, "#3a2618");
    [
      ["#c0563f", 3],
      ["#3a7ac0", 6],
      ["#5a9e3a", 9],
      ["#d9a63a", 12],
    ].forEach(([col, a]) => P(c, X + a, Y + 2, 2, 10, col));
    disc(c, X + 4, Y + 14, 2, "#2c2c2a");
    disc(c, X + 12, Y + 14, 2, "#2c2c2a");
  }
  if (s.kind === "board") {
    P(c, X + 2, Y + 4, 2, 12, "#5e3f29");
    P(c, X + 12, Y + 4, 2, 12, "#5e3f29");
    P(c, X, Y, 16, 10, "#5b3a29");
    P(c, X + 1, Y + 1, 14, 8, "#c49a6c");
    P(c, X + 2, Y + 2, 5, 4, "#f5efe2");
    P(c, X + 8, Y + 3, 6, 5, "#f5e3a3");
  }
  if (s.kind === "stone") {
    P(c, X + 4, Y + 2, 8, 13, "#8f8f9a");
    P(c, X + 4, Y + 2, 2, 13, "#a9a9b4");
    for (let y = 4; y < 13; y += 3) P(c, X + 6, Y + y, 4, 1, "#6e6e7a");
  }
  if (s.kind === "sign") {
    P(c, X + 7, Y + 6, 2, 10, "#5e3f29");
    P(c, X + 2, Y + 2, 12, 7, "#5b3a29");
    P(c, X + 3, Y + 3, 10, 5, "#c49a6c");
    P(c, X + 5, Y + 5, 6, 1, "#5b3a29");
  }
  if (s.kind === "bottle") {
    P(c, X + 5, Y + 6, 6, 6, "#9fe0d0");
    P(c, X + 7, Y + 4, 2, 2, "#9fe0d0");
    P(c, X + 7, Y + 3, 2, 1, "#8a6a45");
    P(c, X + 6, Y + 7, 3, 3, "#f5efe2");
  }
}
function bldDraw(c, b) {
  const X = b.x * T,
    Y = b.y * T,
    w = b.w * T,
    h = b.h * T;
  if (b.tower) {
    const cx = X + w / 2;
    for (let y = Y + 18; y < Y + h; y++) {
      const hw = Math.round(8 + ((y - Y - 18) / (h - 18)) * 4),
        st = Math.floor((y - Y - 18) / 9) % 2 === 0;
      P(c, cx - hw - 1, y, 2 * hw + 2, 1, "#2f2f3a");
      P(c, cx - hw, y, 2 * hw, 1, st ? "#d6453d" : "#f5f1e8");
      P(c, cx + hw - 3, y, 3, 1, st ? "#a8342e" : "#d9d2c2");
    }
    P(c, cx - 10, Y + 14, 20, 4, "#2f2f3a");
    P(c, cx - 7, Y + 4, 14, 10, "#2f2f3a");
    P(c, cx - 5, Y + 6, 10, 7, b.lit ? "#ffd86b" : "#3a3c4a");
    P(c, cx - 8, Y + 1, 16, 3, "#d6453d");
    P(c, cx - 4, Y - 2, 8, 3, "#b8372f");
    P(c, cx - 3, Y + h - 10, 6, 10, "#2f2f3a");
    return;
  }
  P(c, X + 2, Y + h - 2, w - 2, 3, "rgba(0,0,0,0.18)");
  const rh = Math.round(h * 0.5),
    wy = Y + rh;
  P(c, X + 1, wy - 1, w - 2, h - rh + 1, "#5b3a29");
  P(c, X + 2, wy, w - 4, h - rh - 1, b.wall);
  for (let i = 0; i < rh; i++) {
    const ins = Math.round(i * 0.35);
    P(c, X + ins - 1, Y + rh - 1 - i, w - 2 * ins + 2, 1, "#3a2418");
    P(c, X + ins, Y + rh - 1 - i, w - 2 * ins, 1, i % 3 === 0 ? b.roofD : b.roof);
  }
  P(c, X, Y + rh - 2, w, 2, b.roofD);
  const dxp = b.dx * T + 3;
  P(c, dxp - 1, Y + h - 14, 12, 14, "#3a2418");
  P(c, dxp, Y + h - 13, 10, 13, "#8a5a3b");
  for (let a = X + 5; a < X + w - 10; a += 16) {
    if (Math.abs(a + 4 - (dxp + 5)) < 10) continue;
    P(c, a - 1, wy + 3, 10, 8, "#3a2418");
    P(c, a, wy + 4, 8, 6, "#9fd0f0");
  }
  const ix = dxp + 1,
    iy = Y + rh - 8;
  P(c, ix - 2, iy - 1, 12, 8, "#3a2418");
  P(c, ix - 1, iy, 10, 6, "#f5e3a3");
  P(c, ix + 2, iy + 1, 4, 4, b.roof);
}
function paintMap(m) {
  const bc = m.base.getContext("2d"),
    oc = m.over.getContext("2d");
  for (let y = 0; y < MH; y++) for (let a = 0; a < MW; a++) ground(bc, a, y);
  for (let y = 0; y < MH; y++) for (let a = 0; a < MW; a++) objDraw(bc, oc, a, y);
  m.bld.forEach((b) => (b.lm && b.lm !== "tower" ? LMD[b.lm](bc, oc, b) : bldDraw(bc, b)));
  m.spots.forEach((s) => spotDraw(bc, s));
  (m.fur || []).forEach((f) => FURD[f.id](bc, f.x * T, f.y * T));
}
