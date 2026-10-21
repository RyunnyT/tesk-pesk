/* 읽기 한도·덮어쓰기 보호: 실제 HTML/모듈 코드를 가짜 Firestore로 실행한다. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Writings = require('../shared/pesk-writing-store.js');
const read = f=>fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const slice = (src, from, toFn)=>{ const a = src.indexOf(from); assert.ok(a >= 0, from); return src.slice(a, toFn(src, a)); };
const endOfFn = name=>(src)=>src.indexOf('\n}', src.indexOf(name)) + 2;

/* 문서·쿼리 실시간 구독을 흉내 내는 최소 Firestore. 쿼리는 where 조건으로 걸러 낸다. */
function fakeFs(){
  const docs = new Map(), listeners = [];
  let reads = 0;
  const snapDoc = p=>({exists:()=>docs.has(p), data:()=>JSON.parse(JSON.stringify(docs.get(p))), id:p.split('/').pop()});
  const matches = (q, d)=>q.wheres.every(([f, op, v])=>{
    const val = f.split('.').reduce((o, k)=>o == null ? undefined : o[k], d);
    return op === '==' ? val === v : op === '>=' ? String(val ?? '') >= v && val != null : false;
  });
  const snapQuery = q=>{
    const out = [...docs].filter(([p, d])=>p.startsWith(q.coll + '/') && p.split('/').length === q.coll.split('/').length + 1 && matches(q, d))
      .map(([p])=>snapDoc(p));
    reads += out.length || 1;
    return {docs:out};
  };
  const emit = ()=>listeners.forEach(l=>l.fire());
  const api = {
    _db:{},
    _fsDoc:(base, ...parts)=>typeof base === 'object' && base.coll ? base.coll + '/' + (parts[0] || ('auto' + Math.random())) : parts.join('/'),
    _fsCollection:(db, ...parts)=>({coll:parts.join('/'), wheres:[]}),
    _fsQuery:(c, ...w)=>({coll:c.coll, wheres:[...c.wheres, ...w]}),
    _fsWhere:(f, op, v)=>[f, op, v],
    _fsGetDoc:async p=>{ reads++; return snapDoc(p); },
    _fsGetDocs:async q=>snapQuery(q),
    _fsOnSnapshot:(target, next)=>{
      const l = {fire:()=>next(typeof target === 'string' ? (reads++, snapDoc(target)) : snapQuery(target))};
      listeners.push(l); l.fire();
      return ()=>{ const i = listeners.indexOf(l); if(i >= 0) listeners.splice(i, 1); };
    },
    set(p, v){ docs.set(p, v); emit(); },
    get reads(){ return reads; }, resetReads(){ reads = 0; }, listeners
  };
  return api;
}

test('교사 글: 이번 학기 글만 받고, 지운 글(옛 배열)은 되살아나지 않는다', ()=>{
  const fs1 = fakeFs();
  const base = 'classrooms/R/data/pesk-writings/items/';
  fs1.set('classrooms/R/data/pesk-writings', {value:[{id:'old1', submittedAt:'2026-05-01T00:00:00Z'}, {id:'leg2', submittedAt:'2026-09-10T00:00:00Z'}, {id:'leg3', submittedAt:'2026-09-11T00:00:00Z'}]});
  for(let i = 0; i < 30; i++) fs1.set(base + 'm' + i, {submittedAt:'2026-0' + (4 + (i % 4)) + '-15T00:00:00Z', title:'예전'});
  fs1.set(base + 'n1', {submittedAt:'2026-09-20T00:00:00Z', title:'이번 학기'});
  fs1.set(base + 'leg3', {id:'leg3', deleted:true});
  const st = Writings.create(fs1, 'R');
  fs1.resetReads();
  let rows = null;
  const stop = st.subscribeSince('2026-09-01T00:00:00.000Z', r=>{ rows = r; });
  assert.deepStrictEqual(rows.map(w=>w.id).sort(), ['leg2', 'n1']);
  assert.ok(fs1.reads <= 4, '예전 글 30편은 읽지 않는다: ' + fs1.reads);
  fs1.set(base + 'n2', {submittedAt:'2026-10-01T00:00:00Z'});
  assert.ok(rows.some(w=>w.id === 'n2'), '새 글은 실시간으로 들어온다');
  stop();
  let all = null;
  st.subscribe(r=>{ all = r; });
  assert.strictEqual(all.length, 1 + 1 + 30 + 2, '전체로 바꾸면 예전 글까지');
});

/* ── 교사 앱 덮어쓰기 보호 (tesk_teacher_v2.html의 writeDataDoc) ── */
function loadGuard(){
  const html = read('tesk_teacher_v2.html');
  const code = slice(html, 'const GUARDED_KEYS', endOfFn('async function writeDataDoc'));
  const store = new Map();
  let beforeCommit = null;
  const win = {
    _db:{},
    _fsDoc:(db, ...parts)=>parts.join('/'),
    _fsSetDoc:async (p, v)=>{ store.set(p, JSON.parse(JSON.stringify(v))); },
    _fsRunTxn:async (db, fn)=>{
      const writes = new Map();
      await fn({get:async p=>({exists:()=>store.has(p), data:()=>JSON.parse(JSON.stringify(store.get(p)))}), set:(p, v)=>writes.set(p, v)});
      if(beforeCommit){ const f = beforeCommit; beforeCommit = null; f(); }
      writes.forEach((v, p)=>store.set(p, JSON.parse(JSON.stringify(v))));
    }
  };
  const f = new Function('window', 'TESK_ROOM', code + '\nreturn {writeDataDoc, noteServerVersion, SaveConflictError, _serverAt};');
  return {...f(win, 'R'), store, otherDevice:(k, v)=>store.set('classrooms/R/data/' + k, {value:v, updatedAt:new Date(Date.now() + 1000).toISOString()})};
}

test('다른 기기에서 먼저 바뀐 교사 자료는 덮어쓰지 않는다', async()=>{
  const g = loadGuard();
  const P = 'classrooms/R/data/tesk-counsels';
  g.store.set(P, {value:[{id:'a'}], updatedAt:'T1'});
  g.noteServerVersion('tesk-counsels', 'T1');
  await g.writeDataDoc('tesk-counsels', [{id:'a'}, {id:'b'}]);              // 정상 저장
  assert.deepStrictEqual(g.store.get(P).value.map(r=>r.id), ['a', 'b']);
  g.otherDevice('tesk-counsels', [{id:'a'}, {id:'b'}, {id:'c-from-laptop'}]);  // 다른 기기가 저장
  await assert.rejects(g.writeDataDoc('tesk-counsels', [{id:'a'}, {id:'b'}, {id:'d-stale'}]), e=>e.conflict === true);
  assert.ok(g.store.get(P).value.some(r=>r.id === 'c-from-laptop'), '다른 기기 내용 보존');
});

test('내용이 같으면 충돌로 보지 않고, 연달아 저장해도 서로 막지 않는다', async()=>{
  const g = loadGuard();
  const P = 'classrooms/R/data/tesk-records';
  g.store.set(P, {value:{1:'x'}, updatedAt:'T1'});
  g.noteServerVersion('tesk-records', 'T1');
  g.otherDevice('tesk-records', {1:'y'});
  await g.writeDataDoc('tesk-records', {1:'y'});            // 같은 내용 → 통과
  await Promise.all([g.writeDataDoc('tesk-records', {1:'y', 2:'a'}), g.writeDataDoc('tesk-records', {1:'y', 2:'a', 3:'b'})]);
  assert.deepStrictEqual(g.store.get(P).value, {1:'y', 2:'a', 3:'b'});
});

test('보호 대상이 아니거나 처음 쓰는 자료는 예전처럼 바로 저장', async()=>{
  const g = loadGuard();
  g.otherDevice('pesk-deposits', {1:[]});
  await g.writeDataDoc('pesk-deposits', {1:[{amt:5}]});
  assert.deepStrictEqual(g.store.get('classrooms/R/data/pesk-deposits').value, {1:[{amt:5}]});
  await g.writeDataDoc('tesk-seats', {layout:1});            // 서버 시각을 모름 → 그냥 저장하고 기억
  assert.ok('tesk-seats' in g._serverAt);
});

/* ── 학생 앱: 그 화면을 볼 때만 실시간 (pesk.html의 liveWhileOpen) ── */
test('학생 앱: 화면을 열면 실시간, 닫으면 끊고 몇 분마다만 읽는다', async()=>{
  const html = read('pesk.html');
  const code = slice(html, 'const _liveDocSyncs = [];', (src, a)=>src.indexOf('function syncLiveDocs()', a));
  const ffs = fakeFs();
  ffs.set('classrooms/R/data/pesk-avatars', {value:{1:{hat:'a'}}});
  const panels = {myroom:{style:{display:'none'}}};
  const doc = {hidden:false, getElementById:id=>panels[id.replace('panel-', '')] || null, addEventListener(){}, removeEventListener(){}};
  const timers = [];
  const f = new Function('window', 'roomId', 'document', 'setInterval', 'clearInterval', code + '\nreturn {liveWhileOpen, panelOpen, _liveDocSyncs};');
  const L = f(ffs, 'R', doc, fn=>{ timers.push(fn); return timers.length; }, ()=>{});
  const seen = [];
  L.liveWhileOpen('pesk-avatars', snap=>seen.push(snap.data().value), ()=>L.panelOpen('myroom'), 180000);
  await new Promise(r=>setImmediate(r));
  assert.strictEqual(seen.length, 1, '처음 한 번은 읽는다');
  assert.strictEqual(ffs.listeners.length, 0, '닫힌 화면은 실시간 연결 없음');
  ffs.set('classrooms/R/data/pesk-avatars', {value:{1:{hat:'b'}}});
  assert.strictEqual(seen.length, 1, '다른 학생이 바꿔도 바로 다시 읽지 않는다');
  panels.myroom.style.display = 'block';
  L._liveDocSyncs.forEach(s=>s());
  assert.strictEqual(ffs.listeners.length, 1, '마이룸을 열면 실시간');
  assert.strictEqual(seen.at(-1)[1].hat, 'b');
  panels.myroom.style.display = 'none';
  L._liveDocSyncs.forEach(s=>s());
  assert.strictEqual(ffs.listeners.length, 0, '닫으면 연결을 끊는다');
});
