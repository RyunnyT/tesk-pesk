// 학습 기록·보고서(src/19-log.js)·학급 모아 보기(teacher.html) 검사: 문제 30개를 자동으로 풀고 기록·보고서·내보내기·모아 보기 확인.
// 사용법: node arca/tools/check/log.cjs → 화면 사진은 out/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    LEARN.off = true; FQ.off = true; studyCfg.choices = 3; studyCfg.adapt = "route"; /* 예전 규칙으로 검사(새 규칙은 learn·figq·lesson.cjs) */ save.name = '별빛7'; save.job = 'mage'; save.lv = 4; save.trained = 1;
    save.rpg.eq.w = rpgAdd('w_mage_1', 0, true).u;
    loadMap('r1', 3, 10, true);
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  const R = {};
  // 1) 길 위 전투 20문제(정답 14, 오답 6), 2) 문제 상자 6문제, 3) 지문 확인 문제 4개
  R.solve = await p.evaluate(async () => {
    const W = (f, n = 150) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 30)); r(f()); });
    const fresh = () => { mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x + 30, hy: pl.y, tx: pl.x, ty: pl.y, wait: 999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 99999 }; mons.push(m); return m; };
    for (let i = 0; i < 20; i++) {
      B = null; busy = false;
      fieldStrike(fresh(), null);
      await W(() => ORB.on || !$('bt').hidden);
      const ok = i % 10 < 7, a = String(RQ.last.a);
      if (RQ.short) { for (const ch of ok ? a : a + '9') document.querySelector('#kp [data-k="' + ch + '"]').click(); document.querySelector('#kp [data-k="ok"]').click(); }
      else {
        const bs = orbBtns();
        const t = ok ? bs.findIndex((x) => x.dataset.v === a) : bs.findIndex((x) => x.dataset.v !== a);
        if (ORB.on) orbThrow(t); else bs[t].click();
        // 마법사 '시간 늦추기'면 한 번 더(틀린 것으로 기록되어야 함)
        await new Promise((q) => setTimeout(q, 400));
        if (ORB.on && !ORB.done) { const t2 = orbBtns().findIndex((x) => !x.disabled && x.dataset.v !== a); if (t2 >= 0) orbThrow(t2); }
      }
      await W(() => !ORB.on && !busy && !B && $('bt').hidden);
    }
    for (let i = 0; i < 6; i++) {
      busy = false;
      let fin = false;
      quizBox('검사 문제', 2, () => (fin = true), () => {});
      const a = String(RQ.last.a), bs = [...$('bc').children];
      if (i % 3 === 0) bs.find((x) => !x.textContent.endsWith(' ' + a)).click();
      bs.find((x) => x.textContent.endsWith(' ' + a)).click();
      await W(() => fin);
      $('bt').hidden = true; busy = false;
    }
    // 지문: 문제가 있는 자리 하나를 열어 2문제 풀기 ×2
    const sp = (M.spots || []).find((s) => s.q && s.q.length >= 2) || Object.values(MAPS).flatMap((m) => m.spots || []).find((s) => s.q && s.q.length >= 2);
    for (let k = 0; k < 2; k++) {
      openBook(sp); bk.stage = 'q'; renderBook();
      for (let j = 0; j < 2; j++) {
        const right = sp.q[j][2], btns = [...document.querySelectorAll('#book button[data-ans]')];
        if (k === 0 && j === 0) btns.find((x) => +x.dataset.ans !== right).click();
        document.querySelector('#book button[data-ans="' + right + '"]').click();
      }
      closeBook && closeBook();
    }
    const S = logSummary(LOG);
    return { recent: LOG.recent.length, n: S.n, ok: S.ok, rate: S.rate, units: S.units.map((u) => u.u + ':' + u.n).join(' / '), miss: S.miss.length, kinds: [...new Set(LOG.recent.map((e) => e.k))].join(',') };
  });
  // 4) 접기: 300 넘으면 합계로
  R.fold = await p.evaluate(() => {
    const keep = JSON.stringify(LOG);
    for (let i = 0; i < 320; i++) logAdd({ u: '접기 검사', k: 'math', ok: i % 2, t: 3, q: 'q' + (i % 7), a: '1' });
    const r = { recent: LOG.recent.length, agg: Object.keys(LOG.agg).length, total: logSummary(LOG).n, bytes: JSON.stringify(LOG).length, miss: Object.keys(LOG.miss).length };
    Object.assign(LOG, JSON.parse(keep)); logSave();
    return r;
  });
  // 5) 보고서 화면
  await p.evaluate(() => { $('dlg').hidden = true; $('reportb').click(); });
  await p.waitForTimeout(200);
  R.report = await p.evaluate(() => ({ open: !$('report').hidden, sum: [...document.querySelectorAll('.rpsum b')].map((x) => x.textContent).join(' | '), rows: document.querySelectorAll('.rpt tbody tr').length, low: document.querySelectorAll('.rpt tr.low').length, miss: document.querySelectorAll('.rpmiss li').length }));
  await p.locator('#report').screenshot({ path: path.join(OUT, 'log_report.png') });
  // 6) 내보내기: 글로 보기 → JSON, CSV 다운로드
  await p.click('#report button[data-r="text"]');
  const json = await p.$eval('#rpta', (t) => t.value);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#report button[data-r="csv"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  R.export = { jsonBytes: json.length, nick: JSON.parse(json).nick, hasName: /이름|email/i.test(json), csvLines: csv.split('\n').length, csvHead: csv.split('\n')[0].replace('﻿', '') };
  // 7) 학급 모아 보기: 학생 3명(별명·정답 바꾼 복사본)
  const o = JSON.parse(json);
  const mk = (nick, flip, part) => { const c = JSON.parse(JSON.stringify(o)); c.nick = nick; c.progress.part = part; c.log.recent.forEach((e, i) => { if (flip && i % 2) e.ok = 0; e.d = e.d; }); return c; };
  const files = [['a.json', o], ['b.json', mk('달빛3', true, 2)], ['c.json', mk('햇빛5', false, 3)]].map(([n, c]) => { const f = path.join(OUT, n); fs.writeFileSync(f, JSON.stringify(c)); return f; });
  const t = await b.newPage({ viewport: { width: 1000, height: 900 } });
  t.on('pageerror', (e) => errs.push('teacher: ' + e.message));
  await t.goto('file://' + path.resolve(__dirname, '../../teacher.html'));
  await t.setInputFiles('#file', files);
  await t.waitForTimeout(300);
  R.teacher = await t.evaluate(() => ({ msg: document.getElementById('msg').textContent, students: document.querySelectorAll('#tS tbody tr').length, units: document.querySelectorAll('#tU tbody tr').length, low: document.querySelectorAll('#tS tr.low, #tU tr.low').length }));
  await t.screenshot({ path: path.join(OUT, 'log_teacher.png'), fullPage: true });
  // 8) 휴대폰: 메뉴 → 선생님 설정 → 학습 보고서
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await m.evaluate((L) => localStorage.setItem('arca-log', JSON.stringify(L)), o.log);
  await m.reload();
  await m.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  await m.evaluate(() => { document.querySelectorAll('.titlebox').forEach((e) => e.remove()); const st = $('study'); st.classList.add('over'); $('stage').appendChild(st); st.hidden = false; document.querySelector('.rpopen').click(); });
  await m.waitForTimeout(300);
  R.phone = await m.evaluate(() => ({ over: $('report').classList.contains('over'), study: !$('study').hidden }));
  await m.screenshot({ path: path.join(OUT, 'log_phone.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
