// 학생 앱 실제 화면: 선생님이 끈 메뉴는 탭·더보기·오늘 할 일에서 사라지고 열리지 않는다. 글쓰기는 항상 켜져 있다.
// 정적 서버(127.0.0.1:8765)가 떠 있어야 한다. 외부 요청은 모두 막는다.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];
  const root='classrooms/test/data/',docs={
   [root+'tesk-accounts']:{value:{1:{id:'test',pw:'pass',accountUid:'student1',sessionVersion:1,mustChangePassword:false,studentNum:1,roomId:'test'}}},
   [root+'tesk-students']:{value:[{num:1,name:'테스트 학생',points:5000}]},
   [root+'tesk-settings']:{value:{className:'테스트 학급'}},[root+'pesk-writings']:{value:[]},
   [root+'pesk-features']:{value:{shop:false,myroom:false,counsel:false,stock:false,checklist:false,challenge:false}}
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
   window._fsDoc=ref;window._fsCollection=ref;window._fsQuery=(r)=>r;window._fsWhere=()=>null;
   window._fsGetDoc=async r=>snap(r,await __fakeDb('get',r.path));
   window._fsGetDocs=async r=>({docs:(await __fakeDb('list',r.path)).map(d=>({id:d.id,data:()=>d.value}))});
   window._fsSetDoc=async(r,v)=>__fakeDb('commit',null,[[r.path,v]]);
   window._fsRunTxn=async(_,fn)=>{const writes=[];const v=await fn({get:_fsGetDoc,set:(r,v)=>writes.push([r.path,v])});await __fakeDb('commit',null,writes);return v;};
   // pesk-features 구독만 붙잡아 두고 테스트에서 직접 흘려보낸다
   window._fsOnSnapshot=(r,cb)=>{if(r.path.endsWith('/pesk-features'))window.__featSnap=cb;return()=>{};};
   Object.entries({'pesk-room-id':'test','pesk-student-num':'1','pesk-student-name':'테스트 학생','pesk-account-uid':'student1','pesk-session-version':'1','pesk-login-id':'test','pesk-class-name':'테스트 학급'}).forEach(([k,v])=>localStorage.setItem(k,v));
   window.confirm=()=>true;window.alert=m=>{(window.__alerts=window.__alerts||[]).push(m);};
  });
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
   if(u.pathname.endsWith('.html')){
    const html=fs.readFileSync(path.join(process.cwd(),u.pathname.slice(1)),'utf8').replace(/<script type="module">[\s\S]*?<\/script>/g,'');
    return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
   }
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/pesk.html');
  await page.waitForFunction(()=>typeof getMyStudent==='function'&&getMyStudent()&&document.getElementById('panel-shop')&&window.__featSnap);
  await page.addStyleTag({content:'#morning-overlay{display:none!important}'});
  const shown=id=>page.evaluate(id=>{const el=document.getElementById(id);return !!el&&el.style.display!=='none';},id);
  const panel=()=>page.evaluate(()=>['home','adventure','boss','shop','myroom','writing','counsel','stock','checklist','challenge'].find(t=>document.getElementById('panel-'+t)?.style.display!=='none'));
  // 꺼진 메뉴는 버튼이 없고, 더보기 안이 모두 꺼졌으니 더보기도 없다
  for(const id of ['tab-shop','bottom-tab-shop','tab-myroom','tab-counsel','more-tab-stock','more-tab-checklist','more-tab-challenge','bottom-tab-more','tab-more'])
   assert.equal(await shown(id),false,id+' 숨김');
  for(const id of ['tab-home','tab-writing','bottom-tab-writing'])assert.equal(await shown(id),true,id+' 보임');
  // 바로가기로도 열리지 않는다
  await page.evaluate(()=>showTab('shop'));assert.equal(await panel(),'home');
  await page.evaluate(()=>openBankFromToday());assert.equal(await panel(),'home');
  await page.evaluate(()=>showTab('writing'));assert.equal(await panel(),'writing');
  await page.screenshot({path:path.join('output','pesk-features-off.png')});
  // 선생님이 다시 켜면 바로 보인다
  await page.evaluate(()=>__featSnap({exists:()=>true,data:()=>({value:{}})}));
  for(const id of ['tab-shop','bottom-tab-shop','tab-myroom','more-tab-stock','bottom-tab-more'])assert.equal(await shown(id),true,id+' 다시 보임');
  // 보고 있던 화면을 끄면 오늘 화면으로 돌아간다
  await page.evaluate(()=>showTab('shop'));assert.equal(await panel(),'shop');
  await page.evaluate(()=>__featSnap({exists:()=>true,data:()=>({value:{shop:false}})}));
  assert.equal(await panel(),'home');assert.equal(await shown('tab-shop'),false);
  assert.deepEqual(errors,[]);
  console.log('pesk-features smoke ok');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
