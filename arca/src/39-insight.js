/* ════════ 수학이 놀이가 되게 ② 일반 전투의 「간파」 (프롬프트 S-2, 2026-11-16) ════════
   별빛 게이지가 가득(◆◆◆)일 때, 가까운 일반 몬스터에게 「간파」(PC: F 키, 휴대폰: 스킬 줄 앞 「간파」 단추).
   그 부 단원의 짧은 미니 조작 한 판(22-mini, 쉬운 수)이 열리고, 힌트 한 번 안에 맞히면 그 몬스터 체력의 70% 피해 + 3초 멈춤.
   더 걸리면(실패) 게이지만 1칸 돌려받고 벌 없음. 단원에 맞는 미니 조작이 없으면 단추가 없다.
   한 길목에서 하루 3번까지(미니 조작만 되풀이해 문제 풀이를 건너뛰지 않게). 학습 기록·열쇠 조각은 22-mini 가 남긴다.
   끄기: INS.off = true */
const INS = { off: false, max: 3 };
const insKind = () => (typeof miniKind === "function" && typeof miniUnit === "function" ? miniKind(miniUnit()) : null);
const insLeft = () => {
  const st = (save.st = save.st || {}),
    day = Math.floor(Date.now() / 864e5);
  st.ins = st.ins && st.ins.day === day ? st.ins : { day, n: {} };
  return INS.max - (st.ins.n[M.id] || 0);
};
const insTarget = () => {
  let best = null,
    bd = 48;
  mons.forEach((m) => {
    if (m.dead || !MON[m.type] || MON[m.type].boss || m.minion) return;
    const d = Math.hypot(m.x - pl.x, m.y - pl.y);
    if (d < bd) (bd = d), (best = m);
  });
  return best;
};
function insCan() {
  return !INS.off && save.job && mode === "map" && M && (M.kind === "route" || M.kind === "dead") && insKind() && FLD.g >= 3;
}
function insUse() {
  if (busy || !insCan()) return;
  if (insLeft() <= 0) return toast("오늘 이 길목에서는 충분히 간파했어요. 문제를 맞혀 싸워요!");
  const m = insTarget();
  if (!m) return toast("간파할 몬스터가 가까이 없어요");
  const kind = insKind();
  FLD.g = 0;
  hud();
  const st = save.st;
  st.ins.n[M.id] = (st.ins.n[M.id] || 0) + 1;
  store();
  m.stun = Math.max(m.stun || 0, 9999); // 조작하는 동안 멈춤
  miniOpen(kind, {
    title: "간파 · " + MON[m.type].n,
    done: (firstTry) => {
      const ok = firstTry || (MINI.miss || 0) <= 1;
      m.stun = 0;
      if (m.dead) return;
      if (ok) {
        const MI = mstat(m),
          dmg = Math.max(1, Math.round(MI.hp * 0.7));
        if (m.hpNow == null) m.hpNow = MI.hp;
        m.hpNow -= dmg;
        m.hit = 10;
        m.stun = 60;
        if (typeof fxPop === "function") fxPop(m.x, m.y - 40, "간파! -" + dmg, "#ffd86b");
        if (typeof fxSkill === "function") fxSkill("ult", "간파");
        if (m.hpNow <= 0) {
          m.hpNow = null;
          B = { m, MI, hp: 0, g: FLD.g, core: m.core, field: 1 };
          win();
        }
      } else {
        FLD.g = Math.min(3, FLD.g + 1);
        if (typeof fxPop === "function") fxPop(pl.x, pl.y - 30, "간파 실패 · 게이지 1칸 돌려받음", "#c9c5d8");
      }
      hud();
    },
  });
  // 보스판보다 쉬운 수
  MINI.easy = true;
  if (typeof miniNew === "function") miniNew();
}
document.addEventListener("keydown", (e) => {
  if (e.code !== "KeyF" || !$("panel").hidden) return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  insUse();
});
// 휴대폰: 스킬 줄 앞에 「간파」 단추(게이지가 가득이고 단원 조작이 있을 때만)
{
  const b = document.createElement("button");
  b.type = "button";
  b.id = "insb";
  b.className = "insb";
  b.textContent = "간파";
  b.hidden = true;
  $("stage").appendChild(b);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    insUse();
  });
  setInterval(() => {
    b.hidden = !(typeof MOBILE !== "undefined" && MOBILE) || !insCan() || !insTarget();
  }, 300);
  // PC: 게이지가 가득일 때 처음 한 번 안내
  setInterval(() => {
    const st = save.st || {};
    if (!st.insTip && insCan() && insTarget() && !busy) {
      st.insTip = 1;
      store();
      toast("✦ 별빛 게이지 가득! F(휴대폰: 간파 단추)로 몬스터의 약점을 간파해 보세요");
    }
  }, 1000);
  const st = document.createElement("style");
  st.textContent =
    ".insb{position:absolute;right:calc(2.5% + 52px);bottom:calc(20% + 118px);z-index:7;height:40px;padding:0 12px;border-radius:12px;border:1px solid #ffd86b;background:rgba(122,78,31,.92);color:#fff6d6;font:inherit;font-weight:700}" +
    "body.qhide .insb,.stage:has(#mini:not([hidden])) .insb,.stage:has(#panel:not([hidden])) .insb{display:none}";
  document.head.appendChild(st);
}
