/* ════════ 약점 구슬 전투 (2026-11-15, docs/설계_약점구슬전투.md, 선생님 확인) ════════
   · 공격이 닿으면 게임이 멈추지 않는다. 문제는 짧으면 몬스터 머리 위 말풍선, 길면 화면 아래 '문제 띠'.
   · 답은 구슬 3개(1·2·3 / 띠의 큰 버튼). 던지면 날아가 맞고: 정답 = 약점 폭발, 오답 = 튕겨 나감 + 풀이.
   · 조준된 몬스터는 아주 천천히 다가오고(선생님 결정), 다른 몬스터는 절반 속도. 조준 중에는 다른 공격·부딪힘이 없다.
   · 속은 기존 문제 상자(09-field 의 askField)를 그대로 쓴다: 상자를 숨기고, 구슬이 맞으면 숨은 답 버튼을 대신 누른다.
     그래서 콤보·힌트·오답 노트·다시 만나기·직업 공부 도움이 그대로 이어진다. 숫자 직접 넣기(숫자 판)는 지금처럼 상자로.
   · 선생님 설정 '전투 방식'(studyCfg.battle: orb 기본 / box 예전 상자). */
const ORB = { on: false, m: null, fly: null, res: null, t0: 0 };
// 1단계: 길목 1(동쪽 들판길)에서만. 선생님 확인 뒤 null 로 바꾸면 모든 곳
const ORB_ONLY = new Set(["r1"]);
const ORBCOL = ["#6aa9ec", "#7ee07a", "#ffb84a"];
const orbAllowed = () => studyCfg.battle !== "box" && (!ORB_ONLY || ORB_ONLY.has(M.id));
// 문제 글에서 "계산해 보세요." 를 떼고 짧은 식인지
const qBody = (t) => String(t || "").replace(/^계산해 보세요\.\s*/, "");
const isShortQ = (t) => {
  const s = qBody(t);
  return s.length <= 14 && !s.includes("\n");
};

/* ── 문제 띠(화면 아래) ── */
const qs = document.createElement("div");
qs.className = "qstrip";
qs.id = "qstrip";
qs.hidden = true;
qs.innerHTML = '<div class="qsh"><b id="qst"></b><small id="qsm"></small><button type="button" class="qsx" id="qsx" aria-label="조준 풀기">✕</button></div><div class="qsq" id="qsq"></div><div class="qsa" id="qsa"></div><div class="qsr" id="qsr" hidden></div>';
$("stage").appendChild(qs);
const orbBtns = () => [...$("bc").children].filter((b) => !b.hidden);
function orbRender(title) {
  const Q = RQ.last || {},
    short = isShortQ(Q.q);
  $("qst").textContent = title;
  $("qsm").textContent = $("bth").textContent.replace("맞히면 그대로 · 틀리면 절반", "맞히면 약점 · 틀리면 절반");
  $("qsq").textContent = short ? "몬스터 머리 위 문제를 풀어요" : qBody(Q.q);
  $("qsq").classList.toggle("hint", short);
  $("qsq").classList.toggle("long", !short && qBody(Q.q).length > 40);
  $("qsr").hidden = true;
  $("qsa").innerHTML = orbBtns()
    .map((b, i) => '<button type="button" data-oi="' + i + '" style="--oc:' + ORBCOL[i] + '"' + (b.disabled ? " disabled" : "") + "><i>" + (i + 1) + "</i>" + esc(b.dataset.v) + "</button>")
    .join("");
  qs.hidden = false;
  document.body.classList.add("orbing");
}
qs.addEventListener("click", (e) => {
  if (e.target.closest("#qsx")) return orbCancel("조준을 풀었어요");
  const b = e.target.closest("button[data-oi]");
  if (b) orbThrow(+b.dataset.oi);
});
function orbThrow(i) {
  if (!ORB.on || ORB.fly || ORB.done) return;
  const b = orbBtns()[i];
  if (!b || b.disabled) return;
  ORB.fly = { t: 0, i, b, v: b.dataset.v };
  if (typeof sfx === "function") sfx("pick");
}
// 구슬이 닿음 → 숨은 답 버튼을 누른다(정답·오답 처리는 원래 문제 상자 그대로)
function orbHit() {
  const f = ORB.fly,
    m = ORB.m;
  ORB.fly = null;
  const ok = f.v === String((RQ.last || {}).a);
  f.b.click();
  // 마법사 '시간 늦추기': 그 버튼만 꺼지고 문제는 이어짐 → 띠를 다시 그린다
  if (!ok && $("bm").textContent.startsWith("시간 늦추기")) {
    orbRender($("qst").textContent);
    $("qsr").hidden = false;
    $("qsr").className = "qsr bad";
    $("qsr").textContent = $("bm").textContent;
    return;
  }
  ORB.done = true;
  ORB.res = { ok, t: 0, x: m.x, y: m.y };
  $("qsa").querySelectorAll("button").forEach((x, k) => {
    x.disabled = true;
    if (orbBtns()[k] && orbBtns()[k].dataset.v === String(RQ.last.a)) x.classList.add("ans");
  });
  $("qsr").hidden = false;
  $("qsr").textContent = $("bm").textContent;
  $("qsr").className = "qsr " + (ok ? "ok" : "bad");
  if (ok) fxPop(m.x, m.y - 40, "약점!", "#ffd86b");
  else fxPop(m.x, m.y - 40, "튕겼어요", "#cfc6ee");
}
// Esc 또는 멀리 떨어지면 조준 풀기(도망). 답을 안 냈으니 피해·콤보 변화 없음
function orbCancel(msg) {
  if (!ORB.on || ORB.fly || ORB.done) return;
  orbEnd();
  B = null;
  $("bt").hidden = true;
  $("bt").classList.remove("battle");
  $("bs").hidden = false;
  pl.inv = Math.max(pl.inv, 40);
  toast(msg);
}
function orbEnd() {
  ORB.on = false;
  ORB.m = null;
  ORB.fly = null;
  qs.hidden = true;
  document.body.classList.remove("orbing");
}
{
  const afO = askField;
  askField = function (MI, title, cb) {
    const use = orbAllowed() && B && B.m;
    if (!use) return afO(MI, title, cb);
    afO(MI, title, (ok) => {
      const was = ORB.on;
      orbEnd();
      // 원래 상자처럼 결과 처리(0.4초) 동안은 잠깐 멈춤
      if (was) busy = true;
      cb(ok);
    });
    // 숫자 직접 넣기는 지금처럼 상자(숫자 판)
    if (RQ.short) return;
    $("bt").hidden = true;
    busy = false;
    ORB.on = true;
    ORB.done = false;
    ORB.m = B.m;
    ORB.t0 = tk;
    orbRender(title);
  };
  // 조준 중에는 다른 공격·스킬·조사·부딪힘을 막는다
  const fs0 = fieldStrike;
  fieldStrike = function (m, sk) {
    if (ORB.on) return toast("1·2·3 으로 답 구슬을 던져요");
    fs0(m, sk);
  };
  const fk0 = fieldSkill;
  fieldSkill = function (i) {
    if (ORB.on) return toast("먼저 답 구슬을 던져요");
    fk0(i);
  };
  const fc1 = fieldContact;
  fieldContact = function (m) {
    if (ORB.on) {
      pl.inv = Math.max(pl.inv, 30);
      return;
    }
    fc1(m);
  };
  const ia0 = interact;
  interact = function (t) {
    if (ORB.on) return;
    ia0(t);
  };
  // 키보드 1·2·3 (상자가 숨어 있어 원래 처리기는 쓰지 않음)
  addEventListener(
    "keydown",
    (e) => {
      if (!ORB.on) return;
      if (e.code === "Escape") {
        orbCancel("조준을 풀었어요");
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const n = /^Digit([1-3])$/.exec(e.code) || /^Numpad([1-3])$/.exec(e.code);
      if (n) {
        orbThrow(+n[1] - 1);
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  // 조준된 몬스터는 아주 천천히 다가오고, 다른 몬스터는 절반 속도
  const up2 = update;
  update = function () {
    if (!ORB.on) return up2();
    if (ORB.m && Math.hypot(ORB.m.x - pl.x, ORB.m.y - pl.y) > 110) orbCancel("멀어져서 조준이 풀렸어요");
    if (!ORB.on) return up2();
    const snap = mons.map((m) => [m, m.x, m.y]);
    up2();
    snap.forEach(([m, x0, y0]) => {
      if (m === ORB.m) {
        m.x = x0;
        m.y = y0;
        const dx = pl.x - m.x,
          dy = pl.y - m.y,
          d = Math.hypot(dx, dy) || 1;
        if (d > 14 && !MON[m.type].boss) tryMove(m, (dx / d) * 0.15, (dy / d) * 0.15, false);
        m.dir = dx > 0 ? 1 : -1;
      } else {
        m.x = x0 + (m.x - x0) * 0.5;
        m.y = y0 + (m.y - y0) * 0.5;
      }
    });
  };
}
/* ── 그림: 내 둘레의 답 구슬, 날아가는 구슬, 말풍선, 약점 폭발 ── */
{
  const fx4 = drawFx;
  drawFx = function () {
    fx4();
    if (ORB.on && ORB.m) {
      const m = ORB.m,
        mx = m.x - cam.x,
        my = m.y - cam.y,
        top = my - (MON[m.type].boss ? 46 : 28);
      // 조준 표시
      x.globalAlpha = 0.5 + 0.3 * Math.sin(fr / 3);
      x.strokeStyle = "#ff6b7a";
      x.lineWidth = 1;
      x.beginPath();
      x.ellipse(mx, my - 1, 9, 3.5, 0, 0, 7);
      x.stroke();
      x.globalAlpha = 1;
      // 짧은 식은 머리 위 말풍선
      const Q = RQ.last || {};
      if (isShortQ(Q.q)) {
        const t = qBody(Q.q);
        x.font = "bold 9px sans-serif";
        const w = x.measureText(t).width + 10,
          bx = Math.round(mx - w / 2),
          by = Math.round(top - 16);
        P(x, bx - 1, by - 1, w + 2, 15, "#1e1b3f");
        P(x, bx, by, w, 13, "#fffaf0");
        P(x, Math.round(mx) - 2, by + 13, 4, 2, "#fffaf0");
        x.fillStyle = "#1e1b3f";
        x.textAlign = "center";
        x.fillText(t, mx, by + 10);
      }
      // 내 둘레를 도는 구슬(색 = 띠의 1·2·3)
      orbBtns().forEach((b, i) => {
        if (b.disabled || (ORB.fly && ORB.fly.i === i)) return;
        const an = fr / 8 + (i * Math.PI * 2) / 3,
          ox = pl.x - cam.x + Math.cos(an) * 11,
          oy = pl.y - cam.y - 10 + Math.sin(an) * 5;
        disc(x, Math.round(ox), Math.round(oy), 3, "#1e1b3f");
        disc(x, Math.round(ox), Math.round(oy), 2, ORBCOL[i]);
        P(x, Math.round(ox) - 1, Math.round(oy) - 2, 1, 1, "#ffffff");
      });
    }
    // 날아가는 구슬
    if (ORB.fly && ORB.m) {
      const f = ORB.fly,
        k = Math.min(1, ++f.t / 7),
        sx = pl.x - cam.x + (ORB.m.x - pl.x) * k,
        sy = pl.y - cam.y - 10 + (ORB.m.y - 10 - pl.y + 10) * k - Math.sin(k * Math.PI) * 10;
      disc(x, Math.round(sx), Math.round(sy), 4, "#1e1b3f");
      disc(x, Math.round(sx), Math.round(sy), 3, ORBCOL[f.i]);
      if (k >= 1) orbHit();
    }
    // 약점 폭발 / 튕김
    if (ORB.res) {
      const r = ORB.res,
        k = ++r.t,
        cx = r.x - cam.x,
        cy = r.y - cam.y - 10;
      if (r.ok)
        for (let i = 0; i < 14; i++) {
          const an = (i / 14) * Math.PI * 2;
          P(x, cx + Math.cos(an) * k * 1.6, cy + Math.sin(an) * k * 1.2, 2, 2, i % 2 ? "#ffd86b" : "#ffffff");
        }
      else for (let i = 0; i < 3; i++) P(x, cx - 6 - k * 1.5 + i * 3, cy - 4 - i * 2, 2, 2, "#cfc6ee");
      if (k > 14) ORB.res = null;
    }
  };
}
