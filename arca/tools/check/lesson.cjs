// 스승의 수업·배움 수첩·실력 맞춤·단원 마무리(src/26-lesson.js) 검사
// ① 5학년 12단원에 수업이 모두 있고 끝까지 진행되는지 ② 마을 첫 진입에 권하기·건너뛰기·다시 권하기 ③ 배움 수첩 ④ 「?」 단추
// ⑤ 실력 맞춤: 다 맞히는 학생은 단계가 오르고, 못 맞히는 학생은 내려가며 보기 하나가 지워짐 ⑥ 단원 마무리 통과·미통과
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
  await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    save.job = 'mage'; save.lv = 5; save.trained = 1; save.st.orbTip = 1; busy = false;
    window.W8 = (f, n = 200) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 25)); r(f()); });
    const L = () => document.getElementById('lesson');
    // 수업 한 편을 끝까지: wrongFirst 면 '같이 하기'에서 한 번 틀려 본다
    window.__lesson = async (wrongFirst) => {
      let steps = 0, hintShown = false;
      for (let g = 0; g < 60 && LESSON.on; g++) {
        const nx = L().querySelector('button[data-l="next"], #lsn, button[data-l="x"]');
        const ch = [...L().querySelectorAll('.lsch button:not(:disabled)')];
        if (ch.length && !L().querySelector('#lsn')) {
          const q = L().querySelector('.lsq').textContent; steps++;
          // 정답 찾기: 보기 가운데 단계 풀이·문제 은행으로는 알 수 없으니 하나씩 눌러 본다(같이 하기), 혼자 하기는 첫 보기
          if (L().querySelector('.lstip')) { if (wrongFirst) { ch[0].click(); hintShown = hintShown || !!L().querySelector('.lsfb .lnrule, .lsfb .lnstep, .lsfb .lsok'); } const left = [...L().querySelectorAll('.lsch button:not(:disabled)')]; if (left.length && !L().querySelector('#lsn')) left[0].click(); }
          else ch[0].click();
        } else if (nx) { if (nx.dataset.l === 'x') { nx.click(); break; } nx.click(); }
        await new Promise((r) => setTimeout(r, 15));
      }
      return { steps, hintShown, closed: !LESSON.on };
    };
  });
  const R = {};
  // ① 5학년 12단원 수업
  R.lessons = await p.evaluate(async () => {
    const out = [];
    for (let part = 1; part <= 12; part++) {
      const u = unitName(part), L = lessonFor(u);
      if (!L) { out.push(part + ' ' + u + ' : 수업 없음'); continue; }
      lessonRun(L, part);
      const r = await __lesson(part % 2 === 0);
      out.push(part + ' ' + L.title + (r.closed && save.st.les[L.key] ? ' ok' : ' 미완료') + (L.fig ? ' (그림)' : ''));
    }
    const keys = new Set(); for (let part = 1; part <= 12; part++) { const L = lessonFor(unitName(part)); L && keys.add(L.key); }
    return { list: out, distinct: keys.size, learned: Object.keys(save.st.les).length, grades: [3, 4, 6].map((g) => { studyCfg.grade = g; let n = 0, t = 0; for (let part = 1; part <= 12; part++) { const u = unitName(part); if (u) { t++; if (lessonFor(u)) n++; } } studyCfg.grade = 5; return g + '학년 ' + n + '/' + t; }).join(' · ') };
  });
  // 수업 화면 사진(그림 있는 단원)
  await p.evaluate(() => { lessonRun(lessonFor(unitName(5)), 5); document.querySelector('#lesson button[data-l="next"]').click(); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lesson_show.png') });
  await p.evaluate(() => { for (let i = 0; i < 6; i++) { const n = document.querySelector('#lesson button[data-l="next"]'); n && n.click(); } const c = document.querySelector('#lesson .lsch button'); c && c.click(); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lesson_together.png') });
  await p.evaluate(() => { lsClose(); });
  // ② 마을 첫 진입에 권하기 → 건너뛰기 → 틀리면 다시 권하기
  R.offer = await p.evaluate(async () => {
    save.st.les = {}; save.st.lesSkip = {}; LESSON.auto = true; LESSON.cnt = {};
    loadMap('t1', 20, 16, true);
    await new Promise((r) => setTimeout(r, 900));
    for (let i = 0; i < 40 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    const offered = await W8(() => LESSON.on, 120);
    const txt = document.querySelector('#lesson .lsp').textContent.slice(0, 40);
    document.querySelector('#lesson button[data-l="skip"]').click();
    const L = lessonFor(unitName(1));
    const skipped = save.st.lesSkip[L.key];
    await new Promise((r) => setTimeout(r, 1300));
    const notAgain = !LESSON.on;
    // 길목에서 두 번 틀리면 다시 권한다
    loadMap('r1', 6, 11, true); await new Promise((r) => setTimeout(r, 900));
    for (let i = 0; i < 40 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    const ease = [makeQ(4), makeQ(4)].length && save.st.lesEase.n; // 건너뛴 뒤에도 처음 5문제는 쉬운 단계
    LEARN.off = true; studyCfg.battle = 'box';
    for (let k = 0; k < 2; k++) {
      mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 14, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 9999 }; mons.push(m); BP.cool = 99999;
      B = null; busy = false; fieldStrike(m, null); await W8(() => !$('bt').hidden);
      [...$('bc').children].find((x) => !x.hidden && x.dataset.v !== String(RQ.last.a)).click();
      await W8(() => $('bt').hidden && !busy && !B, 200);
    }
    LEARN.off = false; studyCfg.battle = 'orb'; mons = [];
    const again = await W8(() => LESSON.on, 120);
    const txt2 = again ? document.querySelector('#lesson .lsp').textContent.slice(0, 30) : '';
    if (again) document.querySelector('#lesson button[data-l="go"]').click();
    const r = again ? await __lesson(false) : {};
    return { offered, txt, skipped, notAgain, easeLeft: ease, again, txt2, learnedAfter: !!save.st.les[L.key], closed: r.closed };
  });
  // ③ 배움 수첩 + ④ ? 단추
  await p.evaluate(() => { openPanel('note'); });
  await p.waitForTimeout(250);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lesson_note.png') });
  R.note = await p.evaluate(() => { const r = { cards: document.querySelectorAll('#pc .nt').length, on: document.querySelectorAll('#pc .nt.on').length, tabs: [...document.querySelectorAll('#tabs .tsub button')].map((x) => x.textContent).join('·') }; closePanel(); return r; });
  R.help = await p.evaluate(async () => {
    mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 9999 }; mons.push(m);
    B = null; busy = false; fieldStrike(m, null); await W8(() => ORB.on);
    $('qhelp').click();
    const t = (document.querySelector('.lscorehint') || {}).textContent || '';
    return { shown: t.slice(0, 40), hints: LOG.hints };
  });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lesson_help.png') });
  await p.evaluate(() => { orbCancel('x'); B = null; busy = false; mons = []; });
  // ⑤ 실력 맞춤
  R.adapt = await p.evaluate(() => {
    const u = unitName(mapPart());
    const fill = (ok) => { LOG.recent = LOG.recent.filter((e) => !(e.u || '').includes(u)); for (let i = 0; i < 10; i++) LOG.recent.push({ d: '2026-11-15', p: 1, u: '5-1 1단원 ' + u, k: 'math', ok, t: 3, re: 0, q: 'q' + i, a: '1' }); save.st.adapt = {}; save.st.lesEase = null; };
    const seen = (d) => { const s = new Set(); for (let i = 0; i < 12; i++) { const q = makeQ(d); q.src && s.add(q.src.tier); } return [...s].sort().join(','); };
    fill(1); const up = seen(1), offUp = save.st.adapt[adaptKey()].off;
    fill(0); const down = seen(4), offDown = save.st.adapt[adaptKey()].off;
    studyCfg.adapt = 'route'; save.st.adapt = {}; const fixed = seen(4); studyCfg.adapt = 'auto';
    return { '다 맞히는 학생(길목 단계 1)': 'tier ' + up + ' (조정 ' + offUp + ')', '못 맞히는 학생(길목 단계 3)': 'tier ' + down + ' (조정 ' + offDown + ')', '길목대로': 'tier ' + fixed };
  });
  R.adaptHint = await p.evaluate(async () => {
    FUN.hint = 0; studyCfg.battle = 'box'; mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 14, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 9999 }; mons.push(m);
    B = null; busy = false; fieldStrike(m, null); await W8(() => !$('bt').hidden);
    const vis = [...$('bc').children].filter((x) => !x.hidden).length, all = $('bc').children.length;
    $('bt').hidden = true; B = null; busy = false; studyCfg.battle = 'orb'; mons = [];
    return all + '개 중 ' + vis + '개 보임';
  });
  // ⑥ 단원 마무리: 통과·미통과
  R.cap = await p.evaluate(async () => {
    const run = async (rightN) => {
      capRun(1);
      for (let n = 0; n < 5; n++) {
        await W8(() => document.querySelector('#lesson .lsch button:not(:disabled)'));
        const bs = [...document.querySelectorAll('#lesson .lsch button')];
        // 정답은 누른 뒤에야 알 수 있어, 하나 눌러 보고 결과를 센다 → 맞힐 문제는 미리 정답을 구해 둔다
        const q = document.querySelector('#lesson .lsq').textContent;
        const st = stepSolve({ q, a: '' });
        // 보기마다 stepSolve 로 검증해 정답 찾기(혼합 계산 단원)
        const right = bs.find((x) => stepSolve({ q, a: x.dataset.v }));
        (n < rightN && right ? right : bs.find((x) => x !== right) || bs[0]).click();
        await W8(() => document.getElementById('lsn')); document.getElementById('lsn').click();
      }
      await W8(() => document.querySelector('#lesson .lsbig'));
      const big = document.querySelector('#lesson .lsbig').textContent.trim();
      document.querySelector('#lesson button[data-l="x"]').click();
      return big;
    };
    const fail = await run(2), cap1 = !!save.st.cap[1];
    const pass = await run(5), cap2 = !!save.st.cap[1];
    return { fail, stampAfterFail: cap1, pass, stampAfterPass: cap2, progress: logProgress().caps, best: save.st.capTry[1] };
  });
  await p.evaluate(() => capRun(1));
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'lesson_cap.png') });
  // 휴대폰
  await p.evaluate(() => { lsClose(); });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.body.classList.add('mobile'); fitView && fitView(); lessonRun(lessonFor(unitName(6)), 6); document.querySelector('#lesson button[data-l="next"]').click(); });
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, 'lesson_phone.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
