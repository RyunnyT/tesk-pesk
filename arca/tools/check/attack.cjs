// 몬스터 공격 모션·보스 땅 울리기·무차별 공격 검사
// node arca/tools/check/attack.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof MATK !== 'undefined' && typeof BP !== 'undefined');
  const r = await p.evaluate(async () => {
    const fails = [], out = {};
    const F = (m) => fails.push(m);
    save.job = 'knight'; save.trained = 1; save.met.momo = 1; save.lv = 20;
    if (typeof TUT !== 'undefined') TUT.auto = false;
    LESSON.auto = false;
    const clear = () => { busy = false; dl = null; B = null; document.querySelectorAll('.box').forEach((e) => (e.hidden = true)); if (typeof ORB === 'object') ORB.on = false; };
    // 1) 일반 몬스터: 기 모으기 → 덤비기
    loadMap('r1', 2, 10, true); clear();
    const m = mons.find((q) => !q.dead && !MON[q.type].boss);
    mons.forEach((q) => { if (q !== m) q.dead = 1e9; });
    pl.x = m.x - 22; pl.y = m.y; pl.inv = 0; m.acd = 0;
    const seen = new Set();
    let contact = false; const fc = fieldContact; fieldContact = function (q) { contact = true; return fc.apply(this, arguments); };
    pl.hp = 5; const hpA = pl.hp; let hitAt = -1;
    for (let i = 0; i < 40 && hitAt < 0; i++) { update(); if (m.atk) seen.add(m.atk.ph); if (pl.hp < hpA || pl.inv > 0) hitAt = i; }
    out.mon = [...seen].join('→') + ' → 하트 ' + (hpA - pl.hp) + ' 줄어듦' + (contact ? ', 문제 뜸(잘못)' : ', 문제 안 뜸');
    if (!seen.has('wind') || !seen.has('go')) F('일반 몬스터 공격 모션 없음 ' + out.mon);
    if (hitAt < 0) F('덤벼서 닿지 않음');
    if (contact || busy || (typeof ORB === 'object' && ORB.on)) F('덤비기에 맞았는데 문제가 뜸');
    for (let i = 0; i < 30; i++) update();
    if (contact) F('맞은 뒤 바로 문제가 뜸');
    clear();
    // 비켜서면 헛손질
    loadMap('r1', 2, 10, true); clear();
    const m2 = mons.find((q) => !q.dead && !MON[q.type].boss);
    mons.forEach((q) => { if (q !== m2) q.dead = 1e9; });
    pl.x = m2.x - 22; pl.y = m2.y; pl.inv = 0; m2.acd = 0;
    let miss = false;
    for (let i = 0; i < 40; i++) { update(); if (m2.atk && m2.atk.ph === 'go') { pl.y = m2.y + 40; } if (!m2.atk && seen.size && i > 5) { miss = !busy; break; } }
    if (!miss) F('비켜섰는데 맞음');
    clear();
    // 2) 보스(문지기): 고유 패턴과 땅 울리기가 번갈아
    loadMap('r3', 2, 10, true); clear();
    const g = mons.find((q) => q.type === 'gate' && !q.dead);
    mons.forEach((q) => { if (q !== g) q.dead = 1e9; });
    pl.x = g.x - 90; pl.y = g.y; pl.hp = 99; pl.inv = 0;
    const kinds = [];
    BP.cool = 1; BP.zones = [];
    for (let i = 0; i < 900 && kinds.length < 3; i++) { const had = BP.zones.length; update(); clear(); if (!had && BP.zones.length) kinds.push(BP.kind); pl.inv = 0; }
    out.boss = kinds.join(', ');
    if (!kinds.includes('slam') || kinds.filter((k) => k !== 'slam').length < 1) F('보스 패턴 번갈기 ' + out.boss);
    // 3) 틀리면 무차별 공격 3번
    BP.zones = []; BP.rage = 3; BP.cool = 14; BP.rageToast = 0;
    let waves = 0, hp0 = pl.hp;
    pl.x = g.x - 50;
    for (let i = 0; i < 900 && (BP.rage > 0 || BP.zones.length); i++) { const had = BP.zones.length; update(); clear(); if (!had && BP.zones.length && BP.kind === 'rage') waves++; pl.inv = 0; }
    out.rage = waves + '번, 하트 ' + (hp0 - pl.hp) + ' 줄어듦(서 있기만 함)';
    if (waves !== 3) F('무차별 공격 횟수 ' + waves);
    if (hp0 - pl.hp > 3) F('무차별 공격 피해가 큼');
    // 실제로 틀렸을 때 화나는지
    BP.rage = 0;
    const MI = mstat(g);
    B = { m: g, MI, hp: 10, g: 0, field: 1 };
    askField(MI, 'x', () => {});
    const bad = [...$('bc').children].find((x) => x.dataset.v !== String(RQ.last && RQ.last.a));
    if (bad) bad.click();
    await new Promise((r) => setTimeout(r, 400));
    if (typeof LEARN === 'object' && LEARN.wait) LEARN.wait.go();
    out.angry = BP.rage;
    if (!(BP.rage > 0)) F('틀려도 화나지 않음');
    // 4) 구슬 문제 고정: 조준 중에 다른 곳이 makeQ 를 불러도 화면·채점은 처음 문제 그대로
    clear(); BP.zones = []; BP.rage = 0; MATK.off = true;
    loadMap('r1', 2, 10, true); clear();
    const m3 = mons.find((q) => !q.dead && !MON[q.type].boss);
    pl.x = m3.x - 14; pl.y = m3.y; m3.hpNow = 9999;
    fieldStrike(m3, null);
    if (typeof ORB === 'object' && ORB.on) {
      const Q0 = ORB.Q, combo0 = FLD.streak;
      makeQ(1); makeQ(1);
      const right = [...$('bc').children].findIndex((x) => !x.hidden && x.dataset.v === String(Q0.a));
      const vis = [...$('bc').children].filter((x) => !x.hidden);
      orbThrow(vis.findIndex((x) => x.dataset.v === String(Q0.a)));
      for (let i = 0; i < 40 && ORB.fly; i++) { drawFx(); await new Promise((r) => setTimeout(r, 5)); }
      out.orbFix = ORB.res && ORB.res.ok;
      if (!(ORB.res && ORB.res.ok)) F('구슬 채점이 바뀐 문제로 됨');
    } else out.orbFix = '구슬 아님';
    MATK.off = false;
    return { fails, out };
  });
  console.log(JSON.stringify(r, null, 1), 'errs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
