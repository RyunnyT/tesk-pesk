/* 교사 도우미 결과 검사 — AI가 만든 공문·계획서·품의·가정통신문에서 고칠 곳을 찾는다. AI를 쓰지 않는다.
   check(kind, text, {input, today}) → [{code, level:'error'|'warn'|'info', message, match}]
   fixWeekdays(text) → {text, fixed} : "2026. 4. 10.(목)"처럼 요일이 달력과 다르면 바로잡는다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DocLint=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const WEEK=['일','월','화','수','목','금','토'];
const DATE_RE=/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*\(([일월화수목금토])\)/g;
function weekdayOf(y,m,d){const dt=new Date(y,m-1,d);return dt.getMonth()===m-1?WEEK[dt.getDay()]:null;}
function fixWeekdays(text){
  let fixed=0;
  const out=String(text||'').replace(DATE_RE,(all,y,m,d,w)=>{const real=weekdayOf(+y,+m,+d);if(!real||real===w)return all;fixed++;return `${y}. ${+m}. ${+d}.(${real})`;});
  return {text:out,fixed};
}
const inputText=input=>JSON.stringify(input||{});
const digits=s=>String(s||'').replace(/[^\d]/g,'');
function check(kind,text,opts){
  const o=opts||{},t=String(text||''),src=inputText(o.input),out=[];
  const add=(code,level,message,match)=>out.push({code,level,message,match:match?String(match).slice(0,60):''});
  // 마크다운 기호
  const md=t.match(/^\s*#{1,6}\s|\*\*|`|^\s*-{3,}\s*$/m);
  if(md)add('markdown','warn','마크다운 기호가 남아 있어요. 한글 문서에 옮기기 전에 지워 주세요.',md[0]);
  // 공문·품의는 "끝."
  if((kind==='gongmun'||kind==='pumi')&&!/끝\.\s*$/.test(t.trim()))add('no-end','error','공문서는 "끝."으로 마쳐야 해요.','');
  // 요일
  let m;DATE_RE.lastIndex=0;
  while((m=DATE_RE.exec(t))){const real=weekdayOf(+m[1],+m[2],+m[3]);if(real&&real!==m[4])add('weekday','error',`${m[1]}. ${+m[2]}. ${+m[3]}.은 ${real}요일이에요.`,m[0]);}
  DATE_RE.lastIndex=0;
  // 입력에 없던 법령 조항·문서번호·전화번호
  const inv=[[/제\s*\d+\s*조(?:\s*제\s*\d+\s*항)?/g,'법령 조항'],[/[가-힣A-Za-z]+[-–]\d{3,6}(?:\s*\(\d{4}\.)?/g,'문서번호'],[/0\d{1,2}[-)\s.]\d{3,4}[-\s.]\d{4}/g,'전화번호']];
  for(const [re,label] of inv){for(const x of t.match(re)||[]){
    const core=label==='문서번호'?digits(x):x.replace(/\s/g,'');
    if(label==='문서번호'?!digits(src).includes(core):!src.replace(/\s/g,'').includes(core))add('invented-number','error',`입력에 없던 ${label}가 들어 있어요. 사실인지 확인하고, 아니면 [확인 필요]로 바꿔 주세요.`,x);
  }}
  // 입력에 없던 금액
  for(const x of t.match(/\d{1,3}(?:,\d{3})+\s*원|\d{4,}\s*원/g)||[]){
    const n=digits(x);
    const known=digits(src).includes(n)||(o.input&&Array.isArray(o.input.items)&&String(o.input.items.reduce((a,i)=>a+(Number(i.sum)||0),0))===n);
    if(!known)add('invented-money','warn','입력에 없던 금액이 있어요. 맞는 금액인지 확인해 주세요.',x);
  }
  // 품의서 합계
  if(kind==='pumi'&&o.input&&Array.isArray(o.input.items)&&o.input.items.length){
    const total=o.input.items.reduce((a,i)=>a+(Number(i.sum)||0),0);
    const said=t.match(/(?:소요\s*예산|합계|총액)\s*[:：]?\s*금?\s*([\d,]+)\s*원/);
    if(said&&Number(digits(said[1]))!==total)add('sum-mismatch','error',`합계가 품목 합(${total.toLocaleString()}원)과 달라요.`,said[0]);
  }
  // 항목 번호: 같은 단계에서 번호를 건너뛰었는지 (1. → 3. / 가. → 다.)
  const KOR='가나다라마바사아자차카타파하';
  let lastNum=0,lastKor=-1;
  for(const line of t.split('\n')){
    const n=line.match(/^\s{0,1}(\d{1,2})\.\s/);if(n){const v=+n[1];if(lastNum&&v>lastNum+1)add('numbering','warn',`항목 번호 ${lastNum}. 다음에 ${v}.이 와요.`,line.trim());lastNum=v;lastKor=-1;continue;}
    const k=line.match(/^\s{1,4}([가-하])\.\s/);if(k){const v=KOR.indexOf(k[1]);if(v>=0){if(lastKor>=0&&v>lastKor+1)add('numbering','warn',`항목 번호 ${KOR[lastKor]}. 다음에 ${k[1]}.이 와요.`,line.trim());lastKor=v;}}
  }
  const checks=(t.match(/\[확인 ?필요[^\]\n]*\]/g)||[]).length;
  if(checks)add('check-needed','info',`[확인 필요] ${checks}곳을 채워 주세요.`,'');
  return out;
}
return {version,check,fixWeekdays,weekdayOf};
});
