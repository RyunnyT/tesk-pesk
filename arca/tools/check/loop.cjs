// 다시 하고 싶게(src/21-loop.js) 검사: 보스 패턴 예고·맞음/피함, 오늘의 현상금, 열쇠 조각 상자, 그만둘 때 예고.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  const calm = () => p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'warrior'; save.lv = 6; save.trained = 1; save.rpg.eq.w = rpgAdd('w_warrior_2', 0, true).u; save.vis.r1 = 1; save.vis.r2 = 1; });
  const R = {};
  // 1) 보스 패턴: 문지기 앞에 서 있으면 예고 → 맞음
  await p.evaluate(() => { loadMap('r1', 6, 11, true); });
  await p.waitForTimeout(700); await calm();
  R.boss = await p.evaluate(async () => {
    mons = [];
    const g = { map: M.id, type: 'golem', x: pl.x + 40, y: pl.y, hx: pl.x + 40, hy: pl.y, tx: pl.x + 40, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0 };
    mons.push(g);
    BP.cool = 1; pl.hp = 5; pl.inv = 0;
    for (let i = 0; i < 40 && !BP.zones.length; i++) await new Promise((r) => setTimeout(r, 50));
    const warnFrames = BP.warn, zones = BP.zones.length, kind = BP.kind;
    await new Promise((r) => setTimeout(r, 600));
    window.__shot = 1;
    return { kind, zones, warnSec: warnFrames * 0.05 };
  });
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'loop_boss.png') });
  R.boss.hitWhenStaying = await p.evaluate(async () => { const h = pl.hp; for (let i = 0; i < 60 && BP.zones.length; i++) await new Promise((r) => setTimeout(r, 50)); return h - pl.hp; });
  // 피하기: 예고가 뜨면 멀리 옮긴다
  R.boss.hitWhenDodging = await p.evaluate(async () => {
    pl.hp = 5; pl.inv = 0; BP.cool = 1;
    for (let i = 0; i < 40 && !BP.zones.length; i++) await new Promise((r) => setTimeout(r, 50));
    let safe = null;
    for (let dy = -60; dy <= 60 && !safe; dy += 10) for (let dx = -90; dx <= 0 && !safe; dx += 10) { const X = pl.x + dx, Y = pl.y + dy; if (!BP.zones.some((z) => bpInZone(z, X, Y - 4)) && !hitbox(X, Y, false)) safe = [X, Y]; }
    if (safe) { pl.x = safe[0]; pl.y = safe[1]; }
    const h = pl.hp;
    for (let i = 0; i < 60 && BP.zones.length; i++) await new Promise((r) => setTimeout(r, 50));
    return h - pl.hp;
  });
  // 조준(구슬) 중에는 쉬는지
  R.boss.quietWhileAiming = await p.evaluate(async () => { BP.cool = 1; BP.zones = []; const m = mons[0]; fieldStrike(m, null); await new Promise((r) => setTimeout(r, 400)); const z = BP.zones.length; dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); return z === 0; });
  // 2) 오늘의 현상금
  R.bounty = await p.evaluate(async () => {
    const b0 = bountyToday();
    loadMap(b0.map, 6, 11, true);
    await new Promise((r) => setTimeout(r, 700));
    for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    const m = mons.find((q) => q.bounty);
    const r = { map: b0.map, spawned: !!m, hpX2: m ? mstat(m).hp === mstat({ ...m, bounty: 0 }).hp * 2 : false, line: !$('qbty').hidden && $('qbty').textContent };
    if (m) { const bag = save.rpg.bag.length; B = { m, MI: mstat(m), hp: 0, field: 1 }; win(); r.got = bountyToday().got; r.shard = save.st.bshard; r.item = save.rpg.bag.length - bag; r.grade = save.rpg.bag.length > bag ? save.rpg.bag[save.rpg.bag.length - 1].g : -1; }
    hud(); r.lineAfter = !$('qbty').hidden;
    return r;
  });
  await p.waitForTimeout(500);
  // 3) 열쇠 조각 → 상자 → 열기
  R.key = await p.evaluate(async () => {
    save.st.key = 0; save.st.kbox = 0;
    for (let i = 0; i < 10; i++) keyAdd();
    hud();
    const r = { key: save.st.key, kbox: save.st.kbox, hud: $('hkey').textContent };
    loadMap('home', 9, 9, true);
    await new Promise((q) => setTimeout(q, 600));
    for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    pl.x = KBOX_AT.x; pl.y = KBOX_AT.y + 10;
    r.near = kboxNear();
    r.walkable = !hitbox(KBOX_AT.x, KBOX_AT.y + 10, false);
    return r;
  });
  await p.waitForTimeout(300);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'loop_home.png') });
  await p.evaluate(() => interact());
  await p.waitForTimeout(1400);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'loop_chest.png') });
  R.key.opened = await p.evaluate(() => { const el = document.querySelector('.kbox'); const t = el ? el.textContent : ''; if (el) el.querySelector('button').click(); return t; });
  // 그만둘 때 예고(마이룸 들어올 때 · 메뉴)
  R.next = await p.evaluate(() => loopNext());
  // 정답이면 조각이 오르는지(실제 문제)
  R.keyByAnswer = await p.evaluate(async () => {
    loadMap('r1', 6, 11, true);
    await new Promise((q) => setTimeout(q, 600));
    for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    mons = []; BP.cool = 9999;
    const k0 = save.st.key;
    const m = { map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x + 30, hy: pl.y, tx: pl.x, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 9999 };
    mons.push(m); fieldStrike(m, null);
    for (let i = 0; i < 40 && !(ORB.on || !$('bt').hidden); i++) await new Promise((q) => setTimeout(q, 30));
    const a = String(RQ.last.a);
    if (RQ.short) { for (const ch of a) document.querySelector('#kp [data-k="' + ch + '"]').click(); document.querySelector('#kp [data-k="ok"]').click(); }
    else orbThrow(orbBtns().findIndex((x) => x.dataset.v === a));
    for (let i = 0; i < 100 && (ORB.on || busy || B); i++) await new Promise((q) => setTimeout(q, 30));
    return save.st.key - k0;
  });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
