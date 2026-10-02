// Isolated, fake classroom only. CDP sends real simultaneous touch pointers.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||/fonts\.|cdn.jsdelivr/.test(r.request().url())?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8765/_adventure_preview.html');
  await page.addStyleTag({content:'header{display:none}iframe{width:100%;height:100dvh;min-height:0;border:0;border-radius:0}'});
  const frame=await page.locator('iframe').elementHandle().then(x=>x.contentFrame());
  await frame.waitForFunction(()=>window._fbReady&&document.querySelector('.rpg-arena'));
  await frame.evaluate(()=>{rpgEnsureQuestion();rpgQ.responseMode='short';rpgQ.inputKind='number';avRefresh();});
  const input=frame.locator('#rpg-short-answer');await input.pressSequentially('123');
  await frame.evaluate(()=>{
   window.originalAnswer=document.getElementById('rpg-short-answer');
   window.originalRefresh=avRefresh;window.refreshCount=0;avRefresh=()=>{refreshCount++;originalRefresh();};
   for(let i=0;i<30;i++){
    const all=structuredClone(allQuizProgress);all[2]={xp:i,boss:{roundId:bossCfg.roundId,dmg:i}};
    receiveQuizProgress(all);renderEconomyPanels(getMyStudent());
   }
  });
  await page.waitForTimeout(350);
  assert.equal(await frame.evaluate(()=>originalAnswer===document.activeElement),true);
  assert.equal(await input.inputValue(),'123');assert.equal(await frame.evaluate(()=>refreshCount),0);
  await frame.locator('.answer-pad summary').click();
  await frame.locator('[data-answer-key="4"]').tap();assert.equal(await input.inputValue(),'1234');
  await frame.locator('[data-answer-key="backspace"]').tap();assert.equal(await input.inputValue(),'123');
  await frame.locator('[data-answer-key="clear"]').tap();assert.equal(await input.inputValue(),'');
  await frame.evaluate(()=>{document.activeElement.blur();rpgQ.inputKind='word';avRefresh();});
  await frame.locator('[data-answer-key="c"]').tap();await frame.locator('[data-answer-key="a"]').tap();await frame.locator('[data-answer-key="t"]').tap();
  assert.equal(await input.inputValue(),'cat');
  await frame.evaluate(async()=>{
   document.activeElement.blur();await rpgMutateProgress(current=>({...current,game:{...RPG.newGameState(),pendingAttack:{id:'tablet-test',monsterId:'m_mush',baseDamage:72,ammo:6,expMultiplier:1,weaponStyle:'sword',mode:'shooter',petId:'p_dog',petTier:'common'}}}));
   avRefresh();rpgStartShooter();rpgShooter.state.attackAt=1000;
  });
  const cdp=await context.newCDPSession(page);
  const center=async selector=>{const b=await frame.locator(selector).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2};};
  const stick=await center('[data-joystick]'),attack=await center('[data-rpg-action="a"]');
  const touch={id:1,x:stick.x+35,y:stick.y,radiusX:5,radiusY:5,force:1};
  const before=await frame.evaluate(()=>rpgShooter.state.x);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await frame.waitForFunction(x=>rpgShooter.state.x>x+10,before,{timeout:2000});
  await frame.evaluate(()=>{const s=rpgShooter.state;s.enemyX=s.x+70;s.enemyY=s.y;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch,{id:2,...attack,radiusX:5,radiusY:5,force:1}]});
  await page.waitForTimeout(100);assert.equal(await frame.evaluate(()=>rpgShooter.state.ammoUsed),1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touch]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(80);
  const stopped=await frame.evaluate(()=>rpgShooter.state.x);await page.waitForTimeout(150);
  assert.equal(await frame.evaluate(()=>rpgShooter.state.x),stopped);
  await frame.locator('[data-shooter-pause]').tap();assert.equal(await frame.evaluate(()=>rpgShooter.state.paused),true);
  await frame.locator('[data-shooter-pause]').tap();
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(150);await page.keyboard.up('ArrowLeft');
  assert.ok(await frame.evaluate(()=>rpgShooter.state.x)<stopped);
  fs.mkdirSync('output/tablet-boss',{recursive:true});
  for(const [name,width,height] of [['tablet',1024,768],['portrait',390,844],['landscape',844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   for(const selector of ['#rpg-shooter-host','[data-joystick]','[data-rpg-action="a"]','[data-rpg-action="f"]']){
    const b=await frame.locator(selector).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${name} ${selector}: ${JSON.stringify(b)}`);
   }
   await page.screenshot({path:`output/tablet-boss/${name}.png`});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: 30 live updates retain input/IME without replacing the question, numeric/English keypad, simultaneous joystick + attack, cancel/pause/keyboard, portrait/landscape controls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
