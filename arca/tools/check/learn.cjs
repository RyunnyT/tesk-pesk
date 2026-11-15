// 배움 고치기(src/24-learn.js) 검사:
// ① 찍기만 하는 학생이 늑대 6마리를 잡는 데 걸리는 문제 수·시간(예전 19문제·38초) ② 다 맞히는 학생 ③ 풀이는 단추를 눌러야 넘어감
// ④ 단계 풀이의 답 = 정답(혼합 계산·분수·약수배수·넓이) ⑤ 틀린 유형이 3문제 안에 다른 수로 ⑥ 보기 4개 화면
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
    save.job = 'knight'; save.lv = 3; save.trained = 1; save.st.orbTip = 1; save.st.lessonOff = 1;
    save.rpg.eq.w = rpgAdd('w_knight_1', 0, true).u;
    loadMap('r1', 6, 11, true);
    window.W8 = (f, n = 200) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 25)); r(f()); });
    window.__wolf = () => { mons = []; const m = { map: M.id, type: 'wolf', x: pl.x + 24, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0 }; mons.push(m); if (typeof BP === 'object') BP.cool = 99999; return m; };
    // 한 문제에 답하기: pick(보기들, 정답) → 누를 보기. think = 생각 시간(ms)
    window.__answer = async (pick, think) => {
      await W8(() => (ORB.on && !ORB.done && !ORB.fly) || !$('bt').hidden);
      await new Promise((r) => setTimeout(r, think));
      const a = String(RQ.last.a);
      if (RQ.short) { const v = pick(null, a); for (const ch of v) { const k = document.querySelector('#kp [data-k="' + ch + '"]'); k && k.click(); } document.querySelector('#kp [data-k="ok"]').click(); }
      else { const bs = orbBtns().filter((x) => !x.disabled); const v = pick(bs.map((x) => x.dataset.v), a); const i = orbBtns().findIndex((x) => x.dataset.v === v); if (ORB.on) orbThrow(i); else orbBtns()[i].click(); }
    };
    // 몬스터 한 마리를 잡을 때까지. 돌려줌: 문제 수(다시 풀기 포함)
    window.__hunt = async (pick, think) => {
      const m = __wolf(); let q = 0;
      for (let g = 0; g < 40 && !m.dead; g++) {
        if (m.shieldT > Date.now()) { await new Promise((r) => setTimeout(r, 300)); continue; }
        B = null; busy = false; pl.inv = 0; fieldStrike(m, null);
        if (!(await W8(() => ORB.on || !$('bt').hidden, 20))) continue;
        for (let k = 0; k < 3; k++) {
          await __answer(pick, think); q++;
          await W8(() => LEARN.wait || (!ORB.on && !busy && !B) || m.dead, 120);
          if (LEARN.wait) { await new Promise((r) => setTimeout(r, 60)); document.getElementById('lnok').click(); await W8(() => (ORB.on && !ORB.done) || !$('bt').hidden || (!busy && !B), 80); if (!ORB.on && $('bt').hidden) break; } else break;
        }
        await W8(() => (!ORB.on && !busy && !B) || m.dead, 120);
      }
      return { q, dead: !!m.dead };
    };
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => { for (let i = 0; i < 40 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false; });
  const R = {};
  R.choices = await p.evaluate(() => { const q = makeQ(1); return q.ch.length; });
  // ① 찍기: 0.2초 만에 아무거나
  R.guess = await p.evaluate(async () => {
    const t0 = performance.now(), hp0 = pl.hp; let q = 0, kills = 0;
    for (let i = 0; i < 6 && performance.now() - t0 < 150000; i++) { const r = await __hunt((ch, a) => (ch ? ch[Math.floor(Math.random() * ch.length)] : '1'), 200); q += r.q; if (r.dead) kills++; }
    return { kills, questions: q, sec: Math.round((performance.now() - t0) / 1000), shields: save.st.fastN || 0, heartsLost: hp0 - pl.hp };
  });
  // ② 다 맞히기(생각 0.2초로 같은 조건)
  R.perfect = await p.evaluate(async () => {
    save.wrong = []; LEARN.fast = [];
    const t0 = performance.now(); let q = 0, kills = 0;
    for (let i = 0; i < 6; i++) { const r = await __hunt((ch, a) => a, 200); q += r.q; if (r.dead) kills++; }
    return { kills, questions: q, sec: Math.round((performance.now() - t0) / 1000) };
  });
  // ③ 풀이는 단추를 눌러야 넘어감 + ⑤ 다시 풀기는 다른 수·같은 유형
  R.flow = await p.evaluate(async () => {
    save.wrong = []; LEARN.fast = [];
    const m = __wolf(); m.hpNow = 99999; const h0 = m.hpNow;
    B = null; busy = false; fieldStrike(m, null);
    await __answer((ch, a) => ch.find((v) => v !== a), 1700);
    await W8(() => LEARN.wait);
    const q1 = RQ.last.q;
    await new Promise((r) => setTimeout(r, 2600));
    const stillWaiting = !!LEARN.wait, txt = ($('qsr').textContent || $('bm').textContent).slice(0, 120);
    document.getElementById('lnok').click();
    await W8(() => ORB.on && !ORB.done);
    const q2 = RQ.last.q, title2 = $('qst').textContent;
    await __answer((ch, a) => a, 300);
    await W8(() => !ORB.on && !busy && !B);
    const half = h0 - m.hpNow;
    // 또 틀리면 0
    const h1 = m.hpNow; B = null; busy = false; fieldStrike(m, null);
    await __answer((ch, a) => ch.find((v) => v !== a), 1700); await W8(() => LEARN.wait); document.getElementById('lnok').click();
    await W8(() => ORB.on && !ORB.done); await __answer((ch, a) => ch.find((v) => v !== a), 1700); await W8(() => LEARN.wait); document.getElementById('lnok').click();
    await W8(() => !ORB.on && !busy && !B);
    return { stillWaiting, txt, sameSig: lnSig(q1) === lnSig(q2), differentQ: q1 !== q2, title2, half, atk: atk(), zero: h1 - m.hpNow, logged: LOG.recent.length, retry: LOG.retry, wrongNote: save.wrong.map((w) => ({ st: w.st, src: !!w.src, ex: (w.ex || '').slice(0, 40) })) };
  });
  // ⑤ 틀린 유형이 3문제 안에 다시(다른 수) → 맞히면 st 1
  R.reask = await p.evaluate(async () => {
    const w = save.wrong[0]; if (!w) return 'no wrong';
    let seen = -1, q;
    for (let i = 1; i <= 3; i++) { q = makeQ(1); if (q.re && q.wq) { seen = i; break; } }
    return { within: seen, newText: q.q !== w.q, sameSig: lnSig(q.q) === w.sig };
  });
  // ④ 단계 풀이 = 정답
  R.steps = await p.evaluate(() => {
    const out = {};
    for (const [g, t, no, nm] of [[5, 1, 1, '혼합 계산'], [5, 1, 2, '약수와 배수'], [5, 1, 5, '분수 덧뺄셈'], [5, 1, 6, '넓이'], [5, 2, 2, '분수 곱셈'], [5, 2, 4, '소수 곱셈'], [3, 1, 4, '곱셈'], [3, 2, 2, '나눗셈'], [4, 2, 1, '4학년 분수']]) {
      let made = 0, n = 40, sample = '';
      for (let i = 0; i < n; i++) {
        const q = QUIZ.makeQuestion({ grade: g, term: t, unitNos: [no], tier: 1 + (i % 3), contextMode: 'plain', responseMode: 'choice' });
        const s = stepSolve({ q: q.q, a: String(q.answer) });
        if (s) { made++; if (!sample) sample = q.q.replace(/\n/g, ' ') + ' ⇒ ' + s; }
      }
      out[nm] = made + '/' + n + ' | ' + sample;
    }
    return out;
  });
  // ⑥ 화면
  await p.evaluate(async () => { save.wrong = []; LEARN.fast = []; const m = __wolf(); m.hpNow = 99999; B = null; busy = false; fieldStrike(m, null); await W8(() => ORB.on); });
  await p.waitForTimeout(300);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'learn_4.png') });
  await p.evaluate(async () => { await __answer((ch, a) => ch.find((v) => v !== a), 1700); await W8(() => LEARN.wait); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'learn_wrong.png') });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.body.classList.add('mobile'); fitView && fitView(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'learn_phone.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
