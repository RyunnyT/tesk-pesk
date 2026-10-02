const {chromium}=require('playwright');const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');const frame=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
  await frame.waitForFunction(()=>window.PeerTeacher&&document.querySelectorAll('.attention-row').length===2);
  await frame.evaluate(()=>{
   students=[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'가람'}];friendData=[];friendRoundView='r2';activePeskSurveyRoundId='r2';
   peskSurveyRounds={r1:{label:'1회차',createdAt:'2026-09-01'},r2:{label:'2회차',createdAt:'2026-09-19'}};
   const row=(n,r,play,extra={})=>({studentNum:n,roundId:r,schemaVersion:3,timeframe:'최근 2주',nominationLimits:{play:3,study:3,support:2},study:[],play,support:[],aspire:[],reflection:{belonging:2,friendHelp:1,adultHelp:4},...extra});
   peskSurveyAll={a:row(1,'r1',[2]),b:row(2,'r1',[1]),c:row(1,'r2',[2],{reflection:{repair:null,notApplicable:['repair'],hardMoment:'<img src=x onerror=alert(1)>',solitude:'함께하고 싶었지만 참여하기 어려웠어요',request:'선생님과 따로 이야기하고 싶어요',contexts:['쉬는 시간']}}),d:row(3,'r2',[])};
   window.noteDocs={};window.noteWrites=[];window.failNote=false;
   _fsDoc=(_, ...parts)=>parts.join('/');_fsCollection=_fsDoc;
   _fsGetDoc=async ref=>({exists:()=>!!noteDocs[ref],data:()=>structuredClone(noteDocs[ref])});
   window.failReadNum=0;window.readActive=0;window.readMax=0;
   _fsGetDocs=async ref=>{readActive++;readMax=Math.max(readMax,readActive);try{await new Promise(r=>setTimeout(r,20));if(failReadNum&&ref.includes('/num-'+failReadNum+'/'))throw new Error('permission-denied');return {docs:Object.entries(noteDocs).filter(([k])=>k.startsWith(ref+'/')).map(([,v])=>({data:()=>structuredClone(v)}))};}finally{readActive--;}};
   _fsRunTxn=async(_,fn)=>{const writes=[];await fn({get:_fsGetDoc,set:(r,v)=>writes.push([r,v])});if(failNote)throw new Error('permission-denied');for(const [r,v]of writes){noteDocs[r]=structuredClone(v);noteWrites.push(r);}};
   goPage('friends');
  });
  await frame.locator('#friend-focus-detail').waitFor();
  // Class summary has no per-student cards and none of the retired per-student support forms.
  // Teacher observations now live in their own tab (shared/tesk-observations.js).
  assert.equal(await frame.locator('[data-portfolio-student]').count(),0);
  assert.equal(await frame.locator('#peer-support-form').count(),0);
  assert.doesNotMatch(await frame.locator('#friends-content').innerText(),/지원 기록|관찰·지원|학부모 상담 결과지/);
  assert.equal(await frame.locator('.su-tab').count(),3);
  assert.match(await frame.locator('#peer-class-portfolio').innerText(),/원하는 도움 문항 응답 1명 기준/);
  assert.equal(await frame.locator('#peer-class-portfolio img').count(),0);
  await frame.locator('#peer-class-portfolio [data-peer-open="1"]').click();assert.equal(await frame.locator('#friend-focus').inputValue(),'1');
  await frame.locator('#friend-find').fill('가람');assert.equal(await frame.locator('[data-find]').count(),1);
  await frame.locator('[data-find="3"]').click();assert.equal(await frame.locator('#friend-focus').inputValue(),'3');
  await frame.locator('#friend-find').fill('없는학생');assert.match(await frame.locator('#friend-find-results').innerText(),/찾는 학생이 없어요/);
  await frame.locator('#friend-find').fill('1');await frame.locator('#friend-find').press('Enter');assert.equal(await frame.locator('#friend-focus').inputValue(),'1');
  await frame.locator('[data-peer-chip="2"]').click();assert.equal(await frame.locator('#friend-focus').inputValue(),'2');
  await frame.locator('#friend-focus').selectOption('1');
  fs.mkdirSync('output/peer-portfolio',{recursive:true});
  await frame.locator('#peer-class-portfolio').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:'output/peer-portfolio/class-desktop.png'});
  await page.setViewportSize({width:390,height:844});await frame.locator('#peer-class-portfolio').evaluate(el=>el.scrollIntoView({block:'start'}));
  assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'output/peer-portfolio/class-mobile.png'});
  await page.setViewportSize({width:1365,height:1000});
  // 지명 원자료는 접힌 상자(6번)에 있다 — 펼친 뒤 읽는다
  await frame.locator('#friend-focus-detail summary',{hasText:'영역별 지명 원자료'}).click();
  const text=await frame.locator('#friend-focus-detail').innerText();assert.match(text,/상대 응답 미확인: 다온/);assert.match(text,/비교 제외: 다온/);assert.doesNotMatch(text,/끊어진|위험 등급:|거부형|소외형/);
  assert.equal(await frame.locator('#friend-focus-detail img').count(),0);
  await frame.locator('#friend-focus-detail summary',{hasText:'AI로 친구 관계와 학생 서술 정밀 분석'}).click();   // AI 상자는 기본으로 접혀 있다
  await frame.getByText('미리 작성된 분석 프롬프트·참고 논문 보기',{exact:true}).click();
  assert.match(await frame.locator('#peer-analysis-card .peer-prompt').innerText(),/10.1177\/0165025414551761/);
  await frame.evaluate(()=>{
   window.aiCalls=0;window.aiReply={version:1,findings:[{evidenceIds:['self.solitude'],interpretation:'함께하고 싶었던 상황을 개별적으로 확인할 필요가 있습니다.',question:'언제 함께하기 어려웠니?'}],support:[{evidenceIds:['self.solitude'],action:'학생이 원하는 활동을 함께 찾아보세요.',followUp:'원했던 활동에서 편안하게 참여했는지 물어보세요.'}],limitations:[{evidenceIds:['meta.participation'],reason:'미응답 학생의 관계는 확인할 수 없습니다.'}]};
   callTeachAI=async()=>{aiCalls++;return await new Promise(resolve=>window.finishAI=()=>resolve(JSON.stringify(aiReply)));};
  });
  await frame.getByRole('button',{name:'AI로 친구 관계 살펴보기',exact:true}).click();
  assert.equal(await frame.locator('[data-peer-ai-btn]').isDisabled(),true);
  await frame.evaluate(async()=>{await analyzeFriendStudentAI(1,'r2');finishAI();});
  await frame.locator('.peer-ai-result').waitFor();assert.equal(await frame.evaluate(()=>aiCalls),1);
  assert.match(await frame.locator('.peer-ai-result').innerText(),/학급 응답 조건: 2\/3명/);
  assert.match(await frame.locator('.peer-ai-result').innerText(),/함께하고 싶었지만/);
  await frame.evaluate(()=>{delete _friendStudentAiResults[_friendStudentAiKey(1,'r2')];aiReply.findings[0].interpretation='위험 점수는 99점입니다.';callTeachAI=async()=>JSON.stringify(aiReply);});
  await frame.getByRole('button',{name:'AI로 친구 관계 살펴보기',exact:true}).click();
  await frame.waitForFunction(()=>!_friendStudentAiBusy.size);
  const kept=await frame.evaluate(()=>_friendStudentAiResults[_friendStudentAiKey(1,'r2')]);assert.doesNotMatch(kept,/99점/);assert.match(kept,/항목 1개는 제외/);assert.match(kept,/원했던 활동/);
  fs.mkdirSync('output/peer-depth',{recursive:true});await frame.locator('#peer-analysis-card').scrollIntoViewIfNeeded();await page.screenshot({path:'output/peer-depth/teacher-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'output/peer-depth/teacher-mobile.png'});
  await frame.evaluate(()=>selectFriendRound('all'));assert.equal(await frame.locator('#friend-focus').count(),0);assert.match(await frame.locator('#friends-content').innerText(),/서로 다른 시점/);
  assert.equal(await frame.locator('#peer-class-portfolio').count(),0);
  await frame.evaluate(()=>selectFriendRound('empty'));assert.equal(await frame.locator('[data-portfolio-student]').count(),0);assert.match(await frame.locator('#peer-class-portfolio').innerText(),/아직 이 회차의 응답이 없습니다/);
  assert.deepEqual(errors,[]);console.log('PASS: class summary without cards or teacher records, student search/chips, mobile, empty round, plus individual analysis and AI regression.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
