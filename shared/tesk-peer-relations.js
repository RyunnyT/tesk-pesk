/* 친구 관계 정밀 분석 화면 (교사 전용) — shared/peer-relations.js 의 계산을 보여 준다.
   학생 상세: 관계 지도(교사 관찰 겹침) · 또래 수용도 · 교사 사회성 평정.
   학급 요약: 친한 무리 · 관심이 필요한 학생.
   사회성 평정은 classrooms/{학급}/peer-support/social-skills/entries/{번호} 에 저장한다(교사만 읽고 쓰는 경로). */
(function(root){
 'use strict';
 const R=()=>root.PeerRelations,E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nameOf=n=>students.find(s=>Number(s.num)===Number(n))?.name||n+'번';
 const ratings=new Map();let ratingsRoom='',ratingsLoading=null;

 // analyzeFriends 의 rows(지명은 번호·이름·계정 등)를 학생 번호로 정리한다
 function normalizedRows(analysis){
  const ref=v=>{const s=typeof _studentByFriendRef==='function'?_studentByFriendRef(v):students.find(x=>Number(x.num)===Number(v));return s?Number(s.num):null;};
  return (analysis?.rows||[]).map(r=>{const from=ref(r.studentNum??r.accountUid??r.studentName);if(!from)return null;
   const categories={};Object.entries(r.categories||{}).forEach(([k,v])=>{categories[k]=(Array.isArray(v)?v:[]).map(ref).filter(n=>n&&n!==from);});
   return {studentNum:from,categories,categoryKeys:r.categoryKeys||Object.keys(r.categories||{})};}).filter(Boolean);
 }
 let cache={key:'',result:null};
 function result(analysis){
  const rows=normalizedRows(analysis),key=JSON.stringify([analysis?.roundId,rows,students.map(s=>s.num)]);
  if(cache.key!==key)cache={key,result:R().analyze(rows,students)};
  return cache.result;
 }

 /* ── 사회성 평정 저장소 ── */
 const ratingsCol=()=>_fsCollection(_db,'classrooms',TESK_ROOM,'peer-support','social-skills','entries');
 async function loadRatings(){
  if(ratingsRoom===TESK_ROOM)return;
  if(ratingsLoading)return ratingsLoading;
  if(!root._fbReady||!root._db||!root._fsGetDocs)return;
  ratingsLoading=(async()=>{try{const snap=await _fsGetDocs(ratingsCol());ratings.clear();snap.docs.forEach(d=>ratings.set(Number(d.id),d.data()));ratingsRoom=TESK_ROOM;}
   catch(e){console.warn('사회성 평정 불러오기 실패',e);}finally{ratingsLoading=null;}})();
  return ratingsLoading;
 }
 async function saveRating(num,raw){
  const rating=R().normalizeRating({...raw,studentNum:num});
  if(!root._fbReady||!root._db)throw new Error('서버 연결 후 다시 저장해주세요.');
  await _fsSetDoc(_fsDoc(ratingsCol(),String(num)),rating);
  ratings.set(Number(num),rating);return rating;
 }

 /* ── 학생 상세 ── */
 const TONE={close:'친함',mutual:'서로',in:'받음',out:'보냄',conflict:'갈등'};
 const cats=ks=>ks.map(k=>R().LABEL[k]).join(' · ')||'—';
 function relationTable(s){
  const obs=new Map((root.TeskObservations?.summary(s.num)?.peers||[]).map(p=>[p.num,p]));
  const obsCell=n=>{const p=obs.get(n);return p?'<span class="pr-chip '+(p.negative?'conflict':'mutual')+'">'+(p.negative?'갈등 '+p.negative+'건':'')+(p.negative&&p.positive?' · ':'')+(p.positive?'긍정 '+p.positive+'건':'')+(!p.negative&&!p.positive?'관찰 '+p.count+'건':'')+'</span>':'<span class="peer-muted">—</span>';};
  // 설문 지명은 없지만 교사가 관찰한 친구도 함께 보여 줍니다
  const onlyObs=[...obs.keys()].filter(n=>!s.relations.some(r=>r.peer===n));
  const extra=onlyObs.length?'<p class="peer-muted">설문 지명은 없지만 교사 관찰에 함께 나온 친구: '+onlyObs.map(n=>E(nameOf(n))+' '+obsCell(n)).join(' ')+'</p>':'';
  if(!s.relations.length)return '<p class="peer-muted">이번 회차에서 이 학생과 연결된 지명이 없어요.</p>'+extra;
  const count=t=>s.relations.filter(r=>r.tone===t).length;
  return '<div class="pr-summary">'+['close','mutual','in','out','conflict'].map(t=>'<span class="pr-chip '+t+'">'+TONE[t]+' '+count(t)+'명</span>').join('')+'</div>'
   +'<div class="peer-table"><table class="pr-table"><thead><tr><th>친구</th><th>관계(설문)</th><th>이 학생이 고른 영역</th><th>친구가 고른 영역</th><th>교사 관찰</th></tr></thead><tbody>'
   +s.relations.map(r=>'<tr class="pr-'+r.tone+'"><th>'+E(nameOf(r.peer))+'</th><td><span class="pr-chip '+r.tone+'">'+E(r.type)+'</span></td><td>'+E(cats(r.out))+'</td><td>'+E(cats(r.inc))+'</td><td>'+obsCell(r.peer)+'</td></tr>').join('')
   +'</tbody></table></div>'+extra;
 }
 function acceptanceHtml(s,res){
  const st=R().STATUS[s.status];
  const bar=(v,m,label,cls)=>{const max=Math.max(v,m,1)*1.25;return '<div class="pr-bar '+cls+'"><span>'+label+'</span><i style="width:'+Math.round(v/max*100)+'%"></i><b>'+v+'명</b><small>반 평균 '+m+'명</small></div>';};
  return '<div class="pr-status '+s.status+'"><b>'+E(st.teacher)+'</b>'+(s.isolated?'<span class="pr-chip conflict">서로 친한 친구·받은 긍정 지명 없음</span>':'')+'</div>'
   +bar(s.posIn,res.means.pos,'긍정 지명 받음','pos')+bar(s.negIn,res.means.neg,'불편 지명 받음','neg')
   +'<ul class="pr-facts"><li>서로 친한 친구 <b>'+s.close.length+'명</b>'+(s.close.length?' — '+E(s.close.map(nameOf).join(', ')):'')+'</li>'
   +'<li>친한 무리 '+(s.groups.length?s.groups.map(g=>'<b>['+E(g.map(nameOf).join(', '))+']</b>').join(' '):'<b>없음</b>')+'</li>'
   +'<li>리더로 꼽힘 <b>'+s.leaderIn+'명</b> · 함께 공부하고 싶은 친구로 꼽힘 <b>'+s.studyIn+'명</b> · 마음을 나누고 싶은 친구로 꼽힘 <b>'+s.supportIn+'명</b> · 가까워지고 싶어 하는 친구 <b>'+s.aspireIn+'명</b></li>'
   +'<li>보낸 긍정 지명 '+(s.posOut==null?'<b>본인 미응답</b>':'<b>'+s.posOut+'명</b> · 되돌려 받은 비율 <b>'+(s.reciprocity==null?'—':s.reciprocity+'%')+'</b>')+'</li>'
   +'<li class="peer-muted">또래 지위: Coie-Dodge 방식(긍정·불편 지명을 반 안에서 표준화, 선호 z='+s.zPos+' · 불편 z='+s.zNeg+') · 응답 '+res.reporters+'/'+res.classSize+'명</li></ul>';
 }
 function ratingHtml(num){
  const r=ratings.get(Number(num))||{scores:{}},sc=R().skillScores(r);
  return '<form class="pr-rating" data-rating="'+num+'">'+R().SKILLS.map(d=>'<fieldset><legend>'+E(d.label)+(sc.domains.find(x=>x.key===d.key).score!=null?' <b>'+sc.domains.find(x=>x.key===d.key).score+'</b>':'')+'</legend>'
    +d.items.map((item,i)=>{const key=d.key+'.'+i;return '<div class="pr-item"><span>'+E(item)+'</span><div class="pr-scale">'+R().SCALE.map((label,v)=>'<label><input type="radio" name="'+key+'" value="'+(v+1)+'"'+(Number(r.scores?.[key])===v+1?' checked':'')+'><span>'+E(label)+'</span></label>').join('')+'</div></div>';}).join('')+'</fieldset>').join('')
   +'<label class="pr-note">평정 메모 (선택 · AI 학생 이해 결과지에 함께 반영돼요)<textarea name="note" rows="2">'+E(r.note||'')+'</textarea></label>'
   +'<div class="pr-rating-foot"><span class="peer-muted">'+(sc.rated?'평정한 영역 '+sc.rated+'/6 · 강점: '+E(sc.strengths.join(', ')||'—')+' · 보완: '+E(sc.needs.join(', ')||'—'):'아직 평정하지 않았어요.')+(r.updatedAt?' · 저장 '+E(String(r.updatedAt).slice(0,10)):'')+'</span><button type="submit" class="btn btn-sm btn-primary">평정 저장</button></div></form>';
 }
 function studentHtml(analysis,num){
  const res=result(analysis),s=res.students.get(Number(num));if(!s)return '';
  return '<section class="pr-section"><h4>1. 관계 지도 · 누구와 어떤 관계인지</h4>'+relationTable(s)+'</section>'
   +'<section class="pr-section"><h4>2. 또래 수용도와 친한 무리</h4>'+acceptanceHtml(s,res)+'</section>'
   +'<section class="pr-section"><h4>3. 마음거리 검사</h4>'+(root.TeskUnderstanding?TeskUnderstanding.distanceHtml(analysis,num):'')+'</section>'
   +'<section class="pr-section"><h4>4. 사회성 (교사 평정)</h4><div id="pr-rating-box">'+(ratingsRoom===TESK_ROOM?ratingHtml(num):'<p class="peer-muted">평정 기록을 불러오는 중…</p>')+'</div></section>'
   +'<section class="pr-section"><h4>5. 교사 관찰 누가기록</h4>'+(root.TeskObservations?TeskObservations.studentHtml(num):'')+'</section>';
 }
 function bindStudent(box,analysis,num){
  if(!box)return;
  const bindForm=()=>{const form=box.querySelector('form[data-rating]');if(!form)return;form.addEventListener('submit',async e=>{e.preventDefault();
   const btn=form.querySelector('[type=submit]'),scores={};form.querySelectorAll('input[type=radio]:checked').forEach(i=>scores[i.name]=Number(i.value));
   btn.disabled=true;try{await saveRating(num,{scores,note:form.note.value});showToast('사회성 평정을 저장했어요.');box.querySelector('#pr-rating-box').innerHTML=ratingHtml(num);bindForm();}
   catch(err){showToast('저장하지 못했어요: '+err.message);btn.disabled=false;}});};
  if(ratingsRoom===TESK_ROOM)bindForm();
  else loadRatings().then(()=>{const b=box.querySelector('#pr-rating-box');if(b&&ratingsRoom===TESK_ROOM){b.innerHTML=ratingHtml(num);bindForm();}
   else if(b)b.innerHTML='<p class="peer-muted">평정 기록을 불러오지 못했어요. 새로고침 후 다시 열어 주세요.</p>';});
 }

 /* ── 학급 요약 ── */
 function classHtml(analysis){
  const res=result(analysis),list=[...res.students.values()];
  const by=st=>list.filter(s=>s.status===st);
  const watch=list.filter(s=>['neglected','rejected'].includes(s.status)||s.isolated);
  const chips=ss=>ss.map(s=>'<button type="button" class="pr-chip-btn" data-pr-open="'+s.num+'">'+E(nameOf(s.num))+'</button>').join(' ')||'<span class="peer-muted">없음</span>';
  return '<div class="card-title">학급 관계 한눈에</div>'
   +(res.reporters<R().MIN_REPORTERS?'<p class="peer-muted">응답한 학생이 '+R().MIN_REPORTERS+'명보다 적어 또래 지위는 계산하지 않았어요.</p>':'')
   +'<div class="pr-class"><div><b>친한 무리 '+res.groups.length+'개</b><ul>'+(res.groups.map(g=>'<li>'+chips(g.map(n=>res.students.get(n)))+'</li>').join('')||'<li class="peer-muted">3명 이상 서로 친한 무리가 아직 없어요.</li>')+'</ul></div>'
   +(res.reporters<R().MIN_REPORTERS?'</div>':'<div><b>관심이 필요한 학생 '+watch.length+'명</b><p class="peer-muted">소외형·거부형이거나 서로 친한 친구와 받은 긍정 지명이 모두 없는 학생</p>'+chips(watch)+'</div>'
   +'<div><b>또래 지위 분포</b><ul class="pr-dist">'+['popular','average','controversial','neglected','rejected'].map(k=>'<li><span>'+E(R().STATUS[k].teacher)+'</span> '+chips(by(k))+'</li>').join('')+'</ul></div></div>');
 }
 function mountClass(analysis,select){
  const card=document.getElementById('peer-analysis-card');if(!card||!analysis||analysis.roundId==='all')return;
  let box=document.getElementById('pr-class-card');
  if(!box){box=document.createElement('div');box.id='pr-class-card';box.className='card peer-analysis';card.before(box);}
  box.innerHTML=classHtml(analysis);
  box.querySelectorAll('[data-pr-open]').forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.prOpen))));
 }

 root.PeerRelationsUI={studentHtml,bindStudent,mountClass,result,loadRatings,ratingOf:num=>ratings.get(Number(num))||null,_ratings:ratings};
})(window);
