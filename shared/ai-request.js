/* AI 제공사별 요청 본문 만들기와 응답 읽기. 교사 화면(callTeachAI)과 평가 도구(tools/ai-eval.cjs)가 함께 씁니다.
   prompt 는 문자열이거나 {system, user} 입니다. system 은 지침, user 는 학생 자료 — 나눠 보내면
   "자료 속 지시를 따르지 않는다"가 더 잘 지켜집니다. 문자열이면 예전처럼 한 메시지로 보냅니다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AiRequest=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const parts=prompt=>typeof prompt==='string'?{system:'',user:prompt}:{system:String(prompt?.system||''),user:String(prompt?.user||'')};
const textOf=prompt=>{const p=parts(prompt);return p.system?p.system+'\n\n'+p.user:p.user;};
// Claude: temperature 는 4.6 이하 옛 모델만 받는다. 현재 세대(Opus 4.7 이후·Sonnet 5·Haiku 5.5·Fable)는 보내면 400 이라 effort 로 분량을 조절한다.
const claudeTakesTemperature=model=>/^claude-(3|haiku-4|sonnet-4-[0-6](?!d)|opus-4-[0-6](?!d))/.test(model);
const isClaudeGen5=model=>model.startsWith('claude-')&&!claudeTakesTemperature(model);
// 안전 분류기가 거절하면 같은 요청을 다른 모델로 다시 돌리는 서버 기능 (Opus 5.5 · Sonnet 5.5 · Fable 5.x)
const claudeFallback=model=>/^claude-(opus-5-5|sonnet-5-5|fable-5)/.test(model);
// OpenAI: max_completion_tokens 는 모든 채팅 모델이 받는다. temperature 는 gpt-4o 계열에만 보낸다(최신 추론 모델은 거절할 수 있다).
const gptTakesTemperature=model=>/^gpt-4o/.test(model);
const kindOf=provider=>provider.startsWith('gemini')?'gemini':provider.startsWith('claude')?'claude':provider.startsWith('gpt')?'openai':'';
function maxTokens(provider,requested){
  const req=Number(requested||0);
  // Claude 5 세대는 사고 과정도 출력 한도를 쓰므로 여유를 둡니다(비스트리밍 요청이라 16,000까지).
  if(provider.startsWith('claude'))return Math.min(Math.max(req||8192,isClaudeGen5(provider)?16000:0),16000);
  if(provider.startsWith('gemini'))return Math.min(req||16384,32768);
  if(provider.startsWith('gpt'))return Math.min(req||12000,16384);
  return req||8192;
}
function claudeHeaders(key){
  return {'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'};
}
/* opts = {maxTokens, temperature, json, responseSchema, thinkingBudget} — maxTokens 는 이미 maxTokens()로 맞춘 값 */
function build(provider,key,prompt,opts){
  const o=opts||{},p=parts(prompt),kind=kindOf(provider);
  if(kind==='gemini'){
    const body={contents:[{parts:[{text:p.user}]}],
      generationConfig:{temperature:o.temperature,maxOutputTokens:o.maxTokens,
        ...(o.json?{responseMimeType:'application/json'}:{}),
        ...(o.responseSchema?{responseSchema:o.responseSchema}:{}),
        ...(provider.startsWith('gemini-2.5-')&&Number.isInteger(o.thinkingBudget)?{thinkingConfig:{thinkingBudget:o.thinkingBudget}}:{})}};
    if(p.system)body.systemInstruction={parts:[{text:p.system}]};
    return {label:'Gemini',timeoutMs:150000,url:`https://generativelanguage.googleapis.com/v1beta/models/${provider}:generateContent`,
      headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)};
  }
  if(kind==='claude'){
    const body={model:provider,max_tokens:o.maxTokens,messages:[{role:'user',content:p.user}]};
    if(p.system)body.system=p.system;
    if(isClaudeGen5(provider))body.output_config={effort:'medium'};
    else if(o.temperature!=null)body.temperature=o.temperature;
    const headers=claudeHeaders(key);
    if(claudeFallback(provider)){headers['anthropic-beta']='server-side-fallback-2026-07-01';body.fallbacks='default';}
    return {label:'Claude',timeoutMs:180000,url:'https://api.anthropic.com/v1/messages',headers,body:JSON.stringify(body)};
  }
  if(kind==='openai'){
    const messages=p.system?[{role:'system',content:p.system},{role:'user',content:p.user}]:[{role:'user',content:p.user}];
    const body={model:provider,messages,max_completion_tokens:o.maxTokens};
    if(gptTakesTemperature(provider)&&o.temperature!=null)body.temperature=o.temperature;
    if(o.json)body.response_format={type:'json_object'};
    return {label:'OpenAI',timeoutMs:150000,url:'https://api.openai.com/v1/chat/completions',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)};
  }
  throw new Error('지원하지 않는 AI 모델입니다.');
}
/* 응답 → {text, truncated(길이 제한으로 끊김), refused} */
function read(provider,data){
  const kind=kindOf(provider);
  if(kind==='gemini'){
    const cand=data?.candidates?.[0],ps=cand?.content?.parts||[];
    return {text:ps.filter(x=>!x?.thought).map(x=>x?.text||'').join(''),truncated:cand?.finishReason==='MAX_TOKENS',refused:false};
  }
  if(kind==='claude'){
    return {text:(data?.content||[]).filter(c=>c.type==='text').map(c=>c.text||'').join(''),truncated:data?.stop_reason==='max_tokens',refused:data?.stop_reason==='refusal'};
  }
  if(kind==='openai'){
    const c=data?.choices?.[0]||{};
    return {text:c.message?.content||'',truncated:c.finish_reason==='length',refused:false};
  }
  throw new Error('지원하지 않는 AI 모델입니다.');
}
return {version,parts,textOf,kindOf,isClaudeGen5,claudeTakesTemperature,claudeFallback,maxTokens,claudeHeaders,build,read};
});
