/* AI로 나가는 글에서 학생 이름을 가명으로 바꾸고, 받은 결과에서 되돌립니다.
   - 학급 명단 전체가 대상입니다(본인뿐 아니라 글·메모에 나오는 다른 학생도).
   - 가명은 번호 두 자리 '학생 03'. selfNum 으로 지정한 학생은 selfAlias(기본 '이 학생').
   - AI 를 쓰지 않는 순수 함수라 Node 테스트·평가 도구에서도 씁니다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AiPrivacy=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-16.1';
// 이름만(성 없이) 단독으로 나왔을 때는 가리지 않는 이름 — 일반 낱말과 같아서 글의 뜻이 바뀝니다.
// 이런 이름도 '성+이름' 전체나 '이름+조사'(하늘이가, 하늘아)로 나오면 가립니다.
const COMMON_WORD_NAMES=['하늘','바다','나라','보람','슬기','사랑','소망','한결','가을','여름','겨울','다정','시원','기쁨','믿음','은혜','지혜','우주','한별','새벽',
  '이슬','보리','누리','마음','나무','구름','하나','두리','세상','진리','자유','평화','용기','미소','단비','소리','고운','한빛','다운','아름'];
// 이름 뒤에 붙는 조사·호칭. '이'가 끼는 형태(하늘이는)와 바로 붙는 형태(하늘은)를 모두 봅니다.
const PARTICLES='은|는|이|가|을|를|의|도|와|과|랑|만|야|아|씨|네|한테|에게|한테서|에게서|까지|부터|처럼|보다|하고|이랑|이네|이야|이도|이는|이가|이를|이의|이와|이만|이한테|이에게|이까지|이부터|이처럼|이보다|이하고';
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pad=n=>String(n).padStart(2,'0');
const H='가-힣';

/* students: [{num, name}], opts: {selfNum, selfAlias, teacherName} */
function forRoster(students,opts){
  const o=opts||{},selfAlias=o.selfAlias||'이 학생';
  const list=(students||[]).map(s=>({num:Number(s.num),name:String(s.name||'').trim()})).filter(s=>s.name.length>=2&&Number.isFinite(s.num));
  const aliasOf=num=>o.selfNum!=null&&Number(num)===Number(o.selfNum)?selfAlias:'학생 '+pad(num);
  const byNum=new Map(list.map(s=>[s.num,s]));
  // 같은 이름(동명이인)이나 같은 '이름만'을 쓰는 학생: 번호가 빠른 학생의 가명으로 하고 기록해 둡니다.
  const fulls=new Map(),givens=new Map(),ambiguous=[];
  list.slice().sort((a,b)=>a.num-b.num).forEach(s=>{
    if(fulls.has(s.name))ambiguous.push({name:s.name,nums:[fulls.get(s.name),s.num]});else fulls.set(s.name,s.num);
    const g=s.name.length>=3?s.name.slice(1):'';
    if(g){if(givens.has(g)){if(givens.get(g)!==s.num)ambiguous.push({name:g,nums:[givens.get(g),s.num]});}else givens.set(g,s.num);}
  });
  const fullList=[...fulls.keys()].sort((a,b)=>b.length-a.length);
  const givenList=[...givens.keys()].sort((a,b)=>b.length-a.length);
  // 성+이름 전체: 앞이 한글이면(다른 낱말의 일부) 건드리지 않는다. 두 글자 이름은 뒤도 본다(한솔방울 ≠ 한솔).
  const fullRe=(n,flags)=>new RegExp('(?<!['+H+'])'+esc(n)+(n.length<=2?'(?=('+PARTICLES+')?(?!['+H+']))':''),flags||'');
  const teacher=String(o.teacherName||'').trim();
  // 치환 도중 가명 안의 글자가 다시 바뀌지 않게 표식으로 바꿨다가 마지막에 가명으로 풉니다.
  const mark=num=>''+num+'';
  function mask(text){
    let t=String(text??'');
    if(!t)return t;
    fullList.forEach(n=>{t=t.replace(fullRe(n,'g'),mark(fulls.get(n)));});
    givenList.forEach(g=>{
      const m=mark(givens.get(g));
      t=t.replace(new RegExp('(?<!['+H+'])'+esc(g)+'(?=('+PARTICLES+')(?!['+H+']))','g'),m);
      if(!COMMON_WORD_NAMES.includes(g))t=t.replace(new RegExp('(?<!['+H+'])'+esc(g)+'(?!['+H+'])','g'),m);
    });
    if(teacher.length>=2&&teacher!=='담임')t=t.split(teacher+' 선생님').join('담임 선생님').split(teacher+'선생님').join('담임 선생님').split(teacher).join('담임');
    return t.replace(/(\d+)/g,(_,n)=>aliasOf(Number(n)));
  }
  function unmask(text){
    return String(text??'').replace(/학생 ?(\d{2})(?!\d)/g,(m,n)=>{const s=byNum.get(Number(n));return s?s.name:m;});
  }
  const deep=f=>function walk(v){
    if(typeof v==='string')return f(v);
    if(Array.isArray(v))return v.map(walk);
    if(v&&typeof v==='object'){
      const out=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)]));
      // 검증 함수가 숨겨 둔 값(예: 버린 항목 수 dropped)도 그대로 옮긴다
      for(const k of Object.getOwnPropertyNames(v))if(!(k in out))Object.defineProperty(out,k,{value:walk(v[k]),enumerable:false,writable:true,configurable:true});
      return out;
    }
    return v;
  };
  /* 글에 남아 있는 명단 이름 (보내기 전 마지막 확인용). 일반 낱말 이름의 단독 형태는 세지 않습니다. */
  function leaks(text){
    const t=String(text??''),out=new Set();
    fullList.forEach(n=>{if(fullRe(n).test(t))out.add(n);});
    givenList.forEach(g=>{
      if(new RegExp('(?<!['+H+'])'+esc(g)+'(?=('+PARTICLES+')(?!['+H+']))').test(t))out.add(g);
      else if(!COMMON_WORD_NAMES.includes(g)&&new RegExp('(?<!['+H+'])'+esc(g)+'(?!['+H+'])').test(t))out.add(g);
    });
    return [...out];
  }
  return {mask,unmask,maskDeep:deep(mask),unmaskDeep:deep(unmask),leaks,aliasOf,ambiguous,size:list.length};
}
/* 글쓰기·상담 기록을 가린 사본 — 교사 화면과 평가 도구가 같은 방식으로 가린다 */
function writing(w,m){ return {...w, studentName:'', title:m.mask(w.title||''), content:m.mask(w.content||''), teachingContext:m.maskDeep(w.teachingContext||{})}; }
function counsel(r,m){ return {...r, ...m.maskDeep({voice:r.voice||'', content:r.content||'', need:r.need||'', plan:r.plan||'', outcome:r.outcome||'', sessions:Array.isArray(r.sessions)?r.sessions:[]})}; }
return {version,forRoster,COMMON_WORD_NAMES,writing,counsel};
});
