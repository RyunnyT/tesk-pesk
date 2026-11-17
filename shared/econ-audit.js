/* 잔액 감사 — 거래 로그와 하루 스냅샷으로 "설명되지 않는 잔액 변화"를 찾는다. AI·서버 없이 교사 화면에서 돈다.
   check({students, logs, snapshots, today}) → [{num, name, kind, detail, amount, at}]
     gap      : 한 학생 로그를 시간순으로 놓았을 때 앞 줄의 거래 후 잔액과 다음 줄의 거래 전 잔액이 다르다
     drift    : 지금 잔액이 마지막 로그의 거래 후 잔액과 다르고, 그 뒤 로그가 없다 (로그 없이 바뀜)
     rollback : 어제 스냅샷보다 줄었는데 오늘 로그로 설명되지 않는다 (덮어쓰기 흔적)
     negative : 잔액이 음수
   expected(num, logs) → 로그로 다시 계산한 지금 잔액 (마지막 로그의 거래 후 잔액). 없으면 null. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EconAudit=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const tsOf=l=>Number(l&&l.ts)||Date.parse(l&&l.createdAt)||0;
function mineOf(logs,num){
  return (logs||[]).filter(l=>l&&String(l.studentNum)===String(num)&&n(l.balanceBefore)!=null&&n(l.balanceAfter)!=null).sort((a,b)=>tsOf(a)-tsOf(b));
}
function expected(num,logs){const m=mineOf(logs,num);return m.length?n(m[m.length-1].balanceAfter):null;}
function dayOf(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function check({students=[],logs=[],snapshots=[],today}={}){
  const out=[],day=today||dayOf(Date.now());
  const snaps=(snapshots||[]).filter(s=>s&&s.balances&&s.date<day).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const yesterday=snaps.length?snaps[snaps.length-1]:null;
  for(const s of students||[]){
    if(!s)continue;
    const num=s.num,name=s.name||'',cash=n(s.points)||0,mine=mineOf(logs,num);
    if(cash<0)out.push({num,name,kind:'negative',amount:cash,detail:'잔액이 음수예요.'});
    for(let i=1;i<mine.length;i++){
      const prev=n(mine[i-1].balanceAfter),cur=n(mine[i].balanceBefore);
      if(prev!==cur){out.push({num,name,kind:'gap',amount:cur-prev,at:mine[i].createdAt||new Date(tsOf(mine[i])).toISOString(),
        detail:`'${mine[i-1].detail||mine[i-1].type||''}' 뒤 잔액 ${prev.toLocaleString()} → 다음 거래 '${mine[i].detail||mine[i].type||''}' 앞 잔액 ${cur.toLocaleString()} (그 사이 기록 없이 ${(cur-prev).toLocaleString()} 변함)`});}
    }
    const last=mine[mine.length-1];
    if(last&&n(last.balanceAfter)!==cash){
      const d=cash-n(last.balanceAfter);
      out.push({num,name,kind:'drift',amount:d,at:last.createdAt||'',detail:`마지막 기록(${last.detail||last.type||''}) 뒤 잔액은 ${n(last.balanceAfter).toLocaleString()}인데 지금은 ${cash.toLocaleString()}이에요 (기록 없이 ${d.toLocaleString()} 변함).`});
    }
    if(yesterday&&yesterday.balances[num]!=null){
      const was=n(Array.isArray(yesterday.balances[num])?yesterday.balances[num][0]:yesterday.balances[num]);
      const todayLogs=mine.filter(l=>dayOf(tsOf(l))>yesterday.date);
      const explained=todayLogs.reduce((a,l)=>a+(n(l.balanceAfter)-n(l.balanceBefore)),0);
      const gap=cash-was-explained;
      if(was!=null&&gap<=-100)out.push({num,name,kind:'rollback',amount:gap,detail:`${yesterday.date} 잔액 ${was.toLocaleString()} → 지금 ${cash.toLocaleString()}. 그 뒤 기록으로 설명되는 변화는 ${explained.toLocaleString()}뿐이에요.`});
    }
  }
  return out;
}
/* 여러 학생이 같은 무렵 함께 되돌아갔는지 (낡은 화면이 반 전체를 덮어쓴 흔적) */
function massRollback(issues){
  const r=(issues||[]).filter(x=>x.kind==='rollback'||(x.kind==='drift'&&x.amount<0));
  return r.length>=3?r.length:0;
}
const LABEL={gap:'기록 사이 잔액이 어긋남',drift:'기록 없이 잔액이 바뀜',rollback:'어제보다 설명 없이 줄어듦',negative:'잔액이 음수'};
return {version,check,expected,massRollback,LABEL};
});
