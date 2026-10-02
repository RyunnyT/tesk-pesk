const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./economy-fixture.cjs');
function setup(){
 const f=fixture(),messages=[];
 Object.assign(f.docs,{'tesk-students':[{num:1,name:'학생',points:1000}],'tesk-shop':[{id:'apple',name:'사과',price:20,stock:10}],'pesk-purchases':[],'pesk-portfolios':{one:[]},'pesk-deposits':{one:[]},'tesk-stock-prices':{ABC:100}});
 f.c.data=structuredClone(f.docs);f.run('students=data["tesk-students"];shopItems=data["tesk-shop"];myPurchases=[];stockPrices=data["tesk-stock-prices"];myPortfolio=[];myDeposits=[]');
 Object.assign(f.c,{ensureActiveStudentSession:async()=>true,confirm:()=>true,prompt:()=> '1',alert:m=>messages.push(m),showFeedbackNotice:m=>messages.push(m),refreshEconomyFromServer:async()=>null,switchBankTab(){}});
 f.elements['qty-ABC']={value:'1'};return {...f,messages};
}
test('buying multiple items atomically deducts money and stock and adds inventory',async()=>{
 const f=setup();f.c.prompt=()=> '3';await f.c.buyShopItem('apple');assert.equal(f.docs['tesk-students'][0].points,940);assert.equal(f.docs['tesk-shop'][0].stock,7);assert.equal(f.docs['pesk-purchases'][0].qty,3);
 await f.c.useMyItem(f.docs['pesk-purchases'][0].id,1);assert.equal(f.c.shopPurchaseRemaining(f.docs['pesk-purchases'][0]),2);
 await f.c.useMyItem(f.docs['pesk-purchases'][0].id,2);assert.equal(f.c.shopPurchaseRemaining(f.docs['pesk-purchases'][0]),0);assert.equal(f.docs['pesk-purchases'][0].status,'used_all');assert.equal(f.docs['tesk-students'][0].points,940);
});
test('rapid double clicks charge once even while session verification is pending',async()=>{
 const f=setup();await Promise.all([f.c.buyShopItem('apple'),f.c.buyShopItem('apple')]);assert.equal(f.docs['tesk-students'][0].points,980);assert.equal(f.docs['pesk-purchases'][0].qty,1);
 const id=f.docs['pesk-purchases'][0].id;await Promise.all([f.c.useMyItem(id,1),f.c.useMyItem(id,1)]);assert.equal(f.docs['pesk-purchases'][0].usedQty,1);
});
test('server price, removed products, unlimited-to-limited stock, and insufficient cash fail without partial writes',async()=>{
 for(const mutate of [f=>f.docs['tesk-shop'][0].price=21,f=>f.docs['tesk-shop']=[],f=>{f.run('shopItems[0].stock=-1');f.docs['tesk-shop'][0].stock=0;},f=>f.docs['tesk-students'][0].points=1]){
  const f=setup();mutate(f);const before=structuredClone(f.docs);await f.c.buyShopItem('apple');assert.deepEqual(f.docs,before);assert.ok(f.messages.length);
 }
});
test('invalid purchase quantities and negative prices never create money or items',async()=>{
 for(const qty of ['-1','1.5','2cats','Infinity']){const f=setup();f.c.prompt=()=>qty;await f.c.buyShopItem('apple');assert.equal(f.docs['tesk-students'][0].points,1000);assert.equal(f.docs['pesk-purchases'].length,0);}
 const f=setup();f.docs['tesk-shop'][0].price=-20;f.run('shopItems[0].price=-20');await f.c.buyShopItem('apple');assert.equal(f.docs['tesk-students'][0].points,1000);
});
test('two products with identical names keep separate inventory',async()=>{
 const f=setup();f.docs['tesk-shop'].push({id:'other',name:'사과',price:30});f.c.data=structuredClone(f.docs['tesk-shop']);f.run('shopItems=data');await f.c.buyShopItem('apple');await f.c.buyShopItem('other');assert.equal(f.docs['pesk-purchases'].length,2);assert.equal(f.docs['tesk-students'][0].points,950);
});
test('legacy used records and newer server use counts cannot be spent again',async()=>{
 const f=setup();await f.c.buyShopItem('apple');const id=f.docs['pesk-purchases'][0].id;f.docs['pesk-purchases'][0].status='used';await f.c.useMyItem(id,1);assert.equal(f.docs['pesk-purchases'][0].usedQty,undefined);assert.equal(f.c.shopPurchaseRemaining(f.docs['pesk-purchases'][0]),0);
});
test('failed transaction leaves money, stock, purchases unchanged; UI failure after commit does not report purchase failure',async()=>{
 const f=setup();f.fail();await f.c.buyShopItem('apple');assert.equal(f.docs['tesk-students'][0].points,1000);assert.equal(f.docs['pesk-purchases'].length,0);
 const g=setup();g.c.addTxn=()=>{throw Error('storage full');};await g.c.buyShopItem('apple');assert.equal(g.docs['tesk-students'][0].points,980);assert.ok(g.messages.some(m=>m.includes('거래는 저장')));assert.ok(!g.messages.some(m=>m.includes('구매 실패')));
});
test('string-valued stock holdings add numerically, double clicks do not trade twice, buy and sell conserve total assets',async()=>{
 const f=setup();f.docs['pesk-portfolios'].one=[{code:'ABC',qty:'2',avgPrice:'100',accountUid:'one'}];f.run('myPortfolio=[{code:"ABC",qty:"2",avgPrice:"100",accountUid:"one"}]');
 await Promise.all([f.c.buyStockPesk('ABC','테스트',1),f.c.buyStockPesk('ABC','테스트',1)]);assert.equal(f.docs['tesk-students'][0].points,900);assert.equal(f.docs['pesk-portfolios'].one[0].qty,3);
 await Promise.all([f.c.sellStockPesk('ABC','테스트',100,null,3),f.c.sellStockPesk('ABC','테스트',100,null,3)]);assert.equal(f.docs['tesk-students'][0].points,1200);assert.deepEqual(f.docs['pesk-portfolios'].one,[]);
});
test('a changed stock price or fewer server holdings cannot silently charge or sell',async()=>{
 const f=setup();f.docs['tesk-stock-prices'].ABC=101;await f.c.buyStockPesk('ABC','테스트',100);assert.equal(f.docs['tesk-students'][0].points,1000);
 f.run('myPortfolio=[{code:"ABC",qty:3}]');await f.c.sellStockPesk('ABC','테스트',101,null,3);assert.equal(f.docs['tesk-students'][0].points,1000);
});
test('legacy migration rereads current data and an empty UID bucket never resurrects sold stock',async()=>{
 const f=setup();f.docs['pesk-portfolios']={one:[],1:[{code:'ABC',qty:20}],other:[{code:'XYZ',qty:7,accountUid:'other'}]};
 f.c.old={1:[{code:'ABC',qty:100}]};await f.run('migrateMyEconomyBucket("pesk-portfolios",old,_mergePortfolioLists)');assert.deepEqual(f.docs['pesk-portfolios'].one,[]);assert.equal(f.docs['pesk-portfolios'].other[0].qty,7);assert.equal(f.docs['pesk-portfolios'][1],undefined);
});
test('new approval requirements block direct use and approval requests reserve only remaining quantity',async()=>{
 const f=setup();f.c.prompt=()=> '2';await f.c.buyShopItem('apple');const id=f.docs['pesk-purchases'][0].id;
 f.docs['tesk-shop'][0].useApproverJobIds=['teacher'];await f.c.useMyItem(id,1);assert.equal(f.c.shopPurchaseRemaining(f.docs['pesk-purchases'][0]),2);f.run('shopItems[0].useApproverJobIds=["teacher"]');
 await Promise.all([f.c.requestUseMyItem(id,2),f.c.requestUseMyItem(id,2)]);
 assert.equal((f.docs['pesk-purchase-log']||[]).filter(x=>x.type==='shop_use_request').length,1);assert.equal(f.c.shopPurchaseRemaining(f.docs['pesk-purchases'][0]),2);
});
test('deposits reject fractional values and forged maturity, and concurrent withdrawal pays only once',async()=>{
 const f=setup();f.elements['dep-amt-w1']={value:'10.5'};await f.c.createDeposit('w1');assert.equal(f.docs['tesk-students'][0].points,1000);
 f.elements['dep-amt-w1'].value='100';await Promise.all([f.c.createDeposit('w1'),f.c.createDeposit('w1')]);assert.equal(f.docs['tesk-students'][0].points,900);assert.equal(f.docs['pesk-deposits'].one.length,1);
 await f.c.withdrawDeposit(0,true);assert.equal(f.docs['tesk-students'][0].points,900);assert.equal(f.docs['pesk-deposits'].one.length,1);
 await Promise.all([f.c.withdrawDeposit(0,false),f.c.withdrawDeposit(0,false)]);assert.equal(f.docs['tesk-students'][0].points,1000);assert.deepEqual(f.docs['pesk-deposits'].one,[]);
});
test('a withdrawn deposit cannot come back from a stale copy in another bucket (no-UID student)',async()=>{
 const f=setup();f.run('myAccountUid=""');
 const dep={id:'d1',planId:'w1',label:'1주일',amount:500,rate:0,termDays:7,startDate:'2026-01-01T00:00:00.000Z',studentNum:1};
 f.docs['pesk-deposits']={1:[{...dep}],oldAccount:[{...dep,accountUid:'oldAccount'}]};
 f.docs['tesk-students'][0].points=0;f.run('myDeposits=[{id:"d1",planId:"w1",amount:500,rate:0,termDays:7,startDate:"2026-01-01T00:00:00.000Z"}]');
 await f.c.withdrawDeposit(0,true);assert.equal(f.docs['tesk-students'][0].points,500);
 f.run('myDeposits=[{id:"d1",planId:"w1",amount:500,rate:0,termDays:7,startDate:"2026-01-01T00:00:00.000Z"}]');
 await f.c.withdrawDeposit(0,true);assert.equal(f.docs['tesk-students'][0].points,500);
 assert.deepEqual(f.docs['pesk-deposits'][1],[]);assert.equal(f.docs['pesk-deposits'].oldAccount.length,1,'another account keeps its own record');
});
test('records of another account with the same student number are never adopted',async()=>{
 const f=setup();delete f.docs['pesk-deposits'].one;
 f.docs['pesk-deposits'].previousStudent=[{id:'x',amount:9999,rate:0,termDays:1,startDate:'2026-01-01T00:00:00.000Z',studentNum:1,accountUid:'previousStudent'}];
 f.c.docs0=f.docs['pesk-deposits'];assert.equal(f.run('_canonicalEconomyList(docs0,_mergeDepositLists).length'),0);
});
test('a withdrawal cleans stale copies of my own records out of other buckets',async()=>{
 const f=setup();const dep={id:'d2',planId:'w1',amount:100,rate:0,termDays:7,startDate:'2026-01-01T00:00:00.000Z',studentNum:1,accountUid:'one'};
 f.docs['pesk-deposits']={one:[{...dep}],1:[{...dep}],stale:[{...dep}],other:[]};f.run('myDeposits=[{id:"d2",amount:100,rate:0,termDays:7,startDate:"2026-01-01T00:00:00.000Z"}]');
 await f.c.withdrawDeposit(0,true);
 assert.deepEqual(f.docs['pesk-deposits'],{one:[],other:[]});assert.equal(f.docs['tesk-students'][0].points,1100);
});
test('a forged local interest rate is rejected by the server plan table',async()=>{
 const f=setup();f.docs['tesk-bank-plans']=[{id:'w1',label:'1주일',days:7,rate:0.5}];
 f.run('BANK_PLANS=[{id:"w1",label:"1주일",days:7,rate:900}]');f.elements['dep-amt-w1']={value:'100'};
 await f.c.createDeposit('w1');assert.equal(f.docs['tesk-students'][0].points,1000);assert.deepEqual(f.docs['pesk-deposits'].one,[]);
 f.run('BANK_PLANS=[{id:"w1",label:"1주일",days:7,rate:0.5}]');await f.c.createDeposit('w1');
 assert.equal(f.docs['tesk-students'][0].points,900);assert.equal(f.docs['pesk-deposits'].one[0].rate,0.5);
});
test('legacy deposits without ids withdraw the chosen one only',async()=>{
 const f=setup();f.docs['pesk-deposits']={one:[{planId:'w1',amount:100,rate:0,termDays:7,startDate:'2026-01-01T00:00:00.000Z'},{planId:'w1',amount:300,rate:0,termDays:7,startDate:'2026-01-02T00:00:00.000Z'}]};
 f.c.docs0=f.docs['pesk-deposits'];f.run('myDeposits=_canonicalEconomyList(docs0,_mergeDepositLists)');
 await f.c.withdrawDeposit(1,true);assert.equal(f.docs['tesk-students'][0].points,1300);assert.equal(f.docs['pesk-deposits'].one.length,1);assert.equal(f.docs['pesk-deposits'].one[0].amount,100);
});
test('sold stock cannot come back from a stale copy (no-UID student)',async()=>{
 const f=setup();f.run('myAccountUid=""');
 f.docs['pesk-portfolios']={1:[{code:'ABC',qty:2,avgPrice:100,studentNum:1}],oldAccount:[{code:'ABC',qty:2,avgPrice:100,studentNum:1,accountUid:'oldAccount'}]};
 f.run('myPortfolio=[{code:"ABC",qty:2,avgPrice:100}]');
 await f.c.sellStockPesk('ABC','테스트',100,null,2);assert.equal(f.docs['tesk-students'][0].points,1200);
 f.run('myPortfolio=[{code:"ABC",qty:2,avgPrice:100}]');await f.c.sellStockPesk('ABC','테스트',100,null,2);
 assert.equal(f.docs['tesk-students'][0].points,1200);
});
test('server economy mode sends bank actions to Cloud Functions and never writes documents directly',async()=>{
 const f=setup();const calls=[];const before=JSON.stringify(f.docs);
 f.c.TESK_USE_SERVER_ECONOMY=true;
 f.c._economyApi={bankDeposit:async(...a)=>{calls.push(['dep',...a]);return {after:900};},bankWithdraw:async(...a)=>{calls.push(['wd',...a]);return {payout:5};},
  stockBuy:async(...a)=>{calls.push(['buy',...a]);return {cost:100};},stockSell:async(...a)=>{calls.push(['sell',...a]);return {gain:100};}};
 f.elements['dep-amt-w1']={value:'100'};await f.c.createDeposit('w1');
 f.run('myDeposits=[{id:"d9",amount:5,rate:0,termDays:1,startDate:"2026-01-01T00:00:00.000Z"}]');await f.c.withdrawDeposit(0,true);
 await f.c.buyStockPesk('ABC','테스트',1);
 f.run('myPortfolio=[{code:"ABC",qty:1,avgPrice:100}]');await f.c.sellStockPesk('ABC','테스트',100,null,1);
 assert.deepEqual(calls.map(c=>c[0]),['dep','wd','buy','sell']);
 assert.deepEqual(calls[0],['dep','test','w1',100]);assert.deepEqual(calls[1],['wd','test','d9',true]);
 assert.equal(JSON.stringify(f.docs),before);
});
