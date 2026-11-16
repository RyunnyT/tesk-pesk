// 퀘스트 자세히 보기 + 문제를 풀 때 스킬 단추 숨기기 검사 (src/34-qinfo.js)
// node arca/tools/check/qinfo.cjs   (dist 빌드로 엶 → 먼저 python3 tools/build_single.py)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const fails = [], out = {};
  const open = async (opt) => {
    const p = await b.newPage(opt);
    p.on('pageerror', (e) => fails.push('오류 ' + e.message));
    await p.goto('file://' + require('path').resolve(__dirname, '../../dist/arca-chronicles.html'));
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForFunction(() => typeof MAPS !== 'undefined' && typeof HD !== 'undefined' && HD.ready, null, { timeout: 60000 });
    const inp = await p.$('input[placeholder="이름을 적어요"]');
    if (inp) { await inp.fill('하늘'); await p.click('text=모험 시작'); await p.waitForTimeout(400); }
    await p.evaluate(() => {
      save.job = 'knight'; save.trained = 1; save.met.momo = 1; save.sk = [0, 1, 2, 3]; save.lv = 9;
      LESSON.auto = false; if (typeof TUT !== 'undefined') TUT.auto = false; SCUT.off = true;
      for (const k in MAPS) save.st['in_' + k] = 1;
      save.st.rdHint = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1, I: 1 };
    });
    return p;
  };
  // 1) 퀘스트 자세히 보기(PC)
  let p = await open({ viewport: { width: 960, height: 540 } });
  Object.assign(out, await p.evaluate(async () => {
    const sl = (ms) => new Promise((r) => setTimeout(r, ms));
    const o = {};
    save.q.q4 = { st: 'active', k: 1 }; save.q.s3 = { st: 'active', k: 0, t0: Date.now() - 30000 }; save.q.q3 = { st: 'active', k: 2 }; save.q.s2 = { st: 'active', k: 0 };
    dl = null; busy = false; loadMap('t2', 20, 16, true); for (let i = 0; i < 20 && dl; i++) { if (dl.ch) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); } busy = false; trk();
    const rows = [...document.querySelectorAll('#trk [data-qid]')];
    o.rows = rows.length;
    const types = {};
    for (const id of rows.map((r) => r.dataset.qid)) {
      const r = document.querySelector('#trk [data-qid="' + id + '"]');
      r.click(); await sl(50);
      const t = $('lesson').hidden ? '' : $('lesson').textContent;
      types[r.dataset.qid] = /할 일/.test(t) && /보상/.test(t) && /\d+ \/ \d+/.test(t);
      document.querySelector('[data-qi="x"]') && document.querySelector('[data-qi="x"]').click(); await sl(30);
    }
    o.detail = types;
    $('h4').click(); await sl(50); o.main = !$('lesson').hidden && /할 일/.test($('lesson').textContent);
    document.querySelector('[data-qi="x"]') && document.querySelector('[data-qi="x"]').click();
    // 모든 퀘스트 종류의 할 일 문장이 비지 않음
    o.todoEmpty = QS.filter((q) => !qiTodo(q, null) || /undefined|NaN/.test(qiTodo(q, null))).map((q) => q.id);
    return o;
  }));
  if (out.rows < 4) fails.push('퀘스트 줄 ' + out.rows);
  Object.entries(out.detail).forEach(([k, v]) => { if (!v) fails.push(k + ' 자세히 보기 내용 빠짐'); });
  if (!out.main) fails.push('메인 줄 자세히 보기 안 됨');
  if (out.todoEmpty.length) fails.push('할 일 문장 이상: ' + out.todoEmpty.join(','));
  await p.close();
  // 2) 스킬 단추: 걸을 땐 보이고, 구슬 조준·문제 상자·풀이 화면에선 숨김(태블릿·휴대폰)
  out.touch = {};
  for (const dev of ['iPad Mini landscape', 'iPhone 13 landscape', 'iPhone 13']) {
    p = await open({ ...devices[dev] });
    const r = await p.evaluate(async () => {
      const sl = (ms) => new Promise((r) => setTimeout(r, ms));
      dl = null; busy = false; loadMap('r1', 8, 10, true); for (let i = 0; i < 20 && dl; i++) { if (dl.ch) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); } busy = false;
      await sl(1700);
      const shown = () => { const r = $('skrow'); return !r.hidden && getComputedStyle(r).visibility !== 'hidden' && r.offsetParent !== null; };
      const o = { walk: shown() };
      const m = mons.find((q) => !q.dead); pl.x = m.x - 14; pl.y = m.y; m.hpNow = 9999; fieldStrike(m, null); await sl(200);
      o.orb = shown();
      const bad = [...$('bc').children].find((x) => x.dataset.v !== String(((typeof ORB === 'object' && ORB.Q) || RQ.last).a)); if (bad) bad.click(); await sl(400);
      o.learn = shown();
      if (typeof LEARN === 'object' && LEARN.wait) LEARN.wait.go(); await sl(300);
      if (typeof ORB === 'object') ORB.on = false; document.body.classList.remove('orbing'); B = null; busy = false; $('bt').hidden = true;
      studyCfg.battle = 'box';
      const m2 = mons.find((q) => !q.dead); pl.x = m2.x - 14; pl.y = m2.y; fieldStrike(m2, null); await sl(200);
      o.box = !$('bt').hidden ? shown() : 'x';
      return o;
    });
    out.touch[dev] = r;
    if (!r.walk) fails.push(dev + ' 걸을 때 스킬 단추가 안 보임');
    if (r.orb || r.learn || r.box === true) fails.push(dev + ' 문제 풀 때 스킬 단추가 보임 ' + JSON.stringify(r));
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1), '\nfails', fails);
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
