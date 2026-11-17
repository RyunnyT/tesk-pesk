/* 교사가 고를 수 있는 AI 모델 목록 — 설정 화면·첫 설정 마법사·평가 도구가 함께 쓴다.
   모델 이름은 각 제공사 문서에서 확인했다 (2026-11-17):
   - Google: gemini-2.0-flash·2.0-flash-lite 는 서비스 종료, 2.5-flash·2.5-pro 는 지원 중단(2026-12-01부터 새 모델로 자동 연결)
   - OpenAI: gpt-4o·gpt-4o-mini 는 지원 중단(2027-01-14 종료)
   - Anthropic: 현재 세대는 Claude Opus 5.5 · Sonnet 5.5 · Haiku 5.5
   목록에서 뺀 모델을 저장해 둔 교사는 RETIRED 표에 따라 가까운 모델로 옮긴다. 이름을 바꿀 때는 이 파일만 고친다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AiModels=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const CHECKED='2026-11-17';
// tier: 추천 · 가벼움 · 고성능.  paidOnly: 무료 키로는 쓸 수 없거나 비용이 큰 모델
const MODELS=[
  {id:'gemini-3.6-flash',     provider:'gemini', label:'Gemini 3.6 Flash',      icon:'✨', tier:'추천',   hint:'Google 균형형 모델'},
  {id:'gemini-3.8-flash',     provider:'gemini', label:'Gemini 3.8 Flash',      icon:'🌟', tier:'고성능', hint:'Google 고성능 모델'},
  {id:'gemini-3.5-flash-lite',provider:'gemini', label:'Gemini 3.5 Flash-Lite', icon:'🪶', tier:'가벼움', hint:'가장 빠르고 저렴'},
  {id:'claude-sonnet-5-5',    provider:'claude', label:'Claude Sonnet 5.5',     icon:'🤖', tier:'추천',   hint:'Anthropic 균형형 모델'},
  {id:'claude-opus-5-5',      provider:'claude', label:'Claude Opus 5.5',       icon:'🌟', tier:'고성능', hint:'가장 꼼꼼함 · 비용 높음'},
  {id:'claude-haiku-5-5',     provider:'claude', label:'Claude Haiku 5.5',      icon:'⚡', tier:'가벼움', hint:'빠르고 저렴'},
  {id:'gpt-6.1-sol',          provider:'gpt',    label:'GPT-6.1 Sol',           icon:'🧠', tier:'추천',   hint:'OpenAI 균형형 모델'},
  {id:'gpt-6-luna',           provider:'gpt',    label:'GPT-6 Luna',            icon:'💡', tier:'가벼움', hint:'OpenAI 저비용 모델'}
];
const DEFAULT='gemini-3.6-flash';
const RETIRED={
  'gemini-1.5-pro':'gemini-3.8-flash','gemini-1.5-flash':'gemini-3.6-flash',
  'gemini-2.0-flash':'gemini-3.6-flash','gemini-2.0-flash-lite':'gemini-3.5-flash-lite',
  'gemini-2.5-flash':'gemini-3.6-flash','gemini-2.5-pro':'gemini-3.8-flash','gemini-2.5-flash-lite':'gemini-3.5-flash-lite',
  'claude-haiku-4-5-20251001':'claude-haiku-5-5','claude-haiku-4-5':'claude-haiku-5-5','claude-sonnet-4-6':'claude-sonnet-5-5',
  'claude-sonnet-5':'claude-sonnet-5-5','claude-opus-5':'claude-opus-5-5',
  'gpt-4o':'gpt-6.1-sol','gpt-4o-mini':'gpt-6-luna'
};
const GROUPS=[['gemini','Google Gemini'],['claude','Anthropic Claude'],['gpt','OpenAI GPT']];
function resolve(id){ const x=String(id||''); return RETIRED[x]||(MODELS.some(m=>m.id===x)?x:(x?x:DEFAULT)); }
function info(id){ return MODELS.find(m=>m.id===id)||null; }
function optionsHtml(selected){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return GROUPS.map(([p,label])=>'<optgroup label="'+label+'">'+MODELS.filter(m=>m.provider===p).map(m=>
    '<option value="'+m.id+'"'+(m.id===selected?' selected':'')+'>'+m.icon+' '+esc(m.label)+' ('+m.tier+')</option>').join('')+'</optgroup>').join('');
}
return {version,CHECKED,MODELS,DEFAULT,RETIRED,GROUPS,resolve,info,optionsHtml};
});
