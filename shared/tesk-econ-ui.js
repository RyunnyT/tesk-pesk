/* 교사 화면: 경제 지표 · 예금 규칙 · 누진 재산세 · 학급 공동 기금 · 경매 · 우리반 펀드 · 거래 로그 보관
   계산 규칙은 shared/econ-core.js (EconCore). tesk_teacher_v2.html 의 전역(students, TESK_ROOM, save …)을 쓴다.
   학급 경제를 바꾸는 규칙(예금 한도, 재산세, 펀드)은 선생님이 켜기 전에는 지금과 똑같이 동작한다. */
const EC = () => window.EconCore;
const econRef = key => window._fsDoc(window._db,'classrooms',TESK_ROOM,'data',key);
const econReady = () => !!(window._fbReady && window._db && window._fsRunTxn);
function econMoney(n){ return Number(n || 0).toLocaleString() + ' ' + C(); }

/* ── 거래 로그: 여러 줄을 한 번에 쓰기 ── */
async function pushTeacherEconLogs(entries){
  const list = (entries || []).filter(Boolean);
  if(!list.length || !econReady()) return;
  const now = Date.now();
  const payloads = list.map((entry, i) => {
    if(entry.studentNum != null && !entry.assetAfter){
      entry.assetAfter = makeStudentAssetSnapshot(entry.studentNum, entry.balanceAfter);
      entry.assetBefore = entry.assetBefore || makeStudentAssetSnapshot(entry.studentNum, entry.balanceBefore);
    }
    return {id: 'tlog_' + now + '_' + i + '_' + Math.random().toString(36).slice(2, 6), roomId: TESK_ROOM, actor: 'teacher', ts: now, createdAt: new Date(now).toISOString(), ...entry};
  });
  try{
    await window._fsRunTxn(window._db, async txn => {
      const snap = await txn.get(econRef('pesk-purchase-log'));
      const logs = snap.exists() ? (snap.data().value || []) : [];
      logs.push(...payloads);
      if(logs.length > 2000) logs.splice(0, logs.length - 2000);
      _trimLogsToByteLimit(logs);
      txn.set(econRef('pesk-purchase-log'), {value: logs, updatedAt: new Date().toISOString()});
    });
  }catch(e){ console.warn('teacher econ logs save failed', e); }
}

/* ── 거래 로그 보관: 2주보다 오래된 줄은 주 단위 보관 문서로 옮기고, 모험 정답 보상은 하루 한 줄로 합친다 ──
   거래 로그 문서가 커지면(1MB 한도) 오래된 기록이 지워지기 시작하므로, 선생님 화면이 열려 있을 때 정리한다. */
let _econArchiveAt = 0, _econArchiveBusy = false, econArchivedRows = null;
async function maybeArchiveEconLogs(rows){
  if(_econArchiveBusy || Date.now() - _econArchiveAt < 10 * 60000 || !econReady()) return;
  if(EC().bytesOf(rows || []) < 400000) return;
  _econArchiveAt = Date.now();
  try{ await archiveEconLogs(); }catch(e){ console.warn('거래 로그 보관 실패', e); }
}
async function archiveEconLogs(manual){
  if(_econArchiveBusy || !econReady()) return 0;
  _econArchiveBusy = true;
  let moved = 0, before = 0, after = 0;
  try{
    await window._fsRunTxn(window._db, async txn => {
      const snap = await txn.get(econRef('pesk-purchase-log'));
      const logs = snap.exists() ? (snap.data().value || []) : [];
      before = logs.length;
      const {keep, archive} = EC().splitForArchive(logs, {keepDays: 14});
      const weeks = Object.keys(archive);
      const idxSnap = await txn.get(econRef('pesk-econ-archive-index'));
      const weekSnaps = await Promise.all(weeks.map(w => txn.get(econRef('pesk-econ-archive-' + w))));
      const at = new Date().toISOString();
      weeks.forEach((w, i) => {
        const prev = weekSnaps[i].exists() ? (weekSnaps[i].data().value || []) : [];
        const ids = new Set(prev.map(l => l && l.id));
        txn.set(econRef('pesk-econ-archive-' + w), {value: prev.concat(archive[w].filter(l => !ids.has(l.id))), updatedAt: at});
      });
      if(weeks.length){
        const index = new Set(idxSnap.exists() ? (idxSnap.data().value || []) : []);
        weeks.forEach(w => index.add(w));
        txn.set(econRef('pesk-econ-archive-index'), {value: [...index].sort(), updatedAt: at});
      }
      moved = weeks.reduce((a, w) => a + archive[w].length, 0);
      after = keep.length;
      if(moved || keep.length !== logs.length) txn.set(econRef('pesk-purchase-log'), {value: keep, updatedAt: at});
    });
  }finally{ _econArchiveBusy = false; }
  if(manual) showToast('📦 거래 로그 정리: ' + before + '줄 → ' + after + '줄 (보관 ' + moved + '줄)');
  return moved;
}
async function loadArchivedEconLogs(){
  if(!econReady()) return;
  try{
    const idx = await window._fsGetDoc(econRef('pesk-econ-archive-index'));
    const weeks = idx.exists() ? (idx.data().value || []) : [];
    const snaps = await Promise.all(weeks.map(w => window._fsGetDoc(econRef('pesk-econ-archive-' + w))));
    econArchivedRows = snaps.flatMap(s => s.exists() ? (s.data().value || []) : []);
    const ids = new Set((econLogsAll || []).map(l => l.id));
    econLogsAll = (econLogsAll || []).concat(econArchivedRows.filter(l => !ids.has(l.id))).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    showToast('📂 보관된 거래 로그 ' + econArchivedRows.length + '줄을 함께 보여줘요');
    renderEconLog();
  }catch(e){ showToast('⚠️ 보관 로그를 불러오지 못했어요: ' + e.message); }
}
function econLogToolsHtml(){
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 10px 10px;">'
    + '<button class="btn btn-sm btn-secondary" onclick="loadArchivedEconLogs()">📂 보관된 로그도 보기</button>'
    + '<button class="btn btn-sm btn-secondary" onclick="archiveEconLogs(true)">📦 2주 지난 로그 보관하기</button>'
    + '<span style="font-size:11px;color:var(--sub);align-self:center;">거래 로그가 커지면 2주 지난 기록을 주 단위로 자동 보관해요. 백업 파일에도 함께 들어가요.</span></div>';
}

/* ── 경제 지표 카드 ── */
function econIndicatorRows(){
  return (students || []).map(s => {
    const a = computeStudentAssets(s.num);
    return {num: s.num, name: s.name, cash: Number(s.points || 0), deposits: a.depositTotal, stocks: a.stockValue};
  });
}
let _econIndLoaded = false;
function renderEconIndicators(){
  const box = document.getElementById('econ-indicators');
  if(!box || !EC()) return;
  if(!_econIndLoaded && econReady()){   // 예금·주식 평가액이 있어야 총자산을 셀 수 있다 — 처음 한 번 불러온 뒤 다시 그린다
    _econIndLoaded = true;
    Promise.all([loadPeskDeposits(), loadPeskPortfolios()]).then(renderEconIndicators).catch(()=>{});
  }
  const m = EC().indicators(econIndicatorRows());
  const snaps = load('tesk-econ-snapshots', []);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = [...snaps].reverse().find(x => x.date <= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  if(m.students && (!snaps.length || snaps[snaps.length - 1].date !== today) && Object.keys(_peskDepositsCache || {}).length + Object.keys(_peskPortfoliosCache || {}).length){
    const next = snaps.filter(x => x.date !== today).concat({date: today, cash: m.cash, deposits: m.deposits, stocks: m.stocks, total: m.total, gini: m.gini, top10: m.top10Share}).slice(-120);
    save('tesk-econ-snapshots', next);
  }
  const diff = (now, prev) => { if(prev == null) return ''; const d = now - prev; return ' <span style="font-size:10px;color:' + (d >= 0 ? '#15803d' : '#b91c1c') + ';">' + (d >= 0 ? '▲' : '▼') + Math.abs(d).toLocaleString() + '</span>'; };
  const stat = (label, value, sub) => '<div style="padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);"><div style="font-size:11px;color:var(--sub);">' + label + '</div><div style="font-size:16px;font-weight:900;margin-top:2px;">' + value + '</div>' + (sub ? '<div style="font-size:10.5px;color:var(--sub);margin-top:2px;">' + sub + '</div>' : '') + '</div>';
  const advice = m.gini >= 0.6 ? '돈이 몇 명에게 아주 많이 몰려 있어요. 재산세·예금 한도·경매로 큰돈이 다시 돌게 해 보세요.'
    : m.gini >= 0.45 ? '쏠림이 큰 편이에요. 예금 한도와 재산세를 검토해 보세요.' : '비교적 고르게 나뉘어 있어요.';
  box.innerHTML = '<div class="card" style="margin:12px 0 16px;"><div class="card-header"><div class="card-title">📊 우리 반 경제 지표</div><span style="font-size:11px;color:var(--sub);">' + (weekAgo ? weekAgo.date + ' 대비' : '매일 기록해 지난주와 비교해요') + '</span></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">'
    + stat('총자산 (현금+예금+주식)', econMoney(m.total) + diff(m.total, weekAgo && weekAgo.total))
    + stat('현금 통화량', econMoney(m.cash) + diff(m.cash, weekAgo && weekAgo.cash))
    + stat('예금', econMoney(m.deposits)) + stat('주식 평가액', econMoney(m.stocks))
    + stat('자산 중앙값', econMoney(m.median), '최저 ' + m.min.toLocaleString() + ' · 최고 ' + m.max.toLocaleString())
    + stat('상위 10% 비중', m.top10Share + '%', '상위 3명 ' + m.top3Share + '%')
    + stat('지니계수', m.gini.toFixed(2) + ' · ' + EC().giniLabel(m.gini), (weekAgo ? '지난주 ' + Number(weekAgo.gini).toFixed(2) + ' · ' : '') + '0이면 모두 같고 1에 가까울수록 한쪽에 몰려요')
    + '</div><p style="font-size:12px;color:var(--sub);margin:10px 2px 0;">💡 ' + advice + '</p></div>';
}

/* ── 예금 규칙 ── */
function renderBankRulesCard(){
  const box = document.getElementById('bank-rules-card');
  if(!box) return;
  const r = EC().bankSettings(load('tesk-bank-settings', null));
  box.innerHTML = '<div class="card" style="margin-bottom:16px;"><div class="card-header"><div class="card-title">📏 예금 규칙</div>'
    + '<button class="btn btn-sm btn-secondary" onclick="applyRecommendedBank()">추천값 적용</button></div>'
    + '<p style="font-size:11px;color:var(--sub);margin-bottom:10px;">이자가 월급보다 커지면 돈이 많은 학생만 계속 불어나요. 한도와 중도 해지 규칙으로 막을 수 있어요. 이미 넣은 예금은 넣을 때의 약속(이율·중도 해지 규칙)을 그대로 지켜요.</p>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">'
    + '<label class="form-label" style="margin:0;">1인 예금 한도 (0 = 없음)<input class="form-input" type="number" min="0" step="1000" id="bank-max" value="' + r.maxPerStudent + '" style="width:140px;"></label>'
    + '<label class="form-label" style="margin:0;">중도 해지 때 주는 이자 (%)<input class="form-input" type="number" min="0" max="100" id="bank-early" value="' + r.earlyPct + '" style="width:120px;"></label>'
    + '<button class="btn btn-sm btn-primary" onclick="saveBankRules()">저장</button></div></div>';
}
function saveBankRules(){
  const max = Math.max(0, Math.round(Number(document.getElementById('bank-max').value) || 0));
  const early = Math.max(0, Math.min(100, Number(document.getElementById('bank-early').value) || 0));
  save('tesk-bank-settings', {maxPerStudent: max, earlyPct: early});
  addActivity('🏦 예금 규칙 변경 (한도 ' + (max ? max.toLocaleString() : '없음') + ', 중도 해지 이자 ' + early + '%)');
  showToast('💾 예금 규칙을 저장했어요');
  renderBankRulesCard();
}
async function applyRecommendedBank(){
  const R = EC().BANK_RECOMMENDED;
  if(!await openAppConfirmModal({title: '추천 예금 규칙 적용',
    message: '1인 예금 한도 ' + R.maxPerStudent.toLocaleString() + C() + ', 중도 해지 이자 0%, 예금 이율 ' + EC().RECOMMENDED_PLANS.map(p => p.label + ' ' + p.rate + '%').join(' · ') + '로 바꿀까요?\n이미 넣은 예금은 넣을 때의 이율·규칙을 그대로 지켜요.',
    submitText: '적용'})) return;
  save('tesk-bank-settings', {...R});
  bankPlans = EC().RECOMMENDED_PLANS.map(p => ({...p}));
  save('tesk-bank-plans', bankPlans);
  addActivity('🏦 추천 예금 규칙 적용');
  renderBankPlans();
  showToast('✅ 추천 예금 규칙을 적용했어요');
}

/* ── 누진 재산세 ── */
let wealthDraft = null;
function wealthRulesNow(){
  const r = EC().wealthSettings(wealthDraft || load('tesk-wealth-tax', null));
  return EC().FEATURES.fund ? r : {...r, toFund: false};   // 공동 기금을 끈 동안 걷은 세금은 학급(국고)으로 회수
}
function wealthPreviewRows(rules){
  return (students || []).map(s => {
    const a = computeStudentAssets(s.num), cash = Number(s.points || 0), assets = cash + a.stockValue + a.depositTotal;
    const t = EC().wealthTax(assets, rules), pay = EC().payTax(cash, t.tax, s.taxDue);
    return {s, cash, assets, tax: t.tax, prevDue: Number(s.taxDue || 0), ...pay};
  });
}
function renderWealthTaxCard(){
  const box = document.getElementById('wealth-tax-card');
  if(!box) return;
  const r = wealthRulesNow(), rows = wealthPreviewRows(r);
  const total = rows.reduce((a, x) => a + x.paid, 0), dueTotal = rows.reduce((a, x) => a + x.due, 0);
  box.innerHTML = '<div class="card" style="margin-bottom:16px;"><div class="card-header"><div class="card-title">🏠 재산세 (누진)</div>'
    + '<label style="font-size:12px;font-weight:700;display:flex;gap:6px;align-items:center;"><input type="checkbox" id="wt-enabled" ' + (r.enabled ? 'checked' : '') + ' onchange="wealthDraftFromForm()"> 학생에게 안내하고 징수 사용</label></div>'
    + '<p style="font-size:11px;color:var(--sub);margin-bottom:8px;">현금+예금+주식을 모두 더한 자산에 매겨요. 각 구간을 <b>넘는 부분에만</b> 그 세율이 붙어요(누진세). 현금이 모자라면 잔액을 마이너스로 만들지 않고 <b>미납</b>으로 남겨 다음 징수 때 함께 걷어요. 학생은 은행 대시보드에서 세금 영수증을 봐요.</p>'
    + '<table class="student-table" style="font-size:12px;max-width:420px;"><thead><tr><th>자산이 이 금액을 넘는 부분</th><th>세율(%)</th><th></th></tr></thead><tbody>'
    + r.brackets.map((b, i) => '<tr><td><input class="form-input" type="number" min="0" step="1000" data-wt-min="' + i + '" value="' + b.min + '" ' + (i === 0 ? 'disabled' : '') + ' style="width:120px;padding:4px 8px;" onchange="wealthDraftFromForm()"></td>'
      + '<td><input class="form-input" type="number" min="0" max="50" step="0.5" data-wt-rate="' + i + '" value="' + b.rate + '" style="width:80px;padding:4px 8px;" onchange="wealthDraftFromForm()"></td>'
      + '<td>' + (i ? '<button class="pt-btn minus" onclick="wealthBracket(' + i + ',-1)">삭제</button>' : '') + '</td></tr>').join('')
    + '</tbody></table>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;"><button class="btn btn-sm btn-secondary" onclick="wealthBracket(0,1)">+ 구간 추가</button>'
    + (EC().FEATURES.fund ? '<label style="font-size:12px;display:flex;gap:6px;align-items:center;"><input type="checkbox" id="wt-fund" ' + (r.toFund ? 'checked' : '') + ' onchange="wealthDraftFromForm()"> 걷은 세금은 학급 공동 기금으로</label>' : '')
    + '<button class="btn btn-sm btn-primary" onclick="saveWealthRules()">설정 저장</button>'
    + '<button class="btn btn-sm btn-coral" onclick="collectWealthTax()" ' + (r.enabled ? '' : 'disabled title="먼저 사용을 켜고 저장하세요"') + '>재산세 징수 (' + econMoney(total) + ')</button></div>'
    + (r.lastRunAt ? '<div style="font-size:11px;color:var(--sub);">마지막 징수: ' + new Date(r.lastRunAt).toLocaleString('ko-KR') + '</div>' : '')
    + '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;">학생별 미리보기 · 낼 세금 ' + econMoney(total) + (dueTotal ? ' · 남을 미납 ' + econMoney(dueTotal) : '') + '</summary>'
    + '<table class="student-table" style="font-size:11px;margin-top:6px;"><thead><tr><th>학생</th><th>총자산</th><th>재산세</th><th>밀린 세금</th><th>낼 돈(현금)</th><th>남는 미납</th></tr></thead><tbody>'
    + rows.sort((a, b) => b.assets - a.assets).map(x => '<tr><td>' + escHtml(x.s.name || x.s.num + '번') + '</td><td>' + x.assets.toLocaleString() + '</td><td>' + x.tax.toLocaleString() + '</td><td>' + x.prevDue.toLocaleString() + '</td><td style="font-weight:700;color:var(--coral);">' + x.paid.toLocaleString() + '</td><td>' + (x.due ? x.due.toLocaleString() : '') + '</td></tr>').join('')
    + '</tbody></table></details></div>';
}
function wealthDraftFromForm(){
  const r = wealthRulesNow();
  const mins = [...document.querySelectorAll('[data-wt-min]')].map(el => Number(el.value) || 0);
  const rates = [...document.querySelectorAll('[data-wt-rate]')].map(el => Number(el.value) || 0);
  wealthDraft = {...r, enabled: !!document.getElementById('wt-enabled')?.checked, toFund: !!document.getElementById('wt-fund')?.checked,
    brackets: mins.map((m, i) => ({min: i ? m : 0, rate: rates[i] || 0}))};
  renderWealthTaxCard();
}
function wealthBracket(i, dir){
  const r = wealthRulesNow();
  const list = r.brackets.slice();
  if(dir > 0){ const last = list[list.length - 1]; list.push({min: (last.min || 10000) * 2, rate: Math.min(50, last.rate + 2)}); }
  else list.splice(i, 1);
  wealthDraft = {...r, brackets: list};
  renderWealthTaxCard();
}
function saveWealthRules(){
  const r = wealthRulesNow();
  save('tesk-wealth-tax', {enabled: r.enabled, toFund: r.toFund, brackets: r.brackets, lastRunAt: r.lastRunAt});
  wealthDraft = null;
  addActivity('🏠 재산세 설정 저장 (' + (r.enabled ? '사용' : '사용 안 함') + ')');
  showToast('💾 재산세 설정을 저장했어요');
  renderWealthTaxCard();
}
async function collectWealthTax(){
  if(wealthDraft) return showToast('⚠️ 바꾼 설정을 먼저 저장하세요');
  const r = wealthRulesNow();
  if(!r.enabled) return showToast('⚠️ 재산세 사용을 켜고 저장하세요');
  await Promise.all([loadPeskDeposits(), loadPeskPortfolios()]);   // 최신 예금·주식으로 계산
  const preview = wealthPreviewRows(r), expected = preview.reduce((a, x) => a + x.paid, 0);
  if(!await openAppConfirmModal({title: '재산세 징수', message: '누진 재산세를 걷을까요?\n예상 징수액: ' + econMoney(expected) + (r.toFund ? '\n걷은 세금은 학급 공동 기금으로 들어가요.' : ''), submitText: '징수', danger: true})) return;
  const at = new Date().toISOString(), logs = [];
  let total = 0;
  await updateStudentsAtomic(list => {
    list.forEach(s => {
      const a = computeStudentAssets(s.num), cash = Number(s.points || 0), assets = cash + a.stockValue + a.depositTotal;
      const t = EC().wealthTax(assets, r), prevDue = Math.max(0, Number(s.taxDue || 0)), pay = EC().payTax(cash, t.tax, prevDue);
      s.points = pay.cashAfter; s.taxDue = pay.due;
      s.taxReceipt = {name: '재산세', at, assets, tax: t.tax, prevDue, paid: pay.paid, due: pay.due, parts: t.parts.map(p => ({from: p.from, portion: Math.round(p.portion), rate: p.rate, tax: p.tax}))};
      total += pay.paid;
      if(pay.paid) logs.push({type: 'tax_wealth', studentNum: s.num, studentName: s.name || '', delta: -pay.paid, balanceBefore: cash, balanceAfter: pay.cashAfter, detail: '재산세 (누진)' + (pay.due ? ' · 미납 ' + pay.due : '')});
    });
  });
  await pushTeacherEconLogs(logs);
  if(r.toFund && total) await mutateClassFund(f => EC().addToFund(f, total, 'tax', '재산세'));
  save('tesk-wealth-tax', {enabled: r.enabled, toFund: r.toFund, brackets: r.brackets, lastRunAt: at});
  addActivity('🏠 재산세 징수 (총 ' + total.toLocaleString() + C() + ')');
  renderStudents(); renderWealthTaxCard(); renderEconomy();
  showToast('🏠 재산세 ' + econMoney(total) + ' 징수 완료');
}

/* ── 학급 공동 기금 ── */
let classFundT = null;
async function mutateClassFund(change){
  let out = null;
  await window._fsRunTxn(window._db, async txn => {
    const snap = await txn.get(econRef('pesk-class-fund'));
    out = change(EC().fundState(snap.exists() ? snap.data().value : null));
    txn.set(econRef('pesk-class-fund'), {value: out, updatedAt: new Date().toISOString()});
  });
  classFundT = out;
  return out;
}
async function loadClassFundT(){
  if(!econReady()) return;
  const snap = await window._fsGetDoc(econRef('pesk-class-fund'));
  classFundT = EC().fundState(snap.exists() ? snap.data().value : null);
}
async function renderClassFundPanel(fresh){
  const box = document.getElementById('econ-fund-body');
  if(!box) return;
  if(fresh || !classFundT){ box.textContent = '불러오는 중...'; try{ await loadClassFundT(); }catch(e){ box.textContent = '불러오지 못했어요: ' + e.message; return; } }
  const f = classFundT || EC().fundState(null);
  const name = n => { const s = (students || []).find(x => String(x.num) === String(n)); return s ? s.name : (n ? n + '번' : ''); };
  box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;"><div style="font-size:20px;font-weight:900;">' + econMoney(f.balance) + '</div><span style="font-size:12px;color:var(--sub);">아직 목표에 쓰지 않은 기금 (기부·재산세·경매 수입)</span>'
    + '<button class="btn btn-sm btn-primary" onclick="addFundGoal()">+ 공동 목표 만들기</button><button class="btn btn-sm btn-secondary" onclick="renderClassFundPanel(true)">🔄 새로고침</button></div>'
    + (f.goals.length ? f.goals.map(g => {
        const pct = Math.min(100, Math.round(g.raised / g.target * 100));
        return '<div style="padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:var(--surface);"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><b>' + escHtml(g.icon || '🎯') + ' ' + escHtml(g.title) + '</b>'
          + '<span style="font-size:12px;font-weight:800;">' + (g.status === 'done' ? '✅ 진행 완료' : g.status === 'funded' ? '🎉 목표 달성 — 활동을 진행하세요' : pct + '%') + '</span></div>'
          + '<div style="height:8px;border-radius:99px;background:#e5e7eb;overflow:hidden;margin:8px 0;"><div style="height:100%;width:' + pct + '%;background:#22c55e;"></div></div>'
          + '<div style="font-size:12px;color:var(--sub);">' + g.raised.toLocaleString() + ' / ' + g.target.toLocaleString() + ' · 참여 ' + g.donors.length + '명</div>'
          + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">'
          + (g.status === 'open' && f.balance ? '<button class="btn btn-sm btn-secondary" onclick="allocateFund(\'' + g.id + '\')">기금 잔액 옮기기</button>' : '')
          + (g.status === 'funded' ? '<button class="btn btn-sm btn-primary" onclick="finishFundGoal(\'' + g.id + '\')">진행 완료로 표시</button>' : '')
          + (g.status === 'open' && !g.raised ? '<button class="btn btn-sm btn-secondary" onclick="deleteFundGoal(\'' + g.id + '\')">삭제</button>' : '')
          + '</div></div>';
      }).join('') : '<div style="padding:16px;text-align:center;color:var(--sub);font-size:12px;">공동 목표가 없어요. 영화 감상, 체육 시간, 학급 간식처럼 모두가 누릴 목표를 만들어 보세요.</div>')
    + '<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;">기금 기록 (최근 30)</summary><div style="font-size:11.5px;line-height:1.8;margin-top:6px;">'
    + (f.history.slice(-30).reverse().map(h => new Date(h.at).toLocaleDateString('ko-KR') + ' · ' + ({donate: '🤝 기부', tax: '🏠 세금', auction: '🔨 경매', allocate: '➡️ 목표로 옮김', done: '✅ 진행 완료'}[h.type] || h.type)
      + (h.num ? ' · ' + escHtml(name(h.num)) : '') + ' · ' + Number(h.amount || 0).toLocaleString() + (h.detail ? ' · ' + escHtml(h.detail) : '')).join('<br>') || '기록이 없어요.') + '</div></details>';
}
async function addFundGoal(){
  const v = await openAppFormModal({title: '공동 목표 만들기', help: '목표 금액이 다 모이면 학생 화면에 "목표 달성"이 뜨고, 선생님이 활동을 진행한 뒤 완료로 표시해요.',
    fields: [{name: 'title', label: '목표 이름', placeholder: '예) 금요일 영화 감상', required: true}, {name: 'icon', label: '아이콘', value: '🎬'}, {name: 'target', label: '목표 금액', type: 'number', min: 1, value: 30000, required: true}], submitText: '만들기'});
  if(!v) return;
  const target = Math.round(Number(v.target) || 0);
  if(!v.title || target < 1) return showToast('⚠️ 이름과 목표 금액을 확인하세요');
  await mutateClassFund(f => { f.goals.push({id: 'goal_' + uid(), title: String(v.title).slice(0, 40), icon: String(v.icon || '🎯').slice(0, 4), target, raised: 0, status: 'open', donors: [], createdAt: new Date().toISOString()}); return f; });
  addActivity('🤝 공동 목표 추가: ' + v.title);
  renderClassFundPanel();
}
async function allocateFund(goalId){
  const f = classFundT || EC().fundState(null), g = f.goals.find(x => x.id === goalId);
  if(!g) return;
  const v = await openAppFormModal({title: '기금 잔액 옮기기', help: '기금 잔액 ' + econMoney(f.balance) + ' 중에서 「' + g.title + '」 목표로 옮길 금액', fields: [{name: 'amount', label: '금액', type: 'number', min: 1, value: Math.min(f.balance, g.target - g.raised), required: true}], submitText: '옮기기'});
  if(!v) return;
  try{ await mutateClassFund(x => EC().allocate(x, goalId, Number(v.amount))); }catch(e){ return showToast('⚠️ 옮기지 못했어요 (잔액·목표 상태 확인)'); }
  renderClassFundPanel();
}
async function finishFundGoal(goalId){
  if(!await openAppConfirmModal({title: '공동 목표 진행 완료', message: '학생들과 이 활동을 진행했나요? 완료로 표시해요.', submitText: '완료'})) return;
  await mutateClassFund(f => { const g = f.goals.find(x => x.id === goalId); if(g){ g.status = 'done'; g.doneAt = new Date().toISOString(); f.history.push({id: 'fh_' + uid(), type: 'done', amount: g.raised, detail: g.title, at: g.doneAt}); } return f; });
  addActivity('✅ 공동 목표 진행 완료');
  renderClassFundPanel();
}
async function deleteFundGoal(goalId){
  if(!await openAppConfirmModal({title: '공동 목표 삭제', message: '아직 모인 돈이 없는 목표예요. 삭제할까요?', submitText: '삭제', danger: true})) return;
  await mutateClassFund(f => { f.goals = f.goals.filter(g => !(g.id === goalId && !g.raised)); return f; });
  renderClassFundPanel();
}

/* ── 경매 ── */
let auctionsT = [];
async function renderAuctionPanel(fresh){
  const box = document.getElementById('econ-auction-body');
  if(!box) return;
  if(fresh || !auctionsT.length){ try{ const s = await window._fsGetDoc(econRef('pesk-auctions')); auctionsT = s.exists() ? (s.data().value || []) : []; }catch(e){ box.textContent = '불러오지 못했어요: ' + e.message; return; } }
  const name = n => { const s = (students || []).find(x => String(x.num) === String(n)); return s ? s.name : n + '번'; };
  const list = auctionsT.map(a => a && a.kind === 'seats' ? EC().seatAuctionState(a) : EC().auctionState(a)).reverse();
  if(seatDraft) return renderSeatAuctionEditor();
  box.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;"><button class="btn btn-sm btn-primary" onclick="createAuction()">+ 경매 열기</button><button class="btn btn-sm btn-primary" onclick="openSeatAuctionEditor()">🪑 자리 경매 열기</button><button class="btn btn-sm btn-secondary" onclick="renderAuctionPanel(true)">🔄 새로고침</button>'
    + '<span style="font-size:11px;color:var(--sub);align-self:center;">경매는 선생님만 열 수 있고 학생은 입찰만 해요. 입찰한 돈은 바로 맡겨 두고, 더 높은 입찰이 오면 이전 입찰자에게 돌려줘요. 마감 확정하면 낙찰자 「내 물건」에 들어가고 낙찰 금액은 학급(국고)으로 회수돼요.</span></div>'
    + (list.length ? list.map(a => {
        if(a.kind === 'seats') return seatAuctionTeacherCard(a, name);
        const ended = a.endsAt && new Date(a.endsAt).getTime() <= Date.now();
        return '<div style="padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:var(--surface);"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><b>' + escHtml(a.icon || '🔨') + ' ' + escHtml(a.title) + '</b><span style="font-size:12px;">'
          + (a.status === 'open' ? (ended ? '⏰ 입찰 마감 · 확정 필요' : '진행 중 · ' + new Date(a.endsAt).toLocaleString('ko-KR') + ' 마감') : a.status === 'closed' ? '✅ 낙찰 확정' : '취소됨') + '</span></div>'
          + '<div style="font-size:12px;color:var(--sub);margin-top:4px;">시작가 ' + a.startPrice.toLocaleString() + ' · 호가 단위 ' + a.step.toLocaleString() + ' · 입찰 ' + a.bids.length + '회'
          + (a.top ? ' · 최고 <b>' + a.top.amount.toLocaleString() + '</b> (' + escHtml(name(a.top.num)) + ')' : ' · 입찰 없음') + '</div>'
          + (a.status === 'open' ? '<div style="display:flex;gap:6px;margin-top:8px;"><button class="btn btn-sm btn-primary" onclick="closeAuctionT(\'' + a.id + '\',false)">마감 확정</button><button class="btn btn-sm btn-secondary" onclick="closeAuctionT(\'' + a.id + '\',true)">취소 (환불)</button></div>' : '')
          + '</div>';
      }).join('') : '<div style="padding:16px;text-align:center;color:var(--sub);font-size:12px;">열린 경매가 없어요. 자리 선점, 1일 반장, 급식 먼저 먹기처럼 하나뿐인 권리를 경매에 올려 보세요.</div>');
}
async function createAuction(){
  const v = await openAppFormModal({title: '경매 열기', fields: [
    {name: 'title', label: '경매 물건(권리)', placeholder: '예) 다음 주 자리 먼저 고르기', required: true}, {name: 'icon', label: '아이콘', value: '🪑'},
    {name: 'desc', label: '설명 (선택)', placeholder: '예) 다음 주 월요일 자리 바꾸기 때 가장 먼저 골라요'},
    {name: 'start', label: '시작 가격', type: 'number', min: 1, value: 1000, required: true}, {name: 'step', label: '호가 단위', type: 'number', min: 1, value: 200, required: true},
    {name: 'hours', label: '입찰 기간 (시간)', type: 'number', min: 1, value: 24, required: true}], submitText: '경매 열기'});
  if(!v) return;
  const start = Math.round(Number(v.start)), step = Math.round(Number(v.step)), hours = Number(v.hours);
  if(!v.title || !(start >= 1) || !(step >= 1) || !(hours > 0)) return showToast('⚠️ 값을 확인하세요');
  const a = {id: 'auc_' + uid(), title: String(v.title).slice(0, 40), icon: String(v.icon || '🔨').slice(0, 4), desc: String(v.desc || '').slice(0, 120),
    startPrice: start, step, endsAt: new Date(Date.now() + hours * 3600000).toISOString(), status: 'open', bids: [], top: null, createdAt: new Date().toISOString()};
  await window._fsRunTxn(window._db, async txn => {
    const s = await txn.get(econRef('pesk-auctions'));
    const list = (s.exists() ? (s.data().value || []) : []).slice(-29);   // 최근 30개까지만 남긴다 (진행 중인 경매는 마감 전이라 앞쪽에 남지 않게)
    list.push(a);
    txn.set(econRef('pesk-auctions'), {value: list, updatedAt: new Date().toISOString()});
    auctionsT = list;
  });
  addActivity('🔨 경매 열기: ' + a.title);
  renderAuctionPanel();
}
async function closeAuctionT(id, cancel){
  const raw = auctionsT.find(x => x.id === id);
  const a = raw && raw.kind === 'seats' ? EC().seatAuctionState(raw) : EC().auctionState(raw);
  if(a.kind === 'seats'){
    const sold = a.lots.filter(l => l.top).length;
    if(!await openAppConfirmModal({title: cancel ? '자리 경매 취소' : '자리 경매 마감 확정',
      message: cancel ? '자리 경매를 취소하고 입찰한 학생 모두에게 돈을 돌려줄까요?' : '경매 자리 ' + a.lots.length + '개 중 ' + sold + '개가 낙찰돼요.\n낙찰 금액은 학급(국고)으로 회수돼요. 확정한 뒤 [자리표에 반영]을 누르면 자리배치에 들어가요.',
      submitText: cancel ? '취소하고 환불' : '확정', danger: !!cancel})) return;
  }else if(!await openAppConfirmModal({title: cancel ? '경매 취소' : '경매 마감 확정',
    message: cancel ? '경매를 취소하고 최고 입찰자에게 맡긴 돈을 돌려줄까요?' : (a.top ? '최고 입찰 ' + econMoney(a.top.amount) + '으로 낙찰을 확정할까요?\n낙찰자 「내 물건」에 들어가고, 낙찰 금액은 ' + (EC().FEATURES.fund ? '공동 기금으로 가요.' : '학급(국고)으로 회수돼요.') : '입찰이 없어요. 경매를 닫을까요?'),
    submitText: cancel ? '취소하고 환불' : '확정', danger: !!cancel})) return;
  let out = null;
  try{
    await window._fsRunTxn(window._db, async txn => {
      const [as, ss, ps, fs] = await Promise.all(['pesk-auctions', 'tesk-students', 'pesk-purchases', 'pesk-class-fund'].map(k => txn.get(econRef(k))));
      const list = as.exists() ? (as.data().value || []) : [], i = list.findIndex(x => x && x.id === id);
      if(i < 0) throw new Error('없는 경매예요');
      const at = new Date().toISOString();
      if(list[i].kind === 'seats'){
        // 자리 경매: 자리마다 최고 입찰자가 낙찰 (돈은 입찰 때 이미 맡겼다 → 학급으로 회수). 취소하면 모두 환불
        const r = EC().closeSeatAuction(list[i], {cancel});
        list[i] = r.auction;
        out = {r: {auction: r.auction}, logs: [], seat: r};
        if(r.refunds.length){
          const studs = ss.exists() ? (ss.data().value || []) : [];
          r.refunds.forEach(f => { const j = studs.findIndex(s => String(s.num) === String(f.num)); if(j < 0) return; const b = Number(studs[j].points || 0); studs[j].points = b + f.amount;
            out.logs.push({type: 'auction_refund', studentNum: studs[j].num, studentName: studs[j].name || '', delta: f.amount, balanceBefore: b, balanceAfter: b + f.amount, detail: '자리 경매 취소 환불'}); });
          txn.set(econRef('tesk-students'), {value: studs, updatedAt: at}); out.students = studs;
        }
        txn.set(econRef('pesk-auctions'), {value: list, updatedAt: at});
        auctionsT = list;
        return;
      }
      const r = EC().closeAuction(list[i], {cancel});
      list[i] = r.auction;
      out = {r, logs: []};
      if(r.refund){
        const studs = ss.exists() ? (ss.data().value || []) : [], j = studs.findIndex(s => String(s.num) === String(r.refund.num));
        if(j >= 0){ const b = Number(studs[j].points || 0); studs[j].points = b + r.refund.amount; txn.set(econRef('tesk-students'), {value: studs, updatedAt: at}); out.students = studs;
          out.logs.push({type: 'auction_refund', studentNum: studs[j].num, studentName: studs[j].name || '', delta: r.refund.amount, balanceBefore: b, balanceAfter: b + r.refund.amount, detail: '경매 취소 환불: ' + r.auction.title}); }
      }
      if(r.winner){
        const buys = ps.exists() ? (ps.data().value || []) : [];
        buys.push({id: 'auction:' + id, studentNum: Number(r.winner.num), studentName: r.winner.name || '', itemId: 'auction:' + id, itemName: r.auction.title, icon: r.auction.icon || '🔨',
          price: r.winner.amount, paidWith: 'auction', source: 'auction', date: new Date().toLocaleDateString('ko-KR'), status: 'pending', qty: 1, createdAt: at});
        txn.set(econRef('pesk-purchases'), {value: buys, updatedAt: at});
        if(EC().FEATURES.fund) txn.set(econRef('pesk-class-fund'), {value: EC().addToFund(fs.exists() ? fs.data().value : null, r.winner.amount, 'auction', r.auction.title), updatedAt: at});
      }
      txn.set(econRef('pesk-auctions'), {value: list, updatedAt: at});
      auctionsT = list;
    });
  }catch(e){ return showToast('⚠️ ' + (e.message === 'AUCTION_CLOSED' ? '이미 마감된 경매예요' : e.message)); }
  if(out.students){ students = out.students; saveLocal('tesk-students', students); renderStudents(); }
  await pushTeacherEconLogs(out.logs);
  addActivity((cancel ? '🔨 경매 취소: ' : '🔨 경매 낙찰: ') + (out.r.auction.title || ''));
  renderAuctionPanel();
}

/* ── 우리반 펀드 (전체 종목 평균을 따라가는 상품) ── */
function classIndexBase(){ const v = load('tesk-stock-index', null); return v && v.base && Object.keys(v.base).length ? v : null; }
/* 주식 가격을 저장하기 직전에 부른다 — 펀드를 상장한 학급만 값이 바뀐다 */
function _refreshClassIndexPrice(){
  const ix = classIndexBase();
  if(!ix || !EC()) return;
  stockPrices[EC().INDEX_CODE] = EC().indexPrice(stockPrices, ix.base);
}
function renderClassIndexCard(){
  const box = document.getElementById('class-index-card');
  if(!box) return;
  if(!EC().FEATURES.classIndex){ box.innerHTML = ''; return; }   // 사용 안 함 (2026-10-09)
  const ix = classIndexBase(), code = EC().INDEX_CODE;
  if(!ix){
    box.innerHTML = '<div class="card" style="margin-bottom:16px;"><div class="card-header"><div class="card-title">🧺 우리반 펀드</div><button class="btn btn-sm btn-primary" onclick="listClassIndex()">상장하기</button></div>'
      + '<p style="font-size:12px;color:var(--sub);">주식 1주가 비싸서 월급만 받는 학생은 투자에 참여하기 어려워요. 우리반 펀드는 <b>학급 종목 전체의 평균 등락</b>을 따라가는 상품으로, 1주 ' + EC().INDEX_BASE_VALUE.toLocaleString() + C() + '에서 시작해요. 학생 주식 목록 맨 위에 나타나요.</p></div>';
    return;
  }
  const now = Number(stockPrices[code] || EC().INDEX_BASE_VALUE), chg = Math.round((now / EC().INDEX_BASE_VALUE - 1) * 1000) / 10;
  box.innerHTML = '<div class="card" style="margin-bottom:16px;"><div class="card-header"><div class="card-title">🧺 우리반 펀드</div><span style="font-size:13px;font-weight:900;">' + econMoney(now) + ' <span style="color:' + (chg >= 0 ? '#15803d' : '#b91c1c') + ';">' + (chg >= 0 ? '+' : '') + chg + '%</span></span></div>'
    + '<p style="font-size:12px;color:var(--sub);">' + new Date(ix.createdAt).toLocaleDateString('ko-KR') + ' 상장 · 종목 ' + Object.keys(ix.base).length + '개의 평균 등락을 따라가요. 주식 가격을 갱신할 때 함께 바뀌어요.</p></div>';
}
async function listClassIndex(){
  const codes = KOSPI100.map(s => s.code).filter(c => Number(stockPrices[c]) > 0);
  if(!codes.length) return showToast('⚠️ 주식 가격이 없어요. 먼저 가격을 갱신하세요');
  if(!await openAppConfirmModal({title: '우리반 펀드 상장', message: '지금 가격을 기준으로 우리반 펀드를 ' + EC().INDEX_BASE_VALUE.toLocaleString() + C() + '에 상장할까요?\n상장한 뒤에는 학생이 보유할 수 있어 내리지 않아요.', submitText: '상장'})) return;
  const base = {};
  codes.forEach(c => { base[c] = Number(stockPrices[c]); });
  save('tesk-stock-index', {base, createdAt: new Date().toISOString()});
  _refreshClassIndexPrice();
  save('tesk-stock-prices', stockPrices);
  addActivity('🧺 우리반 펀드 상장');
  renderClassIndexCard();
  showToast('🧺 우리반 펀드를 상장했어요');
}

/* ── 자리 경매 (교사) ── 자리배치 화면의 자리표(줄·칸·짝 책상)를 바탕으로 경매할 자리를 고른다.
   학생 화면에는 자리표 모양과 금액만 보이고, 누가 어디 앉아 있는지·배치 근거는 보이지 않는다. */
let seatDraft = null;
function seatChartNow(){
  const raw = load('tesk-seats', {}) || {};
  const rows = Math.max(1, Math.min(10, Number(raw.rows) || 4)), cols = Math.max(1, Math.min(12, Number(raw.cols) || 6));
  const grid = Array.isArray(raw.grid) && raw.grid.length === rows * cols ? raw.grid : null;
  return {raw, rows, cols, pairDesks: raw.pairDesks !== false, grid};
}
function seatNameOf(n){ const s = (students || []).find(x => String(x.num) === String(n)); return s ? s.name : (n != null ? n + '번' : ''); }
function openSeatAuctionEditor(){
  const c = seatChartNow();
  seatDraft = {rows: c.rows, cols: c.cols, pairDesks: c.pairDesks, grid: c.grid, picked: new Set()};
  renderSeatAuctionEditor();
}
function renderSeatAuctionEditor(){
  const box = document.getElementById('econ-auction-body');
  if(!box || !seatDraft) return;
  const d = seatDraft;
  let cells = '';
  for(let i = 0; i < d.rows * d.cols; i++){
    const c = i % d.cols, on = d.picked.has(i), who = d.grid ? d.grid[i] : null, gap = d.pairDesks && c > 0 && c % 2 === 0 ? 'margin-left:10px;' : '';
    cells += '<button type="button" onclick="toggleSeatLot(' + i + ')" style="' + gap + 'min-height:52px;border-radius:10px;border:' + (on ? '2px solid #ea580c' : '1px solid var(--border)') + ';background:' + (on ? '#fff7ed' : 'var(--surface)') + ';font:inherit;font-size:11px;cursor:pointer;">'
      + (on ? '🪑 경매<br>' : '') + '<span style="color:var(--sub);">' + (who != null ? escHtml(seatNameOf(who)) : (Math.floor(i / d.cols) + 1) + '-' + (c + 1)) + '</span></button>';
  }
  box.innerHTML = '<div style="font-size:12px;color:var(--sub);margin-bottom:8px;">경매에 올릴 자리를 눌러 고르세요 (주황색). 자리표는 자리배치 화면의 줄·칸을 그대로 써요' + (d.grid ? ' — 지금 앉은 학생 이름은 선생님 화면에만 보여요.' : '. 아직 자리배치가 없어 자리 번호로 보여요.') + '</div>'
    + '<div style="text-align:center;font-size:11px;font-weight:800;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px;margin-bottom:6px;max-width:720px;">교탁</div>'
    + '<div style="display:grid;grid-template-columns:repeat(' + d.cols + ',minmax(0,1fr));gap:6px;max-width:720px;">' + cells + '</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:12px;">'
    + '<label class="form-label" style="margin:0;">제목<input class="form-input" id="sa-title" value="자리 경매" style="width:160px;"></label>'
    + '<label class="form-label" style="margin:0;">시작 가격<input class="form-input" type="number" min="1" id="sa-start" value="500" style="width:100px;"></label>'
    + '<label class="form-label" style="margin:0;">호가 단위<input class="form-input" type="number" min="1" id="sa-step" value="100" style="width:90px;"></label>'
    + '<label class="form-label" style="margin:0;">입찰 기간(시간)<input class="form-input" type="number" min="1" id="sa-hours" value="24" style="width:90px;"></label></div>'
    + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-sm btn-primary" onclick="createSeatAuction()">자리 경매 열기 (' + d.picked.size + '자리)</button><button class="btn btn-sm btn-secondary" onclick="seatDraft=null;renderAuctionPanel()">취소</button></div>'
    + '<p style="font-size:11px;color:var(--sub);margin-top:8px;">학생은 한 번에 한 자리에서만 최고 입찰자가 될 수 있고, 금액만 보여요(이름은 보이지 않아요). 끝나면 낙찰자만 자리표에 넣고 나머지는 선생님이 자리를 눌러 바꿔요.</p>';
}
function toggleSeatLot(i){ if(!seatDraft) return; seatDraft.picked.has(i) ? seatDraft.picked.delete(i) : seatDraft.picked.add(i); renderSeatAuctionEditor(); }
async function createSeatAuction(){
  const d = seatDraft;
  if(!d || !d.picked.size) return showToast('⚠️ 경매에 올릴 자리를 하나 이상 고르세요');
  const start = Math.round(Number(document.getElementById('sa-start').value)), step = Math.round(Number(document.getElementById('sa-step').value)), hours = Number(document.getElementById('sa-hours').value);
  if(!(start >= 1) || !(step >= 1) || !(hours > 0)) return showToast('⚠️ 가격과 기간을 확인하세요');
  const a = {id: 'auc_' + uid(), kind: 'seats', title: String(document.getElementById('sa-title').value || '자리 경매').slice(0, 40), icon: '🪑',
    startPrice: start, step, endsAt: new Date(Date.now() + hours * 3600000).toISOString(), status: 'open',
    layout: {rows: d.rows, cols: d.cols, pairDesks: d.pairDesks}, lots: [...d.picked].sort((x, y) => x - y).map(seat => ({seat, top: null, bids: 0})), createdAt: new Date().toISOString()};
  await window._fsRunTxn(window._db, async txn => {
    const sn = await txn.get(econRef('pesk-auctions'));
    const list = (sn.exists() ? (sn.data().value || []) : []).slice(-29);
    list.push(a);
    txn.set(econRef('pesk-auctions'), {value: list, updatedAt: new Date().toISOString()});
    auctionsT = list;
  });
  seatDraft = null;
  addActivity('🪑 자리 경매 열기 (' + a.lots.length + '자리)');
  renderAuctionPanel();
}
function seatAuctionTeacherCard(a, name){
  const L = a.layout, lots = new Map(a.lots.map(l => [l.seat, l])), ended = a.endsAt && new Date(a.endsAt).getTime() <= Date.now();
  let cells = '';
  for(let i = 0; i < L.rows * L.cols; i++){
    const c = i % L.cols, lot = lots.get(i), gap = L.pairDesks && c > 0 && c % 2 === 0 ? 'margin-left:8px;' : '';
    if(!lot){ cells += '<div style="' + gap + 'min-height:40px;border-radius:8px;background:var(--surface);border:1px dashed var(--border);"></div>'; continue; }
    const who = a.status === 'closed' ? lot.winner : (lot.top ? lot.top.num : null);
    cells += '<div style="' + gap + 'min-height:40px;border-radius:8px;background:#fff7ed;border:1px solid #fdba74;font-size:10.5px;text-align:center;padding:2px;">🪑 '
      + (lot.top ? '<b>' + lot.top.amount.toLocaleString() + '</b><br>' + escHtml(name(who)) : '<span style="color:var(--sub);">입찰 없음</span>') + '</div>';
  }
  return '<div style="padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:var(--surface);"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><b>🪑 ' + escHtml(a.title) + '</b><span style="font-size:12px;">'
    + (a.status === 'open' ? (ended ? '⏰ 입찰 마감 · 확정 필요' : '진행 중 · ' + new Date(a.endsAt).toLocaleString('ko-KR') + ' 마감') : a.status === 'closed' ? '✅ 낙찰 확정' + (a.appliedAt ? ' · 자리표 반영됨' : '') : '취소됨') + '</span></div>'
    + '<div style="font-size:12px;color:var(--sub);margin:4px 0 8px;">시작가 ' + a.startPrice.toLocaleString() + ' · 호가 ' + a.step.toLocaleString() + ' · 경매 자리 ' + a.lots.length + '개 · 입찰된 자리 ' + a.lots.filter(l => l.top).length + '개 (이름은 선생님 화면에만 보여요)</div>'
    + '<div style="text-align:center;font-size:10px;font-weight:800;background:var(--bg);border-radius:6px;padding:2px;margin-bottom:4px;max-width:560px;">교탁</div>'
    + '<div style="display:grid;grid-template-columns:repeat(' + L.cols + ',minmax(0,1fr));gap:4px;max-width:560px;">' + cells + '</div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">'
    + (a.status === 'open' ? '<button class="btn btn-sm btn-primary" onclick="closeAuctionT(\'' + a.id + '\',false)">마감 확정</button><button class="btn btn-sm btn-secondary" onclick="closeAuctionT(\'' + a.id + '\',true)">취소 (모두 환불)</button>' : '')
    + (a.status === 'closed' ? '<button class="btn btn-sm btn-primary" onclick="applySeatAuctionToChart(\'' + a.id + '\')">자리표에 반영</button>' : '')
    + '</div></div>';
}
/* 낙찰자를 자리배치(tesk-seats)에 넣는다. 원래 그 자리에 있던 학생은 빈자리로 옮기고, 나머지는 선생님이 바꾼다. */
async function applySeatAuctionToChart(id){
  const a = EC().seatAuctionState(auctionsT.find(x => x.id === id));
  if(a.status !== 'closed') return;
  const winners = {};
  a.lots.forEach(l => { if(l.winner != null) winners[l.seat] = l.winner; });
  if(!Object.keys(winners).length) return showToast('낙찰된 자리가 없어요');
  const c = seatChartNow(), L = a.layout;
  const sameShape = c.rows === L.rows && c.cols === L.cols;
  if(!await openAppConfirmModal({title: '자리표에 반영', message: '낙찰자 ' + Object.keys(winners).length + '명을 낙찰 자리에 앉힐까요?\n그 자리에 있던 학생은 빈자리로 옮겨요. 나머지 학생은 친구관계 분석 → 자리배치에서 자리 두 개를 눌러 바꾸면 돼요.'
    + (sameShape ? '' : '\n지금 자리배치(' + c.rows + '줄×' + c.cols + '칸)와 경매 때 자리표(' + L.rows + '줄×' + L.cols + '칸)가 달라서, 경매 때 자리표 모양으로 새로 만들어요.'), submitText: '반영'})) return;
  const grid = EC().applySeatWinners(sameShape ? c.grid : null, L.rows, L.cols, winners, (students || []).map(s => Number(s.num)));
  save('tesk-seats', {...c.raw, rows: L.rows, cols: L.cols, pairDesks: L.pairDesks, grid, createdAt: new Date().toISOString()});
  await window._fsRunTxn(window._db, async txn => {
    const sn = await txn.get(econRef('pesk-auctions'));
    const list = sn.exists() ? (sn.data().value || []) : [], i = list.findIndex(x => x && x.id === id);
    if(i >= 0){ list[i] = {...list[i], appliedAt: new Date().toISOString()}; txn.set(econRef('pesk-auctions'), {value: list, updatedAt: new Date().toISOString()}); auctionsT = list; }
  });
  addActivity('🪑 자리 경매 결과를 자리표에 반영');
  showToast('🪑 자리표에 반영했어요. 친구관계 분석 → 🪑 자리배치에서 나머지 자리를 바꿔 보세요');
  renderAuctionPanel();
}
