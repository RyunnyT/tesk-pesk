/* Class summaries describe survey responses, not student traits or risk scores. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./peer-analysis.js'),require('./peer-survey.js'));
 else root.PeerPortfolio=factory(root.PeerAnalysis,root.PeerSurvey);
})(typeof window!=='undefined'?window:globalThis,function(A,S){
 'use strict';
 const clip=(s,n=90)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n)+'…':s;};
 function build(analysis,roster){
  if(!analysis||analysis.roundId==='all')throw new Error('포트폴리오는 한 회차를 선택해 확인해주세요.');
  const students=[...new Map(roster.map(s=>[Number(s.num),{num:Number(s.num),name:String(s.name||'')}])).values()].sort((a,b)=>a.num-b.num);
  const ids=new Set(students.map(s=>s.num));
  const rows=[...new Map((analysis.rows||[]).filter(r=>ids.has(Number(r.studentNum))).map(r=>[Number(r.studentNum),r])).values()];
  const snapshot={...analysis,rows};
  const cards=students.map(s=>{
   const p=A.profile(snapshot,s.num),r=p.reflection;
   return {...s,submitted:p.submitted,request:r.request,asksHelp:!!r.request&&r.request!=='지금은 괜찮아요',
    belonging:r.notApplicable.includes('belonging')?'그런 상황이 없었어요':r.belonging==null?'응답 없음':S.frequency[r.belonging-1],
    solitude:r.solitude,contexts:r.contexts,goodMoment:clip(r.goodMoment),hardMoment:clip(r.hardMoment),nextStep:clip(r.nextStep),
    relations:p.domains.filter(d=>['study','play','support'].includes(d.key)).map(d=>({key:d.key,label:d.key==='study'?'학습':d.key==='play'?'놀이':'도움',mutual:d.mutual,unknown:d.unknown.length})),
    question:p.submitted?clip(p.questions[0],150):'설문에 답할 기회가 있었는지 먼저 확인해 주세요.'};
  });
  const respondents=cards.filter(c=>c.submitted).length;
  const requestAnswered=cards.filter(c=>c.request).length;
  const supportRequests=cards.filter(c=>c.asksHelp).length;
  const solitudeAnswered=cards.filter(c=>c.solitude).length;
  const wantedCompany=cards.filter(c=>c.solitude===S.solitude[1]||c.solitude===S.solitude[2]).length;
  const contextAnswered=cards.filter(c=>c.contexts.length).length;
  const contexts=[...new Set(cards.flatMap(c=>c.contexts))].map(label=>({label,count:cards.filter(c=>c.contexts.includes(label)).length})).sort((a,b)=>b.count-a.count);
  const belonging=rows.map(r=>S.reflection(r.reflection));
  const validBelonging=belonging.filter(r=>r.belonging!=null);
  const frequency=S.frequency.map((label,i)=>({label,count:validBelonging.filter(r=>r.belonging===i+1).length}));
  const observations=[];
  if(!respondents)observations.push('아직 이 회차의 응답이 없습니다. 응답할 기회를 마련한 뒤 학급의 경험을 살펴보세요.');
  else{
   observations.push(supportRequests?'원하는 도움 문항에 답한 '+requestAnswered+'명 중 '+supportRequests+'명이 도움을 요청했습니다. 학생 찾기에서 한 명씩 원하는 방식과 시기를 확인해 주세요.':requestAnswered?'원하는 도움 문항에 답한 '+requestAnswered+'명은 모두 “지금은 괜찮아요”를 선택했습니다. 답하지 않은 학생의 경험까지 판단하지 않습니다.':'원하는 도움 문항의 응답이 없어 도움 요청 여부를 요약할 수 없습니다.');
   if(wantedCompany)observations.push('혼자 지낸 이유에 답한 '+solitudeAnswered+'명 중 '+wantedCompany+'명이 함께하고 싶지만 참여하기 어려웠던 경험을 답했습니다. 원하는 활동과 참여 방법을 개별적으로 물어보세요.');
   if(contexts.length)observations.push('도움이 필요한 상황을 선택한 학생은 '+contextAnswered+'명입니다. '+contexts.map(c=>c.label+' '+c.count+'명').join(', ')+'. 여러 상황을 선택할 수 있으므로 합계는 학생 수와 다를 수 있습니다.');
  }
  return {roundId:analysis.roundId,roundLabel:analysis.roundLabel||analysis.roundId,total:students.length,respondents,missing:students.length-respondents,requestAnswered,supportRequests,solitudeAnswered,wantedCompany,contextAnswered,contexts,
   belonging:{answered:validBelonging.length,notApplicable:belonging.filter(r=>r.notApplicable.includes('belonging')).length,missing:students.length-validBelonging.length-belonging.filter(r=>r.notApplicable.includes('belonging')).length,frequency},cards,observations};
 }
 return {build};
});
