/* ⚙️ 아르카 연대기 — 이야기 규칙
   DOM·저장소 없이 계산만 한다. 화면(index.html)이 결과를 그리고 저장한다.

   지키는 원칙
   · 메인 퀘스트는 아이템 없이도 끝까지 깰 수 있다. 진행은 정답 수로만 연다.
   · 아이템은 서브퀘스트에서만 나온다. 전투를 조금 편하게 할 뿐 진행을 막지 않는다.
   · 틀려도 진행은 줄지 않는다. 전투에서만 체력이 조금 깎인다.
   · 학년은 문제 난이도만 바꾼다. 이야기는 모든 학년이 같다. */
(function(root){
'use strict';

const VERSION = 1;
const MAX_HP = 100;
const BASE_DMG = 12;          // 정답 1회 피해 (안개 슬라임 60 → 정답 5개)
const ATK_CAP = 6;            // 아이템 공격 보너스 상한 — 학습 없이 앞서 나가지 않게

const int = (v, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };

function newState(opt){
  const o = opt || {};
  return { v:VERSION, name:String(o.name || '견습생').slice(0, 12), job:o.job || null,
           pet:o.pet || null, petName:o.petName || '', petKind:o.petKind || 'other',
           chapter:1, hp:MAX_HP, quests:{}, flags:{}, items:[], titles:[], merit:0, boxes:0,
           stats:{ tried:0, correct:0 }, chapterDone:false };
}
/* 저장본을 읽을 때 빠진 칸을 채운다 (예전 저장본도 그대로 읽히게) */
function normalize(raw){
  const s = Object.assign(newState(), raw && typeof raw === 'object' ? raw : {});
  ['quests','flags','stats'].forEach(k => { if(!s[k] || typeof s[k] !== 'object') s[k] = k === 'stats' ? {tried:0, correct:0} : {}; });
  ['items','titles'].forEach(k => { if(!Array.isArray(s[k])) s[k] = []; });
  s.hp = Math.min(MAX_HP, Math.max(0, int(s.hp, MAX_HP)));
  s.merit = Math.max(0, int(s.merit, 0));
  return s;
}

/* ── 글자 ── 직업·펫 갈래 고르기, 이름 넣기, 조사 맞추기 */
function hasJong(word){
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  if(c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
  return /[0136789lmnr]$/i.test(String(word || '').trim());
}
const PAIRS = { '이(가)':['이','가'], '을(를)':['을','를'], '은(는)':['은','는'], '과(와)':['과','와'], '아(야)':['아','야'], '이(가)?':['이','가'] };
function fixJosa(text){
  text = text.replace(/([가-힣A-Za-z0-9]+)\(이\)/g, (m, word) => word + (hasJong(word) ? '이' : ''));
  return text.replace(/([가-힣A-Za-z0-9]+)(이\(가\)|을\(를\)|은\(는\)|과\(와\)|아\(야\))/g,
    (m, word, j) => word + (hasJong(word) ? PAIRS[j][0] : PAIRS[j][1]));
}
function pickText(text, state, data){
  if(text == null) return '';
  if(typeof text === 'string') return text;
  return text[state.job] || text[state.petKind] || text.other || Object.values(text)[0] || '';
}
function fill(text, state, data){
  const job = data.jobs[state.job] || {};
  const mentor = data.npcs[job.mentor] || {};
  const raw = pickText(text, state, data)
    .replace(/\{name\}/g, state.name)
    .replace(/\{pet\}/g, state.petName || '펫')
    .replace(/\{mentor\}/g, mentor.name || '스승님')
    .replace(/\{place\}/g, job.place || '수련장');
  return fixJosa(raw);
}
/* 장면 → 실제로 보여 줄 줄 목록 (직업 전용 줄 거르기)
   when 이 붙은 줄은 같은 장면 안의 선택 뒤에 갈리므로, 보여 줄 때 lineVisible 로 다시 확인한다 */
function lineVisible(line, state){ return !line.when || !!state.flags[line.when]; }
function sceneLines(sceneId, state, data){
  const lines = data.scenes[sceneId] || [];
  return lines.filter(l => !l.only || l.only.includes(state.job))
    .map(l => {
      let who = l.who, speaker = '', portrait = '', color = '#555';
      if(who === 'mentor'){ const j = data.jobs[state.job]; who = j ? j.mentor : 'narr'; }
      if(who === 'me'){ speaker = state.name; }
      else if(who === 'pet'){ speaker = state.petName || '펫'; }
      else { const n = data.npcs[who] || data.npcs.narr; speaker = n.name; portrait = n.portrait; color = n.color; }
      return { who, speaker, portrait, color, when:l.when || null, text:fill(l.text, state, data),
               choices:l.choices ? l.choices.map(c => ({ label:fill(c.label, state, data), flag:c.flag })) : null };
    });
}

/* ── 장소 ── train 은 직업마다 이름이 다르다 */
function locations(state, data){
  const job = data.jobs[state.job] || {};
  return data.locations.map(l => l.id === 'train'
    ? Object.assign({}, l, { name:job.place || '수련장', icon:job.placeIcon || '🏟️' }) : l);
}

/* ── 퀘스트 ── */
function questById(data, id){ return data.quests.find(q => q.id === id) || null; }
function today(now){ const d = now ? new Date(now) : new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function questRec(state, id){ return state.quests[id] || null; }
function dailyLeft(state, q, now){
  const r = questRec(state, q.id), t = today(now);
  const used = r && r.day === t ? int(r.runs, 0) : 0;
  return Math.max(0, (q.daily || 0) - used);
}
/* locked · available · active · done */
function questStatus(state, q, now){
  if(q.jobs && !q.jobs.includes(state.job)) return 'locked';
  if((q.needs || []).some(id => !(questRec(state, id) || {}).done)) return 'locked';
  const r = questRec(state, q.id);
  if(r && r.active) return 'active';
  if(q.daily) return dailyLeft(state, q, now) > 0 ? 'available' : 'done';
  if(r && r.done) return 'done';
  return 'available';
}
function questTitle(q, state, data){ return fill(q.title, state, data); }
function currentStep(state, q){
  const r = questRec(state, q.id);
  if(!r || !r.active) return null;
  return q.steps[r.step] || null;
}
/* 이 장소에서 할 수 있는 일: 새로 받을 퀘스트(!) · 진행 중 단계(?) */
function placeActions(state, data, placeId, now){
  const out = [];
  data.quests.forEach(q => {
    const st = questStatus(state, q, now);
    if(st === 'available' && q.at === placeId) out.push({ quest:q, mark:'!', step:q.steps[0] });
    if(st === 'active'){ const step = currentStep(state, q); if(step && step.at === placeId) out.push({ quest:q, mark:'?', step }); }
  });
  const order = { main:0, sub:1, board:2 };
  return out.sort((a, b) => order[a.quest.type] - order[b.quest.type]);
}
function placeMark(state, data, placeId, now){
  const acts = placeActions(state, data, placeId, now);
  if(acts.some(a => a.mark === '?' && a.quest.type === 'main')) return 'main';
  if(acts.some(a => a.mark === '!' && a.quest.type === 'main')) return 'main';
  if(acts.some(a => a.quest.type === 'sub')) return 'sub';
  if(acts.length) return 'board';
  return '';
}
function startQuest(state, data, id, now){
  const q = questById(data, id);
  if(!q || questStatus(state, q, now) !== 'available') return false;
  const prev = questRec(state, id) || {};
  const t = today(now);
  state.quests[id] = Object.assign({}, prev, { active:true, step:0, progress:0,
    day:t, runs:(prev.day === t ? int(prev.runs, 0) : 0) });
  return true;
}
/* 단계 하나 끝. 퀘스트가 끝나면 받은 보상을 돌려준다 */
function finishStep(state, data, id){
  const q = questById(data, id), r = questRec(state, id);
  if(!q || !r || !r.active) return null;
  r.step += 1; r.progress = 0;
  if(r.step < q.steps.length) return { done:false };
  r.active = false; r.done = true; r.step = 0;
  if(q.daily) r.runs = int(r.runs, 0) + 1;
  const reward = grant(state, data, q.reward || {});
  if(q.endsChapter) state.chapterDone = true;
  return { done:true, reward, endsChapter:!!q.endsChapter };
}
/* 문제 하나 결과. solve 단계면 정답만 진행을 올린다 */
function answer(state, data, id, correct){
  state.stats.tried += 1;
  if(correct) state.stats.correct += 1;
  const q = questById(data, id), step = q && currentStep(state, q), r = questRec(state, id);
  if(!step || step.kind !== 'solve') return { progress:0, need:0, complete:false };
  if(correct) r.progress = int(r.progress, 0) + 1;
  return { progress:r.progress, need:step.count, complete:r.progress >= step.count };
}
function stepLabel(step, state, data){ return step && step.label ? fill(step.label, state, data) : ''; }

/* ── 보상 ── */
function grant(state, data, reward){
  const got = { items:[], titles:[], merit:0, boxes:[] };
  const add = id => { if(!data.items[id]) return; if(data.items[id].kind === 'use' || !state.items.includes(id)){ state.items.push(id); got.items.push(id); } };
  (reward.items || []).forEach(add);
  if(reward.jobItem) add(reward.jobItem + '_' + state.job);
  if(reward.title && !state.titles.includes(reward.title)){ state.titles.push(reward.title); got.titles.push(reward.title); }
  if(reward.merit){
    const box = data.meritBox || { every:30, items:[] };
    const before = Math.floor(state.merit / box.every);
    state.merit += reward.merit; got.merit = reward.merit;
    const after = Math.floor(state.merit / box.every);
    for(let i = before; i < after; i++){ box.items.forEach(id => { add(id); got.boxes.push(id); }); }
  }
  return got;
}
function setFlag(state, flag){ if(flag) state.flags[flag] = true; }

/* ── 전투 ── 정답 = 내 공격, 오답 = 몬스터 반격. 체력이 0 이면 숙소로 물러난다(진행은 그대로) */
function attackBonus(state, data){
  let atk = 0;
  state.items.forEach(id => { const it = data.items[id]; if(it && it.atk && (!it.job || it.job === state.job)) atk += it.atk; });
  return Math.min(ATK_CAP, atk);
}
function newBattle(state, data, monsterId){
  const m = data.monsters[monsterId];
  if(!m) return null;
  const guard = state.items.some(id => (data.items[id] || {}).guard) ? 1 : 0;
  return { monster:monsterId, mhp:m.hp, mmax:m.hp, guard, over:false, won:false, log:[] };
}
function battleTurn(state, data, b, correct, rnd){
  const r = typeof rnd === 'function' ? rnd : Math.random;
  const m = data.monsters[b.monster], ev = {};
  state.stats.tried += 1;
  if(correct){
    state.stats.correct += 1;
    const dmg = BASE_DMG + attackBonus(state, data) + Math.floor(r() * 4);
    b.mhp = Math.max(0, b.mhp - dmg);
    ev.hit = dmg;
    if(b.mhp === 0){ b.over = true; b.won = true; }
  } else if(b.guard > 0){
    b.guard -= 1; ev.guarded = true;
  } else {
    state.hp = Math.max(0, state.hp - m.hit);
    ev.hurt = m.hit;
    if(state.hp === 0){ b.over = true; b.won = false; }
  }
  return ev;
}
function usePotion(state, data){
  const i = state.items.findIndex(id => (data.items[id] || {}).heal);
  if(i < 0 || state.hp >= MAX_HP) return 0;
  const heal = data.items[state.items[i]].heal;
  state.items.splice(i, 1);
  const before = state.hp; state.hp = Math.min(MAX_HP, state.hp + heal);
  return state.hp - before;
}
function rest(state){ state.hp = MAX_HP; }

/* ── 진행 요약 ── */
function chapterProgress(state, data){
  const mains = data.quests.filter(q => q.type === 'main'), subs = data.quests.filter(q => q.type === 'sub');
  const done = list => list.filter(q => (questRec(state, q.id) || {}).done).length;
  return { main:done(mains), mainTotal:mains.length, sub:done(subs), subTotal:subs.length };
}

const API = { VERSION, MAX_HP, BASE_DMG, ATK_CAP, newState, normalize, hasJong, fixJosa, fill, sceneLines,
  lineVisible, locations, questById, questStatus, questTitle, currentStep, placeActions, placeMark, startQuest, finishStep,
  answer, stepLabel, grant, setFlag, attackBonus, newBattle, battleTurn, usePotion, rest, dailyLeft,
  chapterProgress, today };
root.ARCA = API;
if(typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
