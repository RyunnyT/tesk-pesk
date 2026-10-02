// 교사 화면: 관찰 기록 탭(엑셀 불러오기 → 누가기록 연동) · 마음거리 · AI 학생 이해 결과지 · 학급 결과지 · 자리배치
const {chromium}=require('playwright');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const JSZip=require('jszip');
async function xlsx(rows){
 const zip=new JSZip(),strings=[];
 const cell=(v,ref)=>{if(v==null)return '';if(typeof v==='number')return `<c r="${ref}"><v>${v}</v></c>`;let i=strings.indexOf(v);if(i<0){strings.push(v);i=strings.length-1;}return `<c r="${ref}" t="s"><v>${i}</v></c>`;};
 zip.file('xl/workbook.xml','<workbook xmlns:r="r"><sheets><sheet name="기록 목록" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml','<worksheet><sheetData>'+rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,String.fromCharCode(65+j)+(i+1))).join('')}</row>`).join('')+'</sheetData></worksheet>');
 zip.file('xl/sharedStrings.xml','<sst>'+strings.map(s=>`<si><t>${s}</t></si>`).join('')+'</sst>');
 return zip.generateAsync({type:'nodebuffer'});
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const out=path.resolve('output/student-understanding');fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');const f=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
  await f.waitForFunction(()=>window.TeskUnderstanding&&window.TeskObservations&&window.PeerTeacher);
  await f.evaluate(()=>{
   students=[{num:1,name:'김하늘'},{num:2,name:'박다온'},{num:3,name:'이서준'},{num:4,name:'정수아'},{num:5,name:'최지우'},{num:6,name:'한도윤'}];
   friendData=[];friendRoundView='r1';activePeskSurveyRoundId='r1';peskSurveyRounds={r1:{label:'1회차',createdAt:'2026-09-01'}};
   const d=(me,v)=>Object.fromEntries([1,2,3,4,5,6].filter(n=>n!==me).map((n,i)=>[n,v[i]]));
   const row=(n,play,dist,extra={})=>({studentNum:n,roundId:'r1',schemaVersion:4,timeframe:'최근 2주',nominationLimits:{play:3,study:3,support:2,discomfort:2},study:[],play,support:[],aspire:[],discomfort:[],distance:dist,reflection:{belonging:2},...extra});
   peskSurveyAll={a:row(1,[2],d(1,[5,1,3,3,3]),{discomfort:[3],reflection:{belonging:2,hardMoment:'놀림을 받으면 화가 나요'}}),b:row(2,[1],d(2,[5,2,3,3,3])),c:row(3,[4],d(3,[1,2,4,3,3]),{discomfort:[1]}),
    e:row(4,[3],d(4,[2,3,5,3,3])),g:row(5,[6],d(5,[2,3,3,3,5])),h:row(6,[5],d(6,[3,3,3,3,5]))};
   window.aiCalls=[];
   callTeachAI=async prompt=>{aiCalls.push(prompt);
    if(prompt.includes('"class.survey"'))return JSON.stringify({summary:{text:'우리 반은 학생 01과 학생 03 사이 갈등이 반복되고 있어요.',evidenceIds:['class.pair.0']},patterns:[{text:'갈등은 쉬는 시간 신체 접촉에서 시작돼요.',evidenceIds:['class.obs']}],students:[{student:'학생 01',text:'감정을 말로 표현하는 연습이 필요해요.',evidenceIds:['class.obs']}],classroom:[{action:'두 학생은 모둠을 나누어 앉혀요.',evidenceIds:['class.pair.0']}],watch:[{text:'2주 뒤 다시 살펴봐요.',evidenceIds:['class.obs']}]});
    return JSON.stringify({summary:{text:'대상 학생은 친구 A와 가깝지만 친구 B와 신체 갈등이 반복되고 있어요.',evidenceIds:['obs.summary','dist.close']},
     strengths:[{text:'친구 A와 서로 가깝다고 답할 만큼 깊은 관계를 맺을 수 있어요.',evidenceIds:['dist.close']}],
     relationships:[{text:'친구 B와는 마음거리도 멀고 갈등도 관찰됐어요.',evidenceIds:['dist.distant','obs.peer.0']}],
     innerWorld:[{behavior:'놀림을 받으면 몸으로 반응함',possibleMeaning:'속상한 마음을 말로 꺼내기 어려웠을 수 있어요.',checkQuestion:'그때 몸이 먼저 움직였을 때 마음은 어땠어?',evidenceIds:['obs.item.0','self.1']}],
     studentTalk:[{situation:'갈등 직후',script:'화가 났구나. 그래도 친구 몸에 손대는 건 안 돼. 다음엔 선생님한테 먼저 말해 줄래?',evidenceIds:['obs.item.0']}],
     parentTalk:[{point:'학교에서 있었던 일',script:'친구 B와 다툼이 있었는데, 아이가 속상한 마음을 말로 표현하도록 함께 도와주시면 좋겠어요.',evidenceIds:['obs.summary']}],
     classroom:[{action:'친구 B와는 다른 모둠으로 앉혀요.',evidenceIds:['obs.peer.0']}],watch:[{text:'2주 동안 쉬는 시간을 지켜봐요.',evidenceIds:['obs.summary']}]});};
   window.TeskUnderstanding.setTab('observe');goPage('friends');
  });
  // 1. 엑셀 불러오기 → 미리보기
  const buf=await xlsx([['날짜','번호','이름','출결','출결 사유','관찰 기록'],
   ['2026-09-18',1,'김하늘','출석',null,'김하늘 학생이 이서준 학생의 등을 때림. 서준이가 먼저 놀렸다고 함.'],
   ['2026-09-18',3,'이서준','출석',null,'김하늘 학생이 이서준 학생의 등을 때림. 서준이가 먼저 놀렸다고 함.'],
   ['2026-09-22',2,'박다온','결석','질병',null],
   ['2026-09-30',1,'김하늘','출석',null,'이서준 학생을 밀침. 교육했음에도 반복됨. 자신의 주먹으로 자신을 때림.']]);
  await f.locator('[data-obs-file]').setInputFiles({name:'학생기록.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:buf});
  await f.locator('.obs-preview').waitFor();
  assert.equal(await f.locator('.obs-preview-item').count(),2,'출결만 있는 줄 제외 + 같은 사건 합침');
  assert.match(await f.locator('.obs-preview').innerText(),/자기 신체를 해치는 행동/);
  await page.screenshot({path:path.join(out,'1-preview.png')});
  await f.locator('[data-preview-save]').click();
  await f.waitForFunction(()=>TeskObservations.all().length===2);
  assert.equal(await f.locator('.obs-card').count(),2);
  // 같은 파일을 다시 올리면 모두 '이미 있음'
  await f.locator('[data-obs-file]').setInputFiles({name:'학생기록.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:buf});
  await f.locator('.obs-preview').waitFor();assert.equal(await f.locator('.obs-preview-item.exists').count(),2);await f.locator('[data-preview-cancel]').click();
  // 2. 생활기록부 누가기록에 연결됨
  const notes=await f.evaluate(()=>({one:records[1].notes.filter(n=>n.obsId).length,three:records[3].notes.filter(n=>n.obsId).length}));
  assert.deepEqual(notes,{one:2,three:2});
  // 3. 직접 입력 (자동 유형 추천)
  await f.locator('[data-obs-new]').click();
  await f.locator('#obs-form [data-pick="5"]').click();await f.locator('#obs-form [data-pick="6"]').click();
  await f.locator('#obs-form textarea[name=text]').fill('최지우가 한도윤을 도와 함께 정리함.');
  assert.equal(await f.locator('#obs-form input[value=positive]').isChecked(),true);
  await f.locator('#obs-form [type=submit]').click();await f.waitForFunction(()=>TeskObservations.all().length===3);
  await f.locator('[data-obs-filter-student]').selectOption('1');
  assert.match(await f.locator('.obs-summary').innerText(),/반복 관찰/);
  await page.screenshot({path:path.join(out,'2-observe.png'),fullPage:true});
  // 관찰을 고치면 누가기록도 바뀜
  const firstId=await f.evaluate(()=>TeskObservations.all()[0].id);
  await f.evaluate(id=>TeskObservations.openEntry(id),firstId);await f.locator('#obs-form').waitFor();
  await f.locator('#obs-form input[name=action]').fill('두 학생과 각각 대화함');await f.locator('#obs-form [type=submit]').click();
  await f.waitForFunction(()=>records[1].notes.some(n=>n.obsId&&n.text.includes('조치: 두 학생과 각각 대화함')));
  // 4. 친구 관계 분석 탭: 관계 지도에 관찰 열, 마음거리 섹션, 학부모 결과지 없음
  await f.evaluate(()=>{TeskUnderstanding.setTab('analysis');renderFriends();PeerTeacher.select(1);});
  await f.locator('#friend-focus-detail .su-dist').waitFor();
  const detail=await f.locator('#friend-focus-detail').innerText();
  assert.match(detail,/교사 관찰/);assert.match(detail,/마음거리 검사/);assert.doesNotMatch(detail,/학부모 상담 결과지/);
  assert.match(detail,/서로 가깝다고 답한 친구 박다온/);assert.match(detail,/서로 멀다고 답한 친구 이서준/);
  await f.locator('#friend-focus-detail').screenshot({path:path.join(out,'3-detail.png')});
  // 5. AI 학생 이해 결과지
  await f.evaluate(()=>TeskUnderstanding.openReport(1));await f.locator('#su-overlay [data-su-gen]').waitFor();
  assert.match(await f.locator('#su-overlay .su-flags').innerText(),/관련 사건에 자기 신체를 해치는 행동 기록 \(2026-09-30\)/);
  await f.locator('#su-overlay [data-su-gen]').click();
  await f.locator('#su-overlay .su-summary').waitFor();
  const prompt=await f.evaluate(()=>aiCalls[0]);
  assert.doesNotMatch(prompt,/김하늘|이서준|박다온/,'AI에는 이름을 보내지 않음');
  const report=await f.locator('#su-overlay .su-paper').innerText();
  assert.match(report,/김하늘은 박다온과 가깝지만 이서준과/,'교사용은 이름을 되돌림');
  assert.match(report,/출처/);assert.match(report,/Asher/);assert.doesNotMatch(report,/obs\.item|evidenceIds/);
  await page.screenshot({path:path.join(out,'4-report.png'),fullPage:false});
  await f.locator('#su-overlay .su-paper').screenshot({path:path.join(out,'4-report-full.png')});
  const printed=await f.evaluate(()=>{let html='';window.open=()=>({document:{write:s=>html=s,close(){}}});document.querySelector('[data-su-print-parent]').click();return html;});
  assert.doesNotMatch(printed,/이서준|박다온|친구 B/,'학부모용에는 다른 학생 이름 없음');assert.match(printed,/한 친구와 다툼/);
  await f.evaluate(()=>TeskUnderstanding.closeReport());
  // 6. 학급 결과지
  await f.locator('#su-class [data-su-class-gen]').click();await f.locator('#su-class .su-summary').waitFor();
  assert.match(await f.locator('#su-class').innerText(),/김하늘과 이서준 사이 갈등/);
  await f.locator('#su-class').screenshot({path:path.join(out,'5-class.png')});
  // 7. 자리배치: 갈등 쌍은 짝이 아님
  await f.evaluate(()=>{TeskUnderstanding.setTab('seats');renderFriends();});
  await f.locator('#su-seat-panel [data-seat=rows]').fill('2');await f.locator('#su-seat-panel [data-seat=cols]').fill('4');
  await f.locator('[data-seat-make]').click();await f.locator('.su-seat').first().waitFor();
  const grid=await f.evaluate(()=>JSON.parse(localStorage.getItem('tesk-seats')).grid);
  const desk=i=>Math.floor(i/4)*2+Math.floor((i%4)/2);assert.notEqual(desk(grid.indexOf(1)),desk(grid.indexOf(3)));
  await f.locator('#su-seat-panel').screenshot({path:path.join(out,'6-seats.png')});
  // 8. 모바일 폭
  await page.setViewportSize({width:390,height:900});await f.evaluate(()=>{TeskUnderstanding.setTab('observe');renderFriends();});
  const overflow=await f.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=1,'가로 스크롤 없음: '+overflow);
  await page.screenshot({path:path.join(out,'7-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: excel import/merge/dedupe, notes sync, manual entry, relation detail, AI report (masked, parent-safe), class report, seats, mobile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
