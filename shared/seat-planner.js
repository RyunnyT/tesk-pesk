/* 자리배치 추천 — 관찰된 갈등·마음거리·친구 지명을 바탕으로 옆자리 조합을 고릅니다.
   같은 입력과 같은 시드면 항상 같은 배치가 나옵니다. 교사가 바꿀 수 있는 제안일 뿐입니다. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.SeatPlanner=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const W={desk:1,side:.45,front:.25};      // 짝·옆 모둠·앞뒤 자리 가중치
 function rng(seed){let s=(Number(seed)>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

 /* relations: {conflict:[[a,b,n]], distant:[[a,b]], discomfort:[[a,b]], close:[[a,b]], warm:[[from,to]], lowAcceptance:[num], keepApart:[[a,b]], front:[num]} */
 function pairCost(rel){
  const m=new Map(),key=(a,b)=>a<b?a+'-'+b:b+'-'+a,add=(a,b,v,why)=>{const k=key(a,b),c=m.get(k)||{cost:0,why:[]};c.cost+=v;if(why&&!c.why.includes(why))c.why.push(why);m.set(k,c);};
  (rel.conflict||[]).forEach(([a,b,n])=>add(a,b,3*Math.min(3,n||1),'관찰된 갈등'));
  (rel.keepApart||[]).forEach(([a,b])=>add(a,b,10,'교사 지정: 떨어뜨리기'));
  (rel.distant||[]).forEach(([a,b])=>add(a,b,2,'서로 먼 마음거리'));
  (rel.discomfort||[]).forEach(([a,b])=>add(a,b,1.5,'함께 활동 어려움 지명'));
  (rel.close||[]).forEach(([a,b])=>add(a,b,-1,'서로 가까운 친구'));
  const low=new Set(rel.lowAcceptance||[]);
  (rel.warm||[]).forEach(([from,to])=>{if(low.has(to))add(from,to,-1.5,'가깝게 느끼는 친구 곁');});
  return {get:(a,b)=>m.get(key(a,b))||{cost:0,why:[]}};
 }
 function neighbors(rows,cols,pairDesks){
  const out=[],idx=(r,c)=>r*cols+c;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   if(c+1<cols){const desk=pairDesks?c%2===0:true;out.push([idx(r,c),idx(r,c+1),desk?W.desk:W.side]);}
   if(r+1<rows)out.push([idx(r,c),idx(r+1,c),W.front]);
  }
  return out;
 }
 function plan({students,rows,cols,pairDesks=true,relations={},seed=1,iterations=4000}){
  const nums=students.map(s=>Number(s.num));
  const seats=rows*cols;
  if(nums.length>seats)throw new Error('자리 수('+seats+')가 학생 수('+nums.length+')보다 적어요. 줄이나 칸을 늘려주세요.');
  const cost=pairCost(relations),edges=neighbors(rows,cols,pairDesks),front=new Set(relations.front||[]);
  const frontLimit=pairDesks?cols:cols;   // 첫 줄 자리 수
  const total=g=>{let t=0;for(const [i,j,w] of edges){const a=g[i],b=g[j];if(a!=null&&b!=null)t+=w*cost.get(a,b).cost;}
   g.forEach((n,i)=>{if(n!=null&&front.has(n)&&Math.floor(i/cols)>0)t+=4*Math.floor(i/cols);});return t;};
  const rand=rng(seed);
  let best=null,bestScore=Infinity;
  for(let restart=0;restart<6;restart++){
   const g=Array(seats).fill(null);
   const order=nums.slice();for(let i=order.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
   // 앞자리 학생을 먼저 앞줄에
   order.sort((a,b)=>(front.has(b)?1:0)-(front.has(a)?1:0));
   order.forEach((n,i)=>{g[i]=n;});
   let score=total(g);
   for(let it=0;it<iterations;it++){
    const i=Math.floor(rand()*seats),j=Math.floor(rand()*seats);if(i===j||(g[i]==null&&g[j]==null))continue;
    [g[i],g[j]]=[g[j],g[i]];const s=total(g);
    if(s<=score)score=s;else [g[i],g[j]]=[g[j],g[i]];
   }
   if(score<bestScore){bestScore=score;best=g.slice();}
  }
  // 배치에 남은 주의점과 좋은 점
  const notes=[];
  for(const [i,j,w] of edges){const a=best[i],b=best[j];if(a==null||b==null)continue;const c=cost.get(a,b);
   if(c.why.length&&c.cost!==0)notes.push({a,b,weight:w,cost:c.cost,why:c.why,kind:c.cost>0?'watch':'good',desk:w===W.desk});}
  return {grid:best,rows,cols,pairDesks,score:Math.round(bestScore*100)/100,notes,frontLimit};
 }
 return {plan,pairCost,W};
});
