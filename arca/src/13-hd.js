/* ════════ 48점 그림(PixelLab) 연결 ════════
   화면은 3배(HDS)로 그리고, 게임 좌표는 그대로 16점 칸이다.
   그림 목록은 data/hd-assets.js(HDA), 그림 파일은 assets/hd/.
   그림이 있으면 PixelLab 그림을 쓰고, 없거나 아직 안 불러왔으면 원래(손으로 그린) 그림을 쓴다.
   - 사람·몬스터·펫·부엉이: mapper 가 돌려주는 그리기 함수에 위치를 붙여 두고, person·owl·petDraw·MON.dr 가 그 위치에 그림을 찍는다.
   - 지도: paintMap 을 바꿔 바닥은 '이중 격자'(칸 네 개의 모서리로 타일 고르기)로 이어 붙이고, 나무·바위·건물·가구를 그림으로 바꾼다. */
const HD = { img: {}, ready: false, on: !(typeof UI === "object" && UI.oldArt), full: {} };
const hdSrc = (p) => (typeof HD_INLINE === "object" && HD_INLINE && HD_INLINE[p]) || "assets/hd/" + p;
function hdImg(p) {
  let i = HD.img[p];
  if (!i) {
    i = HD.img[p] = new Image();
    i.src = hdSrc(p);
  }
  return i;
}
const hdOk = (i) => i && i.complete && i.naturalWidth > 0;
// 그림 하나를 world 좌표(16점 칸)에 원래 픽셀 크기로 찍는다. ax,ay: 그림 안의 기준점(그림 픽셀), wx,wy: 화면 위치
function hdPut(c, im, ax, ay, wx, wy, flip, sc, alpha) {
  if (!hdOk(im)) return false;
  sc = sc || 1;
  const k = sc / HDS,
    w = im.naturalWidth * k,
    h = im.naturalHeight * k,
    X = Math.round((wx - ax * k) * HDS) / HDS,
    Y = Math.round((wy - ay * k) * HDS) / HDS;
  if (alpha != null) c.globalAlpha = alpha;
  if (flip) {
    c.save();
    c.translate(Math.round(wx * HDS) / HDS, 0);
    c.scale(-1, 1);
    c.drawImage(im, X - Math.round(wx * HDS) / HDS, Y, w, h);
    c.restore();
  } else c.drawImage(im, X, Y, w, h);
  if (alpha != null) c.globalAlpha = 1;
  return true;
}
const hdShadow = (c, wx, wy, rw) => {
  c.fillStyle = "rgba(0,0,0,0.2)";
  c.beginPath();
  c.ellipse(wx, wy - 0.5, rw, rw * 0.35, 0, 0, 7);
  c.fill();
};

/* ── 미리 불러오기 ── */
function hdPreload() {
  const L = [];
  for (const k in HDA.chars) {
    ["south", "east", "north", "west"].forEach((d) => L.push("chars/" + k + "/" + d + ".png"));
    if (HDA.chars[k].walk) ["south", "east", "north"].forEach((d) => [0, 1, 2, 3].forEach((i) => L.push("chars/" + k + "/walk_" + d + "_" + i + ".png")));
  }
  ["mons", "pets", "npc", "misc", "props", "bld", "icons"].forEach((cat) => {
    if (!HDA[cat]) return;
    for (const k in HDA[cat]) {
      L.push(cat + "/" + k + ".png");
      for (let i = 0; i < (HDA[cat][k].n || 0); i++) L.push(cat + "/" + k + "_" + i + ".png");
    }
  });
  for (const k in HDA.tiles) for (let i = 0; i < HDA.tiles[k]; i++) L.push("tiles/" + k + "/" + i + ".png");
  return Promise.all(
    L.map(
      (p) =>
        new Promise((res) => {
          const i = hdImg(p);
          if (i.complete) return res();
          i.onload = i.onerror = () => res();
        }),
    ),
  );
}

/* ── 사람 ── */
const HD_ALIAS = { lis2: "lis" };
function hdCharKey(p) {
  if (!p) return null;
  if (p.n === "나") return typeof rpgLook === "function" ? rpgLook() : "hero-" + (save.job || "none");
  const id = HD_ALIAS[p.id] || p.id;
  return id && HDA.chars[id] ? id : null;
}
function hdChar(c, key, wx, wy, face, fl, mv, f, sc, shadow, alpha) {
  const A = HDA.chars[key];
  if (!A) return false;
  let d = face === "u" ? "north" : face === "s" ? (fl ? "west" : "east") : "south",
    flip = false,
    p = "chars/" + key + "/" + d + ".png";
  if (mv && A.walk) {
    const dd = d === "west" ? "east" : d;
    flip = d === "west";
    p = "chars/" + key + "/walk_" + dd + "_" + (((f % 4) + 4) % 4) + ".png";
  } else if (d === "west" && !A.west) {
    p = "chars/" + key + "/east.png";
    flip = true;
  }
  const im = hdImg(p);
  if (!hdOk(im)) return false;
  if (shadow) hdShadow(c, wx, wy, 4 * (sc || 1));
  return hdPut(c, im, A.w / 2, A.b[3], wx, wy, flip, sc, alpha);
}
{
  const mp0 = mapper;
  mapper = function (px, py, fl, z, S) {
    const r = mp0(px, py, fl, z, S);
    r.hd = { px, py: py - (z || 0), fl: !!fl, S: S || 1 };
    return r;
  };
  const person0 = person;
  person = function (r, b, f, p, mv, face) {
    if (HD.on && r && r.hd) {
      const k = hdCharKey(p);
      if (k && hdChar(x, k, r.hd.px, r.hd.py, face, r.hd.fl, mv, f, r.hd.S, !p.noSh)) {
        // 주인공은 손에 든 무기를 따로 그린다(src/14-rpg.js)
        if (p.n === "나" && typeof rpgHand === "function") rpgHand(r.hd, face, mv, f);
        return;
      }
    }
    person0(r, b, f, p, mv, face);
  };
  const dn0 = drawNPC;
  drawNPC = function (n) {
    if (HD.on && n.owl && HDA.npc[n.id]) {
      const A = HDA.npc[n.id],
        i = A.n ? Math.floor(fr / 3) % A.n : -1,
        im = hdImg("npc/" + n.id + (i >= 0 ? "_" + i : "") + ".png"),
        wx = Math.round(n.x - cam.x),
        wy = Math.round(n.y - cam.y);
      if (hdOk(im)) {
        hdShadow(x, wx, wy, 5);
        hdPut(x, im, A.w / 2, A.b[3], wx, wy, false);
        return;
      }
    }
    dn0(n);
  };
}

/* ── 몬스터 ── */
const HD_BOSSCHAR = { kai: "kai", gren: "gren", mor: "mor", nox: "noxy", noxshade: "noxy", noxf: "nox-scribe" };
function hdMonPatch() {
  for (const k in MON) {
    const M0 = MON[k];
    if (M0._hd) continue;
    const dr0 = M0.dr;
    M0._hd = 1;
    M0.dr = function (r, b, f, mv) {
      if (HD.on && r && r.hd) {
        const h = r.hd;
        if (HDA.mons[k]) {
          const A = HDA.mons[k],
            i = A.n ? (mv ? f : fr >> 1) % A.n : -1,
            im = hdImg("mons/" + k + (i >= 0 ? "_" + i : "") + ".png");
          if (hdOk(im)) {
            hdShadow(x, h.px, h.py, (A.b[2] - A.b[0]) / HDS / 2.6);
            hdPut(x, im, A.w / 2, A.b[3], h.px, h.py, !h.fl);
            return;
          }
        }
        const ck = HD_BOSSCHAR[k];
        if (ck && HDA.chars[ck]) {
          // 사람 모양 보스: 48점 인물을 2배로, 기운을 둘러서
          const t = (fr % 20) / 20;
          x.globalAlpha = 0.35;
          x.fillStyle = k === "mor" ? "#f0a43c" : k === "kai" ? "#6aa9ec" : "#9b7fd9";
          x.beginPath();
          x.ellipse(h.px, h.py - 18, 16 + t * 3, 22 + t * 3, 0, 0, 7);
          x.fill();
          x.globalAlpha = 1;
          if (hdChar(x, ck, h.px, h.py, "d", h.fl, false, 0, 2, true, k === "noxshade" ? 0.6 : null)) return;
        }
      }
      dr0(r, b, f, mv);
    };
  }
}
hdMonPatch();

/* ── 펫 ── */
const PET_FACE = { dog: 1, cat: 1, fox: -1, rabbit: 1, chick: -1 }; // 그림이 바라보는 쪽(1 = 오른쪽)
{
  const pd0 = petDraw;
  petDraw = function (r, sp, f, mv) {
    if (HD.on && r && r.hd && HDA.pets[sp]) {
      const A = HDA.pets[sp],
        h = r.hd,
        i = A.n && mv ? f % A.n : -1,
        im = hdImg("pets/" + sp + (i >= 0 ? "_" + i : "") + ".png");
      if (hdOk(im)) {
        const want = h.fl ? -1 : 1;
        hdShadow(x, h.px, h.py, 4);
        hdPut(x, im, A.w / 2, A.b[3], h.px, h.py, want * (PET_FACE[sp] || 1) < 0);
        // 성장 표시: 목걸이 방울·별
        const st = typeof petStage === "function" ? petStage() : 1;
        if (st >= 2) {
          P(x, h.px - 1, h.py - 7, 2, 2, "#ffd86b");
        }
        if (st >= 3 && fr % 12 < 8) P(x, h.px + (h.fl ? -5 : 4), h.py - 15, 1, 1, "#fff6d0");
        if (catCount() >= 12 && fr % 16 < 10) P(x, h.px - 3, h.py - 11, 1, 1, "#ffd86b");
        return;
      }
    }
    pd0(r, sp, f, mv);
  };
}

/* ── 별고양이 ── */
{
  const dc0 = drawCat;
  drawCat = function (sx, sy, f, col) {
    const A = HDA.misc.starcat;
    if (HD.on && A && (!col || col === "#f5e3a3")) {
      const i = A.n ? Math.floor(f / 3) % A.n : -1,
        im = hdImg("misc/starcat" + (i >= 0 ? "_" + i : "") + ".png");
      if (hdOk(im)) {
        hdShadow(x, sx + 8, sy + 16, 4);
        hdPut(x, im, A.w / 2, A.b[3], sx + 8, sy + 16, false);
        return;
      }
    }
    dc0(sx, sy, f, col);
  };
}

/* ── 대화 얼굴 ── */
{
  const dp0 = drawPortrait;
  drawPortrait = function (n) {
    let p = null,
      A = null;
    const k = HD.on && hdCharKey(n);
    if (k && HDA.chars[k]) {
      A = HDA.chars[k];
      p = "chars/" + k + "/south.png";
    } else if (HD.on && n.owl && HDA.npc[n.id]) {
      A = HDA.npc[n.id];
      p = "npc/" + n.id + ".png";
    } else if (HD.on && n.petSp && HDA.pets[n.petSp]) {
      A = HDA.pets[n.petSp];
      p = "pets/" + n.petSp + ".png";
    }
    const im = p && hdImg(p);
    if (!hdOk(im)) return dp0(n);
    const c = $("dpf"),
      q = c.getContext("2d");
    q.imageSmoothingEnabled = false;
    q.clearRect(0, 0, c.width, c.height);
    const cx = (A.b[0] + A.b[2]) / 2;
    q.drawImage(im, Math.round(cx - 24), A.b[1] - 2, 48, 44, 0, 0, 48, 44);
    c.hidden = false;
    $("dlg").classList.add("pf");
  };
}

/* ════════ 지도 ════════ */
// 칸 종류: g 풀(바탕) · p 길 · s 모래 · w 물(개울) · S 바다 · x 단단한 바닥(따로 칠함)
function hdCls(g, th) {
  if (g === ":" || g === "q") return "p";
  if (g === "s") return "s";
  if (g === "~") return HDA.tiles[th + "-sea"] ? "S" : "w";
  if (g === "-" || g === "b") return "w";
  return "g";
}
// 이어지는 지형 묶음의 '가득 찬' 타일: 경계 타일 네 장의 구석을 모아 만든다(경계 타일과 색이 맞게)
function hdFull(key, first) {
  const id = key + (first ? "+" : "-");
  if (HD.full[id]) return HD.full[id];
  const q = first ? [14, 13, 11, 7] : [1, 2, 4, 8],
    c = mk(48, 48),
    g = c.getContext("2d");
  for (let k = 0; k < 4; k++) {
    const im = hdImg("tiles/" + key + "/" + q[k] + ".png");
    if (!hdOk(im)) return null;
    const sx = (k % 2) * 24,
      sy = (k >> 1) * 24;
    g.drawImage(im, sx, sy, 24, 24, sx, sy, 24, 24);
  }
  return (HD.full[id] = c);
}
const HD_PAIR = {
  gp: ["path", "g"],
  gw: ["water", "g"],
  gs: ["sand", "g"],
  sS: ["sea", "s"],
  gS: ["water", "g"],
  pw: ["water", "p"],
  ps: ["sand", "p"],
  sw: ["sea", "s"],
  wS: ["sea", "w"],
  pS: ["sea", "p"],
};
function hdFullOf(th, c) {
  const t = HDA.tiles;
  if (c === "g") return hdFull(th + "-path", true);
  if (c === "p") return hdFull(th + "-path", false);
  if (c === "w") return hdFull(th + "-water", false);
  if (c === "s") return t[th + "-sea"] ? hdFull(th + "-sea", true) : t[th + "-sand"] ? hdFull(th + "-sand", false) : hdFull(th + "-path", false);
  if (c === "S") return hdFull(th + "-sea", false);
  return null;
}
function hdTile(c, m, i, j) {
  const th = m.theme,
    cl = (a, y) => hdCls(m.G[Math.max(0, Math.min(m.h - 1, y))][Math.max(0, Math.min(m.w - 1, a))], th),
    C = [cl(i - 1, j - 1), cl(i, j - 1), cl(i - 1, j), cl(i, j)],
    X = i * T - T / 2,
    Y = j * T - T / 2,
    set = [...new Set(C)];
  const put = (im) => im && c.drawImage(im, X, Y, T, T);
  if (set.length === 1) return put(hdFullOf(th, set[0]));
  const order = "gpswS";
  set.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (set.length === 2) {
    const pr = HD_PAIR[set[0] + set[1]];
    if (pr && HDA.tiles[th + "-" + pr[0]]) {
      const firstCls = set[0],
        mask = (C[0] === firstCls) << 3 | (C[1] === firstCls) << 2 | (C[2] === firstCls) << 1 | (C[3] === firstCls);
      return put(hdImg("tiles/" + th + "-" + pr[0] + "/" + mask + ".png"));
    }
  }
  // 세 종류 이상이거나 묶음이 없으면: 풀 위에 하나씩 겹쳐 그린다
  put(hdFullOf(th, "g"));
  set.forEach((s) => {
    if (s === "g") return;
    const pr = HD_PAIR["g" + s];
    if (!pr || !HDA.tiles[th + "-" + pr[0]]) return;
    const mask = (C[0] !== s) << 3 | (C[1] !== s) << 2 | (C[2] !== s) << 1 | (C[3] !== s);
    put(hdImg("tiles/" + th + "-" + pr[0] + "/" + mask + ".png"));
  });
}
const HD_SOLID = { q: [0, 1], "#": [4], F: [5, 6], W: [7], H: [8] };
function hdSolid(c, m, a, y) {
  const g = m.G[y][a];
  let ix = HD_SOLID[g];
  if (g === "b") {
    const wv = (dx, dy) => ["~", "-"].includes((m.G[y + dy] || [])[a + dx]);
    ix = [wv(0, -1) || wv(0, 1) ? 3 : 2];
  }
  if (g === "~" && !HDA.tiles[m.theme + "-sea"]) ix = [10, 11];
  if (!ix || !HDA.tiles.solid) return;
  const im = hdImg("tiles/solid/" + ix[hsh(a, y) % ix.length] + ".png");
  if (hdOk(im)) c.drawImage(im, a * T, y * T, T, T);
}
const hdMapOk = (m) => HD.ready && HD.on && HDA.tiles[m.theme + "-path"] && HDA.tiles[m.theme + "-water"];
function hdGroundCell(c, m, a, y) {
  c.save();
  c.beginPath();
  c.rect(a * T, y * T, T, T);
  c.clip();
  for (let j = y; j <= y + 1; j++) for (let i = a; i <= a + 1; i++) hdTile(c, m, i, j);
  hdSolid(c, m, a, y);
  c.restore();
}
{
  const g0 = ground;
  ground = function (c, tx, ty) {
    if (M && hdMapOk(M)) return hdGroundCell(c, M, tx, ty);
    g0(c, tx, ty);
  };
}
/* 나무·바위 같은 물건: 아랫부분은 바탕에, 윗부분(나무 잎)은 덮개(사람 위)에 */
function hdProp(bc, oc, key, X, Y, opt) {
  const A = HDA.props[key];
  if (!A) return false;
  const im = hdImg("props/" + key + ".png");
  if (!hdOk(im)) return false;
  const k = 1 / HDS,
    ax = A.w / 2,
    ay = A.b[3],
    wx = X + 8,
    wy = Y + (opt && opt.oy != null ? opt.oy : 16),
    split = opt && opt.split;
  if (!split) return hdPut(bc, im, ax, ay, wx, wy, opt && opt.flip);
  // split: 그림 아래 split 점(그림 픽셀)은 바탕, 나머지는 덮개
  const sy = Math.max(0, ay - split),
    L = (wx - ax * k),
    T0 = (wy - ay * k);
  bc.drawImage(im, 0, sy, A.w, A.h - sy, L, T0 + sy * k, A.w * k, (A.h - sy) * k);
  oc.drawImage(im, 0, 0, A.w, sy, L, T0, A.w * k, sy * k);
  return true;
}
{
  const od0 = objDraw;
  objDraw = function (bc, oc, tx, ty) {
    if (!M || !hdMapOk(M)) return od0(bc, oc, tx, ty);
    const o = O[ty][tx],
      X = tx * T,
      Y = ty * T;
    let ok = false;
    if (o === "T") ok = hdProp(bc, oc, "tree-" + M.theme, X, Y, { split: 24 }) || hdProp(bc, oc, "tree-town", X, Y, { split: 24 });
    else if (o === "r") ok = hdProp(bc, oc, "rock", X, Y);
    else if (o === "l") ok = hdProp(bc, oc, "log", X, Y);
    else if (o === "g") ok = hdProp(bc, oc, "scarecrow", X, Y);
    else if (o === "w") ok = hdProp(bc, oc, "well", X, Y);
    else if (o === "X") ok = hdProp(bc, oc, "barrier", X, Y);
    else if (o === "f") {
      const hz = O[ty][tx - 1] === "f" || O[ty][tx + 1] === "f",
        A = HDA.props[hz ? "fence-h" : "fence-v"],
        im = A && hdImg("props/" + (hz ? "fence-h" : "fence-v") + ".png");
      if (hdOk(im)) {
        // 가로 울타리는 가운데 48점만 잘라 이어 붙인다
        if (hz) bc.drawImage(im, (A.w - 48) / 2, A.b[3] - 40, 48, 40, X, Y + 16 - 40 / HDS, T, 40 / HDS);
        else hdPut(bc, im, A.w / 2, A.b[3], X + 8, Y + 16);
        ok = true;
      }
    } else if (o === "C" && !save.chest[M.chest.id]) {
      const A = HDA.misc.chest,
        im = A && hdImg("misc/chest.png");
      if (hdOk(im)) ok = hdPut(bc, im, A.w / 2, A.b[3], X + 8, Y + 15);
    }
    if (!ok) od0(bc, oc, tx, ty);
  };
  const cd0 = chestDraw;
  chestDraw = function (c, X, Y, open) {
    if (open && M && hdMapOk(M) && c === M.base.getContext("2d")) hdGroundCell(c, M, Math.round(X / T), Math.round(Y / T));
    cd0(c, X, Y, open);
  };
  const sd0 = spotDraw;
  spotDraw = function (c, s) {
    if (M && hdMapOk(M) && HDA.props[s.kind] && hdProp(c, c, s.kind, s.tx * T, s.ty * T)) return;
    sd0(c, s);
  };
}
/* 건물: 지붕 색에 가장 가까운 집 그림, 문 가운데에 맞춘다 */
const HD_ROOF = {
  red: [192, 86, 63],
  blue: [58, 122, 192],
  brown: [122, 87, 59],
  purple: [83, 74, 183],
  teal: [29, 158, 117],
  lavender: [127, 119, 221],
  green: [90, 158, 58],
  orange: [186, 117, 23],
  gray: [95, 94, 90],
  gold: [217, 166, 58],
  pale: [201, 197, 216],
};
function hdHouseKey(b) {
  if (b.w <= 3 && b.h <= 3 && HDA.bld["house-navy-small"]) return "house-navy-small";
  if ((b.w >= 6 || b.h >= 5) && HDA.bld["house-big"]) return "house-big";
  const h = (b.roof || "#c0563f").replace("#", ""),
    rgb = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
  let best = null,
    bd = 1e9;
  for (const k in HD_ROOF) {
    if (!HDA.bld["house-" + k]) continue;
    const d = HD_ROOF[k].reduce((s, v, i) => s + (v - rgb[i]) ** 2, 0);
    if (d < bd) {
      bd = d;
      best = "house-" + k;
    }
  }
  return best;
}
function hdBld(c, key, b) {
  const A = HDA.bld[key],
    im = A && hdImg("bld/" + key + ".png");
  if (!hdOk(im)) return false;
  const cx = (b.dx + 0.5) * T,
    by = (b.y + b.h) * T;
  return hdPut(c, im, (A.b[0] + A.b[2]) / 2, A.b[3], cx, by);
}
{
  const bd0 = bldDraw;
  bldDraw = function (c, b) {
    if (M && hdMapOk(M)) {
      const key = b.tower || b.lm === "tower" ? "lighthouse" : hdHouseKey(b);
      if (key && hdBld(c, key, b)) {
        b.hd = 1;
        return;
      }
    }
    bd0(c, b);
  };
  for (const k in LMD) {
    const l0 = LMD[k];
    LMD[k] = function (bc, oc, b) {
      if (M && hdMapOk(M) && hdBld(bc, k, b)) {
        b.hd = 1;
        return;
      }
      l0(bc, oc, b);
    };
  }
  const dm0 = decoMap;
  decoMap = function (m, bc) {
    if (!hdMapOk(m)) return dm0(m, bc);
    // 그림 집에는 간판만 붙인다(차양·굴뚝은 그림에 있음)
    const keep = m.bld;
    m.bld = keep.filter((b) => !b.hd);
    dm0(m, bc);
    m.bld = keep;
    keep.forEach((b) => {
      if (!b.hd || b.lm || b.tower || !b.n) return;
      const k = bldKind(b.n),
        dxp = b.dx * T + 3,
        sy = (b.y + b.h) * T - 25;
      P(bc, dxp - 1, sy - 1, 12, 8, "#5b3a29");
      P(bc, dxp, sy, 10, 6, "#f5e3a3");
      ICON[k.i](bc, dxp + 2, sy + 1);
    });
  };
  for (const k in FURD) {
    const f0 = FURD[k],
      key = k === "chest" ? "furchest" : k;
    FURD[k] = function (bc, X, Y) {
      if (M && hdMapOk(M) && HDA.props[key]) {
        const f = (M.fur || []).find((q) => q.id === k && q.x * T === X && q.y * T === Y) || { w: 1, h: 1 },
          A = HDA.props[key],
          im = hdImg("props/" + key + ".png");
        // 자리(칸)에 맞게 1배나 2배로
        const sc = Math.max(1, Math.min(2, Math.round(Math.min((f.w * T * HDS) / (A.b[2] - A.b[0]), (f.h * T * HDS) / (A.b[3] - A.b[1])))));
        if (hdOk(im)) return hdPut(bc, im, (A.b[0] + A.b[2]) / 2, A.b[3], X + (f.w * T) / 2, Y + f.h * T, false, sc);
      }
      f0(bc, X, Y);
    };
  }
}
{
  const pm0 = paintMap;
  paintMap = function (m) {
    if (!hdMapOk(m)) return pm0(m);
    const bc = m.base.getContext("2d");
    for (let j = 0; j <= m.h; j++) for (let i = 0; i <= m.w; i++) hdTile(bc, m, i, j);
    for (let y = 0; y < m.h; y++) for (let a = 0; a < m.w; a++) hdSolid(bc, m, a, y);
    // 바닥 다음은 원래 순서(물건·건물·소품·가구). 바닥 그리기만 건너뛴다.
    const g0 = ground;
    ground = () => {};
    try {
      pm0(m);
    } finally {
      ground = g0;
    }
  };
}

/* ── 지워진 곳의 연필 밑그림: 바탕 그림의 가장자리를 읽어 만든다.
   index.html 을 파일로 바로 열면(file://) 그림 파일 때문에 픽셀을 읽을 수 없어서, 그때는 옛 그림으로 따로 그려 읽는다. ── */
{
  const sp0 = setupPatches;
  setupPatches = function (m) {
    try {
      return sp0(m);
    } catch (e) {
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
        sp0(m);
      } finally {
        HD.on = on;
        m.base = b;
        m.over = o;
      }
    }
  };
}

/* ── 메모리: 지금 맵과 바로 전 맵의 바탕만 남긴다(3배 그림은 크다) ── */
{
  let prev = null;
  const lm0 = loadMap;
  loadMap = function (id, tx, ty, quiet) {
    if (M && M.id !== id) {
      for (const k in MAPS)
        if (k !== id && k !== M.id && MAPS[k].base) {
          MAPS[k].base = MAPS[k].over = MAPS[k].sketch = null;
        }
      prev = M.id;
    }
    return lm0(id, tx, ty, quiet);
  };
}
/* 그림을 다 불러오면 지금 맵을 다시 그린다 */
function hdRepaint() {
  for (const k in MAPS) if (MAPS[k] !== M) MAPS[k].base = MAPS[k].over = MAPS[k].sketch = null;
  if (!M) return;
  const m = M;
  m.base = mk(m.w * T * HDS, m.h * T * HDS);
  m.over = mk(m.w * T * HDS, m.h * T * HDS);
  m.base.getContext("2d").setTransform(HDS, 0, 0, HDS, 0, 0);
  m.over.getContext("2d").setTransform(HDS, 0, 0, HDS, 0, 0);
  paintMap(m);
  if (m.patch) {
    const keep = m.PATCH;
    setupPatches(m);
    if (keep) m.PATCH.forEach((p, i) => (p.done = keep[i] && keep[i].done));
    PATCH = m.PATCH;
    ER = m.ER;
  }
}
hdPreload().then(() => {
  HD.ready = true;
  hdRepaint();
});

/* ── 길가 소품(src/08-ui.js PROPS)·채집 재료(nodeDraw·nodeDraw2) 그림 ── */
for (const k in PROPS) {
  const p0 = PROPS[k];
  PROPS[k] = function (c, X, Y) {
    const A = HDA.props["s-" + k],
      im = A && hdImg("props/s-" + k + ".png");
    if (HD.on && hdOk(im)) return hdPut(c, im, A.w / 2, A.b[3], X + 8, Y + 15);
    return p0(c, X, Y);
  };
}
function hdNode(r, t, ok, f) {
  if (!HD.on || !r || !r.hd) return false;
  const key = ok ? "node-" + t : "node-sprout",
    A = HDA.misc[key],
    im = A && hdImg("misc/" + key + ".png");
  if (!hdOk(im)) return false;
  // 아직 안 캔 재료는 살짝 떠오르며 반짝
  const bob = ok ? Math.round(Math.sin(f / 6) * 1) : 0;
  hdPut(x, im, A.w / 2, A.b[3], r.hd.px, r.hd.py - 1 + bob);
  if (ok && f % 16 < 3) P(x, r.hd.px + 3, r.hd.py - 9, 1, 1, "#fff6d0");
  return true;
}
{
  const nd0 = nodeDraw;
  nodeDraw = function (r, t, ok, f) {
    if (!hdNode(r, t, ok, f)) nd0(r, t, ok, f);
  };
  if (typeof nodeDraw2 === "function") {
    const nd2 = nodeDraw2;
    nodeDraw2 = function (r, t, ok, f) {
      if (!hdNode(r, t, ok, f)) nd2(r, t, ok, f);
    };
  }
}
