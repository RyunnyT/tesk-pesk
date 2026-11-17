/* 📚 지문 은행 사실 검수 — 은행의 모든 지문을 교사 앱과 같은 검수 프롬프트로 돌린다.
   실행: TESK_EVAL_KEY=... node tools/literacy-bank/review.cjs [--model gemini-3.6-flash] [--only 과학-56]
   결과: output/reviews/literacy-bank/review-날짜.json + 콘솔 요약. 지적된 지문은 사람이 확인해 고친다.
   키는 환경 변수로만 받는다. 지문은 공개 교재라 학생 정보가 없다. */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const L=require(path.join(ROOT,'shared','literacy-core.js')),R=require(path.join(ROOT,'shared','ai-request.js'));
const arg=n=>{const i=process.argv.indexOf('--'+n);return i<0?null:process.argv[i+1];};
const key=process.env.TESK_EVAL_KEY,model=arg('model')||'gemini-3.6-flash',only=arg('only');
if(!key){console.log('TESK_EVAL_KEY 가 없어 검수를 건너뜁니다.');process.exit(0);}
async function ask(prompt){
  const r=R.build(model,key,prompt,{maxTokens:R.maxTokens(model,4000),temperature:0.1,json:true});
  const res=await fetch(r.url,{method:'POST',headers:r.headers,body:r.body,signal:AbortSignal.timeout(r.timeoutMs)});
  const data=await res.json();if(!res.ok)throw Error(data?.error?.message||('HTTP '+res.status));
  return R.read(model,data).text;
}
(async()=>{
  const csv=fs.readFileSync(path.join(__dirname,'literacy-bank.csv'),'utf8');
  const rows=L.parseBank(csv).rows.filter(r=>r.ok&&(!only||String(r.id).startsWith(only.replace('-',''))||String(r.id).startsWith(only)));
  const out=[];
  for(const row of rows){
    const sheet=L.bankSheetFor(row,'2026-01-01').sheet;
    try{const issues=L.validateReview(await ask(L.buildReviewPrompt(sheet,{level:row.level})),sheet);out.push({id:row.id,title:row.title,issues});
      if(issues.length)console.log(row.id,row.title,'→',issues.map(i=>i.severity+': '+i.problem).join(' / '));}
    catch(e){out.push({id:row.id,title:row.title,error:e.message});console.log(row.id,'검수 실패:',e.message);}
  }
  const dir=path.join(ROOT,'output','reviews','literacy-bank');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'review-'+new Date().toISOString().slice(0,10)+'.json');
  fs.writeFileSync(file,JSON.stringify({model,at:new Date().toISOString(),results:out},null,1));
  const flagged=out.filter(x=>x.issues&&x.issues.length);
  console.log(`\n${rows.length}편 검수 · 지적 ${flagged.length}편 (틀림 ${flagged.filter(x=>x.issues.some(i=>i.severity==='틀림')).length}편) · 저장: ${path.relative(ROOT,file)}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
