/* 학생 '오늘 할 일' 요일표 — 교사 앱과 학생 앱이 같은 규칙으로 계산한다.
   · weekly: 활동별 요일 (0=일 … 6=토). 체크해 두면 매주 그대로 돌고, 바꾸고 싶을 때만 체크를 고친다.
   · 요일표를 한 번도 저장하지 않은 학급은 DEFAULT_WEEKLY 로, 예전 동작(글쓰기 평일·모험 매일)과 같다. */
(function(root){
'use strict';
const ACTIVITIES=[
  {id:'writing',icon:'✍️',label:'글쓰기',note:'마감 시각·면제 학생은 글쓰기 지도에서 정해요'},
  {id:'adventure',icon:'⚔️',label:'모험 학습',note:'하루 문제 수는 모험 학습에서 정해요'},
  {id:'literacy',icon:'📖',label:'오늘의 지문',note:'지문 만들기·승인은 오늘의 지문에서 해요'},
  {id:'challenge',icon:'🏁',label:'학급 챌린지',note:'챌린지 목록은 생활 체크리스트에서 정해요'}
];
const IDS=ACTIVITIES.map(a=>a.id);
const DEFAULT_WEEKLY={writing:[1,2,3,4,5],adventure:[0,1,2,3,4,5,6],literacy:[2,4],challenge:[0,1,2,3,4,5,6]};
const DOW=['일','월','화','수','목','금','토'];
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

function dows(v){return [...new Set((Array.isArray(v)?v:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort();}
function normalize(raw){
  const w=(raw&&typeof raw==='object'&&raw.weekly&&typeof raw.weekly==='object')?raw.weekly:{};
  const weekly={};
  // 저장된 적 없는 활동(나중에 새로 생긴 활동 포함)은 기본값을 쓴다
  IDS.forEach(id=>{weekly[id]=Array.isArray(w[id])?dows(w[id]):DEFAULT_WEEKLY[id].slice();});
  return {weekly};
}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dowOf(date){
  if(date instanceof Date)return date.getDay();
  if(!DATE_RE.test(String(date)))return -1;
  const [y,m,d]=String(date).split('-').map(Number);return new Date(y,m-1,d).getDay();
}
function isOn(s,id,date){return !!s.weekly[id]&&s.weekly[id].includes(dowOf(date));}
function activeOn(s,date){return IDS.filter(id=>isOn(s,id,date));}
function toggle(s,id,dow){
  if(!IDS.includes(id))return s;
  const cur=s.weekly[id]||[];
  const next=cur.includes(dow)?cur.filter(n=>n!==dow):dows(cur.concat([dow]));
  return {weekly:{...s.weekly,[id]:next}};
}
function dowLabel(list){
  const l=dows(list);
  if(l.length===7)return '매일';
  if(l.length===5&&[1,2,3,4,5].every(n=>l.includes(n)))return '평일';
  if(!l.length)return '없음';
  return [1,2,3,4,5,6,0].filter(n=>l.includes(n)).map(n=>DOW[n]).join('·');
}

const API={ACTIVITIES,IDS,DEFAULT_WEEKLY,DOW,normalize,ymd,isOn,activeOn,toggle,dowLabel};
if(typeof module==='object'&&module.exports)module.exports=API;
root.TodoSchedule=API;
})(typeof window!=='undefined'?window:globalThis);
