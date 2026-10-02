// Run with the local preview server on port 8765. No production Firebase is used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu','--disable-features=CalculateNativeWinOcclusion']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1'||url.hostname==='localhost'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'||url.hostname==='cdn.jsdelivr.net')return route.continue();
      return route.abort();
    });
    await page.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');
    const frame=await page.locator('iframe').elementHandle().then(e=>e.contentFrame());
    await frame.waitForFunction(()=>window.TeskUI&&document.querySelectorAll('.attention-row').length>0).catch(async e=>{console.error(await frame.evaluate(()=>({ready:document.readyState,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),body:document.body.innerText.slice(0,1200)})));throw e;});
    await page.waitForTimeout(2000);
    const output=path.resolve('output/teacher-ui');fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    const nav=await frame.locator('.nav-item[data-page]').evaluateAll(nodes=>nodes.map(n=>n.dataset.page));
    for(const id of nav){
      await frame.locator(`.nav-item[data-page="${id}"]`).click();
      assert.equal(await frame.locator('.page.active').getAttribute('id'),'page-'+id);
      assert.equal(await frame.locator(`.nav-item[data-page="${id}"]`).getAttribute('aria-current'),'page');
    }
    assert.equal(await frame.locator('#page-workspace #backup-restore-file').count(),1);
    assert.equal(await frame.locator('#writing-entry-content').evaluate(el=>el.tagName),'TEXTAREA');
    for(const [tab,id] of [['quiz','adventure'],['checklist','checklist'],['myroom','myroom']]){
      await frame.evaluate(tab=>showEconTab(tab),tab);
      assert.equal(await frame.locator('.page.active').getAttribute('id'),'page-'+id);
      assert.equal(await frame.locator(`#econ-panel-${tab}`).isVisible(),true);
    }
    await frame.evaluate(()=>goPage('economy'));
    for(const tab of ['shop','job','stock','bank','tax','log','assets','report']){
      await frame.locator('#econ-tab-'+tab).click();
      assert.equal(await frame.locator('#econ-panel-'+tab).isVisible(),true);
      assert.equal(await frame.locator('#econ-tab-'+tab).getAttribute('aria-selected'),'true');
    }
    await frame.evaluate(()=>goPage('home'));
    await frame.locator('.menu-search-trigger').click();
    await frame.getByRole('searchbox').fill('보스');
    await frame.getByRole('searchbox').press('Enter');
    assert.equal(await frame.locator('.page.active').getAttribute('id'),'page-adventure');
    await frame.locator('.menu-search-trigger').click();
    await frame.getByRole('searchbox').fill('zzzz없는메뉴');
    assert.equal(await frame.locator('.search-empty').count(),1);
    await frame.getByRole('searchbox').press('Escape');
    assert.equal(await frame.locator('dialog').isVisible(),false);
    await page.setViewportSize({width:390,height:844});
    for(const id of nav){
      await frame.evaluate(id=>goPage(id),id);
      const sizes=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(sizes.scroll<=sizes.width+1,`${id}: ${JSON.stringify(sizes)}`);
      if(id==='checklist')await page.screenshot({path:path.join(output,'mobile-checklist.png'),animations:'disabled'});
    }
    await frame.evaluate(()=>goPage('home'));
    await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
    await frame.locator('.sidebar-toggle').click();
    assert.equal(await frame.locator('body').evaluate(el=>el.classList.contains('sidebar-open')),true);
    await page.screenshot({path:path.join(output,'mobile-menu.png')});
    await frame.locator('[data-page="adventure"]').click();
    assert.equal(await frame.locator('body').evaluate(el=>el.classList.contains('sidebar-open')),false);
    await page.setViewportSize({width:1440,height:1050});
    await page.screenshot({path:path.join(output,'adventure.png')});
    // A real-time checklist callback must refresh its relocated page.
    const source=fs.readFileSync(path.resolve('tesk_teacher_v2.html'),'utf8');
    assert.equal((source.match(/page-checklist'\)\?\.classList.contains\('active'\)/g)||[]).length,3);
    const duplicateIds=await frame.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,index,all)=>all.indexOf(id)!==index));
    assert.deepEqual(duplicateIds,[]);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,pages:nav.length,economyTabs:8,widths:[1440,390],screenshots:output},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
