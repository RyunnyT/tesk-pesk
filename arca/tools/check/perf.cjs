// 학교 기기 점검(프롬프트 F): CPU 4배 느리게 + 태블릿 화면(1024×768)으로
// ① 첫 화면까지 ② 맵 바꿀 때 멈춤 ③ 걷는 동안 한 장면 그리는 시간 ④ 메모리 를 잰다. 큰 마을(t1 48×32)과 길목(r1)을 따로.
// 사용법: node arca/tools/check/perf.cjs [dist|index] [lite]   (기본 dist = 파일 하나 빌드, lite = 가벼운 모드 켜고)
const { chromium } = require('playwright');
const path = require('path');
const which = process.argv[2] || 'dist', lite = process.argv[3] === 'lite';
const file = which === 'index' ? '../../index.html' : '../../dist/arca-chronicles.html';
(async () => {
  const b = await chromium.launch({ args: ['--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  // 저장 지우고 시작(로딩 화면 없이 같은 조건)
  await p.goto('file://' + path.resolve(__dirname, file));
  await p.evaluate((lite) => { localStorage.clear(); if (lite) localStorage.setItem('arca-ui', JSON.stringify({ lite: 1, liteAsked: 1 })); }, lite);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 120000, polling: 50 });
  const loadMs = Date.now() - t0;
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const m = (await cdp.send('Performance.getMetrics')).metrics; const g = (n) => (m.find((x) => x.name === n) || {}).value || 0; return Math.round(g('JSHeapUsedSize') / 1e6); };
  await cdp.send('Performance.enable');
  const R = { mode: which + (lite ? '+가벼운' : ''), load: (loadMs / 1000).toFixed(1) + '초' };
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'knight'; save.trained = 1; busy = false; });
  for (const [id, tx, ty] of [['t1', 20, 16], ['r1', 6, 11]]) {
    // ② 맵 바꾸기: loadMap 이 끝날 때까지(그림 굽기·연필 밑그림 포함)
    const sw = await p.evaluate(([id, tx, ty]) => { const a = performance.now(); loadMap(id, tx, ty, true); const d = performance.now() - a; $('dlg').hidden = true; dl = null; busy = false; mons = mons.filter(() => false); return d; }, [id, tx, ty]);
    await p.waitForTimeout(600);
    // ③ 걷기: drawMap 시간 3초 재기
    const fr = await p.evaluate(async () => {
      const T = [], d0 = drawMap;
      drawMap = function () { const a = performance.now(); d0(); T.push(performance.now() - a); };
      keys.ArrowRight = true;
      await new Promise((r) => setTimeout(r, 1500));
      keys.ArrowRight = false; keys.ArrowLeft = true;
      await new Promise((r) => setTimeout(r, 1500));
      keys.ArrowLeft = false;
      drawMap = d0;
      T.sort((a, b) => a - b);
      const canv = [M.base, M.over, M.sketch].filter(Boolean).reduce((s, c) => s + c.width * c.height * 4, 0);
      return { n: T.length, avg: T.reduce((a, b) => a + b, 0) / T.length, p95: T[Math.floor(T.length * 0.95)], canvMB: Math.round(canv / 1e6) };
    });
    R[id] = { 맵바꾸기: Math.round(sw) + 'ms', 그리기평균: fr.avg.toFixed(1) + 'ms', 그리기95: fr.p95.toFixed(1) + 'ms', 장면수3초: fr.n, 바탕그림MB: fr.canvMB };
  }
  R.heapMB = await heap();
  R.images = await p.evaluate(() => Object.keys(HD.img).length);
  console.log(JSON.stringify(R));
  if (errs.length) console.log('errors:', errs.slice(0, 3));
  await b.close();
})();
