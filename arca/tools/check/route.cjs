// 길목 장치 검사(프롬프트 O 2단계): 27곳 장치·몬스터 종류, 장치 없이도 걸어서 끝까지 가는지, 장치 9종이 실제로 움직이는지
// node arca/tools/check/route.cjs [사진 폴더]
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof RDEV !== 'undefined' && typeof MAPS !== 'undefined');
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fails = [], rows = [];
    const F = (m) => fails.push(m);
    save.job = 'knight'; save.trained = 1; save.met.momo = 1;
    if (typeof TUT !== 'undefined') TUT.auto = false;
    const routes = Object.keys(MAPS).filter((k) => MAPS[k].kind === 'route');
    for (const id of routes) {
      const m = MAPS[id];
      if (!m.dev) F(id + ' 장치 없음');
      // 장치 없이(숨은 틈·발판 없이) 걸어서
      const e0 = m.exits[0];
      const R = tReach(m, e0.x0, e0.y0);
      const kinds = new Set(m.mons.map((q) => q[0]).filter((t) => t !== 'gate' && !MON[t].boss));
      if (kinds.size < 3) F(id + ' 몬스터 종류 ' + kinds.size);
      const pocket = new Set();
      if (m.dev && m.dev.k === 'E' && m.dev.gift) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pocket.add((m.dev.gift[0] + dx) + ',' + (m.dev.gift[1] + dy));
      m.exits.forEach((e) => { if (!R.has(e.x0 + ',' + e.y0) && !(e.x0 === m.w - 1 && m.locks.length)) { const inner = [[e.x0 - 1, e.y0], [e.x0 + 1, e.y0], [e.x0, e.y0 + 1]].some(([a, y]) => R.has(a + ',' + y)); if (!inner) F(id + ' 출구 못 감 → ' + e.to); } });
      m.spots.forEach((s) => { if (![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => R.has((s.tx + dx) + ',' + (s.ty + dy)))) F(id + ' 지문 못 감'); });
      m.mons.forEach(([t, a, y]) => { if (!R.has(a + ',' + y) && !pocket.has(a + ',' + y) && t !== 'gate' && !(m.O[y][a] === 'X')) { const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => R.has((a + dx) + ',' + (y + dy))); if (!near) F(id + ' 몬스터 못 감 ' + t + ' ' + a + ',' + y); } });
      if (m.gatePos && ![[0, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R.has((m.gatePos[0] + dx) + ',' + (m.gatePos[1] + dy)))) F(id + ' 문지기 못 감');
      rows.push({ id, 이름: m.short, 장치: m.dev ? RDEV_NAME[m.dev.k] : '-', 몬스터: [...kinds].join(' ') });
    }
    // 장치 9종 실제로
    MR.off = true; // 수학 판은 mathroute.cjs 가 본다(여기선 장치 그대로)
    const go = async (id, tx, ty) => { loadMap(id, tx, ty, true); busy = false; document.querySelectorAll('#dlg').forEach((e) => (e.hidden = true)); dl = null; mons.forEach((q) => (q.dead = 1e9)); await sleep(30); };
    const steps = async (n) => { for (let i = 0; i < n; i++) update(); };
    const at = (a, y) => { pl.x = a * T + 8; pl.y = y * T + 12; };
    let d;
    // A: 무너진 다리 — 다리 칸이 물
    d = MAPS.r13.dev; if (!(d.B.length && d.B.every((y) => MAPS.r13.G[y][d.s] === '-') && d.yd != null && MAPS.r13.G[d.yd][d.s] === 'b')) F('A 무너진 다리·돌아가는 다리');
    // B: 어두운 길 — 등불 곁에 가면 켜짐
    await go('r6', 2, 10); d = M.dev; at(d.lamps[0][0], d.lamps[0][1] + 1); await steps(2); if (!RD.lit.size) F('B 등불 안 켜짐');
    // C: 얼음 — 한 번 밀면 계속 미끄러짐
    await go('r25', 2, 10); d = M.dev; { const [a, y] = d.ice[Math.floor(d.ice.length / 4)].split(',').map(Number); at(a, y); const x0 = pl.x; RD.slide = [2.6, 0]; await steps(5); if (!(pl.x > x0 + 6)) F('C 안 미끄러짐 ' + (pl.x - x0)); }
    // D: 바람 — 바람 불 때 밀림, 바위 서쪽이면 안 밀림
    await go('r8', 2, 10); d = M.dev; { { let ok = null; for (let y = 2; y < M.h - 2 && !ok; y++) for (let a = 8; a < 30 && !ok; a++) if (!blk(a, y) && !blk(a - 1, y) && !blk(a - 2, y) && !blk(a + 1, y) && !blk(a + 1, y - 1)) ok = [a, y]; at(ok[0], ok[1]); } RD.t = 400; const x0 = pl.x; await steps(10); if (!(pl.x < x0 - 3)) F('D 바람에 안 밀림'); const [ra, ry] = d.rocks[0]; at(ra - 1, ry); RD.t = 400; const x1 = pl.x; await steps(10); if (pl.x < x1 - 1) F('D 바위 뒤인데 밀림'); }
    // E: 숨은 샛길 — 틈 통과, 보물
    await go('r5', 2, 10); d = M.dev; if (!d.pass.length) F('E 틈 없음'); else { const [a, y] = d.pass[0].split(',').map(Number); if (blk(a, y)) F('E 틈이 막힘'); const g0 = save.gold; pl.x = d.gift[0] * T + 8; pl.y = d.gift[1] * T + 10; await steps(1); if (!(save.gold > g0)) F('E 보물 없음'); }
    // F: 물길 — 느림
    await go('r7', 2, 10); d = M.dev; { const [a, y] = d.slow.find((k) => { const [a, y] = k.split(',').map(Number); return !blk(a, y) && !blk(a + 1, y) && !blk(a + 2, y); }).split(',').map(Number); at(a, y); const x0 = pl.x; tryMove(pl, 2, 0); if (Math.abs(pl.x - x0 - 1) > 0.01) F('F 안 느림 ' + (pl.x - x0)); }
    // G: 발판 — 위에 서면 같이 움직임
    await go('r12', 2, 10); d = M.dev; { RD.plat.y = d.lo + 2; RD.plat.v = 0.035; at(d.s, Math.floor(RD.plat.y)); const y0 = pl.y; await steps(10); if (!(pl.y > y0 + 3)) F('G 발판이 안 태움 ' + (pl.y - y0)); if (blk(d.s, Math.floor(RD.plat.y))) F('G 발판 칸이 막힘'); }
    // H: 꽃길 — 차례대로 밟으면 보물
    await go('r11', 2, 10); d = M.dev; { const g0 = save.gold; for (const [a, y] of d.fl) { at(a, y); await steps(1); at(a, y - 2 >= 1 ? y - 2 : y + 2); await steps(1); } if (RD.fl !== d.fl.length) F('H 꽃 차례 ' + RD.fl); at(d.gift[0], d.gift[1]); pl.y = d.gift[1] * T + 10; await steps(1); if (!(save.gold > g0)) F('H 보물 없음'); }
    // I: 지워지는 길 — 밟은 뒤 사라짐 → 다시 생김
    await go('r27', 2, 10); d = M.dev; { const [a, y] = d.cr[3].split(',').map(Number); at(a, y); await steps(2); at(a, y - 3); await steps(50); if (!(RD.cr[a + ',' + y] && RD.cr[a + ',' + y].gone > 0 && blk(a, y))) F('I 안 사라짐'); await steps(250); if (blk(a, y)) F('I 다시 안 생김'); }
    return { fails, rows };
  });
  console.table(r.rows);
  console.log('fails', JSON.stringify(r.fails, null, 1), 'errs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
