/* 오류 모으기 — 교사·학생 화면에서 난 오류를 (학생 정보 없이) 운영자가 볼 수 있게 한다.
   - 보내는 것: 앱 이름, 버전, 오류 종류·고정된 문구, 어디서(where), 브라우저 종류. 학생 이름·학급·글 내용은 보내지 않는다.
     오류 문구 안의 따옴표 속 내용과 숫자는 '…'로 바꿔서 보낸다(사용자 자료가 섞이지 않게).
   - 같은 세션에서 같은 오류는 한 번만, 세션당 10건까지.
   - TESK_ERROR_WORKER_URL(shared/firebase-config.js)이 비어 있으면 보내지 않고 이 기기의 최근 오류 목록에만 남긴다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ErrorReport=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const MAX=10,seen=new Set();let sent=0,app='',ver='';
function clean(msg){
  return String(msg||'').replace(/(["'“‘「])[^"'”’」]{0,200}(["'”’」])/g,'$1…$2').replace(/\d{2,}/g,'…').replace(/[가-힣]{2,4}(?=(이|가|은|는|의|을|를)\s)/g,'…').slice(0,200);
}
function payload(where,error){
  const e=error||{},code=String(e.code||'');
  return {app,ver,where:String(where||'').slice(0,60),name:String(e.name||'Error').slice(0,40),code:code.slice(0,60),msg:clean(e.message||e),ua:(typeof navigator!=='undefined'&&navigator.userAgent||'').replace(/\d+(\.\d+)+/g,'').slice(0,80),at:new Date().toISOString()};
}
function remember(p){
  try{const k='tesk-error-log',list=JSON.parse(localStorage.getItem(k)||'[]');list.unshift(p);localStorage.setItem(k,JSON.stringify(list.slice(0,20)));}catch(_e){}
}
function send(where,error){
  try{
    const p=payload(where,error),key=p.where+'|'+p.name+'|'+p.code+'|'+p.msg;
    if(seen.has(key)||sent>=MAX)return;seen.add(key);sent++;
    remember(p);
    const url=typeof window!=='undefined'&&window.TESK_ERROR_WORKER_URL;
    if(url&&typeof fetch==='function')fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true}).catch(()=>{});
  }catch(_e){}
}
function recent(){try{return JSON.parse(localStorage.getItem('tesk-error-log')||'[]');}catch(_e){return [];}}
function install(w,opts){
  if(!w||w.__errorReport)return;w.__errorReport=true;
  app=(opts&&opts.app)||'';ver=(w.TESK_VERSION||'');
  w.addEventListener('error',e=>{if(e&&e.error)send('window.onerror',e.error);});
  w.addEventListener('unhandledrejection',e=>send('unhandledrejection',e&&e.reason));
}
return {version,send,install,recent,clean,payload};
});
