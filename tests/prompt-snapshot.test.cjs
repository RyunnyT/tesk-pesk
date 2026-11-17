// 프롬프트 문장을 실수로 바꾸지 않았는지 확인한다.
// tests/fixtures/prompts/*.txt 는 고정 입력(inputs.json)으로 만든 프롬프트다.
// 프롬프트를 일부러 고쳤다면 모듈의 version 을 올리고  UPDATE_PROMPT_SNAPSHOTS=1 node tests/prompt-snapshot.test.cjs  로 새로 저장한다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'fixtures','prompts'),inputs=JSON.parse(fs.readFileSync(path.join(dir,'inputs.json'),'utf8'));
const RecordCheck=require('../shared/record-check.js'),RecordPrompts=require('../shared/record-prompts.js'),
  WritingRubric=require('../shared/writing-rubric.js'),DocPrompts=require('../shared/doc-prompts.js');
const update=process.env.UPDATE_PROMPT_SNAPSHOTS==='1';
const AiRequest=require('../shared/ai-request.js');
function same(name,actual){
  actual=typeof actual==='string'?actual:AiRequest.textOf(actual);   // {system,user} 는 이어 붙여 비교
  const file=path.join(dir,name);
  if(update||!fs.existsSync(file)){fs.writeFileSync(file,actual);return;}
  assert.equal(actual,fs.readFileSync(file,'utf8'),name+' 프롬프트가 바뀌었습니다');
}
function recordCtx(extra){
  const grade=RecordCheck.gradeFromClassName(inputs.className),band=RecordCheck.gradeBand(grade);
  return {gradeText:grade+'학년',bandLabel:RecordCheck.BANDS[band].label,fields:RecordCheck.recordFields(band),...extra};
}
function docCtx(){
  const d=new Date(inputs.today),w=['일','월','화','수','목','금','토'];
  return {today:inputs.today.slice(0,10),school:inputs.docs.school,className:inputs.className,teacher:inputs.docs.teacher,date:`${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.(${w[d.getDay()]})`};
}
const F=inputs.docs.fields;

test('생활기록부 초안·누가 기록 프롬프트',()=>{
  same('record-draft.txt',RecordPrompts.draft(recordCtx({contextText:inputs.record.context})));
  same('record-notes.txt',RecordPrompts.fromNotes(recordCtx({byArea:inputs.record.byArea,contextText:inputs.record.context})));
});
test('생활기록부 다듬기 프롬프트',()=>{
  const field=RecordCheck.recordFields('3-4').find(f=>f.key==='comprehensive');
  same('record-refine.txt',RecordPrompts.refine(recordCtx({field,current:'친구를 잘 도와줌.',instruction:'더 구체적으로',context:inputs.record.context})));
});
test('글쓰기 루브릭 프롬프트와 분량 기준',()=>{
  inputs.writings.forEach((w,i)=>same('rubric-'+i+'.txt',WritingRubric.prompt(w,null,{grade:4,topic:i===0?{title:'우리 동네 소개',desc:''}:null})));
  same('rubric-scope.json',JSON.stringify(inputs.writings.map(w=>WritingRubric.scope(w.content)),null,1));
});
test('교사 도우미 문서 4종 프롬프트',()=>{
  same('doc-gongmun.txt',DocPrompts.gongmun({title:F['gm-title'],content:F['gm-content'],detail:F['gm-detail'],rels:F['.gm-rel-input'],atts:F['.gm-att-input']},docCtx()));
  same('doc-plan.txt',DocPrompts.plan({title:F['pl-title'],content:F['pl-content']},docCtx()));
  same('doc-pumi.txt',DocPrompts.pumi({title:F['pm-title'],type:F['pm-type'],related:F['pm-related'],budget:F['pm-budget'],purpose:F['pm-purpose'],extra:F['pm-extra'],items:inputs.docs.items},docCtx()));
  same('doc-letter.txt',DocPrompts.letter({school:F['lt-school'],title:F['lt-title'],content:F['lt-content']},docCtx()));
});
test('모듈마다 버전이 있다',()=>{
  for(const m of [RecordPrompts,WritingRubric,DocPrompts,require('../shared/writing-rubric-anchors.js')])assert.match(m.version,/^\d{4}-\d{2}-\d{2}\.\d+$/);
});
