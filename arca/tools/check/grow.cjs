// RPG 깊이 검사(프롬프트 R): 레벨업 선택·되돌리기·옛 저장, 스킬 강화, 몬스터 약점, 소모품, 무사 기록, 숨은 강적
// node arca/tools/check/grow.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  // 옛 저장(Lv 9, 성장 점 없음)으로 열기
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('arca-v2', JSON.stringify({ lv: 9, exp: 0, gold: 500, dust: 0, job: 'knight', trained: 1, met: { momo: 1 }, st: {} }));
  });
  await p.reload();
  await p.waitForFunction(() => typeof USE !== 'undefined' && typeof GROW !== 'undefined');
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fails = [], o = {};
    const F = (m) => fails.push(m);
    LESSON.auto = false; if (typeof TUT !== 'undefined') TUT.auto = false; SCUT.off = true;
    for (const k in MAPS) save.st['in_' + k] = 1;
    // R-1 옛 저장 → 지난 레벨만큼
    o.oldFree = save.st.grow.free;
    if (save.st.grow.free !== 8) F('옛 저장 성장 점 ' + save.st.grow.free + '(8이어야)');
    const a0 = rpgAtk(), h0 = maxHp();
    growPick('pow'); growPick('hp'); growPick('star');
    o.pow = rpgAtk() - a0; o.hp = maxHp() - h0;
    if (o.pow !== GROW.pow) F('힘 +' + o.pow);
    if (o.hp !== GROW.hp) F('체력 +' + o.hp);
    for (let i = 0; i < 5; i++) growPick('star');
    if (save.st.grow.star !== GROW.starMax) F('별빛 최대 ' + save.st.grow.star);
    // 별빛: 맞힐 때 게이지 덤 (4점 → 맞힐 때마다 +2 → 기본 +1 과 합쳐 가득)
    dl = null; busy = false; loadMap('r1', 8, 10, true); busy = false; dl = null; document.querySelectorAll('#dlg').forEach((e) => (e.hidden = true));
    FLD.g = 0;
    const MI = { ...mstat(mons[0]) };
    B = { m: mons[0], MI, hp: 99, g: 0, field: 1 };
    askField(MI, 't', () => {});
    const right = [...$('bc').children].find((x) => x.dataset.v === String(((typeof ORB === 'object' && ORB.Q) || RQ.last).a));
    right.click(); await sleep(600);
    o.starGauge = FLD.g;
    if (FLD.g < 3) F('별빛 덤이 안 붙음 ' + FLD.g);
    B = null; busy = false; if (typeof ORB === 'object') ORB.on = false; document.body.classList.remove('orbing');
    // 레벨업 → 점 +1
    const f0 = save.st.grow.free;
    gain(expNeed(save.lv), 0, 0);
    if (save.st.grow.free !== f0 + 1) F('레벨업 점 안 늘어남');
    // 되돌리기(마이룸에서만)
    loadMap('t1', 30, 16, true); busy = false; dl = null;
    const used = save.st.grow.pow + save.st.grow.hp + save.st.grow.star;
    growReset();
    if (save.st.grow.pow + save.st.grow.hp + save.st.grow.star !== used) F('마이룸 밖인데 되돌려짐');
    loadMap('home', 5, 5, true); busy = false; dl = null; save.gold = 9999;
    const free1 = save.st.grow.free;
    growReset();
    if (save.st.grow.free !== free1 + used) F('되돌리기 안 됨');
    // 상자 열기·고르기
    growOpen(); await sleep(50);
    o.box = !$('lesson').hidden && /성장 점/.test($('lesson').textContent);
    if (!o.box) F('성장 상자 안 뜸');
    document.querySelector('[data-grow="pow"]').click(); await sleep(30);
    document.querySelector('[data-grow="later"]') && document.querySelector('[data-grow="later"]').click();
    // R-2 스킬 강화
    save.st.skshard = 3;
    const sk0 = SKL.knight.findIndex((s, i) => SK_HIT.has(SKE.knight[i]));
    skUpgrade(sk0); skUpgrade(sk0);
    o.skup = save.st.skup[sk0] + ' 조각 남음 ' + save.st.skshard;
    if (save.st.skup[sk0] !== 2 || save.st.skshard !== 0) F('스킬 강화 ' + o.skup);
    const base = 100, m0 = mons[0] || { type: 'slime' };
    const mx = funDmg(base, true, { type: '__none' }, { t: SKE.knight[sk0], nm: SKL.knight[sk0][0] });
    o.skMul = mx / base;
    if (Math.abs(o.skMul - 1.4) > 0.06 && !(FLD.streak >= 3)) F('강화 2단계 배수 ' + o.skMul);
    // R-3 약점
    const kinds = Object.keys(MON).filter((k) => !MON[k].boss);
    if (kinds.some((k) => !MON[k].weak)) F('약점 없는 몬스터');
    const routes = Object.keys(MAPS).filter((id) => MAPS[id].kind === 'route');
    const badR = routes.filter((id) => { const ks = [...new Set(MAPS[id].mons.map((q) => q[0]).filter((t) => !MON[t].boss))]; return new Set(ks.map((k) => MON[k].weak)).size < Math.min(3, ks.length); });
    if (badR.length) F('같은 길목 약점 겹침 ' + badR);
    o.weakKinds = [...new Set(kinds.map((k) => MON[k].weak))].length;
    FLD.streak = 0;
    const byW = (w) => kinds.find((k) => MON[k].weak === w);
    const dm = (w, ok, sk, extra) => { const m = { type: byW(w), x: 0, y: 0, ...extra }; return funDmg(100, ok, m, sk) / 100; };
    AFF.t0 = Date.now(); LEARN.ansT = Date.now() + 1000;
    o.fast = dm('fast', true); if (o.fast !== 1.5) F('빨리 약점 ' + o.fast);
    AFF.t0 = Date.now(); LEARN.ansT = Date.now() + 1000;
    o.fastShield = dm('fast', true, null, { shieldT: Date.now() + 5000 }); if (o.fastShield !== 1) F('찍기 보호막 중 빨리 약점 ' + o.fastShield);
    AFF.t0 = Date.now() - 9000; LEARN.ansT = Date.now();
    o.slow = dm('fast', true); if (o.slow !== 1) F('느린데 빨리 약점 ' + o.slow);
    o.wrongNo = dm('first', false); if (o.wrongNo > 1) F('틀렸는데 약점 덤');
    o.first = dm('first', true); if (o.first !== 2) F('첫 타 약점 ' + o.first);
    o.skillN = dm('skill', true); o.skillS = dm('skill', true, { t: 'hit2', nm: '__x' });
    if (o.skillN !== 0.8 || o.skillS !== 1.5) F('스킬 약점 ' + o.skillN + '/' + o.skillS);
    AFF.lastWrong = true; o.calm = dm('calm', true); if (o.calm !== 1.5) F('만회 약점 ' + o.calm);
    FLD.streak = 3; o.combo = dm('combo', true); FLD.streak = 0;
    if (Math.abs(o.combo - 1.5 * 1.2) > 0.05 && o.combo !== 1.5) F('콤보 약점 ' + o.combo);
    // R-4 소모품
    save.st.use = { heal: 0, star: 0, hint: 0, ward: 0 };
    loadMap('t2', 20, 16, true); busy = false; dl = null;
    save.gold = 1000;
    openPanel('shop'); await sleep(30);
    for (let i = 0; i < 7; i++) { const bt = document.querySelector('[data-ubuy="heal"]'); if (bt) bt.click(); await sleep(5); }
    closePanel();
    o.heal = save.st.use.heal; if (save.st.use.heal !== USE_MAX) F('물건 사기·최대 ' + save.st.use.heal);
    pl.hp = 1; useItem('heal'); if (pl.hp !== 4) F('사과 회복 ' + pl.hp);
    save.st.use.star = 1; FLD.g = 0; useItem('star'); if (FLD.g !== 3) F('물약');
    save.st.use.ward = 1; useItem('ward');
    loadMap('r1', 8, 10, true); busy = false; dl = null; MATK.off = false;
    const mm = mons.find((q) => !q.dead && !MON[q.type].boss); mm.atk = { ph: 'go', t: 1 };
    pl.hp = 5; pl.inv = 0; matkHit(mm);
    if (pl.hp !== 5 || USEX.ward) F('수호 부적이 안 막음 hp ' + pl.hp);
    // 문제 푸는 중: 힌트만
    save.st.use.hint = 2; save.st.use.heal = 2;
    pl.x = mm.x - 14; pl.y = mm.y; mm.atk = null;
    B = { m: mm, MI: mstat(mm), hp: 99, g: 0, field: 1 }; askField(mstat(mm), 't', () => {}); await sleep(20);
    o.qState = 'orb ' + (typeof ORB === 'object' && ORB.on) + ' bt ' + !$('bt').hidden + ' busy ' + busy + ' bc ' + $('bc').children.length + ' kp ' + ($('kp') && !$('kp').hidden) + ' mm ' + mm.type + ' dead ' + mm.dead + ' sh ' + (mm.shieldT > Date.now()) + ' toast ' + (document.querySelector('.toast') || {}).textContent;
    const vis0 = [...$('bc').children].filter((x) => !x.hidden && !x.disabled).length;
    pl.hp = 1; useItem('heal'); if (pl.hp !== 1) F('문제 중에 사과가 써짐');
    useItem('hint');
    const vis1 = [...$('bc').children].filter((x) => !x.hidden && !x.disabled).length;
    o.hintNow = vis0 + '→' + vis1; if (vis1 !== vis0 - 1) F('문제 중 힌트 ' + o.hintNow);
    const right2 = [...$('bc').children].find((x) => !x.hidden && x.dataset.v === String(((typeof ORB === 'object' && ORB.Q) || RQ.last).a));
    if (!right2) F('힌트가 정답을 지움');
    right2 && right2.click(); await sleep(500);
    B = null; busy = false; if (typeof ORB === 'object') ORB.on = false; document.body.classList.remove('orbing');
    // R-5 무사 기록
    save.st.safe = 9; save.st.safeGot = {}; save.st.use.heal = 0;
    const m2 = mons.find((q) => !q.dead && !MON[q.type].boss);
    B = { m: m2, MI: mstat(m2), hp: 0, g: 0, field: 1 }; win();
    o.safe = save.st.safe; if (save.st.safe !== 10) F('무사 기록 ' + save.st.safe);
    if (save.st.use.heal < 1) F('무사 10 선물 없음');
    // 쓰러지면 0, 다친 몬스터는 다친 채로
    loadMap('r1', 8, 10, true); busy = false; dl = null;
    const m3 = mons.find((q) => !q.dead && !MON[q.type].boss); m3.hpNow = 1;
    lose(); await sleep(20);
    if (save.st.safe !== 0) F('쓰러져도 무사 기록이 남음');
    loadMap('r1', 8, 10, true); busy = false; dl = null;
    const m4 = mons.find((q) => q.type === m3.type && Math.round(q.hx) === Math.round(m3.hx) && Math.round(q.hy) === Math.round(m3.hy));
    o.hurtKeep = m4 && m4.hpNow; if (!(m4 && m4.hpNow === 1)) F('다친 몬스터가 회복됨');
    // R-6 숨은 강적
    const xb = Object.keys(XBOSS);
    xb.forEach((id) => { const p = MAP_PART[id]; save.done[PARTTOWN[p - 1]] = []; });
    xb.forEach((id) => { loadMap(id, 14, 20, true); busy = false; dl = null; if (mons.some((q) => q.type === XBOSS[id].k)) F(id + ' 부를 끝내기 전인데 강적이 있음'); });
    xb.forEach((id) => { const p = MAP_PART[id]; save.done[PARTTOWN[p - 1]] = [1, 1, 1, 1, 1, 1, 1, 1]; });
    o.xb = xb.map((id) => { loadMap(id, 14, 20, true); busy = false; dl = null; return id + ':' + mons.some((q) => q.type === XBOSS[id].k); }).join(' ');
    if (/false/.test(o.xb)) F('부를 끝냈는데 강적 없음 ' + o.xb);
    loadMap('d3', 14, 20, true); busy = false; dl = null;
    const xm = mons.find((q) => q.type === XBOSS.d3.k);
    const sh0 = save.st.skshard;
    B = { m: xm, MI: mstat(xm), hp: 0, g: 0, field: 1 }; win(); await sleep(20);
    o.xbReward = rpgHas(XBOSS.d3.item) + ' 조각 +' + (save.st.skshard - sh0);
    if (!rpgHas(XBOSS.d3.item) || save.st.skshard - sh0 !== 2) F('숨은 강적 보상 ' + o.xbReward);
    if (lootPool(20, 'knight', 'c').includes('c_xb1')) F('강적 장신구가 전리품에 섞임');
    return { fails, o };
  });
  console.log(JSON.stringify(r.o, null, 1), '\nfails', JSON.stringify(r.fails, null, 1), '\nerrs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
