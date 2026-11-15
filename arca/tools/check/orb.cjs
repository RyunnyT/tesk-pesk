// 약점 구슬 전투(src/18-orb.js) 검사: 게임이 멈추지 않음, 띠·구슬, 정답/오답 피해, 조준 몬스터 느리게, 다른 길목·상자 설정은 예전 상자.
// 사용법: node arca/tools/check/orb.cjs  → 화면 사진은 out/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 760 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    save.job = 'warrior'; save.lv = 3; save.trained = 1;
    save.rpg.eq.w = rpgAdd('w_warrior_1', 0, true).u;
    window.partDone = () => true;
    loadMap('r1', 3, 10, true);
    $('dlg').hidden = true; dl = null; busy = false;
    window.__fresh = (type, dx) => {
      mons = [];
      const m = { map: M.id, type: type || 'wolf', x: pl.x + (dx || 40), y: pl.y, hx: pl.x + 40, hy: pl.y, tx: pl.x + 40, ty: pl.y, wait: 999, dir: -1, f: 0, mv: false, dead: 0, hit: 0 };
      mons.push(m);
      return m;
    };
    window.__wait = (f, n = 100) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 30)); r(f()); });
  });
  // 첫 방문 장면이 뜨면 닫는다
  await p.waitForTimeout(800);
  await p.evaluate(() => { for (let i = 0; i < 30 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  const R = {};
  // 1) 조준: 띠가 뜨고, 상자는 숨고, 게임은 움직인다
  R.aim = await p.evaluate(async () => {
    const m = __fresh('wolf', 40);
    m.hpNow = 99999;
    fieldStrike(m, null);
    const x0 = m.x, tk0 = tk;
    await new Promise((r) => setTimeout(r, 700));
    return { strip: !$('qstrip').hidden, box: !$('bt').hidden, busy, ticking: tk > tk0, moved: +(x0 - m.x).toFixed(2), orbs: $('qsa').children.length, q: $('qsq').textContent.slice(0, 30) };
  });
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'orb_aim.png') });
  // 2) 정답 구슬(키보드 1·2·3) → 피해 그대로
  R.right = await p.evaluate(async () => {
    const m = ORB.m, h0 = m.hpNow, q = RQ.last;
    const i = [...$('bc').children].filter((x) => !x.hidden).findIndex((x) => x.dataset.v === String(q.a));
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (i + 1), key: String(i + 1) }));
    await __wait(() => !ORB.fly && ORB.done);
    const r = { streak: FLD.streak, res: $('qsr').textContent };
    await __wait(() => !ORB.on);
    r.dmg = h0 - m.hpNow;
    await __wait(() => !busy && !B);
    r.end = !ORB.on && $('qstrip').hidden && !busy;
    return r;
  });
  // 3) 오답 구슬(띠 버튼 클릭) → 피해 절반 + 풀이
  await p.evaluate(() => { B = null; const m = __fresh('wolf', 40); m.hpNow = 99999; fieldStrike(m, null); });
  await p.waitForTimeout(200);
  R.wrong = await p.evaluate(async () => {
    const m = ORB.m, h0 = m.hpNow, q = RQ.last;
    const i = [...$('bc').children].filter((x) => !x.hidden).findIndex((x) => x.dataset.v !== String(q.a));
    document.querySelector('#qsa button[data-oi="' + i + '"]').click();
    await __wait(() => ORB.done);
    const r = { streak: FLD.streak, res: $('qsr').textContent.slice(0, 40) };
    await new Promise((q) => setTimeout(q, 150));
    window.__shot = 1;
    return r;
  });
  await p.waitForTimeout(150);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'orb_wrong.png') });
  R.wrong.dmg = await p.evaluate(async () => { const m = ORB.m, h = m.hpNow; await __wait(() => !ORB.on && !busy && !B); return h - m.hpNow; });
  R.wrong.atk = await p.evaluate(() => atk());
  // 4) 끝까지: 늑대 한 마리를 정답만으로 쓰러뜨리기(몇 번, 몇 초)
  R.kill = await p.evaluate(async () => {
    B = null;
    const m = __fresh('wolf', 30);
    const t0 = performance.now();
    let n = 0;
    while (!m.dead && n < 12) {
      fieldStrike(m, null);
      if (!(await __wait(() => ORB.on, 40))) { if (m.dead) break; await new Promise((r) => setTimeout(r, 200)); continue; }
      n++;
      const i = [...$('bc').children].filter((x) => !x.hidden).findIndex((x) => x.dataset.v === String(RQ.last.a));
      orbThrow(i);
      await __wait(() => !ORB.on && !busy && !B);
    }
    return { hits: n, dead: !!m.dead, sec: +((performance.now() - t0) / 1000).toFixed(1) };
  });
  // 5) 다른 길목(r2)도 구슬, 설정 '문제 상자'면 예전 상자
  R.other = await p.evaluate(async () => {
    B = null; busy = false;
    loadMap('r2', 3, 10, true);
    await new Promise((r) => setTimeout(r, 800));
    for (let i = 0; i < 30 && dl; i++) nextDlg();
    $('dlg').hidden = true; dl = null; busy = false;
    const m = __fresh('wolf', 14); m.hpNow = 99999; fieldStrike(m, null);
    await new Promise((r) => setTimeout(r, 200));
    const r2 = { box: !$('bt').hidden, strip: !$('qstrip').hidden };
    [...$('bc').children][0].click(); await __wait(() => !ORB.on && !busy && !B);
    loadMap('r1', 3, 10, true); $('dlg').hidden = true; dl = null; busy = false;
    studyCfg.battle = 'box';
    const m2 = __fresh('wolf', 14); m2.hpNow = 99999; fieldStrike(m2, null);
    await new Promise((r) => setTimeout(r, 200));
    const bx = { box: !$('bt').hidden, strip: !$('qstrip').hidden };
    [...$('bc').children][0].click(); await __wait(() => $('bt').hidden); busy = false; B = null;
    studyCfg.battle = 'orb';
    return { r2, box: bx };
  });
  // 5b) Esc 로 조준 풀기 → 다시 걸을 수 있음
  R.esc = await p.evaluate(async () => {
    B = null; busy = false;
    const m = __fresh('wolf', 30); m.hpNow = 99999; fieldStrike(m, null);
    await new Promise((r) => setTimeout(r, 100));
    const on = ORB.on;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
    return { was: on, now: ORB.on, busy, B: !!B, strip: !$('qstrip').hidden };
  });
  // 5c) 몬스터 성격 = 문제 모양: 잉크 = 글 문제, 태엽 병정 = 숫자 판, 들쥐 = 짧은 문제
  R.shape = await p.evaluate(async () => {
    const out = {};
    for (const t of ['ink', 'windup', 'rat', 'wolf']) {
      const L = [];
      for (let k = 0; k < 6; k++) {
        B = null; busy = false;
        const m = __fresh(t, 30); m.hpNow = 99999; fieldStrike(m, null);
        await new Promise((r) => setTimeout(r, 60));
        L.push({ len: qBody((RQ.last || {}).q).length, short: !!RQ.short, title: RQ.short ? $('btt').textContent : $('qst').textContent });
        if (RQ.short) { document.querySelector('#kp [data-k="ok"]').click(); } else orbThrow(0);
        await __wait(() => !ORB.on && !busy && !B && $('bt').hidden);
      }
      out[t] = { avgLen: Math.round(L.reduce((a, b) => a + b.len, 0) / L.length), keypad: L.filter((x) => x.short).length + '/' + L.length, title: L[0].title };
    }
    return out;
  });
  // 5d) 몬스터 5마리 시간: 생각하는 시간 1.5초 + 80% 정답, 구슬 vs 예전 상자 (화면이 멈추는 시간 = 상자 방식에서 걷지 못한 시간)
  R.time = await p.evaluate(async () => {
    const res = {};
    for (const modeName of ['orb', 'box']) {
      studyCfg.battle = modeName;
      let froze = 0, qn = 0;
      const t0 = performance.now();
      const smp = setInterval(() => { if (busy) froze += 20; }, 20);
      for (let i = 0; i < 5; i++) {
        B = null; busy = false;
        const m = __fresh('wolf', 30);
        let guard = 0;
        while (!m.dead && guard++ < 10) {
          fieldStrike(m, null);
          const ts = performance.now();
          await new Promise((r) => setTimeout(r, 1500));
          qn++;
          const ok = Math.random() < 0.8;
          if (RQ.short) { const v = ok ? String(RQ.last.a) : '0'; for (const ch of v) document.querySelector('#kp [data-k="' + ch + '"]').click(); document.querySelector('#kp [data-k="ok"]').click(); }
          else {
            const bs = [...$('bc').children].filter((x) => !x.hidden && !x.disabled);
            const b0 = ok ? bs.find((x) => x.dataset.v === String(RQ.last.a)) : bs.find((x) => x.dataset.v !== String(RQ.last.a));
            if (ORB.on) orbThrow(orbBtns().indexOf(b0)); else b0.click();
          }
          for (let k = 0; k < 200 && (ORB.on || busy || B); k++) { await new Promise((r) => setTimeout(r, 20)); }
        }
      }
      clearInterval(smp);
      res[modeName] = { perQ: +((performance.now() - t0) / 1000 / qn).toFixed(2), frozenPerQ: +(froze / 1000 / qn).toFixed(2), sec: +((performance.now() - t0) / 1000).toFixed(1), questions: qn, frozenSec: +(froze / 1000).toFixed(1) };
    }
    studyCfg.battle = 'orb';
    return res;
  });
  // 6) 휴대폰 크기 사진
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.body.classList.add('mobile'); if (typeof fitView === 'function') fitView(); B = null; busy = false; const m = __fresh('slime', 34); m.hpNow = 99999; fieldStrike(m, null); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'orb_phone.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
