/* 학생 앱: 학급 공동 기금 · 경매 · 세금 영수증 · 예금 규칙 안내 · 정답 보상 로그 묶기
   계산 규칙은 shared/econ-core.js (EconCore). pesk.html 의 전역(students, myStudentNum, roomId …)을 쓴다. */
let classFund = null;                 // EconCore.fundState
let classAuctions = [];               // 경매 목록
let bankRules = null;                 // EconCore.bankSettings
let wealthRules = null;               // EconCore.wealthSettings
let _shopEconPullAt = 0, _shopEconPullBusy = false;

function applyEconExtras({fund, auctions, bank, wealth} = {}){
  if(fund !== undefined) classFund = window.EconCore.fundState(fund);
  if(auctions !== undefined) classAuctions = Array.isArray(auctions) ? auctions : [];
  if(bank !== undefined) bankRules = window.EconCore.bankSettings(bank);
  if(wealth !== undefined) wealthRules = window.EconCore.wealthSettings(wealth);
}
function myBankRules(){ return bankRules || window.EconCore.bankSettings(null); }
function myWealthRules(){ return wealthRules || window.EconCore.wealthSettings(null); }

/* 상점 화면용 자료 — 거래 로그(사용 요청)·공동 기금·경매. 실시간으로 받지 않고 상점을 볼 때만 가져온다.
   (거래 로그는 큰 문서라 실시간으로 받으면 정답 하나마다 학생 모두에게 다시 내려갔다) */
async function pullShopEconomy(force){
  if(!window._fbReady || !window._db || !roomId || _shopEconPullBusy) return;
  if(!force && (document.hidden || Date.now() - _shopEconPullAt < 20000)) return;
  _shopEconPullBusy = true; _shopEconPullAt = Date.now();
  try{
    const snaps = await Promise.all(['pesk-purchase-log','pesk-class-fund','pesk-auctions'].map(k =>
      window._fsGetDoc(window._fsDoc(window._db,'classrooms',roomId,'data',k))));
    purchaseLogs = snaps[0].exists() ? (snaps[0].data().value || []) : [];
    applyEconExtras({fund: snaps[1].exists() ? snaps[1].data().value : null, auctions: snaps[2].exists() ? snaps[2].data().value : []});
    const panel = document.getElementById('panel-shop');
    if(panel && panel.style.display !== 'none') panel.innerHTML = buildShopPanel(getMyStudent());
  }catch(e){ console.warn('상점 자료 불러오기 실패', e); }
  finally{ _shopEconPullBusy = false; }
}
function shopPanelVisible(){ const p = document.getElementById('panel-shop'); return !!p && p.style.display !== 'none'; }

/* ── 정답 보상 로그: 문제마다 쓰지 않고 하루 한 줄로 모아 쓴다 ── */
const QZ_LOG_KEY = () => 'pesk-qz-reward-log-' + STUDENT_SCOPE_KEY();
function _readQuizRewardBuf(){ try{ return JSON.parse(localStorage.getItem(QZ_LOG_KEY()) || 'null'); }catch(_e){ return null; } }
function _writeQuizRewardBuf(b){ try{ if(b) localStorage.setItem(QZ_LOG_KEY(), JSON.stringify(b)); else localStorage.removeItem(QZ_LOG_KEY()); }catch(_e){} }
function queueQuizRewardLog({gain, before, after, unit}){
  if(!(gain > 0)) return;
  const today = todayISO();
  let b = _readQuizRewardBuf();
  if(b && b.date !== today){ void flushQuizRewardLog(); b = _readQuizRewardBuf(); }
  if(!b || b.date !== today) b = {date: today, delta: 0, count: 0, before, after, units: []};
  b.delta += gain; b.count += 1; b.after = after;
  if(unit && !b.units.includes(unit)) b.units = b.units.concat(unit).slice(-6);
  _writeQuizRewardBuf(b);
}
let _qzLogFlushing = false;
async function flushQuizRewardLog(){
  const b = _readQuizRewardBuf();
  if(!b || !b.delta || _qzLogFlushing) return;
  _qzLogFlushing = true;
  _writeQuizRewardBuf(null);
  try{
    const ok = await pushEconLog({type:'quiz_reward', detail:'모험 학습 정답 보상 (하루 합계)', delta:b.delta, count:b.count,
      balanceBefore:b.before, balanceAfter:b.after, meta:{units:b.units, date:b.date}}, {mergeId:'qz-' + b.date + '-' + myStudentNum});
    if(!ok){
      // 저장하지 못했으면 다음에 다시 올리도록 되돌린다 (그사이 쌓인 같은 날 기록과 합친다)
      const now = _readQuizRewardBuf();
      if(!now) _writeQuizRewardBuf(b);
      else if(now.date === b.date) _writeQuizRewardBuf({...now, delta: now.delta + b.delta, count: now.count + b.count, before: b.before});
    }
  }finally{ _qzLogFlushing = false; }
}

/* ── 예금 규칙 안내 (은행 탭 맨 위) ── */
function buildBankRulesNote(){
  const r = myBankRules(), bits = [];
  if(r.maxPerStudent){
    const room = window.EconCore.depositRoom(myDeposits, r);
    bits.push('1인 예금 한도 <b>' + r.maxPerStudent.toLocaleString() + '</b> 🪙 · 지금 더 넣을 수 있는 돈 <b>' + room.toLocaleString() + '</b> 🪙');
  }
  bits.push('만기 전에 찾으면 이자를 ' + (r.earlyPct > 0 ? '<b>' + r.earlyPct + '%만</b> 받아요' : '<b>받지 못해요</b>') + '. 끝까지 맡겨야 약속한 이자를 받아요.');
  return '<div style="padding:10px 12px;border:1px solid #dbeafe;background:#eff6ff;color:#1e3a8a;border-radius:10px;font-size:12px;line-height:1.6;margin-bottom:12px;">🏦 '
    + bits.join('<br>') + '</div>';
}

/* ── 세금 영수증 · 재산세 안내 (대시보드) ── */
function myTotalAssets(me){
  const snap = _buildAssetSnapshot(Number(me?.points || 0), myPortfolio, myDeposits, stockPrices, Date.now());
  return snap.total;
}
function buildTaxCard(me){
  if(!me) return '';
  const rules = myWealthRules(), rc = me.taxReceipt, due = Math.max(0, Number(me.taxDue || 0));
  if(!rules.enabled && !rc && !due) return '';
  let html = '<div class="bank-section" style="margin-top:12px;"><div class="bank-section-header"><span class="bank-section-title">🧾 세금</span></div><div class="bank-section-body" style="font-size:12px;line-height:1.7;">';
  if(due > 0) html += '<div style="padding:8px 10px;border-radius:8px;background:#fff1f2;color:#b91c1c;font-weight:800;margin-bottom:8px;">아직 내지 못한 세금 ' + due.toLocaleString() + ' 🪙 — 다음 징수 때 함께 내요.</div>';
  if(rc){
    html += '<div style="padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#fff;margin-bottom:8px;">'
      + '<b>' + escHtml(rc.name || '세금') + ' 영수증</b> · ' + escHtml(String(rc.at || '').slice(0, 10)) + '<br>'
      + (rc.assets != null ? '계산한 내 자산: ' + Number(rc.assets).toLocaleString() + ' 🪙<br>' : '')
      + (Array.isArray(rc.parts) && rc.parts.length ? rc.parts.map(p => '· ' + Number(p.from).toLocaleString() + ' 🪙 넘는 부분 ' + Number(p.portion).toLocaleString() + ' × ' + p.rate + '% = ' + Number(p.tax).toLocaleString()).join('<br>') + '<br>' : '')
      + '이번 세금 ' + Number(rc.tax || 0).toLocaleString() + (rc.prevDue ? ' + 밀린 세금 ' + Number(rc.prevDue).toLocaleString() : '') + ' · <b>낸 돈 ' + Number(rc.paid || 0).toLocaleString() + ' 🪙</b>'
      + (rc.due ? ' · 남은 세금 ' + Number(rc.due).toLocaleString() : '') + '</div>';
  }
  if(rules.enabled){
    const assets = myTotalAssets(me), est = window.EconCore.wealthTax(assets, rules);
    html += '<div style="color:var(--sub);">재산세는 <b>현금 + 예금 + 주식</b>을 모두 더한 자산에 매겨요. 많이 가질수록 넘는 부분에 높은 세율이 붙어요.</div>'
      + '<table style="width:100%;margin:6px 0;border-collapse:collapse;font-size:11px;">' + rules.brackets.map((b, i) => {
          const top = rules.brackets[i + 1];
          return '<tr><td style="padding:3px 0;">' + b.min.toLocaleString() + (top ? ' ~ ' + top.min.toLocaleString() : ' 이상') + ' 🪙</td><td style="text-align:right;font-weight:800;">' + b.rate + '%</td></tr>';
        }).join('') + '</table>'
      + '<div>지금 내 자산 ' + assets.toLocaleString() + ' 🪙 → 예상 재산세 <b>' + est.tax.toLocaleString() + ' 🪙</b>'
      + (rules.toFund && window.EconCore.FEATURES.fund ? ' <span style="color:var(--sub);">(걷은 세금은 우리 반 공동 기금으로 가요)</span>' : '') + '</div>';
  }
  return html + '</div></div>';
}

/* ── 학급 공동 기금 (공동 보상 탭 위쪽) ── */
function buildClassFundSection(){
  if(!window.EconCore.FEATURES.fund) return '';
  const f = classFund || window.EconCore.fundState(null);
  const me = getMyStudent(), cash = Number(me?.points || 0), myNum = String(myStudentNum);
  const mine = f.history.filter(h => h.type === 'donate' && String(h.num) === myNum).reduce((a, h) => a + Number(h.amount || 0), 0);
  const goals = f.goals.filter(g => g.status !== 'done');
  const blocked = economyBlocked('shop');
  const donateRow = (goalId, label) => blocked ? '' : '<div style="display:flex;gap:6px;margin-top:8px;"><input type="number" min="1" inputmode="numeric" id="fund-amt-' + escHtml(goalId || 'pool') + '" placeholder="기부할 금액" style="flex:1;min-width:0;padding:8px;border:1px solid var(--border);border-radius:8px;font:inherit;">'
    + '<button class="pesk-btn primary" style="width:auto;margin:0;padding:8px 12px;font-size:12px;" onclick="donateToFund(\'' + escHtml(goalId || '') + '\')">' + label + '</button></div>';
  return '<div class="qz-goal"><b>🤝 우리 반 공동 기금</b><p class="rpg-hint">모두가 함께 누릴 목표에 돈을 모아요. 목표 금액이 다 모이면 선생님과 함께 진행해요. 걷은 세금과 경매 금액도 여기로 와요.</p>'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px;"><span>모인 기금 잔액</span><b>' + f.balance.toLocaleString() + ' 🪙</b></div>'
    + (mine ? '<div style="font-size:12px;color:var(--sub);margin-top:2px;">내가 기부한 돈 ' + mine.toLocaleString() + ' 🪙 · 고마워요!</div>' : '')
    + donateRow('', '기금에 기부') + '</div>'
    + goals.map(g => {
        const pct = Math.min(100, Math.round(g.raised / g.target * 100));
        return '<div class="qz-goal' + (g.status === 'funded' ? ' done' : '') + '"><div class="qz-goal-top"><b>' + escHtml(g.icon || '🎯') + ' ' + escHtml(g.title || '공동 목표') + '</b><span>' + (g.status === 'funded' ? '🎉 목표 달성!' : pct + '%') + '</span></div>'
          + '<div style="height:8px;border-radius:99px;background:#e5e7eb;overflow:hidden;margin:6px 0;"><div style="height:100%;width:' + pct + '%;background:#22c55e;"></div></div>'
          + '<p class="rpg-hint">' + g.raised.toLocaleString() + ' / ' + g.target.toLocaleString() + ' 🪙 · ' + g.donors.length + '명 참여' + (g.status === 'funded' ? ' · 선생님과 함께 진행할 거예요' : '') + '</p>'
          + (g.status === 'open' ? donateRow(g.id, '기부') : '') + '</div>';
      }).join('')
    + (cash <= 0 && !blocked ? '' : '');
}
let _fundBusy = false;
async function donateToFund(goalId){
  if(_fundBusy) return;
  if(!(await ensureActiveStudentSession(false))) return;
  if(economyBlocked('shop')) return economyBlockedNotice('shop');
  const el = document.getElementById('fund-amt-' + (goalId || 'pool'));
  const amt = Number(el ? el.value : 0);
  if(!Number.isSafeInteger(amt) || amt < 1) return alert('기부할 금액을 1 이상의 정수로 적어 주세요.');
  const me = await ensurePointsFresh(amt);
  if(!me || Number(me.points || 0) < amt) return alert('보유 금액이 부족해요.');
  const goal = (classFund?.goals || []).find(g => g.id === goalId);
  if(!confirm((goal ? '「' + goal.title + '」 목표에 ' : '우리 반 공동 기금에 ') + amt.toLocaleString() + ' 🪙을 기부할까요?\n기부한 돈은 돌려받을 수 없어요.')) return;
  _fundBusy = true;
  let out = null;
  try{
    const db = window._db;
    const studRef = window._fsDoc(db,'classrooms',roomId,'data','tesk-students');
    const fundRef = window._fsDoc(db,'classrooms',roomId,'data','pesk-class-fund');
    await window._fsRunTxn(db, async txn => {
      const [ss, fs] = await Promise.all([txn.get(studRef), txn.get(fundRef)]);
      const list = ss.exists() ? (ss.data().value || []) : [];
      const i = list.findIndex(s => Number(s.num) === Number(myStudentNum));
      if(i < 0) throw new Error('STUDENT_NOT_FOUND');
      const before = Number(list[i].points || 0);
      if(before < amt) throw new Error('NOT_ENOUGH_CASH');
      const r = window.EconCore.donate(fs.exists() ? fs.data().value : null, {goalId, amount: amt, num: myStudentNum, name: myStudentName});
      list[i].points = before - amt;
      const at = new Date().toISOString();
      txn.set(studRef, {value: list, updatedAt: at});
      txn.set(fundRef, {value: r.fund, updatedAt: at});
      out = {list, fund: r.fund, before, after: before - amt, goal: r.goal};
    });
  }catch(e){
    const m = String(e?.message || '');
    alert(m === 'GOAL_CLOSED' ? '이 목표는 이미 마감됐어요.' : m === 'NOT_ENOUGH_CASH' ? '보유 금액이 부족해요.' : '기부하지 못했어요. 잠시 후 다시 시도해 주세요.');
    return;
  }finally{ _fundBusy = false; }
  applyStudentsList(out.list);
  applyEconExtras({fund: out.fund});
  addTxn('🤝 공동 기금 기부', amt, 'spend');
  void pushEconLog({type:'donate', detail:'공동 기금 기부' + (out.goal ? ' (' + out.goal.title + ')' : ''), delta:-amt, balanceBefore:out.before, balanceAfter:out.after, meta:{goalId: goalId || ''}});
  showFeedbackNotice(out.goal && out.goal.status === 'funded' ? '🎉 목표 금액이 다 모였어요!' : '🤝 기부했어요. 고마워요!');
  const panel = document.getElementById('panel-shop');
  if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
}

/* ── 경매 ── */
function auctionTimeText(a){
  if(!a.endsAt) return '';
  const ms = new Date(a.endsAt).getTime() - Date.now();
  if(ms <= 0) return '입찰 마감 · 선생님 확정을 기다려요';
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return '마감까지 ' + (h >= 24 ? Math.floor(h / 24) + '일 ' + (h % 24) + '시간' : h ? h + '시간 ' + m + '분' : m + '분');
}
function buildAuctionPanel(){
  const E = window.EconCore, myNum = String(myStudentNum);
  const list = (classAuctions || []).map(a => a && a.kind === 'seats' ? E.seatAuctionState(a) : E.auctionState(a));
  const open = list.filter(a => a.status === 'open'), done = list.filter(a => a.status !== 'open').slice(-5).reverse();
  const blocked = economyBlocked('shop');
  const card = a => {
    if(a.kind === 'seats') return buildSeatAuctionCard(a);   // 자리 경매: shared/pesk-seat-auction.js
    const mineTop = a.top && String(a.top.num) === myNum, ended = a.endsAt && new Date(a.endsAt).getTime() <= Date.now();
    return '<div class="qz-goal' + (mineTop ? ' done' : '') + '"><div class="qz-goal-top"><b>' + escHtml(a.icon || '🔨') + ' ' + escHtml(a.title || '경매') + '</b><span>' + escHtml(auctionTimeText(a)) + '</span></div>'
      + (a.desc ? '<p class="rpg-hint">' + escHtml(a.desc) + '</p>' : '')
      + '<p style="font-size:12px;margin:4px 0;">' + (a.top ? '지금 최고 입찰 <b>' + a.top.amount.toLocaleString() + ' 🪙</b>' + (mineTop ? ' · <b style="color:#15803d;">내가 최고 입찰자예요</b>' : '') : '시작 가격 <b>' + a.startPrice.toLocaleString() + ' 🪙</b> · 아직 입찰이 없어요') + '</p>'
      + (blocked || ended ? '' : '<div style="display:flex;gap:6px;"><input type="number" inputmode="numeric" id="bid-' + escHtml(a.id) + '" placeholder="' + E.minBid(a).toLocaleString() + ' 이상" style="flex:1;min-width:0;padding:8px;border:1px solid var(--border);border-radius:8px;font:inherit;">'
        + '<button class="pesk-btn primary" style="width:auto;margin:0;padding:8px 12px;font-size:12px;" onclick="bidAuction(\'' + escHtml(a.id) + '\')">입찰</button></div>')
      + '<p class="rpg-hint" style="margin-top:6px;">입찰하면 그 돈을 맡겨 둬요. 다른 친구가 더 높게 부르면 바로 돌려받아요.</p></div>';
  };
  return '<div class="qz-goal"><b>🔨 우리 반 경매</b><p class="rpg-hint">선생님이 올린 물건이나 권리를 가장 높은 값을 부른 친구가 가져가요. 낙찰된 돈은 학급(국고)으로 돌아가요.</p></div>'
    + (open.length ? open.map(card).join('') : '<div class="empty-state">지금 열린 경매가 없어요.</div>')
    + (done.length ? '<div class="section-title" style="margin-top:14px;">지난 경매</div>' + done.map(a => a.kind === 'seats' ? buildSeatAuctionCard(a) : '<div class="qz-goal"><div class="qz-goal-top"><b>' + escHtml(a.icon || '🔨') + ' ' + escHtml(a.title) + '</b><span>'
        + (a.status === 'cancelled' ? '취소됨' : a.winner ? (String(a.winner.num) === myNum ? '🎉 내가 낙찰!' : '낙찰 ' + Number(a.winner.amount).toLocaleString() + ' 🪙') : '입찰 없음') + '</span></div></div>').join('') : '');
}
let _bidBusy = false;
async function bidAuction(id){
  if(_bidBusy) return;
  if(!(await ensureActiveStudentSession(false))) return;
  if(economyBlocked('shop')) return economyBlockedNotice('shop');
  const el = document.getElementById('bid-' + id), amt = Number(el ? el.value : 0);
  if(!Number.isSafeInteger(amt) || amt < 1) return alert('입찰 금액을 정수로 적어 주세요.');
  if(!confirm(amt.toLocaleString() + ' 🪙에 입찰할까요?\n그 돈은 경매가 끝날 때까지 맡겨 둬요. 다른 친구가 더 높게 부르면 돌려받아요.')) return;
  _bidBusy = true;
  let out = null;
  try{
    const db = window._db;
    const studRef = window._fsDoc(db,'classrooms',roomId,'data','tesk-students');
    const aucRef = window._fsDoc(db,'classrooms',roomId,'data','pesk-auctions');
    await window._fsRunTxn(db, async txn => {
      const [ss, as] = await Promise.all([txn.get(studRef), txn.get(aucRef)]);
      const list = ss.exists() ? (ss.data().value || []) : [], auctions = as.exists() ? (as.data().value || []) : [];
      const ai = auctions.findIndex(a => a && a.id === id);
      if(ai < 0) throw new Error('AUCTION_CLOSED');
      const i = list.findIndex(s => Number(s.num) === Number(myStudentNum));
      if(i < 0) throw new Error('STUDENT_NOT_FOUND');
      const before = Number(list[i].points || 0);
      const r = window.EconCore.placeBid(auctions[ai], {num: myStudentNum, name: myStudentName, amount: amt, cash: before});
      list[i].points = before - r.pay;
      let refundRow = null;
      if(r.refund){
        const j = list.findIndex(s => Number(s.num) === Number(r.refund.num));
        if(j >= 0){ const rb = Number(list[j].points || 0); list[j].points = rb + r.refund.amount; refundRow = {num: r.refund.num, name: list[j].name || '', before: rb, after: rb + r.refund.amount, amount: r.refund.amount}; }
      }
      auctions[ai] = r.auction;
      const at = new Date().toISOString();
      txn.set(studRef, {value: list, updatedAt: at});
      txn.set(aucRef, {value: auctions, updatedAt: at});
      out = {list, auctions, pay: r.pay, before, after: before - r.pay, refundRow, title: r.auction.title};
    });
  }catch(e){
    const m = String(e?.message || '');
    alert(m.startsWith('BID_TOO_LOW:') ? '최소 ' + Number(m.split(':')[1]).toLocaleString() + ' 🪙 이상 불러야 해요.'
      : m.startsWith('NOT_ENOUGH_CASH:') ? '현금이 부족해요. (필요 ' + Number(m.split(':')[1]).toLocaleString() + ' 🪙)'
      : m === 'AUCTION_ENDED' || m === 'AUCTION_CLOSED' ? '이 경매는 마감됐어요.' : '입찰하지 못했어요. 잠시 후 다시 시도해 주세요.');
    await pullShopEconomy(true);
    return;
  }finally{ _bidBusy = false; }
  applyStudentsList(out.list);
  applyEconExtras({auctions: out.auctions});
  addTxn('🔨 경매 입찰 (' + out.title + ')', out.pay, 'spend');
  void pushEconLog({type:'auction_bid', detail:'경매 입찰: ' + out.title, delta:-out.pay, balanceBefore:out.before, balanceAfter:out.after, meta:{auctionId:id, bid:amt}});
  if(out.refundRow) void pushEconLog({type:'auction_refund', studentNum:out.refundRow.num, studentName:out.refundRow.name, accountUid:'', actor:'system',
    detail:'경매 환불 (더 높은 입찰): ' + out.title, delta:out.refundRow.amount, balanceBefore:out.refundRow.before, balanceAfter:out.refundRow.after, meta:{auctionId:id}});
  showFeedbackNotice('🔨 입찰했어요! 지금 최고 입찰자예요.');
  const panel = document.getElementById('panel-shop');
  if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
}
function openAuctionCount(){
  return (classAuctions || []).filter(a => a && (a.status || 'open') === 'open' && !(a.endsAt && new Date(a.endsAt).getTime() <= Date.now())).length;
}
