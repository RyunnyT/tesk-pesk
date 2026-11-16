// 주식 종목: 학생 앱 이름표(shared/stock-list.js)와 교사 앱 종목표가 같고,
// 학생이 살 수 있는 종목은 모두 실제 시세를 받으며, 시세를 못 받아도 가격을 무작위로 바꾸지 않는다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const teacher=fs.readFileSync(path.join(root,'tesk_teacher_v2.html'),'utf8');
const pesk=fs.readFileSync(path.join(root,'pesk.html'),'utf8');
const list=require('../shared/stock-list.js');

function teacherStocks(){
  const src=teacher.slice(teacher.indexOf('const KOSPI100=['),teacher.indexOf('];',teacher.indexOf('const KOSPI100=['))+2);
  return JSON.parse(vm.runInNewContext(src+';JSON.stringify(KOSPI100)'));
}
function fnSource(html,name){
  const start=html.indexOf('function '+name+'(');
  assert.ok(start>=0,name+' 없음');
  let depth=0,i=html.indexOf('{',start);
  for(;i<html.length;i++){ if(html[i]==='{')depth++; else if(html[i]==='}'&&--depth===0)break; }
  return html.slice(start,i+1);
}

test('교사 앱 종목표와 학생 앱 이름표의 코드·이름이 같다',()=>{
  const stocks=teacherStocks();
  assert.deepEqual(stocks.map(s=>[s.code,s.name]),list.LIST);
  assert.equal(new Set(list.LIST.map(x=>x[0])).size,list.LIST.length,'코드 중복 없음');
});

test('코드가 가리키는 실제 회사 이름을 쓴다',()=>{
  assert.equal(list.nameOf('009540'),'HD한국조선해양');
  assert.equal(list.nameOf('267260'),'HD현대일렉트릭');
  assert.equal(list.nameOf('329180'),'HD현대중공업');
  assert.equal(list.nameOf('999999'),'999999');
});

test('실시간 갱신 대상은 종목 전체다 (프록시로 받을 때만 30개 + 보유 종목)',()=>{
  const KOSPI100=teacherStocks();
  const ctx={KOSPI100,portfolios:{1:[{code:KOSPI100[45].code}]},_peskPortfoliosCache:{}};
  vm.runInNewContext(fnSource(teacher,'_realtimeTargetStocks')+';this.f=_realtimeTargetStocks;',ctx);
  assert.equal(ctx.f().length,KOSPI100.length);
  const limited=ctx.f(true).map(s=>s.code);
  assert.equal(limited.length,31);
  assert.ok(limited.includes(KOSPI100[45].code));
});

test('시세를 못 받아도 가격을 무작위로 바꾸지 않는다',()=>{
  const sync=fnSource(teacher,'syncRealStockPrices');
  assert.ok(!sync.includes('refreshStockPrices('),'실패 시 시뮬레이션 변동 호출 없음');
  const failBranch=sync.slice(sync.indexOf('if(updated===0){'),sync.indexOf('stockRawPrices = nextRawPrices'));
  assert.ok(!failBranch.includes("setItem('tesk-last-real-stock-sync',"),'실패하면 마지막 갱신 시각을 쓰지 않는다');
  assert.ok(!failBranch.includes('save('),'실패하면 시세를 저장하지 않는다');
});

test('학생 앱이 이름표를 불러오고 서비스워커가 함께 저장한다',()=>{
  const tag=pesk.match(/shared\/stock-list\.js\?v=[\w]+/);
  assert.ok(tag,'pesk.html 이 이름표를 불러온다');
  assert.ok(fs.readFileSync(path.join(root,'pesk-service-worker.js'),'utf8').includes("'./"+tag[0]+"'"));
  const ctx={window:{TeskStockList:list}};
  vm.runInNewContext(fnSource(pesk,'stockNameOf')+';this.f=stockNameOf;',ctx);
  assert.equal(ctx.f('011200','011200'),'HMM');
  assert.equal(ctx.f('267260','HD현대'),'HD현대일렉트릭');      // 예전 이름으로 저장된 보유분
  assert.equal(ctx.f('IDX100','우리반 펀드'),'우리반 펀드');     // 이름표에 없는 상품
  assert.equal(ctx.f('123456','123456'),'123456');
});
