// 소리·스킬 효과 그림(src/23-sound.js) 검사: 누른 뒤에만 소리, 맵·보스에 따라 곡 바뀜, 메뉴 음악·크기, 새 효과음, 스킬 효과 그림.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'out');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  const R = {};
  R.beforeGesture = await p.evaluate(() => ({ unlocked: SND.unlocked, ctx: !!SND.ctx }));
  R.musicDefault = await p.evaluate(() => UI.musicOn);
  await p.evaluate(() => { UI.musicOn = true; });
  await p.mouse.click(500, 300);
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'mage'; save.lv = 7; save.trained = 1; loadMap('r1', 6, 11, true); });
  await p.waitForTimeout(800);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  await p.waitForTimeout(600);
  R.route = await p.evaluate(() => ({ unlocked: SND.unlocked, song: SND.cur, theme: M.theme, step: SND.step }));
  // 보스 가까이 → 보스 곡(마디 끝에서)
  R.boss = await p.evaluate(async () => {
    mons = [{ map: M.id, type: 'golem', x: pl.x + 40, y: pl.y, hx: pl.x + 40, hy: pl.y, tx: pl.x + 40, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0 }];
    BP.cool = 99999;
    for (let i = 0; i < 80 && SND.cur !== 'boss'; i++) await new Promise((r) => setTimeout(r, 100));
    return SND.cur;
  });
  // 마이룸
  R.home = await p.evaluate(async () => { mons = []; loadMap('home', 9, 9, true); for (let i = 0; i < 80 && SND.cur !== 'home'; i++) await new Promise((r) => setTimeout(r, 100)); for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; return SND.cur; });
  // 새 효과음이 오류 없이
  R.sfx = await p.evaluate(() => { const L = ['crit', 'block', 'weak', 'bounce', 'combo', 'warn', 'chest', 'loot0', 'loot3', 'ok', 'bad', 'lvl']; L.forEach((n) => sfx(n)); return L.length; });
  // 메뉴: 음악 끄기·소리 크기
  R.menu = await p.evaluate(async () => {
    const menu = document.querySelector('.box.menu');
    busy = false; document.querySelector('.menub').click(); await new Promise((r) => setTimeout(r, 50));
    const m = menu.querySelector('[data-m="music"]'), v = menu.querySelector('[data-m="vol"]');
    if (!m || !v) return 'no buttons';
    const g0 = SND.music.gain.value; m.click(); const g1 = SND.music.gain.value; m.click(); v.click(); const g2 = SND.music.gain.value;
    const r = { on: g0, off: g1, louder: g2, label: v.textContent };
    menu.querySelector('[data-m="x"]').click();
    return r;
  });
  // 스킬 효과 그림
  await p.evaluate(() => { loadMap('r1', 6, 11, true); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; mons = [{ map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x + 30, hy: pl.y, tx: pl.x, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0 }]; B = { m: mons[0], MI: mstat(mons[0]), hp: 9, field: 1 }; fxSkill('hit2', '검사'); B = null; save.job = 'knight'; fxSkill('guard', '검사'); });
  await p.waitForTimeout(180);
  R.vfx = await p.evaluate(() => VFXRUN.map((r) => Object.keys(VFX).find((k) => VFX[k] === r.V)).join(','));
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'sound_vfx.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
