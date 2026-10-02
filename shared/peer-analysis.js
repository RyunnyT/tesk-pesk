/* Descriptive evidence only. Missing responses never become absent relationships. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./peer-survey.js'));
  else root.PeerAnalysis=factory(root.PeerSurvey);
})(typeof window!=='undefined'?window:globalThis,function(S){
  'use strict';
  const categories=[['study','학습 협력'],['play','함께 노는 관계'],['support','도움·정서적 지지'],['aspire','가까워지고 싶은 관계'],['leader','의견을 듣고 이끄는 관계'],['discomfort','활동 중 불편한 관계'],['positive','이전 일반 긍정 지명']].map(([key,label])=>({key,label}));
  const unique=xs=>[...new Set(xs.map(Number))];
  const has=(r,k)=>!!r&&(r.categoryKeys||Object.keys(r.categories||{})).includes(k);
  const picks=(r,k)=>unique(r?.categories?.[k]||[]).filter(n=>n!==Number(r.studentNum));
  function profile(analysis,num){
    num=Number(num);const rows=analysis?.rows||[],row=rows.find(r=>Number(r.studentNum)===num);
    const domains=categories.map(c=>{
      const answered=has(row,c.key),out=answered?picks(row,c.key):null;
      const reporters=rows.filter(r=>Number(r.studentNum)!==num&&has(r,c.key));
      const incoming=reporters.filter(r=>picks(r,c.key).includes(num)).map(r=>Number(r.studentNum));
      const mutual=answered?out.filter(n=>reporters.some(r=>Number(r.studentNum)===n)&&incoming.includes(n)):null;
      const unknown=answered?out.filter(n=>!reporters.some(r=>Number(r.studentNum)===n)):[];
      return {...c,out,incoming:reporters.length?unique(incoming):null,mutual,unknown,reporterCount:reporters.length};
    });
    const evidence=S.reflection(row?.reflection);
    const posIn=unique(domains.filter(c=>['study','play','support','positive'].includes(c.key)).flatMap(c=>c.incoming||[])).length;
    const questions=S.interpret(evidence,{submitted:!!row,posIn});
    const play=domains.find(c=>c.key==='play');
    if(play.mutual?.length===1)questions.push('놀이에서 확인된 상호 선택은 1명입니다. “그 친구가 없는 날에는 어떻게 지내니?”');
    if(domains.find(c=>c.key==='aspire').out?.length)questions.push('“더 가까워지고 싶은 친구와 어떤 활동을 함께하면 편할까?” 서로의 의사를 확인한 뒤 활동을 정하세요.');
    return {num,row,domains,reflection:evidence,questions,submitted:!!row};
  }
  function compare(current,previous,num){
    const now=profile(current,num),before=profile(previous,num),a=current?.rows||[],b=previous?.rows||[];
    const warnings=[];
    if(!now.submitted||!before.submitted)warnings.push('학생 본인의 응답이 없는 회차가 있어 자기보고와 보낸 지명의 변화는 비교하지 않습니다.');
    if(current?.responseRate!==previous?.responseRate)warnings.push('회차별 응답률이 다릅니다. 받은 지명은 두 회차 모두 해당 문항에 응답한 친구만 비교합니다.');
    if(!now.row?.schemaVersion||!before.row?.schemaVersion)warnings.push('이전 자료의 문항 버전·선택 제한을 확인할 수 없습니다. 결과는 확인할 단서로만 사용하세요.');
    const domains=categories.map(c=>{
      const common=a.filter(r=>Number(r.studentNum)!==Number(num)&&has(r,c.key)&&b.some(p=>Number(p.studentNum)===Number(r.studentNum)&&has(p,c.key)&&(!r.accountUid||!p.accountUid||r.accountUid===p.accountUid)));
      const compatible=common.filter(r=>{
        const p=b.find(p=>Number(p.studentNum)===Number(r.studentNum));
        return !(r.nominationLimits?.[c.key]!=null&&p.nominationLimits?.[c.key]!=null&&r.nominationLimits[c.key]!==p.nominationLimits[c.key]);
      });
      if(common.length!==compatible.length)warnings.push(c.label+': 선택 인원 제한이 다른 응답은 비교에서 제외했습니다.');
      const ids=compatible.map(r=>Number(r.studentNum)),nd=now.domains.find(d=>d.key===c.key),pd=before.domains.find(d=>d.key===c.key);
      const incomingNow=(nd.incoming||[]).filter(n=>ids.includes(n)),incomingBefore=(pd.incoming||[]).filter(n=>ids.includes(n));
      const sameIdentity=!now.row?.accountUid||!before.row?.accountUid||now.row.accountUid===before.row.accountUid;
      const sameLimit=now.row?.nominationLimits?.[c.key]==null||before.row?.nominationLimits?.[c.key]==null||now.row.nominationLimits[c.key]===before.row.nominationLimits[c.key];
      const canMutual=!!nd.out&&!!pd.out&&sameIdentity&&sameLimit;
      const mNow=canMutual?(nd.mutual||[]).filter(n=>ids.includes(n)):[],mBefore=canMutual?(pd.mutual||[]).filter(n=>ids.includes(n)):[];
      return {...c,common:ids.length,incomingNow:ids.length?incomingNow.length:null,incomingBefore:ids.length?incomingBefore.length:null,
        newMutual:canMutual?mNow.filter(n=>!mBefore.includes(n)):null,unconfirmedMutual:canMutual?mBefore.filter(n=>!mNow.includes(n)):null,
        unknownPeers:unique([...(nd.unknown||[]),...(pd.mutual||[]).filter(n=>!ids.includes(n))])};
    });
    const sameStudent=!now.row?.accountUid||!before.row?.accountUid||now.row.accountUid===before.row.accountUid;
    if(!sameStudent)warnings.push('회차 사이 학생 계정이 달라 본인 응답은 비교하지 않습니다.');
    const self=S.scales.filter(c=>sameStudent&&now.reflection[c.key]!=null&&before.reflection[c.key]!=null).map(c=>({...c,before:before.reflection[c.key],now:now.reflection[c.key]}));
    return {now,before,domains,self,warnings:uniqueStrings(warnings)};
  }
  const uniqueStrings=xs=>[...new Set(xs)];
  function supportEntry(raw,at=new Date().toISOString()){
    const clip=(key,max=1600)=>String(raw?.[key]||'').trim().slice(0,max);
    const date=key=>{const value=raw?.[key]||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:'';};
    const entry={id:clip('id',100),roundId:clip('roundId',100),studentNum:Number(raw?.studentNum),accountUid:clip('accountUid',150),date:date('date'),reviewDate:date('reviewDate'),
      observation:clip('observation'),question:clip('question'),plan:clip('plan'),voice:clip('voice'),outcome:clip('outcome'),createdAt:at};
    if(!entry.id||!Number.isInteger(entry.studentNum)||entry.studentNum<=0||!entry.date||![entry.observation,entry.plan,entry.outcome].some(Boolean))throw new Error('관찰·지원 내용·재확인 결과 중 한 가지와 관찰 날짜를 입력해주세요.');
    if(raw?.reviewDate&&!entry.reviewDate)throw new Error('재확인 날짜를 확인해주세요.');
    if(entry.reviewDate&&entry.reviewDate<entry.date)throw new Error('재확인 날짜는 관찰 날짜 이후로 지정해주세요.');
    return entry;
  }
  async function saveSupport({db,ref,runTransaction,entry}){
    const normalized=supportEntry(entry);
    let saved;
    await runTransaction(db,async txn=>{
      const snap=await txn.get(ref);
      if(snap.exists()){saved=snap.data();return;}
      saved=normalized;txn.set(ref,saved);
    });return saved;
  }
  return {categories,profile,compare,supportEntry,saveSupport};
});
