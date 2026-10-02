/* 초등 생활기록부 영역 정의와 문장 점검: 학년군별 교과, 기재요령상 적을 수 없는 내용, 학생 간 반복 문장,
   AI 전송 전 이름 가리기, 누가 기록 영역 추천을 로컬 규칙으로 처리합니다. AI를 쓰지 않습니다. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.RecordCheck=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';

 // 학년도: 3월에 시작해 이듬해 2월에 끝납니다.
 function schoolYear(date){
  const d=date instanceof Date?date:new Date(date||Date.now());
  return d.getMonth()+1>=3?d.getFullYear():d.getFullYear()-1;
 }

 // ── 학년군별 기재 영역 (2022 개정 교육과정) ──
 // 한도는 NEIS byte 기준(한글=3byte). limitChars는 한글만 쓸 때의 글자 수입니다.
 const SUBJ='교과학습발달상황 (세부능력 및 특기사항)';
 const AREAS={
  cea_auto_club:{group:'creative',groupLabel:'창의적 체험활동상황',label:'자율·자치 + 동아리 활동 특기사항 (통합)',short:'자율·동아리',note:'자율·자치+동아리',limitChars:500,limitBytes:1500,full:true,
   placeholder:'자율·자치활동과 동아리활동의 특기사항을 통합하여 작성합니다.\n예) 학급 자치회의에서 발의한 안건이 채택되어 학급 규칙을 개선하는 데 기여함. 코딩 동아리에서 ...'},
  cea_career:{group:'creative',groupLabel:'창의적 체험활동상황',label:'진로활동 특기사항',short:'진로',note:'진로활동',limitChars:700,limitBytes:2100,full:true,
   placeholder:'진로 탐색·체험·계획 관련 활동을 작성합니다.\n예) 직업체험학습에서 다양한 직업의 가치를 탐색하고 자신의 진로를 ...'},
  subj_korean:{label:'국어',placeholder:'국어 교과의 성취기준 도달도, 학습 참여 태도, 변화·성장 정도를 기재합니다.'},
  subj_social:{label:'사회'},
  subj_moral:{label:'도덕'},
  subj_math:{label:'수학'},
  subj_science:{label:'과학'},
  subj_practical:{label:'실과'},
  subj_pe:{label:'체육'},
  subj_music:{label:'음악'},
  subj_art:{label:'미술'},
  subj_english:{label:'영어'},
  subj_integ_right:{label:'바른 생활',short:'바른생활'},
  subj_integ_wise:{label:'슬기로운 생활',short:'슬기로운'},
  subj_integ_joy:{label:'즐거운 생활',short:'즐거운'},
  subj_autonomy:{label:'학교자율시간',short:'자율시간'},
  comprehensive:{group:'overall',groupLabel:'행동특성 및 종합의견',label:'행동특성 및 종합의견',short:'행발',note:'행동특성/종합의견',limitChars:500,limitBytes:1500,full:true,
   placeholder:'학생의 인성·태도·사회성·자기주도성 등을 누가관찰 기록을 토대로 종합하여 작성합니다.\n예) 친구의 의견을 경청하고 자신의 생각을 논리적으로 전달하는 의사소통 능력이 뛰어남. ...'},
 };
 const BANDS={
  '1-2':{label:'1~2학년',subjects:['subj_korean','subj_math','subj_integ_right','subj_integ_wise','subj_integ_joy']},
  '3-4':{label:'3~4학년',subjects:['subj_korean','subj_social','subj_moral','subj_math','subj_science','subj_pe','subj_music','subj_art','subj_english','subj_autonomy']},
  '5-6':{label:'5~6학년',subjects:['subj_korean','subj_social','subj_moral','subj_math','subj_science','subj_practical','subj_pe','subj_music','subj_art','subj_english','subj_autonomy']},
 };
 function gradeBand(grade){
  const g=Number(grade);
  return g===1||g===2?'1-2':g===3||g===4?'3-4':'5-6';
 }
 // 학급 이름("4학년 2반")에서 학년을 읽습니다. 못 읽으면 null.
 function gradeFromClassName(name){
  const m=String(name||'').match(/([1-6])\s*학년/);
  return m?Number(m[1]):null;
 }
 function recordFields(band){
  const b=BANDS[band]?band:'5-6';
  const keys=['cea_auto_club','cea_career',...BANDS[b].subjects,'comprehensive'];
  return keys.map(key=>{
   const a=AREAS[key];
   return {group:a.group||'subject',groupLabel:a.groupLabel||SUBJ,key,label:a.label,short:a.short||a.label,note:a.note||a.label,
    limitChars:a.limitChars||500,limitBytes:a.limitBytes||1500,full:!!a.full,...(a.placeholder?{placeholder:a.placeholder}:{})};
  });
 }

 // ── 학생 간 반복 문장 ──
 // 다른 학생 기록에 같은 문장이 있으면 알려 줍니다. 공백·문장부호 차이는 무시하고 12자 이상 문장만 봅니다.
 const MIN_SENTENCE=12;
 function sentences(text){
  return String(text||'').split(/(?<=[.!?。])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 }
 function normSentence(s){ return String(s||'').replace(/[\s.,!?·'"“”‘’()~\-]/g,''); }
 function buildSentenceIndex(entries){
  const index=new Map();
  (entries||[]).forEach(({num,key,text})=>sentences(text).forEach(s=>{
   const n=normSentence(s);
   if(n.length<MIN_SENTENCE)return;
   if(!index.has(n))index.set(n,[]);
   index.get(n).push({num:String(num),key});
  }));
  return index;
 }
 // 이 학생(num)의 문장 중 다른 학생에게도 있는 것: [{sentence, nums}]
 function findRepeats(text,num,index){
  const out=[],seen=new Set();
  sentences(text).forEach(s=>{
   const n=normSentence(s);
   if(n.length<MIN_SENTENCE||seen.has(n))return;
   seen.add(n);
   const others=[...new Set((index.get(n)||[]).map(e=>e.num).filter(x=>x!==String(num)))];
   if(others.length)out.push({sentence:s,nums:others});
  });
  return out;
 }

 // ── AI 전송 전 이름 가리기 ──
 // 성+이름 전체와, 이름 뒤에 호칭·조사가 붙은 형태("하늘이는", "하늘아")를 ○○로 바꿉니다.
 const MASK='○○';
 function maskName(text,name){
  let t=String(text??'');
  const n=String(name||'').trim();
  if(n.length<2)return t;
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  t=t.split(n).join(MASK);
  const given=n.length>=3?n.slice(1):'';
  if(given)t=t.replace(new RegExp(esc(given)+'(?=(이는|이가|이를|이의|이도|이와|이랑|이한테|이에게|이네|이도|아|야|는|가|를|의|도|와|랑|한테|에게|씨)(?![가-힣]))','g'),MASK);
  return t;
 }

 // ── 누가 기록 영역 추천 ──
 const AREA_KEYWORDS={
  cea_auto_club:['자치','학급회의','학급 회의','회의','동아리','임원','회장','반장','1인 1역','1인1역','봉사','캠페인','학급 행사'],
  cea_career:['진로','직업','장래','꿈','직업체험','롤모델'],
  subj_korean:['국어','토론','발표','글쓰기','독서','읽기','받아쓰기','낭독','시 쓰기','일기','맞춤법','이야기','독후감','토의'],
  subj_social:['사회','지도','역사','지역','문화재','민주','인권','촌락','도시','경제 활동','옛날'],
  subj_moral:['도덕','예절','정직','존중','인성'],
  subj_math:['수학','분수','소수','곱셈','나눗셈','덧셈','뺄셈','도형','측정','그래프','연산','계산','넓이','비율','구구단','시계'],
  subj_science:['과학','실험','탐구','식물','동물','전기','자석','날씨','화산','태양','현미경','관찰 일지'],
  subj_practical:['실과','요리','바느질','코딩','소프트웨어','목공','가꾸기','생활 도구'],
  subj_pe:['체육','달리기','줄넘기','피구','축구','농구','수영','운동','체조','경기','뜀틀','스포츠'],
  subj_music:['음악','리코더','노래','합창','악기','연주','리듬','가창','단소','우쿨렐레','계이름'],
  subj_art:['미술','그림','그리기','만들기','색칠','조소','판화','디자인','작품','감상'],
  subj_english:['영어','알파벳','English','파닉스','영어 노래'],
  subj_integ_right:['바른 생활','바른생활','습관','안전','정리정돈','정리 정돈','약속','인사'],
  subj_integ_wise:['슬기로운 생활','슬기로운생활','탐색','관찰','우리 동네','계절','봄','여름','가을','겨울'],
  subj_integ_joy:['즐거운 생활','즐거운생활','놀이','노래','그리기','만들기','표현','율동'],
  subj_autonomy:['학교자율시간','자율시간'],
  comprehensive:['친구','배려','도움','도와','책임','성실','협력','갈등','사과','양보','경청','칭찬','인내'],
 };
 function suggestAreas(text,allowedKeys){
  const t=String(text||'');
  if(!t.trim())return [];
  const allowed=new Set(allowedKeys||Object.keys(AREA_KEYWORDS));
  return Object.keys(AREA_KEYWORDS).filter(k=>allowed.has(k)&&AREA_KEYWORDS[k].some(w=>t.includes(w)));
 }

 // level: error = 기재 금지 사항, warn = 확인이 필요한 표현
 const RULES=[
  {code:'award',level:'error',label:'수상 실적',hint:'초등 학생부에는 수상 실적을 적지 않아요.',
   re:/(최우수상|우수상|장려상|입상|수상|표창|(대상|금상|은상|동상)을?\s*(받|차지))/},
  {code:'outside-contest',level:'error',label:'교외 대회',hint:'교외 대회 참여와 결과는 적을 수 없어요.',
   re:/교외[^.\n]{0,15}(대회|경시|경진|공모전)/},
  {code:'contest',level:'warn',label:'대회 언급',hint:'교외 대회라면 적을 수 없어요. 교내 활동이면 과정 중심으로 써 주세요.',
   re:/(경시\s*대회|경진\s*대회|올림피아드|공모전)/},
  {code:'lang-test',level:'error',label:'공인어학시험',hint:'어학시험 응시 사실과 성적은 적을 수 없어요.',
   re:/(토익|토플|텝스|토셀|TOEIC|TOEFL|TEPS|TOSEL|HSK|JLPT|JPT|DELF|DELE)/i},
  {code:'certificate',level:'error',label:'자격·인증 시험',hint:'자격증과 인증시험 결과는 적을 수 없어요.',
   re:/(자격증|인증서|능력\s*검정|검정\s*시험|급수\s*(시험|취득)|\d+\s*급\s*(취득|합격))/},
  {code:'private-ed',level:'error',label:'사교육',hint:'학원·과외 등 사교육 내용은 적을 수 없어요.',
   re:/((?<!대)학원|과외|학습지|사교육|인강|인터넷\s*강의)/},
  {code:'after-school',level:'warn',label:'방과후학교',hint:'방과후학교 수강 내용은 적지 않아요.',
   re:/방과\s*후\s*(학교|수업|교실|강좌)/},
  {code:'publication',level:'error',label:'논문·출간·특허',hint:'논문, 도서 출간, 특허 실적은 적을 수 없어요.',
   re:/(논문|출간|출판|특허)/},
  {code:'overseas',level:'warn',label:'해외 활동',hint:'해외 연수·봉사 같은 해외 활동 실적은 적을 수 없어요.',
   re:/(어학\s*연수|해외\s*(연수|봉사|캠프|체험|활동)|유학)/},
  {code:'parent-status',level:'error',label:'부모의 사회·경제적 지위',hint:'부모 직업이나 지위를 짐작할 수 있는 내용은 적을 수 없어요.',
   re:/((아버지|어머니|아버님|어머님|부모님|엄마|아빠)[^.\n]{0,12}(직업|직장|회사|의사|변호사|교수|판사|검사|사장|대표|공무원)|(직업|직장|회사|의사|변호사|교수|판사|검사|사장|대표|공무원)[^.\n]{0,4}(아버지|어머니|아버님|어머님|부모님|엄마|아빠))/},
  {code:'institution',level:'warn',label:'특정 기관명',hint:'특정 대학·기관·상호명은 적지 않아요.',
   re:/[가-힣A-Za-z]{1,12}(대학교|대학병원|연구소|재단|학원)(?![가-힣])/},
  {code:'parent-word',level:'warn',label:'엄마·아빠',hint:'부모님, 어머님처럼 바꿔 주세요.',
   re:/(엄마|아빠)/},
  {code:'ranking',level:'warn',label:'서열 표현',hint:'등수나 순위 대신 성장과 과정을 적어 주세요.',
   re:/(\d+\s*(등|위)(?![가-힣])|반에서\s*(가장|제일)|전교\s*\d)/},
  {code:'ending',level:'warn',label:'서술형 종결',hint:'"~함", "~음"처럼 명사형으로 끝내 주세요.',
   re:/(습니다|합니다|입니다|했다|하였다|였다|이다|한다|된다|있다|없다)(?=\s*[.!?]|\s*$)/m},
  {code:'english',level:'warn',label:'영문 표기',hint:'영문은 불가피한 경우에만 써 주세요.',
   re:/[A-Za-z]{2,}/,skip:o=>o.fieldKey==='subj_english'},
  {code:'mask',level:'warn',label:'가린 이름 표시',hint:'AI에 보낼 때 가린 이름(○○)이 남아 있어요. 이름 없이 문장을 고쳐 주세요.',
   re:/○○/},
  {code:'symbol',level:'warn',label:'특수문자·기호',hint:'이모지와 마크다운 기호는 NEIS에 옮기기 전에 지워 주세요.',
   re:/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[#*`~]|^\s*[-•▶■◆]\s)/mu},
 ];

 function nameRule(name){
  const n=String(name||'').trim();
  if(n.length<2)return null;
  const given=n.length>=3?n.slice(1):'';
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const parts=[esc(n)];
  if(given)parts.push(esc(given)+'(이는|이가|이를|이의|이도|이와)');
  return {code:'student-name',level:'warn',label:'학생 이름',hint:'학생 이름이나 호칭 없이 써 주세요.',re:new RegExp('('+parts.join('|')+')')};
 }

 function lint(text,opts){
  const t=String(text||'');
  const o=opts||{};
  if(!t.trim())return [];
  const rules=RULES.slice();
  const nr=nameRule(o.studentName);
  if(nr)rules.push(nr);
  const out=[];
  for(const r of rules){
   if(r.skip&&r.skip(o))continue;
   const m=t.match(r.re);
   if(m)out.push({code:r.code,level:r.level,label:r.label,hint:r.hint,match:m[0].trim()});
  }
  return out.sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1));
 }

 return {schoolYear,lint,RULES,BANDS,gradeBand,gradeFromClassName,recordFields,
  sentences,buildSentenceIndex,findRepeats,MASK,maskName,suggestAreas};
});
