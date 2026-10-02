// 관찰 기록 · 마음거리 · 자리배치 · AI 학생 이해 결과지의 계산과 검증 규칙
const test=require('node:test'),assert=require('node:assert/strict');
const JSZip=require('jszip');
const O=require('../shared/observation-core.js');
const MD=require('../shared/mind-distance.js');
const SP=require('../shared/seat-planner.js');
const SU=require('../shared/student-understanding-ai.js');
const roster=[[1,'김가온'],[2,'이나래'],[3,'박다인'],[4,'최라온'],[5,'정마루'],[6,'한바다']].map(([num,name])=>({num,name}));

async function xlsx(rows){
 // 공유 문자열을 쓰는 실제 엑셀과 같은 구조로 만듭니다
 const zip=new JSZip(),strings=[];
 const cell=(v,ref)=>{if(v==null)return '';if(typeof v==='number')return `<c r="${ref}"><v>${v}</v></c>`;let i=strings.indexOf(v);if(i<0){strings.push(v);i=strings.length-1;}return `<c r="${ref}" t="s"><v>${i}</v></c>`;};
 const sheet=rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,String.fromCharCode(65+j)+(i+1))).join('')}</row>`).join('');
 zip.file('xl/workbook.xml','<workbook xmlns:r="r"><sheets><sheet name="요약" sheetId="1" r:id="rId1"/><sheet name="기록 목록" sheetId="2" r:id="rId2"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml','<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>번호</t></is></c></row></sheetData></worksheet>');
 zip.file('xl/worksheets/sheet2.xml',`<worksheet><sheetData>${sheet}</sheetData></worksheet>`);
 zip.file('xl/sharedStrings.xml',`<sst>${strings.map(s=>`<si><t xml:space="preserve">${s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</t></si>`).join('')}</sst>`);
 return zip.generateAsync({type:'nodebuffer'});
}

test('excel import keeps only observation rows, merges duplicate incidents and links named friends',async()=>{
 const fight='박다인 학생이 이나래 학생의 등을 때림. 서로 이야기를 나누고 화해함.';
 const buf=await xlsx([
  ['날짜','번호','이름','출결','출결 사유','관찰 기록'],
  ['2026-09-18',3,'박다인','출석',null,fight],
  ['2026-09-18',2,'이나래','출석',null,fight],
  ['2026-09-22',4,'최라온','결석','질병 결석',null],
  [46290,1,'김가온','출석',null,'정마루 학생의 가슴을 만짐. 자신의 주먹으로 자신을 때림.'],
  ['2026-09-30',9,'없는학생','출석',null,'명단에 없는 학생 기록'],
 ]);
 const res=O.fromSheets(await O.readXlsx(buf,JSZip),roster);
 assert.equal(res.sheet,'기록 목록');
 assert.equal(res.incidents.length,2,'출결만 있는 줄은 빠지고 같은 사건은 하나로');
 const a=res.incidents.find(e=>e.text===fight);
 assert.deepEqual(a.students.map(s=>[s.num,s.role]),[[3,'involved'],[2,'involved']]);
 assert.deepEqual(a.types,['physical']);assert.equal(a.outcome,'resolved');
 const b=res.incidents.find(e=>e.students[0].num===1);
 assert.equal(b.date,'2026-09-25','엑셀 날짜 일련번호');
 assert.deepEqual(b.students.map(s=>[s.num,s.role]),[[1,'involved'],[5,'involved']],'한 줄짜리 사건은 본문의 친구가 상대 당사자');
 assert.deepEqual(O.flagsOf(b.text).sort(),['body','selfHarm']);
 assert.equal(res.skipped.length,1);assert.match(res.skipped[0].reason,/명단에 없는/);
});

test('re-importing the same file adds nothing; notes follow the observation source',()=>{
 const e=O.normalize({date:'2026-09-18',text:'가온이가 나래를 밀침',students:[{num:1},{num:2}],types:['physical']});
 const first=O.merge([],[e]);assert.equal(first.added.length,1);
 const again=O.merge(first.list,[O.normalize({date:'2026-09-18',text:'가온이가  나래를 밀침',students:[{num:1}]})]);
 assert.equal(again.added.length,0);assert.equal(again.list.length,1);
 const records={},ensure=n=>(records[n]||=(records[n]={notes:[]}));
 assert.equal(O.syncNotes(records,first.list,ensure),true);
 assert.match(records[1].notes[0].text,/^\[관찰·신체 다툼\]/);assert.equal(records[2].notes[0].obsId,e.id);
 assert.equal(O.syncNotes(records,first.list,ensure),false,'바뀐 것이 없으면 저장하지 않음');
 records[1].notes.push({id:'mine',text:'교사가 직접 쓴 메모'});
 O.syncNotes(records,[],ensure);
 assert.deepEqual(records[1].notes.map(n=>n.id),['mine'],'관찰을 지우면 연결 메모만 사라짐');
 assert.equal(records[2].notes.length,0);
});

test('student summary counts repeated conflicts and pairs for the relation map',()=>{
 const list=[1,2,3].map(d=>O.normalize({date:'2026-09-1'+d,text:'때림',students:[{num:1},{num:2}],types:['physical']}))
  .concat(O.normalize({date:'2026-09-20',text:'도와줌',students:[{num:1},{num:3}],types:['positive']}));
 const s=O.studentSummary(list,1);
 assert.equal(s.count,4);assert.equal(s.negative,3);assert.equal(s.repeated,true);assert.equal(s.peers[0].num,2);
 const p=O.pairs(list);assert.deepEqual(p.map(x=>[x.a,x.b,x.negative,x.positive]),[[1,2,3,0],[1,3,0,1]]);
 assert.deepEqual(O.removeStudent(list,2).filter(e=>e.students.some(x=>x.num===2)),[]);
});

test('mind distance uses only valid ratings and reports mutual closeness',()=>{
 const rows=[
  {studentNum:1,distance:{2:5,3:1,4:3,5:4,6:3,1:5,99:5}},
  {studentNum:2,distance:{1:5,3:2,4:3,5:3,6:3}},
  {studentNum:3,distance:{1:1,2:2,4:3,5:3,6:3}},
  {studentNum:4,distance:{1:2,2:3,3:3,5:3,6:3}},
  {studentNum:5,distance:{1:1,2:3,3:3,4:3,6:3}},
  {studentNum:6,distance:{1:2,2:3,3:3,4:3,5:3}},
 ];
 const r=MD.analyze(rows,roster),one=r.students.get(1);
 assert.equal(r.raters,6);assert.equal(one.givenCount,5,'자기 자신·명단 밖 점수는 버림');
 assert.deepEqual(one.close,[2]);assert.deepEqual(one.distant,[3]);assert.deepEqual(one.gap,[5]);
 assert.equal(one.receivedMean,2.2);assert.equal(one.raters,5);
 assert.equal(MD.analyze(rows.slice(0,3),roster).students.get(1).receivedMean,null,'평정자가 적으면 평균을 내지 않음');
});

test('seat planner keeps observed conflicts apart and is deterministic',()=>{
 const rel={conflict:[[1,2,3]],keepApart:[[3,4]],close:[[5,6]]};
 const plan=SP.plan({students:roster,rows:2,cols:4,pairDesks:true,relations:rel,seed:7});
 const again=SP.plan({students:roster,rows:2,cols:4,pairDesks:true,relations:rel,seed:7});
 assert.deepEqual(plan.grid,again.grid);
 const deskmates=(g,a,b)=>{const i=g.indexOf(a),j=g.indexOf(b);return Math.floor(i/4)===Math.floor(j/4)&&Math.floor((i%4)/2)===Math.floor((j%4)/2);};
 assert.equal(deskmates(plan.grid,1,2),false);assert.equal(deskmates(plan.grid,3,4),false);
 assert.equal(plan.notes.filter(n=>n.kind==='watch'&&n.desk).length,0);
 assert.throws(()=>SP.plan({students:roster,rows:1,cols:4}),/자리 수/);
});

test('AI packet hides names, rejects diagnoses and ungrounded rows, restores names for the teacher',()=>{
 const obsList=[O.normalize({date:'2026-09-30',text:'김가온 학생이 이나래 학생의 등을 때림. 가온이는 놀림을 받았다고 함.',students:[{num:1},{num:2}],types:['physical']})];
 const sum=O.studentSummary(obsList,1);
 const input={student:{num:1,name:'김가온'},roster,survey:null,reflection:null,distance:null,rating:{rated:0},
  observations:{...sum,list:sum.list.map(e=>({...e,typeLabels:['신체 다툼'],outcomeLabel:'',role:'당사자'}))},flags:[]};
 const packet=SU.build(input),prompt=SU.prompt(packet);
 assert.doesNotMatch(prompt,/김가온|이나래|가온이/);assert.match(prompt,/대상 학생/);assert.match(prompt,/친구 A/);
 assert.ok(packet.references.includes('gottman1996'));assert.ok(!packet.references.includes('asher1979'),'자료가 없으면 해당 문헌을 붙이지 않음');
 const raw={summary:{text:'대상 학생은 친구 A와 신체 다툼이 있었어요.',evidenceIds:['obs.summary']},
  strengths:[{text:'근거 없는 강점',evidenceIds:['rating.none']}],
  relationships:[{text:'친구 A와 갈등이 관찰됐어요.',evidenceIds:['obs.peer.0']}],
  innerWorld:[{behavior:'친구를 때림',possibleMeaning:'ADHD 때문일 수 있어요',checkQuestion:'왜?',evidenceIds:['obs.item.0']},
   {behavior:'친구를 때림',possibleMeaning:'놀림에 대한 속상함을 말로 풀기 어려웠을 수 있어요',checkQuestion:'그때 어떤 마음이었어?',evidenceIds:['obs.item.0']}],
  studentTalk:[],parentTalk:[{point:'친구 A와의 일',script:'친구 A와 다툼이 있었어요.',evidenceIds:['obs.summary']}],classroom:[],watch:[{text:'가짜 근거',evidenceIds:['nope']}]};
 const checked=SU.validate(JSON.stringify(raw),packet);
 assert.equal(checked.strengths.length,0,'missing 근거만 있는 문장은 버림');
 assert.equal(checked.innerWorld.length,1,'진단명은 버림');assert.equal(checked.watch.length,0);
 assert.equal(checked.dropped,3);
 assert.doesNotMatch(checked.parentTalk[0].script,/친구 A/,'학부모용에는 다른 학생 표기를 남기지 않음');
 const teacher=SU.restore(checked,packet,roster);
 assert.equal(teacher.summary.text,'김가온은 이나래와 신체 다툼이 있었어요.');
 const parts=SU.aliasMap(roster,1);
 assert.equal(SU.unmask('친구 C와 친구 C는 친구 C가 친구 C를, 대상 학생은',roster,parts),'최라온과 최라온은 최라온이 최라온을, 김가온은');
 assert.equal(SU.unmask('친구 B와는 친구 B이다',roster,parts),'박다인과는 박다인이다');
 assert.throws(()=>SU.validate({summary:{text:'ADHD 의심',evidenceIds:['obs.summary']}},packet),/규칙/);
});

test('class packet uses neutral labels and validates sections',()=>{
 const input={roster,survey:{roundLabel:'1회차',respondents:6,classSize:6,groups:[[1,2,3]],watch:[{num:4,why:'관심 필요'}]},
  distance:{raters:6,classMean:3,low:[4],distantPairs:1,gapPairs:0},observations:{count:1,byType:{'신체 다툼':1},pairs:[{a:1,b:2,negative:1,positive:0,last:'2026-09-30'}],repeatStudents:[]},flags:[]};
 const packet=SU.buildClass(input),prompt=SU.classPrompt(packet);
 assert.doesNotMatch(prompt,/김가온|최라온/);assert.match(prompt,/학생 04/);
 const r=SU.restoreClass(SU.validateClass({summary:{text:'학생 04에게 관심이 필요해요.',evidenceIds:['class.watch.0']},patterns:[],students:[{student:'학생 04',text:'함께할 기회를 마련해요.',evidenceIds:['class.distance']}],classroom:[],watch:[]},packet),packet,roster);
 assert.equal(r.students[0].student,'최라온');assert.match(r.summary.text,/최라온/);
});
