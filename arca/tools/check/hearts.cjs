// 하트 균형 시뮬레이션: 정답률 60%·85% 학생이 길목을 서쪽에서 동쪽 끝까지 걸으며(앞을 막는 몬스터는 공격) 잃는 하트·쓰러짐
// node arca/tools/check/hearts.cjs   (기준: 정답률 60% 학생이 길목 하나에서 쓰러지지 않음)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof MATK !== 'undefined' && typeof RDEV !== 'undefined');
  if (process.env.OFF) await p.evaluate(() => (MATK.off = true));
  if (process.env.ONLY) await p.evaluate((o) => { window.__only = o.split(',').filter(Boolean); window.__hunt = (process_h => process_h)(o.split(',').filter(Boolean)); }, process.env.ONLY);
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    LESSON.auto = false;
    if (typeof TUT !== 'undefined') TUT.auto = false;
    save.job = 'knight'; save.trained = 1; save.met.momo = 1;
    const LV = [1, 3, 5, 7, 9, 11, 13, 15, 16, 18, 19, 20], WT = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6];
    const runOne = async (id, acc, hunt) => {
      const part = typeof mapPart === 'function' ? (loadMap(id, 2, 2, true), mapPart()) : 1;
      save.lv = LV[part - 1] || 10;
      save.rpg.eq.w = makeItem('w_knight_' + WT[part - 1], 0, () => 0.5, 9999);
      const m = MAPS[id], e0 = m.exits[0];
      loadMap(id, e0.x0 + 1, e0.y0, true);
      busy = false; dl = null; document.querySelectorAll('#dlg').forEach((e) => (e.hidden = true));
      pl.hp = maxHp();
      const hp0 = pl.hp;
      let lost = 0, deaths = 0, kills = 0, qs = 0, prev = pl.hp, stuck = 0, lastX = pl.x, strikeCd = 0, i = 0;
      const path = (a) => { const L = []; for (let y = 1; y < m.h - 1; y++) if (m.G[y][a] === ':' || m.G[y][a] === 'b') L.push(y); return L.length ? L[Math.floor(L.length / 2)] : null; };
      for (i = 0; i < 2400; i++) {
        // 문제 답하기
        if ((typeof ORB === 'object' && ORB.on && !ORB.done) || !$('bt').hidden) {
          if (typeof LEARN === 'object' && LEARN.wait) { LEARN.wait.go(); await sleep(20); continue; }
          const bs = [...$('bc').children].filter((x) => !x.disabled);
          if (bs.length) {
            const Qa = typeof orbQ === 'function' && ORB.on ? orbQ().a : (RQ.last || {}).a; const right = bs.find((x) => x.dataset.v === String(Qa));
            const pick = Math.random() < acc && right ? right : bs.find((x) => x !== right) || bs[0];
            qs++;
            pick.click();
            await sleep(30);
          } else await sleep(10);
          continue;
        }
        if (busy) { if (dl) { if (dl.ch) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); } else { document.querySelectorAll('.box:not([hidden])').forEach((e) => { const bt = e.querySelector('button.lsmain, button'); if (bt) bt.click(); }); busy = false; } await sleep(5); continue; }
        if (M.id !== id) { deaths++; loadMap(id, Math.max(1, Math.floor(lastX / T)), path(Math.floor(lastX / T)) || e0.y0, true); busy = false; pl.hp = maxHp(); prev = pl.hp; continue; }
        // 사냥: 가장 가까운 몬스터에게 가기
        if (hunt) {
          const alive = mons.filter((q) => !q.dead && !MON[q.type].boss && q.type !== 'gate');
          if (!alive.length) break;
          const t = alive.sort((a, c) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(c.x - pl.x, c.y - pl.y))[0];
          const dt = Math.hypot(t.x - pl.x, t.y - pl.y);
          if (dt < 22) { if (--strikeCd <= 0) { fieldStrike(t, null); strikeCd = 12; } update(); if (pl.hp < prev) lost += prev - pl.hp; prev = pl.hp; if (pl.hp <= 0 && M.id === id) { deaths++; pl.hp = maxHp(); prev = pl.hp; } await sleep(0); continue; }
          const bx = pl.x, by = pl.y;
          tryMove(pl, ((t.x - pl.x) / dt) * 2.4, ((t.y - pl.y) / dt) * 2.4, false);
          if (bx === pl.x && by === pl.y) { if (++stuck > 25) { pl.x = t.x - 14; pl.y = t.y; stuck = 0; } } else stuck = 0;
          update();
          if (pl.hp < prev) lost += prev - pl.hp;
          prev = pl.hp;
          if (pl.hp <= 0 && M.id === id) { deaths++; pl.hp = maxHp(); prev = pl.hp; }
          if (i % 40 === 0) await sleep(0);
          continue;
        }
        // 앞을 막는 몬스터 공격
        const near = mons.filter((q) => !q.dead && Math.hypot(q.x - pl.x, q.y - pl.y) < 30).sort((a, c) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(c.x - pl.x, c.y - pl.y))[0];
        if (near && --strikeCd <= 0) { const was = near.dead; fieldStrike(near, null); strikeCd = 12; await sleep(5); continue; }
        // 동쪽으로 길 따라 걷기
        const tx = Math.min(m.w - 1, Math.floor(pl.x / T) + 2), ty = path(tx);
        const gx = tx * T + 8, gy = (ty == null ? pl.y / T : ty) * T + 12;
        const dx = gx - pl.x, dy = gy - pl.y, d = Math.hypot(dx, dy) || 1;
        tryMove(pl, (dx / d) * 2.4, (dy / d) * 2.4, false);
        if (Math.abs(pl.x - lastX) < 0.5) { if (++stuck > 25) { pl.x += T * 2; stuck = 0; } } else stuck = 0;
        lastX = pl.x;
        update();
        if (pl.hp < prev) lost += prev - pl.hp;
        prev = pl.hp;
        if (pl.hp <= 0 && M.id === id) { deaths++; pl.hp = maxHp(); prev = pl.hp; }
        if (pl.x > (m.w - 3) * T) break;
        if (i % 40 === 0) await sleep(0);
      }
      kills = mons.filter((q) => q.dead).length;
      return { id, part, acc, hunt: hunt ? '사냥' : '지나가기', left: mons.filter((q) => !q.dead && !MON[q.type].boss && q.type !== 'gate').length, maxHp: hp0, lost, deaths, kills, qs, sec: Math.round(i / 20), done: pl.x > (m.w - 3) * T };
    };
    const rows = [];
    for (const id of (window.__only || ['r1', 'r4', 'r7', 'r10', 'r13', 'r16', 'r19', 'r22', 'r25', 'r27']))
      for (const acc of [0.6, 0.85]) rows.push(await runOne(id, acc));
    for (const id of (window.__hunt || ['r1', 'r7', 'r13', 'r19', 'r25'])) rows.push(await runOne(id, 0.6, true));
    return rows;
  });
  console.table(r.map((x) => ({ 길목: x.id, 부: x.part, 방식: x.hunt, 남은몬스터: x.left, 정답률: x.acc, 최대하트: x.maxHp, 잃은하트: x.lost, 쓰러짐: x.deaths, 처치: x.kills, 문제: x.qs, 초: x.sec, 끝까지: x.done })));
  const bad = r.filter((x) => x.acc === 0.6 && x.deaths > 0 && x.hunt === '지나가기');
  console.log('사냥(2분 동안 피하지 않고 계속 싸움, 참고)', r.filter((x) => x.hunt === '사냥').map((x) => x.id + ' 하트 ' + x.lost + '/' + x.maxHp + ' 쓰러짐 ' + x.deaths).join(' · '));
  console.log('60% 학생이 쓰러진 길목', bad.map((x) => x.id), 'errs', errs);
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
