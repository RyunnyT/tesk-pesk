const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const B=require('../functions/bank.js');
const DAY=86400000,NOW=Date.parse('2026-09-30T00:00:00Z');
let n=0;const ctx=(owner={uid:'u1',num:1})=>({roomId:'r',owner,now:NOW,newId:()=>'id'+(++n)});
const docs=()=>({'tesk-students':[{num:1,name:'가',points:1000},{num:2,name:'나',points:50}],'pesk-deposits':{u1:[]},'pesk-portfolios':{u1:[]},'tesk-stock-prices':{A:100},'tesk-bank-plans':[{id:'w1',label:'1주일',days:7,rate:10}]});

test('server ownership module is the same file as the shared one',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../functions/economy-ownership.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../shared/economy-ownership.js'),'utf8'));
});

test('deposit uses the server plan table, logs with depositId, and withdraws exactly once',()=>{
 const d=docs();const r=B.applyDeposit(d,ctx(),{planId:'w1',amount:100,rate:9999});
 assert.equal(d['tesk-students'][0].points,900);assert.equal(r.deposit.rate,10);
 assert.equal(d['pesk-purchase-log'][0].meta.depositId,r.deposit.id);
 const later={...ctx(),now:NOW+8*DAY};
 const w=B.applyWithdraw(d,later,{depositId:r.deposit.id,matured:true});
 assert.equal(w.payout,110);assert.equal(d['tesk-students'][0].points,1010);
 assert.throws(()=>B.applyWithdraw(d,later,{depositId:r.deposit.id}),e=>e.code==='not-found');
 assert.equal(d['tesk-students'][0].points,1010);
});

test('deposit rejects unknown plans, fractions, overdrafts and negative balances without changing money',()=>{
 for(const [input,mutate] of [[{planId:'zz',amount:100}],[{planId:'w1',amount:10.5}],[{planId:'w1',amount:5000}],[{planId:'w1',amount:100},d=>d['tesk-students'][0].points=-1]]){
  const d=docs();mutate&&mutate(d);const before=JSON.stringify(d);
  assert.throws(()=>B.applyDeposit(d,ctx(),input),B.BankError);
  assert.equal(JSON.stringify(d),before);
 }
});

test('early withdrawal pays 30% of interest pro rata; forged maturity is refused',()=>{
 const d=docs();const {deposit}=B.applyDeposit(d,ctx(),{planId:'w1',amount:1000});
 const half={...ctx(),now:NOW+3.5*DAY};
 assert.throws(()=>B.applyWithdraw(d,half,{depositId:deposit.id,matured:true}),e=>e.code==='failed-precondition');
 // 학생 앱(_depositValueAt)과 같은 식·같은 내림: 1000*(1+0.1*0.3*0.5) → 1014
 assert.equal(B.applyWithdraw(d,half,{depositId:deposit.id}).payout,1014);
});

test('a stale copy in another bucket cannot be withdrawn again on the server either',()=>{
 const d=docs();const dep={id:'x',planId:'w1',amount:100,rate:0,termDays:1,startDate:'2026-01-01T00:00:00Z',studentNum:1};
 d['pesk-deposits']={1:[{...dep}],oldAccount:[{...dep,accountUid:'oldAccount'}]};
 const owner={uid:'',num:1};
 B.applyWithdraw(d,ctx(owner),{depositId:'x'});
 assert.throws(()=>B.applyWithdraw(d,ctx(owner),{depositId:'x'}),e=>e.code==='not-found');
 assert.equal(d['tesk-students'][0].points,1100);
});

test('stock buy/sell use server prices, refuse price surprises and conserve total assets',()=>{
 const d=docs();
 assert.throws(()=>B.applyBuy(d,ctx(),{code:'A',qty:1,seenPrice:99}),e=>e.code==='aborted');
 B.applyBuy(d,ctx(),{code:'A',name:'에이',qty:3,seenPrice:100});
 assert.equal(d['tesk-students'][0].points,700);assert.equal(d['pesk-portfolios'].u1[0].qty,3);
 const log=d['pesk-purchase-log'].at(-1);assert.equal(log.assetBefore.total,log.assetAfter.total);
 assert.throws(()=>B.applySell(d,ctx(),{code:'A',qty:4,seenPrice:100}),e=>e.code==='failed-precondition');
 d['tesk-stock-prices'].A=120;
 assert.throws(()=>B.applySell(d,ctx(),{code:'A',qty:3,seenPrice:100}),e=>e.code==='aborted');
 B.applySell(d,ctx(),{code:'A',qty:3,seenPrice:120});
 assert.equal(d['tesk-students'][0].points,1060);assert.deepEqual(d['pesk-portfolios'].u1,[]);
 for(const qty of [0,-1,1.5,10000,'2x'])assert.throws(()=>B.applyBuy(docs(),ctx(),{code:'A',qty}),e=>e.code==='invalid-argument');
});

test('onCall handlers run in one transaction, write only economy documents and map errors',async()=>{
 const store={};const d=docs();Object.entries(d).forEach(([k,v])=>store['classrooms/r/data/'+k]=v);
 const writes=[];
 const db={doc:p=>p,collection:()=>({doc:()=>({id:'srv'+(++n)})}),
  runTransaction:async fn=>fn({get:async p=>({exists:p in store,get:()=>JSON.parse(JSON.stringify(store[p]))}),set:(p,v)=>writes.push([p,v.value])})};
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code;}}
 const bank=B.createBank({db,HttpsError,requireStudent:async()=>({num:1,acc:{accountUid:'u1'}})});
 const r=await bank.bankDeposit({data:{roomId:'r',planId:'w1',amount:100}});
 assert.equal(r.after,900);
 assert.deepEqual(writes.map(w=>w[0].split('/').at(-1)).sort(),['pesk-deposits','pesk-portfolios','pesk-purchase-log','tesk-students']);
 await assert.rejects(bank.bankWithdraw({data:{roomId:'r',depositId:'nope'}}),e=>e instanceof HttpsError&&e.code==='not-found');
 await assert.rejects(bank.stockBuy({data:{}}),e=>e.code==='invalid-argument');
});
