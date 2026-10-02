/* Teacher-only per-student view: find one student and read the survey evidence. */
(function(root){
 'use strict';
 const E=s=>PeerSurvey.escape(s),A=()=>root.PeerAnalysis;
 let selected='';
 const student=()=>students.find(s=>Number(s.num)===Number(selected));
 const names=ns=>ns===null?'자료 없음':ns.map(n=>students.find(s=>Number(s.num)===n)?.name||n+'번').join(', ')||'선택 없음';
 const list=items=>'<ul>'+items.map(s=>'<li>'+E(s)+'</li>').join('')+'</ul>';
 function evidenceHtml(p){
  return '<p class="peer-scroll-hint">표는 좌우로 밀어 모든 열을 볼 수 있어요.</p><div class="peer-table"><table><thead><tr><th>관계 영역</th><th>내가 선택</th><th>나를 선택</th><th>같은 영역에서 서로 선택</th></tr></thead><tbody>'+p.domains.filter(d=>d.key!=='positive'||d.out?.length||d.incoming?.length).map(d=>'<tr><th>'+E(d.label)+'</th><td>'+E(d.out===null?'문항 응답 자료 없음':names(d.out))+'</td><td>'+E(d.incoming===null?'또래 응답 자료 없음':names(d.incoming))+'<small>응답한 친구 '+d.reporterCount+'명 기준</small></td><td>'+E(d.mutual===null?'확인할 수 없음':names(d.mutual))+(d.unknown.length?'<small>상대 응답 미확인: '+E(names(d.unknown))+'</small>':'')+'</td></tr>').join('')+'</tbody></table></div><p class="insight-help">빈 선택은 해당 설문의 기록입니다. 실제 친구가 없다는 뜻은 아닙니다. 가까워지고 싶은 관계는 현재 친밀 관계와 구분합니다.</p>';
 }
 function comparisonHtml(analysis,num){
  const options=_friendRoundOptions().filter(r=>r.id!==analysis.roundId);
  if(!options.length)return '<p>비교할 다른 회차가 아직 없습니다.</p>';
  const currentMeta=peskSurveyRounds?.[analysis.roundId];
  const chronological=options.filter(o=>peskSurveyRounds?.[o.id]?.createdAt&&currentMeta?.createdAt&&peskSurveyRounds[o.id].createdAt<currentMeta.createdAt).sort((a,b)=>String(peskSurveyRounds[b.id].createdAt).localeCompare(String(peskSurveyRounds[a.id].createdAt)));
  const id=options.some(o=>o.id===friendCompareRound)?friendCompareRound:(chronological[0]||options[0]).id;
  friendCompareRound=id;
  const previous=analyzeFriends(id);
  const selector='<label>비교 기준 <select id="peer-compare">'+options.map(o=>'<option value="'+E(o.id)+'" '+(o.id===id?'selected':'')+'>'+E(o.label)+'</option>').join('')+'</select></label>';
  if(!previous)return selector+'<p>비교 회차에 응답 자료가 없습니다.</p>';
  const c=A().compare(analysis,previous,num);
  const conditions=r=>[...new Set(r.rows.map(x=>x.schemaVersion?'문항 v'+x.schemaVersion+' · '+(x.timeframe||'기간 미기록')+' · 선택 한도 '+Object.entries(x.nominationLimits||{}).map(([k,v])=>(A().categories.find(d=>d.key===k)?.label||k)+' '+v+'명').join(' / '):'문항 버전·선택 한도 미기록'))].join('; ');
  return selector+'<p>'+E(previous.roundLabel)+' '+previous.uniqueResponders+'/'+students.length+'명 ('+previous.responseRate+'%) → '+E(analysis.roundLabel)+' '+analysis.uniqueResponders+'/'+students.length+'명 ('+analysis.responseRate+'%)</p><details><summary>두 회차의 조사 조건</summary><p>'+E(previous.roundLabel)+': '+E(conditions(previous))+'</p><p>'+E(analysis.roundLabel)+': '+E(conditions(analysis))+'</p></details>'+list(c.warnings)+'<div class="peer-table"><table><thead><tr><th>영역</th><th>비교 가능한 또래</th><th>받은 지명: 기준 → 현재</th><th>새로 확인된 상호 선택</th><th>이번에 확인되지 않은 상호 선택</th></tr></thead><tbody>'+c.domains.filter(d=>d.key!=='positive'||d.common).map(d=>'<tr><th>'+E(d.label)+'</th><td>'+d.common+'명</td><td>'+(d.common?d.incomingBefore+' → '+d.incomingNow:'비교 자료 없음')+'</td><td>'+E(d.newMutual===null?'본인 응답·조건 확인 필요':names(d.newMutual))+'</td><td>'+E(d.unconfirmedMutual===null?'본인 응답·조건 확인 필요':names(d.unconfirmedMutual))+(d.unknownPeers.length?'<small>상대 미응답·조건 차이로 비교 제외: '+E(names(d.unknownPeers))+'</small>':'')+'</td></tr>').join('')+'</tbody></table></div><p class="insight-help">이번에 선택하지 않았다는 사실만으로 관계가 끊어졌다고 판단하지 않습니다. 지명 수 변화로 개선·악화를 판정하지 않습니다.</p><b>두 회차 모두 답한 자기보고</b>'+ (c.self.length?list(c.self.map(q=>q.label+' '+PeerSurvey.frequency[q.before-1]+' → '+PeerSurvey.frequency[q.now-1])):'<p>같은 문항에 답한 자료가 없습니다. 새 문항·미응답·상황 없음은 변화량에서 제외합니다.</p>');
 }
 function draw(analysis){
  const s=student(),box=document.getElementById('friend-focus-detail');if(!box||!s)return;
  const p=A().profile(analysis,s.num);
  // 1~5: 관계 지도·또래 수용도·마음거리·사회성 평정·교사 관찰 (shared/tesk-peer-relations.js)
  box.innerHTML='<div class="su-detail-head"><h3>'+E(s.num+'. '+s.name)+' · '+(p.submitted?'응답 완료':'본인 미응답')+'</h3>'
   +(root.TeskUnderstanding?'<button type="button" class="btn btn-gold" onclick="TeskUnderstanding.openReport('+Number(s.num)+')">✨ AI 학생 이해 결과지</button>':'')+'</div>'
   +(root.PeerRelationsUI?PeerRelationsUI.studentHtml(analysis,s.num):'')
   +'<h4>6. 학생이 느끼는 관계 (자기보고)</h4><pre class="pr-self">'+E(PeerSurvey.evidence(p.reflection))+'</pre>'
   +'<details><summary>7. 영역별 지명 원자료</summary>'+evidenceHtml(p)+'</details>'
   +'<h4>8. 회차 변화 비교</h4>'+comparisonHtml(analysis,s.num)+'<details class="peer-ai"><summary>9. AI로 친구 관계와 학생 서술 정밀 분석</summary><p>학생이 고른 친구 관계와 직접 쓴 서술(편안했던 순간·어려웠던 순간·앞으로 바라는 점)을 함께 읽고, 서술에 드러난 장면·감정·바람과 물어볼 질문·도와줄 방법을 정리해 드려요. 결과는 선생님이 학생과 이야기하며 확인해 주세요.</p>'+_friendStudentAiHtml({num:s.num},analysis.roundId)+_friendStudentAiResultHtml({num:s.num},analysis.roundId)+'</details>';
  document.getElementById('peer-compare')?.addEventListener('change',e=>{friendCompareRound=e.target.value;draw(analysis);});
  root.PeerRelationsUI?.bindStudent(box,analysis,s.num);
 }
 const find=q=>{q=String(q).trim().toLocaleLowerCase();return q?students.filter(s=>String(s.num)===q||String(s.name||'').toLocaleLowerCase().includes(q)).sort((a,b)=>a.num-b.num):[];};
 function mount(analysis){
  const wrap=document.getElementById('peer-analysis-card');if(!wrap||!analysis||analysis.roundId==='all')return;
  if(!students.some(s=>String(s.num)===selected))selected=String(students.slice().sort((a,b)=>a.num-b.num)[0]?.num||'');
  wrap.innerHTML='<div class="card-title">학생 찾아서 보기</div><div class="peer-find"><label>이름 또는 번호로 찾기<input id="friend-find" type="search" autocomplete="off" placeholder="예: 하늘 또는 3"></label><label>학생 선택<select id="friend-focus">'+students.slice().sort((a,b)=>a.num-b.num).map(s=>'<option value="'+s.num+'" '+(String(s.num)===selected?'selected':'')+'>'+E(s.num+'. '+s.name)+'</option>').join('')+'</select></label></div><div id="friend-find-results" class="peer-find-results" aria-live="polite"></div><div id="friend-focus-detail"></div>';
  document.getElementById('friend-focus').addEventListener('change',e=>{selected=e.target.value;draw(analysis);});
  const input=document.getElementById('friend-find'),results=document.getElementById('friend-find-results');
  const show=()=>{const hits=find(input.value);results.innerHTML=!input.value.trim()?'':hits.length?hits.slice(0,12).map(s=>'<button type="button" class="btn btn-sm btn-secondary" data-find="'+s.num+'">'+E(s.num+'. '+s.name)+'</button>').join(''):'<span class="peer-muted">찾는 학생이 없어요.</span>';results.querySelectorAll('[data-find]').forEach(b=>b.addEventListener('click',()=>{input.value='';results.innerHTML='';select(Number(b.dataset.find));}));};
  input.addEventListener('input',show);
  root.PeerRelationsUI?.mountClass(analysis,select);
  input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const hits=find(input.value);if(hits.length){input.value='';results.innerHTML='';select(hits[0].num);}});
  draw(analysis);
 }
 function open(num){selected=String(num);friendRoundView=activePeskSurveyRoundId||'round-1';goPage('friends');}
 function select(num){
  const analysis=analyzeFriends();if(!analysis){showToast('이 회차의 설문 응답이 도착하면 상세 분석을 볼 수 있어요.');return;}
  selected=String(num);
  const dropdown=document.getElementById('friend-focus');if(dropdown)dropdown.value=selected;
  draw(analysis);document.getElementById('friend-focus-detail')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function mountPortfolio(analysis){root.PeerPortfolioUI?.mount(analysis,{roster:students,select});}
 function recordLink(){const box=document.getElementById('record-notes-panel');if(!box||box.querySelector('[data-peer-link]'))return;const b=document.createElement('button');b.className='btn btn-secondary';b.dataset.peerLink='';b.textContent='친구 관계 분석 보기';b.onclick=()=>open(selectedRecordStudent);box.prepend(b);}
 root.PeerTeacher={mount,open,select,recordLink,mountPortfolio};
})(window);
