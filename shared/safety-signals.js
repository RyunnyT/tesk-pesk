/* 학생이 직접 쓴 글(글쓰기·상담 신청·서술형 답)에서 걱정되는 표현을 찾아 교사에게 알린다.
   - 판정이 아니라 "선생님이 오늘 직접 확인해 주세요"라는 알림이다. AI를 쓰지 않는다.
   - 놓치지 않는 쪽을 우선한다. 교사가 [확인했어요]로 닫을 수 있다.
   - 교사의 관찰 기록(3인칭)은 shared/observation-core.js 의 FLAGS 가 따로 본다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SafetySignals=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const ADULT='(?:엄마|아빠|어머니|아버지|어머님|아버님|부모님|새엄마|새아빠|형|오빠|누나|언니|삼촌|이모|고모|할머니|할아버지|어른|아저씨|아줌마)';
/* 과장 표현("웃겨 죽겠다", "죽을 뻔")은 먼저 지우고 찾는다 */
const NOISE=[
  /(?:웃겨|배고파|배불러|졸려|더워|추워|심심해|귀여워|맛있어|좋아|행복해|부러워|궁금해|힘들어|피곤해|지루해|무서워|떨려|설레|웃기)\s*죽(?:겠|을|는|어|다)/g,
  /죽을\s*(?:뻔|만큼\s*(?:재미|맛|좋|웃|행복))/g,
  /죽을\s*힘을\s*다/g,
  /(?:게임|캐릭터|몬스터|좀비|만화|영화|책|이야기|동화)\s*(?:에서|속|속에서|의)?[^.!?\n]{0,15}죽/g
];
const GAME=/게임|캐릭터|몬스터|만화|영화|역할\s*놀이|놀이에서|레슬링|태권도|운동|공에|피구|축구|야구|농구|넘어져/;
const RULES=[
  {key:'self-harm',label:'자기를 해치거나 사라지고 싶다는 표현',
   action:'오늘 안에 직접 만나 이야기를 들어 주세요. 상담교사·Wee클래스·관리자와 바로 상의하고, 긴급하면 학교 위기 대응 절차를 따르세요.',
   re:/죽고\s*싶|죽어\s*버리|죽어\s*버릴|죽었으면\s*좋겠|사라지고\s*싶|사라졌으면|없어지고\s*싶|없어졌으면|살기\s*싫|살고\s*싶지\s*않|태어나지\s*말|자해|손목을?\s*(?:긋|그었|그어)|나\s*(?:따위|같은\s*건)\s*(?:없어|필요\s*없)|뛰어내리고\s*싶/},
  {key:'violence-received',label:'어른에게 맞거나 다쳤다는 표현',
   action:'오늘 안에 학생과 따로 이야기해 주세요. 아동학대가 의심되면 학교 신고 절차(관리자 보고·112 신고)를 확인하세요.',
   re:new RegExp(ADULT+'[^.!?\\n]{0,20}(?:때려|때렸|때린|때리|맞았|맞아|발로\\s*(?:차|찼)|던졌|밀쳤|머리를\\s*(?:때|쳤)|목을\\s*(?:졸|조르))|맞아서[^.!?\\n]{0,8}(?:멍|아파|피가|다쳤)|멍이\\s*들었'),
   skip:GAME},
  {key:'bullying',label:'따돌림·괴롭힘을 겪는다는 표현',
   action:'학생 이야기를 먼저 듣고, 학교폭력 사안 처리 절차가 필요한지 확인하세요.',
   re:/따돌|왕따|괴롭(?:혀|힘|히|혔|혀요)|돈을?\s*(?:뺏|빼앗|달라고)|협박|무서워서\s*학교|학교\s*가기\s*무서|아무도\s*(?:나랑|저랑|같이)\s*안\s*놀|아무도\s*(?:나랑|저랑)\s*말을?\s*안|다들\s*(?:나를|저를)\s*(?:무시|싫어)/},
  {key:'neglect',label:'돌봄을 받지 못한다는 표현',
   action:'학생의 식사·생활을 살펴보고, 필요하면 교육복지사·관리자와 상의하세요.',
   re:/(?:매일|맨날|계속|며칠\s*(?:째|동안))[^.!?\n]{0,12}밥을?\s*(?:못|안)\s*먹|밥을?\s*(?:못|안)\s*먹[^.!?\n]{0,12}(?:매일|맨날|계속|며칠)|집에\s*(?:아무도\s*없|혼자)[^.!?\n]{0,15}(?:매일|맨날|며칠|밤에|무서)|밤에\s*혼자\s*(?:자|잠)/},
  {key:'touch',label:'원치 않는 신체 접촉에 대한 표현',
   action:'학생 이야기를 판단 없이 듣고, 성 관련 사안 처리 절차를 확인하세요. 자세한 내용을 캐묻지 마세요.',
   re:/(?:몸|가슴|엉덩이|다리|허벅지|속옷)[^.!?\n]{0,10}만(?:졌|져|지(?:고|려|는))|(?:옷|바지|치마)를?\s*(?:벗기|들추)|비밀로\s*하(?:라|자)고/}
];
function clean(text){let t=String(text||'');for(const re of NOISE)t=t.replace(re,' ');return t;}
function sentenceAround(text,index){
  const t=String(text||''),a=Math.max(t.lastIndexOf('.',index),t.lastIndexOf('!',index),t.lastIndexOf('?',index),t.lastIndexOf('\n',index))+1;
  const ends=['.','!','?','\n'].map(c=>t.indexOf(c,index)).filter(i=>i>=0);
  return t.slice(a,ends.length?Math.min(...ends):t.length);
}
/* → [{key,label,action,match}] */
function scan(text){
  const t=clean(text),out=[];
  for(const r of RULES){
    const m=r.re.exec(t);
    if(!m)continue;
    if(r.skip&&r.skip.test(sentenceAround(t,m.index)))continue;
    out.push({key:r.key,label:r.label,action:r.action,match:m[0].trim()});
  }
  return out;
}
const sigOf=(id,signals)=>id+'|'+signals.map(s=>s.key+':'+s.match).sort().join(',');
/* 교사 화면에 띄울 목록: 확인했어요(acks)를 누른 것은 뺀다. 글이 바뀌어 새 표현이 나오면 다시 뜬다.
   writings: [{id,studentName,date,title,content,deleted}], requests: [{id,studentName,date,reason,status}], acks: [{sig}] */
function collect({writings=[],requests=[],extra=[],acks=[]}={}){
  const done=new Set((acks||[]).map(a=>a&&a.sig).filter(Boolean)),out=[];
  for(const w of writings||[]){if(!w||w.deleted)continue;const s=scan((w.title||'')+'\n'+(w.content||''));if(s.length)out.push({kind:'writing',id:w.id,studentNum:w.studentNum,studentName:w.studentName||'',date:w.date||String(w.submittedAt||'').slice(0,10),signals:s,sig:sigOf('w:'+w.id,s)});}
  for(const r of requests||[]){if(!r||r.status==='deleted')continue;const s=scan(r.reason||r.message||'');if(s.length)out.push({kind:'request',id:r.id,studentNum:r.studentNum,studentName:r.studentName||'',date:r.date||'',signals:s,sig:sigOf('r:'+r.id,s)});}
  for(const x of extra||[]){const s=scan(x.text);if(s.length)out.push({kind:x.kind||'other',id:x.id,studentNum:x.studentNum,studentName:x.studentName||'',date:x.date||'',signals:s,sig:sigOf((x.kind||'o')+':'+x.id,s)});}
  return out.filter(x=>!done.has(x.sig));
}
/* 상담 신청 긴급도: 새 기록은 urgency 숫자, 예전 기록은 사유 끝의 [조금 급해요]/[많이 급해요] */
function urgencyOf(r){
  const n=Number(r&&r.urgency);if(Number.isInteger(n)&&n>=0&&n<=2)return n;
  const t=String(r&&(r.reason||r.message)||'');
  return /\[많이 급해요\]\s*$/.test(t)?2:/\[조금 급해요\]\s*$/.test(t)?1:0;
}
return {version,RULES,scan,collect,urgencyOf,sigOf};
});
