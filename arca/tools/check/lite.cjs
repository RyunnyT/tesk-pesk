// 가벼운 모드(src/20-lite.js) 검사: 느린 기기 알아채기 → 묻기 → 바꾸면 다시 불러와 화면 2배, 메뉴 단추로 되돌리기.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'out');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'knight'; save.trained = 1; loadMap('t1', 20, 16, true); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; LITE.t = []; });
  // 아주 느린 기기 흉내(CPU 20배) → 30장 재면 묻기
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  await p.waitForFunction(() => document.querySelector('.liteask') || LITE.asked, null, { timeout: 60000 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const R = { asked: await p.evaluate(() => !!document.querySelector('.liteask')), avgMs: await p.evaluate(() => Math.round(LITE.avg || 0)), hdsBefore: await p.evaluate(() => HDS) };
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lite_ask.png') });
  await Promise.all([p.waitForEvent('load'), p.click('.liteask button[data-l="1"]')]);
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  R.hdsAfter = await p.evaluate(() => HDS);
  R.canvas = await p.evaluate(() => cv.width + 'x' + cv.height);
  R.calm = await p.evaluate(() => !!UI.calm);
  // 메뉴 단추
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); busy = false; });
  await p.click('.menub').catch(() => {});
  R.menuBtn = await p.evaluate(() => { const m = document.querySelector('.box.menu'); return m && m.querySelector('[data-m="lite"]') ? m.querySelector('[data-m="lite"]').textContent : 'none'; });
  console.log(JSON.stringify(R));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
