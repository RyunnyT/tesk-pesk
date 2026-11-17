/* Firebase 무료 한도 관리 — 이 기기에서 오늘 읽기·쓰기를 몇 번 했는지 세고, 하루 한도에 닿으면 안내한다.
   - Firestore 에는 쓰지 않는다(쓰기 한도를 쓰지 않으려고). 기기의 localStorage 에만 하루 단위로 쌓는다.
   - 무료(Spark) 한도는 프로젝트 전체에 하루 읽기 50,000 · 쓰기 20,000 (태평양 시간 자정에 다시 채워진다).
   install(window, {onExhausted}) 를 Firebase 준비 직후 한 번 부른다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.UsageMeter=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const LIMIT={reads:50000,writes:20000};
const now={reads:0,writes:0,listens:0};
let flushTimer=null,exhaustedCb=null,storage=null;
const dayKey=()=>{const d=new Date();return 'tesk-usage-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function flush(){
  if(!storage)return;
  try{const k=dayKey(),prev=JSON.parse(storage.getItem(k)||'{}');
    storage.setItem(k,JSON.stringify({reads:(prev.reads||0)+now.reads,writes:(prev.writes||0)+now.writes,listens:(prev.listens||0)+now.listens}));
    now.reads=0;now.writes=0;now.listens=0;}catch(_e){}
}
function today(){
  let saved={};try{saved=JSON.parse((storage&&storage.getItem(dayKey()))||'{}');}catch(_e){}
  return {reads:(saved.reads||0)+now.reads,writes:(saved.writes||0)+now.writes,listens:(saved.listens||0)+now.listens};
}
const isExhausted=e=>/resource-exhausted|RESOURCE_EXHAUSTED|quota/i.test(String(e&&(e.code||e.message)||''));
function watch(p){return Promise.resolve(p).catch(e=>{if(isExhausted(e)&&exhaustedCb){try{exhaustedCb(e);}catch(_e){}}throw e;});}
function countDocs(snap){return snap&&Array.isArray(snap.docs)?Math.max(1,snap.docs.length):1;}
function install(w,opts){
  if(!w||w.__usageMeter)return;
  storage=(()=>{try{return w.localStorage;}catch(_e){return null;}})();
  exhaustedCb=opts&&opts.onExhausted||null;
  const g=w._fsGetDoc,gs=w._fsGetDocs,on=w._fsOnSnapshot,s=w._fsSetDoc,t=w._fsRunTxn;
  if(g)w._fsGetDoc=(...a)=>{now.reads++;return watch(g(...a));};
  if(gs)w._fsGetDocs=(...a)=>watch(gs(...a).then(r=>{now.reads+=countDocs(r);return r;}));
  if(s)w._fsSetDoc=(...a)=>{now.writes++;return watch(s(...a));};
  if(on)w._fsOnSnapshot=(ref,next,err)=>{now.listens++;return on(ref,snap=>{now.reads+=countDocs(snap);next(snap);},e=>{if(isExhausted(e)&&exhaustedCb)exhaustedCb(e);if(err)err(e);});};
  if(t)w._fsRunTxn=(db,fn,o)=>watch(t(db,txn=>{
    const p={get:r=>{now.reads++;return txn.get(r);},set:(r,d,x)=>{now.writes++;txn.set(r,d,x);return p;},
      update:(r,d)=>{now.writes++;txn.update(r,d);return p;},delete:r=>{now.writes++;txn.delete(r);return p;}};
    return fn(p);
  },o));
  if(!flushTimer){flushTimer=setInterval(flush,5*60*1000);if(flushTimer&&flushTimer.unref)flushTimer.unref();}
  try{w.addEventListener('pagehide',flush);w.addEventListener('beforeunload',flush);}catch(_e){}
  w.__usageMeter=true;
}
/* 학급 수에 따른 하루 사용량 추정 — 기기별 측정값과 함께 설정 화면에 보여 준다 */
function estimate({readsPerOpen,opensPerDay,students}){return Math.round(readsPerOpen*opensPerDay*students);}
return {version,LIMIT,install,today,flush,isExhausted,estimate};
});
