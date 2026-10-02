/* Teacher-only class analysis. Results remain in memory and are bound to a snapshot. */
(function(root){
 'use strict';
 const AI=root.PeerClassAI,E=root.PeerSurvey.escape,results=new Map(),busy=new Set();
 const key=(room,round)=>JSON.stringify([room,round]);
 function snapshot(round){
  const analysis=analyzeFriends(round)||{roundId:round,roundLabel:_friendRoundLabel(round),rows:[]};
  const packet=AI.build(analysis,students);
  return {packet,signature:JSON.stringify([TESK_ROOM,students.map(s=>[s.num,s.name,accountUidForStudent(s.num)]),analysis.rows,packet])};
 }
 function current(){return snapshot(friendRoundView);}
 function mount(analysis){
  if(!analysis||analysis.roundId==='all')return;
  const portfolio=document.getElementById('peer-class-portfolio');if(!portfolio)return;
  let box=document.getElementById('peer-class-ai');
  if(!box){box=document.createElement('section');box.id='peer-class-ai';box.className='card peer-analysis';portfolio.before(box);}
  const room=TESK_ROOM,round=analysis.roundId,k=key(room,round),state=snapshot(round),saved=results.get(k);
  const result=saved?.signature===state.signature?saved:null;
  const participation=state.packet.facts[0].value;
  box.innerHTML='<div class="card-title">학급 전체 친구 관계 분석</div>'
   +'<p>관계 영역과 학생들이 직접 쓴 서술을 함께 정밀하게 읽고, 우리 반의 강점·먼저 확인할 점·학급 활동·재확인 방법을 정리해요.</p>'
   +'<p>'+E(analysis.roundLabel)+' · 응답 '+participation.응답+'/'+participation.학급+'명 · 미응답 '+participation.미응답+'명</p>'
   +'<p class="insight-help">현재 회차의 설문 집계와 명단에 등록된 이름을 가린 자유서술을 설정한 AI로 보냅니다. 결과는 교사용이며 새로고침하면 사라집니다.</p>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-gold" data-class-generate '+(busy.has(k)||!participation.응답?'disabled':'')+'>'+(busy.has(k)?'학급 전체를 분석하는 중…':result?'학급 전체 다시 분석':'AI 학급 전체 분석')+'</button>'
   +'<button class="btn btn-secondary" data-class-print '+(!result?'disabled':'')+'>분석 인쇄 / PDF 저장</button></div>'
   +'<p role="status" data-class-status>'+(saved&&!result?'설문 자료가 바뀌어 이전 분석을 숨겼어요. 최신 자료로 다시 분석해주세요.':!participation.응답?'이 회차의 응답이 도착하면 분석할 수 있어요.':'')+'</p>'
   +'<details><summary>분석 근거와 상세 프롬프트 보기</summary><button class="btn btn-sm btn-secondary" data-class-copy>현재 자료를 포함한 프롬프트 복사</button><pre class="peer-prompt">'+E(AI.prompt(state.packet))+'</pre></details>'
   +(result?'<div data-class-result>'+Object.entries(AI.sections).map(([s,meta])=>'<h4>'+E(meta.label)+'</h4>'+(result.value[s].length?result.value[s].map(row=>'<div style="border-top:1px solid var(--border);padding:12px 0">'+meta.fields.map(f=>'<p><b>'+E(({interpretation:'확인할 해석',question:'확인 질문',action:'실행',purpose:'연결 이유',followUp:'재확인',reason:'한계'})[f])+':</b> '+E(row[f])+'</p>').join('')+'<details><summary>사용한 설문 근거</summary><pre class="peer-prompt">'+E(row.evidenceIds.map(id=>AI.factText(state.packet.facts.find(f=>f.id===id))).join('\n'))+'</pre></details></div>').join(''):'<p>이 자료로 제안할 근거가 충분하지 않습니다.</p>')).join('')+(result.value.dropped?'<p class="insight-help">근거나 표현 규칙을 벗어난 AI 항목 '+result.value.dropped+'개는 제외했어요.</p>':'')+'<p class="insight-help">근거 연결·형식 검사는 해석의 정확성을 보장하지 않습니다. 학생의 설명과 실제 관찰로 확인해주세요.</p></div>':'');
  box.querySelector('[data-class-generate]').onclick=generate;
  box.querySelector('[data-class-print]').onclick=print;
  box.querySelector('[data-class-copy]').onclick=async()=>{
   try{await navigator.clipboard.writeText(AI.prompt(current().packet));showToast('학급 분석 프롬프트를 복사했어요.');}
   catch(e){showToast('복사하지 못했어요. 펼쳐진 프롬프트를 직접 선택해 복사해주세요.');}
  };
 }
 async function generate(){
  const room=TESK_ROOM,round=friendRoundView,k=key(room,round);if(busy.has(k)||round==='all')return;
  const state=snapshot(round);if(!state.packet.facts[0].value.응답)return;
  busy.add(k);mount({roundId:round,roundLabel:state.packet.roundLabel});
  try{
   const raw=await callTeachAI(AI.prompt(state.packet),{temperature:0.15,maxTokens:16384,thinkingBudget:4096,json:true,responseSchema:AI.schema(state.packet),allowPartial:false,continueOnLength:false,timeoutMs:180000});
   const value=AI.validate(raw,state.packet);
   if(room!==TESK_ROOM||snapshot(round).signature!==state.signature)throw Error('분석 중 학급이나 설문 자료가 바뀌었어요. 최신 자료로 다시 분석해주세요.');
   results.set(k,{value,signature:state.signature});
   if(friendRoundView===round)showToast('학급 전체 분석을 만들었어요. 근거와 함께 확인해주세요.');
  }catch(e){
   if(room===TESK_ROOM&&friendRoundView===round){
    busy.delete(k);mount({roundId:round,roundLabel:state.packet.roundLabel});
    const status=document.querySelector('[data-class-status]');if(status)status.textContent='분석하지 못했어요. '+e.message;
    return;
   }
  }finally{
   const wasBusy=busy.delete(k);
   if(wasBusy&&room===TESK_ROOM&&friendRoundView===round&&document.getElementById('peer-class-ai'))mount({roundId:round,roundLabel:state.packet.roundLabel});
  }
 }
 function print(){
  const state=current(),saved=results.get(key(TESK_ROOM,friendRoundView));
  if(!saved||saved.signature!==state.signature)return showToast('최신 설문으로 다시 분석해주세요.');
  const w=root.open('','_blank');if(!w)return showToast('팝업 차단을 해제해주세요.');
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>학급 전체 친구 관계 분석</title><style>body{font-family:Malgun Gothic,sans-serif;margin:28px;line-height:1.8}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}@media print{button{display:none}}</style></head><body><button onclick="window.print()">인쇄 / PDF 저장</button><pre>'+E(AI.text(saved.value,state.packet))+'</pre></body></html>');
  w.document.close();
 }
 root.PeerClassUI={mount,generate,print};
})(window);
