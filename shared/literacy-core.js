/* 📖 오늘의 지문 — 교사 앱(생성·검토)과 학생 앱(풀이)이 함께 쓰는 규칙.
   · AI 는 지문·구조도·마무리 문제만 만든다. 초성·채점·보기 위치·공개 기간·보상은 코드가 정한다.
   · 지문 속 핵심어를 색이나 굵은 글씨로 강조하지 않는다 (학생이 강조된 낱말만 훑어보지 않게).
   · 빈칸 정답은 지문에 그대로 나오는 낱말이고, 용어 풀이 낱말과 겹치지 않는다 (용어 풀이만 보고 풀 수 없게). */
(function(root){
'use strict';
const SUBJECTS=['사회','역사','생활','과학','환경'];
const GROUP_A=['사회','역사','생활'],GROUP_B=['과학','환경'];
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const DOW=['일','월','화','수','목','금','토'];
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const BLANK_RE=/\{\{([^{}]+?)\}\}/g;

const clampInt=(v,min,max,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):d;};
const str=(v,max)=>String(v==null?'':v).replace(/\*\*/g,'').replace(/\s+/g,' ').trim().slice(0,max);

function normalizeCfg(raw){
  const c=(raw&&typeof raw==='object')?raw:{};
  return {
    grade:clampInt(c.grade,3,6,5),
    coinBase:clampInt(c.coinBase,0,500,30),
    coinBonus:clampInt(c.coinBonus,0,500,20),
    bonusMin:clampInt(c.bonusMin,1,4,3),
    graceDays:clampInt(c.graceDays,0,6,2),
    coinEssay:clampInt(c.coinEssay,0,500,20)
  };
}

/* ── 초성 ── 코드가 정답에서 뽑는다 (AI 가 쓴 초성은 믿지 않는다) */
function choseong(word){
  return [...String(word)].map(ch=>{
    const c=ch.charCodeAt(0);
    if(c>=0xAC00&&c<=0xD7A3)return CHO[Math.floor((c-0xAC00)/588)];
    return ch===' '?' ':ch;
  });
}
const squash=s=>String(s==null?'':s).normalize('NFC').replace(/[\s.,·'"‘’“”()!?~-]/g,'');
function same(a,b){const x=squash(a);return !!x&&x===squash(b);}

/* ── 날짜 ── */
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parse(date){const [y,m,d]=String(date).split('-').map(Number);return new Date(y,m-1,d);}
function addDays(date,n){const d=parse(date);d.setDate(d.getDate()+n);return ymd(d);}
function dowName(date){return DOW[parse(date).getDay()];}
/* 지문은 그 날짜부터 graceDays 일 뒤까지 풀 수 있다 (결석·체험학습으로 놓친 학생도 같은 보상) */
function windowOf(date,graceDays){return {from:date,until:addDays(date,clampInt(graceDays,0,6,2))};}
function stateOn(date,today,graceDays){
  if(!DATE_RE.test(String(date)))return 'closed';
  const w=windowOf(date,graceDays);
  if(today<w.from)return 'future';
  if(today>w.until)return 'closed';
  return 'open';
}
/* 요일표에서 앞으로의 회차 날짜를 뽑는다 (dows: 0=일…6=토) */
function upcomingDates(dows,fromDate,count){
  const out=[],set=new Set((dows||[]).map(Number));
  if(!set.size)return out;
  let d=fromDate;
  for(let i=0;i<120&&out.length<count;i++){if(set.has(parse(d).getDay()))out.push(d);d=addDays(d,1);}
  return out;
}
/* 회차별 분야: 한 주의 첫 회차는 사회 계열, 다음 회차는 과학 계열 — 번갈아 고르게 돌린다 */
function suggestSubjects(dates){
  let a=0,b=0;
  const weekOf=d=>{const x=parse(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return ymd(x);};
  const pos={};
  return dates.map(d=>{
    const w=weekOf(d);pos[w]=(pos[w]||0)+1;
    return pos[w]%2===1?GROUP_A[(a++)%GROUP_A.length]:GROUP_B[(b++)%GROUP_B.length];
  });
}

/* ── 보상 ── 처음 채점한 정답 수로 정한다 (고쳐서 맞힌 것은 완료만 인정) */
function reward(cfg,firstScore){
  const c=normalizeCfg(cfg);
  const bonus=Number(firstScore)>=c.bonusMin?c.coinBonus:0;
  return {base:c.coinBase,bonus,total:c.coinBase+bonus};
}

/* ── 지문 검증 ── AI 응답과 교사가 고친 내용을 같은 기준으로 확인한다 */
function blanksOf(sheet){
  const out=[];
  (sheet.map?.branches||[]).forEach((b,bi)=>{
    String(b.text||'').replace(BLANK_RE,(_,ans)=>{out.push({answer:ans.trim(),branch:bi,evidence:Number(b.evidence)||0});return '';});
  });
  return out;
}
function validate(raw,opts={}){
  const r=(raw&&typeof raw==='object')?raw:{};
  const errors=[],warnings=[];
  const paragraphs=(Array.isArray(r.paragraphs)?r.paragraphs:[]).map(p=>str(p,600)).filter(Boolean);
  const title=str(r.title,40);
  const glossary=(Array.isArray(r.glossary)?r.glossary:[]).map(g=>({term:str(g&&g.term,20),meaning:str(g&&g.meaning,90)})).filter(g=>g.term&&g.meaning).slice(0,3);
  const m=(r.map&&typeof r.map==='object')?r.map:{};
  const branches=(Array.isArray(m.branches)?m.branches:[]).map(b=>({
    label:str(b&&b.label,12),
    text:str(b&&b.text,90),
    sub:str(b&&b.sub,60),
    evidence:clampInt(b&&b.evidence,0,9,0)
  })).filter(b=>b.label&&b.text).slice(0,5);
  const q=(r.final_quiz&&typeof r.final_quiz==='object')?r.final_quiz:{};
  const choices=(Array.isArray(q.choices)?q.choices:[]).map(c=>str(c,70));
  const sheet={
    title,paragraphs,glossary,
    map:{center:str(m.center,16),branches},
    final_quiz:{text:str(q.text,160),choices,answer:[0,1,2,3].includes(Number(q.answer))?Number(q.answer):-1,evidence:clampInt(q.evidence,0,9,0),explain:str(q.explain,160)}
  };
  if(!title)errors.push('제목이 없어요.');
  if(paragraphs.length<3||paragraphs.length>6)errors.push('문단은 3~6개여야 해요.');
  if(glossary.length<1)errors.push('용어 풀이가 1개 이상 있어야 해요.');
  if(!sheet.map.center)errors.push('구조도 가운데 개념이 없어요.');
  if(branches.length<3)errors.push('구조도 가지는 3개 이상이어야 해요.');
  const text=squash(paragraphs.join(''));
  const pOk=n=>Number.isInteger(n)&&n>=1&&n<=paragraphs.length;
  const blanks=blanksOf(sheet);
  if(blanks.length!==3)errors.push('구조도 빈칸 {{ }} 은 정확히 3개여야 해요. (지금 '+blanks.length+'개)');
  if(new Set(blanks.map(b=>b.branch)).size!==blanks.length)errors.push('빈칸은 서로 다른 가지에 하나씩 넣어야 해요.');
  if(new Set(blanks.map(b=>squash(b.answer))).size!==blanks.length)errors.push('빈칸 정답이 서로 달라야 해요.');
  blanks.forEach((b,i)=>{
    const n=i+1;
    if(!b.answer||b.answer.length>10)errors.push(n+'번 빈칸 정답은 1~10글자여야 해요.');
    else if(!/^[가-힣 ]+$/.test(b.answer))errors.push(n+'번 빈칸 정답은 한글 낱말이어야 해요. ('+b.answer+')');
    else if(!text.includes(squash(b.answer)))errors.push(n+'번 빈칸 정답 "'+b.answer+'"이(가) 지문에 그대로 나오지 않아요.');
    if(glossary.some(g=>same(g.term,b.answer)))errors.push(n+'번 빈칸 정답이 용어 풀이 낱말과 같아요. 용어 풀이만 보고 풀 수 있어요.');
    if(!pOk(b.evidence))errors.push(n+'번 빈칸의 근거 문단 번호가 올바르지 않아요.');
  });
  if(!sheet.final_quiz.text)errors.push('4번 문제가 없어요.');
  if(choices.length!==4||choices.some(c=>!c)||new Set(choices.map(squash)).size!==4)errors.push('4번 보기는 서로 다른 4개여야 해요.');
  if(sheet.final_quiz.answer<0)errors.push('4번 정답 번호가 없어요.');
  if(!pOk(sheet.final_quiz.evidence))errors.push('4번의 근거 문단 번호가 올바르지 않아요.');
  const len=paragraphs.join(' ').length;   // 프롬프트와 같은 기준: 띄어쓰기 포함
  const grade=clampInt(opts.grade,3,6,5);
  const [lo,hi]=grade<=4?[350,600]:[480,820];
  if(paragraphs.length&&(len<lo||len>hi))warnings.push('지문 길이가 '+len+'자예요. '+grade+'학년은 '+lo+'~'+hi+'자 정도가 알맞아요.');
  if(paragraphs.some(p=>/\*\*|<[a-z]/i.test(p)))warnings.push('지문에 강조 표시가 남아 있어요.');
  return {ok:!errors.length,errors,warnings,sheet};
}
/* 보기 순서는 날짜로 정해 섞는다 — AI 가 정답을 한 번호에 몰아도 학생 화면에서는 고르게 퍼진다 */
function placeAnswer(sheet,seed){
  const q=sheet.final_quiz;
  if(!q||q.choices.length!==4||q.answer<0)return sheet;
  let h=0;for(const ch of String(seed))h=(h*31+ch.charCodeAt(0))>>>0;
  const target=h%4;
  const correct=q.choices[q.answer];
  const others=q.choices.filter((_,i)=>i!==q.answer);
  const choices=others.slice();choices.splice(target,0,correct);
  return {...sheet,final_quiz:{...q,choices,answer:target}};
}

/* ── 채점 ── answers: {blanks:[문자열×3], choice:0~3} */
function grade(sheet,answers){
  const blanks=blanksOf(sheet);
  const a=answers||{};
  const items=blanks.map((b,i)=>({n:i+1,ok:same((a.blanks||[])[i],b.answer),evidence:b.evidence}));
  const choice=Number.isInteger(a.choice)?a.choice:-1;
  items.push({n:4,ok:choice===sheet.final_quiz.answer,evidence:sheet.final_quiz.evidence,empty:choice<0});
  const score=items.filter(x=>x.ok).length;
  return {items,score,total:items.length,allRight:score===items.length,wrong:items.filter(x=>!x.ok)};
}

/* ── 프롬프트 ── */
function gradeGuide(grade){
  return grade<=4
    ? {chars:'400~550자',paras:'4문단, 문단마다 2~3문장',sentence:'한 문장은 35자 안팎'}
    : {chars:'550~750자',paras:'4~5문단, 문단마다 3~4문장',sentence:'한 문장은 40자 안팎'};
}
function buildTopicPrompt({grade,slots,used}){
  const g=clampInt(grade,3,6,5);
  return `# 역할
너는 한국 초등학교 ${g}학년 담임 교사를 돕는 비문학 독서 교육 전문가다.
우리 반은 정해진 날짜에 '오늘의 지문'(비문학 지문 한 편 + 구조도 빈칸 문제)을 읽는다.
아래 회차마다 지문 주제를 하나씩 정해 줘.

# 회차 (날짜 · 요일 · 분야)
${slots.map(s=>`- ${s.date} (${s.dow}) · ${s.subject}`).join('\n')}

# 주제 고르는 기준
1. 분야를 반드시 지킨다. (사회·역사·생활·과학·환경)
2. ${g}학년 학생이 사회·과학 시간에 배우거나 생활에서 궁금해할 만한 내용을 고른다.
3. 날짜와 가까운 기념일·계절·학교 행사가 있으면 연결한다. (예: 10월 9일 한글날 앞 회차 → 한글의 원리)
4. 한 편(${gradeGuide(g).chars})으로 설명할 수 있을 만큼 좁고 구체적인 주제로 쓴다. ('환경' X → '플라스틱이 바다에서 사라지지 않는 까닭' O)
5. 교과서 수준에서 사실이 확실한 주제만 고른다. 논쟁이 크거나 정치적으로 치우친 주제, 무섭거나 자극적인 주제는 피한다.
6. 회차끼리 주제가 겹치지 않게 한다.
${used&&used.length?`7. 이미 다룬 주제와 겹치지 않게 한다: ${used.slice(-60).join(', ')}`:''}

# 출력 (JSON만, 설명 없이)
{"topics":[{"date":"YYYY-MM-DD","topic":"주제 (25자 이내, 질문형이나 명사형)"}]}`;
}
function buildSheetPrompt({grade,subject,topic,date,usedWords}){
  const g=clampInt(grade,3,6,5),gg=gradeGuide(g);
  return `# 역할
너는 한국 초등학교 국어 교육 전문가이자 비문학 지문 집필자다.
${g}학년 학생이 하루 한 편 읽고 구조도 빈칸을 채우는 '오늘의 지문'을 만든다.

# 입력
- 학년: ${g}학년
- 분야: ${subject}
- 주제: ${topic}
- 날짜: ${date}

# 지문 작성 규칙
1. 길이: ${gg.paras}, 전체 ${gg.chars}. ${gg.sentence}.
2. 문체: 친구에게 설명하듯 친근한 반말("~야", "~어", "~지", "~거야"). 질문으로 시작해도 좋다.
3. 구조: 도입(생활 속 장면이나 질문) → 개념 설명 → 사례나 까닭 → 의미나 정리.
4. 사실 정확성: 교과서 수준에서 확실한 내용만 쓴다. 출처를 밝힐 수 없는 통계·비율·순위는 쓰지 않고 "많은", "점점 늘어나는"처럼 쓴다. 연도는 널리 알려진 것만 쓴다.
5. 강조 금지: 지문 안에 굵은 글씨, 색, 따옴표 강조, 기호 표시를 하지 않는다. 핵심어를 따로 표시하지 않는다.
6. 학생 본인의 아픈 경험이나 개인 정보를 묻는 내용, 특정 인물·집단을 비하하는 내용, 정치적으로 치우친 내용은 쓰지 않는다.

# 용어 풀이 (glossary)
- 지문에 나온 낱말 중 ${g}학년에게 조금 어려운 낱말 2개와 그 뜻(30자 안팎).

# 한눈에 정리 (map) — 이것이 1~3번 문제가 된다
- center: 글 전체의 핵심 개념 (10자 이내).
- branches: 가지 3~4개. 각 가지는
  · label: 가지 이름 2~6자 (예: 뜻, 만든 까닭, 구하는 법, 단위, 결과)
  · text: 그 가지 내용을 한 줄(35자 이내)로 요약. 지문 문장을 그대로 옮기지 말고 짧게 줄여 쓴다.
  · sub: (선택) 예시나 덧붙임 한 줄. 없으면 "".
  · evidence: 이 가지 내용의 근거 문단 번호 (1부터).
- 빈칸: 서로 다른 가지 3개의 text 안에 {{정답}} 을 하나씩, 모두 정확히 3개 넣는다.
  · 정답은 지문에 글자 그대로 나오는 1~6글자 한글 낱말(주로 명사)이다.
  · 초성만 보고도 답이 하나로 정해져야 한다. 같은 초성의 다른 낱말이 답이 될 수 없게 고른다.
  · 용어 풀이에 쓴 낱말은 정답으로 쓰지 않는다.
  · 한 문단만 읽고 세 빈칸을 다 채울 수 없게, 서로 다른 문단에서 고른다.
${usedWords&&usedWords.length?`  · 최근에 정답으로 쓴 낱말은 피한다: ${usedWords.slice(-40).join(', ')}`:''}

# 4번 문제 (final_quiz)
- 4지선다. 지문에 직접 나오지 않는 새 상황이나 사례를 주고, 글에서 배운 원리·개념을 적용해야 풀 수 있게 만든다.
  (예: 자음이 발음 기관을 본떴다는 글 → "'ㅁ'은 무엇의 모양을 본떴을까?")
- 보기에 지문 문장을 그대로 쓰지 않는다. 오답은 지문 낱말을 섞어 그럴듯하지만, 글을 제대로 읽으면 분명히 틀린 것이어야 한다.
- 정답은 하나뿐이어야 한다. answer 는 정답 보기 번호(1~4).
- evidence: 풀 때 근거가 되는 문단 번호. explain: 교사용 한 줄 해설.

# 서술형 예시 (essay_suggestion)
- 선생님이 원할 때만 쓰는 서술형 문항 예시 1개. 글에 직접 쓰이지 않았지만 근거를 들어 짐작하거나, 배운 내용을 생활에 적용하게 한다. 학생 본인의 피해 경험을 쓰게 하지 않는다.

# 자기 검수 (출력 전에 확인)
- 빈칸 정답 3개가 모두 지문에 글자 그대로 있는가? 서로 다른 가지·문단인가?
- 4번 정답이 하나로 정해지고, 지문만 읽으면 풀 수 있는가?
- 지문에 강조 표시나 출처 없는 통계가 없는가?

# 출력 (JSON만, 설명이나 코드블록 없이)
{"title":"제목 (20자 이내)","paragraphs":["1문단","2문단","..."],
 "glossary":[{"term":"낱말","meaning":"뜻"}],
 "map":{"center":"핵심 개념","branches":[{"label":"가지 이름","text":"요약 {{정답}} 요약","sub":"","evidence":1}]},
 "final_quiz":{"text":"문제","choices":["보기1","보기2","보기3","보기4"],"answer":1,"evidence":3,"explain":"해설"},
 "essay_suggestion":"서술형 문항 예시"}`;
}
/* AI 응답 → 검증 가능한 형태 (정답 번호 1~4 → 0~3, 보기 위치 섞기) */
function fromAi(raw,{grade,seed}={}){
  const r=(raw&&typeof raw==='object')?raw:{};
  const q=(r.final_quiz&&typeof r.final_quiz==='object')?r.final_quiz:{};
  const ans=Number(q.answer);
  const fixed={...r,final_quiz:{...q,answer:Number.isInteger(ans)?ans-1:-1}};
  const v=validate(fixed,{grade});
  return {...v,sheet:v.ok?placeAnswer(v.sheet,seed||''):v.sheet,essaySuggestion:str(r.essay_suggestion,200)};
}

/* ── 화면 ── 학생 앱과 교사 미리보기가 같은 모양을 쓴다 */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const CSS=`
.lit{--lit-ac:#0ea5a4;--lit-acl:#e6faf8;--lit-line:#94d8d4;--lit-bd:#e8ebf3;--lit-sub:#6b7280;--lit-hint:#9aa3b2;--lit-ok:#16a34a;--lit-okl:#f0fdf4;--lit-no:#dc2626;--lit-nol:#fef2f2;--lit-hl:#fff3c4;color:#1a1a2e;font-family:inherit;}
.lit *{box-sizing:border-box;}
.lit-card{background:#fff;border-radius:18px;box-shadow:0 4px 20px rgba(30,41,59,.07);overflow:hidden;margin-bottom:14px;}
.lit-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--lit-bd);font-size:13px;color:var(--lit-sub);}
.lit-round{background:var(--lit-ac);color:#fff;font-weight:900;border-radius:9px;padding:3px 9px;font-size:14px;}
.lit-subj{margin-left:auto;background:var(--lit-acl);color:var(--lit-ac);font-weight:800;font-size:12px;padding:3px 10px;border-radius:99px;}
.lit-body{display:grid;grid-template-columns:210px 1fr;}
.lit-side{background:var(--lit-acl);padding:20px 16px;display:flex;flex-direction:column;gap:14px;}
.lit-title{font-size:25px;font-weight:900;line-height:1.3;word-break:keep-all;margin:0;}
.lit-gloss{margin-top:auto;font-size:12.5px;line-height:1.6;color:#334155;}
.lit-gloss div+div{margin-top:6px;}
.lit-gloss b{color:var(--lit-ac);}
.lit-text{padding:18px 20px 14px 26px;font-size:16px;line-height:1.9;word-break:keep-all;}
.lit-text p{margin:0;text-indent:.6em;padding:4px 8px;border-radius:10px;position:relative;transition:background .3s;}
.lit-text p+p{margin-top:6px;}
.lit-pn{position:absolute;left:-16px;top:7px;font-size:11px;color:var(--lit-hint);text-indent:0;font-weight:700;}
.lit-text p.lit-hl{background:var(--lit-hl);box-shadow:0 0 0 2px #fcd34d inset;}
.lit-sec{padding:16px;}
.lit-sec-t{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;margin-bottom:12px;}
.lit-tag{background:#1a1a2e;color:#fff;font-size:11px;padding:3px 9px;border-radius:99px;}
.lit-sec-t .lit-q{margin-left:auto;font-size:12px;color:var(--lit-sub);font-weight:600;}
.lit-map{display:grid;grid-template-columns:auto 1fr;align-items:center;}
.lit-center{background:var(--lit-ac);color:#fff;font-weight:900;font-size:17px;border-radius:50%;width:104px;height:104px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.25;padding:8px;word-break:keep-all;}
.lit-brs{position:relative;padding-left:30px;display:flex;flex-direction:column;gap:10px;}
.lit-brs::before{content:"";position:absolute;left:0;top:26px;bottom:26px;border-left:2px solid var(--lit-line);}
.lit-br{position:relative;display:flex;align-items:center;gap:10px;}
.lit-br::before{content:"";position:absolute;left:-30px;width:30px;top:50%;border-top:2px solid var(--lit-line);}
.lit-br-l{flex:0 0 88px;text-align:center;border:2px solid var(--lit-ac);color:var(--lit-ac);font-weight:800;font-size:13px;border-radius:10px;padding:7px 4px;background:#fff;word-break:keep-all;}
.lit-br-t{flex:1;border:1.5px solid var(--lit-bd);border-radius:12px;padding:9px 12px;font-size:15px;line-height:2.1;background:#fafbff;word-break:keep-all;}
.lit-br-s{display:block;font-size:12px;color:var(--lit-sub);line-height:1.5;margin-top:2px;}
.lit-blank{display:inline-flex;flex-direction:column;vertical-align:middle;margin:0 3px;}
.lit-cho{display:flex;gap:3px;justify-content:center;margin-bottom:2px;}
.lit-cho span{font-size:11px;font-weight:800;color:var(--lit-ac);background:var(--lit-acl);border-radius:5px;padding:0 5px;line-height:18px;}
.lit-cho span.gap{background:none;width:4px;padding:0;}
.lit-blank input,.lit-blank .lit-ans{font:inherit;font-weight:700;font-size:15px;text-align:center;border:none;border-bottom:2.5px solid var(--lit-ac);background:#fff;border-radius:6px 6px 0 0;padding:2px 4px;outline:none;color:inherit;}
.lit-blank input:focus{background:#eef4ff;}
.lit-blank.ok input,.lit-blank.ok .lit-ans{border-color:var(--lit-ok);background:var(--lit-okl);color:#15803d;}
.lit-blank.no input{border-color:var(--lit-no);background:var(--lit-nol);color:#b91c1c;}
.lit-quiz{font-size:15px;font-weight:700;line-height:1.6;margin-bottom:10px;word-break:keep-all;}
.lit-num{display:inline-block;background:#4f8ef7;color:#fff;border-radius:7px;font-size:12px;padding:1px 7px;margin-right:6px;}
.lit-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.lit-choice{border:1.5px solid var(--lit-bd);background:#fafbff;border-radius:12px;padding:11px 12px;font:inherit;font-size:14px;text-align:left;cursor:pointer;color:inherit;word-break:keep-all;}
.lit-choice.sel{border-color:#4f8ef7;background:#eef4ff;font-weight:700;}
.lit-choice.ok{border-color:var(--lit-ok);background:var(--lit-okl);}
.lit-choice.no{border-color:var(--lit-no);background:var(--lit-nol);}
.lit-choice:disabled{cursor:default;}
.lit-fb{display:flex;flex-direction:column;gap:6px;margin:4px 0 10px;}
.lit-fb button{font:inherit;font-size:13px;text-align:left;padding:8px 12px;border-radius:10px;cursor:pointer;background:var(--lit-nol);color:#b91c1c;border:none;}
.lit-btn{width:100%;font:inherit;font-weight:800;font-size:16px;border:none;border-radius:14px;padding:14px;cursor:pointer;background:linear-gradient(135deg,#4f8ef7,#7c3aed);color:#fff;}
.lit-btn:disabled{opacity:.55;cursor:default;}
.lit-btn.ghost{background:#fff;color:#475569;border:1.5px solid var(--lit-bd);}
.lit-essay textarea{width:100%;min-height:96px;font:inherit;font-size:15px;line-height:1.6;border:1.5px solid var(--lit-bd);border-radius:12px;padding:10px 12px;resize:vertical;}
.lit-reward{text-align:center;}
.lit-reward h3{font-size:19px;margin:0 0 4px;}
.lit-rw{display:flex;justify-content:space-between;padding:9px 14px;border-radius:12px;background:#fafbff;margin-top:6px;font-size:14px;}
.lit-rw.on{background:#fffbeb;}
.lit-rw.off{color:var(--lit-hint);}
.lit-rw.total{background:#1a1a2e;color:#fff;}
.lit-note{font-size:12.5px;color:var(--lit-sub);line-height:1.6;}
@media (max-width:680px){
  .lit-body{grid-template-columns:1fr;}
  .lit-side{padding:16px 16px 12px;gap:10px;}
  .lit-title{font-size:22px;}
  .lit-gloss{margin-top:0;}
  .lit-text{padding:14px 14px 12px 24px;font-size:15.5px;}
  .lit-map{grid-template-columns:1fr;justify-items:start;}
  .lit-center{width:auto;height:auto;border-radius:14px;padding:9px 18px;font-size:16px;margin-bottom:10px;}
  .lit-brs{padding-left:22px;width:100%;}
  .lit-brs::before{top:-10px;}
  .lit-br::before{left:-22px;width:22px;}
  .lit-br{flex-direction:column;align-items:stretch;gap:6px;}
  .lit-br-l{flex:none;align-self:flex-start;padding:4px 12px;}
  .lit-choices{grid-template-columns:1fr;}
}`;
function injectStyles(doc){
  const d=doc||root.document;
  if(!d||d.getElementById('lit-core-css'))return;
  const el=d.createElement('style');el.id='lit-core-css';el.textContent=CSS;d.head.appendChild(el);
}
/* opts: {round, dateLabel, subject, answers:{blanks,choice}, marks:{items}, locked, reveal} */
function renderSheet(sheet,opts={}){
  const a=opts.answers||{},marks=opts.marks?Object.fromEntries(opts.marks.items.map(x=>[x.n,x.ok])):{};
  let bi=0;
  const brs=sheet.map.branches.map(b=>{
    const t=esc(b.text).replace(/\{\{([^{}]+?)\}\}/g,(_,ansRaw)=>{
      const i=bi++,ans=ansRaw.trim();
      const cho=choseong(ans).map(c=>c===' '?'<span class="gap"></span>':'<span>'+esc(c)+'</span>').join('');
      const w=Math.max(3.2,ans.length*1.25+1.2);
      const st=marks[i+1]===true?' ok':marks[i+1]===false?' no':'';
      const inner=opts.reveal
        ?'<span class="lit-ans" style="min-width:'+w+'em">'+esc(ans)+'</span>'
        :'<input data-lit-blank="'+i+'" style="width:'+w+'em" value="'+esc((a.blanks||[])[i]||'')+'" aria-label="'+(i+1)+'번 빈칸" autocomplete="off"'+(opts.locked?' disabled':'')+'>';
      return '<span class="lit-blank'+(opts.reveal?' ok':st)+'"><span class="lit-cho">'+cho+'</span>'+inner+'</span>';
    });
    return '<div class="lit-br"><div class="lit-br-l">'+esc(b.label)+'</div><div class="lit-br-t">'+t+(b.sub?'<span class="lit-br-s">'+esc(b.sub)+'</span>':'')+'</div></div>';
  }).join('');
  const q=sheet.final_quiz;
  const pick=Number.isInteger(a.choice)?a.choice:-1;
  const qMark=marks[4];
  const choices=q.choices.map((c,i)=>{
    let cls='lit-choice';
    if(opts.reveal&&i===q.answer)cls+=' ok';
    else if(i===pick)cls+=qMark===true?' ok':qMark===false?' no':' sel';
    return '<button type="button" class="'+cls+'" data-lit-choice="'+i+'"'+(opts.locked||opts.reveal?' disabled':'')+'>'+'①②③④'[i]+' '+esc(c)+'</button>';
  }).join('');
  return '<div class="lit">'
    +'<div class="lit-card"><div class="lit-head">'+(opts.round?'<span class="lit-round">'+esc(opts.round)+'</span>':'')+'<span>'+esc(opts.dateLabel||'')+'</span><span class="lit-subj">'+esc(opts.subject||'')+'</span></div>'
    +'<div class="lit-body"><div class="lit-side"><h2 class="lit-title">'+esc(sheet.title)+'</h2>'
    +'<div class="lit-gloss">'+sheet.glossary.map(g=>'<div><b>'+esc(g.term)+'</b>: '+esc(g.meaning)+'</div>').join('')+'</div></div>'
    +'<div class="lit-text">'+sheet.paragraphs.map((p,i)=>'<p data-lit-p="'+(i+1)+'"><span class="lit-pn">'+(i+1)+'</span>'+esc(p)+'</p>').join('')+'</div></div></div>'
    +'<div class="lit-card lit-sec"><div class="lit-sec-t"><span class="lit-tag">한눈에 정리</span>초성을 보고 빈칸을 채워 봐<span class="lit-q">1~3번</span></div>'
    +'<div class="lit-map"><div class="lit-center">'+esc(sheet.map.center)+'</div><div class="lit-brs">'+brs+'</div></div></div>'
    +'<div class="lit-card lit-sec"><div class="lit-sec-t"><span class="lit-tag">생각 넓히기</span>글에서 배운 내용을 써 봐<span class="lit-q">4번</span></div>'
    +'<div class="lit-quiz"><span class="lit-num">4</span>'+esc(q.text)+'</div><div class="lit-choices">'+choices+'</div>'
    +(opts.reveal&&q.explain?'<div class="lit-note" style="margin-top:8px;">해설: '+esc(q.explain)+'</div>':'')
    +'</div></div>';
}

const API={SUBJECTS,DOW,normalizeCfg,choseong,same,squash,ymd,addDays,dowName,windowOf,stateOn,upcomingDates,suggestSubjects,reward,
  blanksOf,validate,placeAnswer,grade,buildTopicPrompt,buildSheetPrompt,fromAi,injectStyles,renderSheet,esc};
if(typeof module==='object'&&module.exports)module.exports=API;
root.LiteracyCore=API;
})(typeof window!=='undefined'?window:globalThis);
