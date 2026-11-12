const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

/* 교사 화면의 실제 경매 함수(shared/tesk-econ-ui.js)로: 여러 개 낙찰, 취소 환불, 끝난 경매 삭제, 열 때 진행 중 경매 보존 */
function setup(docs){
  const toasts=[],c={console,Date,Math,JSON,Promise,TESK_ROOM:'r',students:[],toasts,
    document:{getElementById:()=>null},C:()=>'코인',escHtml:s=>String(s),uid:()=>Math.random().toString(36).slice(2),
    showToast:m=>toasts.push(m),addActivity(){},saveLocal(){},renderStudents(){},pushTeacherEconLogs:async l=>{c.logged=(c.logged||[]).concat(l);},
    openAppConfirmModal:async()=>true,_db:{},_fsDoc:(_,...p)=>p.at(-1),
    _fsGetDoc:async k=>({exists:()=>docs[k]!==undefined,data:()=>({value:structuredClone(docs[k])})}),
    _fsRunTxn:async(db,fn)=>{const w=[];await fn({get:c._fsGetDoc,set:(k,v)=>w.push([k,v.value])});for(const [k,v] of w)docs[k]=structuredClone(v);}};
  c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/econ-core.js'),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/tesk-econ-ui.js'),'utf8'),c);
  vm.runInContext('auctionsT=[]',c);
  return c;
}
const ends=new Date(Date.now()-1000).toISOString();

test('confirming a 3-item auction gives each winner one item at their own bid; nobody is refunded',async()=>{
  const docs={'tesk-students':[{num:1,points:0},{num:2,points:0}],'pesk-purchases':[],
    'pesk-auctions':[{id:'a',title:'급식 먼저',qty:3,startPrice:100,step:50,endsAt:ends,status:'open',bids:[],tops:[{num:1,amount:300,at:'1'},{num:2,amount:150,at:'2'}]}]};
  const c=setup(docs);vm.runInContext('auctionsT=window._seed',Object.assign(c,{_seed:docs['pesk-auctions']}));
  await c.closeAuctionT('a',false);
  assert.deepEqual(docs['pesk-purchases'].map(p=>[p.studentNum,p.price,p.qty]),[[1,300,1],[2,150,1]]);
  assert.equal(new Set(docs['pesk-purchases'].map(p=>p.id)).size,2,'낙찰자마다 다른 물건 id');
  assert.deepEqual(docs['tesk-students'].map(s=>s.points),[0,0],'돈은 입찰 때 이미 맡겼다');
  assert.equal(docs['pesk-auctions'][0].status,'closed');
});

test('cancelling refunds every bidder still holding a slot, then the finished auction can be deleted',async()=>{
  const docs={'tesk-students':[{num:1,points:0},{num:2,points:10}],'pesk-purchases':[],
    'pesk-auctions':[{id:'a',title:'급식 먼저',qty:2,startPrice:100,step:50,endsAt:ends,status:'open',bids:[],tops:[{num:1,amount:300,at:'1'},{num:2,amount:150,at:'2'}]}]};
  const c=setup(docs);vm.runInContext('auctionsT=window._seed',Object.assign(c,{_seed:docs['pesk-auctions']}));
  await c.deleteAuctionT('a');assert.equal(docs['pesk-auctions'].length,1,'진행 중인 경매는 지우지 않는다');assert.match(c.toasts.join(),/먼저 취소/);
  await c.closeAuctionT('a',true);
  assert.deepEqual(docs['tesk-students'].map(s=>s.points),[300,160]);assert.equal(docs['pesk-purchases'].length,0);
  await c.deleteAuctionT('a');assert.deepEqual(docs['pesk-auctions'],[]);
  assert.deepEqual(docs['tesk-students'].map(s=>s.points),[300,160],'삭제는 돈을 건드리지 않는다');
});

test('a legacy single-item auction (top only) still closes into one purchase with the old id',async()=>{
  const docs={'tesk-students':[{num:4,points:0}],'pesk-purchases':[],'pesk-auctions':[{id:'old',title:'반장',startPrice:100,step:10,endsAt:ends,status:'open',bids:[],top:{num:4,amount:500}}]};
  const c=setup(docs);vm.runInContext('auctionsT=window._seed',Object.assign(c,{_seed:docs['pesk-auctions']}));
  await c.closeAuctionT('old',false);
  assert.deepEqual(docs['pesk-purchases'].map(p=>[p.id,p.studentNum,p.price]),[['auction:old',4,500]]);
});
