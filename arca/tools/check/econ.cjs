// 경제·성장 시뮬레이션: 부마다 몬스터를 한 바퀴(+퀘스트 필요분) 잡고, 퀘스트·지문·보물 상자 보상을 받고, 장비를 산다.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => typeof HD !== 'undefined', null, { timeout: 30000 });
  const out = await p.evaluate((job) => {
    const segs = []; let cur = null;
    CHAIN.forEach((id) => { const i = PARTTOWN.indexOf(id); if (i >= 0) { cur = { part: i + 1, maps: [] }; segs.push(cur); } cur && cur.maps.push(id); if (DEADS[id]) cur.maps.push(DEADS[id]); });
    // 1부 앞: 마이룸·1부 길목은 CHAIN 처음부터
    const S = { lv: 1, exp: 0, gold: 0, dust: 0, kills: 0 };
    const need = (lv) => (typeof expNeed === 'function' ? expNeed(lv) : lv * 30);
    const gainS = (e, g, d) => { S.cum = (S.cum || 0) + e; S.exp += e; S.gold += g; S.dust += d || 0; while (S.exp >= need(S.lv)) { S.exp -= need(S.lv); S.lv++; } };
    let wT = 0, oLv = 0;
    const rows = [];
    segs.forEach((sg) => {
      const lv0 = S.lv;
      let monHits = [], bossHits = [];
      // 이 부의 장비 상태로 공격력
      const atkNow = () => 10 + 6 * wT + 2 * (S.lv - 1);
      sg.maps.forEach((id) => {
        const m = MAPS[id]; if (!m) return;
        (m.mons || []).forEach(([t]) => {
          const mm = { map: id, type: t };
          const MI = mstat(mm);
          if (MI.boss) { bossHits.push(Math.ceil(MI.hp / atkNow())); gainS(MI.exp, MI.gold, MI.dust); return; }
          monHits.push(Math.ceil(MI.hp / atkNow()));
          // 한 번 + 퀘스트·가루 때문에 평균 0.6번 더
          gainS(MI.exp * 1.6, MI.gold * 1.6, MI.dust * 1.6);
          S.kills += 1.6;
        });
        (m.spots || []).forEach(() => gainS(5, 0, 3));
        if (m.chest) gainS(20, 60, 8);
      });
      QS.filter((q) => sg.maps.includes(q.map)).forEach((q) => gainS(q.rw.exp || 0, q.rw.gold || 0, q.rw.dust || 0));
      // 핵심 자리 보스
      const P0 = (typeof PARTS !== 'undefined' && PARTS[sg.part - 1]) || {};
      if (P0.boss) { const MI = mstat({ map: PARTTOWN[sg.part - 1], type: P0.boss }); bossHits.push(Math.ceil(MI.hp / atkNow())); gainS(MI.exp || 30, MI.gold || 40, 0); }
      // 장비 사기: 쓸 수 있는 가장 좋은 무기, 그다음 옷
      for (let t = 6; t > wT; t--) { const d = ITEMS['w_' + job + '_' + t]; if (d.lv <= S.lv && S.gold >= d.price) { S.gold -= d.price; wT = t; break; } }
      const os = Object.values(ITEMS).filter((d) => d.s === 'o' && d.lv <= S.lv && d.lv > oLv).sort((a, b) => b.lv - a.lv);
      if (os[0] && S.gold >= os[0].price) { S.gold -= os[0].price; oLv = os[0].lv; }
      const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
      rows.push({ cumExp: Math.round(S.cum || 0), part: sg.part, lv: lv0 + '→' + S.lv, gold: Math.round(S.gold), dust: Math.round(S.dust), weapon: wT + '(Lv' + ITEMS['w_' + job + '_' + wT].lv + ')', outfitLv: oLv, atk: atkNow(), hitsMon: avg(monHits), hitsMax: Math.max(0, ...monHits), boss: bossHits.join('/') });
    });
    return rows;
  }, 'knight');
  console.table(out);
  console.log(JSON.stringify(errs));
  await b.close();
})();
