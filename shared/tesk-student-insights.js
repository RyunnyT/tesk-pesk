/* Evidence and review workflows for teacher-only student reports and records. */
(() => {
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let friendFocus='';
  const pendingRecords=new Set();
  const skip=message=>Object.assign(new Error(message),{skip:true});
  /* 한 학생의 초안을 AI로 받아 검토 대기 상태로 저장합니다. 근거가 없으면 skip 오류를 던집니다. */
  async function draftStudent(num,notesOnly,quiet){
    const student=students.find(s=>Number(s.num)===num);
    if(!student)throw skip('학생 정보를 찾을 수 없어요.');
    const rec=_ensureRecord(num),base={...rec.fields},signals=collectStudentSignals(num);
    if(notesOnly&&!rec.notes.length)throw skip('관찰 메모를 먼저 추가해주세요.');
    if(!signals.lines.length)throw skip('작성 근거가 없어요. 관찰 메모나 평가·글쓰기 기록을 먼저 추가해주세요.');
    const byArea={};rec.notes.forEach(n=>(n.areaTags||[]).forEach(tag=>{(byArea[tag]||=[]).push(`${n.date||''} - ${window.RecordCheck?RecordCheck.maskName(n.text,student.name):n.text}`);}));
    const prompt=notesOnly?buildNotesToDraftPrompt(student,byArea,signals.fullCtx.join('\n')):buildRecordDraftPrompt(student,signals.fullCtx.join('\n'));
    const json=await callTeachAIJson(prompt,{maxTokens:14000,temperature:0.08,allowPartial:false,continueOnLength:false},'RECORD_FIELDS의 키를 가진 JSON 객체. 근거가 없는 영역은 빈 문자열.');
    stageRecordDraft(num,json,base,{quiet});
  }
  async function generateRecords(notesOnly=false){
    const num=Number(selectedRecordStudent),student=students.find(s=>Number(s.num)===num);
    if(!student)return showToast('학생을 먼저 등록하거나 선택하세요.');
    if(pendingRecords.has(num))return showToast('이 학생의 초안을 작성 중입니다.');
    const button=document.getElementById(notesOnly?'record-notes-draft-btn':'record-draft-btn'),label=button?.textContent;
    pendingRecords.add(num);if(button){button.disabled=true;button.textContent='AI 초안 작성 중…';}
    try{await draftStudent(num,notesOnly,false);}
    catch(error){showToast(error.skip?error.message:'초안 생성 실패: '+error.message);}
    finally{pendingRecords.delete(num);if(button){button.disabled=false;button.textContent=label;}}
  }
  /* 여러 학생을 차례로 처리합니다. 검토하지 않은 초안이 있는 학생은 덮어쓰지 않도록 건너뜁니다. */
  async function generateRecordsBatch(nums,notesOnly,onProgress,shouldStop){
    const results=[];
    for(let i=0;i<nums.length;i++){
      const num=Number(nums[i]),name=students.find(s=>Number(s.num)===num)?.name||num+'번';
      if(shouldStop?.()){results.push({num,name,status:'stopped'});continue;}
      onProgress?.({index:i,total:nums.length,num,name,results});
      if(pendingRecords.has(num)){results.push({num,name,status:'skip',message:'이미 작성 중'});continue;}
      if(_ensureRecord(num).aiDraft){results.push({num,name,status:'skip',message:'검토 대기 초안이 있어요'});continue;}
      pendingRecords.add(num);
      try{await draftStudent(num,notesOnly,true);results.push({num,name,status:'ok'});}
      catch(error){results.push({num,name,status:error.skip?'skip':'fail',message:error.message});}
      finally{pendingRecords.delete(num);}
    }
    onProgress?.({index:nums.length,total:nums.length,results,done:true});
    return results;
  }
  function stageRecordDraft(num,fields,base,opts){
    const values={};
    RECORD_FIELDS.forEach(f=>{if(typeof fields?.[f.key]==='string'&&fields[f.key].trim())values[f.key]=fields[f.key].trim();});
    if(!Object.keys(values).length)throw skip('근거를 바탕으로 작성된 영역이 없습니다. 관찰 메모를 추가해주세요.');
    const rec=_ensureRecord(num);
    if(opts?.merge&&rec.aiDraft){
      // 한 영역만 다듬은 결과: 검토 대기 중인 다른 영역 초안은 그대로 둡니다.
      Object.keys(values).forEach(k=>{rec.aiDraft.values[k]=values[k];rec.aiDraft.base[k]=base?.[k];});
      rec.aiDraft.createdAt=new Date().toISOString();
    }else rec.aiDraft={values,base:{...base},createdAt:new Date().toISOString()};
    save('tesk-records',records);
    if(Number(selectedRecordStudent)===Number(num))renderRecordReview();
    if(typeof renderRecordOverview==='function')renderRecordOverview();
    if(!opts?.quiet)showToast(`${students.find(s=>Number(s.num)===Number(num))?.name||num+'번'} 학생 초안을 저장했어요. 검토 후 적용하세요.`);
  }
  function renderRecordReview(){
    let wrap=document.getElementById('record-draft-review');
    if(!wrap){wrap=document.createElement('section');wrap.id='record-draft-review';document.getElementById('record-grid').before(wrap);}
    const num=Number(selectedRecordStudent),rec=_ensureRecord(num),draft=rec.aiDraft;
    if(!draft){wrap.replaceChildren();return;}
    wrap.className='record-draft-review card';
    wrap.innerHTML=`<div class="card-header"><div><div class="card-title">AI 초안 검토 · ${escape(students.find(s=>Number(s.num)===num)?.name||'')}</div><p class="insight-help">기존 문장을 확인하고 적용할 영역을 선택하세요. 직접 작성한 내용은 선택 전까지 유지됩니다.</p></div><button class="btn btn-primary" id="record-apply-draft">선택 영역 적용</button></div>${RECORD_FIELDS.filter(f=>draft.values[f.key]).map(f=>`<article class="record-draft-field"><label><input type="checkbox" data-record-pick="${f.key}" ${!rec.fields[f.key]?'checked':''}> ${escape(f.label)}</label><details><summary>기존 문장 확인</summary><p>${escape(rec.fields[f.key]||'(작성한 내용 없음)')}</p></details><textarea data-record-draft="${f.key}" rows="4">${escape(draft.values[f.key])}</textarea><small data-draft-count="${f.key}"></small></article>`).join('')}`;
    const update=(key,value)=>{draft.values[key]=value;const f=RECORD_FIELDS.find(f=>f.key===key),bytes=countNeisBytes(value),counter=wrap.querySelector(`[data-draft-count="${key}"]`);const issues=window.RecordCheck?RecordCheck.lint(value,{studentName:students.find(s=>Number(s.num)===num)?.name,fieldKey:key}):[];counter.textContent=`${value.length}/${f.limitChars}자 · ${bytes}/${f.limitBytes}byte`+(issues.length?' · '+issues.map(i=>(i.level==='error'?'⛔ ':'⚠ ')+i.label).join(', '):'');counter.style.color=value.length>f.limitChars||bytes>f.limitBytes||issues.some(i=>i.level==='error')?'#c24136':issues.length?'#c2410c':'#687a6c';};
    wrap.querySelectorAll('[data-record-draft]').forEach(ta=>{update(ta.dataset.recordDraft,ta.value);ta.addEventListener('input',()=>{update(ta.dataset.recordDraft,ta.value);save('tesk-records',records);});});
    wrap.querySelector('#record-apply-draft').addEventListener('click',()=>applyRecordDraft(num));
  }
  function applyRecordDraft(num){
    const rec=_ensureRecord(num),draft=rec.aiDraft;if(!draft||Number(selectedRecordStudent)!==num)return;
    const keys=[...document.querySelectorAll('[data-record-pick]:checked')].map(cb=>cb.dataset.recordPick);
    if(!keys.length)return showToast('적용할 영역을 선택하세요.');
    for(const key of keys){
      const field=RECORD_FIELDS.find(f=>f.key===key),value=draft.values[key];
      if(value.length>field.limitChars||countNeisBytes(value)>field.limitBytes)return showToast(`${field.label}의 분량을 줄인 뒤 적용해주세요.`);
      if((rec.fields[key]||'')!==(draft.base[key]||''))return showToast(`${field.label}은 초안 생성 후 수정됐어요. 현재 문장을 보존했습니다. 내용을 비교해 직접 반영해주세요.`);
    }
    if(typeof snapshotRecord==='function')snapshotRecord(num,'AI 초안 적용 전');
    keys.forEach(key=>{rec.fields[key]=draft.values[key];delete draft.values[key];delete draft.base[key];});
    if(!Object.keys(draft.values).length)delete rec.aiDraft;
    save('tesk-records',records);renderRecordForm();renderRecordReview();if(typeof renderRecordOverview==='function')renderRecordOverview();showToast(`${keys.length}개 영역을 적용했어요.`);
  }
  function reportSignature(r){return JSON.stringify([r.examList,r.writeList.map(w=>[w.id,w.date,w.content,w.feedback]),r.counselCount,r.recentMoods,r.hasRisk,r.receivedBest,r.receivedAvoid,r.friendResponseCount]);}
  function saveRecommendation(num,opinion,signature,promptVersion){
    _ensureRecord(num).reportRecommendation={opinion,signature,promptVersion:promptVersion||null,createdAt:new Date().toISOString()};save('tesk-records',records);
  }
  /* 이전 버전은 문장 하나(text)만 저장했습니다. 그대로 읽어 보여주되 근거 표시는 재생성해야 붙습니다. */
  function savedOpinion(rec){return rec?.reportRecommendation?.opinion ?? rec?.reportRecommendation?.text ?? null;}
  function opinionText(opinion){
    if(!opinion)return '';
    if(typeof opinion==='string')return opinion;
    return [opinion.strength?.text,opinion.support?.text,...(opinion.needsCheck||[]).map(c=>'확인: '+c.text)]
      .map(s=>String(s||'').trim()).filter(Boolean).join('\n');
  }
  function reportText(r){
    return [`${r.num}번 ${r.name} · 학생 종합 보고서`,new Date().toLocaleDateString('ko-KR'),'',
      `[학습] ${r.examCount?r.examCount+'회 응시 · 평균 '+r.avgExamScore+'점':'평가 자료 없음'}`,
      ...r.examList.map(e=>`- ${e.date||''} ${e.subject||''} ${e.examName||''}: ${e.took?e.score+'점':'미응시'}`),
      `[글쓰기] ${r.writeCount}편 제출`,...r.writeList.slice(-5).map(w=>`- ${w.title||'제목 없음'}${w.feedback?' · 피드백 있음':''}`),
      `[상담] ${r.counselCount}회 기록${r.hasRisk?' · 추가 확인 필요':''}`,
      `[친구관계] ${r.friendResponseCount?'선택한 회차 기준 긍정 지명 '+r.receivedBest+' · 조정 필요 지명 '+r.receivedAvoid:'설문 자료 없음'}`,
      '[관찰 메모]',...((_ensureRecord(r.num).notes||[]).slice(-8).map(n=>`- ${n.date} ${n.text}`)),
      '', ...reportOpinionLines(r)].join('\n');
  }
  function reportOpinionLines(r){
    const rec=_ensureRecord(r.num),saved=rec.reportRecommendation;
    if(!saved||saved.signature!==reportSignature(r))return ['[다음 확인 사항]',r.recommendation];
    const opinion=savedOpinion(rec);
    if(typeof opinion==='string')return ['[종합 소견]',opinion];
    return ['[종합 소견 · AI 초안, 교사 확인 필요]',
      ...(String(opinion?.strength?.text||'').trim()?['강점: '+opinion.strength.text]:[]),
      ...(String(opinion?.support?.text||'').trim()?['지원 방향: '+opinion.support.text]:[]),
      ...((opinion?.needsCheck||[]).map(c=>'확인할 사항: '+c.text))];
  }
  /* 표와 상세 패널을 이어 줍니다. 화면 상태(정렬·필터·기간·선택)는 renderReport 가 들고 있습니다. */
  function reportTools(reports, visible, picked){
    const content=document.getElementById('report-content');if(!content)return;
    const rerender=()=>renderReport();

    content.querySelectorAll('[data-report-filter]').forEach(chip=>chip.addEventListener('click',()=>{
      reportFilter=chip.dataset.reportFilter;rerender();
    }));
    content.querySelectorAll('[data-report-sort]').forEach(btn=>btn.addEventListener('click',()=>{
      const key=btn.dataset.reportSort;
      reportSort = reportSort.key===key ? {key,dir:-reportSort.dir} : {key,dir:key==='num'?1:-1};
      rerender();
    }));
    const period=content.querySelector('#report-period');
    if(period)period.addEventListener('change',()=>{reportPeriod=period.value;rerender();});

    const search=content.querySelector('#report-search');
    if(search)search.addEventListener('input',()=>{
      reportQuery=search.value;const at=search.selectionStart;
      rerender();
      const next=document.getElementById('report-search');
      if(next){next.focus();try{next.setSelectionRange(at,at);}catch(_e){}}
    });

    const rows=[...content.querySelectorAll('[data-report-row]')];
    rows.forEach(row=>{
      const pick=()=>{reportPicked=Number(row.dataset.reportRow);rerender();
        if(window.matchMedia('(max-width:1100px)').matches)document.getElementById('report-detail')?.scrollIntoView({block:'start'});};
      row.addEventListener('click',pick);
      row.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();return;}
        const step=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
        if(!step)return;
        event.preventDefault();
        const next=rows[rows.indexOf(row)+step];
        if(next){next.focus();reportPicked=Number(next.dataset.reportRow);rerender();
          document.querySelector(`[data-report-row="${next.dataset.reportRow}"]`)?.focus();}
      });
    });

    if(picked){
      const rec=_ensureRecord(picked.num),saved=rec.reportRecommendation;
      const target=content.querySelector('.report-recommendation');
      if(saved&&target){
        if(saved.signature===reportSignature(picked))renderReportOpinionInto(target,savedOpinion(rec),saved);
        else target.insertAdjacentHTML('afterend','<p class="rp-note" style="color:var(--gold);">소견을 만든 뒤 자료가 바뀌었어요. 다시 생성하면 최신 기록이 반영됩니다.</p>');
      }
      content.querySelectorAll('[data-report-action]').forEach(btn=>btn.addEventListener('click',()=>{
        const action=btn.dataset.reportAction;
        if(action==='records'){selectedRecordStudent=picked.num;goPage('records');}
        // 이 학생의 상담(기록 또는 신청)으로 바로 간다. 둘 다 없으면 버튼이 비활성이라 여기 오지 않는다.
        if(action==='counsel'){if(window.openStudentCounsel)openStudentCounsel(picked.num);else goPage('counsel');}
        if(action==='copy')navigator.clipboard.writeText(reportText(picked))
          .then(()=>showToast('학생 요약을 복사했어요.')).catch(()=>showToast('클립보드 접근을 허용해주세요.'));
      }));
    }

    const print=content.querySelector('#report-print');
    if(print)print.addEventListener('click',()=>{
      if(!picked)return showToast('인쇄할 학생을 먼저 선택하세요.');
      window.print();
    });
    const exportBtn=content.querySelector('#report-export');
    if(exportBtn)exportBtn.addEventListener('click',async()=>{
      if(!visible.length)return showToast('표시된 학생이 없습니다.');
      const pre=document.createElement('pre');pre.id='report-export-'+Date.now();pre.hidden=true;
      pre.textContent=visible.map(reportText).join(`\n\n${'━'.repeat(20)}\n\n`);document.body.append(pre);
      try{await downloadAiHwpx(pre.id,'학생_종합보고서');}finally{pre.remove();}
    });
  }
  function friendTools(analysis){
    const content=document.getElementById('friends-content');if(!content||!analysis)return;
    const wrap=document.createElement('section');wrap.className='card insight-toolbar';
    wrap.innerHTML=`<div class="card-header"><div class="card-title">관계 확인과 다음 활동</div><span>${analysis.uniqueResponders}/${students.length}명 참여</span></div><p class="insight-help">${analysis.responseRate<70?'아직 응답이 적습니다. 미참여 학생의 응답과 교사 관찰을 먼저 확인하세요.':'지명 수는 이번 설문에서 관찰한 관계의 단서입니다. 실제 활동 모습과 함께 살펴보세요.'}</p><div class="insight-toolbar-controls"><label>학생 <select id="friend-focus"><option value="">전체 관계</option>${students.map(s=>`<option value="${s.num}">${s.num}. ${escape(s.name)}</option>`).join('')}</select></label><button class="btn btn-secondary" id="friend-copy-summary">관찰 요약 복사</button></div><div id="friend-focus-detail"></div>`;
    content.prepend(wrap);
    const select=wrap.querySelector('select');select.value=friendFocus;
    const draw=()=>{
      friendFocus=select.value;const num=Number(friendFocus),st=analysis.statsList.find(s=>s.num===num);
      if(!st){wrap.querySelector('#friend-focus-detail').innerHTML='<p class="insight-help">학생을 선택하면 받은 지명과 보낸 지명, 상호 선택을 구분해 볼 수 있습니다.</p>';return;}
      const name=n=>students.find(s=>Number(s.num)===n)?.name||n+'번';
      const incoming=[...st.posFrom].map(name),outgoing=[...new Set(analysis.edges.filter(e=>e.from===num&&!e.negative).map(e=>e.to))].map(name);
      const steps=!st.submitted?'해당 학생이 아직 응답하지 않았습니다. 응답 기회를 마련한 뒤 서로의 관점을 비교하세요.':!st.posIn?'최근 모둠 활동에서 편안하게 대화한 친구가 있는지 관찰하고 학생의 희망 관계를 물어보세요.':st.negIn?'함께 활동하기 어려웠던 구체적인 상황을 개별적으로 듣고 공동 과제의 역할을 조정해보세요.':'서로 도움을 주고받았던 활동과 관계가 이어지는 상황을 기록해보세요.';
      wrap.querySelector('#friend-focus-detail').innerHTML=`<div class="insight-focus"><strong>${escape(st.name)} · ${st.submitted?'응답 완료':'미응답'}</strong><p>긍정 지명을 보낸 친구: ${escape(outgoing.join(', ')||'없음')}</p><p>이 학생을 긍정 지명한 친구: ${escape(incoming.join(', ')||'없음')}</p><p>상호 선택 ${st.reciprocated}명 · 조정 필요 지명 ${st.negIn}명</p><p class="insight-next">${steps}</p></div>`;
    };
    select.addEventListener('change',draw);draw();
    wrap.querySelector('button').addEventListener('click',()=>{const body=wrap.querySelector('#friend-focus-detail').innerText;navigator.clipboard.writeText(`${analysis.roundLabel} · 참여 ${analysis.uniqueResponders}/${students.length}명\n${body}`).then(()=>showToast('관찰 요약을 복사했어요.')).catch(()=>showToast('클립보드 접근을 허용해주세요.'));});
  }
  window.TeskInsights={generateRecords,generateRecordsBatch,stageRecordDraft,renderRecordReview,applyRecordDraft,reportTools,friendTools,reportSignature,saveRecommendation,savedOpinion,opinionText};
})();
