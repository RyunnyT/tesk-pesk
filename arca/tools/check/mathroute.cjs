// 수학이 놀이가 되게 검사(프롬프트 S): 길목 수학 판 6종·만들기 표(3~6학년 전 단원)·간파
// node arca/tools/check/mathroute.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof MR_GEN !== 'undefined' && typeof INS !== 'undefined');
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fails = [], o = {};
    const F = (m) => fails.push(m);
    save.job = 'knight'; save.trained = 1; save.met.momo = 1; save.lv = 10;
    LESSON.auto = false; if (typeof TUT !== 'undefined') TUT.auto = false; SCUT.off = true; MATK.off = true; GROW.auto = false;
    for (const k in MAPS) save.st['in_' + k] = 1;
    save.st.rdHint = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1, I: 1 };
    save.st.mrHint = { A: 1, B: 1, D: 1, E: 1, G: 1, H: 1 };
    // 1) 만들기 표: 3~6학년 모든 단원 × 40번
    const units = [];
    for (const g of [3, 4, 5, 6]) for (const t of [1, 2]) QUIZ.unitsOf(g, t).forEach((u) => units.push([g, u.name]));
    units.push([5, '영어 단어'], [5, '']);
    const bad = (s) => /NaN|undefined|Infinity/.test(String(s));
    for (const [g, u] of units) {
      studyCfg.grade = g;
      for (let i = 0; i < 40; i++) {
        const f = MR_GEN.flower(u);
        const nOk = f.items.filter((q) => q.ok).length, nNo = f.items.length - nOk;
        if (f.items.length < 6 || nOk < 2 || nNo < 2 || f.items.some((q) => bad(q.t)) || bad(f.rule)) { F('꽃 ' + u + ' ' + f.rule + ' ' + f.items.map((q) => q.t + (q.ok ? '✓' : '')).join(',')); break; }
        if (new Set(f.items.map((q) => q.t)).size !== f.items.length) { F('꽃 같은 수 ' + u + ' ' + f.items.map((q) => q.t)); break; }
        const L = MR_GEN.lamps(u, 5);
        if (L.length < 5 || new Set(L.map((q) => q.v)).size < 5 || L.some((q) => bad(q.t))) { F('등불 ' + u); break; }
        const R = MR_GEN.raft(u);
        if (!(R.v > 0 && R.v < 1) || bad(R.t)) { F('뗏목 ' + u); break; }
        const W2 = MR_GEN.wind(u);
        const val = Function('return (' + W2.t.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-') + ')')();
        if (Math.abs(val - W2.n) > 1e-9 || W2.n < 2 || W2.n > 5) { F('바람 ' + u + ' ' + W2.t + '=' + val + '≠' + W2.n); break; }
      }
    }
    studyCfg.grade = 5;
    // 2) 5학년 길목 27곳: 수학 판이 붙은 곳
    const kinds = {};
    let boards = 0;
    for (const id of Object.keys(MAPS).filter((k) => MAPS[k].kind === 'route')) {
      loadMap(id, MAPS[id].exits[0].x0 + 1, MAPS[id].exits[0].y0, true); busy = false; dl = null;
      if (MR.cur) { boards++; kinds[MR.cur.k] = (kinds[MR.cur.k] || 0) + 1; }
    }
    o.boards = boards + '/27 ' + JSON.stringify(kinds);
    if (boards < 15) F('수학 판이 붙은 길목 ' + boards);
    const go = (id) => { loadMap(id, MAPS[id].exits[0].x0 + 1, MAPS[id].exits[0].y0, true); busy = false; dl = null; document.querySelectorAll('#dlg').forEach((e) => (e.hidden = true)); mons.forEach((q) => (q.dead = 1e9)); };
    const at = (a, y) => { pl.x = a * T + 8; pl.y = y * T + 12; };
    const steps = (n) => { for (let i = 0; i < n; i++) update(); };
    const logN = () => (typeof LOG === 'object' ? LOG.recent.length : 0);
    const routeOf = (k) => Object.keys(RDEV).find((id) => RDEV[id] === k && MAPS[id].kind === 'route' && (go(id), MR.cur));
    // 3) 숫자 꽃
    let id = routeOf('H');
    if (!id) F('숫자 꽃 길목 없음'); else {
      const c = MR.cur, g0 = save.gold, l0 = logN();
      const badF = c.flowers.find((f) => !f.ok); at(badF.a, badF.y); steps(2);
      if (badF.st !== 'bad') F('틀린 꽃이 안 시듦');
      c.flowers.filter((f) => f.ok).forEach((f) => { at(f.a, f.y + 2); steps(1); at(f.a, f.y); steps(1); });
      o.flower = c.rule + ' ' + c.got + '/' + c.need;
      if (!c.done || !(save.gold > g0)) F('숫자 꽃 보물 없음');
      if (logN() !== l0 + 1) F('숫자 꽃 학습 기록 ' + (logN() - l0));
      // 하루 한 번: 다시 들어와도 오늘은 보물 없음
      go(id); if (!MR.cur.done) F('오늘 다시 들어왔는데 꽃 보물이 다시 열림');
      save.st.rdev[id].mflower = 1; go(id); if (MR.cur.done) F('다음 날인데 꽃 보물이 안 열림');
    }
    // 4) 징검돌
    id = routeOf('A');
    if (!id) F('징검돌 길목 없음'); else {
      const c = MR.cur, d = M.dev;
      const right = c.stones.find((s) => s.ok), wrong = c.stones.find((s) => !s.ok);
      o.stones = c.stones.map((s) => s.t + (s.ok ? '✓' : '')).join(' ') + ' · ' + String(c.q).slice(0, 30);
      if (!right) F('정답 돌 없음');
      if (wrong) { at(d.s - 1, wrong.y); steps(1); at(wrong.a, wrong.y); steps(2); if (!wrong.sunk) F('틀린 돌이 안 가라앉음'); if (blk(wrong.a, wrong.y)) {} else F('가라앉은 돌을 디딜 수 있음'); }
      if (right && blk(right.a, right.y)) F('정답 돌을 디딜 수 없음');
      if (right) { at(right.a, right.y); steps(2); if (!c.solved) F('정답 돌 인정 안 됨'); }
    }
    // 5) 눈금 뗏목
    id = routeOf('G');
    if (!id) F('눈금 뗏목 길목 없음'); else {
      const c = MR.cur, d = M.dev, g0 = save.gold;
      RD.plat.y = d.lo + (d.hi - d.lo) * c.raft.v; RD.plat.v = 0;
      at(d.s, Math.floor(RD.plat.y)); steps(1);
      at(d.s + 2, Math.floor(RD.plat.y)); RD.plat.v = 0; RD.plat.y = d.lo + (d.hi - d.lo) * c.raft.v; steps(1);
      o.raft = c.raft.t + ' done ' + !!c.done;
      if (!c.done || !(save.gold > g0)) F('눈금 뗏목 보물 없음');
    }
    // 6) 표지판 수수께끼
    id = routeOf('E');
    if (!id) F('표지판 길목 없음'); else {
      const c = MR.cur;
      at(c.sign.a, c.sign.y); steps(2); await sleep(30);
      const box = !$('lesson').hidden && /수수께끼/.test($('lesson').textContent);
      if (!box) F('표지판 수수께끼 안 뜸');
      else {
        const bs = [...$('lesson').querySelectorAll('.lsch button')];
        for (const x of bs) { if (c.solved) break; x.click(); await sleep(10); }
        if (!c.solved) F('표지판 정답 처리 안 됨');
        await sleep(1500);
      }
      busy = false;
    }
    // 7) 등불 차례
    id = routeOf('B');
    if (!id) F('등불 길목 없음'); else {
      const c = MR.cur, g0 = save.gold;
      const L = c.order.slice();
      // 틀린 차례 먼저
      at(L[1].a, L[1].y + 1); steps(2);
      if (c.lit.length) F('틀린 차례인데 이어짐');
      L.forEach((q) => { at(q.a, q.y + 1); steps(2); });
      o.lamps = L.map((q) => q.t).join('<') + ' bright ' + c.bright;
      if (!c.bright || !(save.gold > g0)) F('등불 차례 보물·밝아짐 없음');
      go(id); if (M.dev.k !== 'B') F('다시 들어와도 어둠이 안 돌아옴');
    }
    // 8) 바람 세기
    id = routeOf('D');
    if (!id) F('바람 길목 없음'); else {
      const c = MR.cur;
      let ok = null;
      for (let y = 2; y < M.h - 2 && !ok; y++) for (let a = 12; a < 30 && !ok; a++) if ([0, 1, 2, 3, 4, 5, 6].every((k) => !blk(a - k, y) && !blk(a - k, y - 1)) && !blk(a + 1, y) && !blk(a + 1, y - 1)) ok = [a, y];
      at(ok[0], ok[1]);
      RD.t = 0; steps(380); // 예고 끝, 바람 직전
      const n = c.wind.n, x0 = pl.x;
      steps(100);
      const moved = (x0 - pl.x) / T;
      o.wind = c.wind.t + ' = ' + n + ' → ' + moved.toFixed(1) + '칸';
      if (Math.abs(moved - n) > 0.8) F('바람 세기만큼 안 밀림 ' + o.wind);
    }
    // 9) 간파
    go('r1');
    const m = mons.find((q) => !MON[q.type].boss); m.dead = 0; m.hpNow = null;
    pl.x = m.x - 14; pl.y = m.y;
    o.insKind = insKind();
    FLD.g = 2; insUse(); if (MINI.on) F('게이지가 모자란데 간파됨');
    FLD.g = 3; insUse();
    if (!MINI.on) F('간파 미니 조작 안 열림');
    else {
      if (!MINI.easy) F('간파가 쉬운 수가 아님');
      const MI = mstat(m), d0 = MINI.done;
      $('mini').hidden = true; MINI.on = false; busy = false; document.body.classList.remove('miniing'); MINI.miss = 0;
      d0(true);
      o.insDmg = (MI.hp - m.hpNow) + '/' + MI.hp;
      if (!(m.dead || Math.abs(MI.hp - m.hpNow - Math.round(MI.hp * 0.7)) <= 1)) F('간파 피해 ' + o.insDmg);
      if (FLD.g !== 0) F('간파 뒤 게이지 ' + FLD.g);
      // 실패: 게이지 1칸 돌려받음
      m.hpNow = null; FLD.g = 3; insUse(); const d1 = MINI.done;
      $('mini').hidden = true; MINI.on = false; busy = false; MINI.miss = 3; d1(false);
      if (FLD.g !== 1) F('간파 실패 게이지 ' + FLD.g);
      // 하루 3번
      FLD.g = 3; insUse(); if (MINI.on) { const d2 = MINI.done; $('mini').hidden = true; MINI.on = false; busy = false; MINI.miss = 0; d2(true); }
      FLD.g = 3; insUse(); if (MINI.on) F('길목에서 4번째 간파가 됨');
      MINI.on = false; $('mini').hidden = true; busy = false;
    }
    return { fails, o };
  });
  console.log(JSON.stringify(r.o, null, 1), '\nfails', JSON.stringify(r.fails, null, 1), '\nerrs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
