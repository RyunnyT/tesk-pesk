/* 글 한 편당 문서 하나. 기존 value 배열은 읽기만 하고, 수정본/삭제 표시는
   items/{id}에 저장한다. 기존 글·피드백을 옮기거나 지우지 않고 1 MiB 제한을 피한다. */
(function(root){
'use strict';
function merge(legacy, entries){
  const rows = new Map();
  (Array.isArray(legacy) ? legacy : []).forEach(w=>{ if(w && w.id) rows.set(w.id, w); });
  (entries || []).forEach(w=>{
    if(!w || !w.id) return;
    if(w.deleted === true) rows.delete(w.id);
    else rows.set(w.id, w);
  });
  return [...rows.values()].sort((a,b)=>String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
}
function create(api, roomId){
  if(!api._db || !roomId) throw new Error('WRITING_CONNECTION_UNAVAILABLE');
  const db = api._db;
  const legacyRef = api._fsDoc(db, 'classrooms', roomId, 'data', 'pesk-writings');
  const items = api._fsCollection(db, 'classrooms', roomId, 'data', 'pesk-writings', 'items');
  const entryRef = id=>api._fsDoc(items, String(id));
  const legacyRows = snap=>snap.exists() && Array.isArray(snap.data().value) ? snap.data().value : [];
  const itemRows = snap=>snap.docs.map(d=>({...d.data(), id:d.id}));
  async function load(){
    const [old, current] = await Promise.all([api._fsGetDoc(legacyRef), api._fsGetDocs(items)]);
    return merge(legacyRows(old), itemRows(current));
  }
  function subscribe(next, error){
    let old = [], current = [], oldReady = false, currentReady = false, active = true;
    const emit = ()=>{ if(active && oldReady && currentReady) next(merge(old, current)); };
    const fail = e=>{ if(active && error) error(e); };
    const stopOld = api._fsOnSnapshot(legacyRef, snap=>{ old=legacyRows(snap); oldReady=true; emit(); }, fail);
    const stopCurrent = api._fsOnSnapshot(items, snap=>{ current=itemRows(snap); currentReady=true; emit(); }, fail);
    return ()=>{ active=false; stopOld(); stopCurrent(); };
  }
  function newId(){ return api._fsDoc(items).id; }
  async function add(entry){
    const ref = entryRef(entry.id);
    // The ID belongs to this submission, not a transaction attempt.
    return api._fsRunTxn(db, async txn=>{
      const snap = await txn.get(ref);
      if(snap.exists()) throw new Error('WRITING_ALREADY_EXISTS');
      txn.set(ref, entry);
      return entry;
    });
  }
  async function update(id, change){
    if(api.TESK_USE_SERVER_STUDENT_AUTH && api._studentAuthApi && !api._teacherProfile){
      const present=await api._fsGetDoc(entryRef(id));
      if(!present.exists() || !present.data().accountUid || typeof present.data().studentNum!=='number') await api._studentAuthApi.migrateWriting(roomId,id);
    }
    return api._fsRunTxn(db, async txn=>{
      const ref = entryRef(id);
      const snap = await txn.get(ref);
      let current;
      if(snap.exists()) current = {...snap.data(), id};
      else current = legacyRows(await txn.get(legacyRef)).find(w=>w.id===id);
      if(!current || current.deleted === true) throw new Error('WRITING_NOT_FOUND');
      const next = change({...current});
      if(!next) return current;
      const saved = {...next, id, updatedAt:new Date().toISOString()};
      if(!next.deleted && (next.content!==current.content || next.title!==current.title)){
        const version=Math.max(1,Number(current.revision)||1);
        txn.set(api._fsDoc(db,'classrooms',roomId,'data','pesk-writings','items',String(id),'revisions',String(version)),{...current,revision:version,archivedAt:saved.updatedAt});
        saved.revision=version+1;saved.needsRevisionReview=true;saved.rubricStale=!!current.rubric;
      }
      txn.set(ref, saved);
      return saved;
    });
  }
  async function remove(id, check){
    return update(id, current=>{
      if(check) check(current);
      return {id, deleted:true, ...(current.studentNum!==undefined?{studentNum:current.studentNum}:{}), ...(current.accountUid?{accountUid:current.accountUid}:{})};
    });
  }
  // Explicit backup restore only. Never send the merged list back to the legacy document.
  async function replaceAll(rows){
    if(!Array.isArray(rows) || rows.some(w=>!w || typeof w.id!=='string' || !w.id || w.id.includes('/')))
      throw new Error('WRITING_INVALID_BACKUP');
    const before = await load();
    const ids = new Set(rows.map(w=>w.id));
    for(const w of rows) await api._fsSetDoc(entryRef(w.id), w);
    for(const w of before) if(!ids.has(w.id)) await remove(w.id);
  }
  async function history(id){const snap=await api._fsGetDocs(api._fsCollection(db,'classrooms',roomId,'data','pesk-writings','items',String(id),'revisions'));return snap.docs.map(d=>d.data()).sort((a,b)=>Number(b.revision)-Number(a.revision));}
  return {load, subscribe, newId, add, update, remove, replaceAll, history};
}
const API = {create, merge};
// Confirm only the exact text the teacher saw, including transaction retries.
API.signature = w=>JSON.stringify([w.title||'',w.content||'',w.revision||1]);
// 교사 화면의 today()는 '2026. 10. 1.' 형식이라 그대로 자르면 '2026. 10. '이 된다. 날짜만 YYYY-MM-DD 로 맞춘다.
API.dayKey = at=>{
  const m=String(at||'').match(/^(\d{4})[-.]\s*(\d{1,2})[-.]\s*(\d{1,2})/);
  return m ? m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0') : String(at||'');
};
API.confirmRead = (current, basis, at)=>{
  if(API.signature(current)!==basis) throw new Error('학생이 글을 다시 수정했어요. 최신 글을 열어 확인해주세요.');
  return {...current,readAt:current.readAt||API.dayKey(at),readBasisRevision:current.revision||1,
    revisionReviewedAt:current.needsRevisionReview?at:(current.revisionReviewedAt||''),
    needsRevisionReview:false,status:current.feedback?'reviewed':'read'};
};
if(typeof module==='object' && module.exports) module.exports=API;
root.PeskWritings=API;
})(typeof window!=='undefined' ? window : globalThis);
