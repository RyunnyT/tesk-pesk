/* Shared boss quest settlement. Reward stock is separate from normal shop sales. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory(require('../rpg-monsters.js'));
  else root.PeskBossQuest = factory(root.RPG);
})(typeof window !== 'undefined' ? window : globalThis, function(RPG){
  'use strict';
  const GOAL_ID = '__boss__';
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  function rewards(items){
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter(item => {
      if(!item || item.bossReward !== true || !item.id || seen.has(String(item.id))) return false;
      seen.add(String(item.id)); return true;
    });
  }
  function awardId(round, item){
    return 'class-boss:' + [round, item].map(x => encodeURIComponent(String(x))).join(':');
  }
  function plan(cfg, progress, items, purchases, at = new Date().toISOString()){
    const all = {...(progress || {})}, buys = (Array.isArray(purchases) ? purchases : []).slice();
    const state = RPG.bossState(cfg, all, []);
    const result = {all, buys, changed:false, granted:0, participants:[]};
    if(!state.on || !state.cleared) return result;
    const round = state.cfg.roundId, ledger = all.__classBossQuest || {}, rounds = ledger.rounds || {};
    if(own(rounds, round)) return result;
    const entries = [];
    for(const item of rewards(items)){
      const id = awardId(round, item.id);
      entries.push({id:String(item.id), name:String(item.name || '공동 보상'), icon:String(item.icon || '🎁')});
      if(buys.some(p => p.id === id)) continue;
      buys.push({id, scope:'class', studentNum:0, studentName:'우리 반 공동 보상', accountUid:'',
        itemId:String(item.id), itemName:String(item.name || '공동 보상'), icon:String(item.icon || '🎁'),
        price:0, paidWith:'reward', source:'boss_quest', bossRound:round,
        bossName:state.cfg.name, date:new Date(at).toLocaleDateString('ko-KR', {timeZone:'Asia/Seoul'}),
        createdAt:at, status:'pending', qty:1});
      result.granted++;
    }
    // Freeze eligibility and rewards in the same transaction as the final attack.
    // A later login, a new round, or changing settings cannot replay this grant.
    const personalItem=(Array.isArray(items)?items:[]).find(item=>item && !item.bossReward && String(item.id)===state.cfg.rewardItemId);
    for(const [key,record] of Object.entries(all)){
      if(!/^\d+$/.test(key) || Number(key)<=0) continue;
      const boss=RPG.normalizeBossRec(record?.boss);
      if(boss.roundId!==round || boss.dmg<=0) continue;
      result.participants.push(Number(key));
      const tag=round+':'+state.cfg.rewardTitle;
      if(state.cfg.rewardTitle && !boss.titles.includes(tag)) boss.titles.push(tag);
      const xp=Number(record.xp);
      if(state.cfg.rewardXp || state.cfg.rewardTitle) all[key]={...record, boss:{...(record.boss||{}),...boss},
        xp:(Number.isFinite(xp)?Math.max(0,xp):0)+state.cfg.rewardXp};
      if(personalItem){
        const id='personal-boss:'+ [round,key,personalItem.id].map(x=>encodeURIComponent(String(x))).join(':');
        if(!buys.some(p=>p.id===id)){
          buys.push({id,scope:'student',studentNum:Number(key),studentName:String(record.studentName||key+'번'),accountUid:String(record.accountUid||''),
            itemId:String(personalItem.id),itemName:String(personalItem.name||'보스 참여 보상'),icon:String(personalItem.icon||'🎁'),
            price:0,paidWith:'reward',source:'boss_quest',bossRound:round,bossName:state.cfg.name,
            date:new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}),createdAt:at,status:'pending',qty:state.cfg.rewardItemQty});
          result.granted++;
        }
      }
    }
    // Keep old ledgers final: this schema upgrade does not retroactively pay old rounds.
    all.__classBossQuest = {...ledger, rounds:{...rounds, [round]:{at, items:entries, bossName:state.cfg.name,
      participants:result.participants,rewardXp:state.cfg.rewardXp,rewardTitle:state.cfg.rewardTitle,
      personalItem:personalItem?{id:String(personalItem.id),name:String(personalItem.name),qty:state.cfg.rewardItemQty}:null}}};
    result.changed = true;
    return result;
  }
  function complete(purchases, id, at = new Date().toISOString()){
    const rows = (purchases || []).map(p => ({...p}));
    const row = rows.find(p => p.id === id && p.scope === 'class' && p.source === 'boss_quest');
    if(!row) throw new Error('공동 보상을 찾을 수 없어요.');
    if(row.status === 'used_all' || row.status === 'used' || Number(row.usedQty || 0) >= 1)
      throw new Error('이미 제공 완료한 공동 보상이에요.');
    Object.assign(row, {usedQty:1, status:'used_all', completedAt:at, completedBy:'teacher'});
    return rows;
  }
  async function settle({db, ref, runTransaction}){
    let output;
    await runTransaction(db, async txn => {
      const keys = ['pesk-class-boss','pesk-quiz-progress','tesk-shop','pesk-purchases'];
      const snaps = await Promise.all(keys.map(key => txn.get(ref(key))));
      const values = snaps.map(s => s.exists() ? s.data().value : undefined);
      const at = new Date().toISOString();
      output = plan(values[0], values[1], values[2], values[3], at);
      output.cfg = RPG.normalizeBoss(values[0]);
      if(output.changed){
        txn.set(ref('pesk-quiz-progress'), {value:output.all, updatedAt:at});
        if(output.granted) txn.set(ref('pesk-purchases'), {value:output.buys, updatedAt:at});
      }
    });
    return output;
  }
  return {GOAL_ID, rewards, awardId, plan, complete, settle};
});
