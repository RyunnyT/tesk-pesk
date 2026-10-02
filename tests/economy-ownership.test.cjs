const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../shared/economy-ownership.js');
const dep=(id,extra={})=>({id,planId:'w1',amount:100,rate:0,termDays:7,startDate:'2026-01-01T00:00:00.000Z',...extra});

test('another account with the same number is never mine; my own uid bucket always is',()=>{
 const me={uid:'u1',num:5};
 assert.equal(E.owns({studentNum:5,accountUid:'old'},me,'old'),false);
 assert.equal(E.owns({studentNum:5},me,'x'),true);
 assert.equal(E.owns({amount:1},me,'5'),true,'very old record in my number bucket');
 assert.equal(E.owns({amount:1},me,'6'),false);
 assert.equal(E.owns({accountUid:'weird'},me,'u1'),true,'records inside my uid bucket');
 assert.equal(E.owns({studentNum:5,accountUid:'u1'},{uid:'',num:5},'5'),false,'no-uid student does not claim a uid record');
});

test('an existing uid bucket is the only truth, even when empty',()=>{
 const store={u1:[],5:[dep('a',{studentNum:5})],stale:[dep('b',{studentNum:5,accountUid:'u1'})]};
 assert.deepEqual(E.ownedList(store,{uid:'u1',num:5}),[]);
 assert.equal(E.ownedList({5:[dep('a')],stale:[dep('b',{studentNum:5})]},{uid:'u1',num:5}).length,2);
});

test('setOwnedList writes one bucket, removes my copies elsewhere, keeps other people and their empty buckets',()=>{
 const store={5:[dep('a',{studentNum:5}),dep('z',{studentNum:5,accountUid:'someoneElse'})],stale:[dep('a',{studentNum:5,accountUid:'u1'})],other:[],someoneElse:[dep('y',{accountUid:'someoneElse'})]};
 E.setOwnedList(store,{uid:'u1',num:5},[dep('a')]);
 assert.deepEqual(Object.keys(store).sort(),['5','other','someoneElse','u1']);
 assert.deepEqual(store[5].map(d=>d.id),['z']);
 assert.deepEqual(store.u1.map(d=>d.id),['a']);
 const noUid={5:[dep('a',{studentNum:5}),dep('z',{accountUid:'x'})],copy:[dep('a',{studentNum:5})]};
 E.setOwnedList(noUid,{uid:'',num:5},[]);
 assert.deepEqual(noUid,{5:[dep('z',{accountUid:'x'})]},'foreign rows in the number bucket survive');
});

test('mergeRecords keeps the larger copy of a stock instead of adding copies together',()=>{
 const merged=E.mergeRecords([{code:'A',qty:2,avgPrice:10},{code:'A',qty:'3',avgPrice:11},{code:'B',qty:0},dep('d'),dep('d')]);
 assert.deepEqual(merged.map(x=>[x.code||x.id,x.qty]),[['A',3],['d',undefined]]);
});

test('consolidateStore removes copies without changing money and reports orphans',()=>{
 const owners=[{uid:'u1',num:1},{uid:'u2',num:2}];
 const store={1:[dep('a',{studentNum:1})],u1:[dep('a',{studentNum:1,accountUid:'u1'})],ghost:[dep('g',{studentNum:9,accountUid:'ghost'})],u2:[{code:'X',qty:4,accountUid:'u2'}],2:[{code:'X',qty:4}]};
 const r=E.consolidateStore(store,owners);
 assert.deepEqual(Object.keys(r.store).sort(),['ghost','u1','u2']);
 assert.equal(r.store.u1.length,1);assert.equal(r.store.u2[0].qty,4);
 assert.equal(r.orphans.length,1);assert.equal(r.orphans[0].bucket,'ghost');
 assert.ok(store[1],'input is not mutated');
 assert.equal(E.needsConsolidation(r.store,owners[0]),false);
});

test('audit finds double withdrawals with the overpaid amount, over-payouts, stale copies and bad values',()=>{
 const logs=[
  {type:'bank_deposit',studentNum:1,delta:-100,meta:{depositId:'d1',rate:10}},
  {type:'bank_withdraw',studentNum:1,delta:110,meta:{depositId:'d1'}},
  {type:'bank_withdraw',studentNum:1,delta:110,meta:{depositId:'d1'}},
  {type:'bank_deposit',studentNum:2,delta:-100,meta:{depositId:'d2',rate:0}},
  {type:'bank_withdraw',studentNum:2,delta:5000,meta:{depositId:'d2'}}
 ];
 const {issues}=E.audit({students:[{num:1,name:'가',points:10},{num:2,name:'나',points:'NaN'}],accountUidOf:n=>'u'+n,
  deposits:{u1:[],1:[dep('old',{studentNum:1})]},portfolios:{u2:[{code:'A',qty:-1,accountUid:'u2'}]},logs});
 const types=issues.map(i=>i.type);
 const dbl=issues.find(i=>i.type==='double-withdraw');
 assert.equal(dbl.count,2);assert.equal(dbl.extra,110);assert.equal(dbl.num,1);
 assert.ok(types.includes('over-payout'));
 assert.ok(issues.some(i=>i.type==='stale-copy'&&i.num===1));
 assert.ok(issues.some(i=>i.type==='invalid'&&i.num===2&&/잔액/.test(i.detail)));
 assert.equal(types[0],'double-withdraw','most severe first');
});
