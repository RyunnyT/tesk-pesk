/* Student view of the single class quest and its shared activity rewards. */
let classBossRewards = [], classBossSettlementBusy = false;
function applyClassBossPurchases(rows){
  classBossRewards = (rows || []).filter(p => p.scope === 'class' && p.source === 'boss_quest');
}
function classBossSettled(){
  const round = bossCfg && bossCfg.roundId;
  return round && allQuizProgress.__classBossQuest?.rounds?.[round];
}
function openClassBossQuest(){
  showTab('boss');
}
function openClassBossRewards(){
  shopPanelTab = 'classrewards'; showTab('shop');
  const panel = document.getElementById('panel-shop');
  if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
}
function buildClassBossQuestCard(inQuest){
  const b = bossNow();
  const selected = window.PeskBossQuest.rewards(shopItems);
  const settlement = classBossSettled();
  const rewardNames = (settlement ? settlement.items : selected).map(x => escHtml(x.name)).join(' · ');
  const personal=settlement || b?.cfg || {};
  const item=settlement?settlement.personalItem:shopItems.find(x=>!x.bossReward && x.id===personal.rewardItemId);
  const personalNames=[personal.rewardXp?'+'+personal.rewardXp+' XP':'',personal.rewardTitle?'칭호 「'+escHtml(personal.rewardTitle)+'」':'',item?escHtml(item.name)+' × '+(settlement?item.qty:personal.rewardItemQty):''].filter(Boolean).join(' · ');
  const mine=b?.on?bossMyRec().dmg:0;
  const eligible=settlement?.participants?settlement.participants.includes(Number(myStudentNum)):mine>0;
  return '<div class="qz-goal' + (b?.cleared && b?.on ? ' done' : '') + '">'
    + '<div class="qz-goal-top"><b>🗿 우리 반 보스 무찌르기</b></div>'
    + '<p class="qz-goal-note">' + (b?.on ? escHtml(b.cfg.name) + (b.cleared ? ' 처치 완료!' : ' · 남은 체력 ' + b.remainText + ' / ' + b.maxHp.toLocaleString()) : '선생님이 보스를 준비하고 있어요.') + '</p>'
    + (b?.on ? '<div class="qz-goal-bar"><i style="width:' + (100-b.pct) + '%"></i></div>' : '')
    + (b?.on?'<div class="qz-goal-sub"><span>함께 도전한 친구 '+b.joined+'명</span><span class="qz-goal-mine">내 기여 '+mine.toLocaleString()+' 데미지</span></div>':'')
    + '<p class="qz-goal-reward">👤 참여자 개인 보상 · ' + (personalNames || '설정된 보상 없음') + '</p>'
    + '<p class="rpg-hint">'+((settlement?settlement.tiered:b?.cfg?.tiered)
        ? '처치하면 참여한 날 수에 따라 지급해요: 1일 칭호 · '+(settlement?'기본 기준':(b.cfg.tierMid+'일'))+' 이상 칭호+XP+상품 · '+(settlement?'추가 기준':(b.cfg.tierTop+'일'))+' 이상 추가 XP'+((settlement?settlement.rewardXpBonus:b.cfg.rewardXpBonus)?' +'+(settlement?settlement.rewardXpBonus:b.cfg.rewardXpBonus):'')+'.'
          +(settlement?.tiers?(settlement.tiers[myStudentNum]?' 나는 '+['','칭호','기본 보상','추가 보상'][settlement.tiers[myStudentNum]]+' 단계를 받았어요.':' 나는 이번 판 참여 기록이 없어요.'):'')
        : '이번 보스에 1 이상의 데미지를 준 학생에게 처치 시 1회 자동 지급해요.'+(settlement?.participants?(eligible?' 나는 참여 보상 대상이에요.':' 나는 이번 판 참여 기록이 없어요.'):''))+'</p>'
    + '<p class="qz-goal-reward">🤝 학급 전체 보상 · ' + (rewardNames || '설정된 활동 없음') + '</p>'
    + '<p class="rpg-hint">체육 시간 등 공동 활동은 참여 여부와 관계없이 우리 반 모두가 함께 누려요.</p>'
    + (inQuest && b?.on && !b.cleared ? '' : '<button class="qz-goal-claim" onclick="' + (b?.on && !b.cleared ? 'openClassBossQuest()' : 'openClassBossRewards()') + '">'
    + (b?.on && !b.cleared ? '⚔️ 보스 잡으러 가기' : '🤝 우리 반 공동 보상 보기') + '</button>') + '</div>';
}
function buildClassRewardInventory(){
  const rows = classBossRewards.slice().reverse();
  return '<div class="qz-goal"><b>🤝 우리 반 공동 보상</b><p class="rpg-hint">체육 시간, 영화 감상처럼 우리 반 모두가 함께 누리는 보상이에요. 활동을 진행한 뒤 선생님이 제공 완료로 표시해요.</p></div>'
    + (!rows.length ? '<div class="empty-state">아직 획득한 공동 보상이 없어요.<br>보스 탭에서 우리 반 보스를 함께 무찔러요!</div>' : rows.map(p => {
      const done = p.status === 'used_all' || p.status === 'used' || Number(p.usedQty || 0) >= 1;
      return '<div class="qz-goal' + (done ? '' : ' done') + '"><div class="qz-goal-top"><b>' + escHtml(p.icon || '🎁') + ' ' + escHtml(p.itemName) + '</b><span>' + (done ? '✅ 제공 완료' : '🎉 우리 반이 획득했어요') + '</span></div>'
        + '<p class="rpg-hint">' + escHtml(p.bossName || '보스') + ' 처치 보상 · ' + escHtml(p.date || '') + '</p>'
        + '<p>' + (done ? '우리 반이 함께 사용한 보상이에요.' : '학급 전체가 함께 1회 사용 · 활동 시간은 선생님과 정해요.') + '</p></div>';
    }).join(''));
}
async function bossSettleRewards(){
  const b = bossNow();
  if(classBossSettlementBusy || rpgBusy || qzBusy || !b?.on || !b.cleared || classBossSettled() || !window._fsRunTxn) return;
  classBossSettlementBusy = true;
  try{
    const out = await window.PeskBossQuest.settle({db:window._db, store:quizStore(), num:myStudentNum,
      ref:key => window._fsDoc(window._db,'classrooms',roomId,'data',key), runTransaction:window._fsRunTxn});
    _applyQuizProgress(out.all); _applyBossCfg(out.cfg); applyClassBossPurchases(out.buys);
    myPurchases=out.buys.filter(recordBelongsToMe);
    if(out.changed) showFeedbackNotice('🎉 보스 보상을 지급했어요! 개인 보상과 우리 반 공동 보상을 확인하세요.');
    const panel = document.getElementById('panel-shop');
    if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
    avRefresh();
  }catch(e){console.warn('공동 보상 저장 실패', e);showFeedbackNotice('공동 보상을 아직 저장하지 못했어요. 연결 후 보스 화면을 다시 열어주세요.');}
  finally{classBossSettlementBusy = false;}
}
