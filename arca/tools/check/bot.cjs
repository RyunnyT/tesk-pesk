// 진행 봇: 마이룸부터 12부 마을까지 '실제 출구'를 따라 간다.
// 막히면 그 자리에서 해야 할 일(직업·문지기·마을 되살리기·퀘스트)을 게임 함수로 처리하고 다시 출구를 시도한다.
// 맵마다 몬스터 1마리와 싸워 보고(fieldStrike → 답 자동), 퀘스트를 받아 끝내고, 지워진 곳을 다시 쓴다.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 760 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' @' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined' && HD.ready, null, { timeout: 30000 });
  const log = await p.evaluate(async () => {
    const L = [];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    document.querySelectorAll('.titlebox').forEach((e) => e.remove());
    const calm = () => { $('dlg').hidden = true; dl = null; busy = false; $('bt').hidden = true; $('panel').hidden = true; B = null; };
    calm();
    // 대화 자동 진행: 선택지가 있으면 첫째
    const flushDlg = async () => { for (let i = 0; i < 40 && dl; i++) { if (dl.ch && dl.i === dl.lines.length - 1) { const c = dl.ch[0]; endDlg(); c[1](); } else nextDlg(); await sleep(5); } };
    // 문제 상자 자동 답(정답)
    const answer = async () => { for (let i = 0; i < 30 && !$('bt').hidden; i++) { const bs = [...$('bc').children]; const ok = bs.find((x) => x.dataset.v === String((window.__lastQ || {}).a)); (ok || bs[0]).click(); await sleep(450); } };
    const mq = makeQ; makeQ = function (d) { const q = mq(d); window.__lastQ = q; return q; };
    // 직업
    loadMap('t1', 30, 16, true); calm();
    const n = { ...D.bran, id: 'bran', mj: 'knight', n: '브란 스승', lines: [] };
    chooseJob(n); await flushDlg(); calm();
    save.trained = 1; save.met.momo = 1;
    let fights = 0, quests = 0, fails = [];
    const route = CHAIN.slice();
    for (let i = 0; i < route.length; i++) {
      const id = route[i];
      loadMap(id, MAPS[id].spawn ? MAPS[id].spawn[0] : 2, MAPS[id].spawn ? MAPS[id].spawn[1] : 2, true); calm();
      // 몬스터 1마리와 싸워 보기
      const m = mons.find((q) => !q.dead && !MON[q.type].boss);
      if (m) { pl.x = m.x - 12; pl.y = m.y; for (let k = 0; k < 8 && !m.dead && m.hpNow !== null; k++) { fieldStrike(m, null); await answer(); await sleep(450); calm(); } fights++; }
      // 문지기
      const gate = mons.find((q) => q.type === 'gate' && !q.dead);
      if (gate || mons.some((q) => MON[q.type].boss)) { save.boss[id] = 1; }
      // 이 맵의 퀘스트 모두 끝내기(보상 함수 그대로)
      for (const q of QS.filter((q) => q.map === id)) {
        if (q.pet && !save.pet) continue;
        save.q[q.id] = { st: 'active', k: q.n };
        if (q.type === 'gather') save.inv[q.item] = (save.inv[q.item] || 0) + q.n;
        const np = npcs.find((x) => x.id === q.npc);
        if (!np) { fails.push('npc없음 ' + q.id + ' ' + q.npc + '@' + id); continue; }
        try { talk(np); await flushDlg(); calm(); } catch (e) { fails.push('talk ' + q.id + ' ' + e.message); }
        if (save.q[q.id].st !== 'done') { save.q[q.id].st = 'done'; gain(q.rw.exp, q.rw.gold, q.rw.dust); }
        quests++;
      }
      // 지문 읽음
      (M.spots || []).forEach((s) => (save.read[s.id] = 1));
      // 마을이면 되살리기
      if (M.kind === 'town' && M.patch) { save.done[id] = [1, 1, 1, 1, 1, 1, 1, 1]; PATCH.forEach((q) => (q.done = true)); const pi = PARTTOWN.indexOf(id); if (pi >= 0 && PARTS[pi] && PARTS[pi].boss) save.boss['core_' + id] = 1; }
      // 다음 맵으로 가는 출구가 열리는지
      const nx = route[i + 1];
      if (nx) {
        const e = M.exits.find((q) => q.to === nx);
        if (!e) fails.push('출구 없음 ' + id + '→' + nx);
        else if (e.need && !e.need()) fails.push('잠김 ' + id + '→' + nx + ' : ' + (e.msg ? (typeof e.msg === 'function' ? e.msg() : e.msg) : ''));
      }
      if (M.kind === 'town') L.push(id + ' Lv' + save.lv + ' 금화' + save.gold + ' 가방' + save.rpg.bag.length + ' 공격' + atk());
    }
    return { L, fights, quests, fails, fin: save.lv, wrong: (save.wrong || []).length };
  });
  console.log(JSON.stringify(log, null, 1));
  console.log('errs', JSON.stringify(errs.slice(0, 8), null, 1));
  await b.close();
})();
