// "한 판만 더"(src/17-fun.js) 검사: 콤보 3·5연속, 스킬 효과 종류별, 도감·칭호, 다시 만난 문제 보상, 숫자 직접 넣기.
// 사용법: node arca/tools/check/fun.cjs  → 화면 사진은 이 폴더의 out/ 에
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
  const R = {};
  // 준비: 기사, Lv 12, 모든 스킬 배움
  await p.evaluate(() => {
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    busy = false;
    studyCfg.battle = 'box'; // 이 검사는 예전 문제 상자로(구슬 전투는 orb.cjs)
    save.job = 'knight'; save.lv = 12; save.trained = 1;
    save.rpg.eq.w = rpgAdd('w_knight_3', 0, true).u;
    window.partDone = () => true;
    loadMap('r1', 3, 10, true);
    $('dlg').hidden = true; dl = null; busy = false;
    window.__ans = async (ok) => {
      for (let i = 0; i < 20 && $('bt').hidden; i++) await new Promise((r) => setTimeout(r, 30));
      const q = RQ.last;
      if (!$('kp').hidden) {
        const v = ok ? String(q.a) : String(q.a) + '9';
        for (const ch of v) document.querySelector('#kp [data-k="' + ch + '"]') && document.querySelector('#kp [data-k="' + ch + '"]').click();
        document.querySelector('#kp [data-k="ok"]').click();
      } else {
        const bs = [...$('bc').children].filter((x) => !x.hidden);
        (ok ? bs.find((x) => x.dataset.v === String(q.a)) : bs.find((x) => x.dataset.v !== String(q.a))).click();
      }
      await new Promise((r) => setTimeout(r, 2500));
    };
    window.__fresh = (type) => {
      mons = mons.filter((m) => m.minion);
      const m = { map: M.id, type: type || 'wolf', x: pl.x + 14, y: pl.y, hx: pl.x + 14, hy: pl.y, tx: pl.x + 14, ty: pl.y, wait: 999, dir: -1, f: 0, mv: false, dead: 0, hit: 0 };
      mons.push(m);
      return m;
    };
  });
  // 1) 콤보: 맞히기 5번 → 5연속 필살기
  R.combo = await p.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const m = __fresh('wolf');
      m.hpNow = 99999;
      const h0 = m.hpNow;
      fieldStrike(m, null);
      await __ans(true);
      out.push(FLD.streak + ':' + (h0 - m.hpNow));
      busy = false; B = null;
    }
    return out.join(' ') + ' best=' + save.st.bestCombo;
  });
  await p.waitForTimeout(100);
  await p.evaluate(() => { FLD.streak = 4; const m = __fresh('wolf'); m.hpNow = 99999; fieldStrike(m, null); });
  await p.waitForTimeout(300);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'fun_combo.png') });
  await p.evaluate(async () => { await __ans(true); busy = false; B = null; });
  // 콤보 끊기
  R.break = await p.evaluate(async () => { FLD.streak = 6; const m = __fresh('wolf'); m.hpNow = 99999; fieldStrike(m, null); await __ans(false); busy = false; B = null; return FLD.streak + ' / ' + $('toast').textContent; });
  // 2) 스킬 효과 종류별
  R.skills = await p.evaluate(async () => {
    const out = {};
    const tryT = async (job, t) => {
      save.job = job;
      const k = SKE[job].indexOf(t);
      save.sk = [k];
      FLD.g = 3; FLD.streak = 0;
      mons = [];
      const a = __fresh('wolf'), b2 = __fresh('rat');
      mons = [a, b2];
      b2.x = a.x + 12; b2.y = a.y; b2.hx = b2.x;
      a.hpNow = 9999; b2.hpNow = 9999;
      const hp0 = pl.hp;
      fieldSkill(0);
      await new Promise((r) => setTimeout(r, 450));
      if (!$('bt').hidden) await __ans(true);
      busy = false; B = null;
      out[t] = [9999 - a.hpNow, 9999 - b2.hpNow, a.stun || 0, a.poison ? 1 : 0, FUN.shield, FUN.revive ? 1 : 0, FUN.hint, FLD.guard].join(',');
      FUN.shield = 0; FUN.revive = 0; FUN.hint = 0; FLD.guard = 0;
    };
    const all = { knight: ['pull', 'push', 'berserk', 'shield', 'revive', 'wall', 'petjoint'], warrior: ['aoe', 'pierce', 'multi', 'aoe2'], mage: ['stun', 'sleep', 'hint'], archer: ['poison', 'ult'] };
    for (const job in all) for (const t of all[job]) await tryT(job, t);
    save.job = 'knight';
    return out;
  });
  // 보호막·버티기가 피해를 막는지
  R.shield = await p.evaluate(() => { FUN.shield = 2; pl.hp = 3; const a = takeDmg(3); FUN.revive = M.id; const b2 = takeDmg(5); return a + ' ' + b2 + ' ' + FUN.shield; });
  // 3) 다시 만난 문제 보상
  R.recov = await p.evaluate(async () => {
    const q0 = makeQ(1); noteWrong(q0);
    const d0 = save.dust, r0 = save.st.recov || 0;
    const m = __fresh('ghost'); m.hpNow = 99999;
    fieldStrike(m, null);
    const re = !!(RQ.last && RQ.last.re);
    await __ans(true);
    busy = false; B = null;
    return { re, dust: save.dust - d0, recov: (save.st.recov || 0) - r0, wrongLeft: save.wrong.length };
  });
  // 4) 도감·칭호
  R.dex = await p.evaluate(async () => {
    for (const k of Object.keys(MON).slice(0, 17)) dexMon(k).s = 1;
    titleCheck();
    return { counts: dexCounts(), titles: save.titles };
  });
  await p.evaluate(() => openPanel('dex'));
  await p.waitForTimeout(400);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'fun_dex.png') });
  await p.evaluate(() => { tab = 'skill'; renderPanel(); });
  await p.waitForTimeout(200);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'fun_skill.png') });
  await p.evaluate(() => closePanel());
  // 5) 숫자 직접 넣기: 깊은 길목(단계 4 이상)
  R.short = await p.evaluate(async () => {
    const deep = Object.keys(MAPS).find((id) => MAPS[id].kind === 'route' && MAPS[id].tier >= 4);
    loadMap(deep, 3, 10, true); $('dlg').hidden = true; dl = null; busy = false;
    let seen = 0, okHit = 0, badHit = 0;
    for (let i = 0; i < 16 && seen < 2; i++) {
      const m = __fresh('wolf'); m.hpNow = 99999;
      fieldStrike(m, null);
      for (let j = 0; j < 20 && $('bt').hidden; j++) await new Promise((r) => setTimeout(r, 30));
      if (!$('kp').hidden) {
        seen++;
        if (seen === 1) { window.__shot = 1; await new Promise((r) => setTimeout(r, 400)); }
        const s0 = FLD.streak;
        await __ans(seen === 1);
        if (seen === 1 && FLD.streak === s0 + 1) okHit++;
        if (seen === 2 && FLD.streak === 0) badHit++;
      } else await __ans(true);
      busy = false; B = null;
    }
    return { map: deep, seen, okHit, badHit };
  });
  await p.evaluate(async () => { for (let i = 0; i < 20; i++) { const m = __fresh('wolf'); m.hpNow = 99999; fieldStrike(m, null); for (let j = 0; j < 20 && $('bt').hidden; j++) await new Promise((r) => setTimeout(r, 30)); if (!$('kp').hidden) return; await __ans(true); busy = false; B = null; } });
  await p.waitForTimeout(300);
  await p.locator('#stage').screenshot({ path: path.join(OUT, 'fun_keypad.png') });
  console.log(JSON.stringify(R, null, 1));
  console.log('errs', JSON.stringify(errs.slice(0, 6)));
  await b.close();
})();
