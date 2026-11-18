/* 🧪 아르카 연대기(베타) 서버 저장 — 학생마다 문서 두 개 (2026-11-18, arca/docs/설계_서버저장.md)

   · 진행:      classrooms/{room}/data/arca-save/students/{번호}  {json, rev, at, solved}
   · 학습 기록: classrooms/{room}/data/arca-log/students/{번호}   {json, rev, at, sum}
       sum = 대시보드용 요약(푼 문제·맞힘·단원별·최근 날짜·진도·자주 틀린 문제). 대시보드는 이 문서만 읽는다.
   · json 은 아르카의 localStorage 값 그대로(문자열). Firestore 는 배열 안 배열을 못 담아서 글로 보관한다.
   · rev 는 저장할 때마다 1씩. 규칙이 "정확히 1 늘 때만" 허락하므로, 다른 기기가 먼저 저장했으면 늦은 쪽이 거절된다.

   아르카(arca.html, 같은 사이트)는 서버를 모른다. 이 파일이 아르카의 기기 저장(localStorage "arca-v2@학급-번호" 등)을
   ① 열기 전에 서버 것과 비교해 채워 두고 ② 노는 동안 60초마다·창을 숨길 때·닫을 때 바뀐 것만 올린다.
   학습 기록은 1년(365일) 지난 것을 올릴 때 뺀다(기기의 원본은 그대로). 실패해도 게임은 기기 저장으로 계속된다. */
(function(root){
'use strict';
const SAVE = 'arca-save', LOG = 'arca-log', KEEP_DAYS = 365;

/* 글 → 짧은 지문(바뀌었는지 비교용) */
function hash(s){
  let h = 5381;
  s = String(s || '');
  for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + s.length;
}
const parse = s => { try{ return s ? JSON.parse(s) : null; }catch(e){ return null; } };
const day = t => { const z = new Date(t); return z.getFullYear() + '-' + String(z.getMonth()+1).padStart(2,'0') + '-' + String(z.getDate()).padStart(2,'0'); };

/* 1년 지난 학습 기록 빼기 (서버에 올리는 사본만) */
function prune(log, now){
  if(!log || typeof log !== 'object') return log;
  const cut = day((now || Date.now()) - KEEP_DAYS * 864e5);
  const out = Object.assign({}, log);
  out.recent = (log.recent || []).filter(e => !e.d || e.d >= cut);
  out.agg = {};
  Object.entries(log.agg || {}).forEach(([k, g]) => { if(!g.d || g.d >= cut) out.agg[k] = g; });
  out.miss = {};
  Object.entries(log.miss || {}).forEach(([k, m]) => { if(!m.last || m.last >= cut) out.miss[k] = m; });
  return out;
}

/* 대시보드 요약 — 학습 기록 + 진행에서 */
function summary(log, save){
  const units = {}, s = {n: 0, ok: 0, t: 0, last: '', units, miss: [], part: 0, lv: 0, nick: ''};
  const add = (u, n, ok, t, d) => {
    const x = units[u] || (units[u] = {n: 0, ok: 0});
    x.n += n; x.ok += ok; s.n += n; s.ok += ok; s.t += t || 0;
    if(d && d > s.last) s.last = d;
  };
  (log && log.recent || []).forEach(e => add(e.u || '기타', 1, e.ok ? 1 : 0, e.t, e.d));
  Object.values(log && log.agg || {}).forEach(g => add(g.u || '기타', g.n || 0, g.ok || 0, g.t, g.d));
  s.miss = Object.entries(log && log.miss || {}).filter(([, m]) => !m.fix).sort((a, b) => b[1].n - a[1].n).slice(0, 5)
    .map(([q, m]) => ({q: String(q).slice(0, 80), a: m.a, n: m.n}));
  if(save){
    s.solved = Number(save.solved) || 0;
    s.lv = Number(save.lv) || 0;
    s.nick = String(save.name || '').slice(0, 20);
    // 진도 = 다 되살린 마을 수 + 1 (마을마다 지워진 곳 8칸, save.done[마을] = [..8])
    const full = Object.values(save.done || {}).filter(d => Array.isArray(d) && d.length === 8 && d.every(Boolean)).length;
    s.part = Math.min(12, full + 1);
    s.towns = full;
  }
  return s;
}

/* 두 학습 기록 합치기(두 기기에서 모두 바뀌었을 때) — 같은 줄은 한 번만 */
function mergeLog(a, b){
  if(!a) return b; if(!b) return a;
  const seen = new Set(), recent = [];
  [...(a.recent || []), ...(b.recent || [])].forEach(e => { const k = JSON.stringify(e); if(!seen.has(k)){ seen.add(k); recent.push(e); } });
  recent.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
  const agg = Object.assign({}, a.agg || {});
  Object.entries(b.agg || {}).forEach(([k, g]) => { if(!agg[k] || (g.n || 0) > (agg[k].n || 0)) agg[k] = g; });
  return Object.assign({}, a, {recent: recent.slice(-300), agg, miss: Object.assign({}, a.miss || {}, b.miss || {})});
}

/* 열 때 어느 저장을 쓸지 (선생님 결정: 더 많이 진행한 쪽)
   meta = 이 기기가 마지막으로 서버와 맞춘 상태 {rev, h}. 반환 {save, log, from:'local'|'server'|'merge', note} */
function choose(local, server, meta){
  meta = meta || {rev: 0, h: ''};
  const lh = local.save ? hash(local.save + '|' + (local.log || '')) : '';
  if(!server.save) return {save: local.save, log: local.log, from: 'local'};
  if(!local.save) return {save: server.save, log: server.log, from: 'server'};
  const localChanged = lh !== meta.h, serverChanged = (server.rev || 0) > (meta.rev || 0);
  if(!serverChanged) return {save: local.save, log: local.log, from: 'local'};
  if(!localChanged) return {save: server.save, log: server.log, from: 'server'};
  // 두 곳 모두 바뀜 → 맞힌 문제가 많은 진행, 학습 기록은 합침
  const ls = Number((parse(local.save) || {}).solved) || 0, ss = Number((parse(server.save) || {}).solved) || 0;
  const ml = mergeLog(parse(local.log), parse(server.log)), log = ml ? JSON.stringify(ml) : (local.log || server.log || null);
  return ls > ss
    ? {save: local.save, log, from: 'local', note: '이 기기의 진행(맞힌 문제 ' + ls + '개)으로 이어 해요. 다른 기기 진행은 ' + ss + '개였어요.'}
    : {save: server.save, log, from: 'server', note: '다른 기기의 진행(맞힌 문제 ' + ss + '개)으로 이어 해요. 이 기기 진행은 ' + ls + '개였어요.'};
}

function create(api, roomId, num, opts){
  opts = opts || {};
  const ls = opts.storage || root.localStorage;
  const prof = String(opts.prof || '');
  const K = {save: 'arca-v2@' + prof, log: 'arca-log@' + prof, meta: 'arca-sync@' + prof};
  const ref = key => api._fsDoc(api._db, 'classrooms', roomId, 'data', key, 'students', String(num));
  const now = opts.now || (() => Date.now());
  let meta = parse(ls.getItem(K.meta)) || {rev: 0, logRev: 0, h: ''};
  let timer = null, busy = false, onState = opts.onState || (() => {}), onConflict = opts.onConflict || (() => {});
  const setMeta = m => { meta = Object.assign(meta, m); try{ ls.setItem(K.meta, JSON.stringify(meta)); }catch(e){} };
  const local = () => ({save: ls.getItem(K.save), log: ls.getItem(K.log)});

  /* ① 열기 전: 서버를 읽어 기기 저장을 맞춘다. 서버에 못 닿으면(4초) 기기 저장 그대로 */
  async function prepare(){
    let srv = {save: null, log: null, rev: 0, logRev: 0};
    try{
      const read = Promise.all([api._fsGetDoc(ref(SAVE)), api._fsGetDoc(ref(LOG))]);
      const [s, l] = await Promise.race([read, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), opts.timeout || 4000))]);
      if(s.exists()){ const d = s.data(); srv.save = d.json || null; srv.rev = Number(d.rev) || 0; }
      if(l.exists()){ const d = l.data(); srv.log = d.json || null; srv.logRev = Number(d.rev) || 0; }
    }catch(e){
      onState('offline');
      return {from: 'local', offline: true};
    }
    const loc = local(), pick = choose(loc, srv, meta);
    if(pick.save != null && pick.save !== loc.save) ls.setItem(K.save, pick.save);
    if(pick.log != null && pick.log !== loc.log) ls.setItem(K.log, pick.log);
    // 지금 기기 = 서버 rev 기준. 기기에서 고른 것이면 h 를 비워 다음 올리기에서 올라가게
    setMeta({rev: srv.rev, logRev: srv.logRev, h: pick.from === 'server' && !pick.note ? hash((pick.save || '') + '|' + (pick.log || '')) : ''});
    onState('ready');
    return pick;
  }

  /* 한 문서 쓰기 — 규칙: rev 가 정확히 1 늘어야 함. 거절되면 서버를 읽어 원인을 본다 */
  async function writeDoc(key, revKey, body){
    const next = (meta[revKey] || 0) + 1;
    try{
      await api._fsSetDoc(ref(key), Object.assign({}, body, {rev: next, at: now()}));
      setMeta({[revKey]: next});
      return 'ok';
    }catch(e){
      let snap = null;
      try{ snap = await api._fsGetDoc(ref(key)); }catch(_e){ return 'offline'; }
      if(!snap.exists()){
        // 선생님이 지웠거나 처음 → rev 1 부터 다시
        try{ await api._fsSetDoc(ref(key), Object.assign({}, body, {rev: 1, at: now()})); setMeta({[revKey]: 1}); return 'ok'; }
        catch(_e2){ return 'denied'; }
      }
      const srvRev = Number(snap.data().rev) || 0;
      if(srvRev > (meta[revKey] || 0)) return {conflict: true, rev: srvRev, json: snap.data().json};
      return 'denied';
    }
  }

  /* ② 바뀐 것만 올리기 */
  async function flush(force){
    if(busy) return 'busy';
    const loc = local();
    if(!loc.save && !loc.log) return 'empty';
    const h = hash((loc.save || '') + '|' + (loc.log || ''));
    if(!force && h === meta.h) return 'same';
    busy = true;
    onState('saving');
    try{
      const save = parse(loc.save), log = parse(loc.log), pl = prune(log, now());
      const r1 = loc.save ? await writeDoc(SAVE, 'rev', {json: loc.save, solved: Number(save && save.solved) || 0}) : 'ok';
      if(r1 && r1.conflict){ onState('conflict'); onConflict(r1); return 'conflict'; }
      const r2 = loc.log ? await writeDoc(LOG, 'logRev', {json: JSON.stringify(pl), sum: summary(pl, save)}) : 'ok';
      if(r2 && r2.conflict){
        // 학습 기록은 합쳐서 다시 쓴다(진행처럼 고르지 않음)
        setMeta({logRev: r2.rev});
        const merged = mergeLog(pl, parse(r2.json));
        const r3 = await writeDoc(LOG, 'logRev', {json: JSON.stringify(merged), sum: summary(merged, save)});
        if(r3 !== 'ok'){ onState(r3 === 'offline' ? 'offline' : 'error'); return r3; }
      }else if(r1 !== 'ok' || r2 !== 'ok'){ onState(r1 === 'offline' || r2 === 'offline' ? 'offline' : 'error'); return 'fail'; }
      setMeta({h});
      onState('saved');
      return 'saved';
    }finally{ busy = false; }
  }

  /* 다른 기기 진행이 더 새로울 때: 그쪽으로 맞추기(true) 또는 이 기기 것으로 덮기(false) */
  async function resolve(useServer, conflict){
    if(useServer){
      const s = await api._fsGetDoc(ref(SAVE)), l = await api._fsGetDoc(ref(LOG));
      if(s.exists()){ ls.setItem(K.save, s.data().json); }
      if(l.exists()){ ls.setItem(K.log, l.data().json); }
      setMeta({rev: s.exists() ? Number(s.data().rev) || 0 : 0, logRev: l.exists() ? Number(l.data().rev) || 0 : 0,
        h: hash((ls.getItem(K.save) || '') + '|' + (ls.getItem(K.log) || ''))});
      return 'reload';
    }
    setMeta({rev: conflict && conflict.rev || meta.rev, h: ''});
    return flush(true);
  }

  function start(ms){
    stop();
    timer = setInterval(() => { flush(false); }, ms || 60000);
  }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  return {prepare, flush, resolve, start, stop, keys: K, get meta(){ return Object.assign({}, meta); }};
}

/* 선생님: 반 전체 요약 읽기·지우기 */
async function loadClass(api, roomId){
  const col = api._fsCollection(api._db, 'classrooms', roomId, 'data', LOG, 'students');
  const snap = await api._fsGetDocs(col);
  const out = {};
  snap.docs.forEach(d => { if(/^\d+$/.test(d.id)){ const v = d.data(); out[d.id] = Object.assign({at: v.at || 0}, v.sum || {}); } });
  return out;
}
async function eraseClass(api, roomId){
  let n = 0;
  for(const key of [SAVE, LOG]){
    const snap = await api._fsGetDocs(api._fsCollection(api._db, 'classrooms', roomId, 'data', key, 'students'));
    for(const d of snap.docs){ await api._fsDeleteDoc(api._fsDoc(api._db, 'classrooms', roomId, 'data', key, 'students', d.id)); n++; }
  }
  return n;
}

root.PeskArcaStore = {create, choose, prune, summary, mergeLog, hash, loadClass, eraseClass, KEEP_DAYS};
})(typeof window !== 'undefined' ? window : globalThis);
