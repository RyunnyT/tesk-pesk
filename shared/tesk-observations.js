/* 교사 관찰 기록 탭 (교사 전용) — 사건 단위로 기록하고, 엑셀(학생기록 양식)에서 관찰 기록만 불러옵니다.
   원본은 'tesk-observations' 한 곳에 두고, 관련 학생의 생활기록부 누가기록에 같은 내용을 연결합니다.
   (누가기록 쪽 메모는 obsId 로 묶여 있어 여기서 고치거나 지우면 함께 바뀝니다.) */
(function(root){
 'use strict';
 const O=()=>root.ObservationCore,E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nameOf=n=>students.find(s=>Number(s.num)===Number(n))?.name||n+'번';
 const roster=()=>students.slice().sort((a,b)=>Number(a.num)-Number(b.num));
 let list=[];
 let filterStudent='',filterType='',editing=null,form=null,preview=null,typesTouched=false;

 function reload(){
  const raw=load('tesk-observations',[]);
  list=(Array.isArray(raw)?raw:[]).map(e=>O().normalize(e)).filter(e=>e.date&&e.text);
 }
 function persist(){
  save('tesk-observations',list);
  // 생활기록부 누가기록 연결
  if(O().syncNotes(records,list,_ensureRecord)){
   save('tesk-records',records);
   if(document.getElementById('page-records')?.classList.contains('active')&&typeof renderNotesPanel==='function')renderNotesPanel();
  }
 }
 const all=()=>list;
 const summary=num=>{const s=O().studentSummary(list,num);s.list=s.list.map(e=>decorate(e,num));return s;};
 const pairs=()=>O().pairs(list);
 function decorate(e,num){
  const me=e.students.find(s=>s.num===Number(num));
  return {...e,typeLabels:e.types.map(O().typeLabel),outcomeLabel:O().OUTCOMES.find(o=>o.key===e.outcome)?.label||'',role:me?O().ROLES[me.role]:'',flags:O().flagsOf(e.text)};
 }
 /* 안전 신호: 누가 그 행동을 했는지는 규칙으로 알 수 없으므로 '관련 사건에 기록됨'과 날짜로 알립니다 */
 function flagsFor(num){
  const dates=new Map();
  O().forStudent(list,num).forEach(e=>O().flagsOf(e.text).forEach(k=>dates.set(k,[...(dates.get(k)||[]),e.date])));
  return O().FLAGS.filter(f=>dates.has(f.key)).map(f=>({...f,label:'관련 사건에 '+f.label+' 기록 ('+[...new Set(dates.get(f.key))].sort().join(', ')+')'}));
 }

 /* ── 화면 조각 ── */
 const typeChip=k=>{const t=O().TYPES.find(x=>x.key===k);return '<span class="obs-type '+E(k)+'">'+E(t?.label||k)+'</span>';};
 const flagHtml=text=>O().FLAGS.filter(f=>f.re.test(text)).map(f=>'<div class="obs-flag" role="alert"><b>⚠ '+E(f.label)+'</b> '+E(f.action)+'</div>').join('');
 function studentChips(e){
  return e.students.map(s=>'<span class="obs-student '+s.role+'">'+E(nameOf(s.num))+(s.role==='mentioned'?' <small>언급</small>':'')+'</span>').join('');
 }
 function card(e){
  const out=O().OUTCOMES.find(o=>o.key===e.outcome);
  return '<article class="obs-card'+(O().isNegative(e)?' negative':'')+'" data-obs="'+E(e.id)+'">'
   +'<div class="obs-card-head"><span class="obs-date">'+E(e.date)+'</span>'+e.types.map(typeChip).join('')+(out?.key?'<span class="obs-outcome">'+E(out.label)+'</span>':'')
   +(e.source==='excel'?'<span class="peer-muted">엑셀</span>':'')
   +'<span class="obs-actions"><button type="button" class="btn btn-sm btn-secondary" data-obs-edit="'+E(e.id)+'">수정</button><button type="button" class="btn btn-sm btn-coral" data-obs-del="'+E(e.id)+'">삭제</button></span></div>'
   +'<div class="obs-students">'+studentChips(e)+'</div>'+flagHtml(e.text)
   +'<p class="obs-text">'+E(e.text)+'</p>'+(e.action?'<p class="obs-action">조치: '+E(e.action)+'</p>':'')+'</article>';
 }
 function summaryHtml(num){
  const s=O().studentSummary(list,num);
  if(!s.count)return '<p class="peer-muted">'+E(nameOf(num))+' 학생의 관찰 기록이 아직 없어요.</p>';
  return '<div class="obs-summary"><b>'+E(nameOf(num))+'</b> · 관찰 '+s.count+'건 (갈등 '+s.negative+' · 긍정 '+s.positive+')'
   +(s.repeated?' <span class="pr-chip conflict">반복 관찰</span>':'')
   +' · '+Object.entries(s.byType).map(([k,n])=>E(O().typeLabel(k))+' '+n).join(', ')
   +(s.peers.length?'<br>함께 관찰된 친구: '+s.peers.map(p=>E(nameOf(p.num))+' '+p.count+'건').join(', '):'')+'</div>'
   +flagsFor(num).map(f=>'<div class="obs-flag" role="alert"><b>⚠ '+E(f.label)+'</b> '+E(f.action)+'</div>').join('');
 }
 /* 친구 관계 학생 상세에 들어가는 '교사 관찰 누가기록' */
 function studentHtml(num){
  const mine=O().forStudent(list,num);
  return summaryHtml(num)+(mine.length?'<div class="obs-list compact">'+mine.slice(0,8).map(e=>'<div class="obs-mini"><span class="obs-date">'+E(e.date)+'</span>'+e.types.map(typeChip).join('')
   +'<span class="obs-mini-text">'+E(e.text)+'</span></div>').join('')+(mine.length>8?'<p class="peer-muted">외 '+(mine.length-8)+'건</p>':'')+'</div>':'')
   +'<button type="button" class="btn btn-sm btn-secondary" onclick="TeskObservations.openStudent('+Number(num)+')">관찰 기록 탭에서 보기·추가</button>';
 }

 /* ── 입력 폼 ── 학생 칩을 누를 때마다 당사자 → 언급 → 선택 해제 */
 function blank(){return {date:typeof _todayDate==='function'?_todayDate():new Date().toISOString().slice(0,10),text:'',action:'',students:filterStudent?[{num:Number(filterStudent),role:'involved'}]:[],types:[],outcome:''};}
 function formHtml(){
  const f=form;
  return '<form class="card peer-analysis obs-form" id="obs-form"><div class="card-title">'+(editing?'관찰 기록 수정':'새 관찰 기록')+'</div>'
   +'<div class="obs-form-grid"><label>날짜<input type="date" name="date" value="'+E(f.date)+'" required></label>'
   +'<label>결과<select name="outcome">'+O().OUTCOMES.map(o=>'<option value="'+o.key+'" '+(f.outcome===o.key?'selected':'')+'>'+E(o.label)+'</option>').join('')+'</select></label></div>'
   +'<div class="obs-field"><span>관련 학생 <small class="peer-muted">한 번 누르면 당사자, 두 번 누르면 언급(이야기에만 나온 친구)</small></span><div class="obs-chip-wrap">'
   +roster().map(s=>{const hit=f.students.find(x=>x.num===Number(s.num));return '<button type="button" class="obs-pick '+(hit?hit.role:'')+'" data-pick="'+s.num+'" aria-pressed="'+!!hit+'">'+E(s.num+'. '+s.name)+(hit?.role==='mentioned'?' · 언급':'')+'</button>';}).join('')+'</div></div>'
   +'<label class="obs-field">관찰 내용<textarea name="text" rows="4" placeholder="있었던 일을 사실대로 적어 주세요. 예: 쉬는 시간에 ○○이 △△의 등을 때림. 이유를 묻자 놀림을 받았다고 함.">'+E(f.text)+'</textarea></label>'
   +'<div id="obs-form-flags">'+flagHtml(f.text)+'</div>'
   +'<div class="obs-field"><span>유형 <small class="peer-muted">내용을 보고 자동으로 골라 두어요. 직접 바꿀 수 있어요.</small></span><div class="obs-chip-wrap">'
   +O().TYPES.map(t=>'<label class="obs-type-pick"><input type="checkbox" name="types" value="'+t.key+'" '+(f.types.includes(t.key)?'checked':'')+'> '+E(t.label)+'</label>').join('')+'</div></div>'
   +'<label class="obs-field">교사 조치 (선택)<input name="action" value="'+E(f.action)+'" placeholder="예: 두 학생과 각각 이야기 나눔, 사과하고 화해함"></label>'
   +'<div class="obs-form-foot"><button type="button" class="btn btn-secondary" data-obs-cancel>취소</button><button type="submit" class="btn btn-primary">저장</button></div></form>';
 }
 function readForm(el){
  form.date=el.date.value;form.outcome=el.outcome.value;form.text=el.text.value;form.action=el.action.value;
  form.types=[...el.querySelectorAll('input[name=types]:checked')].map(i=>i.value);
 }
 function bindForm(box){
  const el=box.querySelector('#obs-form');if(!el)return;
  el.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
   readForm(el);const num=Number(b.dataset.pick),i=form.students.findIndex(s=>s.num===num);
   if(i<0)form.students.push({num,role:'involved'});else if(form.students[i].role==='involved')form.students[i].role='mentioned';else form.students.splice(i,1);
   render();
  });
  el.text.addEventListener('input',()=>{
   box.querySelector('#obs-form-flags').innerHTML=flagHtml(el.text.value);
   if(typesTouched)return;
   const auto=O().typesOf(el.text.value);el.querySelectorAll('input[name=types]').forEach(i=>{i.checked=auto.includes(i.value);});
   const out=O().outcomeOf(el.text.value);if(out&&!el.outcome.value)el.outcome.value=out;
  });
  el.querySelectorAll('input[name=types]').forEach(i=>i.addEventListener('change',()=>{typesTouched=true;}));
  el.querySelector('[data-obs-cancel]').onclick=()=>{form=null;editing=null;render();};
  el.onsubmit=ev=>{
   ev.preventDefault();readForm(el);
   try{
    const prev=editing?list.find(e=>e.id===editing):null;
    const entry=O().validate(O().normalize({...prev,...form,id:prev?.id,source:prev?.source||'manual',createdAt:prev?.createdAt,updatedAt:new Date().toISOString()},{roster:students}));
    if(prev)list=list.map(e=>e.id===prev.id?entry:e);else list.push(entry);
    list.sort((a,b)=>a.date.localeCompare(b.date));
    persist();form=null;editing=null;showToast(prev?'관찰 기록을 고쳤어요. 누가기록에도 반영했어요.':'관찰 기록을 저장했어요. 관련 학생 누가기록에도 넣었어요.');render();
   }catch(err){showToast('⚠️ '+err.message);}
  };
 }

 /* ── 엑셀 불러오기 ── */
 async function importFile(file){
  if(!file)return;
  try{
   const JSZip=await _ensureJSZipForForm();
   const sheets=await O().readXlsx(await file.arrayBuffer(),JSZip||root.JSZip);
   const res=O().fromSheets(sheets,students);
   const known=new Set(list.map(e=>e.date+'|'+e.text.replace(/\s+/g,' ').trim()));
   preview={file:file.name,sheet:res.sheet,skipped:res.skipped,items:res.incidents.map(e=>({e,keep:true,exists:known.has(e.date+'|'+e.text)}))};
   if(!preview.items.length)showToast('관찰 기록 칸에 내용이 있는 줄이 없어요.');
   render();
  }catch(err){showToast('⚠️ 엑셀을 읽지 못했어요: '+err.message);}
 }
 function previewHtml(){
  const p=preview,fresh=p.items.filter(x=>!x.exists);
  return '<section class="card peer-analysis obs-preview"><div class="card-title">엑셀에서 찾은 관찰 기록 · '+E(p.file)+'</div>'
   +'<p>시트 「'+E(p.sheet)+'」에서 관찰 기록 칸에 내용이 있는 줄만 골랐어요. 출결만 있는 줄은 넣지 않아요. 같은 날짜·같은 내용은 한 사건으로 합쳤어요. <b>새 기록 '+fresh.length+'건</b>'+(p.items.length-fresh.length?' · 이미 있는 기록 '+(p.items.length-fresh.length)+'건':'')+'</p>'
   +(p.skipped.length?'<details><summary>읽지 못한 줄 '+p.skipped.length+'개</summary><ul>'+p.skipped.map(s=>'<li>'+s.line+'행: '+E(s.reason)+'</li>').join('')+'</ul></details>':'')
   +p.items.map((x,i)=>'<label class="obs-preview-item'+(x.exists?' exists':'')+'"><input type="checkbox" data-keep="'+i+'" '+(x.keep&&!x.exists?'checked':'')+(x.exists?' disabled':'')+'>'
     +'<div><div class="obs-card-head"><span class="obs-date">'+E(x.e.date)+'</span>'+x.e.types.map(typeChip).join('')
     +(x.e.outcome?'<span class="obs-outcome">'+E(O().OUTCOMES.find(o=>o.key===x.e.outcome).label)+'</span>':'')+(x.exists?'<span class="peer-muted">이미 있음</span>':'')
     +(x.e.lines?.length>1?'<span class="peer-muted">엑셀 '+x.e.lines.join('·')+'행을 한 사건으로</span>':'')+'</div>'
     +'<div class="obs-students">'+studentChips(x.e)+'</div>'+flagHtml(x.e.text)+'<p class="obs-text">'+E(x.e.text)+'</p></div></label>').join('')
   +'<p class="peer-muted">저장한 뒤에도 각 기록의 학생·유형·결과를 고칠 수 있어요. 본문에 이름이 나온 친구는 자동으로 연결했어요(한 사건에 여러 줄이면 다른 이름은 \'언급\').</p>'
   +'<div class="obs-form-foot"><button type="button" class="btn btn-secondary" data-preview-cancel>취소</button><button type="button" class="btn btn-primary" data-preview-save>선택한 기록 저장</button></div></section>';
 }
 function bindPreview(box){
  const el=box.querySelector('.obs-preview');if(!el)return;
  el.querySelectorAll('[data-keep]').forEach(c=>c.onchange=()=>{preview.items[Number(c.dataset.keep)].keep=c.checked;});
  el.querySelector('[data-preview-cancel]').onclick=()=>{preview=null;render();};
  el.querySelector('[data-preview-save]').onclick=()=>{
   const chosen=preview.items.filter(x=>x.keep&&!x.exists).map(x=>x.e);
   if(!chosen.length){showToast('저장할 새 기록을 골라 주세요.');return;}
   const m=O().merge(list,chosen);list=m.list;persist();preview=null;
   showToast('관찰 기록 '+m.added.length+'건을 저장하고 누가기록에도 넣었어요.'+(m.updated.length?' 기존 기록 '+m.updated.length+'건에 학생을 더했어요.':''));render();
  };
 }

 /* ── 탭 전체 ── */
 function panelHtml(){
  const filtered=list.filter(e=>(!filterStudent||e.students.some(s=>s.num===Number(filterStudent)))&&(!filterType||e.types.includes(filterType)))
   .sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
  return '<section class="card peer-analysis"><div class="card-title">교사 관찰 기록</div>'
   +'<p>친구와 있었던 일을 사건 단위로 기록해요. 저장하면 관련 학생의 <b>친구 관계 누가기록</b>과 <b>생활기록부 누가기록</b>에 함께 들어가고, 관계도와 AI 학생 이해 결과지의 근거로 쓰여요. 학생 화면에는 보이지 않아요.</p>'
   +'<div class="obs-toolbar"><button type="button" class="btn btn-primary" data-obs-new>+ 새 관찰 기록</button>'
   +'<label class="btn btn-secondary obs-file">📊 엑셀에서 불러오기<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-obs-file></label>'
   +'<label>학생<select data-obs-filter-student><option value="">전체 학생</option>'+roster().map(s=>{const n=O().forStudent(list,s.num).length;return '<option value="'+s.num+'" '+(String(s.num)===String(filterStudent)?'selected':'')+'>'+E(s.num+'. '+s.name)+(n?' ('+n+')':'')+'</option>';}).join('')+'</select></label>'
   +'<label>유형<select data-obs-filter-type><option value="">전체 유형</option>'+O().TYPES.map(t=>'<option value="'+t.key+'" '+(filterType===t.key?'selected':'')+'>'+E(t.label)+'</option>').join('')+'</select></label></div>'
   +(filterStudent?summaryHtml(filterStudent)+'<div class="obs-toolbar">'+(root.TeskUnderstanding?'<button type="button" class="btn btn-gold" onclick="TeskUnderstanding.openReport('+Number(filterStudent)+')">✨ AI 학생 이해 결과지</button>':'')+'</div>':'')
   +'</section>'
   +(preview?previewHtml():'')+(form?formHtml():'')
   +'<section class="obs-list">'+(filtered.length?filtered.map(card).join(''):'<div class="card peer-analysis peer-muted">'+(list.length?'조건에 맞는 기록이 없어요.':'아직 관찰 기록이 없어요. 새로 쓰거나 학생기록 엑셀을 불러오세요.')+'</div>')+'</section>';
 }
 let host=null;
 function render(target){
  if(target)host=target;
  const box=host&&document.body.contains(host)?host.querySelector('#obs-panel'):null;
  if(!box)return;
  box.innerHTML=panelHtml();
  box.querySelector('[data-obs-new]').onclick=()=>{editing=null;form=blank();typesTouched=false;render();box.querySelector('#obs-form')?.scrollIntoView({behavior:'smooth',block:'start'});};
  box.querySelector('[data-obs-file]').onchange=ev=>{const f=ev.target.files[0];ev.target.value='';importFile(f);};
  box.querySelector('[data-obs-filter-student]').onchange=ev=>{filterStudent=ev.target.value;render();};
  box.querySelector('[data-obs-filter-type]').onchange=ev=>{filterType=ev.target.value;render();};
  box.querySelectorAll('[data-obs-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.obsEdit));
  box.querySelectorAll('[data-obs-del]').forEach(b=>b.onclick=()=>remove(b.dataset.obsDel));
  bindForm(box);bindPreview(box);
 }
 function mount(el){host=el;el.insertAdjacentHTML('beforeend','<div id="obs-panel"></div>');render(el);}
 function edit(id){
  const e=list.find(x=>x.id===id);if(!e)return;
  editing=id;form={date:e.date,text:e.text,action:e.action,students:e.students.map(s=>({...s})),types:[...e.types],outcome:e.outcome};typesTouched=true;
  render();host?.querySelector('#obs-form')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function remove(id){
  const e=list.find(x=>x.id===id);if(!e)return;
  if(!await openAppConfirmModal({title:'관찰 기록 삭제',message:e.date+' 관찰 기록을 지울까요?\n관련 학생의 생활기록부 누가기록에서도 함께 지워져요.',submitText:'삭제',danger:true}))return;
  list=list.filter(x=>x.id!==id);persist();render();showToast('🗑 관찰 기록을 지웠어요.');
 }
 /* 다른 화면에서 열기 */
 function openStudent(num){filterStudent=String(num);root.TeskUnderstanding?.setTab('observe');goPage('friends');}
 function openEntry(id){const e=list.find(x=>x.id===id);if(!e){showToast('원본 관찰 기록을 찾지 못했어요.');return;}
  filterStudent='';filterType='';root.TeskUnderstanding?.setTab('observe');goPage('friends');setTimeout(()=>edit(id),0);}
 function removeStudent(num){
  const before=JSON.stringify(list);list=O().removeStudent(list,num);
  if(JSON.stringify(list)!==before)persist();
 }
 reload();
 root.TeskObservations={reload,all,summary,pairs,flagsFor,studentHtml,mount,render,openStudent,openEntry,removeStudent,decorate,importFile};
})(window);
