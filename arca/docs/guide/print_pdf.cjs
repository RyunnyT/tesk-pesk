// 안내서 HTML → PDF (A4). 사용법: node arca/docs/guide/print_pdf.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [src, out] of [['교사안내서.html', '../아르카연대기_교사안내서.pdf'], ['학생_조작안내.html', '../아르카연대기_학생_조작안내.pdf']]) {
    await p.goto('file://' + path.join(__dirname, src));
    await p.waitForTimeout(400);
    await p.pdf({ path: path.join(__dirname, out), format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('made', out);
  }
  await b.close();
})();
