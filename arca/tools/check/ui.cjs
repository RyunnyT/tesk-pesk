// 화면 검사(프롬프트 K): 960×540 · 390×844 · 844×390 에서 맵·전투(구슬/숫자 판)·풀이·패널·미니 조작을 찍고,
// 보이는 상자가 화면(#stage) 밖으로 나가는지, 문제 띠·상자가 왼쪽 위 상태 상자와 겹치는지 자동으로 본다.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const R = {}, errs = [];
  for (const [name, w, h, mob] of [['pc', 960, 540, 0], ['phoneP', 390, 844, 1], ['phoneL', 844, 390, 1]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob });
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
    await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'knight'; save.lv = 8; save.trained = 1; save.st.orbTip = 1; save.st.lessonOff = 1; UI.liteAsked = 1; if (typeof LITE === 'object') LITE.asked = true; save.rpg.eq.w = rpgAdd('w_knight_2', 0, true).u; save.vis.r1 = 1; loadMap('r1', 6, 11, true); });
    await p.waitForTimeout(900);
    const calm = () => p.evaluate(() => { for (let i = 0; i < 40 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; document.querySelectorAll('.banner,.liteask').forEach((e) => e.remove ? (e.hidden = true) : 0); $('toast').hidden = true; });
    await calm();
    // 검사: 보이는 상자들이 stage 안에 있는가 + 겹침
    const audit = (label) => p.evaluate((label) => {
      const st = $('stage').getBoundingClientRect(), out = [];
      const vis = (el) => el && !el.hidden && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      const box = (el) => el.getBoundingClientRect();
      for (const sel of ['#bt', '#qstrip', '#mini', '#panel', '.lcol', '.box.menu', '#kp', '#lnok']) {
        const el = document.querySelector(sel);
        if (!vis(el)) continue;
        const r = box(el);
        if (r.left < st.left - 1 || r.right > st.right + 1 || r.top < st.top - 1 || r.bottom > st.bottom + 1) out.push(sel + ' 화면 밖(' + Math.round(r.left - st.left) + ',' + Math.round(r.top - st.top) + ',' + Math.round(st.right - r.right) + ',' + Math.round(st.bottom - r.bottom) + ')');
      }
      const hit = (a, c) => { const A = document.querySelector(a), C = document.querySelector(c); if (!vis(A) || !vis(C)) return false; const x = box(A), y = box(C); return x.left < y.right - 2 && x.right > y.left + 2 && x.top < y.bottom - 2 && x.bottom > y.top + 2; };
      for (const [a, c] of [['#qstrip', '.lcol'], ['#bt', '.lcol'], ['#qstrip', '.mm'], ['#qstrip', '#act'], ['#qstrip', '.pad'], ['#qstrip', '#btns']]) if (hit(a, c)) out.push(a + ' ↔ ' + c + ' 겹침');
      const lc = document.querySelector('.lcol'); const frac = vis(lc) ? (box(lc).width * box(lc).height) / (st.width * st.height) : 0;
      return { label, problems: out, hudArea: +frac.toFixed(2) };
    }, label);
    const A = [];
    const shot = async (n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, 'ui_' + name + '_' + n + '.png') }); A.push(await audit(n)); };
    await shot('map');
    // 구슬 전투
    await p.evaluate(() => { mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 9999 }; mons.push(m); if (typeof BP === 'object') BP.cool = 99999; window.__m = m; fieldStrike(m, null); });
    await shot('orb');
    // 틀린 뒤 풀이
    await p.evaluate(async () => { const a = String(RQ.last.a); orbThrow(orbBtns().findIndex((x) => x.dataset.v !== a)); for (let i = 0; i < 80 && !LEARN.wait; i++) await new Promise((r) => setTimeout(r, 25)); });
    await shot('wrong');
    await p.evaluate(async () => { LEARN.wait && LEARN.wait.go(); for (let i = 0; i < 80 && !(ORB.on && !ORB.done); i++) await new Promise((r) => setTimeout(r, 25)); orbThrow(orbBtns().findIndex((x) => x.dataset.v === String(RQ.last.a))); for (let i = 0; i < 120 && (ORB.on || busy || B); i++) await new Promise((r) => setTimeout(r, 25)); });
    // 숫자 판
    await p.evaluate(async () => { for (let k = 0; k < 20; k++) { B = null; busy = false; RQ.forceShort = true; RQ.wantShort = true; __m.type = 'windup'; fieldStrike(__m, null); await new Promise((r) => setTimeout(r, 80)); if (RQ.short) break; if (ORB.on) orbCancel('x'); } });
    await shot('keypad');
    await p.evaluate(() => { $('bt').hidden = true; B = null; busy = false; __m.type = 'wolf'; });
    // 패널(묶음 탭)
    await p.evaluate(() => openPanel('eq'));
    await shot('panel');
    R[name + '_tabs'] = await p.evaluate(() => ({ groups: document.querySelectorAll('#tabs .tgrp button').length, sub: [...document.querySelectorAll('#tabs .tsub button')].map((x) => x.textContent).join('·') }));
    await p.evaluate(() => closePanel());
    // 미니 조작
    await p.evaluate(() => { window.miniUnit = () => '5-1 4단원 약분과 통분'; miniOpen('potion', { title: '검사' }); });
    await shot('mini');
    R[name] = A.map((a) => a.label + ': ' + (a.problems.length ? a.problems.join(' / ') : 'ok') + ' (상태 상자 ' + Math.round(a.hudArea * 100) + '%)');
    await p.close();
  }
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
