// Pesk 안 체험판(베타) + 서버 저장 검사(2026-11-17·18): node arca/tools/check/pesk.cjs  (먼저 python3 tools/build_single.py)
// pesk.html 의 openArca~closeArca(서버 저장 포함)와 shared/pesk-arca-store.js 를 그대로 쓰고, Firestore 는 가짜(규칙 rev 흉내)로 바꾼다.
// ① 선생님이 안 켜면 안 열림 ② 주소·학년·체험판 화면 ③ 같은 기기 학생마다 저장 따로
// ④ 서버에 진행·학습 기록(요약) 올라감 ⑤ 다른 기기(빈 기기)에서 이어 하기 ⑥ 두 기기 동시 → 고르기 → 다른 기기 진행으로
// ⑦ 인터넷 끊김 → 기기 저장 계속·상태 표시 ⑧ 교사 대시보드 표: 실명·진도·정답률 ⑨ p 없이 열면 원래대로 ⑩ 규칙·학급 지우기에 아르카
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), DIST = path.resolve(__dirname, '../../dist');
(async () => {
  const fails = [], F = (m) => fails.push(m), o = {};
  const pesk = fs.readFileSync(path.join(ROOT, 'pesk.html'), 'utf8');
  const a = pesk.indexOf('async function openArca(){'), b = pesk.indexOf("window.addEventListener('pagehide', () => arcaPush(false));");
  if (a < 0 || b < 0) { console.log('pesk.html 에 openArca 없음'); process.exit(1); }
  const peskFn = pesk.slice(a, b) + "window.addEventListener('pagehide', () => arcaPush(false));\n";
  const teach = fs.readFileSync(path.join(ROOT, 'tesk_teacher_v2.html'), 'utf8');
  const ta = teach.indexOf('let _arcaRowsT = [];'), tb = teach.indexOf('function savePeskFeaturesT(input){');
  const teachFn = teach.slice(ta, tb);
  if (!/peskFeatures\.arcaBeta = true/.test(pesk) || !/id="tab-arca"/.test(pesk) || !/more-tab-arca/.test(pesk) || !/pesk-arca-store\.js/.test(pesk)) F('pesk.html: 설정·탭·저장 파일');
  if (!/data-feat-arca/.test(teach) || !/next\.arcaBeta = true/.test(teach) || ta < 0 || !/pesk-arca-store\.js/.test(teach)) F('교사 대시보드: 아르카 켜기·기록 보기');
  const bat = fs.readFileSync(path.join(ROOT, 'deploy-cloudflare.bat'), 'utf8');
  if (!/arca\.html/.test(bat) || !/arca-teacher\.html/.test(bat)) F('배포 스크립트: arca.html 복사 없음');
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  if (!/isArcaKey\(key\) && arcaUser\(roomId, studentId\) && arcaBodyOk\(\)\s*&& request\.resource\.data\.rev == resource\.data\.rev \+ 1/.test(rules)) F('firestore.rules: 아르카 rev 규칙');
  const erase = require(path.join(ROOT, 'shared/class-erase.js'));
  if (!erase.SUBS['arca-save'] || !erase.SUBS['arca-log']) F('학급 지우기에 아르카 없음');
  const store = fs.readFileSync(path.join(ROOT, 'shared/pesk-arca-store.js'), 'utf8');
  // 가짜 Firestore: 경로 → 문서. 규칙 흉내: create 는 rev 1, update 는 rev+1
  const DB = {};
  let offline = false;
  const fake = `<script>
    window._db = {};
    window._fsDoc = (db, ...p) => ({ path: p.join('/') });
    window._fsCollection = (db, ...p) => ({ path: p.join('/') });
    window._fsGetDoc = async (r) => { const d = await __dbGet(r.path); if (d === '__off') throw new Error('offline'); return { exists: () => !!d, data: () => d }; };
    window._fsSetDoc = async (r, v) => { const e = await __dbSet(r.path, JSON.stringify(v)); if (e) throw new Error(e); };
    window._fsGetDocs = async (c) => ({ docs: (await __dbList(c.path)).map(([id, d]) => ({ id, data: () => d })) });
    window._fsDeleteDoc = async (r) => { await __dbDel(r.path); };
  </script>`;
  const harness = '<!doctype html><meta charset="utf-8"><body>' + fake + '<script>' + store + '</script><script>let peskFeatures={};let roomId="ROOM1";let myStudentNum=3;let notes=[];' +
    'function writeFirstLocked(){return false}function showTab(t){notes.push("tab:"+t)}function showFeedbackNotice(m){notes.push(m)}function qzCfg(){return {grade:4}}\n' + peskFn + '</script></body>';
  const teacherPage = '<!doctype html><meta charset="utf-8"><body><div id="arca-records-t"></div>' + fake + '<script>' + store + '</script><script>const TESK_ROOM="ROOM1";' +
    'function load(k,d){return k==="tesk-students"?[{num:3,name:"김하늘"},{num:7,name:"이바다"}]:d}function escHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;")}' +
    'let toasts=[];function showToast(m){toasts.push(m)}function addActivity(){}\n' + teachFn + '</script></body>';
  const files = { '/harness.html': harness, '/teacher.html': teacherPage, '/arca.html': fs.readFileSync(path.join(DIST, 'arca-chronicles.html'), 'utf8') };
  const srv = http.createServer((req, res) => { const f = files[req.url.split('?')[0]]; res.writeHead(f ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(f || ''); });
  await new Promise((r) => srv.listen(0, r));
  const base = 'http://localhost:' + srv.address().port;
  const br = await chromium.launch();
  const errs = [];
  const device = async () => {
    const ctx = await br.newContext({ viewport: { width: 1024, height: 700 } });
    await ctx.exposeFunction('__dbGet', (p) => (offline ? '__off' : DB[p] || null));
    await ctx.exposeFunction('__dbSet', (p, v) => {
      if (offline) return 'offline';
      const d = JSON.parse(v), old = DB[p];
      if (typeof d.json !== 'string' || !Number.isInteger(d.rev)) return 'PERMISSION_DENIED';
      if (old ? d.rev !== old.rev + 1 : d.rev !== 1) return 'PERMISSION_DENIED';
      DB[p] = d;
      return '';
    });
    await ctx.exposeFunction('__dbList', (c) => Object.keys(DB).filter((k) => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).map((k) => [k.split('/').pop(), DB[k]]));
    await ctx.exposeFunction('__dbDel', (p) => { delete DB[p]; });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + '/harness.html');
    return p;
  };
  const fr = (p) => p.frames().find((f) => f.url().includes('arca.html'));
  const waitArca = async (p) => { for (let i = 0; i < 160; i++) { await p.waitForTimeout(250); const f = fr(p); if (f) { try { if (await f.evaluate(() => document.readyState === 'complete' && typeof save === 'object' && typeof ARCA_BETA === 'object' && typeof logAdd === 'function')) return true; } catch (e) {} } } return false; };
  const open = async (p) => { await p.evaluate(() => { peskFeatures.arcaBeta = true; openArca(); }); return waitArca(p); };
  const sync = (p) => p.evaluate(() => (document.getElementById('arca-sync') || {}).textContent || '');
  const S3 = 'classrooms/ROOM1/data/arca-save/students/3', L3 = 'classrooms/ROOM1/data/arca-log/students/3';

  // ── 기기 A ──
  const A = await device();
  if (await A.evaluate(() => { openArca(); return !!document.getElementById('arca-overlay'); })) F('꺼져 있는데 열림');
  if (!(await open(A))) F('켜도 안 열림');
  else {
    const src = await A.evaluate(() => document.querySelector('#arca-overlay iframe').getAttribute('src'));
    if (src !== 'arca.html?p=ROOM1-3&g=4') F('주소 ' + src);
    const In = await fr(A).evaluate(() => ({ g: studyCfg.grade, h1: getComputedStyle(document.querySelector('.wrap>h1')).display, sb: getComputedStyle(document.getElementById('studyb')).display }));
    if (In.g !== 4) F('학년 ' + In.g);
    if (In.h1 !== 'none' || In.sb !== 'none') F('제목·선생님 설정이 보임');
    o.syncA0 = await sync(A);
    // 놀기: 금화·맞힌 문제·학습 기록
    await fr(A).evaluate(() => { save.name = '별이'; save.gold = 777; save.solved = 5; save.lv = 3; for (let i = 0; i < 6; i++) logAdd({ u: '자연수의 혼합 계산', k: 'math', ok: i % 3 ? 1 : 0, t: 6, q: '계산해 보세요. 1 + 2 × ' + i, a: String(1 + 2 * i) }); store(); logSave(); });
    await A.evaluate(() => closeArca());
    await A.waitForTimeout(600);
    if (!DB[S3] || DB[S3].rev !== 1) F('서버에 진행이 안 올라감 ' + JSON.stringify(DB[S3] && DB[S3].rev));
    if (!DB[L3] || !DB[L3].sum || DB[L3].sum.n !== 6 || DB[L3].sum.nick !== '별이') F('서버 학습 기록 요약 ' + JSON.stringify(DB[L3] && DB[L3].sum));
    o.sumA = DB[L3] && { n: DB[L3].sum.n, ok: DB[L3].sum.ok, lv: DB[L3].sum.lv, units: Object.keys(DB[L3].sum.units) };
    // 같은 기기 학생 7 → 따로
    await A.evaluate(() => { myStudentNum = 7; }); await open(A);
    if ((await fr(A).evaluate(() => save.gold)) === 777) F('학생 7 이 학생 3 저장을 봄');
    await A.evaluate(() => { closeArca(); myStudentNum = 3; });
  }
  // ── 기기 B(빈 기기) → 서버에서 이어 하기 ──
  const B = await device();
  if (!(await open(B))) F('기기 B 안 열림');
  else {
    const g = await fr(B).evaluate(() => [save.gold, save.solved, LOG.recent.length]);
    o.deviceB = g;
    if (g[0] !== 777 || g[1] !== 5 || g[2] !== 6) F('다른 기기에서 이어 하기 실패 ' + g);
    // B 에서 더 하고 저장(rev 2)
    await fr(B).evaluate(() => { save.gold = 900; save.solved = 8; store(); });
    await B.evaluate(() => arcaPush(true)); await B.waitForTimeout(500);
    if (!DB[S3] || DB[S3].rev !== 2) F('B 저장 rev ' + (DB[S3] && DB[S3].rev));
  }
  // ── 두 기기 동시: A 가 옛 rev 로 열려 있다가 저장 ──
  await A.evaluate(() => { myStudentNum = 3; });
  // A 를 B 저장 전에 연 상태처럼: 열고 → B 가 한 번 더 저장 → A 저장 시도
  await open(A);
  o.aAfterB = await fr(A).evaluate(() => save.gold); // B 의 900 을 받아야 함(A 기기는 그대로였으므로 서버 쪽)
  if (o.aAfterB !== 900) F('A 가 다시 열 때 서버(B) 진행을 못 받음 ' + o.aAfterB);
  await fr(B).evaluate(() => { save.gold = 950; save.solved = 9; store(); });
  await B.evaluate(() => arcaPush(true)); await B.waitForTimeout(400);
  await fr(A).evaluate(() => { save.gold = 111; store(); });
  await A.evaluate(() => arcaPush(true)); await A.waitForTimeout(600);
  const note = await A.evaluate(() => { const n = document.getElementById('arca-note'); return n && n.style.display !== 'none' ? n.textContent : ''; });
  o.conflict = note.slice(0, 40);
  if (!/다른 기기에서/.test(note)) F('두 기기 동시 저장인데 묻지 않음');
  else {
    await A.evaluate(() => [...document.querySelectorAll('#arca-note button')].find((b) => /다른 기기 진행/.test(b.textContent)).click());
    await A.waitForTimeout(800); await waitArca(A);
    const g2 = await fr(A).evaluate(() => save.gold);
    if (g2 !== 950) F('다른 기기 진행으로 열기 후 금화 ' + g2);
  }
  // ── 인터넷 끊김 ──
  offline = true;
  await fr(A).evaluate(() => { save.gold = 960; store(); });
  await A.evaluate(() => arcaPush(true)); await A.waitForTimeout(500);
  o.offline = await sync(A);
  if (!/인터넷|서버 저장이 안/.test(o.offline)) F('끊김 표시 ' + o.offline);
  if ((await A.evaluate(() => JSON.parse(localStorage.getItem('arca-v2@ROOM1-3')).gold)) !== 960) F('끊겼을 때 기기 저장 안 됨');
  offline = false;
  await A.evaluate(() => arcaPush(false)); await A.waitForTimeout(500);
  if (!DB[S3] || JSON.parse(DB[S3].json).gold !== 960) F('다시 연결된 뒤 안 올라감');
  await A.evaluate(() => closeArca());
  // ── 교사 대시보드 표 ──
  const T = await (await br.newContext()).newPage();
  T.on('pageerror', (e) => errs.push(e.message));
  await T.exposeFunction('__dbGet', (p) => DB[p] || null);
  await T.exposeFunction('__dbSet', () => '');
  await T.exposeFunction('__dbList', (c) => Object.keys(DB).filter((k) => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).map((k) => [k.split('/').pop(), DB[k]]));
  await T.exposeFunction('__dbDel', (p) => { delete DB[p]; });
  await T.goto(base + '/teacher.html');
  await T.evaluate(() => arcaRecordsT()); await T.waitForTimeout(300);
  const tbl = await T.evaluate(() => document.getElementById('arca-records-t').innerText);
  o.teacher = tbl.replace(/\s+/g, ' ').slice(0, 160);
  if (!/김하늘/.test(tbl) || !/별이/.test(tbl) || !/이바다/.test(tbl) || !/아직 안 함/.test(tbl)) F('교사 표: 실명·별명·안 한 학생 ' + o.teacher);
  await T.evaluate(() => { window.confirm = () => true; return arcaEraseT(); }); await T.waitForTimeout(300);
  if (Object.keys(DB).some((k) => /arca-(save|log)/.test(k))) F('아르카 기록 지우기 안 됨');
  // ── p 없이 열면 원래대로 ──
  const q = await (await br.newContext()).newPage(); await q.goto(base + '/arca.html'); await q.waitForFunction(() => typeof save === 'object');
  const plain = await q.evaluate(() => ({ on: ARCA_BETA.on, h1: getComputedStyle(document.querySelector('.wrap>h1')).display }));
  if (plain.on || plain.h1 === 'none') F('p 없이 열었는데 체험판 모드');
  console.log(JSON.stringify(o, null, 1), '\nfails', fails, 'errs', errs);
  await br.close(); srv.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
