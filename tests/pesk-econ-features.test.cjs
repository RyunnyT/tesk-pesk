const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./economy-fixture.cjs');

/* 학생 앱의 실제 함수로: 예금 한도·중도 해지 규칙, 공동 기금 기부, 경매 입찰·환불, 정답 보상 로그 묶기 */
function setup(extra={}){
  const f=fixture(),messages=[],logs=[];
  Object.assign(f.docs,{'tesk-students':[{num:1,name:'학생',points:1000},{num:2,name:'친구',points:500}],'pesk-portfolios':{one:[]},'pesk-deposits':{one:[]},'tesk-stock-prices':{ABC:100}},extra);
  f.c.data=structuredClone(f.docs);
  f.run('students=data["tesk-students"];myPurchases=[];stockPrices=data["tesk-stock-prices"];myPortfolio=[];myDeposits=[];shopItems=[]');
  Object.assign(f.c,{ensureActiveStudentSession:async()=>true,confirm:()=>true,prompt:()=> '1',alert:m=>messages.push(m),showFeedbackNotice:m=>messages.push(m),
    refreshEconomyFromServer:async()=>null,switchBankTab(){},buildShopPanel:()=>'',pushEconLog:async(e,o)=>{logs.push({...e,mergeId:o&&o.mergeId});return true;}});
  return {...f,messages,logs};
}

test('deposit cap is checked against the server copy and new deposits store the class early-withdrawal rule',async()=>{
  const f=setup({'tesk-bank-settings':{maxPerStudent:300,earlyPct:0}});
  f.run('applyEconExtras({bank:data["tesk-bank-settings"]||{maxPerStudent:300,earlyPct:0}})');
  f.elements['dep-amt-w1']={value:'200'};await f.c.createDeposit('w1');
  assert.equal(f.docs['tesk-students'][0].points,800);assert.equal(f.docs['pesk-deposits'].one[0].earlyPct,0);
  // 화면에는 예금이 없다고 보여도(다른 기기에서 넣음) 서버 기록으로 한도를 다시 센다
  f.run('myDeposits=[]');f.elements['dep-amt-w1'].value='200';await f.c.createDeposit('w1');
  assert.equal(f.docs['tesk-students'][0].points,800);assert.match(f.messages.join(),/1인 예금 한도/);
  f.elements['dep-amt-w1'].value='100';await f.c.createDeposit('w1');assert.equal(f.docs['tesk-students'][0].points,700);
});

test('classes without bank settings keep the old behavior (no cap, 30% early interest)',async()=>{
  const f=setup();
  f.elements['dep-amt-w1']={value:'900'};await f.c.createDeposit('w1');
  assert.equal(f.docs['tesk-students'][0].points,100);assert.equal(f.docs['pesk-deposits'].one[0].earlyPct,30);
});

test('donation moves cash to the fund goal atomically and refuses more than the balance',async()=>{
  const f=setup({'pesk-class-fund':{balance:0,goals:[{id:'g',title:'영화',target:300,raised:0,status:'open'}],history:[]}});
  f.run('applyEconExtras({fund:data["pesk-class-fund"]||null})');f.c.classFund=undefined;
  f.run('applyEconExtras({fund:{balance:0,goals:[{id:"g",title:"영화",target:300,raised:0,status:"open"}]}})');
  f.elements['fund-amt-g']={value:'500'};await f.c.donateToFund('g');
  assert.equal(f.docs['tesk-students'][0].points,500);
  const fund=f.docs['pesk-class-fund'];assert.equal(fund.goals[0].raised,300);assert.equal(fund.goals[0].status,'funded');assert.equal(fund.balance,200);
  assert.equal(f.logs.at(-1).type,'donate');assert.equal(f.logs.at(-1).delta,-500);
  f.elements['fund-amt-pool']={value:'9999'};await f.c.donateToFund('');assert.equal(f.docs['tesk-students'][0].points,500);
});

test('bidding escrows money and refunds the previous top bidder in the same transaction',async()=>{
  const ends=new Date(Date.now()+3600000).toISOString();
  const f=setup({'pesk-auctions':[{id:'a',title:'자리 선점',startPrice:100,step:50,endsAt:ends,status:'open',top:{num:2,name:'친구',amount:200},bids:[]}]});
  f.elements['bid-a']={value:'240'};await f.c.bidAuction('a');
  assert.equal(f.docs['tesk-students'][0].points,1000,'최소 250 미만은 거절');
  f.elements['bid-a'].value='300';await f.c.bidAuction('a');
  assert.equal(f.docs['tesk-students'][0].points,700);assert.equal(f.docs['tesk-students'][1].points,700,'이전 최고 입찰자 200 환불');
  assert.equal(f.docs['pesk-auctions'][0].top.num,1);
  assert.deepEqual(f.logs.map(l=>[l.type,l.delta,l.studentNum]),[['auction_bid',-300,undefined],['auction_refund',200,2]]);
  f.elements['bid-a'].value='400';await f.c.bidAuction('a');assert.equal(f.docs['tesk-students'][0].points,600,'내가 최고면 차액 100만');
});

test('quiz rewards are buffered per day and flushed as one merged log row',async()=>{
  const f=setup();
  f.run('queueQuizRewardLog({gain:5,before:0,after:5,unit:"5-2 2단원"});queueQuizRewardLog({gain:5,before:5,after:10,unit:"5-2 2단원"})');
  assert.equal(f.logs.length,0,'문제마다 쓰지 않는다');
  await f.c.flushQuizRewardLog();
  assert.equal(f.logs.length,1);assert.equal(f.logs[0].delta,10);assert.equal(f.logs[0].count,2);assert.equal(f.logs[0].balanceAfter,10);
  assert.match(f.logs[0].mergeId,/^qz-\d{4}-\d{2}-\d{2}-1$/);
  await f.c.flushQuizRewardLog();assert.equal(f.logs.length,1,'비어 있으면 쓰지 않는다');
  f.c.pushEconLog=async()=>false;f.run('queueQuizRewardLog({gain:5,before:10,after:15})');await f.c.flushQuizRewardLog();
  f.c.pushEconLog=async(e,o)=>{f.logs.push({...e,mergeId:o.mergeId});return true;};await f.c.flushQuizRewardLog();
  assert.equal(f.logs.at(-1).delta,5,'실패하면 다음에 다시 올린다');
});
