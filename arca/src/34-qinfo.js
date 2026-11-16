/* ════════ 퀘스트 자세히 보기 (2026-11-16 선생님 요청) ════════
   왼쪽 위 퀘스트 목록(#trk)의 한 줄, 「메인」 줄(#h4), 일지(패널 모험 → 일지)의 받은 부탁을 누르면 상자가 열린다:
   종류·부탁한 사람·장소 → 할 일(종류마다 풀어서) → 진행 막대 → 부탁 내용(처음 들은 말) → 도움말 → 보상 → 이어지는 사연.
   상자는 26-lesson 의 lsOpenBox 를 같이 쓴다(게임 멈춤). Esc·닫기·바깥 누르기로 닫힘. */
const QI_TYPE = { kill: "잡기", gather: "모으기", talk: "전하기", solve: "문제 풀어 주기", riddle: "수수께끼", teach: "가르쳐 주기", choice: "고민 듣기", dex: "도감 사진", deliver: "시간 안 배달", escort: "호위" };
const qiN = (id) => (D[id] && D[id].n) || id;
const qiMap = (id) => (id && CNAME[id]) || "";
const qiItem = (t) => (typeof ITEM !== "undefined" && ITEM[t]) || t;
// 할 일을 문장으로
function qiTodo(q, s0) {
  const n = q.n, who = qiN(q.npc), at = qiMap(q.where);
  switch (q.type) {
    case "kill": return at + "에서 " + jo(MON[q.mon] ? MON[q.mon].n : q.mon, "을", "를") + " " + n + "마리 물리쳐요.";
    case "gather": return at + "에서 " + jo(qiItem(q.item), "을", "를") + " " + n + "개 모아요. 반짝이는 곳에서 조사(스페이스)하면 캐요.";
    case "talk": return qiMap(q.toMap) + "에 있는 " + jo(qiN(q.to), "에게", "에게") + " 전하고, " + jo(who, "에게", "에게") + " 돌아가 알려요.";
    case "solve": return jo(who, "과", "와") + " 함께 문제 " + n + "개를 풀어요. 말을 걸면 바로 시작해요.";
    case "riddle": return jo(who, "에게", "에게") + " 말을 걸어 이번 단원 수수께끼 " + n + "개를 풀어요. 틀려도 다시 고를 수 있어요.";
    case "teach": return who + "의 풀이에서 처음 틀린 줄을 " + n + "번 찾아 줘요. 줄을 하나씩 눌러 보면 돼요.";
    case "choice": return who + "의 이야기를 끝까지 듣고 답을 골라요. 무엇을 골라도 괜찮고, 고른 것에 따라 답례가 달라요.";
    case "dex": {
      const L = typeof qxDexKinds === "function" ? qxDexKinds(q.where) : [];
      return at + "에 사는 몬스터 " + n + "종을 가까이서 만나 도감에 담아요(공격해서 문제가 뜨면 담겨요). 이곳 몬스터: " + L.map((k) => MON[k].n).join(", ") + ".";
    }
    case "deliver": return qiMap(q.toMap) + "에 있는 " + jo(qiN(q.to), "에게", "에게") + " " + q.time + "초 안에 전하고 " + jo(who, "에게", "에게") + " 돌아가요. 늦어도 괜찮아요(답례만 조금 줄어요).";
    case "escort": return jo(who, "과", "와") + " 함께 " + at + " 끝(" + qiMap(q.exitTo) + " 쪽 출구)까지 가요. 몬스터가 가까우면 멈추니 길을 열어 줘요.";
  }
  return q.prog || "";
}
// 지금 상태 한 줄
function qiNow(q, s0) {
  if (!s0) return "아직 받지 않았어요. " + jo(qiN(q.npc), "에게", "에게") + " 말을 걸면 받아요.";
  if (s0.st === "done") return "끝낸 부탁이에요.";
  const c = qCount(q);
  if (c >= q.n) return jo(qiN(q.npc), "에게", "에게") + " 돌아가 말을 걸면 끝나요! (" + qiMap(q.map) + ")";
  if (q.type === "talk" || q.type === "deliver") return s0.k ? "전했어요! " + jo(qiN(q.npc), "에게", "에게") + " 돌아가요." : "아직 전하지 않았어요.";
  if (q.type === "dex") return "담은 몬스터: " + ((s0.seen || []).map((k) => MON[k].n).join(", ") || "아직 없음");
  if (q.type === "escort") return QX.esc ? "같이 가는 중이에요." : "같이 가는 중이에요. 맵을 옮기면 따라와요.";
  return "";
}
function qiOpen(q) {
  if (!q || busy) return;
  const s0 = save.q[q.id],
    c = s0 ? qCount(q) : 0,
    tag = q.pet ? "펫" : q.side ? "서브" : "메인",
    pct = Math.round((Math.min(c, q.n) / q.n) * 100),
    rw = q.rw || {},
    next = QS.find((x) => x.after === q.id),
    prev = q.after && QS.find((x) => x.id === q.after);
  let left = "";
  if (q.type === "deliver" && s0 && s0.st === "active" && !s0.k) {
    const t = Math.max(0, Math.round(q.time - (Date.now() - (s0.t0 || Date.now())) / 1000));
    left = t > 0 ? " · 남은 시간 " + t + "초" : " · 시간이 지났어요(그래도 전할 수 있어요)";
  }
  const offer = (q.offer || []).map((t) => esc(storyText(t))).join("<br>");
  lsOpenBox(
    lsHead(storyText(q.title), tag + " · " + (QI_TYPE[q.type] || q.type)) +
      '<div class="qi">' +
      '<p class="qirow"><b>부탁한 사람</b>' + esc(qiN(q.npc)) + " · " + esc(qiMap(q.map)) + "</p>" +
      '<p class="qirow"><b>할 일</b>' + esc(qiTodo(q, s0)) + "</p>" +
      '<div class="qibar"><i style="width:' + pct + '%"></i><span>' + Math.min(c, q.n) + " / " + q.n + left + "</span></div>" +
      (qiNow(q, s0) ? '<p class="qinow">' + esc(qiNow(q, s0)) + "</p>" : "") +
      (offer ? '<blockquote class="qisay"><small>' + esc(qiN(q.npc)) + "의 부탁</small>" + offer + "</blockquote>" : "") +
      (q.prog ? '<p class="qirow"><b>도움말</b>' + esc(storyText(q.prog)) + "</p>" : "") +
      '<p class="qirow"><b>보상</b>EXP ' + (rw.exp || 0) + " · 금화 " + (rw.gold || 0) + " · 별빛 가루 " + (rw.dust || 0) + (rw.item ? " · " + esc(rw.item) : "") + (q.type === "choice" ? " (고른 답에 따라 달라요)" : "") + "</p>" +
      (prev ? '<p class="qirow"><b>앞 이야기</b>' + esc(storyText(prev.title)) + "</p>" : "") +
      (next ? '<p class="qirow"><b>이어지는 이야기</b>' + (s0 && s0.st === "done" ? esc(storyText(next.title)) : "이 부탁을 끝내면 이야기가 이어져요") + "</p>" : "") +
      (!q.side ? '<p class="qinote">메인 부탁이에요. 끝내야 이 마을의 금빛 핵심 자리가 열려요.</p>' : "") +
      "</div>" +
      '<div class="lsrow"><button type="button" class="lsmain" data-qi="x">닫기</button></div>',
  );
  lsEl.onclick = (e) => {
    if (e.target.closest('[data-qi="x"]')) {
      lsEl.onclick = null;
      lsClose();
    }
  };
}
// 지금 할 일(메인 줄) — 관련된 메인 부탁이 있으면 그 부탁, 없으면 지금 할 일 설명
function qiMain() {
  if (busy) return;
  const p = curPart(),
    tn = PARTS[p] && PARTS[p].town,
    q = tn && QS.find((q) => q.map === tn && !q.side && save.q[q.id] && save.q[q.id].st === "active");
  if (q) return qiOpen(q);
  const g = goal();
  if (!g) return;
  lsOpenBox(
    lsHead("지금 할 일", "메인 이야기 · " + (p + 1) + "부") +
      '<div class="qi"><p class="qirow"><b>할 일</b>' + esc(g.t) + "</p>" +
      (g.via ? '<p class="qirow"><b>가는 길</b>' + esc(g.via) + " 쪽으로 가요. 화면의 노란 화살표를 따라가요.</p>" : '<p class="qirow"><b>가는 길</b>화면의 노란 화살표를 따라가요.</p>') +
      '<p class="qinote">마을 사람 머리 위 「!」는 새 부탁, 「?」는 진행 중인 부탁이에요.</p></div>' +
      '<div class="lsrow"><button type="button" class="lsmain" data-qi="x">닫기</button></div>',
  );
  lsEl.onclick = (e) => {
    if (e.target.closest('[data-qi="x"]')) {
      lsEl.onclick = null;
      lsClose();
    }
  };
}
// 퀘스트 목록에 누를 수 있게 id 붙이기
{
  const trk0 = trk;
  trk = function () {
    trk0();
    const act = QS.filter((q) => save.q[q.id] && save.q[q.id].st === "active");
    [...$("trk").children].forEach((d, i) => {
      if (!act[i]) return;
      d.dataset.qid = act[i].id;
      d.setAttribute("role", "button");
      d.tabIndex = 0;
      d.title = "눌러서 자세히 보기";
    });
  };
  const pick = (e) => {
    const d = e.target.closest("[data-qid]");
    if (!d) return;
    e.stopPropagation();
    qiOpen(QS.find((q) => q.id === d.dataset.qid));
  };
  $("trk").addEventListener("click", pick);
  $("trk").addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && pick(e));
  $("h4").addEventListener("click", (e) => {
    e.stopPropagation();
    qiMain();
  });
  $("h4").setAttribute("role", "button");
  $("h4").title = "눌러서 자세히 보기";
  // 일지(PANEL.log)의 받은 부탁에도
  if (typeof PANEL === "object" && PANEL.log) {
    const lg0 = PANEL.log;
    PANEL.log = function () {
      let h = lg0.apply(this, arguments);
      const act = QS.filter((q) => save.q[q.id] && save.q[q.id].st === "active");
      const at = h.indexOf("받은 부탁");
      if (at < 0) return h;
      let i = 0;
      const tail = h.slice(at).replace(/<div class="it">/g, (m) => (act[i] ? '<div class="it qiclick" data-qid="' + act[i++].id + '" role="button" tabindex="0" title="눌러서 자세히 보기">' : m));
      return h.slice(0, at) + tail;
    };
    document.addEventListener("click", (e) => {
      const d = e.target.closest(".qiclick[data-qid]");
      if (!d || !$("panel") || $("panel").hidden) return;
      if (typeof closePanel === "function") closePanel();
      else ($("panel").hidden = true), (busy = false);
      setTimeout(() => qiOpen(QS.find((q) => q.id === d.dataset.qid)), 30);
    });
  }
}
{
  const st = document.createElement("style");
  st.textContent =
    "#qlist .trk div,#h4{pointer-events:auto;cursor:pointer}#qlist .trk{pointer-events:auto}#qlist .trk div:hover,#h4:hover{text-decoration:underline}" +
    ".qi{display:flex;flex-direction:column;gap:6px;text-align:left}.qirow{margin:0;line-height:1.5}.qirow b{display:inline-block;min-width:6.5em;color:#f5e3a3;font-weight:700}" +
    ".qibar{position:relative;height:16px;background:#2b2650;border-radius:8px;overflow:hidden}.qibar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#7ee07a,#ffd86b)}" +
    ".qibar span{position:relative;display:block;text-align:center;font-size:12px;line-height:16px;color:#fff;text-shadow:0 1px 2px #000;font-weight:700}" +
    ".qinow{margin:0;color:#9fe0ff}.qisay{margin:0;padding:6px 10px;border-left:3px solid #8f86c4;background:rgba(255,255,255,.05);border-radius:4px;line-height:1.5}.qisay small{display:block;opacity:.7}" +
    ".qinote{margin:0;font-size:.9em;opacity:.8}.qiclick{cursor:pointer}.qiclick:hover{outline:1px solid #8f86c4}";
  document.head.appendChild(st);
}

/* ════════ 문제를 풀 때 스킬·공격 단추 숨기기 (2026-11-16 선생님: 스킬 단추가 문제를 가림) ════════
   휴대폰·태블릿에서 오른쪽 아래 스킬 줄(#skrow)·공격/점프/조사(#btns)는 문제 상자·숫자 판·풀이 화면·대화·수업 상자·
   미니 조작·패널·튜토리얼이 열려 있거나 답 구슬을 고르는 동안(body.orbing) 숨긴다. 움직임 판(#pad)은 구슬 조준 중엔 남긴다(피하기). */
{
  const vis = (id) => {
    const e = $(id);
    return !!e && !e.hidden && e.offsetParent !== null;
  };
  const tick = () => {
    const boxOpen = ["bt", "kp", "lesson", "pbox", "mini", "panel", "tut"].some(vis) || (typeof dl !== "undefined" && !!dl);
    const answering = document.body.classList.contains("orbing") || (typeof ORB === "object" && ORB.on);
    document.body.classList.toggle("qhide", boxOpen || answering || (busy && mode === "map"));
    document.body.classList.toggle("qhidepad", boxOpen || (busy && mode === "map" && !answering));
  };
  setInterval(tick, 80);
  const st = document.createElement("style");
  st.textContent = "body.qhide #skrow,body.qhide .btns{visibility:hidden!important;pointer-events:none!important}body.qhidepad .pad{visibility:hidden!important;pointer-events:none!important}";
  document.head.appendChild(st);
}
