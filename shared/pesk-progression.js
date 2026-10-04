/* 🧩 성장 규칙 — 복수 몬스터(오답 복습) · 조각 · 제작 · 주간 퀘스트 · 도감
   DOM·저장소 없이 계산만 한다. 저장은 학생 기록(pesk-quiz-progress) 트랜잭션에서 한다.
   학생 기록에 쓰는 칸:
     revenge : [{k, due, n}]                복수 몬스터 목록 (레이팅 유형 복습은 기존 review 칸)
     frags   : {know, grit, brave}           조각
     wk      : {week, correct, unit:{}, revenge}   이번 주 모험 집계
     qw      : {week, claimed:[퀘스트 id]}    이번 주 받은 퀘스트 보상
     dexClaimed : [단계 %]                  도감 수집 보상 받은 단계 */
(function(root){
'use strict';
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const int=(v,min,max,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):d;};
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parse(date){const [y,m,d]=String(date).split('-').map(Number);return new Date(y,m-1,d);}
function addDays(date,n){const d=parse(date);d.setDate(d.getDate()+n);return ymd(d);}

/* ── 조각 ── */
const FRAGS={know:{icon:'📖',name:'지식 조각',from:'오늘의 지문'},grit:{icon:'🔁',name:'극복 조각',from:'복수 몬스터'},brave:{icon:'🔥',name:'용기 조각',from:'보스·모험'}};
const FRAG_IDS=Object.keys(FRAGS);
function normFrags(raw){const r=(raw&&typeof raw==='object')?raw:{};const o={};FRAG_IDS.forEach(k=>o[k]=int(r[k],0,9999,0));return o;}
function addFrags(frags,gain){const o=normFrags(frags);FRAG_IDS.forEach(k=>o[k]=Math.min(9999,o[k]+int(gain&&gain[k],0,999,0)));return o;}
function fragText(cost){return FRAG_IDS.filter(k=>cost&&cost[k]).map(k=>FRAGS[k].icon+' '+cost[k]).join(' · ');}

/* ── 제작 ── 상점에서 팔지 않는다. 그림은 기존 아이템 색 변형(avatar-extras.js) */
const RECIPES=[
  {id:'a_hood_scholar',slot:'hat',name:'학자의 후드',cost:{know:8}},
  {id:'w_staff_wisdom',slot:'weapon',name:'지혜의 지팡이',cost:{know:12,grit:4}},
  {id:'r_library',slot:'room',name:'도서관 방',cost:{know:10}},
  {id:'t_plate_rise',slot:'top',name:'다시 일어서는 갑옷',cost:{grit:10}},
  {id:'e_boot_grit',slot:'shoes',name:'극복의 장화',cost:{grit:6}},
  {id:'w_sword_brave',slot:'weapon',name:'용기의 검',cost:{brave:12,know:4}},
  {id:'a_barbuta_brave',slot:'hat',name:'용기의 투구',cost:{brave:8}},
  {id:'p_slime_r',slot:'pet',name:'무지개 슬라임',cost:{know:5,grit:5,brave:5}}
];
const isCraftItem=id=>RECIPES.some(r=>r.id===id);
function canCraft(frags,recipe){const f=normFrags(frags);return !!recipe&&FRAG_IDS.every(k=>f[k]>=(recipe.cost[k]||0));}
function spend(frags,cost){const f=normFrags(frags);FRAG_IDS.forEach(k=>{f[k]-=cost[k]||0;if(f[k]<0)throw new Error('NOT_ENOUGH');});return f;}

/* ── 복수 몬스터 ── 틀린 문제의 '종류'를 기억했다가 1일 → 3일 → 7일 뒤 다시 낸다.
   수학은 같은 단원·난이도의 새 숫자 문제, 영단어는 같은 단어. 세 번 연속 맞히면 졸업. */
const GAPS=[1,3,7],REVENGE_MAX=30;
function revengeKey(q){
  if(!q||q.typeCode)return null;   // 레이팅 유형은 기존 review 칸이 맡는다
  if(q.subject==='english'&&q.word)return 'e:'+String(q.word).slice(0,40);
  if(q.subject==='math'&&q.grade&&q.term&&q.unitNo)return 'm:'+q.grade+'-'+q.term+'-'+q.unitNo+':'+int(q.tier,1,3,1);
  return null;
}
function parseKey(k){
  const s=String(k||'');
  if(s.startsWith('e:'))return {subject:'english',word:s.slice(2)};
  const m=s.match(/^m:(\d)-(\d)-(\d+):(\d)$/);
  return m?{subject:'math',grade:+m[1],term:+m[2],unitNo:+m[3],tier:+m[4]}:null;
}
function revengeNormalize(list){
  if(!Array.isArray(list))return [];
  const seen=new Set();
  return list.filter(x=>x&&parseKey(x.k)&&DATE_RE.test(String(x.due||''))&&!seen.has(x.k)&&seen.add(x.k))
    .map(x=>({k:String(x.k),due:String(x.due),n:int(x.n,0,GAPS.length-1,0)})).slice(-REVENGE_MAX);
}
function revengeOnWrong(list,key,today){
  const cur=revengeNormalize(list).filter(x=>x.k!==key);
  if(parseKey(key))cur.push({k:key,due:addDays(today,GAPS[0]),n:0});
  return cur.slice(-REVENGE_MAX);
}
function revengeOnRight(list,key,today){
  const cur=revengeNormalize(list),i=cur.findIndex(x=>x.k===key);
  if(i<0)return {list:cur,graduated:false};
  const n=cur[i].n+1;
  if(n>=GAPS.length){cur.splice(i,1);return {list:cur,graduated:true};}
  cur[i]={...cur[i],n,due:addDays(today,GAPS[n])};
  return {list:cur,graduated:false};
}
function revengeDue(list,today,ok){
  return revengeNormalize(list).filter(x=>x.due<=today&&(!ok||ok(parseKey(x.k)))).sort((a,b)=>a.due.localeCompare(b.due));
}
/* 복습 자리: 하루에 푼 문제 4개 중 1개 자리(2·6·10번째…)에서만 → 8문제 중 최대 2개.
   사냥을 몰아서 하든 정답마다 바로 출발하든 같은 비율이 된다. */
function reviewSlot(triedToday){return int(triedToday,0,9999,0)%4===1;}

/* ── 이번 주 ── 월요일 날짜가 주 이름 */
function weekKey(date){const d=parse(date);d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d);}
function inWeek(date,week){return DATE_RE.test(String(date))&&date>=week&&date<=addDays(week,6);}
function bumpWeek(wk,today,{correct=false,unitKey='',revenge=false}={}){
  const week=weekKey(today);
  const w=(wk&&wk.week===week)?{week,correct:int(wk.correct,0,99999,0),unit:{...(wk.unit||{})},revenge:int(wk.revenge,0,99999,0)}:{week,correct:0,unit:{},revenge:0};
  if(correct){w.correct++;if(unitKey){w.unit[unitKey]=int(w.unit[unitKey],0,99999,0)+1;const keys=Object.keys(w.unit);if(keys.length>40)delete w.unit[keys[0]];}}
  if(revenge&&correct)w.revenge++;
  return w;
}

/* ── 주간 퀘스트 ── 학생마다 무작위 3개 (선생님이 켠 종류 중에서). 선생님이 고정한 퀘스트는 모두에게 먼저 들어간다 */
const QUESTS={
  unit:{icon:'📐',name:'모험 문제 맞히기',unitName:'{unit} 문제 맞히기',target:15,reward:{brave:2}},
  lit_done:{icon:'📖',name:'오늘의 지문 완료',target:2,reward:{know:3},needs:'literacy'},
  lit_perfect:{icon:'💯',name:'지문 처음 채점에서 다 맞히기',target:1,reward:{know:2},needs:'literacy'},
  revenge:{icon:'🔁',name:'복수 몬스터 처치',target:3,reward:{grit:2}},
  boss_days:{icon:'🤝',name:'보스 참여',target:3,reward:{brave:2},needs:'boss',unit:'일'},
  adv_days:{icon:'📅',name:'모험 출석',target:4,reward:{brave:2},unit:'일'},
  acc_days:{icon:'🎯',name:'정답률 80% 이상인 날 (10문제 이상)',target:2,reward:{grit:2},unit:'일'}
};
const QUEST_IDS=Object.keys(QUESTS);
function normalizeQuestCfg(raw){
  const r=(raw&&typeof raw==='object')?raw:{};
  const types={};
  QUEST_IDS.forEach(id=>{
    const t=(r.types&&r.types[id])||{},q=QUESTS[id];
    const reward={};FRAG_IDS.forEach(k=>{const v=t.reward&&t.reward[k]!==undefined?t.reward[k]:q.reward[k];if(v)reward[k]=int(v,0,50,0);});
    types[id]={on:t.on!==false,target:int(t.target,1,100,q.target),reward};
  });
  const pinned=[...new Set((Array.isArray(r.pinned)?r.pinned:[]).filter(id=>QUESTS[id]))].slice(0,3);
  const unitKeys=(Array.isArray(r.unitKeys)?r.unitKeys:[]).map(String).filter(k=>/^\d-\d-\d+$/.test(k)).slice(0,10);
  return {enabled:r.enabled!==false,count:int(r.count,1,5,3),types,pinned,unitKeys,unitLabel:String(r.unitLabel||'').slice(0,40)};
}
function rng(seed){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
/* ctx: {literacy, boss} — 이번 주에 열려 있는 활동만 퀘스트로 낸다 */
function pickQuests(cfgRaw,week,studentKey,ctx={}){
  const cfg=normalizeQuestCfg(cfgRaw);
  if(!cfg.enabled)return [];
  const ok=id=>cfg.types[id].on&&(!QUESTS[id].needs||ctx[QUESTS[id].needs]);
  const out=cfg.pinned.filter(ok);
  const pool=QUEST_IDS.filter(id=>ok(id)&&!out.includes(id));
  const r=rng(week+'|'+studentKey);
  while(out.length<cfg.count&&pool.length)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
  return out.map(id=>{
    const q=QUESTS[id],t=cfg.types[id];
    const name=id==='unit'&&cfg.unitLabel?q.unitName.replace('{unit}',cfg.unitLabel):q.name;
    return {id,icon:q.icon,name,target:t.target,reward:t.reward,unit:q.unit||'',pinned:cfg.pinned.includes(id)};
  });
}
function questProgress(id,rec,week,cfgRaw){
  const r=(rec&&typeof rec==='object')?rec:{},cfg=normalizeQuestCfg(cfgRaw);
  const wk=r.wk&&r.wk.week===week?r.wk:null;
  const daily=(r.daily&&typeof r.daily==='object')?r.daily:{};
  const days=Object.keys(daily).filter(d=>inWeek(d,week));
  const lit=Object.values((r.literacy&&typeof r.literacy==='object')?r.literacy:{});
  const dayOf=iso=>{const d=new Date(iso);return isNaN(d)?'':ymd(d);};
  switch(id){
    case 'unit':return !wk?0:cfg.unitKeys.length?cfg.unitKeys.reduce((a,k)=>a+int(wk.unit&&wk.unit[k],0,99999,0),0):int(wk.correct,0,99999,0);
    case 'lit_done':return lit.filter(x=>x&&x.done&&inWeek(dayOf(x.doneAt),week)).length;
    case 'lit_perfect':return lit.filter(x=>x&&Number(x.first)===4&&inWeek(dayOf(x.firstAt),week)).length;
    case 'revenge':return wk?int(wk.revenge,0,99999,0):0;
    case 'boss_days':return (Array.isArray(r.boss&&r.boss.days)?r.boss.days:[]).filter(d=>inWeek(d,week)).length;
    case 'adv_days':return days.filter(d=>Number(daily[d]&&daily[d].tried)>0).length;
    case 'acc_days':return days.filter(d=>{const x=daily[d]||{},t=Number(x.tried)||0;return t>=10&&(Number(x.correct)||0)/t>=0.8;}).length;
  }
  return 0;
}
function questClaimed(rec,week){const q=rec&&rec.qw;return q&&q.week===week&&Array.isArray(q.claimed)?q.claimed.map(String):[];}

/* ── 도감 ── 수집률 단계 보상 */
const DEX_STEPS=[
  {pct:25,title:'수집가',reward:'칭호 「수집가」'},
  {pct:50,title:'수집가',reward:'🏛️ 수집가의 방',item:'r_collector'},
  {pct:75,title:'대수집가',reward:'칭호 「대수집가」'},
  {pct:100,title:'전설의 수집가',reward:'칭호 「전설의 수집가」 + 금빛 테두리'}
];
function dexTitle(pct){let t='';DEX_STEPS.forEach(s=>{if(pct>=s.pct&&s.title)t=s.title;});return t;}

const API={FRAGS,FRAG_IDS,normFrags,addFrags,fragText,RECIPES,isCraftItem,canCraft,spend,
  GAPS,revengeKey,parseKey,revengeNormalize,revengeOnWrong,revengeOnRight,revengeDue,reviewSlot,
  weekKey,inWeek,bumpWeek,QUESTS,QUEST_IDS,normalizeQuestCfg,pickQuests,questProgress,questClaimed,
  DEX_STEPS,dexTitle,ymd,addDays};
if(typeof module==='object'&&module.exports)module.exports=API;
root.PeskProgress=API;
})(typeof window!=='undefined'?window:globalThis);
