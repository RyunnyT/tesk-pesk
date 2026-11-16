// 마을 배치 틀 검사(프롬프트 O 1단계): 2~12부 마을의 틀이 서로 다르고, 출구·문·지문·사람·지워진 곳에 모두 걸어서 갈 수 있는지
// node arca/tools/check/town.cjs  (사진: 인자로 폴더를 주면 마을마다 PNG)
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.waitForFunction(() => typeof MAPS !== 'undefined' && typeof tReach !== 'undefined');
  const r = await p.evaluate(async (shot) => {
    const fails = [], rows = [];
    const ids = PARTTOWN.slice(1);
    const sig = {};
    for (const id of ids) {
      const m = MAPS[id];
      const R = tReach(m, m.spawn[0], m.spawn[1]);
      const need = [['서쪽 출구', 0, 14], ...(m.exits.length > 1 ? [['동쪽 출구', m.w - 1, 14]] : []), ...m.bld.map((b) => ['문 ' + b.n, b.dx, b.dy + 1]), ...m.spots.map((s) => ['지문 ' + s.n, s.tx, s.ty + 1]), ...m.npcs.map((n) => ['사람 ' + n[0], n[1], n[2]]), ...m.PCS.map((q, i) => ['지워진 곳 ' + i, q[0], q[1]])];
      if (id === 't7') need.push(['7부 스승', 17, 12]);
      need.forEach(([w, a, y]) => { if (!R.has(a + ',' + y)) fails.push(id + ' 못 감: ' + w + ' ' + a + ',' + y); });
      if (m.PCS.length !== 8) fails.push(id + ' 지워진 곳 ' + m.PCS.length);
      if (m.spots.length !== 6 || !m.spots[0].main) fails.push(id + ' 지문');
      if (!m.deco.length) fails.push(id + ' 소품 없음');
      sig[m.lay] = (sig[m.lay] || 0) + 1;
      rows.push({ id, 이름: m.short, 틀: m.lay, 소품: m.deco.map((d) => d.k).filter((k, i, a) => a.indexOf(k) === i).join(' '), 갈수있는칸: R.size });
      if (shot) {
        loadMap(id, m.spawn[0], m.spawn[1], true);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (Object.keys(sig).length < 6) fails.push('배치 틀이 6가지보다 적음 ' + JSON.stringify(sig));
    // 마을 사람들의 움직임·모두의 벽(src/33-life.js)
    save.job = 'knight';
    for (const id of Object.keys(LIFE)) {
      loadMap(id, MAPS[id].spawn[0], MAPS[id].spawn[1], true);
      const A = npcs.filter((n) => n.amb);
      if (A.length < LIFE[id].length) fails.push(id + ' 움직이는 사람 ' + A.length + '/' + LIFE[id].length);
      for (let i = 0; i < 30; i++) update();
      A.forEach((n) => { if (!isFinite(n.x) || !isFinite(n.y)) fails.push(id + ' 사람 자리 잘못'); });
      busy = false; dl = null;
    }
    loadMap('t12', MAPS.t12.spawn[0], MAPS.t12.spawn[1], true);
    const wall = npcs.filter((n) => n.amb && n.amb.act === 'wall').length;
    if (wall < 6) fails.push('모두의 벽 사람 ' + wall);
    rows.push({ id: 't12', 이름: '모두의 벽', 틀: '-', 소품: wall + '명', 갈수있는칸: '-' });
    return { fails, rows, sig };
  }, !!out);
  console.table(r.rows);
  console.log('틀', JSON.stringify(r.sig));
  console.log('fails', JSON.stringify(r.fails, null, 1), 'errs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
