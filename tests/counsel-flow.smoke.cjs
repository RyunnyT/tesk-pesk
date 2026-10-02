// 상담 흐름: 신청 → [읽음 처리]/[상담 진행] 선택 → [결과 누적 입력]/[AI 분석] 선택, 종합 보고서의 상담 버튼.
// 로컬 미리보기 서버(8765)와 가상 저장소만 쓴다.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-gpu','--disable-features=CalculateNativeWinOcclusion']});try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');await page.frameLocator('iframe').locator('.attention-row').first().waitFor();
 const frame=await page.locator('iframe').elementHandle().then(e=>e.contentFrame());await frame.waitForFunction(()=>!!window.TeachingUI&&!!window.openStudentCounsel,{},{polling:100});
 await frame.evaluate(()=>{
  students=[{num:1,name:'하늘',points:0},{num:2,name:'다온',points:0},{num:3,name:'권수아',points:0}];examResults=[];counselRecords=[];peskWritingsAll=[];writings=[];
  counselRequests=[{id:'req-read',studentNum:2,studentName:'다온',reason:'그냥 이야기하고 싶었어요',date:'2026. 9. 29.',status:'pending'},
                   {id:'req-go',studentNum:1,studentName:'하늘',reason:'친구와 다퉈서 속상해요',date:'2026. 9. 30.',status:'pending'}];
  window.mockDocs={};_db={};_fsDoc=(base,...parts)=>typeof base==='string'?base+'/'+parts.join('/'):parts.join('/');_fsCollection=_fsDoc;
  mockDocs['classrooms/'+TESK_ROOM+'/data/tesk-counsel-requests']={value:structuredClone(counselRequests)};
  _fsGetDoc=async ref=>({exists:()=>Object.hasOwn(mockDocs,ref),data:()=>structuredClone(mockDocs[ref])});
  _fsRunTxn=async(_,fn)=>{const writes=[];const value=await fn({get:_fsGetDoc,set:(k,v)=>writes.push([k,v])});for(const [k,v]of writes)mockDocs[k]=structuredClone(v);return value;};
  resetCounselView();goPage('counsel');
 });
 const content=frame.locator('#counsel-content');
 // 1) 두 신청 모두 [읽음 처리]와 [상담 진행]을 먼저 고르게 한다.
 assert.equal(await content.locator('[data-request-read]').count(),2);assert.equal(await content.locator('[data-request-start]').count(),2);
 // 2) 읽음 처리: 상담 기록은 만들지 않고, 읽음 목록으로 옮긴다.
 await content.locator('[data-request-read="req-read"]').click();
 await frame.waitForFunction(()=>counselRequests.find(r=>r.id==='req-read')?.status==='read');
 assert.equal(await frame.evaluate(()=>counselRecords.length),0);
 assert.match(await content.locator('.teach-read-requests summary').innerText(),/읽음 처리한 신청 1건/);
 // 3) 상담 진행: 신청 내용으로 기록을 만들고, 다음 단계(누적 입력 / AI 분석)를 고르는 화면을 연다.
 await content.locator('[data-request-start="req-go"]').click();
 await frame.waitForFunction(()=>counselRecords.length===1&&counselDetailId);
 const rec=await frame.evaluate(()=>counselRecords[0]);
 assert.equal(rec.voice,'친구와 다퉈서 속상해요');assert.equal(rec.requestId,'req-go');assert.equal(rec.state,'active');
 assert.equal(await frame.evaluate(()=>counselRequests.find(r=>r.id==='req-go').status),'accepted');
 assert.equal(await content.locator('[data-teach="session"]').count(),1);assert.equal(await content.locator('[data-teach="ai"]').count(),1);assert.equal(await content.locator('[data-teach="prep"]').count(),1);
 // 3-1) 상담 준비 AI: 교사가 할 일과 발문 → 누적 기록에 저장
 await frame.evaluate(()=>{callTeachAI=async()=>JSON.stringify({quote:'친구와 다퉈서',todo:['다툰 상황을 끝까지 듣기'],opening:'오늘 이야기해 줘서 고마워.',questions:['언제 그런 일이 있었니?'],closing:'선생님이 어떻게 도와주면 좋을까?',avoid:'누가 잘못했는지 바로 정하기'});});
 await content.locator('[data-teach="prep"]').click();await content.locator('#teach-counsel-ai').getByText('이야기를 듣는 발문',{exact:true}).waitFor();
 await content.locator('[data-teach="ai-save"]').click();await frame.waitForFunction(()=>counselRecords[0].aiNotes?.length===1);
 // 4) 결과 누적 입력 두 번 → 1·2회차
 for(const [note,next] of [['친구 이름을 말하며 다툰 이유를 이야기했다.','내일 쉬는 시간에 다시 이야기하기'],['친구와 화해했다고 말했다.','']]){
  await content.locator('[data-teach="session"]').click();
  await content.locator('#teach-session-note').fill(note);if(next)await content.locator('#teach-session-next').fill(next);
  await content.locator('[data-teach="session-save"]').click();
  await frame.waitForFunction(n=>counselRecords[0].sessions?.length===n,note.includes('화해')?2:1);
 }
 assert.match(await content.innerText(),/누적 상담 결과 2회/);assert.match(await content.innerText(),/2회차/);
 assert.equal((await frame.evaluate(()=>mockDocs['classrooms/'+TESK_ROOM+'/data/tesk-counsels'].value[0].sessions.length)),2,'saved to the server copy');
 // 빈 내용은 저장하지 않는다
 await content.locator('[data-teach="session"]').click();await content.locator('[data-teach="session-save"]').click();
 assert.equal(await frame.evaluate(()=>counselRecords[0].sessions.length),2);
 await content.locator('[data-teach="panel-close"]').click();
 // 5) AI 분석: 누적 결과 문장도 근거로 쓸 수 있다
 await frame.evaluate(()=>{window._lastPrompt='';callTeachAI=async p=>{window._lastPrompt=p;return JSON.stringify({quote:'친구와 화해했다',change:'화해했다고 말했다.',kept:'쉬는 시간에 다시 이야기하기',todo:['함께 지내는 모습 살피기'],questions:['요즘 그 친구와 어떻게 지내?'],nextFocus:'다음 주 쉬는 시간 모습'});};});
 await content.locator('[data-teach="ai"]').click();await content.locator('#teach-counsel-ai').getByText('지난 상담과 달라진 점',{exact:true}).waitFor();
 assert.match(await frame.evaluate(()=>window._lastPrompt),/친구와 화해했다고 말했다/);
 // 6) 종합 보고서: 상담 있는 학생 → 그 학생의 상담으로, 없는 학생(권수아) → 버튼 비활성
 await frame.evaluate(()=>{peskSurveyAll={};friendData=[];records={};goPage('report');});
 const openReport=async name=>{await frame.locator('[data-report-row]').filter({hasText:name}).first().click();await frame.locator('#report-detail .rp-detail-name').filter({hasText:name}).waitFor();};
 await openReport('권수아');
 const none=frame.locator('#report-detail .rp-actions button',{hasText:'상담'});
 assert.equal(await none.innerText(),'상담 기록 없음');assert.equal(await none.isDisabled(),true);
 await openReport('다온');   // 신청만 있고 기록 없음(읽음 처리)
 await frame.locator('#report-detail [data-report-action="counsel"]').click();
 await frame.waitForFunction(()=>document.querySelector('.page.active')?.id==='page-counsel');
 assert.equal(await frame.evaluate(()=>counselDetailId),null);
 assert.match(await content.innerText(),/다온.*학생의 상담만 보는 중/s);assert.match(await content.innerText(),/읽음 처리한 신청 1건/);
 await frame.evaluate(()=>goPage('report'));await openReport('하늘');
 assert.match(await frame.locator('#report-detail [data-report-action="counsel"]').innerText(),/상담 기록 1건/);
 await frame.locator('#report-detail [data-report-action="counsel"]').click();
 await frame.waitForFunction(id=>counselDetailId===id,rec.id);
 assert.match(await content.innerText(),/하늘 · 진행 중 · 누적 2회/);
 // 보고서의 상담 줄을 누르면 그 기록으로
 await frame.evaluate(()=>{counselDetailId=null;goPage('report');});await openReport('하늘');
 await frame.locator('#report-detail .rp-link').first().click();await frame.waitForFunction(id=>counselDetailId===id,rec.id);
 // 사이드바로 들어가면 학생 필터가 풀린다
 await frame.locator('.nav-item[data-page="counsel"]').click();
 assert.equal(await frame.evaluate(()=>counselDetailId),null);assert.doesNotMatch(await content.innerText(),/학생의 상담만 보는 중/);
 fs.mkdirSync('output/teaching',{recursive:true});await page.screenshot({path:'output/teaching/counsel-flow.png'});
 assert.deepEqual(errors,[]);console.log('PASS counsel: read/start choice, cumulative sessions, AI with sessions, report buttons per student');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
