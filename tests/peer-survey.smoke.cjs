const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const html=fs.readFileSync(path.join(__dirname,'../pesk.html'),'utf8');
    await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">'+[...html.matchAll(/<style>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')+'<div style="padding:16px" id="counsel-sub-survey"></div>');
    await page.addScriptTag({path:path.join(__dirname,'../shared/peer-survey.js')});
    await page.evaluate(()=>{
      Object.assign(window,{roomId:'test',myStudentNum:1,myStudentName:'하늘',myAccountUid:'u1',mySurvey:null,allSurveys:{},activeSurveyRoundId:'round-1',activeSurveyRoundLabel:'1회차',students:[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'가람'}],escHtml:PeerSurvey.escape,ensureActiveStudentSession:async()=>true,_db:{},_fsDoc:()=>({})});
      window.surveyDB={activeRoundId:'r2',rounds:{r2:{label:'2회차'}},value:{1:{studentNum:1,accountUid:'u1',aspire:[3]}}};
      window._fsRunTxn=async(db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(surveyDB)}),set:(r,data)=>{surveyDB=structuredClone(data);}});
    });
    await page.addScriptTag({content:html.slice(html.indexOf('const SURVEY_CATS ='),html.indexOf('/* ⚠️ 학생 화면에서 사회연결망 분석'))});
    await page.evaluate(()=>applyPeerSurveyDoc(surveyDB,true));
    await page.getByRole('button',{name:'2회차 설문 제출하기'}).waitFor();
    await page.locator('#chip-aspire-2').click();
    await page.locator('[data-peer-scale="belonging"]').selectOption('2');
    await page.locator('[data-peer-scale="repair"]').selectOption('na');
    await page.locator('[data-peer-scale="friendHelp"]').selectOption('1');
    await page.locator('[data-peer-scale="adultHelp"]').selectOption('4');
    await page.locator('[data-peer-solitude]').selectOption({label:'함께하고 싶었지만 참여하기 어려웠어요'});
    await page.locator('[data-peer-text="hardMoment"]').fill('모둠 활동에서 의견을 말하기 어려웠어요.');
    await page.locator('[data-peer-request]').selectOption({label:'선생님과 따로 이야기하고 싶어요'});
    // Re-rendering the panel must preserve the new answers, not just friend picks.
    await page.evaluate(()=>document.getElementById('counsel-sub-survey').innerHTML=buildSurveyPanel());
    assert.equal(await page.locator('[data-peer-scale="belonging"]').inputValue(),'2');
    assert.match(await page.locator('[data-peer-text="hardMoment"]').inputValue(),/모둠 활동/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    fs.mkdirSync('output/peer-survey',{recursive:true});
    await page.locator('[data-peer-scale="belonging"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:'output/peer-survey/student-mobile.png'});
    await page.getByRole('button',{name:'2회차 설문 제출하기'}).click();
    await page.getByRole('button',{name:'이번 회차 답변 수정하기',exact:false}).click();
    assert.equal(await page.locator('#chip-aspire-2').getAttribute('aria-pressed'),'true');
    await page.locator('#chip-aspire-3').click();
    await page.getByRole('button',{name:'2회차 수정 제출하기'}).click();
    const saved=await page.evaluate(()=>surveyDB.value['r2:1']);assert.deepEqual(saved.aspire,[2,3]);assert.equal(saved.reflection.belonging,2);
    assert.equal(saved.schemaVersion,4);assert.deepEqual(saved.distance,{});assert.deepEqual(saved.reflection.notApplicable,['repair']);assert.equal(saved.reflection.adultHelp,4);
    await page.evaluate(()=>applyPeerSurveyDoc({...surveyDB,activeRoundId:'r3',rounds:{...surveyDB.rounds,r3:{label:'3회차'}}},true));
    await page.getByRole('button',{name:'3회차 설문 제출하기'}).waitFor();
    assert.equal(await page.locator('[data-peer-scale="belonging"]').inputValue(),'');
    console.log('PASS student mobile: round, submit, edit, reflection persistence and new round');

    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');
    const frame=await page.locator('iframe').elementHandle().then(e=>e.contentFrame());
    await frame.waitForFunction(()=>window.TeskInsights&&window.PeerTeacher);
    await frame.evaluate(saved=>{
      students=[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'가람'}];friendData=[];friendRoundView='r2';activePeskSurveyRoundId='r2';peskSurveyRounds={r2:{label:'2회차'}};peskSurveyAll={'r2:1':saved};goPage('friends');
    },saved);
    await frame.locator('#friend-find').fill('하늘');await frame.locator('#friend-find').press('Enter');
    // 자기보고는 접지 않고 바로 보여 준다 (확인 질문 목록은 없앴다)
    const detail=frame.locator('#friend-focus-detail .pr-self');
    await detail.scrollIntoViewIfNeeded();
    assert.match(await detail.innerText(),/선생님과 따로 이야기/);
    await page.screenshot({path:'output/peer-survey/teacher-insights.png'});
    assert.match(await frame.evaluate(()=>_friendStudentDetailText(1,'r2')),/모둠 활동/);
    assert.deepEqual(errors,[]);
    console.log('PASS teacher: reflection evidence, support request, interpretation, AI input');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
