/* 마음거리 검사 — 반 친구 전원을 1~5로 평정(roster rating)한 결과를 계산합니다.
   지명 방식과 달리 모든 학생이 모든 친구에게 점수를 받아, 선택 인원 제한의 영향이 없습니다.
   점수 해석은 반 안에서의 상대 위치이며 진단이 아닙니다. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.MindDistance=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const QUESTION='지금 이 친구와 나의 마음 거리는 어느 정도인가요?';
 const SCALE=['아주 멀어요','조금 멀어요','보통이에요','조금 가까워요','아주 가까워요'];
 const SHORT=['아주 멂','멂','보통','가까움','아주 가까움'];
 const MIN_RATERS=5;            // 받은 점수 평균을 보여 줄 최소 평정자 수
 const round=(n,d=2)=>n==null?null:Math.round(n*10**d)/10**d;
 const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
 const sd=(a,m)=>a.length>1?Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length):0;

 /* 학생이 낸 평정 정리: {친구번호: 1~5}. '잘 몰라요'·자기 자신·명단 밖은 뺍니다 */
 function normalize(raw,self,roster){
  const out={};
  if(!raw||typeof raw!=='object')return out;
  Object.entries(raw).forEach(([k,v])=>{
   const num=Number(k),score=Number(v);
   if(!Number.isInteger(num)||num===Number(self)||!Number.isInteger(score)||score<1||score>5)return;
   if(roster&&!roster.some(s=>Number(s.num)===num))return;
   out[num]=score;
  });
  return out;
 }

 /* rows: [{studentNum, distance:{num:score}}] */
 function analyze(rows,roster){
  const nums=roster.map(s=>Number(s.num));
  const given=new Map();
  rows.forEach(r=>{const from=Number(r.studentNum);if(!nums.includes(from))return;const d=normalize(r.distance,from,roster);if(Object.keys(d).length)given.set(from,d);});
  const raters=[...given.keys()];
  const score=(a,b)=>given.get(a)?.[b]??null;
  const students=new Map();
  nums.forEach(n=>{
   const received=raters.filter(r=>r!==n&&score(r,n)!=null).map(r=>score(r,n));
   const out=Object.values(given.get(n)||{});
   students.set(n,{num:n,rated:given.has(n),raters:received.length,receivedMean:received.length>=MIN_RATERS?round(mean(received)):null,
    receivedDist:SCALE.map((_,i)=>received.filter(v=>v===i+1).length),givenMean:out.length?round(mean(out)):null,givenCount:out.length,
    close:[],distant:[],gap:[],warmFrom:[],coldFrom:[]});
  });
  // 반 안 상대 위치(받은 평균의 z)
  const means=[...students.values()].map(s=>s.receivedMean).filter(v=>v!=null),m=mean(means),s=sd(means,m||0);
  students.forEach(st=>{st.z=st.receivedMean==null||!s?null:round((st.receivedMean-m)/s);
   st.level=st.z==null?'자료 부족':st.z>=1?'반에서 가깝게 느끼는 친구가 많음':st.z<=-1?'반에서 멀게 느끼는 친구가 많음':'반 평균 범위';});
  // 쌍 관계: 둘 다 응답했을 때만 '서로'를 판단합니다
  const pairs=[];
  for(let i=0;i<nums.length;i++)for(let j=i+1;j<nums.length;j++){
   const a=nums[i],b=nums[j],ab=score(a,b),ba=score(b,a);
   if(ab==null&&ba==null)continue;
   const p={a,b,ab,ba,kind:''};
   if(ab!=null&&ba!=null){
    if(ab>=4&&ba>=4)p.kind='close';else if(ab<=2&&ba<=2)p.kind='distant';else if(Math.abs(ab-ba)>=3)p.kind='gap';
   }
   pairs.push(p);
   const A=students.get(a),B=students.get(b);
   if(p.kind==='close'){A.close.push(b);B.close.push(a);}
   if(p.kind==='distant'){A.distant.push(b);B.distant.push(a);}
   if(p.kind==='gap'){A.gap.push(b);B.gap.push(a);}
   if(ba>=4)A.warmFrom.push(b);if(ab>=4)B.warmFrom.push(a);
   if(ba!=null&&ba<=2)A.coldFrom.push(b);if(ab!=null&&ab<=2)B.coldFrom.push(a);
  }
  return {raters:raters.length,classSize:nums.length,classMean:round(m),classSd:round(s),students,pairs,score};
 }

 /* 한 학생 기준으로 반 친구 각각과의 거리(보낸 점수 / 받은 점수) */
 function rowsFor(result,num,roster){
  return roster.filter(s=>Number(s.num)!==Number(num)).map(s=>({num:Number(s.num),name:s.name,toPeer:result.score(Number(num),Number(s.num)),fromPeer:result.score(Number(s.num),Number(num))}));
 }
 return {QUESTION,SCALE,SHORT,MIN_RATERS,normalize,analyze,rowsFor};
});
