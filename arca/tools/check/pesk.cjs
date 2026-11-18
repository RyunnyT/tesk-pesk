// Pesk 안 체험판(베타) 검사(2026-11-17): node arca/tools/check/pesk.cjs  (먼저 python3 tools/build_single.py)
// pesk.html 의 openArca·closeArca 를 그대로 떼어 와 작은 서버에서 dist 의 arca.html 을 연다.
// ① 선생님이 안 켜면 안 열림 ② 켜면 arca.html?p=학급-번호&g=학년 ③ 학년이 들어가고 제목·선생님 설정이 숨음
// ④ 같은 기기에서 학생마다 저장이 따로 ⑤ 닫으면 원래 화면 ⑥ p 없이 열면 원래대로 ⑦ 교사 대시보드·배포 스크립트에 연결이 있음
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), DIST = path.resolve(__dirname, '../../dist');
(async () => {
  const fails = [], F = (m) => fails.push(m);
  const pesk = fs.readFileSync(path.join(ROOT, 'pesk.html'), 'utf8');
  const a = pesk.indexOf('function openArca(){'), b = pesk.indexOf('\n}\n', pesk.indexOf('function closeArca(){')) + 3;
  if (a < 0) { console.log('pesk.html 에 openArca 없음'); process.exit(1); }
  const harness = '<!doctype html><meta charset="utf-8"><body><script>let peskFeatures={};const roomId="ROOM1";let myStudentNum=3;let notes=[];' +
    'function writeFirstLocked(){return false}function showTab(t){notes.push("tab:"+t)}function showFeedbackNotice(m){notes.push(m)}function qzCfg(){return {grade:4}}\n' + pesk.slice(a, b) + '</script></body>';
  if (!/peskFeatures\.arcaBeta = true/.test(pesk) || !/id="tab-arca"/.test(pesk) || !/more-tab-arca/.test(pesk)) F('pesk.html: 설정 읽기·탭 단추 없음');
  const teach = fs.readFileSync(path.join(ROOT, 'tesk_teacher_v2.html'), 'utf8');
  if (!/data-feat-arca/.test(teach) || !/next\.arcaBeta = true/.test(teach)) F('교사 대시보드: 아르카 켜기 없음');
  const bat = fs.readFileSync(path.join(ROOT, 'deploy-cloudflare.bat'), 'utf8');
  if (!/arca\.html/.test(bat) || !/arca-teacher\.html/.test(bat)) F('배포 스크립트: arca.html 복사 없음');
  const files = { '/harness.html': harness, '/arca.html': fs.readFileSync(path.join(DIST, 'arca-chronicles.html'), 'utf8') };
  const srv = http.createServer((req, res) => { const f = files[req.url.split('?')[0]]; res.writeHead(f ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(f || ''); });
  await new Promise((r) => srv.listen(0, r));
  const base = 'http://localhost:' + srv.address().port;
  const br = await chromium.launch(), p = await br.newPage({ viewport: { width: 1024, height: 700 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + '/harness.html');
  const fr = () => p.frames().find((f) => f.url().includes('arca.html'));
  const waitArca = async () => { for (let i = 0; i < 160; i++) { await p.waitForTimeout(250); const f = fr(); if (f) { try { if (await f.evaluate(() => typeof save === 'object' && typeof ARCA_BETA === 'object')) return true; } catch (e) {} } } return false; };
  const off = await p.evaluate(() => { openArca(); return !!document.getElementById('arca-overlay'); });
  if (off) F('꺼져 있는데 열림');
  await p.evaluate(() => { peskFeatures.arcaBeta = true; openArca(); });
  if (!(await waitArca())) F('켜도 안 열림');
  else {
    const src = await p.evaluate(() => document.querySelector('#arca-overlay iframe').getAttribute('src'));
    if (src !== 'arca.html?p=ROOM1-3&g=4') F('주소 ' + src);
    const In = await fr().evaluate(() => { save.gold = 777; store(); return { g: studyCfg.grade, h1: getComputedStyle(document.querySelector('.wrap>h1')).display, sb: getComputedStyle(document.getElementById('studyb')).display }; });
    if (In.g !== 4) F('학년 ' + In.g);
    if (In.h1 !== 'none' || In.sb !== 'none') F('제목·선생님 설정이 보임');
    await p.evaluate(() => closeArca());
    if (!(await p.evaluate(() => !document.getElementById('arca-overlay') && document.body.style.overflow === ''))) F('닫기');
    await p.evaluate(() => { myStudentNum = 7; openArca(); }); await waitArca();
    if ((await fr().evaluate(() => save.gold)) === 777) F('학생 7 이 학생 3 저장을 봄');
    await p.evaluate(() => closeArca());
    await p.evaluate(() => { myStudentNum = 3; openArca(); }); await waitArca();
    if ((await fr().evaluate(() => save.gold)) !== 777) F('학생 3 저장이 사라짐');
    const keys = await p.evaluate(() => Object.keys(localStorage));
    if (!keys.includes('arca-v2@ROOM1-3') || !keys.includes('arca-v2@ROOM1-7') || keys.includes('arca-v2')) F('저장 이름 ' + keys);
    await p.evaluate(() => closeArca());
  }
  const q = await br.newPage(); await q.goto(base + '/arca.html'); await q.waitForFunction(() => typeof save === 'object');
  const plain = await q.evaluate(() => ({ on: ARCA_BETA.on, h1: getComputedStyle(document.querySelector('.wrap>h1')).display }));
  if (plain.on || plain.h1 === 'none') F('p 없이 열었는데 체험판 모드');
  console.log('fails', fails, 'errs', errs);
  await br.close(); srv.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
