// 장면 컷 검사: 마을 첫 방문·마을 완료 장면에 컷이 뜨고(그림이 비어 있지 않음), 장면이 끝나면 사라지는지 + 대화창과 겹치지 않는지
// (그림 픽셀을 읽어야 해서 파일 하나 빌드 dist/ 로 연다 → 먼저 python3 tools/build_single.py)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../../dist/arca-chronicles.html'));
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof SCUT !== 'undefined' && typeof HD !== 'undefined' && HD.ready, null, { timeout: 60000 });
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fails = [], out = {};
    save.job = 'knight'; save.trained = 1; save.met.momo = 1; LESSON.auto = false; if (typeof TUT !== 'undefined') TUT.auto = false;
    for (const [id, key] of [['t3', 'in_t3'], ['t8', 'done_7']]) {
      dl = null; busy = false; document.querySelectorAll('#dlg').forEach((e) => (e.hidden = true));
      delete save.st[key];
      loadMap(id, MAPS[id].spawn[0], MAPS[id].spawn[1], true); busy = false; dl = null;
      storyOnce(key, key.startsWith('in_') ? SC[id] : SC_DONE[7]);
      await sleep(50);
      const c = $('scutc'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
      let colors = new Set(); for (let i = 0; i < d.length; i += 4 * 97) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      const sc = $('scut').getBoundingClientRect(), dg = $('dlg').getBoundingClientRect();
      out[key] = { shown: !$('scut').hidden, colors: colors.size, title: $('scutb').textContent, overlap: Math.max(0, sc.bottom - dg.top) };
      if ($('scut').hidden) fails.push(key + ' 컷 안 뜸');
      if (colors.size < 20) fails.push(key + ' 컷 그림이 빔');
      if (sc.bottom - dg.top > 4) fails.push(key + ' 대화창과 겹침 ' + Math.round(sc.bottom - dg.top));
      for (let i = 0; i < 60 && dl; i++) { if (dl.ch) { const c2 = dl.ch[0]; endDlg(); c2[1](); } else nextDlg(); await sleep(5); }
      if (!$('scut').hidden) fails.push(key + ' 장면 끝나도 남음');
    }
    // 길목 첫 방문은 컷 없음
    delete save.st.in_r6; loadMap('r6', 2, 10, true); busy = false; dl = null; if (SC.r6) storyOnce('in_r6', SC.r6);
    if (!$('scut').hidden) fails.push('길목에서 컷이 뜸');
    return { fails, out };
  });
  console.log(JSON.stringify(r, null, 1), 'errs', errs);
  await b.close();
  process.exit(r.fails.length || errs.length ? 1 : 0);
})();
