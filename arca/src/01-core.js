const W = 320,
  H = 180,
  T = 16;
const cv = document.getElementById("cv"),
  x = cv.getContext("2d");
const mk = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const P = (c, a, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(Math.round(a), Math.round(y), w, h);
};
const disc = (c, cx, cy, r, col) => {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    P(c, cx - w, cy + dy, 2 * w + 1, 1, col);
  }
};
const hsh = (a, b) => {
  let h = (a * 73856093) ^ (b * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};
const $ = (id) => document.getElementById(id);
const jo = (w, a, b) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return w + (c >= 0 && c < 11172 && c % 28 ? a : b);
};
const BY = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function dith(c, pal, y0, y1) {
  const n = pal.length - 1;
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n,
      b = Math.floor(t),
      f = t - b;
    for (let a = 0; a < W; a++) P(c, a, y, 1, 1, pal[f > (BY[y % 4][a % 4] + 0.5) / 16 ? Math.min(b + 1, n) : b]);
  }
}
function pine(c, cx, y, h, c1, c2) {
  P(c, cx - 1, y - 3, 3, 4, "#4a3424");
  const tl = Math.ceil(h / 3);
  for (let i = 0; i < h; i++) {
    const tr = i % tl,
      w = Math.floor(tr * 0.7 + i * 0.18) + 1,
      yy = y - h + i - 3;
    P(c, cx - w, yy, 2 * w + 1, 1, c1);
    P(c, cx - w, yy, Math.max(1, w), 1, c2);
  }
}
const TH = {
  town: {
    g: "#8cc152",
    g1: "#7db546",
    g2: "#9bcc5f",
    edge: "#76a04c",
    tr: ["#3f7a2a", "#4a8530", "#5a9e3a", "#78b84a"],
  },
  forest: {
    g: "#5f9a3a",
    g1: "#4f8a30",
    g2: "#6aa540",
    edge: "#4a7f2c",
    tr: ["#1f4a26", "#24572a", "#2f6b2f", "#3d8238"],
  },
  coast: {
    g: "#9cc56a",
    g1: "#8ab35a",
    g2: "#b0d27e",
    edge: "#7fa652",
    tr: ["#3f7a2a", "#4a8530", "#5a9e3a", "#78b84a"],
  },
  dead: {
    g: "#4f6e46",
    g1: "#405c3a",
    g2: "#5e7d52",
    edge: "#3a5234",
    tr: ["#2a2f45", "#353a55", "#43486a", "#5a5f80"],
  },
};
const nm = (w, h, g) => {
  const G = [],
    O = [];
  for (let y = 0; y < h; y++) {
    G.push(Array(w).fill(g));
    O.push(Array(w).fill(""));
  }
  return { G, O, w, h };
};
const FL = (L, x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let a = x0; a <= x1; a++) if (L[y] && a >= 0 && a < L[0].length) L[y][a] = ch;
};
function border(m, keep) {
  for (let a = 0; a < m.w; a++)
    [0, m.h - 1].forEach((y) => {
      if (!keep.has(a + "," + y)) m.O[y][a] = "T";
    });
  for (let y = 0; y < m.h; y++)
    [0, m.w - 1].forEach((a) => {
      if (!keep.has(a + "," + y)) m.O[y][a] = "T";
    });
}
const WATER = ["~", "-", "#", "b", "H"];
function picks(m, n, cond, salt) {
  const c = [];
  for (let y = 1; y < m.h - 1; y++)
    for (let a = 1; a < m.w - 1; a++)
      if (!m.O[y][a] && !WATER.includes(m.G[y][a]) && cond(a, y)) c.push([hsh(a + salt, y * 7 + salt), a, y]);
  c.sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [, a, y] of c) {
    if (out.every(([b, z]) => Math.abs(b - a) + Math.abs(z - y) > 5)) out.push([a, y]);
    if (out.length >= n) break;
  }
  return out;
}
