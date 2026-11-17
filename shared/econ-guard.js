/* 학생 돈이 걸린 문서(잔액·주식·예금·상점·경매·구매)를 낡은 사본이 덮어쓰지 못하게 한다.
   - 이 문서들은 {value, updatedAt, rev} 모양이고, 쓸 때마다 rev 가 1씩 오른다.
   - 트랜잭션 안에서 읽은 rev 에 1을 더해 쓰므로, 그 사이 다른 기기가 쓰면 Firestore 가 트랜잭션을 다시 돌린다.
   - firestore.rules 의 revOk 가 "rev 가 정확히 1 오른 쓰기"만 받는다(규칙 배포 후). 트랜잭션 없이 통째로 올리는
     옛 코드는 rev 를 맞출 수 없어 거절된다 → "돈 증발" 같은 덮어쓰기를 규칙이 막는다.
   install(window) 를 Firebase 준비 직후 한 번 부른다. 앱 코드의 txn.get/txn.set 은 그대로 두고 여기서 감싼다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EconGuard=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const KEYS=['tesk-students','pesk-portfolios','pesk-deposits','tesk-shop','pesk-auctions','pesk-purchases'];
const RE=new RegExp('^classrooms/[^/]+/data/('+KEYS.join('|')+')$');
const pathOf=ref=>String(ref&&(ref.path||ref)||'');
const isRevRef=ref=>RE.test(pathOf(ref));
const keyOf=ref=>(pathOf(ref).match(RE)||[])[1]||'';
const problems=[];   // 시험·진단용: rev 를 맞추지 못한 쓰기
function report(kind,ref){
  const msg='ECON_GUARD_'+kind+': '+keyOf(ref);
  problems.push(msg);
  try{console.error('[EconGuard] '+msg+' — 돈 문서는 트랜잭션에서 먼저 읽은 뒤 써야 해요.');}catch(_e){}
  try{root.ErrorReport&&root.ErrorReport.send('econ-guard',new Error(msg));}catch(_e){}
}
/* 트랜잭션 객체를 감싼다: get 한 rev 를 기억했다가 set 할 때 rev+1 을 붙인다 */
function wrapTxn(txn){
  const seen=new Map();
  const proxy={
    async get(ref){const snap=await txn.get(ref);if(isRevRef(ref))seen.set(pathOf(ref),snap.exists()?Number((snap.data()||{}).rev||0):0);return snap;},
    set(ref,data,opts){
      if(isRevRef(ref)&&data&&typeof data==='object'&&!(opts&&opts.merge)){
        const p=pathOf(ref);
        if(seen.has(p)){data={...data,rev:seen.get(p)+1};seen.set(p,seen.get(p)+1);}
        else report('UNREAD',ref);
      }
      txn.set(ref,data,opts);return proxy;
    },
    update(ref,data){if(isRevRef(ref))report('UPDATE',ref);txn.update(ref,data);return proxy;},
    delete(ref){txn.delete(ref);return proxy;}
  };
  return proxy;
}
function install(w){
  if(!w||w.__econGuard)return;
  const run=w._fsRunTxn;
  if(typeof run==='function')w._fsRunTxn=(db,fn,opts)=>run(db,txn=>fn(wrapTxn(txn)),opts);
  const set=w._fsSetDoc;
  if(typeof set==='function')w._fsSetDoc=(ref,data,opts)=>{
    if(isRevRef(ref)&&!(opts&&opts.merge)){report('SETDOC',ref);return Promise.reject(new Error('돈이 걸린 자료('+keyOf(ref)+')는 한꺼번에 덮어쓸 수 없어요. 화면을 새로고침한 뒤 다시 해 주세요.'));}
    return set(ref,data,opts);
  };
  w.__econGuard=true;
}
return {version,KEYS,isRevRef,wrapTxn,install,problems};
});
