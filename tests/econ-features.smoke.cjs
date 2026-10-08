// 학생 앱 실제 화면: 공동 기금 기부 · 경매 입찰/환불 · 세금 영수증 · 예금 규칙 안내 · 우리반 펀드. 외부 요청은 모두 막는다.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];
  const root='classrooms/test/data/',ends=new Date(Date.now()+3600000).toISOString(),docs={
   [root+'tesk-accounts']:{value:{1:{id:'test',pw:'pass',accountUid:'student1',sessionVersion:1,mustChangePassword:false,studentNum:1,roomId:'test'}}},
   [root+'tesk-students']:{value:[{num:1,name:'테스트 학생',points:5000,taxDue:300,taxReceipt:{name:'재산세',at:'2026-10-08T00:00:00Z',assets:60000,tax:700,prevDue:0,paid:400,due:300,parts:[{from:10000,portion:40000,rate:1,tax:400},{from:50000,portion:10000,rate:3,tax:300}]}},{num:2,name:'친구',points:3000}]},
   [root+'tesk-settings']:{value:{className:'테스트 학급'}},[root+'pesk-writings']:{value:[]},
   [root+'tesk-bank-settings']:{value:{maxPerStudent:50000,earlyPct:0}},
   [root+'tesk-wealth-tax']:{value:{enabled:true,toFund:true,brackets:[{min:0,rate:0},{min:10000,rate:1},{min:50000,rate:3}]}},
   [root+'pesk-class-fund']:{value:{balance:500,goals:[{id:'g1',title:'금요일 영화',icon:'🎬',target:3000,raised:1000,status:'open',donors:['2']}],history:[]}},
   [root+'pesk-auctions']:{value:[{id:'a1',title:'자리 먼저 고르기',icon:'🪑',startPrice:1000,step:200,endsAt:ends,status:'open',bids:[],top:{num:2,name:'친구',amount:1000}},
     {id:'s1',kind:'seats',title:'자리 경매',startPrice:300,step:100,endsAt:ends,status:'open',layout:{rows:3,cols:4,pairDesks:true},lots:[{seat:0,top:{num:2,amount:300},bids:1},{seat:1},{seat:5}]}]},
   [root+'tesk-stock-prices']:{value:{'005930':7500}}
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
   window._fsOnSnapshot=()=>()=>{};
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
  await page.waitForFunction(()=>typeof getMyStudent==='function'&&getMyStudent()&&document.getElementById('panel-shop'));
  await page.addStyleTag({content:'#morning-overlay{display:none!important}'});   // 아침 글쓰기 안내 창은 이 검사와 무관
  // 공동 기금은 꺼 두었다 — 공동 보상 탭에 기부 칸이 없어야 한다
  await page.evaluate(()=>{showTab('shop');switchShopPanelTab('classrewards');});
  assert.equal(await page.locator('#fund-amt-g1').count(),0);assert.doesNotMatch(await page.locator('#panel-shop').innerText(),/공동 기금/);
  // 경매 입찰 → 친구 환불
  await page.evaluate(()=>switchShopPanelTab('auction'));
  await page.waitForSelector('#bid-a1');
  await page.fill('#bid-a1','1200');
  await page.evaluate(()=>bidAuction('a1'));
  await page.waitForFunction(()=>getMyStudent().points===3800);
  const studs=docs[root+'tesk-students'].value;assert.equal(studs[1].points,4000,'이전 최고 입찰자 환불');
  assert.equal(docs[root+'pesk-auctions'].value[0].top.num,1);
  assert.match(await page.locator('#panel-shop').innerText(),/내가 최고 입찰자예요/);
  await page.locator('#panel-shop').screenshot({path:path.join('output','econ-student-auction.png')});
  // 자리 경매: 자리표에서 자리를 골라 입찰 → 친구 환불, 금액만 보이고 이름은 안 보인다
  const seatText=await page.locator('#panel-shop').innerText();
  assert.match(seatText,/교탁/);assert.doesNotMatch(seatText,/친구.*최고/);
  await page.evaluate(()=>pickSeatLot('s1',0));
  await page.fill('#seatbid-s1','400');
  await page.evaluate(()=>bidSeat('s1'));
  await page.waitForFunction(()=>getMyStudent().points===3400);
  assert.equal(docs[root+'tesk-students'].value[1].points,4300,'자리 경매 이전 최고 입찰자 환불');
  assert.equal(docs[root+'pesk-auctions'].value[1].lots[0].top.num,1);
  await page.evaluate(()=>pickSeatLot('s1',1));await page.fill('#seatbid-s1','300');await page.evaluate(()=>bidSeat('s1'));
  await page.waitForFunction(()=>document.body.innerText.includes('한 번에 한 자리만'));   // 앱 안내 창
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#panel-shop').innerText(),/1줄 1번째 자리에서 내가 최고 입찰자예요/);
  await page.evaluate(()=>{const c=[...document.querySelectorAll('#panel-shop .qz-goal')].find(x=>x.innerText.includes('교탁'));c&&c.scrollIntoView();});
  await page.locator('#panel-shop .qz-goal', {hasText:'교탁'}).screenshot({path:path.join('output','econ-student-seat.png')});
  // 은행: 세금 영수증 · 재산세 안내 · 예금 규칙 · 우리반 펀드
  await page.evaluate(()=>{showTab('stock');switchBankTab('dashboard');});
  const dash=await page.locator('#panel-stock').innerText();
  await page.locator('#panel-stock').screenshot({path:path.join('output','econ-student-tax.png')});
  assert.match(dash,/재산세 영수증/);assert.match(dash,/아직 내지 못한 세금 300/);assert.match(dash,/예상 재산세/);
  await page.evaluate(()=>switchBankTab('bank'));
  assert.match(await page.locator('#panel-stock').innerText(),/1인 예금 한도 50,000/);
  await page.evaluate(()=>switchBankTab('stock'));
  const stock=await page.locator('#panel-stock').innerText();
  
  const overflow=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
  assert.ok(overflow.s<=overflow.w+1,'가로 스크롤 없음');
  assert.deepEqual(errors,[]);
  console.log('PASS student economy: fund hidden, auction escrow/refund, seat auction chart (one seat, amounts only), tax receipt, deposit rules, class fund listing, mobile width');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
