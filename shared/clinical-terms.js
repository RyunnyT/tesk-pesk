/* AI 결과에 나오면 안 되는 진단·낙인·위험 판정 표현 — 상담·학생 이해·종합 소견·친구관계 검증이 함께 쓴다.
   교실 자료로 아이를 진단하거나 원인을 단정하지 않기 위한 목록이다. 넓히면 이 파일 한 곳만 고친다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ClinicalTerms=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';
const WORDS=['고위험군','위험도','위험 등급','진단명','우울증','ADHD','애착장애','분리불안','틱장애','틱 증상','자폐','경계선 지능','경계선지능','품행장애','정서장애','학습장애','난독증','트라우마','심리치료가 필요','약물 치료','약을 먹','문제아','가정교육','결손가정','편부모 가정'];
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp('('+WORDS.map(esc).join('|')+')|[0-9]+\\s*%','i');
function find(text){const m=String(text||'').match(re);return m?m[0]:null;}
return {version,WORDS,re,find};
});
