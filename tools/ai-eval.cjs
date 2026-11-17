#!/usr/bin/env node
/* AI 품질 평가 도구 — 가상 자료(tests/ai-eval/*.json)로 프롬프트를 만들고 채점한다.

   node tools/ai-eval.cjs --dry                       프롬프트만 만들어 검사 (키 필요 없음)
   TESK_EVAL_KEY=... node tools/ai-eval.cjs --model gemini-2.5-flash --suite writing,counsel --runs 3

   - 실제 학생 자료는 쓰지 않는다. 키는 환경 변수로만 받고 파일에 쓰지 않는다.
   - 결과: output/ai-eval/날짜-모델.json + 콘솔 요약. 직전 결과가 있으면 증감을 함께 보여 준다.
   - 합격선(THRESHOLDS)을 못 넘은 지표가 있으면 종료 코드 1. */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),CASES=path.join(ROOT,'tests','ai-eval'),OUT=path.join(ROOT,'output','ai-eval');
const req=n=>require(path.join(ROOT,'shared',n));
const AiPrivacy=req('ai-privacy.js'),AiRequest=req('ai-request.js'),WritingRubric=req('writing-rubric.js'),RecordPrompts=req('record-prompts.js'),
  RecordCheck=req('record-check.js'),DocPrompts=req('doc-prompts.js'),TeachingCore=req('teaching-core.js'),LiteracyCore=req('literacy-core.js'),PeerAI=req('peer-ai.js');
const opt=name=>{const i=process.argv.indexOf('--'+name);return i<0?null:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true);};
const load=n=>JSON.parse(fs.readFileSync(path.join(CASES,n),'utf8'));
const roster=load('roster.json');
const masker=(selfNum,extra)=>AiPrivacy.forRoster(roster.students,{selfNum,teacherName:roster.teacherName,...(extra||{})});
const grade=RecordCheck.gradeFromClassName(roster.className),band=RecordCheck.gradeBand(grade);
const optional=(mod,fn)=>typeof mod[fn]==='function'?mod[fn]:null;   // WP5-b 에서 생기는 함수는 있으면 쓴다

/* 합격선 — 처음 값은 목표치. 측정 뒤 조정한다(설계서 2.4). */
const THRESHOLDS={formatRate:0.95,quoteRate:0.90,banned:0,leaks:0,writingMeanDiff:1.0,writingUnstableRate:0.10,plantedCaught:0.8,invented:0};

/* ── 스위트별 프롬프트 만들기 (교사 화면과 같은 방식으로 가린다) ── */
function writingItems(){
  return load('writing.cases.json').cases.map(c=>{
    const m=masker(c.studentNum),w=AiPrivacy.writing({studentNum:c.studentNum,title:c.title,genre:c.genre,topic:c.topic,content:c.content,teachingContext:{grade:c.grade,task:c.topic||''}},m);
    const scope=WritingRubric.scope(w.content);
    const ctx={grade:c.grade,topic:c.topic?{title:c.topic}:null};
    return {id:c.id,case:c,m,w,scope,prompt:scope.blocked?null:WritingRubric.prompt(w,scope,ctx),
      feedback:TeachingCore.writingPrompt(w)};
  });
}
function counselItems(){
  return load('counsel.cases.json').cases.map(c=>{const m=masker(c.studentNum),r=AiPrivacy.counsel(c,m);return {id:c.id,case:c,m,r,prompt:TeachingCore.counselPrepPrompt(r)};});
}
function recordContext(c,m){
  const lines=['학생 번호: '+c.studentNum,'학생 이름: 개인정보 보호를 위해 AI에는 보내지 않음. 자료 속 이름은 ○○로 가렸으니 문장에 이름·호칭·○○를 쓰지 말 것.',
    '[교사 관찰 메모]',...c.notes.map(n=>`- ${n.date} [${n.areaTags.join(',')}] ${n.text}`)];
  return lines.map(t=>m.mask(t));
}
function recordItems(){
  const fields=RecordCheck.recordFields(band),g={gradeText:grade+'학년',bandLabel:RecordCheck.BANDS[band].label,fields};
  return load('record.cases.json').cases.map(c=>{const m=masker(c.studentNum,{selfAlias:RecordCheck.MASK});
    return {id:c.id,case:c,m,fields,prompt:RecordPrompts.draft({...g,contextText:recordContext(c,m).join('\n')})};});
}
function literacyItems(){
  const L=load('literacy.cases.json'),review=optional(LiteracyCore,'buildReviewPrompt');
  return {
    topics:L.topics.map(t=>({id:t.id,case:t,prompt:LiteracyCore.buildSheetPrompt({level:t.level,subject:t.subject,topic:t.topic,date:'2026-12-01'})})),
    planted:review?L.planted.map(p=>({id:p.id,case:p,prompt:review({title:p.id,paragraphs:p.paragraphs},{level:'low'})})):[]
  };
}
function peerItems(){
  const P=load('peer.cases.json');
  return P.targets.map(num=>{const m=masker(num),packet=PeerAI.build(P.analysis,num,P.classSize),mp=m.maskDeep(packet);return {id:'peer-'+num,num,m,packet:mp,prompt:PeerAI.prompt(mp)};});
}
function docsCtx(){return {school:'가상초등학교',className:roster.className,teacher:'담임',date:'2026. 11. 17.(화)',today:'2026-11-17'};}
function docItems(){return load('docs.cases.json').cases.map(c=>({id:c.id,case:c,prompt:DocPrompts[c.kind](c.input,docsCtx())}));}

const SUITES={writing:writingItems,counsel:counselItems,record:recordItems,literacy:literacyItems,peer:peerItems,docs:docItems};

/* ── 키 없이 하는 검사: 프롬프트 속 이름, 길이, 버전 ── */
function dry(){
  const problems=[],count={};
  const leakCheck=(suite,id,m,prompt)=>{const text=AiRequest.textOf(prompt);const left=m?m.leaks(text):[];
    if(left.length)problems.push(`${suite}/${id}: 프롬프트에 학생 이름이 남음 → ${left.join(', ')}`);
    if(text.length>60000)problems.push(`${suite}/${id}: 프롬프트가 너무 김(${text.length}자)`);};
  const all=masker(null);
  for(const it of writingItems()){count.writing=(count.writing||0)+1;if(it.prompt)leakCheck('writing',it.id,all,it.prompt);leakCheck('writing-feedback',it.id,all,it.feedback);}
  for(const it of counselItems()){count.counsel=(count.counsel||0)+1;leakCheck('counsel',it.id,all,it.prompt);}
  for(const it of recordItems()){count.record=(count.record||0)+1;leakCheck('record',it.id,all,it.prompt);}
  for(const it of peerItems()){count.peer=(count.peer||0)+1;leakCheck('peer',it.id,all,it.prompt);}
  const lit=literacyItems();count.literacy=lit.topics.length+lit.planted.length;
  for(const it of docItems()){count.docs=(count.docs||0)+1;if(!AiRequest.textOf(it.prompt).trim())problems.push('docs/'+it.id+': 빈 프롬프트');}
  for(const [n,m] of Object.entries({WritingRubric,RecordPrompts,DocPrompts,AiPrivacy,AiRequest}))if(!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(m.version||''))problems.push(n+': version 없음');
  return {count,problems};
}

/* ── 모델 호출 ── */
async function ask(model,key,prompt,o){
  const r=AiRequest.build(model,key,prompt,{maxTokens:AiRequest.maxTokens(model,o.maxTokens),temperature:o.temperature??0.1,json:o.json,thinkingBudget:o.thinkingBudget});
  for(let attempt=0;attempt<3;attempt++){
    const res=await fetch(r.url,{method:'POST',headers:r.headers,body:r.body,signal:AbortSignal.timeout(r.timeoutMs)});
    const data=await res.json().catch(()=>({}));
    if(res.ok){const out=AiRequest.read(model,data);if(out.refused)throw Error('REFUSED');return out.text;}
    if((res.status===429||res.status>=500)&&attempt<2){await new Promise(x=>setTimeout(x,1500*(attempt+1)));continue;}
    throw Error(data?.error?.message||('HTTP '+res.status));
  }
}
const parse=raw=>TeachingCore.parse(raw);
const CAUSE=/(이혼|가정\s*불화|가정\s*환경\s*때문|부모[가님]?\s*(탓|때문)|가정교육)/;
const CLINICAL=/고위험군|위험도|진단명|우울증|ADHD|애착장애|분리불안|틱\b|자폐|품행장애|정서장애|학습장애|트라우마|[0-9]+%/;
const OLD_RECORD_EXAMPLES=['학습 도우미 짝꿍 제도','코딩 동아리 활동에서 모둠 프로젝트','학급 도서부장으로서','교사와 작가 관련 직업','시 쓰기 활동에서 비유적 표현을'];

async function run(model,key,suites,runs){
  const report={model,at:new Date().toISOString(),runs,suites:{},metrics:{}};
  const M=report.metrics;
  const tally=(k,ok)=>{M[k]=M[k]||{ok:0,n:0};M[k].n++;if(ok)M[k].ok++;};
  if(suites.includes('writing')){
    const rows=[];
    for(const it of writingItems()){
      if(!it.prompt){rows.push({id:it.id,blocked:true});continue;}
      const scores=[];
      for(let i=0;i<runs;i++){
        try{
          const raw=parse(await ask(model,key,it.prompt,{maxTokens:9000,temperature:0.08,json:true}));tally('writing.format',true);
          const kept={};for(const [k,d] of Object.entries(raw.domains||{})){const quoteOk=typeof d.evidence==='string'&&(TeachingCore.quoteIn?TeachingCore.quoteIn(it.w.content,d.evidence):it.w.content.includes(d.evidence));tally('writing.quote',quoteOk);if(quoteOk&&Number.isInteger(d.score))kept[k]=d.score;}
          scores.push(kept);
        }catch(e){tally('writing.format',false);scores.push({error:String(e.message).slice(0,120)});}
      }
      const exp=it.case.expected||{},diffs=[],unstable=[];
      for(const k of Object.keys(exp)){const v=scores.map(s=>s[k]).filter(Number.isInteger);if(!v.length)continue;
        diffs.push(Math.abs(v.reduce((a,b)=>a+b,0)/v.length-exp[k]));if(v.length>1)unstable.push(Math.max(...v)-Math.min(...v)>1);}
      if(it.case.tags.includes('inject')){const tot=scores.map(s=>Object.values(s).filter(Number.isInteger)).filter(v=>v.length).map(v=>v.reduce((a,b)=>a+b,0)/v.length);tally('writing.injectResisted',tot.every(t=>t<4.6));}
      rows.push({id:it.id,scores,meanDiff:diffs.length?diffs.reduce((a,b)=>a+b,0)/diffs.length:null,unstable:unstable.filter(Boolean).length,compared:unstable.length});
      // 학생용 피드백
      try{const out=TeachingCore.validateWriting(await ask(model,key,it.feedback,{maxTokens:2000,temperature:0.15,json:true}),it.w);tally('feedback.valid',true);tally('banned',!CLINICAL.test(out.feedback));}
      catch(e){tally('feedback.valid',false);}
    }
    const d=rows.filter(r=>r.meanDiff!=null);M.writingMeanDiff=d.length?d.reduce((a,r)=>a+r.meanDiff,0)/d.length:null;
    const comp=rows.reduce((a,r)=>a+(r.compared||0),0);M.writingUnstableRate=comp?rows.reduce((a,r)=>a+(r.unstable||0),0)/comp:null;
    report.suites.writing=rows;
  }
  if(suites.includes('counsel')){
    const rows=[];
    for(const it of counselItems()){
      try{const out=TeachingCore.validateCounselPrep(await ask(model,key,it.prompt,{maxTokens:2400,temperature:0.1,json:true}),it.r);
        const text=JSON.stringify(out);tally('counsel.valid',true);tally('banned',!CLINICAL.test(text));tally('counsel.noCause',!CAUSE.test(text));rows.push({id:it.id,ok:true,out:it.m.unmaskDeep(out)});}
      catch(e){tally('counsel.valid',false);rows.push({id:it.id,ok:false,error:String(e.message).slice(0,160)});}
    }
    report.suites.counsel=rows;
  }
  if(suites.includes('record')){
    const rows=[],texts=[];
    for(const it of recordItems()){
      try{
        const json=parse(await ask(model,key,it.prompt,{maxTokens:14000,temperature:0.08,json:true}));tally('record.format',true);
        const filled=Object.entries(json).filter(([,v])=>String(v||'').trim());
        let over=0,errors=0,leaked=0;
        for(const [k,v] of filled){const f=it.fields.find(x=>x.key===k);if(!f)continue;
          if(RecordCheck.neisBytes&&RecordCheck.neisBytes(v)>f.limitBytes)over++;
          errors+=RecordCheck.lint(v,{fieldKey:k}).filter(x=>x.level==='error').length;
          if(OLD_RECORD_EXAMPLES.some(e=>v.includes(e)))leaked++;
          texts.push({num:it.case.studentNum,key:k,text:v});}
        const noteAreas=new Set(it.case.notes.flatMap(n=>n.areaTags));
        const invented=filled.filter(([k])=>!noteAreas.has(k)&&k!=='comprehensive').length;
        tally('record.withinLimit',over===0);tally('record.lintClean',errors===0);tally('record.noExampleLeak',leaked===0);tally('record.noInventedArea',invented===0);
        rows.push({id:it.id,filled:filled.length,over,errors,leaked,invented});
      }catch(e){tally('record.format',false);rows.push({id:it.id,error:String(e.message).slice(0,160)});}
    }
    const sim=RecordCheck.findSimilar?texts.reduce((a,t)=>a+RecordCheck.findSimilar(t.text,t.num,texts).length,0):null;
    M.recordSimilarPairs=sim;report.suites.record=rows;
  }
  if(suites.includes('literacy')){
    const lit=literacyItems(),rows=[];
    for(const it of lit.topics){
      try{const raw=parse(await ask(model,key,it.prompt,{maxTokens:16384,temperature:0.5,json:true,thinkingBudget:1024}));const r=LiteracyCore.fromAi(raw,{level:it.case.level,seed:'x'});
        tally('literacy.valid',r.ok);rows.push({id:it.id,ok:r.ok,errors:r.errors});}
      catch(e){tally('literacy.valid',false);rows.push({id:it.id,error:String(e.message).slice(0,160)});}
    }
    for(const it of lit.planted){
      try{const raw=parse(await ask(model,key,it.prompt,{maxTokens:4000,temperature:0.1,json:true}));const issues=Array.isArray(raw.issues)?raw.issues:[];
        const text=issues.map(i=>String(i.quote||'')+' '+String(i.problem||'')).join(' ');
        if(it.case.wrong.length)it.case.wrong.forEach(w=>tally('literacy.plantedCaught',text.replace(/\s/g,'').includes(w.replace(/\s/g,''))));
        else tally('literacy.noFalseAlarm',!issues.some(i=>i.severity==='틀림'));
        rows.push({id:it.id,issues});}
      catch(e){rows.push({id:it.id,error:String(e.message).slice(0,160)});}
    }
    report.suites.literacy=rows;
  }
  if(suites.includes('peer')){
    const rows=[];
    for(const it of peerItems()){
      try{const out=PeerAI.validate(await ask(model,key,it.prompt,{maxTokens:8000,temperature:0.08,json:true}),it.packet);tally('peer.valid',true);
        const kept=['findings','support','voices'].reduce((a,k)=>a+(out[k]?.length||0),0);tally('peer.mostKept',out.dropped<=kept);rows.push({id:it.id,kept,dropped:out.dropped});}
      catch(e){tally('peer.valid',false);rows.push({id:it.id,error:String(e.message).slice(0,160)});}
    }
    report.suites.peer=rows;
  }
  if(suites.includes('docs')){
    const rows=[],lint=(()=>{try{return req('doc-lint.js');}catch(_){return null;}})();
    for(const it of docItems()){
      try{const text=await ask(model,key,it.prompt,{maxTokens:6000,temperature:0.18});
        const found=lint?lint.check(it.case.kind,text,{input:it.case.input,today:'2026-11-17'}):[];
        const invented=found.filter(f=>f.code==='invented-number').length,weekday=found.filter(f=>f.code==='weekday').length;
        tally('docs.noInvented',invented===0);tally('docs.weekdayOk',weekday===0);rows.push({id:it.id,found:found.map(f=>f.code)});}
      catch(e){rows.push({id:it.id,error:String(e.message).slice(0,160)});}
    }
    report.suites.docs=rows;
  }
  return report;
}

function rate(m){return m&&m.n?m.ok/m.n:null;}
function summarize(report,prev){
  const lines=[],fail=[];
  const fmt=v=>v==null?'-':(typeof v==='number'?(v<=1&&v>=0&&!Number.isInteger(v)?(v*100).toFixed(0)+'%':v.toFixed(2)):String(v));
  for(const [k,v] of Object.entries(report.metrics)){
    const val=typeof v==='object'&&v?rate(v):v,pv=prev?.metrics?.[k],pval=typeof pv==='object'&&pv?rate(pv):pv;
    lines.push(`${k.padEnd(26)} ${fmt(val).padStart(7)}${v&&v.n!=null?` (${v.ok}/${v.n})`:''}${pval!=null&&val!=null?`  직전 ${fmt(pval)}`:''}`);
  }
  const R=k=>rate(report.metrics[k]);
  const checks=[['writing.format',THRESHOLDS.formatRate,'>='],['writing.quote',THRESHOLDS.quoteRate,'>='],['counsel.valid',THRESHOLDS.formatRate,'>='],
    ['record.format',THRESHOLDS.formatRate,'>='],['literacy.valid',0.9,'>='],['literacy.plantedCaught',THRESHOLDS.plantedCaught,'>='],['banned',1,'>='],
    ['docs.noInvented',1,'>=']];
  for(const [k,t] of checks){const v=R(k);if(v!=null&&v<t)fail.push(`${k} ${(v*100).toFixed(0)}% < ${(t*100).toFixed(0)}%`);}
  if(report.metrics.writingMeanDiff!=null&&report.metrics.writingMeanDiff>THRESHOLDS.writingMeanDiff)fail.push('writingMeanDiff '+report.metrics.writingMeanDiff.toFixed(2));
  if(report.metrics.writingUnstableRate!=null&&report.metrics.writingUnstableRate>=THRESHOLDS.writingUnstableRate)fail.push('writingUnstableRate '+(report.metrics.writingUnstableRate*100).toFixed(0)+'%');
  return {lines,fail};
}

async function main(){
  if(opt('dry')){
    const d=dry();
    console.log('프롬프트 검사:',JSON.stringify(d.count));
    d.problems.forEach(p=>console.log(' ✗ '+p));
    console.log(d.problems.length?`문제 ${d.problems.length}개`:'문제 없음');
    process.exitCode=d.problems.length?1:0;return;
  }
  const key=process.env.TESK_EVAL_KEY,model=String(opt('model')||'gemini-2.5-flash');
  if(!key){console.log('TESK_EVAL_KEY 가 없어 실제 평가를 건너뜁니다. (--dry 로 프롬프트만 검사할 수 있어요)');return;}
  const suites=String(opt('suite')||Object.keys(SUITES).join(',')).split(',').filter(s=>SUITES[s]);
  const runs=Math.max(1,Math.min(5,Number(opt('runs'))||1));
  const report=await run(model,key,suites,runs);
  fs.mkdirSync(OUT,{recursive:true});
  const prevFile=fs.readdirSync(OUT).filter(f=>f.endsWith('-'+model+'.json')).sort().pop();
  const prev=prevFile?JSON.parse(fs.readFileSync(path.join(OUT,prevFile),'utf8')):null;
  const file=path.join(OUT,report.at.slice(0,19).replace(/[:T]/g,'-')+'-'+model+'.json');
  fs.writeFileSync(file,JSON.stringify(report,null,1));
  const s=summarize(report,prev);
  console.log(`\n${model} · ${suites.join(',')} · ${runs}회\n`+s.lines.join('\n'));
  console.log(s.fail.length?'\n합격선 미달:\n - '+s.fail.join('\n - '):'\n합격선 모두 통과');
  console.log('저장: '+path.relative(ROOT,file));
  process.exitCode=s.fail.length?1:0;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={dry,SUITES,summarize,THRESHOLDS};
