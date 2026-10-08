/* 모험 기록 저장소 — 학생마다 문서 하나 + 반 요약 문서 하나.

   예전에는 반 전체 기록을 pesk-quiz-progress 문서 하나({번호: 기록})에 넣었다.
   여러 학생이 동시에 문제를 풀면 같은 문서를 두고 서로 기다리고(트랜잭션 재시도),
   기록이 쌓이면 문서 한도(1 MiB)에도 가까워진다.

   · 학생 기록:  classrooms/{room}/data/pesk-quiz-progress/students/{번호}   {value: 기록}
   · 반 요약:    classrooms/{room}/data/pesk-quiz-summary                  {value: {번호: 요약, __classBossQuest}}
       친구 칭호, 보스 피해·참여일, 학급 목표용 일별 푼 수만 담는다. 반 전체 화면은 이 문서 하나만 읽는다.
   · 옛 문서:    classrooms/{room}/data/pesk-quiz-progress                  읽기 전용. 아직 학생 문서가 없는
       학생의 기록과, 요약 문서가 처음 만들어질 때의 바탕으로만 쓴다. 지우거나 옮기지 않는다. */
(function(root){
'use strict';
const KEY = 'pesk-quiz-progress', SUMMARY = 'pesk-quiz-summary', LEDGER = '__classBossQuest';
const SUMMARY_DAYS = 62;
const isNum = k => /^\d+$/.test(String(k)) && Number(k) > 0;
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

/* 다른 학생 화면이 쓰는 값만 남긴다 */
function summaryOf(rec){
  if(!rec || typeof rec !== 'object') return null;
  const daily = {};
  Object.keys(rec.daily && typeof rec.daily === 'object' ? rec.daily : {}).sort().slice(-SUMMARY_DAYS).forEach(d => {
    const x = rec.daily[d];
    if(x && typeof x === 'object') daily[d] = {tried: Number(x.tried) || 0, correct: Number(x.correct) || 0};
  });
  const out = {daily, studentName: String(rec.studentName || ''), accountUid: String(rec.accountUid || ''), updatedAt: String(rec.updatedAt || '')};
  if(rec.boss && typeof rec.boss === 'object') out.boss = clone(rec.boss);
  if(rec.game && typeof rec.game === 'object' && rec.game.gxp != null) out.game = {gxp: Number(rec.game.gxp) || 0};
  return out;
}
function seedSummary(legacy){
  const out = {};
  Object.entries(legacy || {}).forEach(([k, v]) => { if(isNum(k)){ const s = summaryOf(v); if(s) out[k] = s; } });
  if(legacy && legacy[LEDGER]) out[LEDGER] = clone(legacy[LEDGER]);
  return out;
}
const entryOf = (map, num) => map ? (map[num] || map[String(num)] || null) : null;

function create(api, roomId){
  if(!api._db || !roomId) throw new Error('QUIZ_CONNECTION_UNAVAILABLE');
  const db = api._db;
  const dataRef = (...p) => api._fsDoc(db, 'classrooms', roomId, 'data', ...p);
  const legacyRef = dataRef(KEY), summaryRef = dataRef(SUMMARY);
  const studentRef = num => dataRef(KEY, 'students', String(num));
  const val = snap => snap && snap.exists() ? (snap.data().value || {}) : null;
  const getLegacy = async get => val(await get(legacyRef)) || {};

  /* 학생 화면: 반 요약 + 내 전체 기록 (보통 2회 읽기) */
  async function loadForStudent(num, summarySnap){   // summarySnap: 이미 읽어 둔 반 요약이 있으면 다시 읽지 않는다
    const [m, s] = await Promise.all([api._fsGetDoc(studentRef(num)), summarySnap || api._fsGetDoc(summaryRef)]);
    const legacy = (!m.exists() || !s.exists()) ? await getLegacy(api._fsGetDoc) : null;
    const all = s.exists() ? val(s) : seedSummary(legacy);
    const mine = m.exists() ? val(m) : clone(entryOf(legacy, num));
    delete all[String(num)];
    if(mine) all[num] = mine;
    return all;
  }
  /* 반 요약만 (교사 홈처럼 오늘 푼 수만 필요할 때) */
  async function loadSummary(){
    const s = await api._fsGetDoc(summaryRef);
    return s.exists() ? val(s) : seedSummary(await getLegacy(api._fsGetDoc));
  }
  /* 교사 화면: 모든 학생의 전체 기록 */
  async function loadAllFull(){
    const col = api._fsCollection(db, 'classrooms', roomId, 'data', KEY, 'students');
    const [l, s, docs] = await Promise.all([api._fsGetDoc(legacyRef), api._fsGetDoc(summaryRef), api._fsGetDocs(col)]);
    const legacy = val(l) || {}, all = {};
    Object.entries(legacy).forEach(([k, v]) => { if(isNum(k)) all[k] = v; });
    docs.docs.forEach(d => { if(isNum(d.id)) all[d.id] = d.data().value || {}; });
    const ledger = (val(s) || {})[LEDGER] || legacy[LEDGER];
    if(ledger) all[LEDGER] = ledger;
    return all;
  }

  /* ── 트랜잭션 ──
     Firestore 트랜잭션은 모든 읽기가 쓰기보다 먼저여야 한다. open → (loadFull) → save 순서로 쓴다.
     ctx.all 은 예전 문서와 같은 모양({번호: 기록})이라 학급 계산 함수를 그대로 쓸 수 있다.
     내 칸만 전체 기록이고 나머지는 요약이다. */
  async function open(txn, num, opts = {}){
    const cls = !!opts.cls, student = num !== null && num !== undefined;   // 교사 정산은 num 없이 반 요약만 연다
    const [m, s] = await Promise.all([student ? txn.get(studentRef(num)) : null, cls ? txn.get(summaryRef) : null]);
    const ctx = {txn, num: student ? num : null, legacy: null, summary: null, mine: null};
    if((student && !m.exists()) || (cls && !s.exists())) ctx.legacy = await getLegacy(r => txn.get(r));
    if(cls) ctx.summary = s.exists() ? val(s) : seedSummary(ctx.legacy);
    ctx.all = cls ? clone(ctx.summary) : {};
    if(student){
      ctx.mine = m.exists() ? val(m) : (clone(entryOf(ctx.legacy, num)) || {});
      delete ctx.all[String(num)];
      ctx.all[num] = ctx.mine;
    }
    return ctx;
  }
  /* 다른 학생의 전체 기록 (보스 보상 정산처럼 남의 기록을 바꿔야 할 때만) */
  async function loadFull(ctx, num){
    const snap = await ctx.txn.get(studentRef(num));
    if(snap.exists()) return val(snap);
    if(!ctx.legacy) ctx.legacy = await getLegacy(r => ctx.txn.get(r));
    return clone(entryOf(ctx.legacy, num)) || {};
  }
  /* records: {번호: 전체 기록}. summary 가 true 면 같은 트랜잭션에서 반 요약도 고친다 (open 할 때 cls 필요). */
  function save(ctx, records, opts = {}){
    const at = new Date().toISOString();
    Object.entries(records).forEach(([k, rec]) => ctx.txn.set(studentRef(k), {value: rec, updatedAt: at}));
    if(!opts.summary) return null;
    if(!ctx.summary) throw new Error('QUIZ_SUMMARY_NOT_READ');
    const next = {...ctx.summary};
    Object.entries(records).forEach(([k, rec]) => { const s = summaryOf(rec); if(s){ delete next[String(k)]; next[k] = s; } });
    if(opts.ledger !== undefined) next[LEDGER] = opts.ledger;
    ctx.txn.set(summaryRef, {value: next, updatedAt: at});
    ctx.summary = next;
    return next;
  }
  /* 미뤄 둔 반 요약 갱신 — 일별 푼 수·경험치처럼 자주 바뀌는 값은 몇 분에 한 번만 올린다.
     돌려주는 요약은 방금 서버에서 읽은 것이라 친구 기록 새로고침에도 쓴다. */
  async function flushSummary(num, rec){
    return api._fsRunTxn(db, async txn => {
      const s = await txn.get(summaryRef);
      const base = s.exists() ? val(s) : seedSummary(await getLegacy(r => txn.get(r)));
      const sm = summaryOf(rec), cur = entryOf(base, num);
      // 요약 문서가 아직 없으면 바뀐 게 없어도 만든다 — 그 뒤로는 반 전체가 큰 옛 문서를 읽지 않아도 된다
      if(s.exists() && (!sm || (cur && String(cur.updatedAt || '') > sm.updatedAt) || JSON.stringify(cur) === JSON.stringify(sm))) return base;
      if(sm && !(cur && String(cur.updatedAt || '') > sm.updatedAt)){ delete base[String(num)]; base[num] = sm; }
      txn.set(summaryRef, {value: base, updatedAt: new Date().toISOString()});
      return base;
    });
  }
  /* 교사: 학생 한 명의 기록 고치기 (요약에 들어가지 않는 값만 — 서술형 확인 등) */
  async function mutateStudent(num, change){
    let out;
    await api._fsRunTxn(db, async txn => {
      const ctx = await open(txn, num);
      const before = JSON.stringify(ctx.mine);
      const next = change(clone(ctx.mine));
      out = next || ctx.mine;
      if(next && JSON.stringify(next) !== before) save(ctx, {[num]: next});
    });
    return out;
  }
  /* 교사: 학생 삭제 — 학생 문서와 요약 칸을 지운다 (옛 문서는 부르는 쪽에서 따로 정리) */
  async function removeStudent(nums){
    const keys = [...new Set((Array.isArray(nums) ? nums : [nums]).filter(k => k !== undefined && k !== null && k !== '').map(String))];
    await api._fsRunTxn(db, async txn => {
      const s = await txn.get(summaryRef);
      keys.filter(isNum).forEach(k => txn.delete(studentRef(k)));
      if(s.exists()){
        const base = val(s);
        if(keys.some(k => k in base)){ keys.forEach(k => delete base[k]); txn.set(summaryRef, {value: base, updatedAt: new Date().toISOString()}); }
      }
    });
  }
  /* 백업 복원: 학생 문서로 나눠 쓰고 요약을 새로 만든다. 옛 문서는 건드리지 않는다. */
  async function restoreAll(map){
    const all = map && typeof map === 'object' ? map : {};
    const at = new Date().toISOString();
    for(const [k, rec] of Object.entries(all)) if(isNum(k) && rec && typeof rec === 'object')
      await api._fsSetDoc(studentRef(k), {value: rec, updatedAt: at});
    await api._fsSetDoc(summaryRef, {value: seedSummary(all), updatedAt: at});
  }
  return {loadForStudent, loadSummary, loadAllFull, open, loadFull, save, flushSummary, mutateStudent, removeStudent, restoreAll,
    refs: {legacyRef, summaryRef, studentRef}};
}

const API = {KEY, SUMMARY, LEDGER, create, summaryOf, seedSummary, isNum};
if(typeof module === 'object' && module.exports) module.exports = API;
root.PeskQuizStore = API;
})(typeof window !== 'undefined' ? window : globalThis);
