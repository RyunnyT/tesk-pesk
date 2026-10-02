/* 교사 도우미 화면 보조: 결과 표시(확인 필요 강조·상태 줄·직접 수정), 탭별 임시저장, 참고 문서 적용 범위,
   탭 접근성, 품목 CSV. 순수 함수는 Node 테스트에서도 씁니다. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TeskAssist=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CHECK_RE=/\[확인 ?필요[^\]\n]*\]/g;

 // ── 순수 함수 ──
 function checkCount(text){ return (String(text||'').match(CHECK_RE)||[]).length; }
 function highlightHtml(text){
  const t=String(text||'');let out='',last=0;
  t.replace(CHECK_RE,(m,i)=>{out+=esc(t.slice(last,i))+'<mark class="ai-check">'+esc(m)+'</mark>';last=i+m.length;return m;});
  return out+esc(t.slice(last));
 }
 // 품목 CSV: 입력 단가와 올림 적용 단가를 모두 적고, 금액은 적용 단가 × 수량입니다.
 function itemsCsv(items){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['품목명','규격','단위','수량','입력 단가','적용 단가(올림)','금액']];
  let total=0;
  (items||[]).forEach(it=>{rows.push([it.name,it.spec,it.unit,it.qty,it.price,it.ceiledPrice,it.sum]);total+=Number(it.sum)||0;});
  rows.push(['합계','','','','','',total]);
  return '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n');
 }
 function isPlaceholder(text){ const t=String(text||'').trim(); return !t||t.startsWith('←')||t.startsWith('⏳'); }

 const pure={checkCount,highlightHtml,itemsCsv,isPlaceholder};
 if(typeof document==='undefined')return pure;

 // ── 화면 ──
 const TABS=[
  {kind:'gongmun',label:'공문서',result:'gm-result',fields:['gm-title','gm-content','gm-detail']},
  {kind:'plan',label:'계획서',result:'pl-result',fields:['pl-title','pl-content']},
  {kind:'pumi',label:'품의',result:'pm-result',fields:['pm-title','pm-type','pm-related','pm-budget','pm-purpose','pm-extra']},
  {kind:'letter',label:'가정통신문',result:'lt-result',fields:['lt-school','lt-title','lt-content']},
 ];
 const KIND_BY_RESULT=Object.fromEntries(TABS.map(t=>[t.result,t.kind]));
 const DRAFT_KEY='tesk-ai-drafts';
 const SCOPE=[...TABS.map(t=>({kind:t.kind,label:t.label})),{kind:'form',label:'양식 채우기'}];
 const refScope=new Set(SCOPE.map(t=>t.kind));
 const resultMeta={};
 let saveTimer=null,restoring=false,ready=false;

 const $=id=>document.getElementById(id);
 const timeText=iso=>{try{return new Date(iso).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}catch(_e){return '';}};
 function loadDrafts(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY))||{};}catch(_e){return {};}}
 function writeDrafts(d){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(d));return true;}catch(_e){return false;}}

 function refIncluded(kind){ return typeof _teachAiDocText!=='undefined' && !!_teachAiDocText && refScope.has(kind); }

 // 결과 영역: 확인 필요 강조 + 상태 줄 + 직접 수정
 function metaEl(id){
  let m=$(id+'-meta');
  if(!m){const pre=$(id);if(!pre)return null;m=document.createElement('div');m.id=id+'-meta';m.className='ai-result-meta';m.setAttribute('role','status');pre.after(m);}
  return m;
 }
 function renderMeta(id){
  const pre=$(id),m=metaEl(id);if(!pre||!m)return;
  const text=pre.textContent||'';
  if(isPlaceholder(text)){m.innerHTML='';m.hidden=true;return;}
  const info=resultMeta[id]||{},n=checkCount(text);
  const parts=[];
  if(info.at)parts.push(`${info.edited?'수정':'생성'} ${timeText(info.at)}`);
  parts.push(`${text.replace(/\s/g,'').length.toLocaleString()}자`);
  if(info.ref)parts.push('📎 참고 문서 반영');
  m.hidden=false;
  m.innerHTML=parts.map(p=>`<span>${esc(p)}</span>`).join('')
   +(n?`<span class="ai-meta-warn">⚠ 확인 필요 ${n}곳 — 노란 표시를 채운 뒤 사용하세요</span>`:'<span class="ai-meta-ok">✓ 확인 필요 표시 없음</span>')
   +'<span class="ai-meta-hint">결과를 눌러 바로 고칠 수 있어요</span>';
 }
 function setEditable(pre,on){
  if(!on){pre.removeAttribute('contenteditable');return;}
  try{pre.contentEditable='plaintext-only';}catch(_e){pre.contentEditable='true';}
  pre.spellcheck=false;
 }
 function showResult(id,text,opts){
  const pre=$(id);if(!pre)return;
  pre.innerHTML=highlightHtml(text);
  pre.removeAttribute('aria-busy');pre.classList.remove('is-loading');
  const placeholder=isPlaceholder(text);
  setEditable(pre,!placeholder);
  if(!placeholder)resultMeta[id]={at:opts?.at||new Date().toISOString(),ref:opts?.ref??refIncluded(KIND_BY_RESULT[id]),edited:!!opts?.edited};
  else delete resultMeta[id];
  renderMeta(id);
  if(!restoring)saveSoon();
 }
 function setLoading(id,on){
  const pre=$(id);if(!pre)return;
  if(on){pre.setAttribute('aria-busy','true');pre.classList.add('is-loading');setEditable(pre,false);}
  else{pre.removeAttribute('aria-busy');pre.classList.remove('is-loading');}
 }

 // 임시저장
 function collect(){
  const d={v:1,savedAt:new Date().toISOString(),fields:{},results:{},tab:typeof _aiAssistTab!=='undefined'?_aiAssistTab:0};
  TABS.forEach(t=>{
   t.fields.forEach(f=>{const el=$(f);if(el)d.fields[f]=el.value;});
   const pre=$(t.result),text=pre?.textContent||'';
   if(pre&&!isPlaceholder(text))d.results[t.result]={text,...(resultMeta[t.result]||{})};
  });
  d.rels=[...document.querySelectorAll('.gm-rel-input')].map(i=>i.value);
  d.atts=[...document.querySelectorAll('.gm-att-input')].map(i=>i.value);
  d.items=[...document.querySelectorAll('#pm-item-body tr')].map(tr=>({
   name:tr.querySelector('.pm-it-name')?.value||'',spec:tr.querySelector('.pm-it-spec')?.value||'',unit:tr.querySelector('.pm-it-unit')?.value||'',
   qty:Number(tr.querySelector('.pm-it-qty')?.value)||0,price:Number(tr.querySelector('.pm-it-price')?.value)||0}));
  return d;
 }
 function saveNow(){
  if(!ready||restoring)return;
  const ok=writeDrafts(collect());
  document.querySelectorAll('.ai-save-status').forEach(s=>{s.textContent=ok?`임시저장됨 · ${timeText(new Date().toISOString())}`:'임시저장 실패(저장 공간 부족)';});
 }
 function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,600);}
 // 저장된 초안을 되살립니다. 행을 하나라도 만들었으면 true.
 function restore(){
  const d=loadDrafts();if(!d||d.v!==1)return false;
  restoring=true;
  try{
   Object.entries(d.fields||{}).forEach(([id,v])=>{const el=$(id);if(el&&typeof v==='string')el.value=v;});
   (d.rels||[]).forEach(v=>{addGmRel();const ins=document.querySelectorAll('.gm-rel-input');ins[ins.length-1].value=v;});
   (d.atts||[]).forEach(v=>{addGmAtt();const ins=document.querySelectorAll('.gm-att-input');ins[ins.length-1].value=v;});
   (d.items||[]).forEach(it=>addPmItem(it));
   Object.entries(d.results||{}).forEach(([id,r])=>{if(r&&typeof r.text==='string')showResult(id,r.text,{at:r.at,ref:r.ref,edited:r.edited});});
   return !!((d.rels||[]).length||(d.atts||[]).length||(d.items||[]).length);
  }finally{restoring=false;}
 }
 async function resetTab(i){
  const t=TABS[i];if(!t)return;
  if(!await openAppConfirmModal({title:`${t.label} 새로 쓰기`,message:`${t.label} 탭의 입력 내용과 생성 결과를 모두 지울까요?\n임시저장본도 함께 지워집니다.`,submitText:'지우기',danger:true}))return;
  t.fields.forEach(f=>{const el=$(f);if(!el)return;if(el.tagName==='SELECT')el.selectedIndex=0;else el.value='';});
  if(t.kind==='gongmun'){$('gm-rel-list').innerHTML='';$('gm-att-list').innerHTML='';addGmRel();addGmAtt();}
  if(t.kind==='pumi'){$('pm-item-body').innerHTML='';addPmItem();}
  clearAiResult(t.result);
  const ref=$(t.result.replace('-result','-refine-inp'));if(ref)ref.value='';
  saveNow();
  showToast(`🧹 ${t.label} 탭을 비웠어요`);
 }

 // 참고 문서 적용 범위
 function renderRefScope(){
  const wrap=$('teachai-ref-scope');if(!wrap)return;
  const has=typeof _teachAiDocText!=='undefined'&&!!_teachAiDocText;
  wrap.hidden=!has;
  if(!has){wrap.innerHTML='';return;}
  wrap.innerHTML='<span class="ai-ref-scope-label">반영할 탭</span>'+SCOPE.map(t=>`<button type="button" class="ai-ref-chip${refScope.has(t.kind)?' on':''}" aria-pressed="${refScope.has(t.kind)}" data-kind="${t.kind}">${refScope.has(t.kind)?'✓ ':''}${esc(t.label)}</button>`).join('')
   +'<span class="ai-ref-scope-hint">끈 탭에는 이 문서를 보내지 않아요.</span>';
  wrap.querySelectorAll('.ai-ref-chip').forEach(b=>b.addEventListener('click',()=>{
   const k=b.dataset.kind;refScope.has(k)?refScope.delete(k):refScope.add(k);renderRefScope();
  }));
 }

 // 탭 접근성: 역할·선택 상태·화살표 이동
 function initTabs(){
  const first=$('ai-tb0');if(!first)return;
  const list=first.parentElement;list.setAttribute('role','tablist');list.setAttribute('aria-label','교사 도우미 작업');list.classList.add('ai-tablist');
  for(let i=0;i<5;i++){
   const b=$('ai-tb'+i),p=$('ai-tp'+i);if(!b||!p)continue;
   b.setAttribute('role','tab');b.setAttribute('aria-controls','ai-tp'+i);
   p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','ai-tb'+i);p.tabIndex=-1;
  }
  list.addEventListener('keydown',e=>{
   const i=Number(String(document.activeElement?.id||'').replace('ai-tb',''));
   if(!document.activeElement?.id?.startsWith('ai-tb'))return;
   const to=e.key==='ArrowRight'?(i+1)%5:e.key==='ArrowLeft'?(i+4)%5:e.key==='Home'?0:e.key==='End'?4:null;
   if(to==null)return;e.preventDefault();switchAiTab(to);$('ai-tb'+to).focus();
  });
 }
 function onTab(i){
  for(let k=0;k<5;k++){const b=$('ai-tb'+k);if(!b)continue;b.setAttribute('aria-selected',String(k===i));b.tabIndex=k===i?0:-1;}
  if(ready)saveSoon();
 }

 // 탭마다 상단 막대(임시저장 상태 + 새로 쓰기)
 function initPanelBars(){
  TABS.forEach((t,i)=>{
   const panel=$('ai-tp'+i);if(!panel||panel.querySelector('.ai-panel-bar'))return;
   const bar=document.createElement('div');bar.className='ai-panel-bar';
   bar.innerHTML=`<span class="ai-save-status" aria-live="polite">입력하면 이 기기에 자동으로 임시저장돼요</span><button type="button" class="btn btn-sm btn-secondary">🧹 새로 쓰기</button>`;
   bar.querySelector('button').addEventListener('click',()=>resetTab(i));
   panel.prepend(bar);
  });
 }

 function init(){
  const page=$('page-ai-assist');if(!page||ready)return false;
  initTabs();initPanelBars();
  TABS.forEach(t=>{
   const pre=$(t.result);if(!pre)return;
   metaEl(t.result);
   pre.addEventListener('input',()=>{resultMeta[t.result]={...(resultMeta[t.result]||{}),at:new Date().toISOString(),edited:true};renderMeta(t.result);saveSoon();});
  });
  const madeRows=restore();
  ready=true;
  page.addEventListener('input',e=>{if(e.target.matches('input:not([type=file]):not([id$="-refine-inp"]),textarea,select')&&!e.target.closest('#ai-tp4'))saveSoon();});
  page.addEventListener('change',e=>{if(e.target.matches('select'))saveSoon();});
  const d=loadDrafts();
  if(d.savedAt)document.querySelectorAll('.ai-save-status').forEach(s=>{s.textContent=`임시저장본을 불러왔어요 · ${timeText(d.savedAt)}`;});
  renderRefScope();
  return madeRows;
 }

 return {...pure,TABS,init,showResult,setLoading,renderMeta,saveSoon,saveNow,refIncluded,renderRefScope,onTab,kindOf:id=>KIND_BY_RESULT[id]};
});
