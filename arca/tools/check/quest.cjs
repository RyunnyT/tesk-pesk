// 퀘스트 다양함 검사(프롬프트 O 3단계): 새 종류 6가지·바꾼 퀘스트·이어지는 사연·생성기 정답 검증·옛 저장 옮기기
// node arca/tools/check/quest.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof QX_CONV !== 'undefined' && typeof QUIZ !== 'undefined');
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = { fails: [] };
    const F = (m) => out.fails.push(m);
    LESSON.auto = false;
    // 1) 종류 표
    const c = qxStats();
    out.types = c;
    out.total = QS.length;
    // 2) 모든 퀘스트: npc 가 그 맵에 있음, 새 종류 필드
    for (const q of QS) {
      if (!MAPS[q.map] || !MAPS[q.map].npcs.some((n) => n[0] === q.npc)) F('npc 없음 ' + q.id);
      if (q.after && !QS.some((x) => x.id === q.after)) F('after 없음 ' + q.id);
      if ((q.type === 'deliver' || q.type === 'talk') && !(MAPS[q.toMap] && (MAPS[q.toMap].npcs.some((n) => n[0] === q.to) || q.toMap === 'lh1'))) F('받는 사람 없음 ' + q.id);
      if (q.type === 'escort' && !qxEscTarget(q)) F('호위 출구 없음 ' + q.id);
      if (q.type === 'dex' && qxDexKinds(q.where).length < q.n) F('도감 종류 부족 ' + q.id);
      if (q.type === 'choice' && !QX_CHOICE[q.id]) F('고민 내용 없음 ' + q.id);
      if (!q.rw) F('보상 없음 ' + q.id);
    }
    // 3) 생성기: 3~6학년 모든 단원 × 40번
    const units = [];
    for (const g of [3, 4, 5, 6]) for (const t of [1, 2]) QUIZ.unitsOf(g, t).forEach((u) => units.push(u.name));
    units.push('영어 단어', '');
    const seen = { r: {}, t: {} };
    for (const u of units) {
      const g1 = QX_RIDDLE.find(([ks]) => ks.some((w) => u.includes(w))), g2 = QX_TEACH.find(([ks]) => ks.some((w) => u.includes(w)));
      seen.r[u] = g1 ? g1[0][0] : '(기본)';
      seen.t[u] = g2 ? g2[0][0] : '(기본)';
      for (let i = 0; i < 40; i++) {
        const R = (g1 ? g1[1] : qxRiddleFb)();
        const ch = qxChoices(R.a, R.w || []);
        if (!ch.includes(String(R.a))) F('수수께끼 정답 없음 ' + u);
        if (new Set(ch).size !== ch.length || ch.length < 3) F('수수께끼 보기 ' + u + ' ' + ch);
        if (/NaN|undefined|Infinity/.test(R.q + R.a + ch.join())) F('수수께끼 값 ' + u + ' ' + R.q);
        const Tq = (g2 ? g2[1] : qxTeachFb)();
        if (!(Tq.bad >= 0 && Tq.bad < Tq.L.length)) F('틀린 줄 번호 ' + u);
        if (/NaN|undefined|Infinity/.test(Tq.p + Tq.L.join() + Tq.fix)) F('풀이 값 ' + u + ' ' + Tq.p);
      }
    }
    out.genMap = seen;
    // 4) 실제 흐름
    save.job = 'knight'; save.trained = 1; save.met.momo = 1;
    const flush = async () => { for (let i = 0; i < 40 && dl; i++) { if (dl.ch && dl.i === dl.lines.length - 1) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); await sleep(5); } };
    const npc = (id) => npcs.find((n) => n.id === id && !n.qxEsc);
    // 수수께끼 q4 (2부 소라)
    loadMap('t2', 15, 14, true);
    let g0 = save.gold;
    talk(npc('sora')); await flush(); await sleep(500);
    for (let k = 0; k < 2; k++) {
      if ($('lesson').hidden) { F('수수께끼 창 안 열림'); break; }
      const bs = [...$('lesson').querySelectorAll('.lsch button')];
      const wrong = bs.find((x) => !x.disabled);
      // 정답 고르기: 보기 중 수수께끼 답(창의 정답 판정을 그대로 이용 — 하나씩 눌러 봄)
      for (const x of bs) { if ($('qxn')) break; x.click(); await sleep(20); }
      if (!$('qxn')) { F('수수께끼 정답 못 찾음'); break; }
      $('qxn').click(); await sleep(50);
    }
    await flush();
    out.riddle = save.q.q4 && save.q.q4.st;
    if (out.riddle !== 'done') F('수수께끼 퀘스트 안 끝남 ' + JSON.stringify(save.q.q4));
    if (!(save.gold > g0)) F('수수께끼 보상 없음');
    // 가르쳐 주기 q5 (3부 할미꽃)
    loadMap('t3', 20, 14, true);
    talk(npc('halmi')); await flush(); await sleep(500);
    let wrongPicks = 0;
    for (let k = 0; k < 2; k++) {
      const bs = [...$('lesson').querySelectorAll('.qxlines button')];
      for (const x of bs) { if ($('qxn')) break; x.click(); if (!$('qxn')) wrongPicks++; await sleep(20); }
      if (!$('qxn')) { F('틀린 줄 못 찾음'); break; }
      $('qxn').click(); await sleep(50);
    }
    await flush();
    out.teach = save.q.q5 && save.q.q5.st;
    if (out.teach !== 'done') F('가르쳐 주기 안 끝남');
    // 고민 듣기 s4 (리토) — 두 번째 선택지
    talk(npc('rito'));
    for (let i = 0; i < 40 && dl && !(dl.ch && dl.i === dl.lines.length - 1); i++) { nextDlg(); await sleep(5); }
    if (!(dl && dl.ch)) await sleep(400);
    for (let i = 0; i < 40 && dl && !(dl.ch && dl.i === dl.lines.length - 1); i++) { nextDlg(); await sleep(5); }
    if (dl && dl.ch) { const c2 = dl.ch[1]; endDlg(); c2[1](); }
    const sayLine = dl && dl.lines[0];
    await flush();
    out.choice = save.q.s4 && save.q.s4.st + ' c=' + save.q.s4.c;
    if (!(save.q.s4 && save.q.s4.st === 'done' && save.q.s4.c === 1)) F('고민 듣기 안 끝남 ' + JSON.stringify(save.q.s4));
    if (sayLine !== QX_CHOICE.s4.opts[1].say[0]) F('고른 대사가 다름 ' + sayLine);
    // 이어지는 사연: s4 끝 → c3(리토, 전하기) 받기
    talk(npc('rito')); await flush();
    out.chain = save.q.c3 && save.q.c3.st;
    if (!out.chain) F('이어지는 사연 c3 안 열림');
    // 시간 안 배달 s3 (덕배 → 마린다), 늦게 전하기
    loadMap('t2', 15, 14, true);
    talk(npc('deok')); await flush();
    if (!save.q.s3 || save.q.s3.st !== 'active') F('배달 안 받아짐');
    save.q.s3.t0 = Date.now() - 200 * 1000; // 늦게
    talk(npc('marinda')); await flush();
    if (!(save.q.s3.k === 1 && save.q.s3.late === 1)) F('배달 늦음 기록 ' + JSON.stringify(save.q.s3));
    g0 = save.gold;
    talk(npc('deok')); await flush();
    const got = save.gold - g0;
    out.deliverLate = got + ' / ' + QS.find((q) => q.id === 's3').rw.gold;
    if (save.q.s3.st !== 'done' || got !== Math.round(QS.find((q) => q.id === 's3').rw.gold * 0.7)) F('늦은 배달 보상 70% 아님 ' + got);
    // 도감 사진 s5 (제이, 버려진 광산 d3)
    loadMap('t4', 20, 14, true);
    talk(npc('jay')); await flush();
    loadMap('d3', 3, 20, true);
    for (const k of qxDexKinds('d3')) {
      const m = mons.find((m) => m.type === k);
      if (!m) { F('d3 에 ' + k + ' 없음'); continue; }
      askField({ ...MON[k], n: MON[k].n }, 'x', () => {}); await sleep(30);
      // 문제 상자 닫기
      if (typeof closeBox === 'function') closeBox();
      if (typeof ORB !== 'undefined' && ORB.on && typeof orbCancel === 'function') orbCancel();
      busy = false;
    }
    out.dex = save.q.s5 && save.q.s5.k + '/' + QS.find((q) => q.id === 's5').n + ' ' + (save.q.s5.seen || []).join(',');
    if (!(save.q.s5 && save.q.s5.k >= 3)) F('도감 사진 안 모임 ' + out.dex);
    loadMap('t4', 20, 14, true);
    talk(npc('jay')); await flush();
    if (save.q.s5.st !== 'done') F('도감 사진 안 끝남');
    // 호위 s2 (바르그, 숲길 끝 r3 쪽)
    loadMap('t1', 30, 16, true);
    talk(npc('barg')); await flush(); await sleep(400);
    if (!QX.esc) F('호위 따라오는 사람 없음');
    if (npcs.filter((n) => n.id === 'barg').length !== 1) F('바르그가 둘');
    loadMap('r2', 2, 14, true);
    if (!QX.esc || !npcs.includes(QX.esc)) F('맵 옮긴 뒤 따라오지 않음');
    // 몬스터 옆이면 멈춤
    const m0 = mons.find((m) => !m.dead);
    const f = QX.esc;
    if (m0) { f.x = m0.x + 10; f.y = m0.y; pl.x = f.x + 60; pl.y = f.y; for (let i = 0; i < 15; i++) QX.trail.push({ x: pl.x, y: pl.y }); busy = false; dl = null; const ox = f.x; update(); if (!f.qxScared || f.x !== ox) F('몬스터 옆에서 안 멈춤'); }
    mons.forEach((m) => (m.dead = 1e9));
    const tg = qxEscTarget(QS.find((q) => q.id === 's2'));
    pl.x = tg.x - 30; pl.y = tg.y; f.x = tg.x - 40; f.y = tg.y; QX.trail = [];
    for (let i = 0; i < 20; i++) { QX.trail.push({ x: tg.x - 40, y: tg.y }); }
    busy = false; update(); await sleep(20);
    await flush();
    out.escort = save.q.s2 && save.q.s2.st;
    if (out.escort !== 'done') F('호위 안 끝남 ' + JSON.stringify(save.q.s2));
    update();
    if (npcs.some((n) => n.qxEsc)) F('끝난 뒤에도 따라옴');
    // 5) 옛 저장 옮기기: q8(톱니 4개 모으기) 다 모은 저장 → 새 방식에서도 바로 끝낼 수 있음, q9(잡기) 2/5 → 0부터
    save.st.qconv = 0;
    save.q.q8 = { st: 'active', k: 0 }; save.inv.gear = 4;
    const q8 = QS.find((q) => q.id === 'q8'); save.inv[q8.was.item] = q8.was.n;
    save.q.q9 = { st: 'active', k: 2 };
    qxMigrate();
    out.migrate = 'q8 ' + qCount(q8) + '/' + q8.n + ' · q9 ' + save.q.q9.k;
    if (qCount(q8) < q8.n) F('옛 저장 q8 못 끝냄');
    if (save.q.q9.k !== 0) F('옛 저장 q9 0부터 아님');
    // 6) 길 안내: 2부 메인 q4 가 새 종류일 때 목표가 그 사람
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
