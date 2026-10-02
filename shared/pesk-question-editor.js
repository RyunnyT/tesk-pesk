/* 교사용 국어·과학·사회 문제은행. 학생에게는 검수 후 사용으로 저장한 문제만 출제한다. */
let qzBankRows=[],qzBankEditing='',qzBankSaving=false;
function qzBankStore(){return window.PeskSubjects.store(window,TESK_ROOM);}
async function qzLoadBank(){
  try{qzBankRows=await qzBankStore().load();qzRenderSubjectUnits();qzRenderBank();}
  catch(e){const box=document.getElementById('qz-bank-editor');if(box)box.innerHTML='<p style="color:var(--coral)">문제은행을 불러오지 못했어요. Firebase 연결과 문제은행 규칙을 확인해주세요.</p><button class="btn btn-sm btn-secondary" onclick="qzLoadBank()">다시 불러오기</button>';}
}
function qzCollectSubjectUnits(){return Object.fromEntries(window.PeskSubjects.CUSTOM.map(s=>[s,[...document.querySelectorAll('#qz-subject-units input[data-subject="'+s+'"]:checked')].map(x=>Number(x.dataset.unit))]));}
function qzRenderSubjectUnits(){
  const box=document.getElementById('qz-subject-units');if(!box)return;
  const grade=Number(document.getElementById('qz-grade').value),term=Number(document.getElementById('qz-term').value);
  box.innerHTML=window.PeskSubjects.SUBJECTS.filter(s=>window.PeskSubjects.CUSTOM.includes(s.id)).map(s=>{
    const units=new Map(qzBankRows.filter(q=>q.enabled&&q.subject===s.id&&q.grade===grade&&q.term===term).map(q=>[q.unitNo,q.unitName]));
    return '<div style="margin-top:14px"><b>'+s.label+' 단원</b><small> · 미선택 시 이 학기 등록 단원 전체</small><div class="qz-units">'+([...units].sort((a,b)=>a[0]-b[0]).map(([no,name])=>'<label class="qz-unit"><input type="checkbox" data-subject="'+s.id+'" data-unit="'+no+'" '+((qzConfig.subjectUnits?.[s.id]||[]).map(Number).includes(no)?'checked':'')+'><span>'+no+'단원 '+escHtml(name)+'</span></label>').join('')||'<p>해당 학년·학기의 사용 중인 문제가 없어요.</p>')+'</div></div>';
  }).join('');
}
function qzRenderBank(){
  const box=document.getElementById('qz-bank-editor');if(!box)return;
  box.innerHTML='<details style="margin-top:20px;border-top:1px solid var(--border);padding-top:14px" open><summary style="font-weight:800;cursor:pointer">✏️ 교사 문제은행 · 국어·과학·사회</summary><p style="font-size:12px;line-height:1.7;color:var(--sub)">검토한 문제를 한 편씩 등록하세요. 저장한 뒤 과목을 켜고 출제 범위를 저장하면 모험에서 사용합니다. 문제 사용을 끄면 다시 고칠 수 있어요.</p><div class="qz-row"><label class="qz-field">과목<select class="form-input" id="qb-subject"><option value="korean">국어</option><option value="science">과학</option><option value="social">사회</option></select></label><label class="qz-field">학년<select class="form-input" id="qb-grade">'+[3,4,5,6].map(n=>'<option>'+n+'</option>').join('')+'</select></label><label class="qz-field">학기<select class="form-input" id="qb-term"><option>1</option><option>2</option></select></label><label class="qz-field">난이도<select class="form-input" id="qb-level"><option value="1">기초</option><option value="2">표준</option><option value="3">도전</option></select></label></div><div class="qz-row"><label class="qz-field">단원 번호<input class="form-input" id="qb-unit" type="number" min="1" max="30" value="1"></label><label class="qz-field">단원명<input class="form-input" id="qb-unit-name" maxlength="60"></label><label class="qz-field">출판사·자료명 (선택)<input class="form-input" id="qb-publisher" maxlength="60"></label><label class="qz-field">성취기준 (선택)<input class="form-input" id="qb-standard" maxlength="100"></label></div><label class="form-label">문제·짧은 지문<textarea class="form-input" id="qb-question" rows="4" maxlength="2000"></textarea></label><div class="qz-row">'+[0,1,2,3].map(i=>'<label class="qz-field">보기 '+(i+1)+'<input class="form-input" id="qb-option-'+i+'" maxlength="200"></label>').join('')+'</div><div class="qz-row"><label class="qz-field">정답<select class="form-input" id="qb-answer">'+[0,1,2,3].map(i=>'<option value="'+i+'">'+(i+1)+'번 보기</option>').join('')+'</select></label><label class="qz-field"><span>검수 상태</span><label><input type="checkbox" id="qb-enabled" checked> 검토 완료 · 출제에 사용</label></label></div><label class="form-label">해설<textarea class="form-input" id="qb-explain" rows="2" maxlength="1000"></textarea></label><div style="display:flex;gap:8px;margin:12px 0"><button class="btn btn-primary" id="qb-save" onclick="qzSaveBankQuestion()">문제 저장</button><button class="btn btn-secondary" onclick="qzEditBankQuestion(\'\')">새 문제 작성</button></div><div id="qb-list"></div></details>';
  qzEditBankQuestion(qzBankEditing);qzRenderBankList();
}
function qzRenderBankList(){
  const box=document.getElementById('qb-list');if(!box)return;
  box.innerHTML=qzBankRows.map((q,i)=>'<div style="padding:10px 0;border-top:1px solid var(--border);font-size:12px"><b>'+escHtml(window.PeskSubjects.SUBJECTS.find(s=>s.id===q.subject).label)+' '+q.grade+'-'+q.term+' '+q.unitNo+'단원 · '+(q.enabled?'사용 중':'사용 안 함')+'</b><p>'+escHtml(q.question.slice(0,100))+'</p><button class="btn btn-sm btn-secondary" onclick="qzEditBankQuestion(qzBankRows['+i+'].id)">수정·미리보기</button></div>').join('')||'<p>등록한 문제가 없어요. 위에서 첫 문제를 만들어보세요.</p>';
}
function qzEditBankQuestion(id){
  const q=qzBankRows.find(x=>x.id===id);qzBankEditing=q?.id||'';
  const values={subject:q?.subject||'korean',grade:q?.grade||document.getElementById('qz-grade').value,term:q?.term||document.getElementById('qz-term').value,level:q?.level||1,unit:q?.unitNo||1,'unit-name':q?.unitName||'',publisher:q?.publisher||'',standard:q?.standard||'',question:q?.question||'',answer:q?.answerIndex||0,explain:q?.explain||''};
  for(let i=0;i<4;i++)values['option-'+i]=q?.options[i]||'';
  for(const [k,v] of Object.entries(values)){const e=document.getElementById('qb-'+k);if(e)e.value=v;}
  document.getElementById('qb-enabled').checked=q?.enabled!==false;
  document.getElementById('qb-save').textContent=q?'수정 내용 저장':'문제 저장';
}
async function qzSaveBankQuestion(){
  if(qzBankSaving)return;
  const value=id=>document.getElementById('qb-'+id).value;
  const raw={subject:value('subject'),grade:value('grade'),term:value('term'),level:value('level'),unitNo:value('unit'),unitName:value('unit-name'),publisher:value('publisher'),standard:value('standard'),question:value('question'),options:[0,1,2,3].map(i=>value('option-'+i)),answerIndex:value('answer'),explain:value('explain'),enabled:document.getElementById('qb-enabled').checked};
  qzBankSaving=true;document.getElementById('qb-save').disabled=true;
  try{qzBankEditing=await qzBankStore().save(raw,qzBankEditing);await qzLoadBank();showToast('✅ 문제를 저장했어요. 출제 범위에서 과목과 단원도 확인해주세요.');}
  catch(e){showToast('❌ '+e.message);}
  finally{qzBankSaving=false;const b=document.getElementById('qb-save');if(b)b.disabled=false;}
}
