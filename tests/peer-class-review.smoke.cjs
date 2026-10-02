const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');
  const f=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
  await f.waitForFunction(()=>window.TeskWritingReview&&window.PeerClassUI&&peskWritingsAll.length>=5);
  await f.evaluate(()=>{
   peskWritingsAll=[{...peskWritingsAll[0],readAt:'2026-09-01',feedback:'지난 피드백',revision:2,needsRevisionReview:true}];
   writingStore=()=>({update:async(id,fn)=>fn({...peskWritingsAll.find(w=>w.id===id)}),history:async()=>[]});
   writingDetailId=null;writingViewMode='pesk';writingPendingOnly=true;goPage('writing');
  });
  assert.equal(await f.getByRole('button',{name:'✓ 수정된 글 확인',exact:true}).count(),1);
  await f.evaluate(()=>openPeskWritingFeedback(peskWritingsAll[0].id));
  await f.getByRole('button',{name:'✓ 수정된 글 확인',exact:true}).click();
  assert.equal(await f.evaluate(()=>peskWritingsAll[0].needsRevisionReview),false);
  assert.equal(await f.locator('.wr-row').count(),0);
  await f.evaluate(()=>{
   peskWritingsAll[0].needsRevisionReview=true;peskWritingsAll[0].revision=3;renderWriting();
   openPeskWritingFeedback(peskWritingsAll[0].id);
   peskWritingsAll[0].content+=' 다시 수정';peskWritingsAll[0].revision=4;
  });
  await f.getByRole('button',{name:'✓ 수정된 글 확인',exact:true}).click();
  assert.equal(await f.evaluate(()=>peskWritingsAll[0].needsRevisionReview),true);
  assert.match(await f.locator('#toast').innerText(),/최신 글/);
  await f.evaluate(()=>{
   students=[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'가람'}];friendData=[];friendRoundView='r2';activePeskSurveyRoundId='r2';
   peskSurveyRounds={r2:{label:'가을 회차',createdAt:'2026-09-19'},empty:{label:'빈 회차'}};
   const row=(n,play)=>({studentNum:n,roundId:'r2',schemaVersion:3,timeframe:'최근 2주',nominationLimits:{play:3},play,study:[],support:[],reflection:{belonging:2,request:'선생님과 따로 이야기하고 싶어요',hardMoment:'<img src=x onerror=alert(1)>'}});
   peskSurveyAll={a:row(1,[2]),b:row(2,[1])};
   _fsDoc=(_, ...parts)=>parts.join('/');_fsCollection=_fsDoc;_fsGetDocs=async()=>({docs:[]});
   window.reply={version:1,overview:[{evidenceIds:['domain.play'],interpretation:'함께 노는 관계에서 편안한 순간을 확인해요.',question:'언제 편안하게 참여할 수 있나요?'}],strengths:[],priorities:[],plan:[{evidenceIds:['needs.request'],action:'이번 주 담임이 개별 대화를 제안하고 학생이 선택하게 해요.',purpose:'학생이 원하는 도움을 확인해요.',followUp:'다음 주 같은 장면의 경험을 다시 물어 조정해요.'}],limitations:[{evidenceIds:['meta.conditions'],reason:'관찰 자료가 포함되지 않았어요.'}]};
   window.originalAI=callTeachAI;window.calls=0;
   callTeachAI=async(prompt,opts)=>{calls++;window.opts=opts;return new Promise(resolve=>window.finish=()=>resolve(JSON.stringify(reply)));};
   goPage('friends');
  });
  assert.equal(await f.locator('#peer-class-ai img').count(),0);
  await f.locator('[data-class-generate]').click();assert.equal(await f.locator('[data-class-generate]').isDisabled(),true);
  await f.evaluate(async()=>{await PeerClassUI.generate();finish();});
  await f.locator('[data-class-result]').waitFor();assert.equal(await f.evaluate(()=>calls),1);
  assert.equal(await f.evaluate(()=>opts.thinkingBudget),4096);assert.equal(await f.evaluate(()=>opts.maxTokens),16384);
  // Exercise the real Gemini adapter with a fake network response, never real student data or credentials.
  const config=await f.evaluate(async()=>{
   _getApiCreds=()=>({provider:'gemini-2.5-flash',key:'fictional-test-key'});
   _fetchJsonWithRetry=async(url,options)=>{window.requestBody=JSON.parse(options.body);return {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'not output'},{text:JSON.stringify(reply)}]}}]};};
   const raw=await originalAI('가상 학급',opts);if(raw.includes('not output'))throw Error('thought leaked');
   return requestBody.generationConfig;
  });
  assert.equal(config.responseMimeType,'application/json');assert.equal(config.thinkingConfig.thinkingBudget,4096);assert.ok(config.responseSchema.properties.plan);
  await f.evaluate(()=>{window.printed='';window.open=()=>({document:{write:s=>printed=s,close(){}}});PeerClassUI.print();});
  assert.match(await f.evaluate(()=>printed),/학급 전체 친구 관계 분석/);
  await f.evaluate(()=>{peskSurveyAll.a.reflection.belonging=4;renderFriends();});
  assert.equal(await f.locator('[data-class-result]').count(),0);assert.equal(await f.locator('[data-class-print]').isDisabled(),true);
  await f.locator('[data-class-generate]').click();
  await f.evaluate(()=>{peskSurveyAll.b.reflection.belonging=4;finish();});
  await f.waitForFunction(()=>!document.querySelector('[data-class-generate]').disabled);
  assert.equal(await f.locator('[data-class-result]').count(),0);assert.match(await f.locator('[data-class-status]').innerText(),/바뀌었어요/);
  await f.evaluate(()=>{callTeachAI=async()=>'{"bad":true}';});await f.locator('[data-class-generate]').click();
  await f.waitForFunction(()=>!document.querySelector('[data-class-generate]').disabled);assert.match(await f.locator('[data-class-status]').innerText(),/형식/);
  await f.evaluate(()=>{callTeachAI=async()=>JSON.stringify(reply);});await f.locator('[data-class-generate]').click();await f.locator('[data-class-result]').waitFor();
  fs.mkdirSync('output/peer-class',{recursive:true});await f.locator('#peer-class-ai').scrollIntoViewIfNeeded();await page.screenshot({path:'output/peer-class/desktop.png'});
  await page.setViewportSize({width:390,height:844});assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'output/peer-class/mobile.png'});
  await f.evaluate(()=>selectFriendRound('all'));assert.equal(await f.locator('#peer-class-ai').count(),0);
  await f.evaluate(()=>selectFriendRound('empty'));assert.equal(await f.locator('[data-class-generate]').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('PASS: revision confirmation, unseen edit guard, class AI contract, Gemini adapter, duplicate guard, stale results/requests, failure/retry, print, mobile, empty round');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
