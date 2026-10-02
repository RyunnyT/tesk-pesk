(function(root){
'use strict';
const SUBJECTS=[{id:'math',label:'📐 수학',flag:'mathOn'},{id:'english',label:'🔤 영단어',flag:'englishOn'},{id:'korean',label:'📖 국어',flag:'koreanOn'},{id:'science',label:'🔬 과학',flag:'scienceOn'},{id:'social',label:'🌍 사회',flag:'socialOn'}];
const CUSTOM=['korean','science','social'];
function enabled(cfg){return SUBJECTS.filter(s=>CUSTOM.includes(s.id)?cfg[s.flag]===true:cfg[s.flag]!==false);}
function validate(raw){
  if(!CUSTOM.includes(raw.subject))throw new Error('국어·과학·사회 중 과목을 선택해주세요.');
  const grade=Number(raw.grade),term=Number(raw.term),unitNo=Number(raw.unitNo),level=Number(raw.level);
  if(![3,4,5,6].includes(grade)||![1,2].includes(term)||!Number.isInteger(unitNo)||unitNo<1||unitNo>30||![1,2,3].includes(level))throw new Error('학년·학기·단원·난이도를 확인해주세요.');
  const question=String(raw.question||'').trim(),unitName=String(raw.unitName||'').trim(),options=(raw.options||[]).map(x=>String(x).trim()),answerIndex=Number(raw.answerIndex);
  if(!question||question.length>2000||!unitName||unitName.length>60||options.length!==4||options.some(x=>!x||x.length>200)||new Set(options).size!==4||!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>3)throw new Error('문제와 단원명, 서로 다른 보기 4개, 정답을 입력해주세요.');
  return {subject:raw.subject,grade,term,unitNo,unitName,level,question,options,answerIndex,explain:String(raw.explain||'').trim().slice(0,1000),publisher:String(raw.publisher||'').slice(0,60),standard:String(raw.standard||'').slice(0,100),enabled:raw.enabled!==false};
}
function pool(rows,cfg,subject){const units=cfg.subjectUnits?.[subject]||[];return rows.filter(q=>q.enabled!==false&&q.subject===subject&&q.grade===Number(cfg.grade)&&q.term===Number(cfg.term)&&(!units.length||units.map(Number).includes(q.unitNo))&&(!Number(cfg.difficulty)||q.level===Number(cfg.difficulty)));}
function make(rows,cfg,subject,seed,QUIZ){const list=pool(rows,cfg,subject);if(!list.length)return null;const r=QUIZ.makeRng(seed),q=list[Math.floor(r()*list.length)];return {subject,grade:q.grade,term:q.term,unitNo:q.unitNo,unitName:q.unitName,unit:SUBJECTS.find(s=>s.id===subject).label+' '+q.grade+'-'+q.term+' '+q.unitNo+'단원 '+q.unitName,tier:q.level,q:q.question,options:q.options,answer:q.options[q.answerIndex],explain:q.explain,bankId:q.id};}
function store(api,room){
  const ref=()=>api._fsCollection(api._db,'classrooms',room,'data','pesk-question-bank','items');
  const parse=snap=>snap.docs.flatMap(d=>{try{return [{...validate(d.data()),id:d.id}];}catch(e){return [];}});
  return {load:async()=>parse(await api._fsGetDocs(ref())),subscribe:(next,error)=>api._fsOnSnapshot(ref(),snap=>next(parse(snap)),error),
    save:async(raw,id)=>{const data=validate(raw),doc=id?api._fsDoc(ref(),id):api._fsDoc(ref());await api._fsSetDoc(doc,{...data,updatedAt:new Date().toISOString()});return doc.id;},
    disable:async id=>api._fsUpdateDoc(api._fsDoc(ref(),id),{enabled:false,updatedAt:new Date().toISOString()}),
    restore:async rows=>{
      if(!Array.isArray(rows))throw new Error('문제은행 백업 형식이 올바르지 않아요.');
      const data=rows.map(q=>({...validate(q),id:String(q.id||'')}));
      if(data.some(q=>!q.id||q.id.includes('/')||q.id==='.'||q.id==='..')||new Set(data.map(q=>q.id)).size!==data.length)throw new Error('문제 ID를 확인해주세요.');
      const previous=parse(await api._fsGetDocs(ref()));
      for(const q of data){const {id,...fields}=q;await api._fsSetDoc(api._fsDoc(ref(),id),fields);}
      for(const q of previous)if(!data.some(x=>x.id===q.id))await api._fsUpdateDoc(api._fsDoc(ref(),q.id),{enabled:false});
    }};
}
const API={SUBJECTS,CUSTOM,enabled,validate,pool,make,store};if(typeof module==='object'&&module.exports)module.exports=API;root.PeskSubjects=API;
})(typeof window!=='undefined'?window:globalThis);
