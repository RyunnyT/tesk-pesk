/* Teacher setup and completion of class-wide activity rewards. */
function classRewardFormToggle(prefix){
  const on = !!document.getElementById(prefix+'-boss-reward')?.checked;
  ['price','stock','pay','goal'].forEach(key => {
    const input = document.getElementById(prefix+'-'+key);
    if(input){ input.disabled = on; input.closest('.form-group')?.classList.toggle('class-reward-unused', on); }
  });
  const goal = document.getElementById(prefix+'-goal-target');
  if(goal) goal.disabled = on;
}
function openClassRewardFormT(){
  document.getElementById('shop-name').value='체육 시간 1회';
  document.getElementById('shop-icon').value='⚽';
  document.getElementById('shop-price').value='0';
  document.getElementById('shop-stock').value='1';
  document.getElementById('shop-pay').value='coin';
  document.getElementById('shop-goal').checked=false;
  document.getElementById('shop-boss-reward').checked=true;
  classRewardFormToggle('shop');onShopGoalToggle('shop');
  openModal('modal-add-shop');
}
function classBossRewardSummaryT(){
  const selected = window.PeskBossQuest.rewards(shopItems);
  return '<div class="form-editor-summary"><b>🎁 학급 공동 활동 보상</b><p style="margin:8px 0">'
    + (selected.length ? selected.map(x => escHtml(x.icon || '🎁')+' '+escHtml(x.name)).join(' · ') : '아직 지정한 보상이 없어요. 상점에서 예: 체육 시간 1회, 영화 감상 시간을 추가하세요.')
    + '</p><p>보스 한 판을 무찌르면 지정한 활동이 각각 1회 열려요. 우리 반이 함께 사용하며, 코인·XP·판매 재고는 차감하지 않아요.</p>'
    + '<p class="insight-help">보스 처치 순간의 보상 설정이 적용됩니다. 이미 획득한 보상은 이후 상점 수정과 관계없이 유지됩니다.</p>'
    + '<button class="btn btn-sm btn-primary" onclick="openClassRewardFormT()">+ 공동 활동 보상 추가</button> '
    + '<button class="btn btn-sm btn-secondary" onclick="goPage(\'economy\');showEconTab(\'shop\')">상점에서 보상 관리</button></div>';
}
function bossPersonalRewardFormT(c){
  const items=shopItems.filter(x=>!x.bossReward && x.id);
  return '<div class="form-editor-summary"><b>👤 보스 참여 학생 개인 보상</b><p class="insight-help">이번 판에 1 이상의 데미지를 준 학생에게만 처치 시 각 1회 자동 지급해요. 접속 중이지 않은 참여자도 받습니다.</p><div class="qz-row">'
    + '<label class="qz-field"><span>참여자마다 학습 XP</span><input class="form-input" id="boss-reward-xp" type="number" min="0" max="100000" value="'+c.rewardXp+'"></label>'
    + '<label class="qz-field"><span>참여자마다 개인 상품</span><select class="form-input" id="boss-reward-item"><option value="">지급 안 함</option>'+items.map(x=>'<option value="'+escHtml(x.id)+'" '+(x.id===c.rewardItemId?'selected':'')+'>'+escHtml(x.name)+'</option>').join('')+'</select></label>'
    + '<label class="qz-field"><span>개인 상품 수량</span><input class="form-input" id="boss-reward-qty" type="number" min="1" max="20" value="'+c.rewardItemQty+'"></label></div>'
    + '<p class="insight-help">개인 상품은 내 보관함에 지급되며 판매 재고나 학생 잔액은 차감하지 않아요. 아래 칭호도 참여자에게만 지급해요. 전체 활동 보상은 별도로 지정하세요.</p>'
    + (qzActiveGoalsT().some(g=>g.enabled&&g.rewardXp>0)?'<button type="button" class="btn btn-sm btn-secondary" onclick="importLegacyGoalXpT()">이전 목표의 XP 보상 가져오기</button>':'')+'</div>';
}
function importLegacyGoalXpT(){
  const total=qzActiveGoalsT().filter(g=>g.enabled).reduce((sum,g)=>sum+Number(g.rewardXp||0),0);
  document.getElementById('boss-reward-xp').value=Math.min(100000,total);
  showToast('이전 목표의 XP를 가져왔어요. 보스 설정 저장을 누르면 적용됩니다.');
}
let classQuestRenderVersion = 0;
async function renderClassQuestInventoryT(){
  const box = document.getElementById('class-quest-inventory');
  if(!box) return;
  const version = ++classQuestRenderVersion;
  if(!window._db || !window._fsGetDoc){box.textContent='학급 연결 후 획득한 공동 보상이 표시됩니다.';return;}
  box.textContent = '공동 보상을 불러오는 중…';
  try{
    const snap = await window._fsGetDoc(window._fsDoc(window._db,'classrooms',TESK_ROOM,'data','pesk-purchases'));
    if(version !== classQuestRenderVersion) return;
    const rows = (snap.exists() ? snap.data().value || [] : []).filter(p => p.scope === 'class' && p.source === 'boss_quest').reverse();
    box.innerHTML = '<h3 style="font-size:14px;margin:16px 0 10px">우리 반이 획득한 공동 보상</h3>'
      + (rows.length ? rows.map(p => {
        const done = p.status === 'used_all' || p.status === 'used' || Number(p.usedQty || 0) >= 1;
        return '<div class="form-field-card"><b>'+escHtml(p.icon || '🎁')+' '+escHtml(p.itemName)+'</b>'
          + '<p class="insight-help">'+escHtml(p.bossName || '보스')+' 처치 · '+escHtml(p.date || '')+' · 학급 전체 1회</p>'
          + (done ? '<span>✅ 제공 완료</span>' : '<button class="btn btn-sm btn-primary" data-class-reward="'+escHtml(p.id)+'">제공 완료로 표시</button>')+'</div>';
      }).join('') : '<p class="insight-help">아직 획득한 공동 보상이 없어요. 보스를 처치하면 여기에 표시됩니다.</p>');
    box.querySelectorAll('[data-class-reward]').forEach(button => button.addEventListener('click', () => completeClassRewardT(button.dataset.classReward)));
  }catch(e){box.textContent='공동 보상을 불러오지 못했어요. 모험 학습을 다시 열어주세요.';}
}
async function completeClassRewardT(id){
  if(!await openAppConfirmModal({title:'공동 보상 제공 완료',message:'우리 반과 이 활동을 진행했나요? 완료하면 모든 학생에게 제공 완료로 표시됩니다.',submitText:'제공 완료'})) return;
  try{
    const ref = window._fsDoc(window._db,'classrooms',TESK_ROOM,'data','pesk-purchases');
    await window._fsRunTxn(window._db, async txn => {
      const snap = await txn.get(ref);
      const rows = window.PeskBossQuest.complete(snap.exists() ? snap.data().value || [] : [], id);
      txn.set(ref, {value:rows, updatedAt:new Date().toISOString()});
    });
    showToast('우리 반 공동 활동을 제공 완료로 표시했어요.');
    await renderClassQuestInventoryT();
  }catch(e){showToast(e.message || '저장하지 못했어요. 다시 시도해주세요.');}
}
async function settleClassBossT(){
  if(!window._db || !window._fsRunTxn) return;
  const out = await window.PeskBossQuest.settle({db:window._db,
    ref:key => window._fsDoc(window._db,'classrooms',TESK_ROOM,'data',key),runTransaction:window._fsRunTxn});
  qzProgress = out.all;
}
