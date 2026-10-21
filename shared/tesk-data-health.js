/* 학급 데이터 건강 상태 — 문서 용량(Firestore 문서 1 MiB 한도), 저장 실패 판별, 백업 알림.
   계산만 한다(화면·저장은 교사 앱이 맡는다). 글쓰기처럼 한 문서에 반 전체를 몰아 담는 자료가
   한도를 넘으면 서버 저장이 거부되고 그 컴퓨터에만 남는다. 그 전에 알려 주려는 것. */
(function(root){
'use strict';
const LIMIT = 1048576;            // Firestore 문서 최대 크기
const WARN = 0.7, DANGER = 0.9;
const BACKUP_DAYS = 14;           // 이보다 오래되면 첫 화면에 백업 알림
const LABELS = {
  'tesk-settings':'학급 설정','tesk-students':'학생 명단·포인트','tesk-missions':'미션','tesk-shop':'상점 물품',
  'tesk-lessons':'수업 자료','tesk-jobs':'직업','tesk-records':'생활기록부(누가기록)','tesk-exams':'시험',
  'tesk-writings':'교사 등록 글','tesk-counsels':'상담 기록','tesk-counsel-requests':'상담 신청',
  'tesk-friends':'친구 관계','tesk-observations':'관찰 기록','tesk-seats':'자리 배치','tesk-activities':'최근 활동',
  'tesk-accounts':'학생 계정','tesk-stock-prices':'주식 시세','tesk-portfolios':'주식 보유(교사)','tesk-taxes':'세금',
  'tesk-student-badges':'학생 배지','tesk-cal-events':'학급 일정','tesk-quick-points':'빠른 포인트',
  'tesk-checklist-items':'체크리스트 항목','tesk-challenges':'도전 과제','tesk-challenge-awards':'도전 보상',
  'tesk-writing-rubric-reports':'글쓰기 평가 보고','tesk-economy-restrictions':'경제 제한','pesk-deposits':'은행 예금',
  'pesk-checklists':'체크리스트 기록','pesk-challenge-submissions':'도전 제출','pesk-writing-topic':'글쓰기 주제',
  'pesk-writing-duty':'글쓰기 의무','pesk-class-boss':'학급 보스','tesk-writing-phrases':'피드백 문구',
  'pesk-todo-schedule':'할 일 일정','pesk-literacy':'오늘의 지문','pesk-quest-config':'퀘스트 설정',
  'tesk-bank-settings':'은행 설정','tesk-wealth-tax':'재산세','tesk-stock-index':'주가 지수','tesk-econ-snapshots':'경제 지표 기록',
  'pesk-purchases':'구매 물품','pesk-purchase-log':'거래 로그','pesk-portfolios':'주식 보유','pesk-peer-survey':'교우관계 설문',
  'tesk-teacher-notif':'교사 알림','tesk-stock-raw-prices':'주식 원시 시세','pesk-avatars':'아바타','pesk-avatar-prices':'아바타 가격',
  'pesk-quiz-config':'모험 설정','pesk-class-fund':'학급 기금','pesk-auctions':'경매'
};
/* 스스로 오래된 것부터 지우는 자료 — 정해 둔 크기까지 차는 게 정상이라 그 아래에서는 경고하지 않는다.
   거래 로그: 850,000바이트(약 81%)에서 정리, 지난 주는 pesk-econ-archive-주차 문서로 보관. */
const AUTO_TRIM = {'pesk-purchase-log':850000};
const label = key=>LABELS[key] || key;
function utf8Bytes(str){
  if(typeof TextEncoder === 'function') return new TextEncoder().encode(str).length;
  let n = 0;
  for(let i = 0; i < str.length; i++){
    const c = str.charCodeAt(i);
    if(c < 0x80) n += 1; else if(c < 0x800) n += 2;
    else if(c >= 0xD800 && c <= 0xDBFF){ n += 4; i++; } else n += 3;
  }
  return n;
}
/* 교사 앱은 {value, updatedAt} 모양으로 저장한다. JSON 크기로 어림한다(실제 Firestore 크기와 수 % 차이). */
function docBytes(value){
  try{ return utf8Bytes(JSON.stringify({value: value === undefined ? null : value, updatedAt:'2026-01-01T00:00:00.000Z'})); }
  catch(e){ return 0; }
}
function level(bytes){
  const r = bytes / LIMIT;
  return r >= DANGER ? 'danger' : r >= WARN ? 'warn' : 'ok';
}
function entry(key, bytes){
  const auto = !!AUTO_TRIM[key];
  // 자동 정리 자료는 정리 기준을 넘어 90%까지 왔을 때만(정리가 안 되고 있다는 뜻) 경고
  const lv = auto ? (bytes >= LIMIT * DANGER ? 'danger' : 'ok') : level(bytes);
  return {key, label:label(key), bytes, pct:Math.min(999, Math.round(bytes / LIMIT * 100)), level:lv, ...(auto ? {auto:true} : {})};
}
/* docs: {key: value} → 큰 문서부터 */
function report(docs, skip){
  const skipSet = new Set(skip || []);
  return Object.keys(docs || {})
    .filter(k=>!skipSet.has(k))
    .map(k=>entry(k, docBytes(docs[k])))
    .sort((a,b)=>b.bytes - a.bytes);
}
/* 저장된 크기 기록({key: bytes}) → 화면용 */
function fromSizes(sizes){
  return Object.entries(sizes || {}).map(([k,b])=>entry(k, Number(b) || 0)).sort((a,b)=>b.bytes - a.bytes);
}
function toSizes(rows){ const o = {}; (rows || []).forEach(r=>{ o[r.key] = r.bytes; }); return o; }
function isSizeError(e){
  const msg = String(e && (e.message || e) || '');
  return /exceeds the maximum|maximum allowed size|too large|1048576|1,048,576|document.*size/i.test(msg);
}
function failureText(key, e){
  return isSizeError(e)
    ? `'${label(key)}' 저장 공간(1MB)이 가득 차서 서버에 저장하지 못했어요.`
    : `'${label(key)}'을(를) 서버에 저장하지 못했어요. 인터넷 연결을 확인해 주세요.`;
}
/* 마지막 백업 이후 지난 날짜(달력 기준). 기록이 없으면 null */
function daysSince(iso, now){
  const t = Date.parse(iso || '');
  if(!Number.isFinite(t)) return null;
  const n = now instanceof Date ? now : new Date(now || Date.now());
  const a = new Date(t); a.setHours(0,0,0,0);
  const b = new Date(n); b.setHours(0,0,0,0);
  return Math.max(0, Math.round((b - a) / 86400000));
}
/* 백업 알림이 필요한가: 기록 없음 또는 BACKUP_DAYS일 이상. '나중에'를 누르면 snoozeUntil까지 숨김 */
function backupDue(lastIso, now, snoozeUntil){
  const n = now instanceof Date ? now : new Date(now || Date.now());
  if(snoozeUntil && Date.parse(snoozeUntil) > n.getTime()) return null;
  const days = daysSince(lastIso, n);
  if(days === null) return {days:null, never:true};
  return days >= BACKUP_DAYS ? {days, never:false} : null;
}
const API = {LIMIT, WARN, DANGER, BACKUP_DAYS, LABELS, AUTO_TRIM, label, utf8Bytes, docBytes, level, report, fromSizes, toSizes, isSizeError, failureText, daysSince, backupDue};
if(typeof module === 'object' && module.exports) module.exports = API;
root.TeskDataHealth = API;
})(typeof window !== 'undefined' ? window : globalThis);
