/* 글쓰기 첨삭 모드 · 자주 쓰는 피드백 문구 · 우리 반 글 모음집 (교사 화면).
   tesk-teaching.js 다음에 불러온다. 저장은 기존 글 저장소(writingStore)를 그대로 쓰고,
   모음집 정보는 글 문서의 anthology 필드에만 둔다(원문 content 는 바꾸지 않는다). */
(function(){
  'use strict';
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const P = window.WritingProofread;
  const sig = w => window.TeachingCore.signature(w);
  const find = id => (peskWritingsAll || []).find(w => w.id === id);
  const currentId = () => String(writingDetailId || '').startsWith('pesk:') ? String(writingDetailId).slice(5) : '';
  let anthologyOpen = false;

  /* ── 첨삭 대기열: 아직 확인하지 않은 글 + 피드백 뒤 고쳐 쓴 글. 오래된 날짜 → 번호 순 ── */
  function needsReview(w){ return (!w.feedback && !w.readAt) || w.needsRevisionReview === true; }
  function queue(){
    return (peskWritingsAll || []).filter(needsReview).sort((a, b) =>
      getPeskWritingDateKey(a).localeCompare(getPeskWritingDateKey(b))
      || (Number(a.studentNum) || 999999) - (Number(b.studentNum) || 999999)
      || getPeskWritingTime(a) - getPeskWritingTime(b));
  }
  function start(){
    const q = queue();
    if(!q.length) return showToast('확인할 글이 없어요 🎉');
    anthologyOpen = false;
    openPeskWritingFeedback(q[0].id);
  }
  /* 방금 처리한 글 다음 순서의 대기 글 (처리 전 순서를 기준으로) */
  function nextInQueue(id, before){
    const live = new Set(queue().map(w => w.id));
    live.delete(id);
    const at = before.indexOf(id);
    return before.slice(at + 1).find(x => live.has(x)) || before.slice(0, Math.max(0, at)).find(x => live.has(x)) || [...live][0] || '';
  }
  function goNextOrList(id, before, doneMsg){
    const next = nextInQueue(id, before);
    if(next){ openPeskWritingFeedback(next); return; }
    writingDetailId = null; _peskFeedbackId = null; renderWriting();
    showToast(doneMsg || '🎉 확인할 글을 모두 봤어요');
  }

  /* 숨긴 '이번에 고쳐 볼 한 가지' 칸에 AI가 채운 값이 학생에게 몰래 가지 않게 비운다 */
  function clearHiddenGoal(){
    const goal = document.getElementById('teach-writing-goal');
    if(goal && goal.closest('.teach-writing-coach')?.hidden) goal.value = '';
  }
  const baseSubmit = window.submitPeskFeedback;
  window.submitPeskFeedback = function(...args){ clearHiddenGoal(); return baseSubmit.apply(this, args); };

  /* ── 맞춤법·어색한 문장 고치기 ── AI는 고칠 곳 목록만 주고, 원문에 없는 구간·내용을 바꾸는 제안은 버린다 */
  const proof = {id:'', basis:'', level:2, result:null, busy:false, picked:new Set()};
  function proofPanel(id){
    const box = document.createElement('div');
    box.className = 'card wr-proof'; box.id = 'wr-proof';
    if(proof.id !== id || proof.basis !== sig(find(id))) Object.assign(proof, {id, basis:sig(find(id)), result:null, busy:false, picked:new Set()});
    drawProof(box);
    return box;
  }
  function drawProof(box){
    box = box || document.getElementById('wr-proof'); if(!box) return;
    const w = find(proof.id); if(!w) return;
    const r = proof.result;
    let html = '<div class="wr-proof-head"><b>✏️ 맞춤법 · 어색한 문장 고치기</b>'
      + '<div class="wr-proof-levels">'
      + '<button type="button" class="wr-chip' + (proof.level === 1 ? ' on' : '') + '" data-proof-level="1">맞춤법만</button>'
      + '<button type="button" class="wr-chip' + (proof.level === 2 ? ' on' : '') + '" data-proof-level="2">맞춤법 + 어색한 문장</button></div>'
      + '<button type="button" class="btn btn-sm btn-purple" data-proof-run' + (proof.busy ? ' disabled' : '') + '>'
      + (proof.busy ? 'AI가 살펴보는 중…' : r ? '다시 살펴보기' : '✨ 고칠 곳 찾기') + '</button></div>';
    if(!r){
      html += '<p class="wr-muted wr-proof-help">학생 원문은 바꾸지 않아요. 고칠 곳을 골라 피드백에 넣어 학생에게 알려 줄 수 있어요. 학생 이름은 AI에 보내지 않아요.</p>';
    }else if(!r.edits.length){
      html += '<p class="wr-note">고칠 곳을 찾지 못했어요.' + (r.dropped ? ' <span class="wr-muted">(내용을 바꾸는 제안 ' + r.dropped + '개는 뺐어요)</span>' : '') + '</p>';
    }else{
      const segs = P.segments(w.content, r.edits).map(x => x.text !== undefined ? E(x.text)
        : '<button type="button" class="wr-edit' + (proof.picked.has(x.edit.id) ? ' on' : '') + '" data-proof-edit="' + x.edit.id + '" title="' + E(x.edit.reason) + '"><del>' + E(x.edit.from) + '</del><ins>' + E(x.edit.to) + '</ins></button>').join('');
      html += '<p class="wr-note">고칠 곳 ' + r.edits.length + '개 · 표시를 누르면 빼거나 다시 넣어요.'
        + (r.dropped ? ' <span class="wr-muted">(원문과 맞지 않거나 내용을 바꾸는 제안 ' + r.dropped + '개는 뺐어요)</span>' : '') + '</p>'
        + '<div class="wr-text">' + segs + '</div>'
        + '<ul class="wr-edit-list">' + r.edits.map(e => '<li><label><input type="checkbox" data-proof-check="' + e.id + '"' + (proof.picked.has(e.id) ? ' checked' : '') + '> <del>' + E(e.from) + '</del> → <ins>' + E(e.to) + '</ins> <small>' + E(e.type ? e.type + ' · ' : '') + E(e.reason) + '</small></label></li>').join('') + '</ul>'
        + '<div class="wr-proof-foot"><button type="button" class="btn btn-sm btn-primary" data-proof-insert' + (proof.picked.size ? '' : ' disabled') + '>고른 ' + proof.picked.size + '곳을 피드백에 넣기</button>'
        + '<button type="button" class="btn btn-sm btn-secondary" data-proof-copy' + (proof.picked.size ? '' : ' disabled') + '>고친 글 복사</button></div>';
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-proof-level]').forEach(b => b.onclick = () => { proof.level = Number(b.dataset.proofLevel); proof.result = null; proof.picked = new Set(); drawProof(); });
    box.querySelector('[data-proof-run]').onclick = runProof;
    box.querySelectorAll('[data-proof-edit],[data-proof-check]').forEach(b => b.onclick = () => {
      const eid = b.dataset.proofEdit || b.dataset.proofCheck;
      proof.picked.has(eid) ? proof.picked.delete(eid) : proof.picked.add(eid); drawProof();
    });
    box.querySelector('[data-proof-insert]')?.addEventListener('click', insertProof);
    box.querySelector('[data-proof-copy]')?.addEventListener('click', copyProof);
  }
  async function runProof(){
    const w = find(proof.id); if(!w || proof.busy) return;
    const basis = sig(w);
    proof.busy = true; drawProof();
    try{
      const raw = await callTeachAI(P.prompt(w.content, proof.level), {temperature:0.05, maxTokens:4000, allowPartial:false, continueOnLength:false});
      const live = find(proof.id);
      if(!live || sig(live) !== basis) throw new Error('학생이 글을 고쳤어요. 다시 살펴봐 주세요.');
      proof.result = P.validate(raw, live.content, proof.level);
      proof.picked = new Set(proof.result.edits.map(e => e.id));
    }catch(e){
      showToast(e.message === 'PROOFREAD_FORMAT' ? 'AI 응답 형식이 맞지 않아요. 다시 시도해 주세요.' : 'AI 제안을 받지 못했어요: ' + e.message);
    }finally{ proof.busy = false; drawProof(); }
  }
  function pickedEdits(){ return (proof.result?.edits || []).filter(e => proof.picked.has(e.id)); }
  function insertProof(){
    const ta = document.getElementById('pesk-fb-text'), list = pickedEdits();
    if(!ta || !list.length) return;
    const text = '✏️ 고쳐 볼 곳\n' + list.map(e => '· ' + e.from + ' → ' + e.to + (e.reason ? ' (' + e.reason + ')' : '')).join('\n');
    ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n\n' + text : text;
    ta.focus(); ta.scrollIntoView({block:'center', behavior:'smooth'});
    showToast('고칠 곳을 피드백 칸에 넣었어요. 확인한 뒤 보내 주세요.');
  }
  async function copyProof(){
    const w = find(proof.id); if(!w) return;
    const fixed = P.apply(w.content, proof.result.edits, [...proof.picked]);
    try{ await navigator.clipboard.writeText(fixed); showToast('고친 글을 복사했어요. 학생 원문은 그대로예요.'); }
    catch(_e){ showToast('복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.'); }
  }

  async function sendAndNext(id){
    const ta = document.getElementById('pesk-fb-text');
    const text = (ta?.value || '').trim();
    if(!text) return showToast('피드백을 입력해주세요.');
    const before = queue().map(w => w.id);
    await submitPeskFeedback(id);                      // 성공·실패 안내는 기존 전송 함수가 한다
    const saved = find(id);
    if(!saved || saved.feedback !== text) return;     // 실패하면 이 글에 머문다
    goNextOrList(id, before, '✅ 전달했어요. 확인할 글을 모두 봤어요 🎉');
  }

  /* 읽음 처리 뒤·화살표 이동도 대기열 순서를 따른다 (대기열 밖의 글은 기존 날짜 순서) */
  const baseMove = window.movePeskWriting;
  window.movePeskWriting = function(dir){
    const id = currentId(), ids = queue().map(w => w.id), i = ids.indexOf(id);
    if(i < 0) return baseMove(dir);
    const n = ids[i + (dir < 0 ? -1 : 1)];
    if(n) openPeskWritingFeedback(n);
    else showToast(dir < 0 ? '첫 번째 글이에요' : '마지막 글이에요');
  };
  window.openNextPeskWritingAfterRead = function(id){
    const before = queue().map(w => w.id);
    if(!before.includes(id)) before.unshift(id);
    const next = nextInQueue(id, before);
    if(!next) return false;
    openPeskWritingFeedback(next);
    return true;
  };

  /* ── 자주 쓰는 피드백 문구 ── */
  const PHRASE_KEY = 'tesk-writing-phrases';
  const DEFAULT_PHRASES = ['🌟 참 잘했어요!', '첫 문장이 인상적이에요.', '자세히 보고 쓴 부분이 좋아요.',
    '그때 어떤 마음이 들었는지 한 문장 더 써 볼까요?', '이유를 한 가지 더 들어 주면 더 잘 전해져요.', '맞춤법을 한 번 더 살펴봐요.'];
  let phraseEdit = false;
  function phrases(){ const v = load(PHRASE_KEY, null); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : DEFAULT_PHRASES.slice(); }
  function savePhrases(list){ save(PHRASE_KEY, list.slice(0, 30)); }
  function phraseBarHtml(){
    return phrases().map((p, i) => '<button type="button" class="wr-chip' + (phraseEdit ? ' edit' : '') + '" data-phrase="' + i + '" title="' + E(p) + '">'
      + E(p.length > 26 ? p.slice(0, 26) + '…' : p) + (phraseEdit ? ' <b aria-label="삭제">×</b>' : '') + '</button>').join('')
      + '<button type="button" class="wr-chip add" data-phrase-add>+ 문구 저장</button>'
      + '<button type="button" class="wr-chip ghost" data-phrase-edit>' + (phraseEdit ? '편집 끝' : '편집') + '</button>';
  }
  function insertAtCursor(ta, text){
    const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, s), after = ta.value.slice(e);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    ta.value = before + pad + text + (after && !/^\s/.test(after) ? ' ' : '') + after;
    const at = (before + pad + text).length;
    ta.focus(); ta.setSelectionRange(at, at);
  }
  function bindPhraseBar(bar, ta){
    bar.innerHTML = phraseBarHtml();
    bar.onclick = e => {
      const chip = e.target.closest('button'); if(!chip) return;
      if(chip.hasAttribute('data-phrase-edit')){ phraseEdit = !phraseEdit; bindPhraseBar(bar, ta); return; }
      if(chip.hasAttribute('data-phrase-add')){
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
        const text = sel || (ta.value.trim().length <= 150 ? ta.value.trim() : '');
        if(!text) return showToast('저장할 문장을 피드백 칸에서 드래그해 고른 뒤 눌러 주세요.');
        const list = phrases();
        if(list.includes(text)) return showToast('이미 저장된 문구예요.');
        savePhrases([...list, text]); bindPhraseBar(bar, ta); showToast('문구를 저장했어요.');
        return;
      }
      const i = Number(chip.dataset.phrase), list = phrases();
      if(phraseEdit){ list.splice(i, 1); savePhrases(list); bindPhraseBar(bar, ta); return; }
      insertAtCursor(ta, list[i]);
    };
  }

  /* ── 상세 화면 꾸미기 ── */
  function queueHtml(id){
    const q = queue(), inQ = q.some(w => w.id === id), cur = find(id);
    const item = (w, extra) => '<button type="button" class="wr-q-item' + (w.id === id ? ' on' : '') + '" data-open="' + E(w.id) + '">'
      + '<span class="wr-q-top"><b>' + E(w.studentName || '') + '</b><small>' + E(formatPeskWritingDateLabel(getPeskWritingDateKey(w))) + (w.needsRevisionReview ? ' · 고쳐 씀' : '') + extra + '</small></span>'
      + '<span class="wr-q-title">' + E(w.title || '제목 없음') + '</span>'
      + '<span class="wr-q-prev">' + E(String(w.content || '').replace(/\s+/g, ' ').slice(0, 40)) + '</span></button>';
    const pos = q.findIndex(w => w.id === id);
    return '<div class="wr-q-head"><b>확인할 글</b><span>' + (inQ ? (pos + 1) + ' / ' + q.length : q.length + '편 남음') + '</span></div>'
      + (!inQ && cur ? '<div class="wr-q-label">지금 보는 글</div>' + item(cur, '') + (q.length ? '<div class="wr-q-label">대기 중</div>' : '') : '')
      + (q.length ? q.map(w => item(w, '')).join('') : '<p class="wr-q-empty">🎉 확인할 글을 모두 봤어요</p>')
      + '<p class="wr-q-keys"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 보내고 다음 · <kbd>J</kbd>/<kbd>K</kbd> 다음·이전 글</p>';
  }
  function anthologyBadge(w){
    const a = w.anthology;
    if(!a || a.status === 'withdrawn') return '';
    const label = {published:'📚 모음집에 실림', 'student-review':'📚 학생 확인 중', declined:'📚 학생이 싣지 않기로 함'}[a.status] || '';
    return label ? '<span class="wr-anth-badge ' + E(a.status) + '">' + label + '</span>' : '';
  }

  function enhanceDetail(id){
    const el = document.getElementById('writing-content'), w = find(id);
    if(!el || !w || el.querySelector('.wr-review')) return;
    // 2단: 왼쪽 대기열 · 오른쪽 기존 상세 화면
    const main = document.createElement('div'); main.className = 'wr-main';
    while(el.firstChild) main.appendChild(el.firstChild);
    const wrap = document.createElement('div'); wrap.className = 'wr-review';
    const aside = document.createElement('aside'); aside.className = 'wr-queue'; aside.setAttribute('aria-label', '확인할 글 목록');
    aside.innerHTML = queueHtml(id);
    wrap.append(aside, main); el.appendChild(wrap);

    // 상단 막대: 모음집 · 삭제 버튼과 상태 표시
    const nav = main.firstElementChild;
    if(nav){
      const tools = document.createElement('div'); tools.className = 'wr-tools';
      tools.innerHTML = anthologyBadge(w)
        + '<button class="btn btn-sm btn-secondary" data-anth>' + (w.anthology && w.anthology.status !== 'withdrawn' ? '📚 모음집 관리' : '📚 모음집에 올리기') + '</button>'
        + '<button class="btn btn-sm wr-danger" data-del>🗑️ 삭제</button>';
      // 고쳐 쓴 글은 [수정된 글 확인], 아직 안 읽은 글은 [읽음 처리]
      const unread = !w.feedback && !w.readAt;
      if(w.needsRevisionReview || unread){
        const confirm = document.createElement('button');
        confirm.className = 'btn btn-sm btn-primary'; confirm.textContent = w.needsRevisionReview ? '✓ 수정된 글 확인' : '👁️ 읽음 처리';
        confirm.dataset.basis = sig(w);
        confirm.onclick = () => markPeskWritingRead(id, confirm);
        tools.prepend(confirm);
        document.getElementById('pesk-read-btn')?.remove();   // 아래 피드백 칸의 같은 버튼은 겹치므로 뺀다
      }
      nav.insertBefore(tools, nav.lastElementChild);
      tools.querySelector('[data-anth]').onclick = () => openAnthologyModal(id);
      tools.querySelector('[data-del]').onclick = () => deletePeskWriting(id);
    }

    // 원문은 위에 전부 펼치고, 피드백 입력은 그 아래에 같은 너비로 둔다 (학생의 다른 글 목록은 두지 않는다)
    const original = main.querySelector('.teach-original') || [...main.querySelectorAll('.card')].find(c => c.textContent.includes('학생 작성 내용'));
    if(original) original.classList.add('wr-original');

    // 피드백 입력을 먼저, 지도 기준·비교는 그 아래로
    const form = document.getElementById('pesk-feedback-form-' + id);
    // '고쳐쓰기 지도' 상자는 쓰지 않는다. AI 피드백·전송 함수가 그 안의 입력칸을 읽으므로 지우지 않고 숨긴다.
    const coach = main.querySelector('.teach-writing-coach');
    if(coach) coach.hidden = true;
    // 원문 바로 아래: 맞춤법·어색한 문장 고치기 제안 (학생 원문은 바꾸지 않는다)
    if(original && w.content) original.insertAdjacentElement('afterend', proofPanel(id));
    const ta = document.getElementById('pesk-fb-text');
    if(form && ta){
      const bar = document.createElement('div'); bar.className = 'wr-phrases'; bar.setAttribute('aria-label', '자주 쓰는 피드백 문구');
      ta.closest('.form-group')?.insertAdjacentElement('beforebegin', bar) || ta.before(bar);
      bindPhraseBar(bar, ta);
      ta.addEventListener('keydown', e => { if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); sendAndNext(id); } });
      // 버튼: [보내고 다음 글] 을 주 버튼으로. 기존 전송은 '보내기만', 취소는 목록 버튼과 겹쳐 뺀다.
      const oldSend = form.querySelector('.btn-primary');
      const row = oldSend?.parentElement;
      if(oldSend && row){
        oldSend.classList.remove('btn-primary'); oldSend.classList.add('btn-secondary'); oldSend.textContent = '보내기만';
        const next = document.createElement('button');
        next.className = 'btn btn-primary'; next.type = 'button'; next.textContent = '📤 보내고 다음 글 →';
        next.onclick = () => sendAndNext(id);
        const ai = row.querySelector('#ai-writing-fb-btn');
        if(ai) ai.after(next); else row.prepend(next);          // AI 피드백 다음 자리
        [...row.querySelectorAll('button')].find(b => b.textContent.trim() === '취소')?.remove();
      }
    }
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPeskWritingFeedback(b.dataset.open));
    aside.querySelector('.wr-q-item.on')?.scrollIntoView({block:'nearest'});
  }
  const baseDetail = window.renderPeskWritingDetail;
  window.renderPeskWritingDetail = function(id){
    anthologyOpen = false;
    baseDetail(id);
    try{ enhanceDetail(id); }catch(e){ console.warn('첨삭 화면 꾸미기 실패', e); }
  };

  // J / K: 입력 중이 아닐 때 다음·이전 글
  document.addEventListener('keydown', e => {
    if(e.ctrlKey || e.metaKey || e.altKey || !currentId()) return;
    if(!document.getElementById('page-writing')?.classList.contains('active')) return;
    if(e.target.closest?.('input,textarea,select,[contenteditable="true"]') || document.querySelector('.wr-modal')) return;
    if(e.key === 'j' || e.key === 'J'){ e.preventDefault(); window.movePeskWriting(1); }
    if(e.key === 'k' || e.key === 'K'){ e.preventDefault(); window.movePeskWriting(-1); }
  });

  /* ── 우리 반 글 모음집 ── */
  const now = () => new Date().toISOString();
  const authorName = w => w.anthology?.anonymous ? '우리 반 친구' : (w.studentName || '우리 반 친구');
  let modal = null;

  function openAnthologyModal(id){
    const w = find(id); if(!w) return;
    const a = w.anthology && w.anthology.status !== 'withdrawn' ? w.anthology : null;
    const st = {id, basis:sig(w), level:a?.level ?? 1, anonymous:!!a?.anonymous, mode:'teacher', result:null, accepted:new Set(), dropped:0, busy:false, existing:a};
    closeModal();
    modal = document.createElement('div'); modal.className = 'wr-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    const draw = () => drawAnthologyModal(st);
    st.draw = draw; draw();
    modal.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
    modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
  }
  function closeModal(){ modal?.remove(); modal = null; }

  function drawAnthologyModal(st){
    const w = find(st.id); if(!w || !modal) return closeModal();
    const a = st.existing;
    const opt = (name, val, cur, label, sub) => '<label class="wr-opt' + (String(cur) === String(val) ? ' on' : '') + '"><input type="radio" name="' + name + '" value="' + val + '"' + (String(cur) === String(val) ? ' checked' : '') + '><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</label>';
    let body = '';
    if(a && a.status === 'published'){
      body = '<p class="wr-note">이 글은 모음집에 실려 있어요 · ' + E(authorName(w)) + (a.by === 'student' ? ' · 학생이 제안을 확인했어요' : '') + '</p>'
        + '<div class="wr-text">' + E(a.text || w.content) + '</div>'
        + '<div class="wr-modal-foot"><button class="btn btn-secondary" data-close>닫기</button><button class="btn wr-danger" data-withdraw>모음집에서 내리기</button><button class="btn btn-secondary" data-redo>다시 다듬어 올리기</button></div>';
    }else if(a && a.status === 'student-review'){
      body = '<p class="wr-note">학생에게 맞춤법 제안 ' + (a.edits || []).length + '개를 보냈어요. 학생이 하나씩 고르면 모음집에 실려요.</p>'
        + '<div class="wr-modal-foot"><button class="btn btn-secondary" data-close>닫기</button><button class="btn wr-danger" data-withdraw>요청 취소</button><button class="btn btn-secondary" data-redo>다시 만들기</button></div>';
    }else{
      if(a && a.status === 'declined') body += '<p class="wr-note">학생이 이 글은 싣지 않기로 했어요. 학생과 이야기한 뒤 다시 올릴 수 있어요.</p>';
      body += '<div class="wr-opts"><span>다듬기</span>'
          + opt('lv', 1, st.level, '맞춤법만', '권장') + opt('lv', 2, st.level, '문장 다듬기', '호응·연결·반복') + opt('lv', 0, st.level, '원문 그대로', '') + '</div>'
        + '<div class="wr-opts"><span>이름</span>' + opt('anon', 'false', st.anonymous, '이름 공개', '') + opt('anon', 'true', st.anonymous, '이름 가리기', '“우리 반 친구”') + '</div>'
        + (st.level ? '<div class="wr-opts"><span>확인</span>' + opt('mode', 'teacher', st.mode, '선생님이 확인', '바로 실어요') + opt('mode', 'student', st.mode, '학생이 확인', '학생이 하나씩 골라요 · 고쳐쓰기 공부') + '</div>' : '');
      if(st.level && !st.result){
        body += '<div class="wr-ai-box"><button class="btn btn-purple" data-ai' + (st.busy ? ' disabled' : '') + '>' + (st.busy ? 'AI가 살펴보는 중…' : '✨ AI 제안 받기') + '</button>'
          + '<small>원문은 그대로 두고 고칠 곳 목록만 받아요. 학생 이름은 보내지 않아요.</small></div>';
      }
      if(st.level && st.result){
        const segs = P.segments(w.content, st.result.edits).map(s => s.text !== undefined ? E(s.text)
          : '<button type="button" class="wr-edit' + (st.accepted.has(s.edit.id) ? ' on' : '') + '" data-edit="' + s.edit.id + '" title="' + E(s.edit.reason) + '"><del>' + E(s.edit.from) + '</del><ins>' + E(s.edit.to) + '</ins></button>').join('');
        body += '<p class="wr-note">' + (st.result.edits.length
            ? '고칠 곳 ' + st.result.edits.length + '개 · 표시를 누르면 빼거나 다시 넣어요.' + (st.mode === 'student' ? ' 남긴 제안만 학생에게 보내요.' : '')
            : 'AI가 고칠 곳을 찾지 못했어요. 원문 그대로 올릴 수 있어요.')
          + (st.result.dropped ? ' <span class="wr-muted">(원문과 맞지 않거나 내용을 바꾸는 제안 ' + st.result.dropped + '개는 뺐어요)</span>' : '') + '</p>'
          + '<div class="wr-text">' + segs + '</div>'
          + (st.result.edits.length ? '<ul class="wr-edit-list">' + st.result.edits.map(e => '<li><label><input type="checkbox" data-edit-check="' + e.id + '"' + (st.accepted.has(e.id) ? ' checked' : '') + '> <del>' + E(e.from) + '</del> → <ins>' + E(e.to) + '</ins> <small>' + E(e.type ? e.type + ' · ' : '') + E(e.reason) + '</small></label></li>').join('') + '</ul>' : '')
          + '<button class="btn btn-sm btn-secondary" data-ai>다시 제안 받기</button>';
      }
      if(!st.level) body += '<div class="wr-text">' + E(w.content) + '</div>';
      const canSend = !st.level || st.result;
      const toStudent = st.level && st.mode === 'student' && st.result && st.accepted.size;
      body += '<div class="wr-modal-foot"><button class="btn btn-secondary" data-close>취소</button>'
        + '<button class="btn btn-primary" data-publish' + (canSend && !st.busy ? '' : ' disabled') + '>' + (toStudent ? '학생에게 확인 요청 보내기' : '📚 모음집에 올리기') + '</button></div>';
    }
    modal.innerHTML = '<div class="wr-modal-box"><div class="wr-modal-head"><div><b>📚 우리 반 글 모음집</b><small>' + E(w.title || '') + ' · ' + E(w.studentName || '') + '</small></div><button class="icon-button" data-close aria-label="닫기">×</button></div>' + body + '</div>';
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
    modal.querySelectorAll('input[name="lv"]').forEach(r => r.onchange = () => { st.level = Number(r.value); st.result = null; st.draw(); });
    modal.querySelectorAll('input[name="anon"]').forEach(r => r.onchange = () => { st.anonymous = r.value === 'true'; st.draw(); });
    modal.querySelectorAll('input[name="mode"]').forEach(r => r.onchange = () => { st.mode = r.value; st.draw(); });
    modal.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => runProofread(st));
    modal.querySelectorAll('[data-edit],[data-edit-check]').forEach(b => b.onclick = () => {
      const eid = b.dataset.edit || b.dataset.editCheck;
      st.accepted.has(eid) ? st.accepted.delete(eid) : st.accepted.add(eid); st.draw();
    });
    modal.querySelector('[data-publish]')?.addEventListener('click', () => publish(st));
    modal.querySelector('[data-withdraw]')?.addEventListener('click', () => withdraw(st));
    modal.querySelector('[data-redo]')?.addEventListener('click', () => { st.existing = null; st.result = null; st.draw(); });
    (modal.querySelector('[data-publish]') || modal.querySelector('[data-close]'))?.focus({preventScroll:true});
  }

  async function runProofread(st){
    const w = find(st.id); if(!w || st.busy) return;
    st.busy = true; st.draw();
    try{
      const raw = await callTeachAI(P.prompt(w.content, st.level), {temperature:0.05, maxTokens:4000, allowPartial:false, continueOnLength:false});
      const live = find(st.id);
      if(!live || sig(live) !== st.basis) throw new Error('학생이 글을 고쳤어요. 창을 닫고 다시 열어 주세요.');
      st.result = P.validate(raw, live.content, st.level);
      st.accepted = new Set(st.result.edits.map(e => e.id));
    }catch(e){
      showToast(e.message === 'PROOFREAD_FORMAT' ? 'AI 응답 형식이 맞지 않아요. 다시 시도해 주세요.' : 'AI 제안을 받지 못했어요: ' + e.message);
    }finally{ st.busy = false; st.draw(); }
  }

  async function saveAnthology(id, basis, make){
    return applyPeskWritingEntry(await writingStore().update(id, cur => {
      if(sig(cur) !== basis) throw new Error('학생이 글을 고쳤어요. 창을 닫고 다시 열어 주세요.');
      return {...cur, anthology:make(cur)};
    }));
  }
  async function publish(st){
    const w = find(st.id); if(!w || st.busy) return;
    const edits = st.level && st.result ? st.result.edits.filter(e => st.accepted.has(e.id)) : [];
    const toStudent = st.level && st.mode === 'student' && edits.length;
    const base = {level:st.level, anonymous:st.anonymous, basis:st.basis, edits, requestedAt:now(), by:'teacher'};
    st.busy = true; st.draw();
    try{
      await saveAnthology(st.id, st.basis, cur => toStudent
        ? {...base, status:'student-review'}
        : {...base, status:'published', title:cur.title, text:P.apply(cur.content, edits, edits.map(e => e.id)), acceptedIds:edits.map(e => e.id), publishedAt:now()});
      closeModal();
      showToast(toStudent ? '학생에게 확인 요청을 보냈어요. 학생이 고르면 모음집에 실려요.' : '📚 모음집에 올렸어요.');
      if(typeof addActivity === 'function') addActivity('📚 ' + (w.studentName || '') + '의 글 모음집 ' + (toStudent ? '확인 요청' : '게재'));
      rerender();
    }catch(e){ showToast('저장하지 못했어요: ' + e.message); st.busy = false; st.draw(); }
  }
  async function withdraw(st){
    const w = find(st.id); if(!w) return;
    const ok = await openAppConfirmModal({title:'모음집에서 내리기', message:'"' + (w.title || '') + '" 글을 모음집에서 내릴까요?\n학생 원문은 그대로 남아요.', submitText:'내리기', danger:true});
    if(!ok) return;
    try{
      await saveAnthology(st.id, sig(w), cur => ({...cur.anthology, status:'withdrawn', withdrawnAt:now()}));
      closeModal(); showToast('모음집에서 내렸어요.'); rerender();
    }catch(e){ showToast('저장하지 못했어요: ' + e.message); }
  }
  function rerender(){
    if(anthologyOpen) return renderWriting();
    const id = currentId();
    if(id) renderPeskWritingDetail(id); else renderWriting();
  }

  /* 모음집 화면 (교사) */
  function openAnthology(){ anthologyOpen = true; writingDetailId = null; _peskFeedbackId = null; renderWriting(); }
  function anthologyRows(status){
    return (peskWritingsAll || []).filter(w => w.anthology?.status === status)
      .sort((a, b) => String(b.anthology.publishedAt || b.anthology.requestedAt || '').localeCompare(String(a.anthology.publishedAt || a.anthology.requestedAt || '')));
  }
  function renderAnthology(){
    const el = document.getElementById('writing-content'); if(!el) return;
    const pub = anthologyRows('published'), review = anthologyRows('student-review'), declined = anthologyRows('declined');
    const small = list => list.map(w => '<button type="button" class="wr-h-item" data-open="' + E(w.id) + '"><span><b>' + E(w.title || '') + '</b> <small>' + E(w.studentName || '') + '</small></span></button>').join('');
    el.innerHTML = '<div class="wr-anth-head"><button class="btn btn-sm btn-secondary" data-back>← 글 목록</button>'
      + '<div><b>📚 우리 반 글 모음집</b><small>실린 글 ' + pub.length + '편 · 학생 앱의 글쓰기 탭에 보여요</small></div>'
      + '<button class="btn btn-sm btn-primary" data-print' + (pub.length ? '' : ' disabled') + '>🖨️ 문집으로 인쇄</button></div>'
      + (review.length ? '<div class="card"><div class="card-title">학생 확인 중 ' + review.length + '편</div>' + small(review) + '</div>' : '')
      + (declined.length ? '<div class="card"><div class="card-title">학생이 싣지 않기로 한 글 ' + declined.length + '편</div>' + small(declined) + '</div>' : '')
      + (pub.length ? pub.map(w => '<article class="card wr-anth-item"><div class="wr-anth-item-head"><div><b>' + E(w.anthology.title || w.title || '') + '</b><small>' + E(authorName(w))
          + (w.anthology.anonymous ? ' (' + E(w.studentName || '') + ')' : '') + ' · ' + E(formatPeskWritingDateLabel(getPeskWritingDateKey(w)))
          + (w.anthology.edits?.length ? ' · 다듬은 곳 ' + (w.anthology.acceptedIds || []).length + '개' : ' · 원문 그대로') + '</small></div>'
          + '<button class="btn btn-sm btn-secondary" data-manage="' + E(w.id) + '">관리</button></div>'
          + '<div class="wr-text">' + E(w.anthology.text || w.content) + '</div></article>').join('')
        : '<div class="card" style="text-align:center;color:var(--hint);padding:30px;">아직 실린 글이 없어요.<br>글 상세 화면의 <b>📚 모음집에 올리기</b>로 글을 골라 주세요.</div>');
    el.querySelector('[data-back]').onclick = () => { anthologyOpen = false; renderWriting(); };
    el.querySelector('[data-print]').onclick = () => printAnthology(pub);
    el.querySelectorAll('[data-manage]').forEach(b => b.onclick = () => openAnthologyModal(b.dataset.manage));
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { anthologyOpen = false; openPeskWritingFeedback(b.dataset.open); });
  }
  function printAnthology(list){
    const title = (settings?.className || '우리 반') + ' 글 모음집';
    const win = window.open('', '_blank');
    if(!win) return showToast('팝업이 막혀 있어요. 이 사이트의 팝업을 허용해 주세요.');
    win.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + E(title) + '</title><style>'
      + 'body{font-family:"Pretendard","Malgun Gothic",sans-serif;margin:18mm;color:#222;line-height:1.9}h1{text-align:center;font-size:26px;margin:40px 0 6px}'
      + '.sub{text-align:center;color:#777;margin-bottom:40px}article{break-inside:avoid;margin:0 0 34px;padding-bottom:22px;border-bottom:1px dashed #bbb}'
      + 'h2{font-size:18px;margin:0 0 2px}.by{color:#666;font-size:13px;margin-bottom:10px}p{white-space:pre-wrap;margin:0;font-size:15px}'
      + '@media print{body{margin:12mm}}</style></head><body><h1>' + E(title) + '</h1><div class="sub">' + E(new Date().toLocaleDateString('ko-KR')) + ' · ' + list.length + '편</div>'
      + list.slice().reverse().map(w => '<article><h2>' + E(w.anthology.title || w.title || '') + '</h2><div class="by">' + E(authorName(w)) + '</div><p>' + E(w.anthology.text || w.content) + '</p></article>').join('')
      + '<script>setTimeout(function(){print()},300)<\/script></body></html>');
    win.document.close();
  }

  // 목록 화면: 모음집을 보고 있으면 모음집을 그린다
  const baseRenderWriting = window.renderWriting;
  window.renderWriting = function(...args){
    if(anthologyOpen && !writingDetailId){ try{ return renderAnthology(); }catch(e){ console.warn(e); anthologyOpen = false; } }
    return baseRenderWriting.apply(this, args);
  };

  window.TeskWritingReview = {queue, start, sendAndNext, openAnthology, openAnthologyModal, phrases};
})();
