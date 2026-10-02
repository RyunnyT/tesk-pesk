const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const JSZip=require('jszip');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
    await page.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(host)?route.continue():route.abort();});
    await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');
    const frame=await page.locator('iframe').elementHandle().then(e=>e.contentFrame());
    await frame.waitForFunction(()=>window.TeskForm&&window.TeskInsights&&window.TeskHistory);
    const output=path.resolve('output/teacher-features');fs.mkdirSync(output,{recursive:true});
    const check=async(name,fn)=>{await fn();console.log('PASS',name);};
    await check('back, forward, duplicate selection and initial back button',async()=>{
      assert.equal(await frame.locator('.workspace-back').isDisabled(),true);
      await frame.evaluate(()=>{goPage('friends');goPage('report');goPage('report');});
      await frame.locator('.workspace-back').click();await frame.waitForFunction(()=>document.querySelector('.page.active').id==='page-friends');
      await frame.evaluate(()=>history.forward());await frame.waitForFunction(()=>document.querySelector('.page.active').id==='page-report');
      await frame.evaluate(()=>history.back());await frame.waitForFunction(()=>document.querySelector('.page.active').id==='page-friends');
      await frame.evaluate(()=>history.back());await frame.waitForFunction(()=>document.querySelector('.page.active').id==='page-home');
      assert.equal(await frame.locator('.workspace-back').isDisabled(),true);
    });
    await check('HWPX blank cells, split runs, multiline edits, package preservation',async()=>{
      await frame.evaluate(()=>{goPage('ai-assist');switchAiTab(4);});
      const b64=await frame.evaluate(()=>TESK_BASE_HWPX_B64),zip=await JSZip.loadAsync(b64,{base64:true});
      const p=(id,text)=>`<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">${text===null?'':`<hp:t>${text}</hp:t>`}</hp:run><hp:linesegarray><hp:lineseg textpos="0"/></hp:linesegarray></hp:p>`;
      const cell=(col,body)=>`<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="1"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${body}</hp:subList><hp:cellAddr colAddr="${col}" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="15000" height="3000"/><hp:cellMargin left="141" right="141" top="141" bottom="141"/></hp:tc>`;
      const table=`<hp:p id="101" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:tbl id="1" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="1" colCnt="2" cellSpacing="0" borderFillIDRef="1"><hp:tr>${cell(0,p(102,'일시'))}${cell(1,p(103,null))}</hp:tr></hp:tbl></hp:run></hp:p>`;
      const split='<hp:p id="104" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="1"><hp:t>안내: </hp:t></hp:run><hp:run charPrIDRef="0"><hp:t>{{행</hp:t></hp:run><hp:run charPrIDRef="0"><hp:t>사명}}</hp:t></hp:run></hp:p>';
      let xml=await zip.file('Contents/section0.xml').async('string');xml=xml.replace('</hs:sec>',table+split+'</hs:sec>');
      zip.file('Contents/section0.xml',xml);zip.file('Contents/section10.xml',xml.replace(/hp:/g,'alt:').replace('xmlns:hp=','xmlns:alt='));
      zip.file('BinData/test.bin',Buffer.from([0,1,7,255,33]));
      const source=await zip.generateAsync({type:'nodebuffer'});fs.writeFileSync(path.join(output,'fixture.hwpx'),source);
      await frame.locator('#ff-file').setInputFiles({name:'행사안내_테스트.hwpx',mimeType:'application/hwp+zip',buffer:source});
      await frame.waitForFunction(()=>!document.getElementById('ff-btn').disabled&&document.querySelectorAll('[data-field-id]').length>0);
      const cellInput=frame.locator('.form-field-card').filter({hasText:'1구역 · 표 1 · 1행 2열'}).locator('textarea');
      await cellInput.fill('2026. 9. 20.\n09:00 & <참고>');
      const splitInput=frame.locator('.form-field-card').filter({hasText:'안내: {{행사명}}'}).first().locator('textarea');
      await splitInput.fill('안내: 우리 반 독서 행사');
      await page.screenshot({path:path.join(output,'hwpx-editor.png'),animations:'disabled'});
      const downloading=page.waitForEvent('download');await frame.locator('#ff-download').click();const download=await downloading;await download.saveAs(path.join(output,'filled.hwpx'));
      const data=fs.readFileSync(path.join(output,'filled.hwpx')),out=await JSZip.loadAsync(data);
      assert.deepEqual(await out.file('Contents/header.xml').async('nodebuffer'),await zip.file('Contents/header.xml').async('nodebuffer'));
      assert.deepEqual(await out.file('BinData/test.bin').async('nodebuffer'),Buffer.from([0,1,7,255,33]));
      assert.equal(await out.file('Contents/section10.xml').async('string'),await zip.file('Contents/section10.xml').async('string'));
      const modified=await out.file('Contents/section0.xml').async('string');
      assert.match(modified,/<hp:t>2026\. 9\. 20\.<hp:lineBreak\/>09:00 &amp; &lt;참고&gt;<\/hp:t>/);
      assert.match(modified,/<hp:run charPrIDRef="1"><hp:t>안내: <\/hp:t><\/hp:run>/);
      assert.equal(data.readUInt16LE(8),0,'mimetype must be uncompressed');assert.equal(data.subarray(30,38).toString(),'mimetype');
      const reopened=await frame.evaluate(async bytes=>{const m=await TeskHwpx.open(new Uint8Array(bytes));return m.fields.map(f=>f.text);},[...data]);
      assert.ok(reopened.includes('2026. 9. 20.\n09:00 & <참고>'));assert.ok(reopened.includes('안내: 우리 반 독서 행사'));
      // Blank a previously populated paragraph: empty strings must survive export.
      await splitInput.fill('');
      assert.ok((await frame.locator('#ff-result').inputValue()).includes('09:00 & <참고>'));
    });
    await check('AI structured fill, missing facts, stale and invalid results never corrupt edits',async()=>{
      await frame.evaluate(()=>{
        window._originalCallJson=callTeachAIJson;
        callTeachAIJson=async prompt=>{const fields=JSON.parse(prompt.split('[이번에 검토할 항목]\n')[1]);const blank=fields.find(f=>f.location.includes('2구역')&&f.location.includes('1행 2열'));return {patches:[],missing:blank?[{id:blank.id,reason:'날짜 확인 필요'}]:[]};};
      });
      await frame.locator('#ff-info').fill('제공한 정보로 채워줘');await frame.locator('#ff-btn').click();await frame.waitForFunction(()=>!document.getElementById('ff-btn').disabled);
      assert.match(await frame.locator('#ff-summary').innerText(),/확인 필요 1개/);
      const before=await frame.locator('#ff-result').inputValue();
      await frame.evaluate(()=>{callTeachAIJson=async()=>({patches:[{id:'s999p1',value:'잘못된 문단'}],missing:[]});});
      await frame.locator('#ff-btn').click();await frame.waitForFunction(()=>!document.getElementById('ff-btn').disabled);
      assert.equal(await frame.locator('#ff-result').inputValue(),before);assert.match(await frame.locator('#ff-file-status').innerText(),/실패/);
      await frame.evaluate(()=>{callTeachAIJson=()=>new Promise(resolve=>window._resolveForm=resolve);});
      await frame.locator('#ff-btn').click();await frame.waitForFunction(()=>!!window._resolveForm);
      await frame.locator('#ff-info').fill('요청이 변경됨');await frame.evaluate(()=>window._resolveForm({patches:[],missing:[]}));await frame.waitForFunction(()=>!document.getElementById('ff-btn').disabled);
      assert.equal(await frame.locator('#ff-result').inputValue(),before);
      await frame.locator('#ff-file').setInputFiles({name:'broken.hwpx',mimeType:'application/hwp+zip',buffer:Buffer.from('broken')});await frame.waitForFunction(()=>!document.getElementById('ff-file').disabled);
      assert.equal(await frame.locator('[data-field-id]').count(),0);assert.equal(await frame.locator('#ff-result').inputValue(),'');
      await frame.evaluate(()=>{callTeachAIJson=window._originalCallJson;});
    });
    await check('friend identity deduplication, actual mutual wishes, and non-response',async()=>{
      const stats=await frame.evaluate(()=>{
        students=[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'서준'}];friendRoundView='r1';activePeskSurveyRoundId='r1';peskSurveyRounds={r1:{id:'r1',label:'1회차'}};
        friendData=[{studentNum:1,studentName:'하늘',roundId:'r1',aspire:[2]}];
        peskSurveyAll={a:{studentNum:1,studentName:'하늘',accountUid:'a',roundId:'r1',aspire:[2]},b:{studentNum:2,studentName:'다온',roundId:'r1',aspire:[]}};
        const first=analyzeFriends('r1');peskSurveyAll.b.aspire=[1];const second=analyzeFriends('r1');goPage('friends');
        return {responses:first.responseCount,oneWay:first.bridges.find(b=>b.num===1).mutualAspire,mutual:second.bridges.find(b=>b.num===1).mutualAspire,nonrespondent:first.statsList.find(s=>s.num===3).status,risks:first.isolationRisk.map(s=>s.num)};
      });
      assert.equal(stats.responses,2);assert.deepEqual(stats.oneWay,[]);assert.deepEqual(stats.mutual,['다온']);assert.equal(stats.nonrespondent,'미응답');assert.ok(!stats.risks.includes(3));
      await frame.locator('#friend-focus').selectOption('1');assert.match(await frame.locator('#friend-focus-detail').innerText(),/하늘/);
      await page.screenshot({path:path.join(output,'friends.png'),animations:'disabled'});
    });
    await check('report numeric averages, missing evidence and search',async()=>{
      const report=await frame.evaluate(()=>{
        examResults=[{id:'e1',name:'분수',subject:'수학',results:[{num:1,score:'80'},{num:2,score:null}]},{id:'e2',name:'도형',subject:'수학',results:[{num:1,score:'100'}]}];
        writings=[];peskWritingsAll=[];counselRecords=[];friendData=[];peskSurveyAll={};records={};goPage('report');
        return {avg:getStudentReport(students[0]).avgExamScore,missing:getStudentReport(students[2]).recommendation,signals:collectStudentSignals(1)};
      });
      assert.equal(report.avg,90);assert.match(report.missing,/자료가 없습니다/);assert.ok(report.signals.fullCtx.some(s=>s.includes('80점')));
      await frame.locator('#report-search').fill('하늘');
      await frame.waitForFunction(()=>document.querySelectorAll('[data-report-row]').length===1);
      await frame.locator('#report-search').fill('');
      await frame.waitForFunction(()=>document.querySelectorAll('[data-report-row]').length===students.length);
      // 표에서 학생을 고르면 오른쪽 상세가 그 학생으로 바뀝니다.
      await frame.locator('[data-report-row="3"]').click();
      await frame.waitForFunction(()=>document.querySelector('.rp-detail-name')?.textContent.trim().startsWith('3.'));
      // 정렬은 표시 순서만 바꾸고 선택은 유지합니다.
      await frame.locator('[data-report-sort="exam"]').click();
      const sorted=await frame.evaluate(()=>[...document.querySelectorAll('[data-report-row]')]
        .map(tr=>{const t=tr.children[1].textContent.trim();return t.startsWith('—')?-1:parseInt(t,10);}));
      assert.deepEqual(sorted,[...sorted].sort((a,b)=>b-a),'시험 평균 내림차순이어야 합니다: '+sorted.join(','));
      assert.equal(await frame.evaluate(()=>reportPicked),3);
      await frame.locator('[data-report-sort="num"]').click();
      // 칩에 적힌 수와 실제로 남는 행 수가 같아야 합니다.
      for(const key of ['thin','counsel','peer','all']){
        await frame.locator(`[data-report-filter="${key}"]`).click();
        const {chip,rows}=await frame.evaluate(k=>({
          chip:Number(document.querySelector(`[data-report-filter="${k}"] b`).textContent),
          rows:document.querySelectorAll('[data-report-row]').length
        }),key);
        assert.equal(rows,chip,`${key} 칩 ${chip}명 / 표 ${rows}행`);
      }
      assert.equal(await frame.evaluate(()=>document.querySelectorAll('.rp-split').length),1);
      await page.screenshot({path:path.join(output,'reports.png'),animations:'disabled'});
    });
    await check('record draft targets original student, supports review, and detects concurrent edits',async()=>{
      await frame.evaluate(()=>{selectedRecordStudent=1;goPage('records');_ensureRecord(1).fields.comprehensive='기존 관찰';callTeachAIJson=()=>new Promise(resolve=>window._resolveRecord=resolve);});
      await frame.locator('#record-draft-btn').click();await frame.waitForFunction(()=>!!window._resolveRecord);
      await frame.evaluate(()=>selectRecordStudent(2));await frame.evaluate(()=>window._resolveRecord({comprehensive:'근거에 따라 작성한 새 문장임.'}));
      await frame.waitForFunction(()=>!!records[1]?.aiDraft);
      assert.equal(await frame.evaluate(()=>records[2]?.fields.comprehensive||''),'');assert.equal(await frame.evaluate(()=>records[1].fields.comprehensive),'기존 관찰');
      await frame.evaluate(()=>selectRecordStudent(1));assert.equal(await frame.locator('[data-record-pick="comprehensive"]').isChecked(),false);
      await frame.locator('[data-record-pick="comprehensive"]').check();await frame.locator('#record-apply-draft').click();
      assert.equal(await frame.evaluate(()=>records[1].fields.comprehensive),'근거에 따라 작성한 새 문장임.');
      await frame.evaluate(()=>{TeskInsights.stageRecordDraft(1,{comprehensive:'다음 초안'},{...records[1].fields});records[1].fields.comprehensive='교사가 나중에 직접 수정';});
      await frame.locator('[data-record-pick="comprehensive"]').check();await frame.locator('#record-apply-draft').click();assert.equal(await frame.evaluate(()=>records[1].fields.comprehensive),'교사가 나중에 직접 수정');
      await page.screenshot({path:path.join(output,'records.png'),animations:'disabled'});
      await frame.locator('.comp-ex-item').first().click();assert.ok((await frame.locator('#rf-comprehensive').inputValue()).length>10);
      await frame.evaluate(()=>{callTeachAIJson=window._originalCallJson;});
    });
    await check('record grade bands, checks, masking, batch, history, export and tag hints',async()=>{
      // 학년군: 예시 학급은 "4학년 2반"이라 3~4학년 영역(실과 없음)이 자동으로 쓰입니다.
      await frame.evaluate(()=>{delete settings.recordGradeBand;Object.keys(records).forEach(k=>delete records[k]);goPage('records');selectRecordStudent(1);});
      assert.equal(await frame.locator('#rf-subj_practical').count(),0);assert.equal(await frame.locator('#rf-subj_english').count(),1);
      await frame.evaluate(()=>setRecordGradeBand('1-2'));
      assert.equal(await frame.locator('#rf-subj_integ_joy').count(),1);assert.equal(await frame.locator('#rf-subj_english').count(),0);
      await frame.evaluate(()=>setRecordGradeBand(''));
      assert.match(await frame.evaluate(()=>buildRecordDraftPrompt(students[0],'')),/3~4학년 영역 13개/);

      // 지난 학년도 기록 알림과 이름이 다른 기록 알림
      await frame.evaluate(()=>{records[5]={fields:{comprehensive:'작년 기록임.'},notes:[],year:2020,name:'옛학생'};records[2]={fields:{comprehensive:'맡은 일을 끝까지 성실히 수행하는 책임감이 돋보임.'},notes:[],year:RecordCheck.schoolYear(),name:'다른이름'};selectRecordStudent(2);});
      assert.match(await frame.locator('#record-year-banner').innerText(),/2020학년도 기록이 1명분/);
      assert.match(await frame.locator('#record-name-banner').innerText(),/다른이름/);
      await frame.locator('#record-name-banner button').first().click();
      assert.equal(await frame.evaluate(()=>records[2].name),await frame.evaluate(()=>students[1].name));
      await frame.evaluate(()=>{delete records[5];});

      // 금지 항목 + 다른 학생과 같은 문장
      await frame.evaluate(()=>{_ensureRecord(1).fields.comprehensive='교내 대회에서 최우수상을 받음. 맡은 일을 끝까지 성실히 수행하는 책임감이 돋보임.';save('tesk-records',records);selectRecordStudent(1);});
      const issues=await frame.locator('#rf-issues-comprehensive').innerText();
      assert.match(issues,/기재 금지 · 수상 실적/);assert.match(issues,/반복 문장/);assert.match(issues,/2번/);
      assert.match(await frame.locator('#record-overview-summary').innerText(),/반복 문장 2칸/);

      // 점검 결과 반영 다듬기: 지시에 점검 항목이 들어가고 이름은 AI로 나가지 않습니다.
      const name=await frame.evaluate(()=>students[0].name),given=name.length>=3?name.slice(1):name;
      await frame.evaluate(given=>{window._origTeachAI=callTeachAI;_ensureRecord(1).notes=[{id:'n1',date:'2026-09-01',areaTags:['subj_korean'],text:given+'이는 토론에서 근거를 들어 말함'}];save('tesk-records',records);
        callTeachAI=async p=>{window._refinePrompt=p;return '맡은 역할을 끝까지 해내며 친구들과 한 약속을 지킴.';};},given);
      await frame.locator('#rf-fix-comprehensive').click();
      await frame.waitForFunction(()=>records[1]?.aiDraft?.values?.comprehensive);
      const refinePrompt=await frame.evaluate(()=>window._refinePrompt);
      assert.match(refinePrompt,/수상 실적/);assert.ok(!refinePrompt.includes(name));assert.ok(!refinePrompt.includes(given+'이는'));
      await frame.evaluate(()=>{callTeachAIJson=async p=>{window._draftPrompt=p;return {subj_korean:'토론 수업에서 근거를 들어 의견을 말함.'};};});
      await frame.evaluate(()=>{delete records[1].aiDraft;return TeskInsights.generateRecords(false);});
      const draftPrompt=await frame.evaluate(()=>window._draftPrompt);
      assert.ok(!draftPrompt.includes(name));assert.ok(draftPrompt.includes('○○이는'));

      // 여러 학생 초안: 근거가 없는 학생은 AI를 부르지 않고, 검토 대기 초안은 덮어쓰지 않습니다.
      const batch=await frame.evaluate(async()=>{let calls=0;callTeachAIJson=async()=>{calls++;return {subj_math:'분수의 크기를 그림으로 비교하여 설명함.'};};
        _ensureRecord(3).notes=[{id:'n3',date:'2026-09-02',areaTags:['subj_math'],text:'분수 크기 비교를 설명함'}];
        const res=await TeskInsights.generateRecordsBatch([1,3,4],false);return {calls,res:res.map(r=>r.status)};});
      assert.deepEqual(batch.res,['skip','ok','skip']);assert.equal(batch.calls,1);

      // 이전 버전 되돌리기
      await frame.evaluate(()=>{selectRecordStudent(1);snapshotRecord(1,'테스트 전');records[1].fields.comprehensive='바뀐 문장임.';save('tesk-records',records);renderRecordForm();toggleRecordHistory(true);});
      await frame.locator('#record-history-panel button').first().click();await frame.locator('#app-form-submit').click();
      assert.match(await frame.evaluate(()=>records[1].fields.comprehensive),/최우수상/);

      // 반 전체 CSV: 현재 학년군 열만, 이름이 맞는 기록만
      const [download]=await Promise.all([page.waitForEvent('download'),frame.evaluate(()=>exportClassRecordsCsv())]);
      const csv=fs.readFileSync(await download.path(),'utf8');
      assert.match(csv,/"영어"/);assert.ok(!csv.includes('"실과"'));assert.match(csv,/최우수상/);

      // 누가 기록 태그 추천
      await frame.locator('#note-text-inp').fill('분수 문제를 친구에게 설명해 줌');
      await frame.waitForFunction(()=>document.querySelector('input.note-input-tag[value="subj_math"]')?.checked);
      assert.equal(await frame.locator('input.note-input-tag[value="comprehensive"]').isChecked(),true);
      await frame.evaluate(()=>{callTeachAI=window._origTeachAI;callTeachAIJson=window._originalCallJson;toggleRecordHistory(false);});
      await page.screenshot({path:path.join(output,'records-checks.png'),animations:'disabled'});
    });
    await check('teacher assistant: AI request shape, results, PDF attach, items, CSV and drafts',async()=>{
      // 외부 AI 호출은 frame 안의 fetch를 가짜로 바꿔 요청 모양만 확인합니다(미리보기는 외부 요청을 막습니다).
      await frame.evaluate(()=>{window._seen={};window._realFetch=window.fetch;
        window.fetch=async(url,opts={})=>{const u=String(url),json=b=>new Response(JSON.stringify(b),{status:200,headers:{'content-type':'application/json'}});
          if(u.startsWith('https://api.anthropic.com/')){window._seen.claude={headers:opts.headers,body:JSON.parse(opts.body)};
            return json({content:[{type:'thinking',thinking:''},{type:'text',text:'학생 자치회 임원 선거 실시\n\n1. [확인 필요: 일시] 선거를 실시하고자 합니다.\n끝.'}],stop_reason:'end_turn'});}
          if(u.startsWith('https://generativelanguage.googleapis.com/')){window._seen.gemini={url:u,headers:opts.headers};
            return json({candidates:[{content:{parts:[{text:'가정통신문 본문입니다.'}]},finishReason:'STOP'}]});}
          return window._realFetch(url,opts);};});
      await frame.evaluate(()=>{localStorage.setItem('tesk-api-provider','claude-sonnet-5');localStorage.setItem('tesk-api-key','test-key-for-smoke');goPage('ai-assist');switchAiTab(0);});
      assert.equal(await frame.locator('#ai-tb0').getAttribute('aria-selected'),'true');
      await frame.locator('#gm-title').fill('학생 자치회 임원 선거 실시');await frame.locator('#gm-content').fill('임원 선거를 안내합니다.');
      await frame.locator('#gm-btn').click();
      await frame.waitForFunction(()=>document.querySelector('#gm-result mark.ai-check'));
      const seen=await frame.evaluate(()=>window._seen);
      assert.equal(seen.claude.headers['anthropic-dangerous-direct-browser-access'],'true');
      assert.equal(seen.claude.body.model,'claude-sonnet-5');assert.equal('temperature' in seen.claude.body,false);assert.equal(seen.claude.body.output_config.effort,'medium');
      assert.match(await frame.locator('#gm-result-meta').innerText(),/확인 필요 1곳/);
      assert.equal(await frame.locator('#gm-result').getAttribute('contenteditable')!==null,true);
      // 은퇴한 모델 설정은 옮기고, Gemini 키는 주소가 아닌 헤더로 보냅니다.
      await frame.evaluate(()=>{localStorage.setItem('tesk-api-provider','gemini-1.5-flash');switchAiTab(3);});
      await frame.locator('#lt-title').fill('현장체험학습 안내');await frame.locator('#lt-content').fill('일시: 5월 15일');
      await frame.locator('#lt-btn').click();await frame.waitForFunction(()=>document.getElementById('lt-result').textContent.includes('가정통신문 본문'));
      Object.assign(seen,await frame.evaluate(()=>window._seen));
      assert.ok(!seen.gemini.url.includes('key='));assert.equal(seen.gemini.headers['x-goog-api-key'],'test-key-for-smoke');assert.ok(seen.gemini.url.includes('gemini-2.5-flash'));
      assert.equal(await frame.evaluate(()=>localStorage.getItem('tesk-api-provider')),'gemini-2.5-flash');
      // 큰 붙임 PDF(400KB)도 읽혀서 ZIP에 담길 준비가 됩니다.
      await frame.evaluate(()=>switchAiTab(0));
      await frame.locator('#gm-att-list input[type=file]').first().setInputFiles({name:'운영계획.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(400*1024,65)});
      await frame.waitForFunction(()=>(document.querySelector('.gm-att-input')?.dataset.pdfB64||'').length>500000);
      assert.match(await frame.locator('.gm-att-chip').first().innerText(),/운영계획\.pdf/);
      // 품목: 따옴표 이름 보존, 이름 없는 행은 합계에서 빠지고 안내가 뜹니다.
      await frame.evaluate(()=>{switchAiTab(2);document.getElementById('pm-item-body').innerHTML='';addPmItem({name:'27" 모니터',spec:'IPS',unit:'대',qty:2,price:185000});addPmItem({name:'',qty:1,price:5000});});
      assert.equal(await frame.locator('.pm-it-name').first().inputValue(),'27" 모니터');
      assert.equal(await frame.locator('#pm-total').innerText(),'380,000 원');
      assert.match(await frame.locator('#pm-total-note').innerText(),/품목명이 없는 행 1개/);
      const [csvDl]=await Promise.all([page.waitForEvent('download'),frame.evaluate(()=>downloadPmXlsx())]);
      const csv=fs.readFileSync(await csvDl.path(),'utf8');
      assert.match(csv,/"27"" 모니터","IPS","대","2","185000","190000","380000"/);
      // 임시저장
      await frame.evaluate(()=>TeskAssist.saveNow());
      const drafts=await frame.evaluate(()=>JSON.parse(localStorage.getItem('tesk-ai-drafts')));
      assert.equal(drafts.fields['gm-title'],'학생 자치회 임원 선거 실시');assert.ok(drafts.results['gm-result'].text.includes('확인 필요'));assert.equal(drafts.items[0].name,'27" 모니터');
      await frame.evaluate(()=>switchAiTab(0));
      await page.screenshot({path:path.join(output,'ai-assist.png'),animations:'disabled'});
      await frame.evaluate(()=>{window.fetch=window._realFetch;localStorage.removeItem('tesk-api-key');});
    });
    await check('student delete, stale roster, backup/restore safety, point double-tap and stats',async()=>{
      // 미리보기는 서버 쓰기를 막으므로 frame 안에 메모리 Firestore를 둡니다(트랜잭션은 성공할 때만 반영).
      await frame.evaluate(()=>{
        const store=window._memStore=new Map();window._failKeys=new Set();window._txnDelay=0;
        const key=r=>r.path;
        window._fsDoc=(db,...parts)=>({path:parts.join('/'),id:parts.at(-1)});
        const snap=r=>{const v=store.get(key(r));return {id:r.id,exists:()=>v!==undefined,data:()=>v};};
        window._fsGetDoc=async r=>{if(window._failKeys.has(r.id))throw new Error('read fail '+r.id);return snap(r);};
        window._fsSetDoc=async(r,d)=>{if(window._failKeys.has(r.id))throw new Error('write fail '+r.id);store.set(key(r),JSON.parse(JSON.stringify(d)));};
        window._fsRunTxn=async(db,fn)=>{const staged=[];const txn={get:async r=>{if(window._failKeys.has(r.id))throw new Error('txn fail '+r.id);return snap(r);},set:(r,d)=>staged.push([key(r),JSON.parse(JSON.stringify(d))])};
          const out=await fn(txn);if(window._txnDelay)await new Promise(res=>setTimeout(res,window._txnDelay));staged.forEach(([k,d])=>store.set(k,d));return out;};
        const put=(k,v)=>store.set('classrooms/'+TESK_ROOM+'/data/'+k,{value:v});
        const roster=students.map(s=>({...s}));
        put('tesk-students',[...roster,{num:30,name:'다른기기학생',points:5}]);
        put('pesk-checklists',{'2026-09-01':{c1:{1:{checked:true},2:{checked:true}}}});
        put('pesk-quiz-progress',{1:{xp:3},2:{xp:4}});
        put('pesk-purchase-log',[{studentNum:1,type:'shop_buy',delta:-5},{studentNum:2,type:'shop_buy',delta:-3}]);
        put('pesk-deposits',{1:[{amount:10}],2:[{amount:20}]});
        records[1]={fields:{comprehensive:'삭제될 기록임.'},notes:[],year:RecordCheck.schoolYear(),name:students[0].name};
        examResults.push({id:'exdel',name:'<b>단원평가</b>',subject:'수학',date:'2026-09-01',totalQ:10,avgScore:75,wrongFreq:[],results:[{num:1,name:'a',took:true,score:50,wrongs:[1,2]},{num:2,name:'b',took:true,score:100,wrongs:[]}]});
        challengeAwards['manual:ch1:1']={studentNum:1};challengeAwards['manual:ch1:11']={studentNum:11};
      });
      const confirmNext=async()=>{await frame.waitForFunction(()=>document.getElementById('modal-app-form').classList.contains('open'));await frame.locator('#app-form-submit').click();};
      // 1) 삭제: 모든 연결 자료가 지워지고, 이 화면에 없던 30번은 남습니다.
      const del1=frame.evaluate(()=>deleteStudent(1));await confirmNext();await del1;
      const after=await frame.evaluate(()=>{const g=k=>window._memStore.get('classrooms/'+TESK_ROOM+'/data/'+k)?.value;
        const ex=examResults.find(e=>e.id==='exdel');
        return {roster:g('tesk-students').map(s=>s.num),check:Object.keys(g('pesk-checklists')['2026-09-01'].c1),quiz:Object.keys(g('pesk-quiz-progress')),log:g('pesk-purchase-log').length,dep:Object.keys(g('pesk-deposits')),
          rec:!!records[1],exNums:ex.results.map(r=>r.num),avg:ex.avgScore,aw:Object.keys(challengeAwards).filter(k=>k.startsWith('manual:ch1')),local:students.some(s=>Number(s.num)===1)};});
      assert.ok(!after.roster.includes(1));assert.ok(after.roster.includes(30));assert.ok(!after.local);
      assert.deepEqual(after.check,['2']);assert.deepEqual(after.quiz,['2']);assert.equal(after.log,1);assert.deepEqual(after.dep,['2']);
      assert.equal(after.rec,false);assert.deepEqual(after.exNums,[2]);assert.equal(after.avg,100);assert.deepEqual(after.aw,['manual:ch1:11']);
      // 2) 한 단계라도 실패하면 학생을 명단에서 빼지 않습니다.
      await frame.evaluate(()=>window._failKeys.add('pesk-deposits'));
      const del2=frame.evaluate(()=>deleteStudent(2));await confirmNext();await del2;
      assert.ok(await frame.evaluate(()=>students.some(s=>Number(s.num)===2)));
      assert.match(await frame.locator('#toast-msg').innerText(),/예금/);
      await frame.evaluate(()=>window._failKeys.clear());
      // 3) 오래된 화면에서 서버에 이미 있는 번호로 추가하면 막고 명단을 새로 불러옵니다.
      const clash=await frame.evaluate(async()=>{students=students.filter(s=>Number(s.num)!==30);try{await saveStudentRosterPreservingMoney(students.concat({num:30,name:'새학생',points:0}),{addNums:[30]});return 'saved';}catch(e){return e.constructor.name+'|'+students.find(s=>Number(s.num)===30)?.name;}});
      assert.equal(clash,'RosterConflictError|다른기기학생');
      // 4) 백업: 읽기 실패가 있으면 파일을 만들지 않습니다.
      let downloads=0;const onDl=()=>downloads++;page.on('download',onDl);
      await frame.evaluate(()=>window._failKeys.add('tesk-jobs'));
      assert.equal(await frame.evaluate(()=>exportClassBackup()),false);
      await frame.evaluate(()=>window._failKeys.clear());
      // 5) 복원: 복원 전 자동 백업을 받고, 트랜잭션이 실패하면 아무것도 바뀌지 않습니다.
      const beforeRoster=await frame.evaluate(()=>JSON.stringify(window._memStore.get('classrooms/'+TESK_ROOM+'/data/tesk-students')));
      const restore=frame.evaluate(()=>{const f=new File([JSON.stringify({format:'tesk-class-backup',version:1,roomId:TESK_ROOM,docs:{'tesk-students':[{num:1,name:'복원학생',points:0}],'tesk-jobs':[],'evil-key':{x:1}}})],'b.json');
        const real=window._fsRunTxn;window._fsRunTxn=async()=>{window._fsRunTxn=real;throw new Error('commit failed');};return importClassBackup(f);});
      await confirmNext();await restore;
      assert.equal(downloads,1);
      assert.equal(await frame.evaluate(()=>JSON.stringify(window._memStore.get('classrooms/'+TESK_ROOM+'/data/tesk-students'))),beforeRoster);
      assert.match(await frame.locator('#toast-msg').innerText(),/바뀌지 않았어요/);
      assert.equal(await frame.evaluate(()=>window._memStore.has('classrooms/'+TESK_ROOM+'/data/evil-key')),false);
      page.off('download',onDl);
      // 6) 포인트 두 번 탭: 처리 중에는 한 번만 지급됩니다.
      const pts=await frame.evaluate(async()=>{window._txnDelay=300;const idx=students.findIndex(s=>Number(s.num)===2);const before=Number(students[idx].points||0);
        window.pushTeacherEconLog=async()=>{};
        await Promise.all([givePoint(idx,10,'테스트'),givePoint(idx,10,'테스트')]);window._txnDelay=0;
        return Number(students.find(s=>Number(s.num)===2).points||0)-before;});
      assert.equal(pts,10);
      // 7) 통계: 학생 제출 글을 세고, 이름은 이스케이프합니다.
      await frame.evaluate(async()=>{students.find(s=>Number(s.num)===2).name='<i>둘</i>';peskWritingsAll=[{id:'pw1',studentNum:3,title:'가을',content:'글',feedback:''}];goPage('stats');await renderStats();});
      assert.equal(await frame.locator('#point-chart i').count(),0);
      assert.match(await frame.locator('#writing-chart').innerText(),/전체 제출\s*\n?\s*[1-9]/);
      await frame.evaluate(()=>{goPage('exam');renderExam();});
      assert.equal(await frame.locator('.exam-info-title b').count(),0);
    });
    await check('mobile back control and form editor',async()=>{
      await page.setViewportSize({width:390,height:844});await frame.evaluate(()=>{goPage('ai-assist');switchAiTab(4);});
      assert.equal(await frame.locator('.workspace-back').isVisible(),true);
      assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,'mobile-form.png'),animations:'disabled'});
    });
    assert.deepEqual(errors,[]);console.log('ALL TEACHER FEATURE CHECKS PASSED');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
