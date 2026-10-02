// ─────────────────────────────────────────────────────────────
// 학급은행 서버 로직 — 예금 가입/해지, 주식 매수/매도 (Cloud Functions 트랜잭션)
//
// 학생 앱(pesk.html)의 같은 기능을 서버로 옮긴 것. USE_SERVER_ECONOMY 플래그가 켜진
// 경우에만 호출된다. 규칙은 학생 앱과 같다:
//  - 이율·기간은 tesk-bank-plans, 가격은 tesk-stock-prices 에서 서버가 직접 읽는다.
//  - 예금·주식 기록의 주인 판정/저장은 economy-ownership.js (shared/ 와 같은 파일).
//  - 잔액 변경과 경제 로그를 한 트랜잭션에 쓴다 (로그만 빠지거나 두 번 쓰이지 않게).
//
// apply* 함수는 Firestore 없이 docs 객체만 바꾸는 순수 함수라서 테스트에서 바로 쓴다.
// ─────────────────────────────────────────────────────────────
const E = require('./economy-ownership');

const DEFAULT_BANK_PLANS = [
  {id:'w1', label:'1주일', days:7, rate:0.5},
  {id:'w2', label:'2주일', days:14, rate:1.2},
  {id:'m1', label:'1개월', days:30, rate:3.0},
  {id:'m3', label:'3개월', days:90, rate:10.0},
  {id:'m6', label:'6개월', days:180, rate:25.0},
];
const LOG_LIMIT = 2000;
const DAY = 86400000;

class BankError extends Error {
  constructor(code, message){ super(message); this.code = code; }
}
const fail = (code, message) => { throw new BankError(code, message); };

function findPlan(plans, planId){
  const list = Array.isArray(plans) && plans.length ? plans : DEFAULT_BANK_PLANS;
  const p = list.find(x => x && x.id === planId);
  if(!p) return null;
  const rate = Number(p.rate), days = Number(p.days);
  if(!Number.isFinite(rate) || rate < 0 || !Number.isFinite(days) || days <= 0) return null;
  return {id:p.id, label:String(p.label || ''), rate, days};
}

function studentIndex(students, num){
  const idx = students.findIndex(s => Number(s.num) === Number(num));
  if(idx < 0) fail('not-found', '학생 정보를 찾을 수 없어요.');
  return idx;
}

function myDeposits(docs, owner){
  return E.mergeRecords(E.ownedList(docs['pesk-deposits'] || {}, owner))
    .map(d => ({...d, id:d.id || ('legacy-' + [d.planId, d.amount, d.startDate].join('|')), studentNum:Number(owner.num), accountUid:owner.uid || ''}));
}
function myPortfolio(docs, owner){
  return E.mergeRecords(E.ownedList(docs['pesk-portfolios'] || {}, owner))
    .map(p => ({...p, qty:Number(p.qty), avgPrice:Number(p.avgPrice) || 0, studentNum:Number(owner.num), accountUid:owner.uid || ''}));
}
function assetTotal(cash, portfolio, deposits, prices, nowMs){
  const stock = portfolio.reduce((s, p) => s + Number(prices[p.code] || p.avgPrice || 0) * Number(p.qty || 0), 0);
  const dep = deposits.reduce((s, d) => s + E.depositValue(d, nowMs), 0);
  return {cash, stockValue:Math.round(stock), depositTotal:Math.round(dep), total:Math.round(cash + stock + dep)};
}
function pushLog(docs, entry){
  const logs = Array.isArray(docs['pesk-purchase-log']) ? docs['pesk-purchase-log'] : [];
  logs.push(entry);
  if(logs.length > LOG_LIMIT) logs.splice(0, logs.length - LOG_LIMIT);
  docs['pesk-purchase-log'] = logs;
}
function baseLog(ctx, students, idx){
  return {id:ctx.newId(), roomId:ctx.roomId, studentNum:Number(ctx.owner.num), studentName:students[idx].name || '',
    accountUid:ctx.owner.uid || '', actor:'student', via:'server', ts:ctx.now, createdAt:new Date(ctx.now).toISOString()};
}

// ── 예금 가입 ──
function applyDeposit(docs, ctx, input){
  const amount = Number(input.amount);
  if(!Number.isSafeInteger(amount) || amount < 10) fail('invalid-argument', '10 🪙 이상의 정수로 예금해주세요.');
  const plan = findPlan(docs['tesk-bank-plans'], input.planId);
  if(!plan) fail('failed-precondition', '예금 상품을 찾을 수 없어요. 화면을 새로 불러와 주세요.');
  const students = docs['tesk-students'] || [];
  const idx = studentIndex(students, ctx.owner.num);
  const before = Number(students[idx].points || 0);
  if(before < 0) fail('failed-precondition', '잔고가 마이너스라서 지금은 예금할 수 없어요.');
  if(before < amount) fail('failed-precondition', `보유 금액이 부족해요. (보유 ${before} 🪙)`);
  const deposits = myDeposits(docs, ctx.owner);
  const portfolio = myPortfolio(docs, ctx.owner);
  const prices = docs['tesk-stock-prices'] || {};
  const assetBefore = assetTotal(before, portfolio, deposits, prices, ctx.now);
  const dep = {id:ctx.newId(), accountUid:ctx.owner.uid || '', studentNum:Number(ctx.owner.num), planId:plan.id, label:plan.label,
    amount, rate:plan.rate, termDays:plan.days, startDate:new Date(ctx.now).toISOString()};
  deposits.push(dep);
  students[idx].points = before - amount;
  docs['tesk-students'] = students;
  docs['pesk-deposits'] = E.setOwnedList(docs['pesk-deposits'] || {}, ctx.owner, deposits);
  pushLog(docs, {...baseLog(ctx, students, idx), type:'bank_deposit', detail:`${plan.label} 예금`, delta:-amount,
    balanceBefore:before, balanceAfter:before - amount, assetBefore, assetAfter:assetTotal(before - amount, portfolio, deposits, prices, ctx.now),
    meta:{depositId:dep.id, planId:plan.id, planLabel:plan.label, rate:plan.rate, termDays:plan.days}});
  return {deposit:dep, before, after:before - amount};
}

// ── 예금 해지 ── (같은 예금 id는 한 번만 지급된다: 목록에서 빠진 뒤엔 찾을 수 없다)
function applyWithdraw(docs, ctx, input){
  const depositId = String(input.depositId || '');
  if(!depositId) fail('invalid-argument', '예금 정보가 필요해요.');
  const students = docs['tesk-students'] || [];
  const idx = studentIndex(students, ctx.owner.num);
  const deposits = myDeposits(docs, ctx.owner);
  const depIdx = deposits.findIndex(d => String(d.id) === depositId);
  if(depIdx < 0) fail('not-found', '이미 해지되었거나 찾을 수 없는 예금이에요.');
  const dep = deposits[depIdx];
  const matured = ctx.now - new Date(dep.startDate).getTime() >= Number(dep.termDays) * DAY;
  if(input.matured && !matured) fail('failed-precondition', '아직 만기가 되지 않은 예금이에요.');
  const payout = E.depositValue(dep, ctx.now);
  if(!Number.isSafeInteger(payout) || payout < 0) fail('failed-precondition', '예금 금액을 확인해주세요.');
  const portfolio = myPortfolio(docs, ctx.owner);
  const prices = docs['tesk-stock-prices'] || {};
  const before = Number(students[idx].points || 0);
  const assetBefore = assetTotal(before, portfolio, deposits, prices, ctx.now);
  deposits.splice(depIdx, 1);
  students[idx].points = before + payout;
  docs['tesk-students'] = students;
  docs['pesk-deposits'] = E.setOwnedList(docs['pesk-deposits'] || {}, ctx.owner, deposits);
  const label = matured ? '만기 수령' : '중도 해지';
  pushLog(docs, {...baseLog(ctx, students, idx), type:'bank_withdraw', detail:`${dep.label || ''} ${label}`, delta:payout,
    balanceBefore:before, balanceAfter:before + payout, assetBefore, assetAfter:assetTotal(before + payout, portfolio, deposits, prices, ctx.now),
    meta:{depositId:dep.id, planId:dep.planId, matured}});
  return {payout, matured, before, after:before + payout};
}

function tradeQty(v){
  const qty = Number(v);
  if(!Number.isSafeInteger(qty) || qty <= 0 || qty > 9999) fail('invalid-argument', '수량은 1~9999 사이의 정수로 입력해주세요.');
  return qty;
}
function serverPrice(docs, code){
  const price = Number((docs['tesk-stock-prices'] || {})[code]);
  if(!Number.isFinite(price) || price <= 0) fail('failed-precondition', '주식 가격 정보를 찾을 수 없어요.');
  return price;
}

// ── 주식 매수 ── (화면에 본 가격보다 비싸졌으면 거절, 같거나 싸면 서버 가격으로)
function applyBuy(docs, ctx, input){
  const code = String(input.code || '');
  const qty = tradeQty(input.qty);
  const price = serverPrice(docs, code);
  if(Number.isFinite(Number(input.seenPrice)) && price > Number(input.seenPrice)) fail('aborted', `주식 가격이 방금 올랐어요. (현재 ${price} 🪙)`);
  const cost = price * qty;
  const students = docs['tesk-students'] || [];
  const idx = studentIndex(students, ctx.owner.num);
  const before = Number(students[idx].points || 0);
  if(before < cost) fail('failed-precondition', `현금이 부족해요. (보유 ${before} 🪙)`);
  const portfolio = myPortfolio(docs, ctx.owner);
  const deposits = myDeposits(docs, ctx.owner);
  const prices = docs['tesk-stock-prices'] || {};
  const assetBefore = assetTotal(before, portfolio, deposits, prices, ctx.now);
  const existing = portfolio.find(p => p.code === code);
  if(existing){
    const nextQty = existing.qty + qty;
    existing.avgPrice = Math.round((existing.avgPrice * existing.qty + price * qty) / nextQty);
    existing.qty = nextQty;
  }else{
    portfolio.push({code, name:String(input.name || code).slice(0, 40), qty, avgPrice:price, studentNum:Number(ctx.owner.num), accountUid:ctx.owner.uid || ''});
  }
  students[idx].points = before - cost;
  docs['tesk-students'] = students;
  docs['pesk-portfolios'] = E.setOwnedList(docs['pesk-portfolios'] || {}, ctx.owner, portfolio);
  const name = (existing || portfolio[portfolio.length - 1]).name;
  pushLog(docs, {...baseLog(ctx, students, idx), type:'stock_buy', detail:`${name} ${qty}주 매수`, delta:-cost,
    balanceBefore:before, balanceAfter:before - cost, assetBefore, assetAfter:assetTotal(before - cost, portfolio, deposits, prices, ctx.now),
    meta:{code, name, qty, price}});
  return {price, cost, before, after:before - cost};
}

// ── 주식 매도 ── (화면에 본 가격과 다르면 거절 — 학생이 모르는 가격으로 팔리지 않게)
function applySell(docs, ctx, input){
  const code = String(input.code || '');
  const qty = tradeQty(input.qty);
  const price = serverPrice(docs, code);
  if(Number.isFinite(Number(input.seenPrice)) && price !== Number(input.seenPrice)) fail('aborted', `주식 가격이 방금 바뀌었어요. (현재 ${price} 🪙)`);
  const students = docs['tesk-students'] || [];
  const idx = studentIndex(students, ctx.owner.num);
  const portfolio = myPortfolio(docs, ctx.owner);
  const h = portfolio.find(p => p.code === code);
  if(!h || h.qty < qty) fail('failed-precondition', '보유 수량이 부족해요.');
  const deposits = myDeposits(docs, ctx.owner);
  const prices = docs['tesk-stock-prices'] || {};
  const before = Number(students[idx].points || 0);
  const assetBefore = assetTotal(before, portfolio, deposits, prices, ctx.now);
  const gain = price * qty;
  h.qty -= qty;
  const next = portfolio.filter(p => p.qty > 0);
  students[idx].points = before + gain;
  docs['tesk-students'] = students;
  docs['pesk-portfolios'] = E.setOwnedList(docs['pesk-portfolios'] || {}, ctx.owner, next);
  pushLog(docs, {...baseLog(ctx, students, idx), type:'stock_sell', detail:`${h.name || code} ${qty}주 매도`, delta:gain,
    balanceBefore:before, balanceAfter:before + gain, assetBefore, assetAfter:assetTotal(before + gain, next, deposits, prices, ctx.now),
    meta:{code, name:h.name || code, qty, price}});
  return {price, gain, before, after:before + gain};
}

const KEYS = ['tesk-students','pesk-deposits','pesk-portfolios','tesk-stock-prices','tesk-bank-plans','pesk-purchase-log'];
const WRITABLE = ['tesk-students','pesk-deposits','pesk-portfolios','pesk-purchase-log'];

// Firestore onCall 핸들러 묶음. requireStudent(request, roomId) → {num, acc}.
function createBank({db, HttpsError, requireStudent}){
  const run = apply => async request => {
    const data = request.data || {};
    const roomId = String(data.roomId || '');
    if(!roomId) throw new HttpsError('invalid-argument', '학급 정보가 필요해요.');
    const {num, acc} = await requireStudent(request, roomId);
    const owner = {uid:String(acc?.accountUid || ''), num:Number(num)};
    const refs = KEYS.map(k => db.doc(`classrooms/${roomId}/data/${k}`));
    try{
      return await db.runTransaction(async txn => {
        const snaps = await Promise.all(refs.map(r => txn.get(r)));
        const docs = {};
        KEYS.forEach((k, i) => { docs[k] = snaps[i].exists ? snaps[i].get('value') : undefined; });
        const ctx = {roomId, owner, now:Date.now(), newId:() => db.collection('_ids').doc().id};
        const result = apply(docs, ctx, data);
        const at = new Date(ctx.now).toISOString();
        KEYS.forEach((k, i) => { if(WRITABLE.includes(k) && docs[k] !== undefined) txn.set(refs[i], {value:docs[k], updatedAt:at}); });
        return result;
      });
    }catch(e){
      if(e instanceof BankError) throw new HttpsError(e.code, e.message);
      throw e;
    }
  };
  return {
    bankDeposit: run(applyDeposit),
    bankWithdraw: run(applyWithdraw),
    stockBuy: run(applyBuy),
    stockSell: run(applySell),
  };
}

module.exports = {createBank, applyDeposit, applyWithdraw, applyBuy, applySell, findPlan, BankError, DEFAULT_BANK_PLANS};
