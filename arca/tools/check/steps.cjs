// 5학년 구멍 메우기 검사(프롬프트 T, src/40-steps.js): node arca/tools/check/steps.cjs
// ① 5학년 12단원 × 60문제(그 부 길목에서 makeQ): 단계 풀이 비율(모두 30↑, 규칙·약분·범위 45↑), 서로 다른 문제(그림 포함 40↑)
// ② 새 풀이 갈래: 문제 은행 문제 300개씩 — 풀이 마지막 칸 = 정답 ③ 새 생성기 300번 — 정답이 보기에 하나, 보기 겹침·이상 값 없음, 풀이 끝 = 정답
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof tsSolve === 'function' && typeof fqRule === 'function');
  const r = await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    const fails = [], table = {};
    const F = (m) => fails.push(m);
    const lastOk = (st, a) => { const L = String(st).split('→').pop().replace(/,(?=\d{3})/g, ''); return L.replace(/cm²?|°|L|개|살/g, '').includes(String(a).replace(/,/g, '')); };
    // ①
    studyCfg.grade = 5; const M0 = M;
    for (let part = 1; part <= 12; part++) {
      const id = Object.keys(MAPS).find((k) => MAP_PART[k] === part && MAPS[k].kind === 'route');
      M = MAPS[id]; save.wrong = []; save.st.adapt = {}; studyCfg.adapt = 'route';
      const s = new Set(), s2 = new Set(); let st = 0;
      for (let i = 0; i < 60; i++) {
        const q = makeQ(1 + (i % 3)); s.add(q.q); s2.add(q.q + (q.fig || ''));
        const x = stepSolve(q); if (x) { st++; if (!lastOk(x, q.a)) F('풀이 끝 ≠ 정답: ' + q.q.replace(/\n/g, ' ') + ' [' + q.a + '] ⇒ ' + x); }
      }
      const nm = unitName(part); table[part + ' ' + nm] = { 풀이: st + '/60', 다른문제: s.size, 그림포함: s2.size };
      const need = /규칙과 대응|약분과 통분|수의 범위/.test(nm) ? 45 : 30;
      if (st < need) F(nm + ' 단계 풀이 ' + st + '/60 (기준 ' + need + ')');
      if (s2.size < 40) F(nm + ' 서로 다른 문제 ' + s2.size + '/60');
    }
    M = M0; studyCfg.adapt = 'auto';
    // ② 은행 문제
    const bank = {};
    for (const [t, no, nm] of [[1, 3, '규칙과 대응'], [1, 4, '약분과 통분'], [2, 1, '수의 범위와 어림하기'], [2, 3, '합동과 대칭'], [2, 5, '직육면체'], [2, 6, '평균과 가능성']]) {
      let made = 0, smp = '';
      for (let i = 0; i < 300; i++) {
        const q = QUIZ.makeQuestion({ grade: 5, term: t, unitNos: [no], tier: 1 + (i % 3), contextMode: 'plain', responseMode: 'choice' });
        const a = String(q.answer), st = stepSolve({ q: q.q, a });
        if (st) { made++; if (!smp) smp = q.q.replace(/\n/g, ' ') + ' ⇒ ' + st; if (!lastOk(st, a)) F('은행 풀이 끝 ≠ 정답: ' + q.q + ' [' + a + '] ⇒ ' + st); }
      }
      bank[nm] = made + '/300 | ' + smp;
      if (made < 240) F(nm + ' 은행 풀이 ' + made + '/300');
    }
    // ③ 생성기
    const gens = {};
    for (const g of [fqRule, fqCuboid2, fqCong2]) {
      let bad = 0; const u = new Set();
      for (let i = 0; i < 300; i++) {
        const q = g(); u.add(q.q + '|' + q.a);
        const why = q.ch.filter((v) => v === q.a).length !== 1 ? '정답 수' : new Set(q.ch).size !== q.ch.length ? '보기 겹침' : !q.fig ? '그림' : !q.steps ? '풀이' : q.ch.some((v) => /NaN|undefined|^-/.test(v)) ? '이상 값' : !lastOk(q.steps, q.a) ? '풀이 끝' : /NaN|undefined/.test(q.q + q.steps) ? '글' : '';
        if (why) { bad++; if (bad <= 2) F(g.name + ' ' + why + ': ' + q.q + ' [' + q.a + '] ' + q.ch + ' ⇒ ' + q.steps); }
      }
      gens[g.name] = '잘못 ' + bad + ' · 서로 다른 문제 ' + u.size;
    }
    // 6학년 「직육면체의 부피와 겉넓이」는 원래 생성기 그대로
    if (fqHit('직육면체의 부피와 겉넓이')[1].includes(fqCuboid2)) F('6학년 단원에 새 직육면체 생성기가 섞임');
    return { table, bank, gens, fails };
  });
  console.table(r.table);
  console.log(JSON.stringify({ bank: r.bank, gens: r.gens }, null, 1));
  console.log('fails', JSON.stringify(r.fails.slice(0, 20), null, 1), 'errs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
