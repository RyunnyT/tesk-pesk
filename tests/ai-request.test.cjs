// AI 요청 본문(shared/ai-request.js), 모델 목록(shared/ai-models.js), 붙여 넣은 답 정리(shared/tesk-ai-manual.js)
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../shared/ai-request.js'),M=require('../shared/ai-models.js'),Manual=require('../shared/tesk-ai-manual.js');
const body=r=>JSON.parse(r.body);

test('지침과 자료를 나눠 보낸다 (제공사별 자리)',()=>{
  const p={system:'지침',user:'자료'};
  const g=body(R.build('gemini-3.6-flash','k',p,{maxTokens:100,temperature:0.1}));
  assert.equal(g.systemInstruction.parts[0].text,'지침');assert.equal(g.contents[0].parts[0].text,'자료');
  const c=body(R.build('claude-sonnet-5-5','k',p,{maxTokens:100}));
  assert.equal(c.system,'지침');assert.equal(c.messages[0].content,'자료');
  const o=body(R.build('gpt-6.1-sol','k',p,{maxTokens:100}));
  assert.deepEqual(o.messages.map(m=>m.role),['system','user']);
  // 문자열이면 예전처럼 한 메시지
  assert.equal(body(R.build('claude-opus-5-5','k','하나',{maxTokens:10})).messages[0].content,'하나');
  assert.equal(R.textOf(p),'지침\n\n자료');
});
test('Claude: 현재 세대는 temperature 를 보내지 않고 effort 를 쓴다, 거절되면 다른 모델로 다시 돌린다',()=>{
  for(const m of ['claude-opus-5-5','claude-sonnet-5-5','claude-haiku-5-5','claude-fable-5-2','claude-opus-4-8','claude-sonnet-5']){
    const b=body(R.build(m,'k','x',{maxTokens:100,temperature:0.2}));
    assert.equal('temperature' in b,false,m);assert.equal(b.output_config.effort,'medium',m);
  }
  const old=body(R.build('claude-haiku-4-5','k','x',{maxTokens:100,temperature:0.2}));
  assert.equal(old.temperature,0.2);assert.equal('output_config' in old,false);
  const r=R.build('claude-opus-5-5','k','x',{maxTokens:100});
  assert.equal(r.headers['anthropic-beta'],'server-side-fallback-2026-07-01');assert.equal(body(r).fallbacks,'default');
  assert.equal('anthropic-beta' in R.build('claude-haiku-5-5','k','x',{maxTokens:100}).headers,false);
  assert.equal(r.headers['anthropic-dangerous-direct-browser-access'],'true');
});
test('OpenAI: max_completion_tokens, temperature 는 gpt-4o 계열만, JSON 요청이면 response_format',()=>{
  const n=body(R.build('gpt-6.1-sol','k','x',{maxTokens:300,temperature:0.2,json:true}));
  assert.equal(n.max_completion_tokens,300);assert.equal('max_tokens' in n,false);assert.equal('temperature' in n,false);
  assert.deepEqual(n.response_format,{type:'json_object'});
  assert.equal(body(R.build('gpt-4o','k','x',{maxTokens:300,temperature:0.2})).temperature,0.2);
});
test('응답 읽기: 끊김·거절·Gemini 생각 부분 제외',()=>{
  assert.deepEqual(R.read('gemini-3.6-flash',{candidates:[{content:{parts:[{text:'생각',thought:true},{text:'답'}]},finishReason:'MAX_TOKENS'}]}),{text:'답',truncated:true,refused:false});
  assert.equal(R.read('claude-opus-5-5',{content:[{type:'fallback'},{type:'text',text:'a'}],stop_reason:'refusal'}).refused,true);
  assert.equal(R.read('gpt-6-luna',{choices:[{message:{content:'b'},finish_reason:'length'}]}).truncated,true);
});
test('모델 목록: 없어진 모델 설정은 가까운 현재 모델로 옮긴다',()=>{
  for(const [from,to] of [['gemini-2.0-flash','gemini-3.6-flash'],['gemini-2.5-pro','gemini-3.8-flash'],['claude-sonnet-5','claude-sonnet-5-5'],['gpt-4o-mini','gpt-6-luna']])assert.equal(M.resolve(from),to);
  for(const m of M.MODELS)assert.equal(M.resolve(m.id),m.id);
  assert.ok(M.MODELS.some(m=>m.id===M.DEFAULT));
  for(const to of Object.values(M.RETIRED))assert.ok(M.MODELS.some(m=>m.id===to),'옮길 곳이 목록에 있어야 함: '+to);
  assert.match(M.optionsHtml('claude-opus-5-5'),/value="claude-opus-5-5" selected/);
});
test('붙여 넣은 채팅 답에서 JSON 꺼내기',()=>{
  assert.equal(Manual.pickJson('네, 결과입니다.\n```json\n{"a":1}\n```\n더 필요하면 말씀해 주세요',true),'{"a":1}');
  assert.equal(Manual.pickJson('결과: {"a":[1,2]} 입니다',true),'{"a":[1,2]}');
  assert.equal(Manual.pickJson('{"a":1}',true),'{"a":1}');
  assert.equal(Manual.pickJson('공문 본문 {예시}',false),'공문 본문 {예시}');
  assert.equal(Manual.pickJson('JSON이 아닌 답',true),'JSON이 아닌 답');
});
