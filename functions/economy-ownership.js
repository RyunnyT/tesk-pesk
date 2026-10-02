/* 학급은행(예금·주식) 기록의 "주인" 판정 — 학생 앱(pesk)과 교사 앱(tesk)이 함께 쓴다.

   pesk-deposits / pesk-portfolios 문서는 {칸 이름: 기록 배열} 모양이다.
   칸 이름은 계정 uid(현재 방식) 또는 학생 번호(옛 방식)다. 예전 이전 작업에서
   같은 기록이 여러 칸에 복사본으로 남는 일이 있었고, 두 앱이 서로 다른 규칙으로
   칸을 합치면서 "해지한 예금이 되살아나 다시 해지되는" 복제 버그가 생겼다.

   규칙은 하나다.
   1) 기록에 accountUid가 있으면 그 계정의 것이다. 번호가 같아도 다른 계정이면 남의 것.
   2) accountUid가 없으면 studentNum, 그것도 없으면 들어 있는 칸의 번호로 판단한다.
   3) 계정 uid 칸이 있으면(빈 배열이어도) 그 칸이 정답이다. 다른 칸은 낡은 복사본이다.
   4) 저장할 때는 정답 칸 하나에만 쓰고, 다른 칸의 내 복사본은 지운다. */
(function(root){
'use strict';

const has=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const arr=v=>Array.isArray(v)?v:[];
const ownerKey=owner=>String(owner.uid||owner.num);

function owns(item, owner, bucketKey){
  if(!item||typeof item!=='object'||!owner) return false;
  const uid=String(owner.uid||'');
  if(uid && String(bucketKey)===uid) return true;
  const itemUid=String(item.accountUid||'');
  if(itemUid) return !!uid && itemUid===uid;
  if(item.studentNum!=null && item.studentNum!=='') return Number(item.studentNum)===Number(owner.num);
  return bucketKey!=null && String(bucketKey)===String(owner.num);
}

// 합치기 전의 "내 기록" 원본 목록. 우선순위: uid 칸 → 번호 칸 → 나머지 칸.
function ownedList(store, owner){
  const uid=String(owner.uid||'');
  if(uid && has(store,uid)) return arr(store[uid]).slice();
  const num=String(owner.num);
  const keys=Object.keys(store||{}).sort((a,b)=>(a===num?-1:b===num?1:0));
  const out=[];
  keys.forEach(k=>arr(store[k]).forEach(item=>{ if(owns(item,owner,k)) out.push(item); }));
  return out;
}

// 정답 칸에 list를 쓰고, 다른 칸의 내 복사본을 지운다. store를 직접 바꾸고 돌려준다.
// 남의 기록과 남의 빈 칸은 건드리지 않는다.
function setOwnedList(store, owner, list){
  const key=ownerKey(owner);
  Object.keys(store).forEach(k=>{
    if(k===key || !Array.isArray(store[k])) return;
    const kept=store[k].filter(item=>!owns(item,owner,k));
    if(kept.length===store[k].length) return;
    if(kept.length) store[k]=kept; else delete store[k];
  });
  const foreign=owner.uid ? [] : arr(store[key]).filter(item=>!owns(item,owner,key));
  store[key]=[...foreign, ...arr(list)];
  return store;
}

// 정답 칸 밖에 내 기록이 있거나, uid 칸이 아직 없으면 정리가 필요하다.
function needsConsolidation(store, owner){
  const key=ownerKey(owner);
  if(owner.uid && !has(store,key)) return ownedList(store,owner).length>0;
  return Object.keys(store||{}).some(k=>{
    if(k===key) return false;
    return arr(store[k]).some(item=>owns(item,owner,k));
  });
}

function recordId(item){
  return item.id || JSON.stringify([item.planId, item.amount, item.startDate]);
}
// 같은 종목은 수량을 더하지 않고 큰 쪽을 남긴다(복사본을 더하면 돈이 복제된다).
// 예금은 id가 같으면 하나만 남긴다.
function mergeRecords(list){
  const out=[];
  arr(list).forEach(item=>{
    if(!item||typeof item!=='object') return;
    if(item.code){
      const qty=Number(item.qty||0);
      const existing=out.find(x=>x.code===item.code);
      if(!existing){ out.push({...item, qty, avgPrice:Number(item.avgPrice)||0}); return; }
      if(qty>Number(existing.qty||0)){
        existing.qty=qty;
        existing.avgPrice=Number(item.avgPrice||existing.avgPrice||0);
        existing.name=item.name||existing.name;
      }
      return;
    }
    const id=recordId(item);
    if(!out.some(x=>!x.code && recordId(x)===id)) out.push({...item});
  });
  return out.filter(item=>!item.code || Number(item.qty||0)>0);
}

// 어느 학생에게도 속하지 않는 기록 (삭제된 학생·옛 계정의 흔적)
function orphanRecords(store, owners){
  const out=[];
  Object.keys(store||{}).forEach(k=>arr(store[k]).forEach(item=>{
    if(!owners.some(o=>owns(item,o,k))) out.push({bucket:k, item});
  }));
  return out;
}

// 반 전체를 한 번에 정리: 학생마다 정답 칸 하나로 모으고 복사본을 지운다.
// 주인 없는 기록은 지우지 않고 보고만 한다(돈을 임의로 없애지 않기 위해).
function consolidateStore(store, owners){
  const next=JSON.parse(JSON.stringify(store||{}));
  const moved=[];
  owners.forEach(owner=>{
    if(!needsConsolidation(next, owner)) return;
    const before=Object.keys(next).reduce((n,k)=>n+(k===ownerKey(owner)?0:arr(next[k]).filter(i=>owns(i,owner,k)).length),0);
    const list=mergeRecords(ownedList(next, owner)).map(item=>({...item, studentNum:Number(owner.num), accountUid:owner.uid||item.accountUid||''}));
    setOwnedList(next, owner, list);
    moved.push({num:Number(owner.num), copiesRemoved:before});
  });
  return {store:next, moved, orphans:orphanRecords(next, owners)};
}

function depositValue(dep, nowMs){
  const start=new Date(dep.startDate).getTime();
  const termDays=Number(dep.termDays||0), amount=Number(dep.amount||0);
  if(!start||!termDays||!amount) return Math.floor(amount);
  const elapsed=Math.max(0,(Number(nowMs||Date.now())-start)/86400000);
  const progress=Math.min(1, elapsed/termDays);
  const rate=Number(dep.rate||0)/100;
  return Math.floor(amount*(1+(progress>=1?rate:rate*0.3*progress)));
}

/* 은행 점검. 결과는 교사 화면에 그대로 보여 준다.
   - double-withdraw: 같은 예금 id로 해지 기록이 두 번 이상 (복제 흔적, 초과 지급액 포함)
   - over-payout: 해지 금액이 그 예금의 만기 금액보다 큼
   - stale-copy: 정답 칸 밖에 남은 복사본 (정리 버튼으로 지울 수 있음)
   - orphan: 주인 없는 기록
   - invalid: 숫자가 아니거나 음수인 잔액·예금·수량 */
function audit(input){
  const students=arr(input.students);
  const uidOf=input.accountUidOf||(()=>'');
  const owners=students.map(s=>({num:Number(s.num), uid:String(uidOf(s.num)||''), name:s.name||''}));
  const nameOf=num=>(students.find(s=>Number(s.num)===Number(num))||{}).name||'';
  const issues=[];
  const stores={deposits:input.deposits||{}, portfolios:input.portfolios||{}};

  students.forEach(s=>{
    const p=Number(s.points);
    if(!Number.isFinite(p)) issues.push({type:'invalid', num:Number(s.num), name:s.name||'', detail:'잔액이 숫자가 아니에요 ('+String(s.points)+')'});
  });
  Object.entries(stores).forEach(([label, store])=>{
    owners.forEach(owner=>{
      if(needsConsolidation(store, owner)){
        const key=ownerKey(owner);
        const count=Object.keys(store).reduce((n,k)=>n+(k===key?0:arr(store[k]).filter(i=>owns(i,owner,k)).length),0);
        issues.push({type:'stale-copy', store:label, num:owner.num, name:owner.name, count, detail:(label==='deposits'?'예금':'주식')+' 복사본 '+count+'건이 다른 칸에 남아 있어요'});
      }
      mergeRecords(ownedList(store, owner)).forEach(item=>{
        if(item.code){
          if(!(Number(item.qty)>0)) issues.push({type:'invalid', store:label, num:owner.num, name:owner.name, detail:item.code+' 수량이 이상해요 ('+item.qty+')'});
        }else if(!Number.isSafeInteger(Number(item.amount))||Number(item.amount)<=0){
          issues.push({type:'invalid', store:label, num:owner.num, name:owner.name, detail:'예금 원금이 이상해요 ('+item.amount+')'});
        }
      });
    });
    orphanRecords(store, owners).forEach(({bucket, item})=>{
      issues.push({type:'orphan', store:label, bucket, num:Number(item.studentNum)||null, name:'', detail:(label==='deposits'?'예금 '+Number(item.amount||0).toLocaleString():'주식 '+(item.name||item.code)+' '+Number(item.qty||0)+'주')+' — 주인 없는 기록 (칸: '+bucket+')'});
    });
  });

  const withdraws={};
  const created={};
  arr(input.logs).forEach(log=>{
    const depId=log?.meta?.depositId;
    if(!depId) return;
    if(log.type==='bank_deposit') created[depId]=log;
    if(log.type==='bank_withdraw') (withdraws[depId]=withdraws[depId]||[]).push(log);
  });
  Object.entries(withdraws).forEach(([depId, list])=>{
    const num=Number(list[0].studentNum)||null;
    if(list.length>1){
      const extra=list.slice(1).reduce((sum,l)=>sum+Math.max(0,Number(l.delta||0)),0);
      issues.push({type:'double-withdraw', num, name:nameOf(num)||list[0].studentName||'', depositId:depId, count:list.length, extra, detail:'같은 예금을 '+list.length+'번 해지했어요 (초과 지급 약 '+extra.toLocaleString()+')'});
    }
    const c=created[depId];
    const maxPay=c ? Math.floor(Math.abs(Number(c.delta||0))*(1+Number(c.meta?.rate||0)/100)) : null;
    list.forEach(l=>{
      if(maxPay!=null && Number(l.delta||0)>maxPay){
        issues.push({type:'over-payout', num, name:nameOf(num)||l.studentName||'', depositId:depId, detail:'해지 금액 '+Number(l.delta).toLocaleString()+'이 만기 금액 '+maxPay.toLocaleString()+'보다 커요'});
      }
    });
  });
  const order={'double-withdraw':0,'over-payout':1,invalid:2,'stale-copy':3,orphan:4};
  issues.sort((a,b)=>(order[a.type]-order[b.type])||((a.num||999)-(b.num||999)));
  return {issues, owners};
}

const API={owns, ownedList, setOwnedList, needsConsolidation, mergeRecords, orphanRecords, consolidateStore, depositValue, audit};
if(typeof module==='object'&&module.exports) module.exports=API;
root.EconomyOwnership=API;
})(typeof window!=='undefined'?window:globalThis);
