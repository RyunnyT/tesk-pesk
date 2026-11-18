/* ════════ 길목 장치 (프롬프트 O 2단계, 2026-11-16, docs/설계_다양함.md §2) ════════
   길목 27곳마다 장치 하나. 장치는 막히지 않게 — 못 풀어도 걸어서 돌아가는 길이 있다(검사 tools/check/route.cjs).
   A 무너진 다리  끊긴 개울을 점프(J)로 넘거나, 멀리 있는 다리로 돌아가기
   B 어두운 길    내 둘레만 밝고, 등불 기둥 곁에 가면 켜져서 넓어짐
   C 미끄러운 얼음 얼음 위에서는 미끄러져 벽·끝까지 감
   D 바람길       몇 초마다 바람(동→서)이 밀어냄, 바위 바로 서쪽에 서면 안 밀림
   E 숨은 샛길    나무 사이 지나갈 수 있는 틈 → 작은 공터의 보물
   F 물길         얕은 여울은 절반 속도
   G 움직이는 발판 넓어진 강을 오르내리는 발판을 타고 건넘(아래쪽 다리로 돌아가도 됨)
   H 꽃길 스위치  같은 색 꽃 세 송이를 왼쪽부터 차례로 밟으면 보물이 나타남
   I 지워지는 길  밟은 길이 잠시 뒤 사라졌다가(안개) 다시 생김
   한 번 받는 보물은 save.st.rdev[길목] 에 기록. 처음 만나는 장치는 한 줄 안내(save.st.rdHint). */
const RDEV = { r3: "A", r13: "A", r19: "A", r22: "A", r2: "B", r6: "B", r24: "B", r23: "C", r25: "C", r26: "C", r8: "D", r18: "D", r20: "D", r1: "E", r5: "E", r10: "E", r16: "E", r4: "F", r7: "F", r15: "F", r9: "G", r12: "G", r21: "G", r11: "H", r14: "H", r17: "H", r27: "I" };
const RDEV_NAME = { A: "무너진 다리", B: "어두운 길", C: "미끄러운 얼음", D: "바람길", E: "숨은 샛길", F: "물길", G: "움직이는 발판", H: "꽃길 스위치", I: "지워지는 길" };
const RDEV_HINT = {
  A: "다리가 무너졌어요! J 로 개울을 뛰어넘거나, 멀리 있는 다리로 돌아가요.",
  B: "길이 어두워요. 등불 기둥 곁에 가면 불이 켜져요.",
  C: "얼음 위에서는 미끄러져요! 미끄러지는 방향을 잘 골라요.",
  D: "바람이 불어요! 바람이 불 때 바위 바로 왼쪽에 서면 안 밀려요.",
  E: "어딘가 나무 사이로 지나갈 수 있는 틈이 있대요. 반짝이는 나무를 찾아봐요.",
  F: "얕은 물길에서는 천천히 걸어요.",
  G: "강이 넓어요! 오르내리는 발판에 올라타거나 아래쪽 다리로 돌아가요.",
  H: "같은 색 꽃 세 송이를 왼쪽부터 차례로 밟아 봐요.",
  I: "안개가 길을 지워요! 밟은 길은 잠시 뒤 사라졌다 다시 생겨요.",
};
// 길목에 몬스터 종류 보강(2종뿐인 곳 → 3종 이상, 새 몬스터는 만들지 않음)
const RMON_ADD = { r1: [["mush", 2]], r2: [["rat", 2]], r3: [["crab", 2], ["rat", 2]], r4: [["bat", 2]], r8: [["windup", 2]], r11: [["rat", 2]], r15: [["slime", 2]], r18: [["crow", 2]], r20: [["sheep", 2]], r6: [["bog", 2]], r19: [["crow", 2]], r24: [["ghost", 2]] };
const RD = { t: 0, lit: new Set(), cr: {}, plat: null, slide: null, fl: 0, flBad: 0, last: null };
const rdK = (a, y) => a + "," + y;
const rdWalk = (m, a, y) => a > 0 && y > 0 && a < m.w - 1 && y < m.h - 1 && !m.O[y][a] && !["~", "-", "#", "W"].includes(m.G[y][a]);
// 큰길(:) 칸들 — 열마다 위·아래
function rdPathRows(m, a) {
  const L = [];
  for (let y = 1; y < m.h - 1; y++) if (m.G[y][a] === ":" || m.G[y][a] === "b") L.push(y);
  return L;
}
// 개울 열(없으면 만든다)
function rdStream(m) {
  let best = -1, bc = 0;
  for (let a = 8; a < m.w - 8; a++) {
    let c = 0;
    for (let y = 1; y < m.h - 1; y++) if (m.G[y][a] === "-" || m.G[y][a] === "b") c++;
    if (c > bc) (bc = c), (best = a);
  }
  if (bc >= (m.h - 2) * 0.6) return best;
  const a0 = Math.round(m.w * 0.62);
  for (let y = 1; y < m.h - 1; y++) {
    const g = m.G[y][a0];
    if (g === "~" || g === "s" || m.O[y][a0] === "K" || m.O[y][a0] === "X") continue;
    if (m.O[y][a0] === "T" || m.O[y][a0] === "r" || m.O[y][a0] === "l") m.O[y][a0] = "";
    m.G[y][a0] = g === ":" ? "b" : "-";
  }
  return a0;
}
// 개울을 건너는 먼 다리 + 큰길까지 잇기
function rdDetour(m, cols, avoid) {
  const mid = avoid.length ? avoid.reduce((s, y) => s + y, 0) / avoid.length : m.h / 2;
  const cand = [];
  for (let y = 2; y < m.h - 2; y++) if (Math.abs(y - mid) >= 5 && cols.every((a) => m.G[y][a] === "-")) cand.push(y);
  cand.sort((p, q) => Math.abs(q - mid) - Math.abs(p - mid));
  const yd = cand.find((y) => Math.abs(y - mid) <= 8) || cand[0];
  if (yd == null) return null;
  cols.forEach((a) => (m.G[yd][a] = "b"));
  const L = cols[0] - 1, R = cols[cols.length - 1] + 1;
  [L, R].forEach((a) => {
    if (m.O[yd][a] && m.O[yd][a] !== "K") m.O[yd][a] = "";
    if (["#", "W", "~"].includes(m.G[yd][a])) m.G[yd][a] = ":";
    tPave(m, a, yd);
  });
  return yd;
}
function rdFree(m, a, y) {
  for (let r = 0; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (rdWalk(m, a + dx, y + dy)) return [a + dx, y + dy];
  return [a, y];
}
const RDB = {
  A(m) {
    const s = rdStream(m), B = [];
    for (let y = 1; y < m.h - 1; y++) if (m.G[y][s] === "b") B.push(y);
    B.forEach((y) => (m.G[y][s] = "-"));
    const yd = rdDetour(m, [s], B);
    const d = { s, B, yd };
    if (B.length) {
      const ly = B[0] - 1;
      if (rdWalk(m, s - 1, ly)) (m.O[ly][s - 1] = "p"), m.deco.push({ k: "log", x: s - 1, y: ly });
    }
    return d;
  },
  B(m) {
    const lamps = [];
    for (const a of [7, 15, 23, 31, m.w - 6]) {
      const R = rdPathRows(m, a);
      if (!R.length) continue;
      const y = R[0] - 1;
      if (rdWalk(m, a, y)) {
        m.O[y][a] = "p";
        m.deco.push({ k: "lamp", x: a, y });
        lamps.push([a, y]);
      }
    }
    return { lamps };
  },
  C(m) {
    const ice = new Set();
    const s = rdStream(m);
    [[9, 7], [s + 3, 7]].forEach(([a0, wd]) => {
      for (let a = a0; a < Math.min(m.w - 3, a0 + wd); a++) {
        if (Math.abs(a - s) <= 1) continue;
        const R = rdPathRows(m, a);
        const c = R.length ? R[0] : Math.round(m.h / 2);
        for (let y = c - 3; y <= c + 4; y++) if (rdWalk(m, a, y) || (y > 0 && y < m.h - 1 && (m.G[y][a] === ":" ) && !m.O[y][a])) ice.add(rdK(a, y));
      }
    });
    return { ice: [...ice] };
  },
  D(m) {
    const rocks = [];
    for (const a of [11, 19, 29]) {
      const R = rdPathRows(m, a);
      if (R.length < 2) continue;
      const y = R[0];
      if (!m.O[y][a] && m.G[y][a] === ":") {
        m.O[y][a] = "r";
        rocks.push([a, y]);
      }
    }
    return { rocks };
  },
  E(m) {
    // 큰길 위쪽(또는 아래쪽)에 나무로 둘러싼 작은 공터 + 나무 틈 통로
    for (const a0 of [9, 30, 18, 6]) {
      const R = rdPathRows(m, a0 + 2);
      if (!R.length) continue;
      for (const up of [true, false]) {
        const py0 = up ? R[0] : R[R.length - 1];
        const top = up ? py0 - 7 : py0 + 3, bot = top + 4;
        if (top < 1 || bot > m.h - 2) continue;
        let ok = true;
        for (let y = top; y <= bot && ok; y++) for (let a = a0; a <= a0 + 4 && ok; a++) if (!["." , ","].includes(m.G[y][a]) || ["K", "X", "p"].includes(m.O[y][a])) ok = false;
        if (!ok) continue;
        for (let y = top; y <= bot; y++) for (let a = a0; a <= a0 + 4; a++) m.O[y][a] = y === top || y === bot || a === a0 || a === a0 + 4 ? "T" : "";
        const pass = [];
        const cx = a0 + 2;
        if (up) for (let y = bot; y < py0; y++) (m.O[y][cx] = "T"), pass.push(rdK(cx, y));
        else for (let y = top; y > py0; y--) (m.O[y][cx] = "T"), pass.push(rdK(cx, y));
        return { pass, gift: [cx, up ? top + 2 : bot - 2], door: up ? [cx, py0 - 1] : [cx, py0 + 1] };
      }
    }
    return { pass: [] };
  },
  F(m) {
    const slow = [];
    const s = rdStream(m);
    const a0 = Math.abs(9 - s) < 4 ? 30 : 9;
    for (let a = a0; a < a0 + 3; a++) for (let y = 1; y < m.h - 1; y++) if (!["~", "-", "#", "s"].includes(m.G[y][a]) && m.O[y][a] !== "K") slow.push(rdK(a, y));
    return { slow };
  },
  G(m) {
    const s = rdStream(m), cols = [s - 1, s, s + 1];
    const B = [];
    for (let y = 1; y < m.h - 1; y++) {
      if (m.G[y][s] === "~" || m.G[y][s] === "s") continue;
      if (m.G[y][s] === "b") B.push(y);
      cols.forEach((a) => {
        if (["K", "X"].includes(m.O[y][a])) return;
        m.O[y][a] = "";
        m.G[y][a] = "-";
      });
    }
    const yd = rdDetour(m, cols, B);
    if (!B.length) B.push(Math.round(m.h / 2));
    const lo = Math.max(1, Math.min(...B) - 5), hi = Math.min(m.h - 3, Math.max(...B) + 4);
    return { s, B, yd, lo, hi };
  },
  H(m) {
    const fl = [];
    const s = rdStream(m);
    for (const a of [8, 17, s + 5]) {
      const R = rdPathRows(m, a);
      if (!R.length) continue;
      const y = R[R.length - 1] + 1;
      if (rdWalk(m, a, y)) fl.push([a, y]);
    }
    const col = { gold: "#ffd84a", garden: "#ff7aa8", stone: "#7ac8ff" }[m.theme] || "#ff7aa8";
    const last = fl[fl.length - 1];
    return { fl, col, gift: last ? rdFree(m, last[0] + 2, last[1] + 1) : null };
  },
  I(m) {
    const cr = [];
    const s = rdStream(m);
    for (let a = 12; a <= 22; a++) {
      if (Math.abs(a - s) <= 1) continue;
      rdPathRows(m, a).forEach((y) => m.G[y][a] === ":" && cr.push(rdK(a, y)));
    }
    return { cr };
  },
};
// 장치를 맵에 넣기(처음 한 번)
(function rdApply() {
  for (const id in RDEV) {
    const m = MAPS[id];
    if (!m || m.kind !== "route") continue;
    m.deco = m.deco || [];
    const k = RDEV[id];
    m.dev = { k, ...RDB[k](m) };
    m.dev.passSet = new Set(m.dev.pass || []);
    m.dev.iceSet = new Set(m.dev.ice || []);
    m.dev.slowSet = new Set(m.dev.slow || []);
    m.dev.crSet = new Set(m.dev.cr || []);
    // 물·막힌 칸에 있게 된 몬스터·재료·지문 옮기기
    const bad = (a, y) => !m.G[y] || ["-", "~", "#", "W"].includes(m.G[y][a]) || (m.O[y][a] && m.O[y][a] !== "X") || m.dev.passSet.has(rdK(a, y));
    m.mons = m.mons.map(([t, a, y]) => (t !== "gate" && !MON[t].boss && bad(a, y) ? [t, ...rdFree(m, a, y)] : [t, a, y]));
    m.nodes = (m.nodes || []).map(([t, a, y]) => (bad(a, y) ? [t, ...rdFree(m, a, y)] : [t, a, y]));
  }
  for (const id in RMON_ADD) {
    const m = MAPS[id];
    if (!m) continue;
    const used = new Set(m.mons.map(([, a, y]) => rdK(a, y)));
    const R = reachSet(m);
    RMON_ADD[id].forEach(([t, n], j) =>
      picks(m, n, (a, y) => a > 5 && a < m.w - 5 && R.has(rdK(a, y)) && !used.has(rdK(a, y)) && m.G[y][a] !== ":", 777 + j * 31).forEach(([a, y]) => {
        used.add(rdK(a, y));
        m.mons.push([t, a, y]);
      }),
    );
  }
})();
// 걸어서 못 가는 자리의 몬스터는 가까운 갈 수 있는 자리로(숨은 공터 안은 그대로)
for (const id in MAPS) {
  const m = MAPS[id];
  if (m.kind !== "route" && m.kind !== "dead") continue;
  const e0 = m.exits[0];
  const R = tReach(m, e0.x0, e0.y0);
  const L = [...R].map((k) => k.split(",").map(Number)).filter(([a, y]) => a > 3 && a < m.w - 3 && y > 0 && y < m.h - 1);
  const g = m.dev && m.dev.k === "E" && m.dev.gift;
  m.mons = m.mons.map(([t, a, y]) => {
    if (t === "gate" || MON[t].boss || R.has(rdK(a, y)) || (g && Math.abs(a - g[0]) <= 2 && Math.abs(y - g[1]) <= 2)) return [t, a, y];
    let b = null, bd = 1e9;
    L.forEach(([c, z]) => {
      const dd = Math.abs(c - a) + Math.abs(z - y);
      if (dd < bd && m.G[z][c] !== ":") (bd = dd), (b = [c, z]);
    });
    return b ? [t, b[0], b[1]] : [t, a, y];
  });
}
const rdSt = () => {
  const s = (save.st = save.st || {});
  s.rdev = s.rdev || {};
  s.rdHint = s.rdHint || {};
  return s;
};
const rdTile = () => [Math.floor(pl.x / T), Math.floor(pl.y / T)];

/* 그리기(바탕): 길목 소품·얼음·여울 */
{
  const dm0 = decoMap;
  decoMap = function (m, bc) {
    dm0(m, bc);
    if (m.kind !== "route") return;
    (m.deco || []).forEach((d) => PROPS[d.k] && PROPS[d.k](bc, d.x * T, d.y * T));
    const d = m.dev;
    if (!d) return;
    (d.ice || []).forEach((k) => {
      const [a, y] = k.split(",").map(Number);
      P(bc, a * T, y * T, T, T, "rgba(200,236,255,.55)");
      if (hsh(a, y) % 3 === 0) P(bc, a * T + 3 + (hsh(a, y) % 8), y * T + 4, 4, 1, "rgba(255,255,255,.9)");
    });
    (d.slow || []).forEach((k) => {
      const [a, y] = k.split(",").map(Number);
      P(bc, a * T, y * T, T, T, "rgba(90,166,220,.45)");
      if (hsh(a * 3, y) % 4 === 0) P(bc, a * T + 2 + (hsh(a, y) % 10), y * T + 8, 3, 1, "rgba(220,240,255,.8)");
    });
  };
}
/* 막힘: 숨은 틈은 지나가고, 발판은 딛고, 사라진 길은 막힘 */
{
  const bk0 = blk;
  blk = function (tx, ty, air) {
    const d = M && M.dev;
    if (d) {
      if (d.k === "E" && d.passSet.has(tx + "," + ty)) return false;
      if (d.k === "G" && RD.plat && tx >= d.s - 1 && tx <= d.s + 1 && ty >= Math.floor(RD.plat.y) && ty <= Math.floor(RD.plat.y) + 1) return false;
      if (d.k === "I") {
        const c = RD.cr[tx + "," + ty];
        if (c && c.gone > 0) return true;
      }
    }
    return bk0(tx, ty, air);
  };
}
/* 느리게(여울) */
{
  const tm0 = tryMove;
  tryMove = function (o, dx, dy, air) {
    const d = M && M.dev;
    if (o === pl && d && d.k === "F" && !air && d.slowSet.has(rdK(Math.floor(pl.x / T), Math.floor(pl.y / T)))) {
      dx *= 0.5;
      dy *= 0.5;
    }
    return tm0(o, dx, dy, air);
  };
}
/* 맵에 들어올 때 */
{
  const lm0 = loadMap;
  loadMap = function () {
    const r = lm0.apply(this, arguments);
    RD.t = 0;
    RD.lit = new Set();
    RD.cr = {};
    RD.slide = null;
    RD.fl = 0;
    RD.last = null;
    const d = M && M.dev;
    RD.plat = d && d.k === "G" ? { y: (d.lo + d.hi) / 2, v: 0.035 } : null;
    if (d && save.job) {
      const st = rdSt();
      if (!st.rdHint[d.k]) {
        st.rdHint[d.k] = 1;
        toastLater(() => "🧭 " + RDEV_NAME[d.k] + " · " + RDEV_HINT[d.k], 900);
      }
    }
    return r;
  };
}
function rdGift(id, what) {
  const st = rdSt();
  st.rdev[id] = st.rdev[id] || {};
  if (st.rdev[id][what]) return;
  st.rdev[id][what] = 1;
  const tier = M.tier || 1, gd = 10 + tier * 8, du = 2 + Math.floor(tier / 2);
  gain(5 + tier * 4, gd, du);
  if (typeof sfx === "function") sfx("chest");
  toast((what === "hid" ? "숨은 샛길의 보물! " : "꽃길이 열린 보물! ") + "금화 +" + gd + " · 가루 +" + du);
  store();
  hud();
}
/* 매 장면 */
{
  const up0 = update;
  update = function () {
    const ox = pl.x, oy = pl.y;
    up0();
    const d = M && M.dev;
    if (!d || busy) return;
    RD.t++;
    const [tx, ty] = rdTile();
    const k = rdK(tx, ty);
    if (d.k === "B") (d.lamps || []).forEach(([a, y]) => Math.hypot(a * T + 8 - pl.x, y * T + 8 - pl.y) < 22 && !RD.lit.has(rdK(a, y)) && (RD.lit.add(rdK(a, y)), sfx && sfx("ok")));
    if (d.k === "C") {
      const mx = pl.x - ox, my = pl.y - oy;
      if (d.iceSet.has(k) && !pl.z) {
        if (!RD.slide && (Math.abs(mx) > 0.3 || Math.abs(my) > 0.3)) RD.slide = Math.abs(mx) >= Math.abs(my) ? [Math.sign(mx) * 2.6, 0] : [0, Math.sign(my) * 2.6];
        if (RD.slide) {
          const bx = pl.x, by = pl.y;
          tryMove(pl, RD.slide[0], RD.slide[1], false);
          if (bx === pl.x && by === pl.y) RD.slide = null;
          else pl.mv = true;
        }
      } else RD.slide = null;
    }
    if (d.k === "D") {
      const ph = RD.t % 480;
      RD.gust = ph > 380;
      RD.warn = ph > 320 && ph <= 380;
      if (RD.gust && !pl.z) {
        const shelter = [0, -1].some((dy) => {
          const o = (M.O[ty + dy] || [])[tx + 1];
          return o === "r" || o === "T" || o === "l";
        });
        if (!shelter) tryMove(pl, -1.1, 0, false);
      }
    }
    if (d.k === "E" && d.gift && !(rdSt().rdev[M.id] || {}).hid && Math.hypot(d.gift[0] * T + 8 - pl.x, d.gift[1] * T + 10 - pl.y) < 14) rdGift(M.id, "hid");
    if (d.k === "G" && RD.plat) {
      const P0 = RD.plat, onP = tx >= d.s - 1 && tx <= d.s + 1 && ty >= Math.floor(P0.y) && ty <= Math.floor(P0.y) + 1;
      P0.y += P0.v;
      if (P0.y > d.hi || P0.y < d.lo) P0.v *= -1;
      if (onP && M.G[ty][tx] === "-") {
        const ny = pl.y + P0.v * T;
        if (!hitbox(pl.x, ny, false)) pl.y = ny;
      }
    }
    if (d.k === "H" && d.fl.length && !(rdSt().rdev[M.id] || {}).flower) {
      if (RD.fl < d.fl.length) {
        const i = d.fl.findIndex(([a, y]) => a === tx && y === ty);
        if (i >= 0 && RD.last !== k) {
          if (i === RD.fl) {
            RD.fl++;
            if (typeof sfx === "function") sfx("ok");
            if (RD.fl === d.fl.length) toast("🌸 꽃길이 열렸어요! 반짝이는 곳으로 가 봐요");
          } else if (i > RD.fl || i < RD.fl - 1) {
            RD.fl = i === 0 ? 1 : 0;
            toast("꽃이 시들었어요… 왼쪽 꽃부터 다시 밟아 봐요");
          }
        }
      } else if (d.gift && Math.hypot(d.gift[0] * T + 8 - pl.x, d.gift[1] * T + 10 - pl.y) < 14) rdGift(M.id, "flower");
    }
    if (d.k === "I") {
      if (d.crSet.has(k) && !RD.cr[k] && !pl.z) RD.cr[k] = { t: 45, gone: 0 };
      for (const c in RD.cr) {
        const v = RD.cr[c];
        if (v.t > 0) {
          v.t--;
          if (v.t === 0) {
            if (c === k) v.t = 1;
            else v.gone = 240;
          }
        } else if (v.gone > 0 && --v.gone === 0) delete RD.cr[c];
      }
    }
    RD.last = k;
  };
}
/* 그리기(위): 어둠·바람·발판·꽃·지워지는 길·숨은 틈 반짝 */
{
  const fx0 = drawFx;
  let dk = null;
  drawFx = function () {
    const d = M && M.dev;
    if (d) {
      try {
        const cx = (a) => Math.round(a - cam.x), cy = (y) => Math.round(y - cam.y);
        if (d.k === "G" && RD.plat) {
          const X = cx((d.s - 1) * T), Y = cy(RD.plat.y * T);
          P(x, X, Y + 2, T * 3, T * 2, "rgba(0,0,0,.25)");
          P(x, X, Y, T * 3, T * 2 - 2, "#9a6a3a");
          for (let i = 0; i < 6; i++) P(x, X + i * 8, Y, 1, T * 2 - 2, "#6b4a2a");
          P(x, X, Y, T * 3, 2, "#c99a5a");
        }
        if (d.k === "I")
          for (const c in RD.cr) {
            const [a, y] = c.split(",").map(Number), v = RD.cr[c];
            if (v.gone > 0) {
              P(x, cx(a * T), cy(y * T), T, T, "rgba(230,230,240,.92)");
              if (v.gone < 40 && v.gone % 8 < 4) P(x, cx(a * T) + 4, cy(y * T) + 4, 8, 8, "rgba(200,190,170,.7)");
            } else {
              P(x, cx(a * T) + 3, cy(y * T) + 5, 7, 1, "rgba(60,50,40,.7)");
              P(x, cx(a * T) + 8, cy(y * T) + 6, 1, 5, "rgba(60,50,40,.7)");
            }
          }
        if (d.k === "H") {
          const done = (rdSt().rdev[M.id] || {}).flower;
          d.fl.forEach(([a, y], i) => {
            const X = cx(a * T + 8), Y = cy(y * T + 10), on = done || i < RD.fl;
            P(x, X - 1, Y - 4, 2, 5, "#3B6D11");
            P(x, X - 3, Y - 8, 6, 5, on ? d.col : "#8a8a8a");
            P(x, X - 1, Y - 7, 2, 2, on ? "#fff6d0" : "#5a5a5a");
            if (on && tk % 20 < 10) P(x, X + 4, Y - 10, 1, 1, "#fff6d0");
          });
          if (!done && RD.fl >= d.fl.length && d.gift) {
            const X = cx(d.gift[0] * T + 8), Y = cy(d.gift[1] * T + 8);
            P(x, X - 5, Y - 4, 10, 7, "#b8742a");
            P(x, X - 5, Y - 4, 10, 2, "#ffd86b");
            if (tk % 16 < 8) P(x, X - 1, Y - 9, 2, 2, "#fff6d0");
          }
        }
        if (d.k === "E" && d.gift && !(rdSt().rdev[M.id] || {}).hid) {
          const X = cx(d.gift[0] * T + 8), Y = cy(d.gift[1] * T + 8);
          P(x, X - 5, Y - 4, 10, 7, "#b8742a");
          P(x, X - 5, Y - 4, 10, 2, "#ffd86b");
          if (d.door && tk % 90 < 12) P(x, cx(d.door[0] * T + 6), cy(d.door[1] * T - 2), 2, 2, "#fff6d0");
        }
        if (d.k === "D" && (RD.gust || RD.warn) && !UI.calm) {
          for (let i = 0; i < (RD.gust ? 14 : 4); i++) {
            const yy = (hsh(i, 7) % H), xx = W - ((tk * (RD.gust ? 7 : 3) + hsh(i, 3)) % (W + 40));
            P(x, xx, yy, RD.gust ? 14 : 8, 1, "rgba(255,255,255,.55)");
          }
        }
        if (d.k === "B") {
          if (!dk) dk = document.createElement("canvas");
          if (dk.width !== W || dk.height !== H) (dk.width = W), (dk.height = H);
          const g = dk.getContext("2d");
          g.globalCompositeOperation = "source-over";
          g.clearRect(0, 0, W, H);
          g.fillStyle = "rgba(8,6,24,.78)";
          g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = "destination-out";
          const hole = (px, py, r) => {
            const gr = g.createRadialGradient(px, py, r * 0.35, px, py, r);
            gr.addColorStop(0, "rgba(0,0,0,1)");
            gr.addColorStop(1, "rgba(0,0,0,0)");
            g.fillStyle = gr;
            g.fillRect(px - r, py - r, r * 2, r * 2);
          };
          hole(pl.x - cam.x, pl.y - 6 - cam.y, 44);
          (d.lamps || []).forEach(([a, y]) => hole(a * T + 8 - cam.x, y * T + 4 - cam.y, RD.lit.has(rdK(a, y)) ? 72 : 10));
          x.drawImage(dk, 0, 0, W, H);
          (d.lamps || []).forEach(([a, y]) => RD.lit.has(rdK(a, y)) && P(x, cx(a * T + 6), cy(y * T + 2), 4, 3, "#ffe28a"));
        }
      } catch (e) {}
    }
    fx0.apply(this, arguments);
  };
}
