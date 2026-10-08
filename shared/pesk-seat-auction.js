/* 학생 앱: 자리 경매 (자리표) — 선생님이 고른 자리마다 입찰한다. 금액만 보이고 이름은 보이지 않는다.
   규칙은 shared/econ-core.js (seatAuctionState·placeSeatBid). 경매 목록·입찰 공통 부분은 shared/pesk-econ-ui.js. */
let seatLotPick = {};   // 경매 id → 고른 자리 번호(0부터)
function seatLabel(layout, seat){ return (Math.floor(seat / layout.cols) + 1) + '줄 ' + (seat % layout.cols + 1) + '번째'; }
function buildSeatAuctionCard(raw){
  const E = window.EconCore, a = E.seatAuctionState(raw), myNum = String(myStudentNum), L = a.layout;
  const lots = new Map(a.lots.map(l => [l.seat, l]));
  const ended = a.status !== 'open' || (a.endsAt && new Date(a.endsAt).getTime() <= Date.now());
  const myTop = a.lots.find(l => l.top && String(l.top.num) === myNum), myWin = a.lots.find(l => l.winner != null && String(l.winner) === myNum);
  const pick = seatLotPick[a.id], blocked = economyBlocked('shop');
  let cells = '';
  for(let i = 0; i < L.rows * L.cols; i++){
    const c = i % L.cols, lot = lots.get(i), gap = L.pairDesks && c > 0 && c % 2 === 0 ? 'margin-left:8px;' : '';
    if(!lot){ cells += '<div style="' + gap + 'min-height:46px;border-radius:8px;background:#f1f5f9;border:1px dashed #e2e8f0;"></div>'; continue; }
    const mine = lot.top && String(lot.top.num) === myNum, won = lot.winner != null, wonMine = won && String(lot.winner) === myNum;
    const text = a.status === 'closed' ? (wonMine ? '🎉 내 자리' : won ? '낙찰' : '유찰') : a.status === 'cancelled' ? '취소' : (lot.top ? lot.top.amount.toLocaleString() : '시작 ' + a.startPrice.toLocaleString());
    const bg = wonMine || mine ? '#dcfce7' : '#fff7ed', bd = pick === i ? '2px solid #2563eb' : mine ? '2px solid #16a34a' : '1px solid #fdba74';
    cells += '<button type="button" ' + (ended || blocked ? 'disabled ' : '') + 'data-seat-lot="' + i + '" onclick="pickSeatLot(\'' + escHtml(a.id) + '\',' + i + ')" style="' + gap + 'min-height:46px;border-radius:8px;background:' + bg + ';border:' + bd
      + ';font:inherit;font-size:10.5px;font-weight:800;color:#7c2d12;padding:2px;cursor:' + (ended ? 'default' : 'pointer') + ';">🪑<br>' + escHtml(text) + '</button>';
  }
  const pickLot = pick != null ? lots.get(pick) : null;
  return '<div class="qz-goal' + (myTop || myWin ? ' done' : '') + '"><div class="qz-goal-top"><b>' + escHtml(a.icon || '🪑') + ' ' + escHtml(a.title || '자리 경매') + '</b><span>' + escHtml(auctionTimeText(a)) + '</span></div>'
    + (a.desc ? '<p class="rpg-hint">' + escHtml(a.desc) + '</p>' : '')
    + '<p class="rpg-hint">주황색 자리가 경매 자리예요. 자리를 눌러 고른 뒤 입찰해요. 한 번에 한 자리에서만 최고 입찰자가 될 수 있어요.</p>'
    + '<div style="text-align:center;font-size:11px;font-weight:800;color:#475569;background:#e2e8f0;border-radius:8px;padding:4px;margin:6px 0;">교탁</div>'
    + '<div style="display:grid;grid-template-columns:repeat(' + L.cols + ',minmax(0,1fr));gap:4px;">' + cells + '</div>'
    + (myWin ? '<p style="font-size:12px;font-weight:800;color:#15803d;margin-top:8px;">🎉 ' + seatLabel(L, myWin.seat) + ' 자리를 낙찰받았어요!</p>'
      : myTop ? '<p style="font-size:12px;font-weight:800;color:#15803d;margin-top:8px;">지금 ' + seatLabel(L, myTop.seat) + ' 자리에서 내가 최고 입찰자예요.</p>' : '')
    + (pickLot && !ended && !blocked ? '<div style="margin-top:8px;font-size:12px;">고른 자리: <b>' + seatLabel(L, pick) + '</b> · ' + (pickLot.top ? '지금 최고 ' + pickLot.top.amount.toLocaleString() + ' 🪙' : '아직 입찰 없음') + '</div>'
      + '<div style="display:flex;gap:6px;margin-top:6px;"><input type="number" inputmode="numeric" id="seatbid-' + escHtml(a.id) + '" placeholder="' + E.seatMinBid(a, pick).toLocaleString() + ' 이상" style="flex:1;min-width:0;padding:8px;border:1px solid var(--border);border-radius:8px;font:inherit;">'
      + '<button class="pesk-btn primary" style="width:auto;margin:0;padding:8px 12px;font-size:12px;" onclick="bidSeat(\'' + escHtml(a.id) + '\')">입찰</button></div>' : '')
    + (ended ? '' : '<p class="rpg-hint" style="margin-top:6px;">입찰한 돈은 맡겨 두고, 다른 친구가 더 높게 부르면 바로 돌려받아요.</p>') + '</div>';
}
function pickSeatLot(id, seat){
  seatLotPick[id] = seat;
  const panel = document.getElementById('panel-shop');
  if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
}
async function bidSeat(id){
  if(_bidBusy) return;
  if(!(await ensureActiveStudentSession(false))) return;
  if(economyBlocked('shop')) return economyBlockedNotice('shop');
  const seat = seatLotPick[id], el = document.getElementById('seatbid-' + id), amt = Number(el ? el.value : 0);
  if(seat == null) return alert('먼저 입찰할 자리를 눌러 골라 주세요.');
  if(!Number.isSafeInteger(amt) || amt < 1) return alert('입찰 금액을 정수로 적어 주세요.');
  if(!confirm(amt.toLocaleString() + ' 🪙에 이 자리를 입찰할까요?\n그 돈은 경매가 끝날 때까지 맡겨 둬요. 다른 친구가 더 높게 부르면 돌려받아요.')) return;
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
      const r = window.EconCore.placeSeatBid(auctions[ai], {num: myStudentNum, seat, amount: amt, cash: before});
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
      out = {list, auctions, pay: r.pay, before, after: before - r.pay, refundRow, label: seatLabel(r.auction.layout, seat), title: r.auction.title || '자리 경매'};
    });
  }catch(e){
    const m = String(e?.message || '');
    alert(m.startsWith('BID_TOO_LOW:') ? '최소 ' + Number(m.split(':')[1]).toLocaleString() + ' 🪙 이상 불러야 해요.'
      : m.startsWith('NOT_ENOUGH_CASH:') ? '현금이 부족해요. (필요 ' + Number(m.split(':')[1]).toLocaleString() + ' 🪙)'
      : m === 'ALREADY_TOP_ELSEWHERE' ? '이미 다른 자리에서 최고 입찰자예요. 한 번에 한 자리만 입찰할 수 있어요.'
      : m === 'AUCTION_ENDED' || m === 'AUCTION_CLOSED' ? '이 경매는 마감됐어요.' : '입찰하지 못했어요. 잠시 후 다시 시도해 주세요.');
    await pullShopEconomy(true);
    return;
  }finally{ _bidBusy = false; }
  applyStudentsList(out.list);
  applyEconExtras({auctions: out.auctions});
  addTxn('🪑 자리 경매 입찰 (' + out.label + ')', out.pay, 'spend');
  void pushEconLog({type:'auction_bid', detail:out.title + ' 입찰: ' + out.label, delta:-out.pay, balanceBefore:out.before, balanceAfter:out.after, meta:{auctionId:id, seat, bid:amt}});
  if(out.refundRow) void pushEconLog({type:'auction_refund', studentNum:out.refundRow.num, studentName:out.refundRow.name, accountUid:'', actor:'system',
    detail:out.title + ' 환불 (더 높은 입찰): ' + out.label, delta:out.refundRow.amount, balanceBefore:out.refundRow.before, balanceAfter:out.refundRow.after, meta:{auctionId:id, seat}});
  showFeedbackNotice('🪑 입찰했어요! 지금 이 자리의 최고 입찰자예요.');
  const panel = document.getElementById('panel-shop');
  if(panel) panel.innerHTML = buildShopPanel(getMyStudent());
}
