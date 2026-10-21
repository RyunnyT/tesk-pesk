/* 생활 체크리스트 기록 월별 보관.
   pesk-checklists 문서({날짜: {항목: {학생번호: 기록}}})는 하루 약 7KB씩 늘어 한 학년이 지나기 전에
   Firestore 문서 한도(1MB)에 닿는다. 이번 달·지난 달만 원래 문서에 두고, 더 오래된 달은
   pesk-checklist-archive-YYYY-MM 문서로 옮긴다(거래 로그 주 단위 보관과 같은 방식).
   학생 앱은 오늘(최근) 기록만 쓰므로 바뀌는 것이 없다. 교사 화면은 보관 문서를 합쳐서 본다. */
(function(root){
'use strict';
const PREFIX = 'pesk-checklist-archive-';
const INDEX_KEY = 'pesk-checklist-archive-index';
const KEEP_MONTHS = 2;   // 이번 달 + 지난 달은 원래 문서에 남긴다
const pad = n=>String(n).padStart(2, '0');
const monthOf = date=>{ const m = String(date || '').match(/^(\d{4})-(\d{2})-\d{2}$/); return m ? m[1] + '-' + m[2] : ''; };
const archiveKey = month=>PREFIX + month;
/* 이 달(YYYY-MM)보다 앞선 달은 보관 대상 */
function cutoffMonth(now, keep){
  const d = now instanceof Date ? now : new Date(now || Date.now());
  const c = new Date(d.getFullYear(), d.getMonth() - ((keep || KEEP_MONTHS) - 1), 1);
  return c.getFullYear() + '-' + pad(c.getMonth() + 1);
}
/* main → {keep: 남길 기록, byMonth: {YYYY-MM: {날짜: ...}}}. 날짜 모양이 아닌 키는 건드리지 않는다. */
function split(main, now, keep){
  const cut = cutoffMonth(now, keep);
  const out = {keep:{}, byMonth:{}};
  Object.entries(main || {}).forEach(([date, v])=>{
    const m = monthOf(date);
    if(m && m < cut){ (out.byMonth[m] = out.byMonth[m] || {})[date] = v; }
    else out.keep[date] = v;
  });
  return out;
}
/* 같은 날짜가 양쪽에 있으면 항목·학생 단위로 합친다. 나중 것(b)이 이긴다. */
function mergeDay(a, b){
  const out = {...(a || {})};
  Object.entries(b || {}).forEach(([item, byStu])=>{ out[item] = {...(out[item] || {}), ...(byStu || {})}; });
  return out;
}
function mergeRecords(a, b){
  const out = {...(a || {})};
  Object.entries(b || {}).forEach(([date, day])=>{ out[date] = out[date] ? mergeDay(out[date], day) : day; });
  return out;
}
/* 교사 화면용 전체 기록: 보관 기록 위에 원래 문서(최신)를 덮는다 */
function history(main, archive){ return mergeRecords(archive, main); }
function indexWith(index, months){ return [...new Set([...(Array.isArray(index) ? index : []), ...months])].filter(m=>/^\d{4}-\d{2}$/.test(m)).sort(); }
const API = {PREFIX, INDEX_KEY, KEEP_MONTHS, monthOf, archiveKey, cutoffMonth, split, mergeDay, mergeRecords, history, indexWith};
if(typeof module === 'object' && module.exports) module.exports = API;
root.ChecklistArchive = API;
})(typeof window !== 'undefined' ? window : globalThis);
