// Uses the isolated previews; no production classroom is read or changed.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1' || /fonts\.|cdn.jsdelivr/.test(r.request().url()) ? r.continue() : r.abort());
    await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');
    let frame=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
    await frame.waitForFunction(()=>window.TeskUI && document.querySelectorAll('.attention-row').length===2);
    await frame.evaluate(()=>{goPage('economy');openClassRewardFormT();});
    assert.equal(await frame.locator('#shop-name').inputValue(),'체육 시간 1회');
    assert.equal(await frame.locator('#shop-boss-reward').isChecked(),true);
    assert.equal(await frame.locator('#shop-price').isDisabled(),true);
    await frame.evaluate(()=>addShopItem());
    const selected=await frame.evaluate(()=>shopItems.find(i=>i.bossReward));assert.equal(selected.name,'체육 시간 1회');
    await frame.evaluate(()=>{
      const cfg={enabled:true,roundId:'test-boss',name:'우리 반 골렘',maxHp:100,entryNeed:0};
      const progress={1:{boss:{roundId:'test-boss',dmg:100}}};
      const result=PeskBossQuest.plan(cfg,progress,shopItems,[]);
      window.classTestDocs={'pesk-class-boss':cfg,'pesk-quiz-progress':result.all,'tesk-shop':shopItems,'pesk-purchases':result.buys};
      _fsDoc=(_,...parts)=>parts.at(-1);_fsGetDoc=async k=>({exists:()=>!!classTestDocs[k],data:()=>({value:structuredClone(classTestDocs[k])})});
      _fsRunTxn=async(_,fn)=>{const writes=[];await fn({get:_fsGetDoc,set:(k,v)=>writes.push([k,v.value])});for(const [k,v] of writes)classTestDocs[k]=structuredClone(v);};
      openAppConfirmModal=async()=>true;
      saveLocal('pesk-class-boss',cfg);qzProgress=result.all;goPage('adventure');renderBoss();
    });
    await frame.locator('[data-class-reward]').waitFor();
    assert.equal(await frame.locator('#qz-goal-list').isVisible(),false);
    fs.mkdirSync('output/class-quest',{recursive:true});
    await frame.locator('#boss-panel').scrollIntoViewIfNeeded();
    await page.screenshot({path:'output/class-quest/teacher.png'});
    await frame.locator('[data-class-reward]').click();
    await frame.waitForFunction(()=>classTestDocs['pesk-purchases'][0].status==='used_all');
    await frame.locator('#class-quest-inventory').getByText('✅ 제공 완료').waitFor();
    await frame.evaluate(()=>{shopItems.push({id:'pencil',name:'연필',price:10,stock:5});renderBoss();});
    await frame.locator('#boss-reward-xp').fill('100');
    await frame.locator('#boss-reward-item').selectOption('pencil');
    await frame.locator('#boss-reward-qty').fill('2');
    await frame.evaluate(()=>saveBoss(true));
    const personal=await frame.evaluate(()=>bossCfgT());
    assert.equal(personal.rewardXp,100);assert.equal(personal.rewardItemId,'pencil');assert.equal(personal.rewardItemQty,2);
    assert.notEqual(personal.roundId,'test-boss');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.goto('http://127.0.0.1:8765/_adventure_preview.html');
    frame=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
    await frame.waitForFunction(()=>window._fbReady && document.getElementById('panel-myroom'));
    await frame.evaluate(()=>{
      rpgStopShooter();
      const cfg={enabled:true,roundId:'shared-round',name:'우리 반 골렘',maxHp:100,entryNeed:0};
      shopItems=[{id:'pe',name:'체육 시간 1회',icon:'⚽',bossReward:true,price:0,stock:0}];
      const out=PeskBossQuest.plan(cfg,{1:{boss:{roundId:cfg.roundId,dmg:100}}},shopItems,[]);
      _applyQuizProgress(out.all);_applyBossCfg(cfg);applyClassBossPurchases(out.buys);
      subscribeToUpdates=()=>{};
      renderDashboard();openClassBossRewards();
    });
    await frame.locator('#panel-shop').getByText('⚽ 체육 시간 1회',{exact:true}).waitFor();
    assert.equal(await frame.locator('#panel-shop').getByText('🎉 우리 반이 획득했어요',{exact:true}).count(),1);
    assert.equal(await frame.locator('#panel-shop').getByText('제공 완료로 표시',{exact:true}).count(),0);
    await page.screenshot({path:'output/class-quest/student-mobile.png'});
    await frame.evaluate(()=>{
      const rows=PeskBossQuest.complete(classBossRewards,classBossRewards[0].id);
      applyClassBossPurchases(rows);switchShopPanelTab('classrewards');
    });
    await frame.locator('#panel-shop').getByText('✅ 제공 완료',{exact:true}).waitFor();
    assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: teacher personal XP/item settings, class activity creation/grant/completion, student shared status and mobile layout.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
