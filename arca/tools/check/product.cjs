// 제품답게(src/28-product.js) 검사: 튜토리얼(새 저장에서 끝까지), 저장 내보내기 → 지우기 → 가져오기, 깨진 저장, 도전의 탑, 오류 알리기·버전.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const URL0 = 'file://' + path.resolve(__dirname, '../../index.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const ready = () => p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  await p.goto(URL0); await p.evaluate(() => localStorage.clear()); await p.reload(); await ready();
  const R = {};
  // 1) 튜토리얼: 새 저장 → 단계마다 조건을 채워 끝까지
  R.tut = await p.evaluate(async () => {
    const W8 = (f, n = 200) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 25)); r(f()); });
    window.W8 = W8;
    document.querySelectorAll('.titlebox').forEach((e) => e.remove()); busy = false;
    TUT.auto = true; tutStart(false);
    const seen = [];
    const step = async (act) => { const i = TUT.i; seen.push($('tutn').textContent.split('· ')[1]); await act(); await W8(() => TUT.i > i || !TUT.on, 80); return TUT.i > i || !TUT.on; };
    const ok = [];
    ok.push(await step(() => { pl.x += 40; }));
    ok.push(await step(() => { TUT.act = 1; }));
    ok.push(await step(() => { loadMap('t1', 20, 16, true); for (let k = 0; k < 40 && dl; k++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; }));
    ok.push(await step(() => { save.job = 'knight'; save.trained = 1; }));
    ok.push(await step(() => { loadMap('r1', 6, 11, true); for (let k = 0; k < 40 && dl; k++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; }));
    ok.push(await step(() => { save.kills = (save.kills || 0) + 1; }));
    ok.push(await step(() => { save.kills++; }));
    ok.push(await step(() => { save.done.t1 = [true]; }));
    return { steps: seen, passed: ok.filter(Boolean).length + '/' + ok.length, ended: !TUT.on, flag: save.st.tut };
  });
  // 화면 사진: 첫 단계
  await p.evaluate(() => localStorage.clear()); await p.reload(); await ready();
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); busy = false; TUT.auto = true; tutStart(false); });
  await p.waitForTimeout(500);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'product_tut.png') });
  // 2) 저장: 진행을 만든 뒤 내보내기 → 모두 지우기 → 가져오기
  R.backup = await p.evaluate(() => {
    tutEnd(false);
    save.name = '별빛7'; save.job = 'mage'; save.lv = 6; save.gold = 321; save.done.t1 = [true, true, false]; save.st.cap = { 1: 1 };
    logAdd({ u: '5-1 1단원 자연수의 혼합 계산', k: 'math', ok: 1, t: 4, q: 'q', a: '1' });
    studyCfg.grade = 6; studySave();
    const txt = JSON.stringify(backupMake());
    localStorage.clear();
    const bad = backupApply('{"x":1}'), bad2 = backupApply('이건 저장이 아니에요');
    const err = backupApply(txt);
    return { bytes: txt.length, rejects: [bad, bad2].map((s) => (s || '').slice(0, 14)), err };
  });
  await p.reload(); await ready();
  R.restored = await p.evaluate(() => ({ name: save.name, job: save.job, lv: save.lv, gold: save.gold, done: (save.done.t1 || []).join(','), cap: save.st.cap, log: LOG.recent.length, grade: studyCfg.grade, ver: save.ver }));
  // 화면: 내보내기 상자
  await p.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); busy = false; backupOpen('out'); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'product_backup.png') });
  await p.evaluate(() => pboxClose());
  // 3) 깨진 저장: 멈추지 않고 알림
  await p.evaluate(() => localStorage.setItem('arca-v2', '{"map":"t1","lv":'));
  await p.reload(); await ready();
  await p.waitForTimeout(1500);
  R.broken = await p.evaluate(() => ({ flag: !!window.ARCA_SAVE_BROKEN, notice: !$('pbox').hidden && $('pbox').textContent.slice(1, 14), kept: (localStorage.getItem('arca-v2-broken') || '').length, playable: !!M && M.id === 'home' }));
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'product_broken.png') });
  // 4) 도전의 탑
  await p.evaluate(() => localStorage.clear()); await p.reload(); await ready();
  R.tower = await p.evaluate(async () => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove()); busy = false; save.job = 'knight'; save.trained = 1;
    const run = async (rightN) => {
      towerRun();
      for (let n = 0; n < 5; n++) {
        await W8(() => document.querySelector('#lesson .lsch button:not(:disabled)'));
        const bs = [...document.querySelectorAll('#lesson .lsch button')], q = document.querySelector('#lesson .lsq').textContent;
        const right = bs.find((x) => stepSolve({ q, a: x.dataset.v }));
        (n < rightN && right ? right : bs.find((x) => x !== right) || bs[0]).click();
        await W8(() => document.getElementById('lsn')); document.getElementById('lsn').click();
      }
      await W8(() => document.querySelector('#lesson .lsbig'));
      const t = document.querySelector('#lesson .lsp').textContent.slice(0, 40);
      document.querySelector('#lesson button[data-l="x"]').click();
      return t;
    };
    window.W8 = window.W8 || ((f, n = 200) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 25)); r(f()); }));
    FQ.off = true;
    const fail = await run(1), now1 = save.st.towerNow || 0;
    const pass = await run(5), now2 = save.st.towerNow, best = save.st.towerBest, gold = save.gold;
    FQ.off = false;
    openPanel('tower');
    const tab = [...document.querySelectorAll('#tabs .tsub button')].map((x) => x.textContent).join('·'), card = document.querySelector('#pc .nth').textContent;
    return { fail, now1, pass, now2, best, gold, tab, card };
  });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'product_tower.png') });
  // 5) 메뉴·오류 알리기·버전
  R.menu = await p.evaluate(async () => {
    closePanel(); document.querySelector('.menub').click(); await new Promise((r) => setTimeout(r, 60));
    const m = document.querySelector('.box.menu'), names = [...m.querySelectorAll('.mprod button')].map((x) => x.textContent), ver = m.querySelector('.mver').textContent;
    m.querySelector('[data-m="bug"]').click();
    const txt = $('pbta').value.split('\n').slice(0, 3).join(' | '), hasName = /별빛|@/.test($('pbta').value);
    return { names, ver, txt, hasName, music: UI.musicOn };
  });
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'product_bug.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
