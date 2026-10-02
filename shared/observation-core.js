/* 교사 관찰 기록(사건 단위) — 엑셀 읽기·사건 합치기·유형/안전 신호 판별·누가기록 연결.
   AI를 쓰지 않습니다. 모든 판별은 아래 규칙으로만 하고, 교사가 미리보기에서 확인합니다. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ObservationCore=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TYPES=[
  {key:'physical',label:'신체 다툼',negative:true,words:['때리','때림','때렸','때려','발로','밀쳤','밀어','밀침','꼬집','목을','조르','졸랐','졸라','주먹','던지','던짐','뿌림','뿌렸','등짝','할퀴','물었','걷어차','발길질','넘어뜨']},
  {key:'verbal',label:'언어·놀림',negative:true,words:['욕','놀리','놀림','놀려','비웃','험담','소리를 지르','소리 지르','비난','별명','좋아한다','협박','위협']},
  {key:'boundary',label:'장난·경계 침범',negative:true,words:['장난','만짐','만지','만졌','신체 접촉','신체적 접촉','신체부분','안아','안음','껴안','뽀뽀','들춰','하지 말라']},
  {key:'exclusion',label:'배제·따돌림',negative:true,words:['따돌','끼워주지','끼워 주지','소외','무시','혼자 두','빼고 놀','끼지 못']},
  {key:'positive',label:'도움·긍정',negative:false,words:['도와','도움을 주','배려','양보','칭찬','함께 놀','나눠','나누어 주','격려','챙겨']},
  {key:'other',label:'기타 관찰',negative:false,words:[]}
 ];
 const OUTCOMES=[
  {key:'',label:'기록만'},
  {key:'guided',label:'지도함',words:['지도','교육','훈계','이야기를 나누','상담']},
  {key:'resolved',label:'화해함',words:['화해','사과','풀었','품.','품 ','풀고','풀어']},
  {key:'repeated',label:'반복됨',words:['반복','매일','계속','또 ','다시 ','교육했음에도','했음에도','듣지 않']}
 ];
 const ROLES={involved:'당사자',mentioned:'언급'};
 const FLAGS=[
  {key:'selfHarm',label:'자기 신체를 해치는 행동',action:'전문 상담(Wee클래스) 연계와 보호자 연락을 검토하세요.',
   re:/(자신|자기|스스로)(의)?\s*(주먹으로\s*)?(자신|자기|머리|몸|얼굴)?(을|를)?\s*(을|를)?\s*(때리|때림|때렸|박|찧|할퀴|긁)|자해|죽고\s*싶|사라지고\s*싶/},
  {key:'severe',label:'심한 신체 위험 행동',action:'다친 곳이 없는지 확인하고 학교 사안 처리 절차를 확인하세요.',
   re:/목을\s*(조르|졸|잡아)|목\s*조르|흉기|칼로|칼을|가위로\s*(찌|위협)|피가\s*(나|났)|다쳐서|병원에|기절/},
  {key:'body',label:'민감한 신체 부위 접촉',action:'성 관련 사안 여부를 학교 규정에 따라 확인하세요.',
   re:/가슴|성기|엉덩이|생식기|속옷|바지를\s*(내|벗)|치마를\s*(들|올)/}
 ];
 const clip=(v,n)=>String(v??'').trim().slice(0,n);
 const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pad=n=>String(n).padStart(2,'0');

 /* ── 날짜 ── 엑셀 일련번호·"2026. 9. 18."·"2026-09-18" 모두 YYYY-MM-DD로 */
 function normDate(v){
  if(v==null||v==='')return '';
  if(typeof v==='number'||/^\d{5}(\.\d+)?$/.test(String(v).trim())){
   const d=new Date(Date.UTC(1899,11,30)+Math.floor(Number(v))*86400000);
   return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
  }
  const m=String(v).match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  if(!m)return '';
  const out=m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
  const d=new Date(out+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===out?out:'';
 }

 /* ── XLSX → 시트별 행 배열 ── DOMParser 없이 동작(테스트·브라우저 공용) */
 const decode=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&');
 const texts=xml=>[...String(xml).matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>decode(m[1])).join('');
 const colIndex=ref=>{const letters=String(ref).replace(/\d+/g,'');let n=0;for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64);return n-1;};
 async function readXlsx(data,JSZip){
  const zip=await JSZip.loadAsync(data);
  const read=async p=>{const f=zip.file(p);return f?f.async('string'):'';};
  const shared=[...(await read('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>texts(m[1]));
  const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
  const target={};[...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].forEach(m=>{const id=m[1].match(/Id="([^"]+)"/)?.[1],t=m[1].match(/Target="([^"]+)"/)?.[1];if(id&&t)target[id]=t.replace(/^\/?xl\//,'').replace(/^\//,'');});
  const sheets=[...wb.matchAll(/<sheet\b([^>]*)\/?>/g)].map(m=>({name:decode(m[1].match(/name="([^"]*)"/)?.[1]||''),rid:m[1].match(/r:id="([^"]+)"/)?.[1]}));
  const out=[];
  for(const s of sheets){
   const xml=await read('xl/'+(target[s.rid]||''));if(!xml)continue;
   const rows=[];
   for(const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const row=[];
    for(const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
     const attrs=cm[1],body=cm[2]||'',ref=attrs.match(/r="([A-Z]+\d+)"/)?.[1],type=attrs.match(/t="([^"]+)"/)?.[1];
     const v=body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
     let value=null;
     if(type==='s')value=shared[Number(v)]??'';
     else if(type==='inlineStr')value=texts(body);
     else if(type==='str'||type==='e')value=v!=null?decode(v):'';
     else if(type==='b')value=v==='1';
     else if(v!=null)value=Number(v);
     row[ref?colIndex(ref):row.length]=value;
    }
    rows.push(row);
   }
   out.push({name:s.name,rows});
  }
  return out;
 }

 /* ── 이름 찾기 ── 성 없이 부른 이름(태민이, 성민이도)까지 찾습니다 */
 function mentioned(text,roster){
  const t=String(text||''),hits=new Set();
  roster.forEach(s=>{
   const name=String(s.name||'').trim();if(name.length<2)return;
   if(t.includes(name)){hits.add(Number(s.num));return;}
   const given=name.length>=3?name.slice(1):'';
   if(given&&new RegExp(escRe(given)+'(이|이가|이는|이를|이의|이도|이와|이랑|이한테|이에게|가|는|를|의|도|와|랑|한테|에게|아|야)(?![가-힣])').test(t))hits.add(Number(s.num));
  });
  return [...hits];
 }
 const typesOf=text=>{const t=String(text||'');const found=TYPES.filter(x=>x.words.some(w=>t.includes(w))).map(x=>x.key);
  const neg=found.filter(k=>TYPES.find(x=>x.key===k).negative);return neg.length?neg:found.length?found:['other'];};
 const outcomeOf=text=>{const t=String(text||'');
  for(const key of ['repeated','resolved','guided']){if(OUTCOMES.find(o=>o.key===key).words.some(w=>t.includes(w)))return key;}return '';};
 const flagsOf=text=>FLAGS.filter(f=>f.re.test(String(text||''))).map(f=>f.key);

 /* ── 엑셀 행 → 사건 ── 같은 날짜·같은 내용은 한 사건으로 합칩니다 */
 function findHeader(rows){
  for(let i=0;i<Math.min(rows.length,15);i++){
   const r=(rows[i]||[]).map(v=>String(v??'').replace(/\s/g,''));
   const obs=r.findIndex(v=>v.includes('관찰'));
   if(obs<0)continue;
   return {row:i,date:r.findIndex(v=>v.includes('날짜')||v.includes('일자')),num:r.findIndex(v=>v==='번호'||v.includes('번호')),name:r.findIndex(v=>v==='이름'||v.includes('성명')||v.includes('이름')),obs};
  }
  return null;
 }
 const normText=t=>String(t||'').replace(/\s+/g,' ').trim();
 function fromSheets(sheets,roster){
  const sheet=sheets.find(s=>findHeader(s.rows));
  if(!sheet)throw new Error('“관찰 기록” 열이 있는 시트를 찾지 못했어요. 첫 줄에 날짜·번호·이름·관찰 기록 제목이 있는지 확인해주세요.');
  const h=findHeader(sheet.rows),groups=new Map(),skipped=[];
  sheet.rows.slice(h.row+1).forEach((r,i)=>{
   const text=normText(r?.[h.obs]);if(!text)return;
   const date=normDate(h.date>=0?r[h.date]:'');
   const byNum=h.num>=0&&r[h.num]!=null&&r[h.num]!==''?roster.find(s=>Number(s.num)===Number(r[h.num])):null;
   const byName=h.name>=0?roster.find(s=>String(s.name).trim()===String(r[h.name]??'').trim()):null;
   const st=byNum&&(!byName||byName===byNum)?byNum:byName||byNum;
   const line=h.row+i+2;
   if(!date){skipped.push({line,reason:'날짜를 읽을 수 없음',text});return;}
   if(!st){skipped.push({line,reason:'학급 명단에 없는 학생('+(r[h.num]??'')+' '+(r[h.name]??'')+')',text});return;}
   const key=date+'|'+text;
   if(!groups.has(key))groups.set(key,{date,text,rowStudents:[],lines:[]});
   const g=groups.get(key);if(!g.rowStudents.includes(Number(st.num)))g.rowStudents.push(Number(st.num));g.lines.push(line);
  });
  const incidents=[...groups.values()].map(g=>{
   const named=mentioned(g.text,roster).filter(n=>!g.rowStudents.includes(n));
   // 한 학생 줄만 있으면 본문에 나온 친구가 상대 당사자, 여러 줄이면 본문의 다른 이름은 '언급'
   const role=g.rowStudents.length>1?'mentioned':'involved';
   return normalize({date:g.date,text:g.text,source:'excel',lines:g.lines,
    students:[...g.rowStudents.map(num=>({num,role:'involved'})),...named.map(num=>({num,role}))],
    types:typesOf(g.text),outcome:outcomeOf(g.text)},{roster,keepId:false});
  });
  return {sheet:sheet.name,incidents:incidents.sort((a,b)=>a.date.localeCompare(b.date)),skipped};
 }

 /* ── 정규화 ── */
 const newId=()=>'obs_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
 function normalize(raw,{roster=null,keepId=true}={}){
  const seen=new Set(),valid=n=>!roster||roster.some(s=>Number(s.num)===n);
  const students=(Array.isArray(raw?.students)?raw.students:[]).map(s=>({num:Number(s?.num),role:ROLES[s?.role]?s.role:'involved'}))
   .filter(s=>Number.isInteger(s.num)&&s.num>0&&valid(s.num)&&!seen.has(s.num)&&seen.add(s.num));
  const types=[...new Set((Array.isArray(raw?.types)?raw.types:[]).filter(k=>TYPES.some(t=>t.key===k)))];
  const out={
   id:keepId&&raw?.id?clip(raw.id,80):newId(),
   date:normDate(raw?.date),
   text:clip(raw?.text,2000),
   action:clip(raw?.action,600),
   students,
   types:types.length?types:['other'],
   outcome:OUTCOMES.some(o=>o.key===raw?.outcome)?raw.outcome:'',
   source:raw?.source==='excel'?'excel':'manual',
   createdAt:raw?.createdAt||new Date().toISOString(),
   updatedAt:raw?.updatedAt||raw?.createdAt||new Date().toISOString()
  };
  if(Array.isArray(raw?.lines))out.lines=raw.lines.slice(0,20);
  return out;
 }
 function validate(entry){
  if(!entry.date)throw new Error('관찰 날짜를 입력해주세요.');
  if(!entry.text)throw new Error('관찰 내용을 입력해주세요.');
  if(!entry.students.some(s=>s.role==='involved'))throw new Error('관련 학생을 한 명 이상 선택해주세요.');
  return entry;
 }
 const sig=e=>e.date+'|'+normText(e.text);
 /* 이미 있는 사건(같은 날짜·같은 내용)은 건너뛰고, 학생만 늘었으면 합칩니다 */
 function merge(existing,incoming){
  const list=existing.map(e=>({...e,students:e.students.map(s=>({...s}))})),added=[],updated=[],same=[];
  incoming.forEach(inc=>{
   const hit=list.find(e=>sig(e)===sig(inc));
   if(!hit){list.push(inc);added.push(inc.id);return;}
   const extra=inc.students.filter(s=>!hit.students.some(x=>x.num===s.num));
   if(extra.length){hit.students.push(...extra);hit.updatedAt=new Date().toISOString();updated.push(hit.id);}else same.push(hit.id);
  });
  return {list:list.sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt).localeCompare(String(b.createdAt))),added,updated,same};
 }

 /* ── 조회·통계 ── */
 const involves=(e,num)=>e.students.some(s=>s.num===Number(num));
 const typeLabel=k=>TYPES.find(t=>t.key===k)?.label||k;
 const isNegative=e=>e.types.some(k=>TYPES.find(t=>t.key===k)?.negative);
 function forStudent(list,num){return list.filter(e=>involves(e,num)).sort((a,b)=>b.date.localeCompare(a.date));}
 function studentSummary(list,num){
  const mine=forStudent(list,num),byType={},peers=new Map(),flags=new Set();
  mine.forEach(e=>{
   e.types.forEach(k=>{byType[k]=(byType[k]||0)+1;});
   flagsOf(e.text).forEach(f=>flags.add(f));
   const me=e.students.find(s=>s.num===Number(num));
   e.students.filter(s=>s.num!==Number(num)&&(me?.role==='involved'&&s.role==='involved')).forEach(s=>{
    const p=peers.get(s.num)||{num:s.num,count:0,negative:0,positive:0,types:{},last:''};
    p.count++;if(isNegative(e))p.negative++;else if(e.types.includes('positive'))p.positive++;
    e.types.forEach(k=>{p.types[k]=(p.types[k]||0)+1;});if(e.date>p.last)p.last=e.date;peers.set(s.num,p);
   });
  });
  const negative=mine.filter(isNegative),dates=negative.map(e=>e.date).sort();
  return {count:mine.length,negative:negative.length,positive:mine.filter(e=>!isNegative(e)&&e.types.includes('positive')).length,
   byType,peers:[...peers.values()].sort((a,b)=>b.negative-a.negative||b.count-a.count),flags:[...flags],
   repeated:mine.some(e=>e.outcome==='repeated')||negative.length>=3,first:dates[0]||'',last:dates[dates.length-1]||'',list:mine};
 }
 /* 학생 쌍 사이 관찰된 사건 — 관계도에 겹쳐 그립니다 */
 function pairs(list){
  const map=new Map();
  list.forEach(e=>{
   const inv=e.students.filter(s=>s.role==='involved').map(s=>s.num).sort((a,b)=>a-b);
   for(let i=0;i<inv.length;i++)for(let j=i+1;j<inv.length;j++){
    const key=inv[i]+'-'+inv[j],p=map.get(key)||{a:inv[i],b:inv[j],count:0,negative:0,positive:0,last:''};
    p.count++;if(isNegative(e))p.negative++;else if(e.types.includes('positive'))p.positive++;if(e.date>p.last)p.last=e.date;map.set(key,p);
   }
  });
  return [...map.values()];
 }

 /* ── 생활기록부 누가기록 연결 ── 원본은 관찰 기록, 누가기록은 따라갑니다 */
 const noteId=(e,num)=>'obsnote_'+e.id+'_'+num;
 function noteText(e){return '[관찰·'+e.types.map(typeLabel).join('·')+'] '+e.text+(e.action?' / 조치: '+e.action:'');}
 function syncNotes(records,list,ensure){
  const want=new Map();
  list.forEach(e=>e.students.filter(s=>s.role==='involved').forEach(s=>want.set(noteId(e,s.num),{e,num:s.num})));
  let changed=false;
  Object.keys(records||{}).forEach(num=>{
   const rec=records[num];if(!Array.isArray(rec?.notes))return;
   const before=rec.notes.length;
   rec.notes=rec.notes.filter(n=>!n.obsId||want.has(n.id));
   if(rec.notes.length!==before)changed=true;
  });
  want.forEach(({e,num},id)=>{
   const rec=ensure(num),text=noteText(e),idx=rec.notes.findIndex(n=>n.id===id);
   const note={id,obsId:e.id,date:e.date,areaTags:['comprehensive'],text,createdAt:idx>=0?rec.notes[idx].createdAt:Date.now(),updatedAt:Date.now()};
   if(idx<0){rec.notes.push(note);changed=true;}
   else if(rec.notes[idx].text!==text||rec.notes[idx].date!==e.date){rec.notes[idx]={...rec.notes[idx],...note};changed=true;}
  });
  return changed;
 }
 /* 학생을 명단에서 지울 때 */
 function removeStudent(list,num){
  return list.map(e=>({...e,students:e.students.filter(s=>s.num!==Number(num))})).filter(e=>e.students.some(s=>s.role==='involved'));
 }

 return {TYPES,OUTCOMES,ROLES,FLAGS,normDate,readXlsx,mentioned,typesOf,outcomeOf,flagsOf,fromSheets,normalize,validate,merge,
  forStudent,studentSummary,pairs,isNegative,typeLabel,noteId,noteText,syncNotes,removeStudent};
});
