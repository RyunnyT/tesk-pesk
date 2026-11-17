// 잔액 감사 (shared/econ-audit.js)
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../shared/econ-audit.js');
const log=(num,ts,before,after,detail='거래')=>({studentNum:num,ts,createdAt:new Date(ts).toISOString(),balanceBefore:before,balanceAfter:after,detail});
const T0=Date.parse('2026-11-17T09:00:00+09:00');
test('정상 기록은 아무것도 걸리지 않는다',()=>{
  const logs=[log(1,T0,0,100),log(1,T0+1000,100,70),log(2,T0,50,80)];
  assert.deepEqual(A.check({students:[{num:1,points:70},{num:2,points:80}],logs,today:'2026-11-17'}),[]);
  assert.equal(A.expected(1,logs),70);
});
test('기록 사이에서 잔액이 어긋나면 gap',()=>{
  const r=A.check({students:[{num:1,points:500}],logs:[log(1,T0,0,1000,'주식 매도'),log(1,T0+5000,300,500,'보상')],today:'2026-11-17'});
  assert.equal(r.length,1);assert.equal(r[0].kind,'gap');assert.equal(r[0].amount,-700);
});
test('기록 없이 지금 잔액이 다르면 drift',()=>{
  const r=A.check({students:[{num:1,points:200}],logs:[log(1,T0,0,900,'예금 해지')],today:'2026-11-17'});
  assert.equal(r[0].kind,'drift');assert.equal(r[0].amount,-700);
});
test('어제보다 설명 없이 줄면 rollback, 여러 명이면 한꺼번에 되돌아간 흔적',()=>{
  const snapshots=[{date:'2026-11-16',balances:{1:[1000,0,0],2:[800,0,0],3:[600,0,0]}}];
  const students=[{num:1,points:300},{num:2,points:100},{num:3,points:600}];
  const r=A.check({students,logs:[],snapshots,today:'2026-11-17'});
  assert.deepEqual(r.map(x=>x.kind),['rollback','rollback']);
  assert.equal(A.massRollback(r),0);
  assert.equal(A.massRollback([...r,{kind:'drift',amount:-50}]),3);
  // 오늘 기록으로 설명되면 걸리지 않는다
  assert.deepEqual(A.check({students:[{num:1,points:300}],logs:[log(1,Date.parse('2026-11-17T10:00:00+09:00'),1000,300,'경매 입찰')],snapshots,today:'2026-11-17'}),[]);
});
test('음수 잔액',()=>{
  assert.equal(A.check({students:[{num:1,points:-5}],logs:[],today:'2026-11-17'})[0].kind,'negative');
});
