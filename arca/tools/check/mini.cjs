// 단원 미니 조작(src/22-mini.js) 검사: 5종(물약·주문 순서·저울/눈금·약점 숫자·톱니)을 풀고, 틀리면 힌트→3번이면 풀이·쉬운 수,
// 보스 2단계에서 미니 조작이 열리고 맞히면 큰 피해, 보스 없는 부는 핵심 자리에서.
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
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); save.job = 'mage'; save.lv = 6; save.trained = 1; loadMap('r1', 6, 11, true); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  const R = { kinds: {} };
  const units = { potion: '5-1 4단원 약분과 통분', order: '5-1 1단원 자연수의 혼합 계산', weigh: '3-2 5단원 들이와 무게', angle: '4-1 2단원 각도', round: '5-2 1단원 수의 범위와 어림하기', factor: '5-1 2단원 약수와 배수', gear: '5-1 3단원 규칙과 대응' };
  for (const [name, unit] of Object.entries(units)) {
    R.kinds[name] = await p.evaluate(async (unit) => {
      window.miniUnit = () => unit;
      const kind = miniKind(unit);
      miniOpen(kind, { title: '검사' });
      return kind;
    }, unit);
    await p.waitForTimeout(150);
    await p.locator('#stage').screenshot({ path: path.join(OUT, 'mini_' + name + '.png') });
    R.kinds[name] = await p.evaluate(async () => {
      const kind = MINI.kind;
      const P = MINI.P, q = (s) => document.querySelector('#mini ' + s), click = (s) => q(s).click();
      if (kind === 'potion') {
        let r = P.a; for (const v of P.bottles) while (r >= v && MINI.on && q('[data-bot]')) { r -= v; click('[data-bot="' + v + '"]'); }
      } else if (kind === 'order') {
        for (const st of P.steps) click('[data-op="' + st.i + '"]');
      } else if (kind === 'factor') {
        P.ans.forEach((v) => click('[data-num="' + v + '"]')); click('[data-act="ok"]');
      } else if (kind === 'gear') {
        P.rows.forEach((r, i) => r.blank && click('[data-gr="' + i + '"][data-gv="' + r.y + '"]'));
        document.querySelectorAll('#mini [data-rule]').forEach((x) => x.dataset.rule === P.rule && x.click());
      } else if (P.mode === 'weigh') {
        let r = P.target; for (const v of P.set.w) while (r >= v) { r -= v; click('[data-w="' + v + '"]'); }
        click('[data-act="ok"]');
      } else {
        while (P.cur !== P.target) click('[data-d="' + (P.cur < P.target ? P.step : -P.step) + '"]');
        click('[data-act="ok"]');
      }
      const won = !!q('.mnok');
      return { kind, q: P.target || (P.steps ? P.steps[0].toks.join(' ') : P.q), won };
    });
    await p.evaluate(() => { const b = document.querySelector('#mini .mnok'); if (b) b.click(); });
  }
  // 틀리기: 주문 순서에서 일부러 3번 틀림 → 힌트 2번, 3번째 풀이 + 쉬운 수
  R.wrong = await p.evaluate(() => {
    window.miniUnit = () => '5-1 1단원 자연수의 혼합 계산';
    miniOpen('order', { title: '검사' });
    const hints = [];
    for (let k = 0; k < 3; k++) {
      const st = MINI.P.steps[MINI.si];
      const wrong = [...document.querySelectorAll('#mini [data-op]')].find((x) => +x.dataset.op !== st.i);
      if (!wrong) break;
      wrong.click();
      hints.push((document.querySelector('#mini .mnhint') || {}).textContent || '');
    }
    const r = { miss: MINI.miss, easy: MINI.easy, hints: hints.map((h) => h.slice(0, 40)) };
    MINI.P.steps.forEach((st) => document.querySelector('#mini [data-op="' + st.i + '"]').click());
    r.won = !!document.querySelector('#mini .mnok');
    return r;
  });
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'mini_wrong.png') });
  await p.evaluate(() => document.querySelector('#mini .mnok').click());
  // 보스 2단계 → 미니 조작 → 큰 피해
  R.boss = await p.evaluate(async () => {
    window.miniUnit = () => '5-1 4단원 약분과 통분';
    mons = []; BP.cool = 99999;
    const m = { map: M.id, type: 'queen', x: pl.x + 30, y: pl.y, hx: pl.x + 30, hy: pl.y, tx: pl.x + 30, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0 };
    mons.push(m);
    const full = mstat(m).hp; m.hpNow = Math.ceil(full * 0.7);
    B = { m, MI: mstat(m), hp: m.hpNow, field: 1 };
    m.hpNow = Math.floor(full * 0.6); fxHit(5);
    B = null; busy = false;
    for (let i = 0; i < 60 && !MINI.on; i++) await new Promise((r) => setTimeout(r, 50));
    const opened = MINI.on, minions = mons.filter((q) => q.minion).length, before = m.hpNow;
    let r = MINI.P.a; for (const v of MINI.P.bottles) while (r >= v && MINI.on) { r -= v; document.querySelector('#mini [data-bot="' + v + '"]').click(); }
    document.querySelector('#mini .mnok').click();
    return { opened, minions, dmg: before - m.hpNow, third: Math.round(full / 3), alive: m.hpNow > 0, logged: LOG.recent.slice(-1)[0].q };
  });
  // 휴대폰 크기
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.body.classList.add('mobile'); fitView && fitView(); window.miniUnit = () => '5-1 3단원 규칙과 대응'; miniOpen('gear', { title: '검사' }); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'mini_phone.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
