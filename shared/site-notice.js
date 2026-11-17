/* 운영자 공지 — master/notices 문서({text, color, active, students, until, updatedAt}, landing.html 배너와 같은 문서)를 시작할 때 한 번 읽어(읽기 1회)
   active 이고 until 전이면 화면 위에 띠로 보여 준다. 학생 화면은 students:true 인 공지만 보여 준다. 닫으면 그 공지는 이 기기에서 다시 뜨지 않는다.
   쓰기는 master.html 에서 운영자만 (firestore.rules: master/{doc} 는 누구나 읽고 운영자만 쓴다). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SiteNotice=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
function visible(n,{student,now,dismissed}={}){
  if(!n||typeof n!=='object'||!n.active||!String(n.text||'').trim())return false;
  if(n.until&&Date.parse(n.until)<(now||Date.now()))return false;
  if(student&&!n.students)return false;
  if(dismissed&&dismissed===String(n.updatedAt||''))return false;
  return true;
}
async function show(w,{student}={}){
  try{
    if(!w._fsGetDoc||!w._db)return;
    const snap=await w._fsGetDoc(w._fsDoc(w._db,'master','notices'));
    const n=snap.exists()?snap.data():null;
    let dismissed='';try{dismissed=w.localStorage.getItem('tesk-notice-dismissed')||'';}catch(_e){}
    if(!visible(n,{student,dismissed}))return;
    const bar=w.document.createElement('div');bar.setAttribute('role','status');
    bar.style.cssText='position:sticky;top:0;z-index:2500;display:flex;gap:10px;align-items:center;justify-content:center;padding:9px 14px;font-size:13px;font-weight:700;line-height:1.5;'
      +(n.color==='red'?'background:#fff3ef;color:#b42318;border-bottom:1px solid #f3b4a6;':'background:#eef6f1;color:#1f5b3a;border-bottom:1px solid #cfe3d6;');
    const t=w.document.createElement('span');t.textContent='📢 '+String(n.text).slice(0,300);
    const x=w.document.createElement('button');x.type='button';x.textContent='닫기';x.setAttribute('aria-label','공지 닫기');
    x.style.cssText='border:none;background:transparent;color:inherit;font-weight:800;cursor:pointer;text-decoration:underline;';
    x.onclick=()=>{try{w.localStorage.setItem('tesk-notice-dismissed',String(n.updatedAt||''));}catch(_e){}bar.remove();};
    bar.append(t,x);w.document.body.prepend(bar);
  }catch(_e){/* 공지를 못 읽어도 앱은 그대로 쓴다 */}
}
return {version,visible,show};
});
