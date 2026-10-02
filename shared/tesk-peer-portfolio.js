/* Teacher class summary: local counts only. Individual students are opened one at a time. */
(function(root){
 'use strict';
 const E=s=>root.PeerSurvey.escape(s),P=()=>root.PeerPortfolio;
 function overviewHtml(model){
  const b=model.belonging;
  return '<div class="peer-class-stats"><div><span>설문 응답</span><strong>'+model.respondents+' / '+model.total+'명</strong></div><div><span>아직 미응답</span><strong>'+model.missing+'명</strong></div><div><span>도움을 요청한 학생</span><strong>'+model.supportRequests+'명</strong><small>원하는 도움 문항 응답 '+model.requestAnswered+'명 기준</small></div></div>'
   +'<div class="peer-class-reading"><h4>우리 반에서 살펴볼 점</h4><ul>'+model.observations.map(t=>'<li>'+E(t)+'</li>').join('')+'</ul></div>'
   +'<details class="peer-class-distribution"><summary>우리 반에서 받아들여진다고 느낀 경험 · 문항 응답 '+b.answered+'명</summary><div class="peer-frequency">'+b.frequency.map(r=>'<div><span>'+E(r.label)+'</span><progress max="'+Math.max(1,b.answered)+'" value="'+r.count+'" aria-label="'+E(r.label)+' '+r.count+'명"></progress><b>'+r.count+'명</b></div>').join('')+'</div><p>상황 없음 '+b.notApplicable+'명 · 미응답 '+b.missing+'명. 미응답에는 아직 설문을 제출하지 않은 학생도 포함됩니다.</p></details>';
 }
 function quickHtml(model){
  const help=model.cards.filter(c=>c.asksHelp);
  return help.length?'<div class="peer-quick"><b>도움을 요청한 학생 바로 보기</b><div>'+help.map(c=>'<button type="button" class="btn btn-sm btn-secondary" data-peer-open="'+c.num+'">'+E(c.num+'. '+c.name)+'</button>').join('')+'</div></div>':'';
 }
 function mount(analysis,options){
  const box=document.getElementById('peer-class-portfolio');if(!box)return;
  const model=P().build(analysis,options.roster);
  box.innerHTML='<div class="peer-portfolio-heading"><div><div class="card-title">우리 반 친구 관계 요약</div><p>'+E(model.roundLabel)+' · 학생 한 명씩은 아래 “학생 찾아서 보기”에서 확인하세요.</p></div></div>'+overviewHtml(model)+quickHtml(model)+'<p class="insight-help">선택한 회차의 설문을 요약한 내용입니다. 상호 선택은 같은 영역에서 서로 선택한 관계이며, 선택되지 않았다고 친구가 없다는 뜻은 아닙니다.</p>';
  box.querySelectorAll('[data-peer-open]').forEach(b=>b.addEventListener('click',()=>options.select(Number(b.dataset.peerOpen))));
 }
 root.PeerPortfolioUI={mount};
})(window);
