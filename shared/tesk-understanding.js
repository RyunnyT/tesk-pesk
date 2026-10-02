/* 학생 이해 시스템 (교사 전용) — 친구관계 분석 페이지의 탭, 마음거리 결과, AI 학생 이해 결과지(학생별·학급), 자리배치 추천.
   계산: MindDistance · ObservationCore · PeerRelations · SeatPlanner (모두 AI 없이 같은 결과)
   해석: StudentUnderstandingAI (이름을 가린 뒤 보내고, 근거가 확인된 문장만 씁니다) */
(function(root){
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const MD=()=>root.MindDistance,SU=()=>root.StudentUnderstandingAI,R=()=>root.PeerRelations,OC=()=>root.ObservationCore;
 const nameOf=n=>students.find(s=>Number(s.num)===Number(n))?.name||n+'번';
 const names=ns=>ns.map(nameOf).join(', ');
 const roster=()=>students.slice().sort((a,b)=>Number(a.num)-Number(b.num));
 const stripType=t=>String(t||'').replace(/\s*\([^)]*\)/g,'');

 /* ── 탭 ── */
 let tab='analysis';
 const TABS=[['analysis','👫 친구 관계 분석'],['observe','📝 관찰 기록'],['seats','🪑 자리배치']];
 function tabBar(){
  const n=root.TeskObservations?.all().length||0;
  return '<div class="su-tabs" role="tablist">'+TABS.map(([k,l])=>'<button type="button" role="tab" aria-selected="'+(k===tab)+'" class="su-tab'+(k===tab?' active':'')+'" onclick="TeskUnderstanding.setTab(\''+k+'\');renderFriends()">'+l+(k==='observe'&&n?' <b>'+n+'</b>':'')+'</button>').join('')+'</div>';
 }
 function setTab(t){tab=TABS.some(x=>x[0]===t)?t:'analysis';}
 function renderOther(el){
  if(tab==='analysis')return false;
  el.innerHTML=tabBar();
  if(tab==='observe')root.TeskObservations.mount(el);else mountSeats(el);
  return true;
 }

 /* ── 회차·마음거리 ── */
 function currentRound(){
  const r=typeof friendRoundView==='string'&&!['all','active'].includes(friendRoundView)?friendRoundView:'';
  return r||activePeskSurveyRoundId||'round-1';
 }
 function distanceFor(roundId){
  const rows=getFriendSurveyRows(roundId).filter(r=>r.studentNum!=null).map(r=>({studentNum:r.studentNum,distance:r.distance}));
  return MD().analyze(rows,students);
 }
 const bar=(v,max,cls='')=>'<span class="su-bar '+cls+'"><i style="width:'+(v==null?0:Math.max(2,Math.round(v/max*100)))+'%"></i></span>';
 function distanceHtml(analysis,num){
  const res=distanceFor(analysis?.roundId||currentRound()),st=res.students.get(Number(num));
  if(!res.raters)return '<p class="peer-muted">이 회차에는 마음거리 응답이 아직 없어요. 학생 앱 친구 관계 조사에 마음거리 문항(반 친구 전원을 1~5로 답하기)이 추가되었어요.</p>';
  if(!st)return '';
  const dist=st.receivedDist,max=Math.max(...dist,1);
  return '<div class="su-dist">'
   +'<div class="su-dist-main"><div><small>반 친구들이 느끼는 거리</small><b>'+(st.receivedMean??'—')+'</b><span>/ 5 · 반 평균 '+(res.classMean??'—')+'</span>'+bar(st.receivedMean,5)+'<em>'+E(st.level)+' · 평정한 친구 '+st.raters+'명</em></div>'
   +'<div><small>이 학생이 느끼는 거리</small><b>'+(st.givenMean??'—')+'</b><span>/ 5</span>'+bar(st.givenMean,5,'self')+'<em>'+(st.rated?'답한 친구 '+st.givenCount+'명':'본인 미응답')+'</em></div></div>'
   +'<div class="su-dist-hist" aria-label="받은 점수 분포">'+MD().SHORT.map((l,i)=>'<div><i style="height:'+Math.round(dist[i]/max*100)+'%"></i><span>'+dist[i]+'</span><small>'+E(l)+'</small></div>').join('')+'</div>'
   +'<ul class="pr-facts">'
   +'<li>서로 가깝다고 답한 친구 <b>'+(st.close.length?E(names(st.close)):'없음')+'</b></li>'
   +'<li>서로 멀다고 답한 친구 <b>'+(st.distant.length?E(names(st.distant)):'없음')+'</b></li>'
   +'<li>서로 느끼는 거리가 크게 다른 친구 <b>'+(st.gap.length?E(names(st.gap)):'없음')+'</b></li></ul>'
   +'<details><summary>친구별 마음거리 (보낸 점수 / 받은 점수)</summary><div class="peer-table"><table><thead><tr><th>친구</th><th>이 학생 → 친구</th><th>친구 → 이 학생</th></tr></thead><tbody>'
   +MD().rowsFor(res,num,roster()).map(r=>'<tr><th>'+E(r.name)+'</th><td>'+(r.toPeer?r.toPeer+' '+E(MD().SHORT[r.toPeer-1]):'—')+'</td><td>'+(r.fromPeer?r.fromPeer+' '+E(MD().SHORT[r.fromPeer-1]):'—')+'</td></tr>').join('')
   +'</tbody></table></div></details>'
   +'<p class="insight-help">반 친구 전원이 1(아주 멀어요)~5(아주 가까워요)로 답한 평균이에요. 반 안에서의 상대 위치이며 성격이나 문제를 뜻하지 않아요.</p></div>';
 }

 /* ── 학생 한 명의 자료 모으기 (모두 앱 계산) ── */
 async function gather(num){
  num=Number(num);
  const student=students.find(s=>Number(s.num)===num);if(!student)throw new Error('학생을 찾을 수 없어요.');
  await root.PeerRelationsUI?.loadRatings?.();
  const roundId=currentRound(),analysis=analyzeFriends(roundId);
  let survey=null,reflection=null,surveyMeta=null;
  if(analysis){
   const res=root.PeerRelationsUI.result(analysis),s=res.students.get(num);
   if(s){
    survey={roundLabel:analysis.roundLabel,respondents:res.reporters,classSize:res.classSize,submitted:s.submitted,
     statusText:stripType(R().STATUS[s.status]?.teacher),posIn:s.posIn,negIn:s.negIn,meanPos:res.means.pos,meanNeg:res.means.neg,isolated:s.isolated,
     close:s.close,groups:s.groups,leaderIn:s.leaderIn,studyIn:s.studyIn,supportIn:s.supportIn,aspireIn:s.aspireIn,posOut:s.posOut,reciprocity:s.reciprocity,
     conflictPeers:s.relations.filter(r=>r.tone==='conflict').map(r=>r.peer)};
    surveyMeta={roundLabel:analysis.roundLabel,respondents:res.reporters,classSize:res.classSize,status:s.status};
   }
   const row=analysis.rows.find(r=>Number(r.studentNum)===num);
   if(row&&PeerSurvey.hasReflection(row.reflection)){
    const r=PeerSurvey.reflection(row.reflection),items=[];
    PeerSurvey.scales.filter(q=>!q.legacy||r[q.key]!=null).forEach(q=>items.push({label:q.label,value:r.notApplicable.includes(q.key)?'그런 상황이 없었어요':r[q.key]==null?'미응답':PeerSurvey.frequency[r[q.key]-1]}));
    items.push({label:'혼자 있었던 이유',value:r.solitude||'미응답'},{label:'도움이 필요한 상황',value:r.contexts.join(', ')||'미응답'});
    PeerSurvey.texts.forEach(q=>items.push({label:q.label,value:r[q.key]||'미응답'}));
    items.push({label:'원하는 도움',value:r.request||'미응답'});
    reflection={items,raw:r};
   }
  }
  const dres=distanceFor(roundId),dst=dres.students.get(num);
  const distance=dres.raters&&dst?{question:MD().QUESTION,raters:dres.raters,classSize:dres.classSize,classMean:dres.classMean,rated:dst.rated,
   receivedMean:dst.receivedMean,receivedDist:dst.receivedDist,givenMean:dst.givenMean,givenCount:dst.givenCount,level:dst.level,close:dst.close,distant:dst.distant,gap:dst.gap}:null;
  const raw=root.PeerRelationsUI?.ratingOf?.(num)||null,sc=R().skillScores(raw);
  const rating=sc.rated?{rated:sc.rated,domains:sc.domains.map(d=>({key:d.key,label:d.label,score:d.score,items:R().SKILLS.find(x=>x.key===d.key).items})),strengths:sc.strengths,needs:sc.needs,note:raw?.note||'',updatedAt:raw?.updatedAt||''}:{rated:0};
  const observations=root.TeskObservations.summary(num);
  // 안전 신호: 관찰 기록과 학생 본인 서술 모두에서 찾습니다
  const flags=[...root.TeskObservations.flagsFor(num)];
  if(reflection)OC().FLAGS.forEach(f=>{if(!flags.some(x=>x.key===f.key)&&PeerSurvey.texts.some(q=>f.re.test(reflection.raw[q.key]||'')))flags.push({...f,label:f.label+' (학생 서술)'});});
  const grade=typeof RecordCheck!=='undefined'?RecordCheck.gradeFromClassName(root.settings?.className):null;
  return {student,roundId,surveyMeta,input:{student:{num,name:student.name},roster:roster(),grade:grade?grade+'학년':null,survey,reflection,distance,rating,observations,flags}};
 }

 /* ── 결과지 그리기 ── */
 const results=new Map(),busy=new Set();
 function dataCards(d,{parent=false}={}){
  const i=d.input,cards=[];
  if(i.survey){const s=i.survey;cards.push('<div class="su-card"><h5>또래 설문</h5><b class="su-big">'+E(s.statusText||'—')+'</b>'
   +'<div class="su-row"><span>받은 긍정 지명</span>'+bar(s.posIn,Math.max(s.posIn,s.meanPos*2,1))+'<em>'+s.posIn+'명 · 반 평균 '+s.meanPos+'</em></div>'
   +'<div class="su-row"><span>받은 불편 지명</span>'+bar(s.negIn,Math.max(s.negIn,s.meanNeg*2,1),'neg')+'<em>'+s.negIn+'명 · 반 평균 '+s.meanNeg+'</em></div>'
   +'<p>서로 친한 친구 '+(parent?s.close.length+'명':s.close.length?E(names(s.close)):'없음')+'</p><small>'+E(s.roundLabel)+' · 응답 '+s.respondents+'/'+s.classSize+'명</small></div>');}
  if(i.distance){const x=i.distance;cards.push('<div class="su-card"><h5>마음거리</h5><b class="su-big">'+(x.receivedMean??'—')+'<small> / 5</small></b>'
   +'<div class="su-row"><span>친구들이 느끼는 거리</span>'+bar(x.receivedMean,5)+'<em>반 평균 '+(x.classMean??'—')+'</em></div>'
   +'<div class="su-row"><span>이 학생이 느끼는 거리</span>'+bar(x.givenMean,5,'self')+'<em>'+(x.givenMean??'미응답')+'</em></div>'
   +'<p>'+E(x.level)+'</p><small>평정한 학생 '+x.raters+'/'+x.classSize+'명</small></div>');}
  if(i.rating.rated){cards.push('<div class="su-card"><h5>사회성 (교사 평정)</h5>'+i.rating.domains.map(x=>'<div class="su-row"><span>'+E(x.label)+'</span>'+bar(x.score,4,'rate')+'<em>'+(x.score??'—')+'</em></div>').join('')
   +'<small>4점 척도 · '+E(String(i.rating.updatedAt||'').slice(0,10))+'</small></div>');}
  const o=i.observations;
  if(o.count){cards.push('<div class="su-card"><h5>교사 관찰</h5><b class="su-big">'+o.count+'<small>건</small></b>'
   +Object.entries(o.byType).map(([k,n])=>'<div class="su-row"><span>'+E(OC().typeLabel(k))+'</span>'+bar(n,o.count,OC().TYPES.find(t=>t.key===k)?.negative?'neg':'')+'<em>'+n+'건</em></div>').join('')
   +'<p>'+(o.repeated?'반복 관찰됨':'단발 관찰')+(o.first?' · '+E(o.first)+' ~ '+E(o.last):'')+'</p></div>');}
  if(!cards.length)return '<p class="peer-muted">아직 모인 자료가 없어요. 설문·마음거리·평정·관찰 중 하나 이상이 있어야 결과지를 만들 수 있어요.</p>';
  return '<div class="su-cards">'+cards.join('')+'</div>';
 }
 function flagBox(d){return d.input.flags.length?'<div class="su-flags" role="alert"><b>⚠ 먼저 확인해 주세요 (앱 규칙으로 찾은 신호)</b><ul>'+d.input.flags.map(f=>'<li><b>'+E(f.label)+'</b> — '+E(f.action)+'</li>').join('')+'</ul></div>':'';}
 function aiHtml(r,{parent=false}={}){
  if(!r)return '';
  const list=(title,rows,fn)=>rows.length?'<section class="su-sec"><h4>'+title+'</h4>'+fn(rows)+'</section>':'';
  const ul=(rows,k)=>'<ul>'+rows.map(x=>'<li>'+E(x[k])+'</li>').join('')+'</ul>';
  if(parent){
   const p=r.parentSafe;
   return (p.summary?'<section class="su-sec"><h4>아이는 지금</h4><p>'+E(p.summary.text)+'</p></section>':'')
    +list('강점과 자원',p.strengths,x=>ul(x,'text'))+list('친구 관계 속 모습',p.relationships,x=>ul(x,'text'))
    +list('가정과 함께 나눌 이야기',p.parentTalk,x=>x.map(y=>'<div class="su-talk"><b>'+E(y.point)+'</b><p>“'+E(y.script)+'”</p></div>').join(''));
  }
  return (r.summary?'<section class="su-sec su-summary"><h4>이 아이는 지금</h4><p>'+E(r.summary.text)+'</p></section>':'')
   +list('강점과 자원',r.strengths,x=>ul(x,'text'))
   +list('친구 관계 속 모습',r.relationships,x=>ul(x,'text'))
   +list('행동 뒤의 마음',r.innerWorld,x=>'<div class="su-inner">'+x.map(y=>'<div><p class="su-beh">'+E(y.behavior)+'</p><p class="su-mean">→ '+E(y.possibleMeaning)+'</p><p class="su-q">확인 질문 · “'+E(y.checkQuestion)+'”</p></div>').join('')+'</div>')
   +list('학생에게 이렇게 말해 보세요',r.studentTalk,x=>x.map(y=>'<div class="su-talk"><b>'+E(y.situation)+'</b><p>“'+E(y.script)+'”</p></div>').join(''))
   +list('학부모님께 이렇게 말씀해 보세요',r.parentTalk,x=>x.map(y=>'<div class="su-talk parent"><b>'+E(y.point)+'</b><p>“'+E(y.script)+'”</p></div>').join(''))
   +list('교실에서 할 수 있는 것',r.classroom,x=>ul(x,'action'))
   +list('앞으로 지켜볼 점',r.watch,x=>ul(x,'text'));
 }
 function sourcesHtml(d,packet,{parent=false}={}){
  const i=d.input,used=[];
  if(i.survey)used.push('또래 관계 설문 '+i.survey.roundLabel+' (응답 '+i.survey.respondents+'/'+i.survey.classSize+'명)');
  if(i.reflection)used.push('학생 자기보고 (같은 설문의 체감 문항·서술)');
  if(i.distance)used.push('마음거리 검사 (반 친구 전원 1~5 평정, 평정한 학생 '+i.distance.raters+'명)');
  if(i.rating.rated)used.push('담임교사 사회성 평정 6영역'+(i.rating.updatedAt?' ('+String(i.rating.updatedAt).slice(0,10)+')':''));
  if(i.observations.count&&!parent)used.push('담임교사 관찰 기록 '+i.observations.count+'건'+(i.observations.first?' ('+i.observations.first+' ~ '+i.observations.last+')':''));
  if(i.observations.count&&parent)used.push('담임교사 학교생활 관찰');
  const refs=packet?SU().references(packet):SU().REFERENCES;
  return '<section class="su-sources"><h4>출처</h4><p><b>사용한 자료</b></p><ul>'+used.map(u=>'<li>'+E(u)+'</li>').join('')+'</ul>'
   +'<p><b>해석 방법 참고 문헌</b></p><ol>'+refs.map(r=>'<li>'+E(r.text)+' <span class="su-ref-basis">— '+E(r.basis)+'</span> <a href="'+E(r.url)+'" target="_blank" rel="noopener noreferrer">'+E(r.url)+'</a></li>').join('')+'</ol>'
   +'<p class="su-disclaimer">이 결과지는 교실 설문·교사 관찰을 바탕으로 한 상담 참고 자료이며 임상 심리검사나 진단이 아닙니다. 수치는 앱이 계산했고, 해석 문장은 AI가 근거 자료를 확인한 범위에서 작성했습니다. 학생·학부모와 대화하며 확인해 주세요.</p></section>';
 }
 function reportBody(d,state,{parent=false}={}){
  const s=d.student,cls=root.settings?.className||'';
  return '<header class="su-head"><div><small>'+E(cls)+(cls?' · ':'')+(parent?'학부모 상담 자료':'학생 이해 결과지 · 교사용')+'</small><h3>'+E(s.num+'. '+s.name)+'</h3></div><span>'+E(new Date().toLocaleDateString('ko-KR'))+'</span></header>'
   +(parent?'':flagBox(d))+'<h4 class="su-h">한눈에 보는 자료</h4>'+dataCards(d,{parent})
   +(state?.result?'<h4 class="su-h">아동 발달 상담가의 해석</h4>'+aiHtml(state.result,{parent}):'')
   +sourcesHtml(d,state?.packet,{parent});
 }
 let overlayNum=null;
 async function openReport(num){
  overlayNum=Number(num);
  let box=document.getElementById('su-overlay');
  if(!box){box=document.createElement('div');box.id='su-overlay';box.className='su-overlay';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');document.body.append(box);
   box.addEventListener('click',e=>{if(e.target===box)closeReport();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('su-overlay')?.classList.contains('open'))closeReport();});}
  box.classList.add('open');box.innerHTML='<div class="su-report"><p class="peer-muted">자료를 모으는 중…</p></div>';
  await drawReport();
 }
 function closeReport(){document.getElementById('su-overlay')?.classList.remove('open');overlayNum=null;}
 function stateFor(d){
  const packet=SU().build(d.input),sig=JSON.stringify(SU().prompt(packet)),saved=results.get(d.student.num);
  return {packet,sig,state:saved&&saved.sig===sig?saved:null};
 }
 async function drawReport(){
  const box=document.getElementById('su-overlay');if(!box||overlayNum==null)return;
  let d;try{d=await gather(overlayNum);}catch(err){box.innerHTML='<div class="su-report"><p>'+E(err.message)+'</p><button class="btn btn-secondary" onclick="TeskUnderstanding.closeReport()">닫기</button></div>';return;}
  const {state}=stateFor(d),k=d.student.num,hasData=!!(d.input.survey||d.input.distance||d.input.rating.rated||d.input.observations.count);
  box.innerHTML='<div class="su-report"><div class="su-toolbar">'
   +'<button type="button" class="btn btn-gold" data-su-gen '+(busy.has(k)||!hasData?'disabled':'')+'>'+(busy.has(k)?'아이의 마음을 읽는 중…':state?'✨ 해석 다시 만들기':'✨ AI 해석 만들기')+'</button>'
   +'<button type="button" class="btn btn-secondary" data-su-print>🖨️ 교사용 인쇄</button>'
   +'<button type="button" class="btn btn-secondary" data-su-print-parent '+(state?'':'disabled title="AI 해석을 먼저 만들어 주세요"')+'>🖨️ 학부모 상담용 인쇄</button>'
   +'<button type="button" class="btn btn-secondary" data-su-close>닫기</button></div>'
   +(state?.result?.dropped?'<p class="peer-muted">근거나 표현 규칙을 벗어난 AI 문장 '+state.result.dropped+'개는 빼고 보여 드려요.</p>':'')
   +'<div class="su-paper">'+reportBody(d,state)+'</div></div>';
  box.querySelector('[data-su-gen]').onclick=()=>generate(k);
  box.querySelector('[data-su-close]').onclick=closeReport;
  box.querySelector('[data-su-print]').onclick=()=>printHtml(d.student.name+' 학생 이해 결과지',reportBody(d,state));
  box.querySelector('[data-su-print-parent]').onclick=()=>state&&printHtml(d.student.name+' 학부모 상담 자료',reportBody(d,state,{parent:true}));
 }
 async function generate(num){
  num=Number(num);if(busy.has(num))return;
  busy.add(num);await drawReport();
  try{
   const d=await gather(num),{packet,sig}=stateFor(d);
   const raw=await callTeachAI(SU().prompt(packet),{temperature:0.25,maxTokens:9000,allowPartial:false,continueOnLength:false});
   const checked=SU().validate(raw,packet);
   if(stateFor(await gather(num)).sig!==sig){showToast('만드는 동안 자료가 바뀌었어요. 다시 만들어 주세요.');return;}
   // 교사용은 이름을 되돌리고, 학부모용은 이름 없는 원문(친구 A → 한 친구)을 씁니다
   const teacher=SU().restore(checked,packet,roster());
   const scrub=t=>String(t).replace(/친구\s?[A-Z](?![A-Za-z])/g,'한 친구').replace(/대상 학생/g,'아이');
   const parentSafe={summary:checked.summary?{text:scrub(checked.summary.text)}:null,strengths:checked.strengths.map(x=>({text:scrub(x.text)})),
    relationships:checked.relationships.map(x=>({text:scrub(x.text)})),parentTalk:checked.parentTalk.map(x=>({point:scrub(x.point),script:scrub(x.script)}))};
   teacher.parentSafe=parentSafe;
   results.set(num,{sig,packet,result:teacher});
   showToast('근거를 확인한 해석만 결과지에 넣었어요. 학생과 이야기하며 확인해 주세요.');
  }catch(err){showToast('AI 해석을 만들지 못했어요: '+err.message);}
  finally{busy.delete(num);await drawReport();}
 }
 function printHtml(title,body){
  const w=root.open('','_blank');if(!w){showToast('팝업이 막혀 있어요. 이 사이트의 팝업을 허용해 주세요.');return;}
  const css=[...document.querySelectorAll('link[href*="tesk-understanding.css"]')].map(l=>'<link rel="stylesheet" href="'+E(l.href)+'">').join('');
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+E(title)+'</title>'+css
   +'<style>body{font-family:"Pretendard","Malgun Gothic",sans-serif;color:#1f2937;margin:14mm;line-height:1.7;font-size:13px;--tesk:#2d7a47;--border:#e5e7eb;--sub:#6b7280;--surface:#f8fafc}@media print{body{margin:10mm}.su-sec,.su-card,.su-talk{break-inside:avoid}}</style></head><body class="su-print"><div class="su-paper">'+body
   +'</div><script>setTimeout(function(){print()},400)<\/script></body></html>');
  w.document.close();
 }

 /* ── 학급 전체 ── */
 const classResults=new Map();let classBusy=false;
 function gatherClass(analysis){
  const roundId=analysis?.roundId||currentRound();
  let survey=null;
  if(analysis){
   const res=root.PeerRelationsUI.result(analysis),list=[...res.students.values()];
   const watch=list.filter(s=>['neglected','rejected'].includes(s.status)||s.isolated).map(s=>({num:s.num,why:s.isolated?'서로 친한 친구·받은 긍정 지명 없음':stripType(R().STATUS[s.status].teacher)}));
   survey={roundLabel:analysis.roundLabel,respondents:res.reporters,classSize:res.classSize,groups:res.groups,watch};
  }
  const dres=distanceFor(roundId);
  const distance=dres.raters?{raters:dres.raters,classMean:dres.classMean,low:[...dres.students.values()].filter(s=>s.z!=null&&s.z<=-1).map(s=>s.num),
   distantPairs:dres.pairs.filter(p=>p.kind==='distant').length,gapPairs:dres.pairs.filter(p=>p.kind==='gap').length}:null;
  const all=root.TeskObservations.all(),byType={};all.forEach(e=>e.types.forEach(k=>{byType[OC().typeLabel(k)]=(byType[OC().typeLabel(k)]||0)+1;}));
  const repeatStudents=roster().filter(s=>root.TeskObservations.summary(s.num).repeated).map(s=>Number(s.num));
  const observations=all.length?{count:all.length,byType,pairs:root.TeskObservations.pairs(),repeatStudents}:null;
  const flags=[];roster().forEach(s=>root.TeskObservations.flagsFor(s.num).forEach(f=>flags.push({num:Number(s.num),label:f.label,action:f.action})));
  return {roundId,input:{roster:roster(),survey,distance,observations,flags}};
 }
 function classOverview(g){
  const i=g.input,parts=[];
  if(i.flags.length)parts.push('<div class="su-flags" role="alert"><b>⚠ 먼저 확인해 주세요</b><ul>'+i.flags.map(f=>'<li>'+E(nameOf(f.num))+' — '+E(f.label)+'</li>').join('')+'</ul></div>');
  const cards=[];
  if(i.distance)cards.push('<div class="su-card"><h5>마음거리</h5><b class="su-big">'+(i.distance.classMean??'—')+'<small> / 5</small></b><p>평정한 학생 '+i.distance.raters+'명 · 서로 먼 쌍 '+i.distance.distantPairs+' · 거리 차가 큰 쌍 '+i.distance.gapPairs+'</p>'
   +(i.distance.low.length?'<p>멀게 느끼는 친구가 많은 학생: <b>'+E(names(i.distance.low))+'</b></p>':'')+'</div>');
  if(i.observations)cards.push('<div class="su-card"><h5>교사 관찰</h5><b class="su-big">'+i.observations.count+'<small>건</small></b><p>'+Object.entries(i.observations.byType).map(([k,n])=>E(k)+' '+n).join(' · ')+'</p>'
   +(i.observations.repeatStudents.length?'<p>반복 관찰: <b>'+E(names(i.observations.repeatStudents))+'</b></p>':'')
   +(i.observations.pairs.filter(p=>p.negative).length?'<p>갈등이 관찰된 짝: '+i.observations.pairs.filter(p=>p.negative).sort((a,b)=>b.negative-a.negative).slice(0,6).map(p=>E(nameOf(p.a)+'·'+nameOf(p.b))+' '+p.negative+'건').join(', ')+'</p>':'')+'</div>');
  if(i.survey)cards.push('<div class="su-card"><h5>또래 설문</h5><b class="su-big">'+i.survey.respondents+'<small>/'+i.survey.classSize+'명</small></b><p>친한 무리 '+i.survey.groups.length+'개</p>'
   +(i.survey.watch.length?'<p>또래 관계에서 살펴볼 학생: <b>'+E(names(i.survey.watch.map(w=>w.num)))+'</b></p>':'')+'</div>');
  parts.push(cards.length?'<div class="su-cards">'+cards.join('')+'</div>':'<p class="peer-muted">설문·마음거리·관찰 자료가 모이면 학급 결과지를 만들 수 있어요.</p>');
  return parts.join('');
 }
 function classAiHtml(r){
  if(!r)return '';
  const ul=(rows,k)=>'<ul>'+rows.map(x=>'<li>'+E(x[k])+'</li>').join('')+'</ul>';
  return (r.summary?'<section class="su-sec su-summary"><h4>우리 반은 지금</h4><p>'+E(r.summary.text)+'</p></section>':'')
   +(r.patterns.length?'<section class="su-sec"><h4>관계의 흐름</h4>'+ul(r.patterns,'text')+'</section>':'')
   +(r.students.length?'<section class="su-sec"><h4>관심이 필요한 학생</h4>'+r.students.map(x=>'<div class="su-talk"><b>'+E(x.student)+'</b><p>'+E(x.text)+'</p></div>').join('')+'</section>':'')
   +(r.classroom.length?'<section class="su-sec"><h4>학급 운영 제안</h4>'+ul(r.classroom,'action')+'</section>':'')
   +(r.watch.length?'<section class="su-sec"><h4>다음에 확인할 것</h4>'+ul(r.watch,'text')+'</section>':'');
 }
 function classSources(packet,g){
  const i=g.input,used=[];
  if(i.survey)used.push('또래 관계 설문 '+i.survey.roundLabel+' (응답 '+i.survey.respondents+'/'+i.survey.classSize+'명)');
  if(i.distance)used.push('마음거리 검사 (평정한 학생 '+i.distance.raters+'명)');
  if(i.observations)used.push('담임교사 관찰 기록 '+i.observations.count+'건');
  const refs=packet?SU().references(packet):[];
  return '<section class="su-sources"><h4>출처</h4><ul>'+used.map(u=>'<li>'+E(u)+'</li>').join('')+'</ul>'+(refs.length?'<ol>'+refs.map(r=>'<li>'+E(r.text)+' <a href="'+E(r.url)+'" target="_blank" rel="noopener noreferrer">'+E(r.url)+'</a></li>').join('')+'</ol>':'')
   +'<p class="su-disclaimer">교실 설문·교사 관찰을 바탕으로 한 학급 운영 참고 자료이며 진단이 아닙니다.</p></section>';
 }
 function mountClass(analysis){
  const host=document.getElementById('friends-content');if(!host||(analysis&&analysis.roundId==='all'))return;
  let box=document.getElementById('su-class');
  if(!box){box=document.createElement('section');box.id='su-class';box.className='card peer-analysis su-class';
   const anchor=document.getElementById('peer-class-ai')||document.getElementById('peer-class-portfolio');if(anchor)anchor.before(box);else host.append(box);}
  const g=gatherClass(analysis),packet=SU().buildClass(g.input),sig=JSON.stringify(SU().classPrompt(packet)),saved=classResults.get(g.roundId);
  const state=saved&&saved.sig===sig?saved:null,hasData=!!(g.input.survey||g.input.distance||g.input.observations);
  box.innerHTML='<div class="card-title">✨ AI 학급 결과지 · 우리 반 관계 한눈에</div><p>또래 설문·마음거리·교사 관찰을 모아 우리 반 관계의 흐름과 운영 방법을 정리해요. 학생 이름은 가린 채 AI에 보내요.</p>'
   +classOverview(g)
   +'<div class="su-toolbar"><button type="button" class="btn btn-gold" data-su-class-gen '+(classBusy||!hasData?'disabled':'')+'>'+(classBusy?'우리 반을 읽는 중…':state?'✨ 다시 만들기':'✨ AI 학급 결과지 만들기')+'</button>'
   +(state?'<button type="button" class="btn btn-secondary" data-su-class-print>🖨️ 인쇄</button>':'')+'</div>'
   +(state?'<div class="su-paper">'+classAiHtml(state.result)+classSources(state.packet,g)+'</div>':'');
  box.querySelector('[data-su-class-gen]').onclick=()=>generateClass(analysis);
  box.querySelector('[data-su-class-print]')?.addEventListener('click',()=>printHtml((root.settings?.className||'우리 반')+' 학급 결과지','<header class="su-head"><div><small>학급 결과지 · 교사용</small><h3>'+E(root.settings?.className||'우리 반')+'</h3></div><span>'+E(new Date().toLocaleDateString('ko-KR'))+'</span></header>'+classOverview(g)+classAiHtml(state.result)+classSources(state.packet,g)));
 }
 async function generateClass(analysis){
  if(classBusy)return;classBusy=true;mountClass(analysis);
  try{
   const g=gatherClass(analysis),packet=SU().buildClass(g.input),sig=JSON.stringify(SU().classPrompt(packet));
   const raw=await callTeachAI(SU().classPrompt(packet),{temperature:0.25,maxTokens:8000,allowPartial:false,continueOnLength:false});
   const r=SU().restoreClass(SU().validateClass(raw,packet),packet,roster());
   classResults.set(g.roundId,{sig,packet,result:r});showToast('학급 결과지를 만들었어요.');
  }catch(err){showToast('학급 결과지를 만들지 못했어요: '+err.message);}
  finally{classBusy=false;if(document.getElementById('su-class'))mountClass(analysisNow());}
 }
 const analysisNow=()=>{try{return analyzeFriends();}catch(_){return null;}};

 /* ── 자리배치 ── */
 function seatState(){
  const raw=load('tesk-seats',{});
  return {rows:Number(raw.rows)||4,cols:Number(raw.cols)||6,pairDesks:raw.pairDesks!==false,front:Array.isArray(raw.front)?raw.front.map(Number):[],
   apart:Array.isArray(raw.apart)?raw.apart.filter(p=>Array.isArray(p)&&p.length===2).map(p=>p.map(Number)):[],grid:Array.isArray(raw.grid)?raw.grid:null,seed:Number(raw.seed)||1,createdAt:raw.createdAt||''};
 }
 function seatRelations(st){
  const roundId=currentRound(),rel={conflict:[],distant:[],discomfort:[],close:[],warm:[],lowAcceptance:[],keepApart:st.apart,front:st.front};
  root.TeskObservations.pairs().filter(p=>p.negative).forEach(p=>rel.conflict.push([p.a,p.b,p.negative]));
  const d=distanceFor(roundId);
  d.pairs.forEach(p=>{if(p.kind==='distant')rel.distant.push([p.a,p.b]);if(p.kind==='close')rel.close.push([p.a,p.b]);});
  d.students.forEach(s=>{if(s.z!=null&&s.z<=-1)rel.lowAcceptance.push(s.num);s.warmFrom.forEach(f=>rel.warm.push([f,s.num]));});
  const a=analyzeFriends(roundId);
  if(a){(a.edges||[]).filter(e=>e.negative).forEach(e=>rel.discomfort.push([e.from,e.to]));
   const res=root.PeerRelationsUI.result(a);res.students.forEach(s=>{if(['neglected','rejected'].includes(s.status)||s.isolated)rel.lowAcceptance.push(s.num);});
   if(!d.raters)a.edges.filter(e=>!e.negative).forEach(e=>rel.warm.push([e.from,e.to]));}
  rel.lowAcceptance=[...new Set(rel.lowAcceptance)];
  return rel;
 }
 let seatPick=null;
 function seatsHtml(){
  const st=seatState(),rel=seatRelations(st);
  const sources=['교사 관찰 갈등 '+rel.conflict.length+'쌍','마음거리 먼 쌍 '+rel.distant.length+' · 가까운 쌍 '+rel.close.length,'설문 불편 지명 '+rel.discomfort.length+'건','교사 지정 떨어뜨리기 '+st.apart.length+'쌍'];
  let plan=null;
  if(st.grid&&st.grid.length===st.rows*st.cols){
   const cost=root.SeatPlanner.pairCost(rel);plan={grid:st.grid,rows:st.rows,cols:st.cols,pairDesks:st.pairDesks,notes:[]};
   for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++){const i=r*st.cols+c;
    [[i,c+1<st.cols?i+1:-1,st.pairDesks?(c%2===0?1:.45):1],[i,r+1<st.rows?i+st.cols:-1,.25]].forEach(([x,y,w])=>{if(y<0)return;const a=st.grid[x],b=st.grid[y];if(a==null||b==null)return;const k=cost.get(a,b);if(k.why.length&&k.cost)plan.notes.push({a,b,why:k.why,kind:k.cost>0?'watch':'good',desk:w===1});});}
  }
  const opts=roster().map(s=>'<option value="'+s.num+'">'+E(s.num+'. '+s.name)+'</option>').join('');
  return '<section class="card peer-analysis"><div class="card-title">🪑 자리배치 추천</div>'
   +'<p>교사 관찰 갈등·마음거리·친구 지명을 함께 보고 옆자리 조합을 추천해요. 갈등이 있었던 친구, 서로 멀다고 답한 친구는 떨어뜨리고, 반에서 외로운 학생은 그 학생을 가깝게 느끼는 친구 곁에 앉혀요. 학생 화면에는 이유가 보이지 않아요.</p>'
   +'<p class="peer-muted">반영한 자료: '+E(sources.join(' · '))+'</p>'
   +'<div class="obs-toolbar"><label>줄<input type="number" min="1" max="10" value="'+st.rows+'" data-seat="rows"></label><label>칸<input type="number" min="1" max="12" value="'+st.cols+'" data-seat="cols"></label>'
   +'<label class="obs-type-pick"><input type="checkbox" data-seat="pair" '+(st.pairDesks?'checked':'')+'> 두 명씩 짝 책상</label>'
   +'<button type="button" class="btn btn-primary" data-seat-make>추천 배치 만들기</button>'+(plan?'<button type="button" class="btn btn-secondary" data-seat-again>다른 배치 보기</button><button type="button" class="btn btn-secondary" data-seat-print>🖨️ 인쇄</button>':'')+'</div>'
   +'<details class="su-seat-opts"><summary>앞자리·떨어뜨리기 지정 (선택)</summary>'
   +'<div class="obs-field"><span>앞쪽에 앉힐 학생</span><div class="obs-chip-wrap">'+roster().map(s=>'<button type="button" class="obs-pick'+(st.front.includes(Number(s.num))?' involved':'')+'" data-seat-front="'+s.num+'">'+E(s.name)+'</button>').join('')+'</div></div>'
   +'<div class="obs-toolbar"><label>떨어뜨릴 학생<select data-apart-a>'+opts+'</select></label><label>와(과)<select data-apart-b>'+opts+'</select></label><button type="button" class="btn btn-secondary" data-apart-add>추가</button></div>'
   +(st.apart.length?'<div class="obs-chip-wrap">'+st.apart.map((p,i)=>'<span class="obs-student involved">'+E(nameOf(p[0])+' ↔ '+nameOf(p[1]))+' <button type="button" class="su-x" data-apart-del="'+i+'" aria-label="빼기">×</button></span>').join('')+'</div>':'')
   +'</details>'
   +(plan?seatGrid(plan)+'<p class="peer-muted">자리 두 개를 차례로 누르면 서로 바꿀 수 있어요.</p>'+seatNotes(plan):'')+'</section>';
 }
 function seatGrid(p){
  let html='<div class="su-board">교탁</div><div class="su-seats" style="grid-template-columns:repeat('+p.cols+',minmax(0,1fr))">';
  for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++){const i=r*p.cols+c,n=p.grid[i];
   const watch=p.notes.some(x=>x.kind==='watch'&&(x.a===n||x.b===n));
   html+='<button type="button" class="su-seat'+(n==null?' empty':'')+(watch?' watch':'')+(seatPick===i?' picked':'')+(p.pairDesks&&c%2===0?' left':'')+(p.pairDesks&&c%2===1?' right':'')+'" data-seat-i="'+i+'">'+(n==null?'빈자리':'<b>'+E(nameOf(n))+'</b><small>'+n+'번</small>')+'</button>';}
  return html+'</div>';
 }
 function seatNotes(p){
  const watch=p.notes.filter(x=>x.kind==='watch'),good=p.notes.filter(x=>x.kind==='good'&&x.desk);
  return '<div class="su-seat-notes">'+(watch.length?'<div><b>⚠ 가까이 앉은 주의 조합</b><ul>'+watch.map(x=>'<li>'+E(nameOf(x.a)+' · '+nameOf(x.b))+' — '+E(x.why.join(', '))+(x.desk?' (짝)':' (가까운 자리)')+'</li>').join('')+'</ul></div>':'<p>✅ 갈등·먼 거리 조합이 가까이 앉지 않았어요.</p>')
   +(good.length?'<div><b>💞 의도한 짝</b><ul>'+good.map(x=>'<li>'+E(nameOf(x.a)+' · '+nameOf(x.b))+' — '+E(x.why.join(', '))+'</li>').join('')+'</ul></div>':'')+'</div>';
 }
 function mountSeats(el){
  el.insertAdjacentHTML('beforeend','<div id="su-seat-panel">'+seatsHtml()+'</div>');
  bindSeats(el.querySelector('#su-seat-panel'));
 }
 function saveSeats(next){save('tesk-seats',next);}
 function redrawSeats(){const box=document.getElementById('su-seat-panel');if(!box)return;box.innerHTML=seatsHtml();bindSeats(box);}
 function makePlan(seed){
  const st=seatState(),box=document.getElementById('su-seat-panel');
  const rows=Math.max(1,Math.min(10,Number(box?.querySelector('[data-seat=rows]')?.value)||st.rows)),cols=Math.max(1,Math.min(12,Number(box?.querySelector('[data-seat=cols]')?.value)||st.cols));
  const pairDesks=box?.querySelector('[data-seat=pair]')?.checked??st.pairDesks;
  try{
   const p=root.SeatPlanner.plan({students:roster(),rows,cols,pairDesks,relations:seatRelations({...st,rows,cols}),seed});
   saveSeats({...st,rows,cols,pairDesks,grid:p.grid,seed,createdAt:new Date().toISOString()});seatPick=null;redrawSeats();
  }catch(err){showToast('⚠️ '+err.message);}
 }
 function bindSeats(box){
  if(!box)return;const st=seatState();
  box.querySelector('[data-seat-make]').onclick=()=>makePlan(st.seed);
  box.querySelector('[data-seat-again]')?.addEventListener('click',()=>makePlan(st.seed+1));
  box.querySelector('[data-seat-print]')?.addEventListener('click',()=>{const s=seatState();printHtml('자리배치','<header class="su-head"><div><small>'+E(root.settings?.className||'')+'</small><h3>자리배치</h3></div><span>'+E(new Date().toLocaleDateString('ko-KR'))+'</span></header>'+seatGrid({...s,notes:[]}));});
  box.querySelectorAll('[data-seat-front]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.seatFront),s=seatState();s.front=s.front.includes(n)?s.front.filter(x=>x!==n):[...s.front,n];saveSeats(s);redrawSeats();});
  box.querySelector('[data-apart-add]').onclick=()=>{const a=Number(box.querySelector('[data-apart-a]').value),b=Number(box.querySelector('[data-apart-b]').value),s=seatState();
   if(a===b){showToast('서로 다른 두 학생을 골라 주세요.');return;}if(!s.apart.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a)))s.apart.push([a,b]);saveSeats(s);redrawSeats();};
  box.querySelectorAll('[data-apart-del]').forEach(b=>b.onclick=()=>{const s=seatState();s.apart.splice(Number(b.dataset.apartDel),1);saveSeats(s);redrawSeats();});
  box.querySelectorAll('[data-seat-i]').forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.seatI),s=seatState();if(!s.grid)return;
   if(seatPick==null){seatPick=i;redrawSeats();return;}
   if(seatPick!==i){[s.grid[seatPick],s.grid[i]]=[s.grid[i],s.grid[seatPick]];saveSeats(s);}
   seatPick=null;redrawSeats();
  });
 }

 root.TeskUnderstanding={tabBar,setTab,renderOther,distanceHtml,distanceFor,openReport,closeReport,generate,gather,mountClass,generateClass,seatRelations,currentRound,get tab(){return tab;}};
})(window);
