const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../tesk_teacher_v2.html'),'utf8');
const slice=(from,to)=>{
 const a=source.indexOf(from),b=source.indexOf(to);
 assert.ok(a>=0&&b>a,'슬라이스 경계를 찾지 못했습니다: '+from);
 return source.slice(a,b);
};
const ctx={};vm.createContext(ctx);
[ slice('const WRITING_RUBRIC_DOMAINS = [','function buildWritingRubricPrompt('),
  slice('function buildWritingRubricPrompt(','function buildWritingFeedbackOnlyPrompt('),
  slice('function blockedWritingRubric(scope){','async function analyzeWritingRubricAI(w){'),
  slice('function _rubricDomainScoreTo100(score){','function fallbackWritingRubric(w){'),
  slice('function fallbackWritingRubric(w){','async function analyzeWritingRubricAI(w){'),
  slice('function _writingRubricAverages(rows){','function _renderWritingRubricMini(rows){'),
  slice('function _writingRubricExportText(rubric){','function _studentFriendSignals(')
].forEach(code=>vm.runInContext(code,ctx));
const {normalizeWritingRubric,fallbackWritingRubric,_hydrateRubric,_writingRubricAverages,_writingRubricExportText}=ctx;
// const 선언은 vm 컨텍스트의 속성이 되지 않아 식으로 꺼냅니다.
const WRITING_RUBRIC_DOMAINS=vm.runInContext('WRITING_RUBRIC_DOMAINS',ctx);
const RUBRIC_MIN_WRITING=vm.runInContext('RUBRIC_MIN_WRITING',ctx);
const {writingRubricScope,measureWriting,buildWritingRubricPrompt,blockedWritingRubric}=ctx;

const full=()=>{const d={};WRITING_RUBRIC_DOMAINS.forEach((x,i)=>{d[x.key]={score:(i%5)+1,evidence:'근거',advice:'조언'};});return {total:60,domains:d};};

test('영역을 빠뜨린 응답은 보통 3점으로 채우지 않는다', ()=>{
 const r=normalizeWritingRubric({total:95,domains:{purpose:{score:5,evidence:'e',advice:'a'},content:{score:4,evidence:'e',advice:'a'}}});
 assert.equal(r.evaluatedCount,2);
 assert.equal(r.domains.purpose.score,5);
 assert.equal(r.domains.evidence.score,null);
 assert.equal(r.domains.evidence.score100,null);
 assert.equal(r.domains.evidence.evaluated,false);
 assert.equal(r.domains.evidence.evidence,'');
 const scored=Object.values(r.domains).filter(d=>d.score!=null);
 assert.equal(scored.length,2);
});

test('총점은 평가된 영역의 평균이고, AI가 적은 총점은 표시하지 않는다', ()=>{
 const r=normalizeWritingRubric({total:70,domains:{purpose:{score:5},content:{score:4}}});
 assert.equal(r.total,90);            // (100+80)/2
 // vm 컨텍스트에서 만든 객체라 프로토타입이 달라 필드로 비교합니다.
 assert.equal(r.totalMismatch.claimed,70);
 assert.equal(r.totalMismatch.computed,90);
 const ok=normalizeWritingRubric({total:90,domains:{purpose:{score:5},content:{score:4}}});
 assert.equal(ok.totalMismatch,null);
});

test('총점 차이가 10점 이내면 불일치로 보지 않는다', ()=>{
 assert.equal(normalizeWritingRubric({total:100,domains:{purpose:{score:5},content:{score:4}}}).totalMismatch,null);
 assert.ok(normalizeWritingRubric({total:101,domains:{purpose:{score:5},content:{score:4}}}).totalMismatch);
});

test('평가된 영역이 하나도 없으면 총점과 등급을 만들지 않는다', ()=>{
 const r=normalizeWritingRubric({total:80,domains:{}});
 assert.equal(r.evaluatedCount,0);
 assert.equal(r.total,null);
 assert.equal(r.level,null);
});

test('없는 문구를 지어내지 않는다', ()=>{
 const r=normalizeWritingRubric({domains:{purpose:{score:3}}});
 assert.equal(r.oneLineSummary,'');
 assert.equal(r.studentFeedback,'');
 assert.equal(r.domains.purpose.evidence,'');
});

test('AI 실패 시 길이로 점수를 만들지 않고 미평가로 남긴다', ()=>{
 const fb=fallbackWritingRubric({content:'재밌었다.',title:'오늘',genre:'일기'});
 assert.equal(fb.fallback,true);
 assert.equal(fb.evaluatedCount,0);
 assert.equal(fb.total,null);
 assert.equal(fb.failed,true);
 assert.match(_writingRubricExportText(fb),/미산출/);
});

test('fallback은 평균에서 제외되고 제외 편수가 남는다', ()=>{
 const real=normalizeWritingRubric(full());
 const fb=fallbackWritingRubric({content:'짧다.'});
 const avg=_writingRubricAverages([{rubric:real},{rubric:fb}]);
 assert.equal(avg.count,1);
 assert.equal(avg.excluded,1);
 assert.equal(avg.total,real.total);
 const onlyFallback=_writingRubricAverages([{rubric:fb}]);
 assert.equal(onlyFallback.count,0);
 assert.equal(onlyFallback.total,null);
});

test('평균은 그 영역을 실제로 평가한 글만 세고, 평가가 없는 영역은 null이다', ()=>{
 const a=normalizeWritingRubric({domains:{purpose:{score:5},content:{score:3}}});
 const b=normalizeWritingRubric({domains:{purpose:{score:3}}});
 const avg=_writingRubricAverages([{rubric:a},{rubric:b}]);
 assert.equal(avg.domains.purpose.value,80);   // (100+60)/2
 assert.equal(avg.domains.purpose.count,2);
 assert.equal(avg.domains.content.count,1);
 assert.equal(avg.domains.evidence,null);
});

test('루브릭이 전혀 없으면 평균 자체를 만들지 않는다', ()=>{
 assert.equal(_writingRubricAverages([{rubric:null},{}]),null);
 assert.equal(_writingRubricAverages([]),null);
});

test('이전에 저장된 8영역 결과는 그대로 살아난다', ()=>{
 const legacy={total:72,level:'중',domains:{}};
 WRITING_RUBRIC_DOMAINS.forEach(d=>{legacy.domains[d.key]={key:d.key,label:d.label,score:3,score100:60,evidence:'e',advice:'a'};});
 const h=_hydrateRubric(legacy);
 assert.equal(h.evaluatedCount,WRITING_RUBRIC_DOMAINS.length);
 assert.equal(h.legacy,true);
 assert.equal(h.total,72);
 assert.equal(_writingRubricAverages([{rubric:h}]).count,1);
 assert.equal(_hydrateRubric(null),null);
});

test('내보내기 텍스트는 미평가 영역을 점수 대신 미평가로 적는다', ()=>{
 const r=normalizeWritingRubric({total:60,domains:{purpose:{score:5,evidence:'중심 생각이 분명함',advice:'유지하기'}}});
 const t=_writingRubricExportText(r);
 assert.match(t,/목적·과제 적합성: 5\/5 - 중심 생각이 분명함/);
 assert.match(t,/근거·사례 타당성: 미평가/);
 assert.match(t,/영역 점수로 계산한 값입니다/);
 assert.doesNotMatch(t,/근거·사례 타당성: 3/);
});

test('점수 범위를 벗어난 값은 잘라내고 0이나 음수는 미평가로 본다', ()=>{
 const r=normalizeWritingRubric({domains:{purpose:{score:9},content:{score:0},evidence:{score:-2},organization:{score:'4'}}});
 assert.equal(r.domains.purpose.score,5);
 assert.equal(r.domains.content.score,null);
 assert.equal(r.domains.evidence.score,null);
 assert.equal(r.domains.organization.score,4);
});

/* ── 분량 게이트 ── */
const SHORT='재밌었다.';
// 공백 제외 59자 · 3문장 — 하한은 넘지만 4~5문장·100자·150자 조건에는 못 미칩니다.
const MID='오늘 학교 운동장에서 친구들과 줄다리기를 했다. 처음에는 밧줄이 무거워서 손이 조금 아팠다. 그래도 끝까지 힘껏 당겨서 우리 편이 이겼다.';
const LONG=['운동회 날 우리 반은 함께 줄다리기를 했다. 처음에는 밧줄이 무거워서 손이 아팠다.',
 '나는 맨 뒤에서 줄을 잡았는데 친구들이 구호를 맞춰 주어서 힘이 났다. 선생님도 큰 소리로 응원해 주셨다.',
 '두 번째 판에서는 발을 더 깊이 디디고 당겼더니 상대 팀이 조금씩 끌려왔다. 우리 반이 이겨서 다 같이 소리를 질렀다.',
 '집에 와서도 그 장면이 계속 떠올랐다. 다음에도 친구들과 힘을 모으는 활동을 더 해 보고 싶다.'].join('\n');

test('분량을 글자·문장·문단으로 잰다', ()=>{
 const m=measureWriting(MID);
 assert.equal(m.chars,59);
 assert.equal(m.sentences,3);
 assert.equal(m.paragraphs,1);
 assert.equal(measureWriting(LONG).paragraphs,4);
 const empty=measureWriting('');
 assert.equal(empty.chars,0);assert.equal(empty.sentences,0);assert.equal(empty.paragraphs,0);
});

test('최소 분량에 못 미치면 평가 자체를 막고 이유를 남긴다', ()=>{
 const sc=writingRubricScope(SHORT);
 assert.equal(sc.blocked,true);
 assert.equal(sc.assessable.length,0);
 assert.match(sc.reason,new RegExp(`최소 ${RUBRIC_MIN_WRITING.chars}자`));
 assert.match(sc.reason,/지금은 5자 · 1문장/);
 // 문장 수만 모자라도 막습니다.
 assert.equal(writingRubricScope('아주 길게 쓴 한 문장인데 문장 부호가 하나도 없어서 계속 이어지는 글이라서 문장 수가 모자랍니다').blocked,true);
});

test('막힌 글은 점수를 하나도 만들지 않는다', ()=>{
 const r=blockedWritingRubric(writingRubricScope(SHORT));
 assert.equal(r.blocked,true);
 assert.equal(r.total,null);
 assert.equal(r.level,null);
 assert.equal(r.evaluatedCount,0);
 assert.equal(r.askedCount,0);
 assert.equal(Object.values(r.domains).filter(d=>d.score!=null).length,0);
 assert.equal(Object.keys(r.domains).length,WRITING_RUBRIC_DOMAINS.length);
});

test('중간 분량은 확인 가능한 영역만 평가 대상으로 삼는다', ()=>{
 const sc=writingRubricScope(MID);
 assert.equal(sc.blocked,false);
 for(const k of ['purpose','expression','conventions','cohesion']) assert.ok(sc.assessable.includes(k),k);
 for(const k of ['evidence','organization','audience']) assert.ok(!sc.assessable.includes(k),k);
 assert.ok(!sc.assessable.includes('content'));
 assert.match(sc.skipped.find(x=>x.key==='organization').need,/문장 5개 이상/);
 assert.match(sc.skipped.find(x=>x.key==='audience').need,/공백 제외 글자 150개 이상/);
 assert.match(sc.reason,/4개 영역은 평가하지 않았어요/);
 assert.match(sc.reason,/59자 · 3문장 · 1문단/);
});

test('충분히 긴 글은 여덟 영역 모두 평가한다', ()=>{
 const sc=writingRubricScope(LONG);
 assert.equal(sc.blocked,false);
 assert.equal(sc.assessable.length,WRITING_RUBRIC_DOMAINS.length);
 assert.equal(sc.skipped.length,0);
 assert.equal(sc.reason,'');
});

test('프롬프트는 평가할 영역만 요청하고 제외 영역을 이유와 함께 알린다', ()=>{
 const sc=writingRubricScope(MID);
 const p=buildWritingRubricPrompt({studentName:'하늘',title:'줄다리기',genre:'생활문',content:MID},sc);
 assert.match(p,/"purpose"/);
 assert.doesNotMatch(p,/"organization":\{"score"/);
 assert.doesNotMatch(p,/"audience":\{"score"/);
 assert.match(p,/평가하지 않는 영역 — domains에 넣지 마라/);
 assert.match(p,/장르 구조·문단 조직: 분량이 부족하다\(문장 5개 이상 필요\)/);
 assert.match(p,/분량: 공백 제외 59자 · 3문장 · 1문단/);
 const full=buildWritingRubricPrompt({content:LONG},writingRubricScope(LONG));
 assert.doesNotMatch(full,/평가하지 않는 영역 — domains에 넣지 마라/);  // 맺음말의 같은 표현과 구분
 assert.match(full,/"audience"/);
});

test('요청에서 뺀 영역은 AI가 점수를 보내도 버린다', ()=>{
 const sc=writingRubricScope(MID);
 const r=normalizeWritingRubric({total:80,domains:{
   purpose:{score:4,evidence:'e',advice:'a'},
   audience:{score:5,evidence:'지어낸 근거',advice:'a'},      // 요청하지 않은 영역
   organization:{score:5,evidence:'지어낸 근거',advice:'a'}
 }},sc);
 assert.equal(r.domains.purpose.score,4);
 assert.equal(r.domains.audience.score,null);
 assert.equal(r.domains.organization.score,null);
 assert.equal(r.domains.audience.evidence,'');
 assert.equal(r.evaluatedCount,1);
 assert.equal(r.askedCount,sc.assessable.length);
 assert.equal(r.total,80);                                   // 4/5 → 80, 버린 영역은 평균에 안 들어감
});

test('요청한 영역을 다 채우면 부분 평가 안내를 붙이지 않는다', ()=>{
 const sc=writingRubricScope(MID);
 const domains={};sc.assessable.forEach(k=>{domains[k]={score:4,evidence:'e',advice:'a'};});
 const r=normalizeWritingRubric({total:80,domains},sc);
 assert.equal(r.evaluatedCount,sc.assessable.length);
 assert.equal(r.evaluatedCount,r.askedCount);
 assert.match(r.scopeNote,/4개 영역은 평가하지 않았어요/);   // 분량 안내는 남음
});

test('막힌 글과 임시 산출은 평균에서 각각 따로 제외된다', ()=>{
 const good=normalizeWritingRubric(full());
 const blocked=blockedWritingRubric(writingRubricScope(SHORT));
 const fb=fallbackWritingRubric({content:'짧다.'});
 const avg=_writingRubricAverages([{rubric:good},{rubric:blocked},{rubric:fb}]);
 assert.equal(avg.count,1);
 assert.equal(avg.excluded,2);
 assert.equal(avg.excludedShort,1);
 assert.equal(avg.excludedFallback,1);
 assert.equal(avg.total,good.total);
});

test('내보내기 텍스트가 분량 때문에 평가하지 않았음을 밝힌다', ()=>{
 const t=_writingRubricExportText(blockedWritingRubric(writingRubricScope(SHORT)));
 assert.match(t,/루브릭 총점: 미산출/);
 assert.match(t,/글이 짧아 루브릭 평가를 하지 않았어요/);
 assert.match(t,/목적·과제 적합성: 미평가/);
});
