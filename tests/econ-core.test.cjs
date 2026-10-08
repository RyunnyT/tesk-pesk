const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../shared/econ-core.js');

test('indicators: totals, shares and gini match hand calculation',()=>{
  const r=E.indicators([{num:1,cash:100,deposits:0,stocks:0},{num:2,cash:100,deposits:0,stocks:0},{num:3,cash:100,deposits:0,stocks:0},{num:4,cash:100,deposits:600,stocks:100}]);
  assert.equal(r.total,1100);assert.equal(r.cash,400);assert.equal(r.deposits,600);assert.equal(r.stocks,100);
  assert.equal(r.median,100);assert.equal(r.max,800);assert.equal(r.top10Share,72.7);
  assert.equal(E.gini([5,5,5,5]),0);assert.equal(E.gini([0,0,0,10]),0.75);
  assert.equal(E.giniLabel(0.83),'아주 쏠림');assert.equal(E.giniLabel(0.2),'고른 편');
});

test('deposits: legacy deposits keep the 30% early rule, new ones follow the class rule, and the cap counts active principal',()=>{
  const start=new Date('2026-01-01T00:00:00Z').getTime(),half=start+90*86400000;
  const old={amount:10000,rate:20,termDays:180,startDate:'2026-01-01T00:00:00Z'};
  assert.equal(E.depositValueAt(old,half),10300);                       // 20% × 30% × 절반
  assert.equal(E.depositValueAt({...old,earlyPct:0},half),10000);       // 새 규칙: 중도 해지 이자 없음
  assert.equal(E.depositValueAt({...old,earlyPct:0},start+181*86400000),12000);   // 만기는 그대로
  assert.equal(E.depositRoom([{amount:30000},{amount:5000}],{maxPerStudent:50000}),15000);
  assert.equal(E.depositRoom([{amount:999999}],{}),Infinity,'한도를 켜지 않은 학급은 지금과 같다');
  assert.deepEqual(E.bankSettings(null),{maxPerStudent:0,earlyPct:30});
});

test('wealth tax is progressive on the part above each bracket, and unpaid tax carries over without negative cash',()=>{
  const s={brackets:[{min:0,rate:0},{min:10000,rate:1},{min:50000,rate:3},{min:200000,rate:5}]};
  assert.equal(E.wealthTax(5000,s).tax,0);
  assert.equal(E.wealthTax(30000,s).tax,200);                           // 20,000 × 1%
  assert.equal(E.wealthTax(100000,s).tax,400+1500);                     // 40,000×1% + 50,000×3%
  assert.equal(E.wealthTax(1026220,s).tax,400+4500+41311);
  assert.equal(E.wealthTax(100000,s).top.rate,3);
  assert.deepEqual(E.payTax(1614,41000,0),{paid:1614,due:39386,cashAfter:0});
  assert.deepEqual(E.payTax(5000,200,300),{paid:500,due:0,cashAfter:4500});
  assert.equal(E.wealthSettings(null).enabled,false,'선생님이 켜기 전에는 꺼져 있다');
  assert.equal(E.wealthSettings({brackets:[{min:100,rate:2}]}).brackets[0].min,0,'0원 구간을 채운다');
});

test('fund: donations fill a goal, overflow goes to the balance, closed goals refuse donations',()=>{
  let f={goals:[{id:'g1',title:'영화',target:1000,raised:900}]};
  let r=E.donate(f,{goalId:'g1',amount:300,num:3,name:'가'});
  assert.equal(r.toGoal,100);assert.equal(r.toBalance,200);assert.equal(r.fund.goals[0].status,'funded');assert.equal(r.fund.balance,200);
  assert.throws(()=>E.donate(r.fund,{goalId:'g1',amount:10,num:4}),/GOAL_CLOSED/);
  assert.throws(()=>E.donate(r.fund,{amount:0,num:4}),/DONATE_AMOUNT/);
  f=E.addToFund(r.fund,500,'tax','재산세');assert.equal(f.balance,700);
  f.goals.push({id:'g2',title:'체육',target:400,raised:0,status:'open'});
  f=E.allocate(f,'g2',1000);assert.equal(f.balance,300);assert.equal(f.goals[1].status,'funded');
  assert.equal(f.history.at(-1).type,'allocate');
});

test('auction: escrow, refund of the previous top bidder, raising my own bid pays only the difference',()=>{
  const now=Date.parse('2026-10-09T01:00:00Z');
  let a={id:'a',title:'자리 선점',startPrice:1000,step:200,endsAt:'2026-10-10T00:00:00Z',status:'open'};
  assert.throws(()=>E.placeBid(a,{num:1,amount:900,cash:5000,now}),/BID_TOO_LOW:1000/);
  let r=E.placeBid(a,{num:1,name:'가',amount:1000,cash:5000,now});
  assert.equal(r.pay,1000);assert.equal(r.refund,null);
  assert.throws(()=>E.placeBid(r.auction,{num:2,amount:1100,cash:5000,now}),/BID_TOO_LOW:1200/);
  assert.throws(()=>E.placeBid(r.auction,{num:2,amount:1200,cash:1000,now}),/NOT_ENOUGH_CASH:1200/);
  r=E.placeBid(r.auction,{num:2,name:'나',amount:1200,cash:5000,now});
  assert.deepEqual(r.refund,{num:1,name:'가',amount:1000});
  r=E.placeBid(r.auction,{num:2,name:'나',amount:1500,cash:300,now});
  assert.equal(r.pay,300,'이미 최고 입찰자면 차액만');assert.equal(r.refund,null);
  assert.throws(()=>E.placeBid(r.auction,{num:3,amount:2000,cash:9999,now:Date.parse('2026-10-10T00:00:01Z')}),/AUCTION_ENDED/);
  const won=E.closeAuction(r.auction,{now});assert.equal(won.winner.num,2);assert.equal(won.winner.amount,1500);assert.equal(won.refund,null);
  const cancelled=E.closeAuction(r.auction,{cancel:true,now});assert.deepEqual(cancelled.refund,{num:2,amount:1500});
  assert.throws(()=>E.placeBid(won.auction,{num:1,amount:5000,cash:9999,now}),/AUCTION_CLOSED/);
});

test('log: daily quiz rewards merge into one row, old rows move to weekly archives, pending requests stay',()=>{
  const logs=[];
  E.upsertLog(logs,{id:'qz-2026-10-08-3',type:'quiz_reward',delta:5,count:1,balanceAfter:105});
  E.upsertLog(logs,{id:'qz-2026-10-08-3',type:'quiz_reward',delta:15,count:3,balanceAfter:120});
  assert.equal(logs.length,1);assert.equal(logs[0].delta,20);assert.equal(logs[0].count,4);assert.equal(logs[0].balanceAfter,120);
  const day=86400000,now=Date.parse('2026-10-30T00:00:00Z');
  const old=[...Array(5)].map((_,i)=>({id:'q'+i,type:'quiz_reward',studentNum:3,delta:5,ts:now-40*day+i*1000,balanceAfter:100+i*5}));
  const rows=[...old,{id:'p',type:'shop_use_request',status:'pending',ts:now-40*day},{id:'b',type:'bank_deposit',ts:now-30*day},{id:'n',type:'stock_buy',ts:now-day}];
  const {keep,archive}=E.splitForArchive(rows,{now,keepDays:21});
  assert.deepEqual(keep.map(l=>l.id),['p','n']);
  const archived=Object.values(archive).flat();
  const quiz=archived.find(l=>l.type==='quiz_reward');assert.equal(quiz.delta,25);assert.equal(quiz.count,5);assert.equal(quiz.balanceAfter,120);
  assert.ok(archived.some(l=>l.id==='b'));
  assert.match(Object.keys(archive)[0],/^\d{4}-W\d{2}$/);
  assert.equal(E.weekKey(Date.parse('2026-10-08T03:00:00Z')),'2026-W41');
});

test('class fund index follows the average move of listed stocks',()=>{
  assert.equal(E.indexPrice({a:110,b:90},{a:100,b:100}),1000);
  assert.equal(E.indexPrice({a:120,b:110},{a:100,b:100}),1150);
  assert.equal(E.indexPrice({},{}),1000);
});

test('seat auction: one top seat per student, escrow/refund per seat, close and place winners on the chart',()=>{
  const now=Date.parse('2026-10-09T01:00:00Z');
  let a={id:'s',kind:'seats',startPrice:500,step:100,endsAt:'2026-10-10T00:00:00Z',status:'open',layout:{rows:2,cols:3},lots:[{seat:0},{seat:2},{seat:9}]};
  assert.equal(E.seatAuctionState(a).lots.length,2,'자리표 밖 자리는 버린다');
  let r=E.placeSeatBid(a,{num:1,seat:0,amount:500,cash:900,now});assert.equal(r.pay,500);
  assert.throws(()=>E.placeSeatBid(r.auction,{num:1,seat:2,amount:500,cash:900,now}),/ALREADY_TOP_ELSEWHERE/);
  assert.throws(()=>E.placeSeatBid(r.auction,{num:2,seat:1,amount:500,cash:900,now}),/SEAT_NOT_IN_AUCTION/);
  r=E.placeSeatBid(r.auction,{num:2,seat:0,amount:600,cash:900,now});assert.deepEqual(r.refund,{num:1,amount:500});
  r=E.placeSeatBid(r.auction,{num:1,seat:2,amount:500,cash:900,now});assert.equal(r.refund,null,'밀려난 뒤에는 다른 자리에 입찰할 수 있다');
  assert.equal(E.seatMinBid(r.auction,0),700);assert.equal(r.auction.lots[0].top.name,undefined,'이름을 남기지 않는다');
  const c=E.closeSeatAuction(r.auction,{now});assert.deepEqual(c.winners,{0:2,2:1});
  const x=E.closeSeatAuction(r.auction,{cancel:true,now});assert.deepEqual(x.refunds.map(f=>f.amount).sort(),[500,600]);
  // 자리표: [3,1,4 / 2,5,null] 에서 2번이 0자리, 1번이 2자리를 낙찰
  const g=E.applySeatWinners([3,1,4,2,5,null],2,3,c.winners,[1,2,3,4,5,6]);
  assert.equal(g[0],2);assert.equal(g[2],1);
  assert.deepEqual([...g].sort(),[1,2,3,4,5,6],'모두 한 번씩 앉는다');
});
