// Real pages and DOM, isolated fictional classroom; all external requests are blocked.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-gpu','--disable-features=CalculateNativeWinOcclusion']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),errors=[],dialogs=[];
  const root='classrooms/test/data/',docs={
   'classCodes/123456':{roomId:'test'},'classrooms/test/info/meta':{className:'테스트 학급'},
   [root+'tesk-accounts']:{value:{1:{id:'test',pw:'pass',accountUid:'student1',sessionVersion:1,mustChangePassword:false,studentNum:1,roomId:'test'}}},
   [root+'tesk-students']:{value:[{num:1,name:'테스트 학생',points:0}]},[root+'tesk-settings']:{value:{className:'테스트 학급'}},
   [root+'pesk-writings']:{value:[]}
  };
  // STUDENT_AUTH_SMOKE=1: 서버 인증 플래그 경로, =free: 학급별 무료 인증(_studentAuthFor) 경로. 둘 다 같은 가상 백엔드를 쓴다.
  const authMode=process.env.STUDENT_AUTH_SMOKE==='free'?'free':(process.env.STUDENT_AUTH_SMOKE==='1'?'server':'');
  const serverMode=!!authMode;
  let signOuts=0,identity=null,privateReads=0;
  if(serverMode){
   const snap=r=>({exists:docs[r.path]!==undefined,get:k=>structuredClone(docs[r.path]?.[k]),data:()=>structuredClone(docs[r.path])});
   const db={doc:path=>({path,get:async()=>snap({path})}),runTransaction:async fn=>{const writes=[];const out=await fn({get:async r=>snap(r),set:(r,v)=>writes.push([r.path,v])});for(const [p,v]of writes)docs[p]=structuredClone(v);return out;}};
   class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
   const server=require('../functions/student-auth').createStudentAuth({db,auth:{createCustomToken:async(uid,token)=>{identity={uid,token};return 'mock-signed-token';}},HttpsError});
   await context.exposeBinding('__studentAuth',async(_,action,data)=>{
    if(action==='login')return server.studentLogin({data,rawRequest:{ip:'127.0.0.1'}});
    if(action==='change')return server.studentChangePassword({data,auth:identity});
    if(action==='session')return server.studentSession({data,auth:identity});
   });
  }
  await context.exposeBinding('__fakeDb',async(_,op,key,value)=>{
   if(serverMode&&key?.endsWith('/tesk-accounts')){privateReads++;throw Error('private account document denied');}
   if(op==='get')return docs[key]??null;
   if(op==='list')return Object.entries(docs).filter(([k])=>k.startsWith(key+'/')&&!k.slice(key.length+1).includes('/')).map(([k,v])=>({id:k.split('/').at(-1),value:v}));
   if(op==='commit'){for(const [k,v]of value)docs[k]=v;return;}
   if(op==='signout'){signOuts++;identity=null;return;}
  });
  await context.addInitScript(authMode=>{
   if(authMode){
    const api={studentSignIn:(roomId,id,pw)=>__studentAuth('login',{roomId,id,pw}),
     changePassword:(roomId,newPassword)=>__studentAuth('change',{roomId,newPassword}),
     verifySession:expected=>__studentAuth('session',{roomId:expected.roomId})};
    if(authMode==='free') window._studentAuthFor=async roomId=>roomId==='test'?api:null;
    else {window.TESK_USE_SERVER_STUDENT_AUTH=true;window._studentAuthApi=api;}
   }
   const ref=(base,...parts)=>{const path=[base?.path,...(parts.length?parts:[crypto.randomUUID()])].filter(Boolean).join('/');return {path,id:path.split('/').at(-1)};};
   const snap=(r,v)=>({id:r.id,exists:()=>v!==null,data:()=>v});
   window._db={};window._fbReady=true;window._auth={currentUser:{uid:'fake'}};
   window._signOut=async()=>{await __fakeDb('signout');_auth.currentUser=null;};
   window._fsDoc=ref;window._fsCollection=ref;
   window._fsGetDoc=async r=>snap(r,await __fakeDb('get',r.path));
   window._fsGetDocs=async r=>({docs:(await __fakeDb('list',r.path)).map(d=>({id:d.id,data:()=>d.value}))});
   window._fsSetDoc=async(r,v)=>__fakeDb('commit',null,[[r.path,v]]);
   window._fsRunTxn=async(_,fn)=>{const writes=[];const v=await fn({get:_fsGetDoc,set:(r,v)=>writes.push([r.path,v])});await __fakeDb('commit',null,writes);return v;};
   window._fsOnSnapshot=()=>()=>{};
   localStorage.setItem('pesk-my-deposits','{bad json');
  },authMode);
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
   if(u.pathname.endsWith('.html')){
    const file=path.join(process.cwd(),u.pathname.slice(1));
    const html=fs.readFileSync(file,'utf8').replace(/<script type="module">[\s\S]*?<\/script>/g,'');
    return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
   }
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
  await page.goto('http://127.0.0.1:8765/landing.html');
  for(let i=0;i<6;i++)await page.locator('#d'+i).fill(String(i+1));await page.locator('#code-btn').click();
  await page.locator('#login-id').fill('test');await page.locator('#login-pw').fill('pass');await page.locator('#login-btn').click();
  await page.waitForURL('**/pesk.html');await page.waitForFunction(()=>document.querySelector('#panel-writing'));
  assert.equal(await page.evaluate(()=>getMyStudent().name),'테스트 학생');
  const another=await context.newPage();await another.goto('http://127.0.0.1:8765/landing.html');assert.equal(await page.evaluate(()=>localStorage.getItem('pesk-account-uid')),'student1');await another.close();
  await page.getByRole('button',{name:'지금 글쓰기 하러 가기 →'}).click();
  await page.evaluate(()=>{showTab('writing');toggleWritingForm(true);});
  await page.locator('#w-title-inp').fill('오늘의 글');await page.locator('#w-content-inp').fill('친구와 도와주며 공부했습니다.');
  await page.evaluate(()=>{addTxn=()=>{throw Error('QuotaExceededError');};petGrow=async()=>{throw Error('reward unavailable');};});
  await page.locator('#writing-form-wrap .pesk-btn.primary').click();await page.waitForFunction(()=>document.querySelector('#pesk-notice')?.textContent==='글이 제출됐어요.');
  assert.equal(Object.keys(docs).filter(k=>k.includes('/items/')).length,1);assert.deepEqual(dialogs,[]);
  await page.getByRole('button',{name:'🚪 로그아웃'}).click();await page.waitForURL('**/landing.html');assert.equal(signOuts,1);assert.equal(await page.evaluate(()=>localStorage.getItem('pesk-account-uid')),null);
  await page.goBack();assert.equal(await page.evaluate(()=>localStorage.getItem('pesk-account-uid')),null);assert.equal(await page.locator('#w-content-inp').count(),0);
  if(serverMode){
   assert.equal(privateReads,0);assert.equal(docs[root+'tesk-accounts'].value[1].pw,undefined);
   docs[root+'tesk-accounts'].value[1].mustChangePassword=true;
   await page.goto('http://127.0.0.1:8765/landing.html');
   await page.evaluate(()=>backToStep1());
   for(let i=0;i<6;i++)await page.locator('#d'+i).fill(String(i+1));await page.locator('#code-btn').click();
   await page.locator('#login-id').fill('test');await page.locator('#login-pw').fill('pass');await page.locator('#login-btn').click();
   await page.locator('#new-pw').fill('changed');await page.locator('#new-pw-confirm').fill('changed');await page.locator('#changepw-btn').click();
   await page.waitForURL('**/pesk.html');await page.waitForFunction(()=>document.querySelector('#panel-writing'));
   assert.equal(privateReads,0);assert.equal(docs[root+'tesk-accounts'].value[1].sessionVersion,2);
  }
  assert.deepEqual(errors,[]);console.log('PASS browser: '+(serverMode?authMode+' authentication, private account denial, password change; ':'')+'login, second login tab, corrupted cache, writing with failed history/reward, Firebase logout and Back');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
