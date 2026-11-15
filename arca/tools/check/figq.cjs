// 그림 있는 문제(src/27-figq.js) 검사: 생성기마다 300문제 — 정답이 보기에 꼭 하나, 보기 겹침 없음, 서로 다른 문제 수.
// 단원별 40문제 중 서로 다른 문제 수(고치기 전 표와 비교), 조사 바로잡기, 다시 풀기는 같은 생성기, 지문 근거 문장, 화면 사진.
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
  const R = {};
  R.gens = await p.evaluate(() => {
    const out = {};
    for (const g of [fqTriAngle, fqQuadAngle, fqProtractor, fqGrid, fqAreaTri, fqPolygon, fqSymmetry, fqCongruent, fqCuboid, fqBars, fqShade, fqCircle, fqScale]) {
      let bad = 0; const uniq = new Set();
      for (let i = 0; i < 300; i++) { const q = g(); uniq.add(q.q + '|' + q.a); if (q.ch.filter((v) => v === q.a).length !== 1 || new Set(q.ch).size !== q.ch.length || !q.fig || !q.steps || q.ch.some((v) => /NaN|undefined|^-/.test(v))) bad++; }
      out[g.name] = '잘못 ' + bad + ' · 서로 다른 문제 ' + uniq.size;
    }
    return out;
  });
  // 단원별 서로 다른 문제 수(40문제): 문제 은행만 vs 그림 문제 포함
  R.units = await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    const out = {};
    const part2 = { '3-1 평면도형': [3, 2], '4-2 다각형': [4, 12], '4-2 삼각형': [4, 8], '5-2 직육면체': [5, 11], '5-2 합동과 대칭': [5, 9], '5-1 넓이': [5, 6], '4-1 각도': [4, 2], '3-2 원': [3, 9], '5-2 평균': [5, 12], '3-2 자료': [3, 12] };
    for (const [nm, [g, part]] of Object.entries(part2)) {
      studyCfg.grade = g;
      const id = Object.keys(MAPS).find((k) => MAP_PART[k] === part) || 'r1';
      window.__M0 = window.__M0 || M; M = MAPS[id];
      const run = (off) => { FQ.off = off; save.wrong = []; save.st.adapt = {}; studyCfg.adapt = 'route'; const s = new Set(); let fig = 0; for (let i = 0; i < 40; i++) { const q = makeQ(1 + (i % 3)); s.add(q.q); if (q.fig) fig++; } return [s.size, fig]; };
      const a = run(true), c = run(false);
      out[nm] = '은행만 ' + a[0] + ' → 그림 포함 ' + c[0] + ' (그림 문제 ' + c[1] + '/40) · ' + unitName(part);
    }
    studyCfg.grade = 5; studyCfg.adapt = 'auto'; FQ.off = false; M = window.__M0;
    return out;
  });
  R.josa = await p.evaluate(() => ['몫은 7예요.', '몫은 4예요.', '10와 15의 최대공약수', '12와 18', '공통분모는 8예요.', '마름모은 네 변의 길이가 모두 같다.', '공통분모는 56예요.'].map((t) => t + ' → ' + fixJosa(t)));
  // 전투 화면에서 그림 문제 + 틀린 뒤 다시 풀기(같은 생성기)
  await p.evaluate(() => { save.job = 'knight'; save.lv = 9; save.trained = 1; save.st.orbTip = 1; save.rpg.eq.w = rpgAdd('w_knight_2', 0, true).u; const id = Object.keys(MAPS).find((k) => MAPS[k].kind === 'route' && MAP_PART[k] === 11); loadMap(id, 6, 11, true); });
  await p.waitForTimeout(900);
  R.battle = await p.evaluate(async () => {
    for (let i = 0; i < 40 && dl; i++) nextDlg(); $('dlg').hidden = true; dl = null; busy = false;
    const W8 = (f, n = 200) => new Promise(async (r) => { for (let i = 0; i < n && !f(); i++) await new Promise((q) => setTimeout(q, 25)); r(f()); });
    window.W8 = W8; FQ.rate = 1; mons = [];
    const m = { map: M.id, type: 'wolf', x: pl.x + 30, y: pl.y, hx: pl.x, hy: pl.y, tx: pl.x, ty: pl.y, wait: 9999, dir: -1, f: 0, dead: 0, hit: 0, hpNow: 99999 }; mons.push(m); BP.cool = 99999;
    fieldStrike(m, null); await W8(() => ORB.on);
    return { unit: unitName(mapPart()), fig: !!document.querySelector('#qstrip .qfigwrap svg'), q: RQ.last.q, name: RQ.last.regen.name };
  });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'figq_orb.png') });
  R.retry = await p.evaluate(async () => {
    const a = RQ.last.a, g = RQ.last.regen.name;
    orbThrow(orbBtns().findIndex((x) => x.dataset.v !== a)); await W8(() => LEARN.wait);
    const sol = $('qsr').textContent.slice(0, 80);
    await new Promise((r) => setTimeout(r, 200));
    window.__shot = 1;
    return { sol, g };
  });
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'figq_wrong.png') });
  R.retry2 = await p.evaluate(async () => { LEARN.wait.go(); await W8(() => ORB.on && !ORB.done); const r = { sameGen: RQ.last.regen && RQ.last.regen.name, fig: !!document.querySelector('#qstrip .qfigwrap svg'), title: $('qst').textContent }; orbThrow(orbBtns().findIndex((x) => x.dataset.v === RQ.last.a)); await W8(() => !ORB.on && !busy && !B); return r; });
  // 지문 근거
  R.evidence = await p.evaluate(() => {
    const sp = Object.values(MAPS).flatMap((m) => m.spots || []).filter((s) => s.q && s.p);
    let found = 0, n = 0; const sample = [];
    sp.forEach((s) => s.q.forEach((_, i) => { n++; const e = passageEvidence(s, i); if (e) { found++; if (sample.length < 2) sample.push(s.q[i][0].slice(0, 30) + ' → ' + e.slice(0, 50)); } }));
    return { found: found + '/' + n, sample };
  });
  await p.evaluate(() => { const s = Object.values(MAPS).flatMap((m) => m.spots || []).find((x) => x.q && x.p && passageEvidence(x, 0)); openBook(s); bk.stage = 'q'; renderBook(); const right = s.q[0][2]; [...document.querySelectorAll('#book button[data-ans]')].find((x) => +x.dataset.ans !== right).click(); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'figq_book.png') });
  // 그림 12종 모아 찍기
  await p.evaluate(() => { closeBook && closeBook(); const d = document.createElement('div'); d.id = 'gal'; d.style.cssText = 'position:fixed;inset:0;background:#1e1b3f;z-index:99;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px;overflow:auto'; d.innerHTML = [fqTriAngle, fqQuadAngle, fqProtractor, fqGrid, fqAreaTri, fqPolygon, fqSymmetry, fqCongruent, fqCuboid, fqBars, fqShade, fqCircle, fqScale].map((g) => { const q = g(); return '<div style="color:#fff;font-size:11px">' + q.fig + '<div>' + q.q + '</div><div style="color:#7ee07a">답 ' + q.a + ' · ' + q.steps + '</div></div>'; }).join(''); document.body.appendChild(d); });
  await p.setViewportSize({ width: 1200, height: 900 });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'figq_gallery.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
