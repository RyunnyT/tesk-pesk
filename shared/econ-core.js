/* 학급 경제 계산 규칙 — 화면·저장소 없이 계산만 한다 (학생 앱·교사 화면·테스트 공통).

   · 경제 지표: 통화량, 총자산, 상위 비중, 지니계수
   · 예금 규칙: 1인 예금 한도, 중도 해지 이자
   · 누진 재산세: 구간별 세율, 미납 세금
   · 학급 공동 기금: 기부, 목표, 세금·경매 수입
   · 경매: 입찰(맡겨 두기)·이전 최고 입찰자 환불·낙찰
   · 거래 로그: 하루 합계로 묶기, 보관(주 단위)으로 옮기기

   기본값은 지금까지와 같은 동작이다. 학급마다 선생님이 켠 규칙만 적용된다. */
(function(root){
'use strict';
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const int = (v, d = 0) => Math.round(num(v, d));

/* ── 경제 지표 ── */
function gini(values){
  const xs = (values || []).map(v => Math.max(0, num(v))).sort((a, b) => a - b);
  const n = xs.length, sum = xs.reduce((a, b) => a + b, 0);
  if(n < 2 || sum <= 0) return 0;
  let acc = 0;
  xs.forEach((x, i) => { acc += (2 * (i + 1) - n - 1) * x; });
  return Math.round(acc / (n * sum) * 100) / 100;
}
/* rows: [{num, name, cash, deposits, stocks}] */
function indicators(rows){
  const list = (rows || []).map(r => {
    const cash = int(r.cash), deposits = int(r.deposits), stocks = int(r.stocks);
    return {num: r.num, name: r.name, cash, deposits, stocks, total: cash + deposits + stocks};
  });
  const sum = k => list.reduce((a, r) => a + r[k], 0);
  const totals = list.map(r => r.total).sort((a, b) => b - a);
  const total = sum('total');
  const share = k => total > 0 ? Math.round(totals.slice(0, k).reduce((a, b) => a + b, 0) / total * 1000) / 10 : 0;
  const sorted = totals.slice().sort((a, b) => a - b);
  const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)) : 0;
  return {
    students: list.length, cash: sum('cash'), deposits: sum('deposits'), stocks: sum('stocks'), total,
    top10Share: share(Math.max(1, Math.round(list.length * 0.1))), top3Share: share(3),
    gini: gini(totals), median, min: sorted[0] || 0, max: sorted[sorted.length - 1] || 0, rows: list
  };
}
function giniLabel(g){
  return g >= 0.6 ? '아주 쏠림' : g >= 0.45 ? '많이 쏠림' : g >= 0.3 ? '보통' : '고른 편';
}

/* ── 예금 ── */
const BANK_DEFAULTS = {maxPerStudent: 0, earlyPct: 30};          // 0 = 한도 없음 (지금까지와 같다)
const BANK_RECOMMENDED = {maxPerStudent: 50000, earlyPct: 0};
const RECOMMENDED_PLANS = [
  {id: 'w1', label: '1주일', days: 7, rate: 0.3},
  {id: 'w2', label: '2주일', days: 14, rate: 0.7},
  {id: 'm1', label: '1개월', days: 30, rate: 1.5},
  {id: 'm3', label: '3개월', days: 90, rate: 3},
  {id: 'm6', label: '6개월', days: 180, rate: 5}
];
function bankSettings(raw){
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    maxPerStudent: Math.max(0, int(r.maxPerStudent, BANK_DEFAULTS.maxPerStudent)),
    earlyPct: Math.max(0, Math.min(100, num(r.earlyPct, BANK_DEFAULTS.earlyPct)))
  };
}
/* 중도 해지 때 이자를 몇 % 줄지 — 예금마다 만들 때의 규칙을 남긴다. 예전 예금(값 없음)은 30% */
function depositEarlyPct(dep){ return dep && dep.earlyPct != null && Number.isFinite(Number(dep.earlyPct)) ? Math.max(0, Math.min(100, Number(dep.earlyPct))) : 30; }
function depositValueAt(dep, nowMs){
  const start = new Date(dep && dep.startDate).getTime(), termDays = num(dep && dep.termDays), amount = num(dep && dep.amount);
  if(!start || !termDays || !amount) return Math.floor(amount);
  const elapsed = Math.max(0, (num(nowMs, Date.now()) - start) / 86400000);
  const progress = Math.min(1, elapsed / termDays), rate = num(dep.rate) / 100;
  const eff = progress >= 1 ? rate : rate * (depositEarlyPct(dep) / 100) * progress;
  return Math.floor(amount * (1 + eff));
}
/* 새 예금을 넣어도 되는가 — 만기 전 예금 원금 합계 + 새 금액 ≤ 한도 */
function depositRoom(deposits, settings){
  const s = bankSettings(settings);
  if(!s.maxPerStudent) return Infinity;
  const used = (deposits || []).reduce((a, d) => a + Math.max(0, num(d && d.amount)), 0);
  return Math.max(0, s.maxPerStudent - used);
}

/* ── 누진 재산세 ── */
const WEALTH_DEFAULT = {enabled: false, toFund: true, brackets: [
  {min: 0, rate: 0}, {min: 10000, rate: 1}, {min: 50000, rate: 3}, {min: 200000, rate: 5}
]};
function wealthSettings(raw){
  const r = raw && typeof raw === 'object' ? raw : {};
  const list = (Array.isArray(r.brackets) && r.brackets.length ? r.brackets : WEALTH_DEFAULT.brackets)
    .map(b => ({min: Math.max(0, int(b && b.min)), rate: Math.max(0, Math.min(50, num(b && b.rate)))}))
    .sort((a, b) => a.min - b.min);
  if(!list.length || list[0].min !== 0) list.unshift({min: 0, rate: 0});
  const brackets = list.filter((b, i) => i === 0 || b.min !== list[i - 1].min);
  return {enabled: r.enabled === true, toFund: r.toFund !== false, brackets, lastRunAt: String(r.lastRunAt || '')};
}
/* 구간별로 넘는 부분에만 그 세율 (누진) */
function wealthTax(assets, settings){
  const s = wealthSettings(settings), a = Math.max(0, num(assets));
  let tax = 0;
  const parts = [];
  s.brackets.forEach((b, i) => {
    const top = i + 1 < s.brackets.length ? s.brackets[i + 1].min : Infinity;
    const portion = Math.max(0, Math.min(a, top) - b.min);
    if(portion > 0 && b.rate > 0){ const t = portion * b.rate / 100; tax += t; parts.push({from: b.min, to: top, rate: b.rate, portion, tax: Math.floor(t)}); }
  });
  return {tax: Math.floor(tax), parts, top: s.brackets.filter(b => a > b.min).pop() || s.brackets[0]};
}
/* 세금 내기 — 현금에서만 낸다. 모자라면 미납으로 남기고 다음 징수 때 함께 낸다 (잔액이 마이너스가 되지 않는다) */
function payTax(cash, tax, prevDue){
  const owe = Math.max(0, int(tax)) + Math.max(0, int(prevDue));
  const paid = Math.min(Math.max(0, int(cash)), owe);
  return {paid, due: owe - paid, cashAfter: int(cash) - paid};
}

/* ── 학급 공동 기금 ── */
function fundState(raw){
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    balance: Math.max(0, int(r.balance)),
    goals: (Array.isArray(r.goals) ? r.goals : []).filter(g => g && g.id).map(g => ({...g, target: Math.max(1, int(g.target, 1)), raised: Math.max(0, int(g.raised)),
      status: ['open', 'funded', 'done'].includes(g.status) ? g.status : 'open', donors: Array.isArray(g.donors) ? g.donors.map(String) : []})),
    history: Array.isArray(r.history) ? r.history.slice(-200) : []
  };
}
function fundHistory(f, item){ f.history.push({id: item.id || ('fh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), at: new Date().toISOString(), ...item}); if(f.history.length > 200) f.history.splice(0, f.history.length - 200); }
/* 기부: 목표가 있으면 그 목표에, 없으면 공동 기금 잔액에. 목표를 넘친 금액은 잔액으로 간다. */
function donate(raw, {goalId, amount, num: who, name}){
  const f = fundState(raw), amt = int(amount);
  if(!Number.isSafeInteger(amt) || amt < 1) throw new Error('DONATE_AMOUNT');
  let goal = null, toGoal = 0;
  if(goalId){
    goal = f.goals.find(g => g.id === goalId);
    if(!goal || goal.status !== 'open') throw new Error('GOAL_CLOSED');
    toGoal = Math.min(amt, goal.target - goal.raised);
    goal.raised += toGoal;
    if(who != null && !goal.donors.includes(String(who))) goal.donors.push(String(who));
    if(goal.raised >= goal.target){ goal.status = 'funded'; goal.fundedAt = new Date().toISOString(); }
  }
  f.balance += amt - toGoal;
  fundHistory(f, {type: 'donate', num: who, name: String(name || ''), amount: amt, goalId: goal ? goal.id : ''});
  return {fund: f, toGoal, toBalance: amt - toGoal, goal};
}
function addToFund(raw, amount, type, detail){
  const f = fundState(raw), amt = Math.max(0, int(amount));
  if(amt){ f.balance += amt; fundHistory(f, {type, amount: amt, detail: String(detail || '')}); }
  return f;
}
/* 교사: 잔액을 목표로 옮기기 */
function allocate(raw, goalId, amount){
  const f = fundState(raw), goal = f.goals.find(g => g.id === goalId);
  if(!goal || goal.status !== 'open') throw new Error('GOAL_CLOSED');
  const amt = Math.min(Math.max(0, int(amount)), f.balance, goal.target - goal.raised);
  if(amt < 1) throw new Error('NO_BALANCE');
  f.balance -= amt; goal.raised += amt;
  if(goal.raised >= goal.target){ goal.status = 'funded'; goal.fundedAt = new Date().toISOString(); }
  fundHistory(f, {type: 'allocate', amount: amt, goalId});
  return f;
}

/* ── 경매 ── 입찰액은 바로 맡겨 두고(현금에서 빠짐), 더 높은 입찰이 오면 밀려난 입찰자에게 돌려준다.
   물건이 여러 개(qty)면 높은 순서로 qty명이 하나씩 낙찰받는다 (한 학생은 하나까지, 각자 부른 값을 낸다).
   tops: 지금 낙찰권 안에 있는 입찰 (높은 값 순, 같은 값이면 먼저 부른 사람이 앞). top 은 그 맨 앞 (예전 기록·화면 호환) */
const AUCTION_MAX_QTY = 30;
const byBid = (p, q) => (q.amount - p.amount) || String(p.at || '').localeCompare(String(q.at || ''));
function auctionState(a){
  const x = a && typeof a === 'object' ? a : {};
  const qty = Math.max(1, Math.min(AUCTION_MAX_QTY, int(x.qty, 1)));
  const raw = Array.isArray(x.tops) ? x.tops : (x.top && x.top.num != null ? [x.top] : []);
  const tops = raw.filter(t => t && t.num != null).map(t => ({...t, amount: int(t.amount)})).sort(byBid).slice(0, qty);
  return {...x, qty, startPrice: Math.max(1, int(x.startPrice, 1)), step: Math.max(1, int(x.step, 100)),
    status: ['open', 'closed', 'cancelled'].includes(x.status) ? x.status : 'open',
    bids: Array.isArray(x.bids) ? x.bids.slice(-30) : [], tops, top: tops[0] || null};
}
/* 다음 입찰 최소 금액 — who 를 주면 그 학생 기준 (이미 낙찰권 안이면 내 입찰 + 호가) */
function minBid(a, who){
  const s = auctionState(a), mine = who != null ? s.tops.find(t => String(t.num) === String(who)) : null;
  if(mine) return mine.amount + s.step;
  return s.tops.length < s.qty ? s.startPrice : s.tops[s.tops.length - 1].amount + s.step;
}
/* 반환: {auction, pay(내가 더 낼 돈), refund:{num, amount}|null (낙찰권에서 밀려난 입찰자)} */
function placeBid(raw, {num: who, name, amount, cash, now = Date.now()}){
  const a = auctionState(raw), amt = int(amount);
  if(a.status !== 'open') throw new Error('AUCTION_CLOSED');
  if(a.endsAt && new Date(a.endsAt).getTime() <= now) throw new Error('AUCTION_ENDED');
  const min = minBid(a, who);
  if(!Number.isSafeInteger(amt) || amt < min) throw new Error('BID_TOO_LOW:' + min);
  const mine = a.tops.find(t => String(t.num) === String(who));
  const pay = mine ? amt - mine.amount : amt;          // 이미 낙찰권 안이면 차액만 더 맡긴다
  if(num(cash) < pay) throw new Error('NOT_ENOUGH_CASH:' + pay);
  let refund = null;
  if(!mine && a.tops.length >= a.qty){ const out = a.tops.pop(); refund = {num: out.num, name: out.name, amount: out.amount}; }
  const at = new Date(now).toISOString(), myName = String(name || '');
  if(mine){ mine.amount = amt; mine.at = at; if(myName) mine.name = myName; }
  else a.tops.push({num: who, name: myName, amount: amt, at});
  a.tops.sort(byBid);
  a.top = a.tops[0];
  a.bids.push({num: who, name: myName, amount: amt, at});
  if(a.bids.length > 30) a.bids.splice(0, a.bids.length - 30);
  return {auction: a, pay, refund};
}
/* 교사: 마감 확정(낙찰) 또는 취소(낙찰권 안의 모든 입찰자에게 환불).
   winner/refund 는 첫 번째 것 (예전 호출 호환), winners/refunds 가 전체 */
function closeAuction(raw, {cancel = false, now = Date.now()} = {}){
  const a = auctionState(raw);
  if(a.status !== 'open') throw new Error('AUCTION_CLOSED');
  a.status = cancel ? 'cancelled' : 'closed';
  a.closedAt = new Date(now).toISOString();
  const winners = cancel ? [] : a.tops.map(t => ({...t}));
  const refunds = cancel ? a.tops.map(t => ({num: t.num, amount: t.amount})) : [];
  if(!cancel){ a.winner = winners[0] || null; a.winners = winners; }
  return {auction: a, refund: refunds[0] || null, refunds, winner: winners[0] || null, winners};
}
/* 경매 목록 줄이기·지우기 — 진행 중인 경매(맡긴 돈이 있다)는 절대 버리지 않는다. 끝난 경매만 오래된 것부터 버린다.
   (예전에는 새 경매를 열 때 앞에서부터 잘라서, 오래 열어 둔 경매가 입찰금과 함께 사라질 수 있었다) */
function trimAuctions(list, keep = 30){
  const xs = (Array.isArray(list) ? list : []).filter(Boolean);
  let extra = xs.length - keep;
  return xs.filter(a => { if(extra > 0 && (a.status === 'closed' || a.status === 'cancelled')){ extra--; return false; } return true; });
}
function removeAuction(list, id){
  const xs = Array.isArray(list) ? list : [], i = xs.findIndex(a => a && a.id === id);
  if(i < 0) throw new Error('AUCTION_NOT_FOUND');
  if(xs[i].status !== 'closed' && xs[i].status !== 'cancelled') throw new Error('AUCTION_STILL_OPEN');
  return xs.filter((_, k) => k !== i);
}

/* ── 자리 경매 ── 선생님이 고른 자리마다 따로 입찰한다.
   · 한 학생은 동시에 한 자리에서만 최고 입찰자가 될 수 있다 (밀려나면 다른 자리에 다시 입찰).
   · 학생 화면에는 금액만 보인다 — 자리 기록에는 이름을 남기지 않고 번호만 남긴다. */
function seatAuctionState(a){
  const x = auctionState(a), layout = x.layout || {};
  const rows = Math.max(1, Math.min(10, int(layout.rows, 4))), cols = Math.max(1, Math.min(12, int(layout.cols, 6)));
  const lots = (Array.isArray(x.lots) ? x.lots : []).filter(l => l && Number.isInteger(Number(l.seat)) && Number(l.seat) >= 0 && Number(l.seat) < rows * cols)
    .map(l => ({seat: Number(l.seat), top: l.top && l.top.num != null ? {num: l.top.num, amount: int(l.top.amount), at: l.top.at} : null, bids: Number(l.bids) || 0, winner: l.winner != null ? l.winner : null}));
  const voids = [...new Set((Array.isArray(layout.voids) ? layout.voids : []).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < rows * cols))].sort((p, q) => p - q);
  return {...x, kind: 'seats', layout: {rows, cols, pairDesks: layout.pairDesks !== false, voids}, lots: lots.filter(l => !voids.includes(l.seat))};
}
function seatMinBid(a, seat){ const s = seatAuctionState(a), lot = s.lots.find(l => l.seat === Number(seat)); return lot && lot.top ? lot.top.amount + s.step : s.startPrice; }
function placeSeatBid(raw, {num: who, seat, amount, cash, now = Date.now()}){
  const a = seatAuctionState(raw), amt = int(amount), lot = a.lots.find(l => l.seat === Number(seat));
  if(a.status !== 'open') throw new Error('AUCTION_CLOSED');
  if(a.endsAt && new Date(a.endsAt).getTime() <= now) throw new Error('AUCTION_ENDED');
  if(!lot) throw new Error('SEAT_NOT_IN_AUCTION');
  const mine = lot.top && String(lot.top.num) === String(who);
  if(!mine && a.lots.some(l => l !== lot && l.top && String(l.top.num) === String(who))) throw new Error('ALREADY_TOP_ELSEWHERE');
  const min = lot.top ? lot.top.amount + a.step : a.startPrice;
  if(!Number.isSafeInteger(amt) || amt < min) throw new Error('BID_TOO_LOW:' + min);
  const pay = mine ? amt - lot.top.amount : amt;
  if(num(cash) < pay) throw new Error('NOT_ENOUGH_CASH:' + pay);
  const refund = lot.top && !mine ? {num: lot.top.num, amount: lot.top.amount} : null;
  lot.top = {num: who, amount: amt, at: new Date(now).toISOString()};
  lot.bids += 1;
  return {auction: a, pay, refund};
}
/* 마감 확정: 자리마다 최고 입찰자가 낙찰. 취소: 모든 최고 입찰자에게 환불 */
function closeSeatAuction(raw, {cancel = false, now = Date.now()} = {}){
  const a = seatAuctionState(raw);
  if(a.status !== 'open') throw new Error('AUCTION_CLOSED');
  a.status = cancel ? 'cancelled' : 'closed';
  a.closedAt = new Date(now).toISOString();
  const winners = {}, refunds = [];
  a.lots.forEach(l => { if(!l.top) return; if(cancel) refunds.push({num: l.top.num, amount: l.top.amount}); else { l.winner = l.top.num; winners[l.seat] = l.top.num; } });
  return {auction: a, winners, refunds};
}
/* 낙찰 결과를 자리표에 넣는다. 낙찰자는 낙찰 자리로, 그 자리에 있던 학생과 자리표에 없던 학생은 빈자리로.
   (남은 학생 배치는 선생님이 자리 두 개를 눌러 바꾼다) */
function applySeatWinners(grid, rows, cols, winners, rosterNums, voids){
  const n = rows * cols, blocked = new Set((voids || []).map(Number));
  const g = Array.from({length: n}, (_, i) => (!blocked.has(i) && Array.isArray(grid) && grid.length === n && grid[i] != null) ? Number(grid[i]) : null);
  const won = Object.entries(winners || {}).map(([seat, who]) => [Number(seat), Number(who)]).filter(([s]) => s >= 0 && s < n);
  const winnerSet = new Set(won.map(([, w]) => w)), wonSeats = new Set(won.map(([s]) => s));
  for(let i = 0; i < n; i++) if(winnerSet.has(g[i])) g[i] = null;          // 낙찰자를 원래 자리에서 뺀다
  const displaced = [];
  won.forEach(([s, w]) => { if(g[s] != null) displaced.push(g[s]); g[s] = w; });
  const placed = new Set(g.filter(x => x != null));
  (rosterNums || []).map(Number).forEach(x => { if(!placed.has(x) && !displaced.includes(x)) displaced.push(x); });
  displaced.forEach(x => { const i = g.findIndex((v, k) => v == null && !wonSeats.has(k) && !blocked.has(k)); if(i >= 0) g[i] = x; });
  return g;
}
/* 자리표 모양 바꾸기 — 같은 줄·칸 위치는 그대로 두고, 새 모양 밖으로 나간 칸만 버린다 */
function reshapeSeats({grid, voids, rows, cols}, nextRows, nextCols){
  const n = nextRows * nextCols, g = Array(n).fill(null), v = [];
  (grid || []).forEach((who, i) => { const r = Math.floor(i / cols), c = i % cols; if(who != null && r < nextRows && c < nextCols) g[r * nextCols + c] = Number(who); });
  (voids || []).forEach(i => { const r = Math.floor(i / cols), c = i % cols; if(r < nextRows && c < nextCols) v.push(r * nextCols + c); });
  return {grid: g, voids: v};
}
/* 자리표에 없는 학생을 번호순으로 빈 책상에 앉힌다 */
function fillSeats(grid, rows, cols, rosterNums, voids){
  const n = rows * cols, blocked = new Set((voids || []).map(Number));
  const g = Array.from({length: n}, (_, i) => (!blocked.has(i) && Array.isArray(grid) && grid[i] != null) ? Number(grid[i]) : null);
  const placed = new Set(g.filter(x => x != null));
  (rosterNums || []).map(Number).sort((p, q) => p - q).forEach(x => { if(placed.has(x)) return; const i = g.findIndex((v, k) => v == null && !blocked.has(k)); if(i >= 0){ g[i] = x; placed.add(x); } });
  return g;
}

/* ── 거래 로그 ── */
/* 같은 id 가 있으면 금액·횟수를 더한다 (모험 정답 보상을 하루 한 줄로) */
function upsertLog(logs, entry){
  const i = entry.id ? logs.findIndex(l => l && l.id === entry.id) : -1;
  if(i < 0){ logs.push({...entry, count: num(entry.count, 1)}); return logs; }
  const cur = logs[i];
  logs[i] = {...cur, delta: num(cur.delta) + num(entry.delta), count: num(cur.count, 1) + num(entry.count, 1),
    balanceAfter: entry.balanceAfter != null ? entry.balanceAfter : cur.balanceAfter, ts: entry.ts || cur.ts, updatedAt: entry.createdAt || cur.createdAt,
    detail: entry.detail || cur.detail, meta: {...(cur.meta || {}), ...(entry.meta || {})}};
  return logs;
}
const isPendingUse = l => l && l.type === 'shop_use_request' && String((l.approval && l.approval.status) || l.status || 'pending') === 'pending';
function logTime(l){ return num(l && (l.ts || l.timestamp)) || new Date(l && l.createdAt).getTime() || 0; }
/* ISO 주 (보관 문서 이름) */
function weekKey(ms){
  const d = new Date(ms + 9 * 3600000);   // 한국 시간 기준
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
/* 모험 정답 보상 낱줄을 학생·날짜별 한 줄로 합친다 (보관 전에 크기를 줄인다) */
function compactQuizRewards(logs){
  const out = [], byKey = new Map();
  (logs || []).forEach(l => {
    if(!l || l.type !== 'quiz_reward' || String(l.id || '').startsWith('qz-')){ out.push(l); return; }
    const day = new Date(logTime(l) + 9 * 3600000).toISOString().slice(0, 10);
    const key = 'qz-' + day + '-' + l.studentNum;
    if(!byKey.has(key)){
      const row = {id: key, type: 'quiz_reward', studentNum: l.studentNum, studentName: l.studentName, accountUid: l.accountUid, actor: l.actor || 'student',
        delta: 0, count: 0, balanceBefore: l.balanceBefore, balanceAfter: l.balanceAfter, ts: logTime(l), createdAt: l.createdAt, detail: '모험 학습 정답 보상 (하루 합계)', meta: {compacted: true}};
      byKey.set(key, row); out.push(row);
    }
    const row = byKey.get(key);
    row.delta += num(l.delta); row.count += num(l.count, 1); row.balanceAfter = l.balanceAfter; row.ts = Math.max(row.ts, logTime(l));
  });
  return out;
}
/* olderThanMs 보다 오래된(처리 안 된 사용 요청은 제외) 줄을 주별 보관으로 옮긴다 */
function splitForArchive(logs, {now = Date.now(), keepDays = 21} = {}){
  const cut = now - keepDays * 86400000, keep = [], archive = {};
  compactQuizRewards(logs).forEach(l => {
    const t = logTime(l);
    if(t && t < cut && !isPendingUse(l)){ const k = weekKey(t); (archive[k] = archive[k] || []).push(l); }
    else keep.push(l);
  });
  return {keep, archive};
}
function bytesOf(v){ const s = JSON.stringify(v); return typeof TextEncoder === 'function' ? new TextEncoder().encode(s).length : s.length * 3; }

/* ── 우리반 펀드 (전체 종목 평균을 따라가는 상품) ── */
const INDEX_CODE = 'IDX100', INDEX_NAME = '우리반 펀드', INDEX_BASE_VALUE = 1000;
function indexPrice(prices, base){
  const codes = Object.keys(base || {}).filter(c => c !== INDEX_CODE && num(base[c]) > 0 && num(prices && prices[c]) > 0);
  if(!codes.length) return INDEX_BASE_VALUE;
  const avg = codes.reduce((a, c) => a + num(prices[c]) / num(base[c]), 0) / codes.length;
  return Math.max(1, Math.round(INDEX_BASE_VALUE * avg));
}

/* 꺼 둔 기능 — 코드는 남겨 두고 화면에서만 숨긴다 (2026-10-09 선생님 요청: 공동 기금·우리반 펀드 사용 안 함).
   다시 쓰려면 true 로 바꾸고, 공동 기금은 firestore.rules 의 학생 쓰기 목록에 'pesk-class-fund' 도 다시 넣는다. */
const FEATURES = {fund: false, classIndex: false};

const API = {FEATURES, gini, indicators, giniLabel, BANK_DEFAULTS, BANK_RECOMMENDED, RECOMMENDED_PLANS, bankSettings, depositEarlyPct, depositValueAt, depositRoom,
  WEALTH_DEFAULT, wealthSettings, wealthTax, payTax, fundState, donate, addToFund, allocate,
  AUCTION_MAX_QTY, auctionState, minBid, placeBid, closeAuction, trimAuctions, removeAuction, seatAuctionState, seatMinBid, placeSeatBid, closeSeatAuction, applySeatWinners, reshapeSeats, fillSeats, upsertLog, isPendingUse, logTime, weekKey, compactQuizRewards, splitForArchive, bytesOf,
  INDEX_CODE, INDEX_NAME, INDEX_BASE_VALUE, indexPrice};
if(typeof module === 'object' && module.exports) module.exports = API;
root.EconCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
