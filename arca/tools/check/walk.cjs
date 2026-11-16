// 사람처럼 걷는 봇: 1~12부 모든 마을·길목·막다른 길을 실제로 걸어서(칸 길찾기 + 게임 움직임 tryMove/update)
//  ① 들어온 자리에서 출구마다 걸어가 다음 맵으로 넘어가는지
//  ② 마을 건물 문 → 안 → 나오기(끼지 않는지)
//  ③ 마이룸 단추 → 마이룸 → 나오기(끼지 않는지)
// 몬스터는 치우고(전투 빼고 길만 봄), 길목 장치(어둠·얼음·바람·발판·지워지는 길 등)는 켠 채로 걷는다.
// node arca/tools/check/walk.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof RDEV !== 'undefined' && typeof plUnstick !== 'undefined');
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fails = [], stats = { maps: 0, exits: 0, doors: 0, home: 0, frames: 0 };
    const F = (m) => fails.push(m);
    // 진행 잠금·장면·수업·튜토리얼 끄기
    save.job = 'knight'; save.trained = 1; save.met.momo = 1; save.lv = 20;
    LESSON.auto = false; if (typeof TUT !== 'undefined') TUT.auto = false; SCUT.off = true; MATK.off = true;
    for (const id in MAPS) { save.boss[id] = 1; save.vis[id] = 1; save.st['in_' + id] = 1; }
    PARTTOWN.forEach((t, i) => { save.done[t] = [1, 1, 1, 1, 1, 1, 1, 1]; save.st['done_' + i] = 1; save.st['boss_' + i] = 1; });
    save.st.rdHint = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1, I: 1 };
    // 문지기를 물리친 저장처럼: 잠금 칸(X) 치우기(게임에서는 문지기를 물리칠 때·불러올 때 열림)
    for (const id in MAPS) (MAPS[id].locks || []).forEach((L) => L.tiles.forEach(([a, y]) => { if (MAPS[id].O[y][a] === 'X') MAPS[id].O[y][a] = ''; }));
    const calm = () => {
      for (let i = 0; i < 30 && dl; i++) { if (dl.ch && dl.i === dl.lines.length - 1) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); }
      document.querySelectorAll('.box:not(#dlg)').forEach((e) => (e.hidden = true));
      busy = false; B = null; if (typeof ORB === 'object') ORB.on = false;
      mons.forEach((q) => (q.dead = 1e9)); BP.zones = []; pl.hp = 99; pl.inv = 999;
    };
    const free = (a, y) => a >= 0 && y >= 0 && a < MW && y < MH && !hitbox(a * T + 8, y * T + 12, false);
    const tile = () => [Math.floor(pl.x / T), Math.floor(pl.y / T)];
    // 칸 길찾기(목표 칸은 막혀 있어도 그 옆까지)
    const path = (gx, gy) => {
      const [sx, sy] = tile(), prev = new Map([[sx + ',' + sy, null]]), q = [[sx, sy]];
      while (q.length) {
        const [a, y] = q.shift();
        if (a === gx && y === gy) {
          const L = []; let k = a + ',' + y;
          while (k) { L.unshift(k.split(',').map(Number)); k = prev.get(k); }
          return L;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const na = a + dx, ny = y + dy, k = na + ',' + ny;
          if (prev.has(k) || !(free(na, ny) || (na === gx && ny === gy))) continue;
          prev.set(k, a + ',' + y);
          q.push([na, ny]);
        }
      }
      return null;
    };
    // 출구 칸에 닿은 뒤 맵 밖으로 몇 걸음 더(사람은 계속 걸어 나감)
    const exitTo = async (e, startId) => {
      const r = await walkTo(e.x0, e.y0, startId);
      if (r !== 'ok') return r;
      const dx = e.x0 === 0 ? -1 : e.x0 >= MW - 1 ? 1 : 0, dy = e.y0 === 0 ? -1 : e.y0 >= MH - 1 ? 1 : dx ? 0 : 1;
      for (let i = 0; i < 30 && M.id === startId; i++) { tryMove(pl, dx * 2.6, dy * 2.6, false); update(); calm(); }
      return M.id !== startId ? 'changed' : 'edge';
    };
    // 걷기: 맵이 바뀌면 'changed', 닿으면 'ok', 길이 없으면 'nopath', 제자리면 'stuck'
    const walkTo = async (gx, gy, startId) => {
      let best = 1e9, still = 0;
      for (let f = 0; f < 1500; f++) {
        if (M.id !== startId) return 'changed';
        calm();
        const [tx, ty] = tile();
        if (tx === gx && ty === gy) return 'ok';
        const P = path(gx, gy);
        if (!P) return 'nopath';
        const nx = P[1] || P[0], X = nx[0] * T + 8, Y = nx[1] * T + 12;
        const dx = X - pl.x, dy = Y - pl.y, d = Math.hypot(dx, dy) || 1;
        // 한 칸씩 걷기(키를 누른 것처럼 tryMove → 게임 update)
        tryMove(pl, (dx / d) * Math.min(2.6, d), (dy / d) * Math.min(2.6, d), false);
        // 한 칸 개울(무너진 다리)은 점프로
        if (M.dev && M.dev.k === 'A' && Math.abs(dx) + Math.abs(dy) > 0 && hitbox(pl.x + Math.sign(dx) * 4, pl.y, false)) { pl.z = 6; tryMove(pl, (dx / d) * 2.6, (dy / d) * 2.6, true); pl.z = 0; }
        update();
        stats.frames++;
        const dist = Math.abs(gx - Math.floor(pl.x / T)) + Math.abs(gy - Math.floor(pl.y / T));
        if (dist < best) { best = dist; still = 0; } else if (++still > 220) return 'stuck';
        if (f % 120 === 0) await sleep(0);
      }
      return 'stuck';
    };
    const load = (id, a, y) => { loadMap(id, a, y, true); calm(); };
    const ids = [...new Set(CHAIN.concat(Object.values(DEADS)))].filter((id) => MAPS[id]);
    for (const id of ids) {
      const m = MAPS[id];
      stats.maps++;
      const start = m.kind === 'town' ? m.spawn : [m.exits[0].x0 + (m.exits[0].d === 'l' ? 1 : 0), m.exits[0].y0 + (m.exits[0].d === 'u' ? 1 : 0)];
      // 시작 자리가 막혔으면 끼임 풀기가 옮겨 줌
      load(id, start[0], start[1]);
      if (hitbox(pl.x, pl.y, false)) F(id + ' 시작 자리에 낌');
      const home0 = [Math.floor(pl.x / T), Math.floor(pl.y / T)];
      // ① 출구마다
      for (const e of m.exits) {
        load(id, home0[0], home0[1]);
        if (e.need && !e.need()) continue;
        const res = await exitTo(e, id);
        stats.exits++;
        if (res !== 'changed') F(id + ' → ' + e.to + ' 출구까지 못 감(' + res + ', ' + tile().join(',') + ')');
        else if (M.id !== e.to) F(id + ' → ' + e.to + ' 인데 ' + M.id + ' 로 감');
        else if (hitbox(pl.x, pl.y, false)) F(id + ' → ' + e.to + ' 도착하니 낌');
      }
      // ② 건물 문
      if (m.kind === 'town')
        for (const bd of m.bld.filter((q) => q.to && MAPS[q.to])) {
          load(id, home0[0], home0[1]);
          const res = await walkTo(bd.dx, bd.dy + 1, id);
          stats.doors++;
          if (res !== 'ok') { F(id + ' ' + bd.n + ' 문 앞까지 못 감(' + res + ')'); continue; }
          interact({ type: 'door', ref: bd });
          calm();
          if (M.id !== bd.to) { F(id + ' ' + bd.n + ' 문이 안 열림'); continue; }
          const room = M, ex = room.exits[0];
          const res2 = await exitTo(ex, room.id);
          if (res2 !== 'changed' || M.id !== id) F(id + ' ' + bd.n + ' 안에서 못 나옴(' + res2 + ')');
          else if (hitbox(pl.x, pl.y, false)) F(id + ' ' + bd.n + ' 나오니 낌');
        }
      // ③ 마이룸 오가기(시작 자리에서 몇 칸 걸은 뒤)
      if (id === 'home') continue;
      load(id, home0[0], home0[1]);
      $('homeb').click();
      calm();
      if (M.id !== 'home') { F(id + ' 마이룸 단추가 안 됨'); continue; }
      const he = M.exits[0];
      const res3 = await exitTo(he, 'home');
      stats.home++;
      if (res3 !== 'changed' || M.id !== id) F(id + ' 마이룸에서 못 돌아옴(' + res3 + ', ' + M.id + ')');
      else if (hitbox(pl.x, pl.y, false)) F(id + ' 마이룸에서 돌아오니 낌');
    }
    // ④ 건물·나무 바로 옆 여러 자리에서(발 위치도 칸 위·가운데·아래) 마이룸 오가기 — 2026-11-16 시계탑 끼임
    stats.edge = 0;
    for (const id of ids.filter((q) => MAPS[q].kind === 'town')) {
      const m = MAPS[id], C = [];
      for (let y = 1; y < m.h - 1; y++) for (let a = 1; a < m.w - 1; a++) if (!m.O[y][a] && ['B', 'T', 'p'].includes(m.O[y - 1][a])) C.push([a, y]);
      C.filter((_, i) => i % Math.max(1, Math.floor(C.length / 25)) === 0).forEach(([a, y]) => {
        for (const off of [1, 8, 15]) {
          load(id, a, y);
          pl.x = a * T + 8; pl.y = y * T + off;
          if (hitbox(pl.x, pl.y, false)) continue; // 사람이 설 수 없는 자리
          $('homeb').click(); calm();
          const e = MAPS.home.exits[0];
          loadMap(e.to, e.at[0], e.at[1], true); calm();
          stats.edge++;
          if (M.id !== id) F(id + ' ' + a + ',' + y + ' 마이룸 갔다 오니 다른 맵 ' + M.id);
          else if (hitbox(pl.x, pl.y, false)) F(id + ' ' + a + ',' + y + '(+' + off + ') 마이룸 갔다 오니 낌');
          else if (Math.abs(Math.floor(pl.x / T) - a) + Math.abs(Math.floor(pl.y / T) - y) > 1) F(id + ' ' + a + ',' + y + '(+' + off + ') 돌아온 자리가 멂 ' + Math.floor(pl.x / T) + ',' + Math.floor(pl.y / T));
        }
      });
    }
    return { fails, stats };
  });
  console.log(JSON.stringify(r.stats), '\nfails', JSON.stringify(r.fails, null, 1), '\nerrs', errs.slice(0, 10));
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
