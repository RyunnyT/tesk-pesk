/* 친구 관계 정밀 분석 — 누가 누구와 어떤 관계인지, 또래 수용도(Coie-Dodge), 친한 무리, 교사 사회성 평정, 학부모 결과지 문장.
   DOM 없이 계산만 한다. rows 는 학생 번호로 정리된 응답: {studentNum, categories:{study:[번호...], ...}}.
   또래 지위 정의는 교사 화면 analyzeFriends(_classifySociometricStatus)와 같다: 긍정 지명 = 학습·놀이·지지·리더·일반 긍정, 부정 = 불편. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PeerRelations=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const POSITIVE=['study','play','support','leader','positive'];
  const CLOSE=['play','support','positive'];          // '친한 친구' 판단에 쓰는 영역
  const LABEL={study:'학습',play:'놀이',support:'마음 나눔',leader:'리더로 봄',positive:'좋아함',aspire:'가까워지고 싶음',discomfort:'불편함'};
  const MIN_REPORTERS=5;

  const num=v=>Number(v);
  const set=xs=>new Set((xs||[]).map(num).filter(n=>Number.isInteger(n)&&n>0));
  function index(rows){
    const by=new Map();
    (rows||[]).forEach(r=>{const n=num(r?.studentNum);if(!Number.isInteger(n)||n<=0)return;
      const cats={};Object.entries(r.categories||{}).forEach(([k,v])=>{const s=set(v);s.delete(n);cats[k]=s;});
      by.set(n,{num:n,cats,answered:new Set(r.categoryKeys||Object.keys(r.categories||{}))});});
    return by;
  }
  const picks=(by,from,key)=>by.get(from)?.cats[key]||new Set();
  const chose=(by,from,to,key)=>picks(by,from,key).has(to);

  /* 두 학생 사이의 관계 한 줄 */
  function pair(by,a,b){
    const out=[],inc=[];
    Object.keys(LABEL).forEach(k=>{if(chose(by,a,b,k))out.push(k);if(chose(by,b,a,k))inc.push(k);});
    if(!out.length&&!inc.length)return null;
    const both=out.filter(k=>inc.includes(k));
    // 친한 관계는 영역이 달라도 서로 고르면 인정한다 (놀이 ↔ 마음 나눔). 무리 찾기(closeGraph)와 같은 기준.
    const closeMutual=CLOSE.some(k=>out.includes(k))&&CLOSE.some(k=>inc.includes(k));
    const posOut=out.some(k=>POSITIVE.includes(k)),posIn=inc.some(k=>POSITIVE.includes(k));
    const conflictOut=out.includes('discomfort'),conflictIn=inc.includes('discomfort');
    let type,tone;
    if(conflictOut&&conflictIn){type='서로 불편한 관계';tone='conflict';}
    else if((conflictOut&&posIn)||(conflictIn&&posOut)){type='엇갈린 관계';tone='conflict';}
    else if(conflictOut){type='내가 불편해함';tone='conflict';}
    else if(conflictIn){type='상대가 불편해함';tone='conflict';}
    else if(closeMutual){type='서로 친한 친구';tone='close';}
    else if(both.includes('study')){type='서로 학습 파트너';tone='mutual';}
    else if(posOut&&posIn){type='서로 긍정적으로 봄';tone='mutual';}
    else if(posOut){type=out.includes('leader')&&out.length===1?'내가 리더로 따름':'내가 좋아함(일방)';tone='out';}
    else if(posIn){type=inc.includes('leader')&&inc.length===1?'나를 리더로 봄':'상대가 좋아함(일방)';tone='in';}
    else if(out.includes('aspire')&&inc.includes('aspire')){type='서로 가까워지고 싶어 함';tone='mutual';}
    else if(out.includes('aspire')){type='내가 가까워지고 싶어 함';tone='out';}
    else {type='상대가 가까워지고 싶어 함';tone='in';}
    const score=(closeMutual?6:0)+both.filter(k=>POSITIVE.includes(k)).length*2+out.filter(k=>POSITIVE.includes(k)).length+inc.filter(k=>POSITIVE.includes(k)).length-(conflictOut?3:0)-(conflictIn?3:0);
    return {peer:b,type,tone,out,inc,both,score};
  }

  /* 서로 친한 친구로 이어진 무리 (3명 이상 모두 서로 친한 관계 = 최대 클리크) */
  function closeGraph(by,nums){
    const g=new Map(nums.map(n=>[n,new Set()]));
    nums.forEach(a=>nums.forEach(b=>{if(a<b&&CLOSE.some(k=>chose(by,a,b,k))&&CLOSE.some(k=>chose(by,b,a,k))){g.get(a).add(b);g.get(b).add(a);}}));
    return g;
  }
  function groups(by,nums){
    const g=closeGraph(by,nums),out=[];
    (function bk(R,P,X){
      if(!P.length&&!X.length){if(R.length>=3)out.push(R.slice().sort((a,b)=>a-b));return;}
      const pivot=[...P,...X].sort((a,b)=>g.get(b).size-g.get(a).size)[0];
      P.filter(v=>!g.get(pivot).has(v)).forEach(v=>{
        bk([...R,v],P.filter(x=>g.get(v).has(x)),X.filter(x=>g.get(v).has(x)));
        P=P.filter(x=>x!==v);X=[...X,v];
      });
    })([],nums.slice(),[]);
    return out.sort((a,b)=>b.length-a.length||a[0]-b[0]);
  }

  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const sd=(a,m)=>a.length?Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length):0;
  const z=(v,m,s)=>s?(v-m)/s:0;
  const STATUS={
    popular:{teacher:'선호 높음 (인기형)',parent:'친구들이 많이 찾고 좋아하는 편이에요.'},
    average:{teacher:'평균형',parent:'또래 관계가 고르게 형성되어 있어요.'},
    neglected:{teacher:'관심 필요 (소외형)',parent:'아직 친구 관계를 넓혀 가는 중이에요. 함께 활동할 기회가 늘면 좋아요.'},
    rejected:{teacher:'갈등 주의 (거부형)',parent:'친구들과 어울리는 방법을 함께 연습하면 도움이 되는 시기예요.'},
    controversial:{teacher:'호불호 뚜렷 (양가형)',parent:'개성이 뚜렷해 친구들의 반응이 다양해요. 좋아하는 친구도 많아요.'},
    insufficient:{teacher:'자료 부족',parent:'이번 조사에 응답한 친구가 적어 학급 내 위치는 판단하지 않았어요.'}
  };
  function classify(zp,zn){const sp=zp-zn,si=zp+zn;
    if(sp>=1&&zp>0&&zn<0)return 'popular';if(sp<=-1&&zn>0&&zp<0)return 'rejected';
    if(si<=-1&&zp<0&&zn<0)return 'neglected';if(si>=1&&zp>0&&zn>0)return 'controversial';return 'average';}

  /* 학급 전체 분석 */
  function analyze(rows,roster){
    const by=index(rows),nums=(roster||[]).map(s=>num(s.num)).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b);
    const reporters=[...by.keys()].filter(n=>nums.includes(n));
    const posIn=new Map(nums.map(n=>[n,new Set()])),negIn=new Map(nums.map(n=>[n,new Set()]));
    reporters.forEach(f=>nums.forEach(t=>{if(f===t)return;
      if(POSITIVE.some(k=>chose(by,f,t,k)))posIn.get(t).add(f);
      if(chose(by,f,t,'discomfort'))negIn.get(t).add(f);}));
    const pv=nums.map(n=>posIn.get(n).size),nv=nums.map(n=>negIn.get(n).size);
    const pm=mean(pv),nm=mean(nv),ps=sd(pv,pm),ns=sd(nv,nm);
    const cliques=groups(by,nums);
    const students=new Map(nums.map(n=>{
      const relations=nums.filter(m=>m!==n).map(m=>pair(by,n,m)).filter(Boolean).sort((a,b)=>b.score-a.score||a.peer-b.peer);
      const zp=z(posIn.get(n).size,pm,ps),zn=z(negIn.get(n).size,nm,ns);
      const status=reporters.length<MIN_REPORTERS?'insufficient':classify(zp,zn);
      const close=relations.filter(r=>r.tone==='close').map(r=>r.peer);
      const posOut=reporters.includes(n)?nums.filter(m=>m!==n&&POSITIVE.some(k=>chose(by,n,m,k))):null;
      const reciprocated=posOut?posOut.filter(m=>POSITIVE.some(k=>chose(by,m,n,k))).length:null;
      return [n,{num:n,submitted:reporters.includes(n),relations,close,
        posIn:posIn.get(n).size,negIn:negIn.get(n).size,posInBy:[...posIn.get(n)],negInBy:[...negIn.get(n)],
        leaderIn:reporters.filter(f=>chose(by,f,n,'leader')).length,
        studyIn:reporters.filter(f=>chose(by,f,n,'study')).length,
        supportIn:reporters.filter(f=>chose(by,f,n,'support')).length,
        aspireIn:reporters.filter(f=>chose(by,f,n,'aspire')).length,
        posOut:posOut?posOut.length:null,reciprocity:posOut&&posOut.length?Math.round(reciprocated/posOut.length*100):null,
        zPos:+zp.toFixed(2),zNeg:+zn.toFixed(2),status,
        groups:cliques.filter(g=>g.includes(n)),
        isolated:reporters.length>=MIN_REPORTERS&&!close.length&&posIn.get(n).size===0}];
    }));
    return {students,groups:cliques,reporters:reporters.length,classSize:nums.length,
      responseRate:nums.length?Math.round(reporters.length/nums.length*100):0,means:{pos:+pm.toFixed(2),neg:+nm.toFixed(2)}};
  }

  /* 교사 사회성 평정 — 영역마다 2문항, 1(거의 안 함)~4(거의 항상) */
  const SKILLS=[
    {key:'cooperation',label:'협력',items:['모둠 활동에서 자기 몫을 하고 역할을 나눈다','규칙과 차례를 지킨다'],
      home:'집안일을 함께 나누어 맡고, 끝까지 해낸 것을 칭찬해 주세요.'},
    {key:'communication',label:'의사소통',items:['자기 생각을 분명하게 말한다','친구의 말을 끝까지 듣는다'],
      home:'저녁 식사 때 하루 있었던 일을 묻고, 끝까지 들어 주는 모습을 보여 주세요.'},
    {key:'empathy',label:'공감',items:['친구의 기분을 알아차리고 반응한다','어려워하는 친구를 돕는다'],
      home:'책이나 영상 속 인물의 마음을 함께 이야기해 보세요.'},
    {key:'selfControl',label:'자기조절',items:['화가 나도 말과 행동을 조절한다','갈등이 생기면 말로 풀려고 한다'],
      home:'화가 났을 때 잠깐 멈추고 숨 고르는 방법을 함께 정해 연습해 주세요.'},
    {key:'engagement',label:'관계 맺기',items:['먼저 다가가 함께하자고 한다','새로운 친구와도 어울린다'],
      home:'친구를 집이나 놀이터에 초대해 함께 노는 기회를 만들어 주세요.'},
    {key:'responsibility',label:'책임감',items:['약속을 지킨다','실수를 인정하고 바로잡는다'],
      home:'작은 약속을 정하고 지켰을 때 구체적으로 칭찬해 주세요.'}
  ];
  const SCALE=['거의 안 함','가끔','자주','거의 항상'];
  function skillScores(rating){
    const r=rating&&typeof rating==='object'?rating.scores||{}:{};
    const domains=SKILLS.map(d=>{const vals=d.items.map((_,i)=>Number(r[d.key+'.'+i])).filter(v=>v>=1&&v<=4);
      return {key:d.key,label:d.label,score:vals.length?+(mean(vals)).toFixed(1):null,answered:vals.length,home:d.home};});
    const rated=domains.filter(d=>d.score!=null);
    return {domains,rated:rated.length,strengths:rated.filter(d=>d.score>=3.5).map(d=>d.label),
      needs:rated.filter(d=>d.score<=2).map(d=>d.label),average:rated.length?+mean(rated.map(d=>d.score)).toFixed(1):null};
  }
  function normalizeRating(raw,at=new Date().toISOString()){
    const scores={};SKILLS.forEach(d=>d.items.forEach((_,i)=>{const v=Number(raw?.scores?.[d.key+'.'+i]);if(v>=1&&v<=4)scores[d.key+'.'+i]=v;}));
    return {studentNum:Number(raw?.studentNum),scores,note:String(raw?.note||'').trim().slice(0,1000),updatedAt:at};
  }

  // 받침에 맞춘 조사: josa('하늘','와','과') → '하늘과'
  function josa(word,noFinal,withFinal){const w=String(word||''),c=w.charCodeAt(w.length-1);
    const has=c>=0xAC00&&c<=0xD7A3?(c-0xAC00)%28!==0:/[0-9LMNRlmnr]$/.test(w);return w+(has?withFinal:noFinal);}
  /* 학부모 상담용 문장 — 다른 학생의 불편 지명은 이름 없이 수만 쓴다 */
  function parentReport(s,ctx){
    const name=n=>ctx.nameOf(n);
    const close=s.relations.filter(r=>r.tone==='close');
    const mutual=s.relations.filter(r=>r.tone==='mutual');
    const liked=s.relations.filter(r=>r.tone==='in');
    const likes=s.relations.filter(r=>r.tone==='out');
    const skills=skillScores(ctx.rating);
    const lines=[];
    const list=rs=>rs.map(r=>name(r.peer)).join(', ');
    if(close.length)lines.push(josa(list(close),'와','과')+' 서로를 친한 친구로 꼽았어요.');
    else lines.push('이번 조사에서 서로 친한 친구로 확인된 친구는 아직 없어요.');
    if(mutual.length)lines.push(josa(list(mutual),'와','과')+'도 서로 좋게 보고 있어요.');
    if(liked.length)lines.push(list(liked.slice(0,6))+' 친구가 '+josa(ctx.studentName,'를','을')+' 함께하고 싶은 친구로 골랐어요.');
    if(likes.length)lines.push(josa(ctx.studentName,'는','은')+' '+josa(list(likes.slice(0,6)),'와','과')+' 함께 지내고 싶어 해요.');
    if(s.leaderIn)lines.push('친구 '+s.leaderIn+'명이 의견을 잘 듣고 이끄는 친구로 꼽았어요.');
    if(s.studyIn)lines.push('친구 '+s.studyIn+'명이 함께 공부하고 싶은 친구로 꼽았어요.');
    if(s.supportIn)lines.push('친구 '+s.supportIn+'명이 힘들 때 이야기하고 싶은 친구로 꼽았어요.');
    const conflict=s.negIn;
    const groupsText=s.groups.length?s.groups.map(g=>g.filter(n=>n!==s.num).map(name).join(', ')).map(t=>'['+t+']').join(' ')+' 친구들과 서로 친한 무리를 이루고 있어요.':'';
    const home=[...skills.domains.filter(d=>d.score!=null&&d.score<=2).map(d=>d.home)];
    if(s.status==='neglected'||s.isolated)home.push('같은 반 친구 한두 명과 방과 후에 함께 놀 기회를 만들어 주시면 관계를 넓히는 데 큰 도움이 돼요.');
    if(conflict)home.push('친구와 불편했던 일이 있었는지 아이의 이야기를 먼저 들어 주시고, 학교와 함께 지도해요.');
    if(!home.length)home.push('지금처럼 친구 이야기를 관심 있게 들어 주시고, 잘 지내는 모습을 칭찬해 주세요.');
    return {relationLines:lines,groupsText,status:STATUS[s.status].parent,
      conflictText:conflict?'활동 중 불편함을 느낀다고 답한 친구가 '+conflict+'명 있어요. (친구들의 응답이라 이름은 알려 드리지 않아요.)':'활동 중 불편함을 느낀다고 답한 친구는 없어요.',
      skills,home:[...new Set(home)].slice(0,4)};
  }

  return {POSITIVE,CLOSE,LABEL,STATUS,SKILLS,SCALE,MIN_REPORTERS,josa,analyze,pair:(rows,a,b)=>pair(index(rows),a,b),skillScores,normalizeRating,parentReport};
});
