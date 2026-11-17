/* 키 없이 AI 쓰기: 요청문(학생 이름은 이미 가려진 것)을 복사해 교사가 쓰는 AI 채팅에 붙여 넣고,
   받은 답을 붙여 넣으면 키로 받은 답과 똑같이 검사한 뒤 쓴다. 검사는 부르는 쪽(validate 함수)이 한다.
   TeskAiManual.ask(promptText, {title}) → Promise<붙여 넣은 답>. 닫으면 '취소' 오류로 끝난다. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let open=null;
function ask(promptText,opts){
  const o=opts||{};
  if(open)return Promise.reject(new Error('다른 AI 요청 창이 열려 있어요. 먼저 닫아 주세요.'));
  return new Promise((resolve,reject)=>{
    const wrap=document.createElement('div');
    wrap.className='modal-bg open';wrap.id='ai-manual-modal';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','ai-manual-title');
    wrap.style.cssText='display:flex;z-index:4000;';
    wrap.innerHTML='<div class="modal" style="max-width:none;width:min(640px, calc(100vw - 32px));margin:16px;box-sizing:border-box;">'
      +'<div class="modal-header"><div class="modal-title" id="ai-manual-title">🤖 '+esc(o.title||'AI 키 없이 쓰기')+'</div><button class="modal-close" data-x aria-label="닫기">✕</button></div>'
      +'<div class="modal-body" style="display:grid;gap:12px;">'
      +'<div style="font-size:12.5px;line-height:1.65;color:var(--sub);">AI 키가 없어서 <b>복사해서 붙여 넣기</b>로 진행해요. 학생 이름은 \'학생 03\'처럼 바꿔 두었어요.<br>'
      +'① 요청문을 복사해 쓰시는 AI 채팅(Gemini, ChatGPT, Claude 등)에 붙여 넣고 ② 받은 답 전체를 아래 칸에 붙여 넣어 주세요.</div>'
      +'<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><label class="form-label" for="ai-manual-prompt" style="margin:0;">① 요청문</label>'
      +'<button class="btn btn-sm btn-primary" data-copy>요청문 복사</button></div>'
      +'<textarea class="form-input" id="ai-manual-prompt" rows="6" readonly style="font-size:11.5px;line-height:1.5;">'+esc(promptText)+'</textarea></div>'
      +'<div><label class="form-label" for="ai-manual-answer">② 받은 답 붙여 넣기</label>'
      +'<textarea class="form-input" id="ai-manual-answer" rows="7" placeholder="AI가 준 답을 그대로 붙여 넣어 주세요."></textarea>'
      +'<div data-err role="alert" style="font-size:12px;color:var(--coral);margin-top:4px;"></div></div>'
      +'<div style="font-size:11px;color:var(--hint);">무료 AI 채팅은 보낸 내용이 서비스 개선에 쓰일 수 있어요. 민감한 내용이 든 기록은 보내기 전에 한 번 더 확인해 주세요.</div>'
      +'</div><div class="modal-footer"><button class="btn btn-secondary" data-x>취소</button><button class="btn btn-primary" data-ok>확인하고 적용</button></div></div>';
    document.body.appendChild(wrap);open=wrap;
    const done=(fn,v)=>{wrap.remove();open=null;document.removeEventListener('keydown',onKey);fn(v);};
    const onKey=e=>{if(e.key==='Escape')done(reject,new Error('AI 요청을 취소했어요.'));};
    document.addEventListener('keydown',onKey);
    wrap.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>done(reject,new Error('AI 요청을 취소했어요.')));
    wrap.querySelector('[data-copy]').onclick=async e=>{
      const ta=wrap.querySelector('#ai-manual-prompt');
      try{await navigator.clipboard.writeText(promptText);e.target.textContent='복사했어요 ✓';}
      catch(_e){ta.focus();ta.select();e.target.textContent='선택했어요 · Ctrl+C';}
    };
    wrap.querySelector('[data-ok]').onclick=()=>{
      const v=wrap.querySelector('#ai-manual-answer').value.trim();
      if(!v){wrap.querySelector('[data-err]').textContent='받은 답을 붙여 넣어 주세요.';return;}
      done(resolve,v);
    };
    setTimeout(()=>wrap.querySelector('[data-copy]')?.focus(),30);
  });
}
/* 채팅 답에는 "물론이죠! ```json …```" 처럼 앞뒤 말이 붙는다. JSON을 요청한 경우에만 JSON 부분을 꺼낸다. */
function pickJson(text,wantsJson){
  const t=String(text||'').trim();
  if(!wantsJson)return t;
  const fence=t.match(/```(?:json)?s*([sS]*?)```/i);
  if(fence){try{JSON.parse(fence[1].trim());return fence[1].trim();}catch(_e){}}
  if(/^[[{]/.test(t))return t;
  for(const [a,b] of [['{','}'],['[',']']]){const i=t.indexOf(a),j=t.lastIndexOf(b);
    if(i>=0&&j>i){const s=t.slice(i,j+1);try{JSON.parse(s);return s;}catch(_e){}}}
  return t;
}
root.TeskAiManual={ask,pickJson,isOpen:()=>!!open};
if(typeof module==='object'&&module.exports)module.exports=root.TeskAiManual;
})(typeof window!=='undefined'?window:globalThis);
