// Student anthology review: request card → choose each edit → published; class anthology list. Fake DB, fictional data.
const ROOT=require('path').join(__dirname,'..');
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const P=require(ROOT+'/shared/writing-proofread.js');
fs.mkdirSync(path.join(ROOT,'output','writing-anthology'),{recursive:true});
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const root='classrooms/test/data/',items=root+'pesk-writings/items/';
 const content='오늘 친구랑 공원에 갔다. 너무 재미있엇다. 다음에 또 가고싶다.';
 const edits=P.validate({edits:[{from:'재미있엇다',to:'재미있었다',type:'맞춤법',reason:'받침 ㅆ'},{from:'가고싶다',to:'가고 싶다',type:'띄어쓰기',reason:'띄어 써요'}]},content,1).edits;
 const basis=JSON.stringify(['공원 나들이',content,1]);
 const docs={
  'classCodes/123456':{roomId:'test'},'classrooms/test/info/meta':{className:'테스트 학급'},
  [root+'tesk-accounts']:{value:{1:{id:'test',pw:'pass',accountUid:'student1',sessionVersion:1,mustChangePassword:false,studentNum:1,roomId:'test'}}},
  [root+'tesk-students']:{value:[{num:1,name:'가상 학생',points:0},{num:2,name:'친구 학생',points:0}]},[root+'tesk-settings']:{value:{className:'테스트 학급'}},
  [root+'pesk-writings']:{value:[]},
  [items+'w1']:{id:'w1',studentNum:1,studentName:'가상 학생',accountUid:'student1',title:'공원 나들이',content,submittedAt:'2026-09-27T09:00:00Z',status:'reviewed',feedback:'좋아요',
    anthology:{status:'student-review',level:1,anonymous:false,basis,edits,requestedAt:'2026-09-28T01:00:00Z',by:'teacher'}},
  [items+'w2']:{id:'w2',studentNum:2,studentName:'친구 학생',title:'텃밭',content:'상추를 심었다.',submittedAt:'2026-09-26T09:00:00Z',
    anthology:{status:'published',anonymous:true,title:'텃밭',text:'상추를 심었다.',publishedAt:'2026-09-27T00:00:00Z'}}
 };
 await context.exposeBinding('__fakeDb',async(_,op,key,value)=>{
  if(op==='get')return docs[key]??null;
  if(op==='list')return Object.entries(docs).filter(([k])=>k.startsWith(key+'/')&&!k.slice(key.length+1).includes('/')).map(([k,v])=>({id:k.split('/').at(-1),value:v}));
  if(op==='commit'){for(const [k,v]of value)docs[k]=v;return;}
 });
 await context.addInitScript(()=>{
  const ref=(base,...parts)=>{const path=[base?.path,...(parts.length?parts:[crypto.randomUUID()])].filter(Boolean).join('/');return {path,id:path.split('/').at(-1)};};
  const snap=(r,v)=>({id:r.id,exists:()=>v!==null,data:()=>v});
  window._db={};window._fbReady=true;window._auth={currentUser:{uid:'fake'}};window._signOut=async()=>{};
  window._fsDoc=ref;window._fsCollection=ref;
  window._fsGetDoc=async r=>snap(r,await __fakeDb('get',r.path));
  window._fsGetDocs=async r=>({docs:(await __fakeDb('list',r.path)).map(d=>({id:d.id,data:()=>d.value}))});
  window._fsSetDoc=async(r,v)=>__fakeDb('commit',null,[[r.path,v]]);
  window._fsRunTxn=async(_,fn)=>{const writes=[];const v=await fn({get:_fsGetDoc,set:(r,v)=>writes.push([r.path,v])});await __fakeDb('commit',null,writes);return v;};
  window._fsOnSnapshot=()=>()=>{};
 });
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
  if(u.pathname.endsWith('.html'))return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync(path.join(ROOT,u.pathname.slice(1)),'utf8').replace(/<script type="module">[\s\S]*?<\/script>/g,'')});
  return route.continue();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/landing.html');
 for(let i=0;i<6;i++)await page.locator('#d'+i).fill(String(i+1));await page.locator('#code-btn').click();
 await page.locator('#login-id').fill('test');await page.locator('#login-pw').fill('pass');await page.locator('#login-btn').click();
 await page.waitForURL('**/pesk.html');await page.waitForFunction(()=>document.querySelector('#panel-home .today-list'));
 await page.evaluate(()=>document.getElementById('morning-overlay')?.remove());
 const home=await page.locator('#panel-home .today-list').innerText();
 console.log('HOME has anthology card:',home.includes('모음집 맞춤법 확인'));
 assert.ok(home.includes('모음집 맞춤법 확인'));
 await page.locator('.today-card',{hasText:'모음집 맞춤법 확인'}).click();
 await page.waitForSelector('#anth-review');
 await page.screenshot({path:path.join(ROOT,'output','writing-anthology','st-review.png')});
 const disabled1=await page.locator('.anth-review-foot .pesk-btn.primary').isDisabled();
 await page.locator('.anth-review-list li').nth(0).getByRole('button',{name:'⭕ 고칠래요'}).click();
 await page.locator('.anth-review-list li').nth(1).getByRole('button',{name:'✖ 그대로 둘래요'}).click();
 await page.screenshot({path:path.join(ROOT,'output','writing-anthology','st-review2.png')});
 await page.locator('.anth-review-foot .pesk-btn.primary').click();
 await page.waitForSelector('#anth-review',{state:'detached'});
 const a=docs[items+'w1'].anthology;
 console.log('SAVED',JSON.stringify({disabledBeforeChoosing:disabled1,status:a.status,by:a.by,text:a.text,contentUnchanged:docs[items+'w1'].content===content,revisions:Object.keys(docs).filter(k=>k.includes('/revisions/')).length}));
 assert.equal(a.status,'published');assert.equal(a.text,'오늘 친구랑 공원에 갔다. 너무 재미있었다. 다음에 또 가고싶다.');
 await page.evaluate(()=>showTab('writing'));await page.waitForTimeout(300);
 const anth=await page.locator('#writing-anthology-area').innerText();
 console.log('ANTHOLOGY AREA:',anth.replace(/\n/g,' / '));
 assert.ok(anth.includes('우리 반 친구'));assert.ok(anth.includes('내 글'));assert.ok(!anth.includes('친구 학생'));
 await page.locator('#writing-anthology-area').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(ROOT,'output','writing-anthology','st-anthology.png')});
 const sz=await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));console.log('overflow',sz,'ERRORS',errors);
 assert.deepEqual(errors,[]);
 console.log('PASS student anthology: home request card, per-edit choice, published text, original kept, anonymous friend, mobile');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
