// AI 평가 도구를 키 없이: 모든 프롬프트가 만들어지고, 어떤 프롬프트에도 가상 학급 명단의 이름이 남지 않는다.
const test=require('node:test'),assert=require('node:assert/strict');
const Eval=require('../tools/ai-eval.cjs'),AiPrivacy=require('../shared/ai-privacy.js'),AiRequest=require('../shared/ai-request.js');
const roster=require('./ai-eval/roster.json');

test('모든 스위트의 프롬프트가 만들어지고 이름이 남지 않는다',()=>{
  const d=Eval.dry();
  assert.deepEqual(d.problems,[]);
  for(const k of ['writing','counsel','record','peer','literacy','docs'])assert.ok(d.count[k]>0,k);
});

test('가상 자료 속 이름이 실제로 프롬프트에서 바뀐다 (검사가 헛돌지 않는지)',()=>{
  const all=AiPrivacy.forRoster(roster.students);
  const w=Eval.SUITES.writing().find(x=>x.id==='w34-good');
  assert.match(w.case.content,/박다온/);
  assert.doesNotMatch(AiRequest.textOf(w.prompt),/박다온|다온이/);
  assert.match(AiRequest.textOf(w.prompt),/학생 02/);
  const r=Eval.SUITES.record().find(x=>x.id==='r-rich-1');
  assert.match(AiRequest.textOf(r.prompt),/학생 02과 함께/);
  const p=Eval.SUITES.peer().find(x=>x.num===1);
  assert.deepEqual(all.leaks(AiRequest.textOf(p.prompt)),[]);
  assert.ok(all.leaks('박다온이 왔다').length,'가리지 않은 글은 잡아낸다');
});

test('짧은 글은 루브릭 프롬프트를 만들지 않는다',()=>{
  assert.equal(Eval.SUITES.writing().find(x=>x.id==='w34-short').prompt,null);
});

test('요약: 합격선 미달을 찾아낸다',()=>{
  const s=Eval.summarize({metrics:{'writing.format':{ok:8,n:10},writingMeanDiff:1.4}},null);
  assert.ok(s.fail.some(f=>f.startsWith('writing.format')));
  assert.ok(s.fail.some(f=>f.startsWith('writingMeanDiff')));
  assert.equal(Eval.summarize({metrics:{'writing.format':{ok:10,n:10}}},null).fail.length,0);
});
