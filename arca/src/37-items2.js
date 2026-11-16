/* ════════ RPG 깊이 ③ 소모품과 금화 쓸 곳 (프롬프트 R-4, 2026-11-16) ════════
   소모품 4종(종류마다 최대 5개, save.st.use = {heal, star, hint, ward}):
     별빛 사과(heal) 하트 3 회복 · 반짝 물약(star) 별빛 게이지 가득 · 힌트 두루마리(hint) 틀린 보기 하나 지우기 · 수호 부적(ward) 다음 덤비기 한 번 막기
   얻는 곳: 마을 상점(패널 상점 「물건」, 값은 부에 따라), 보물 상자 40%·열쇠 상자 30%, 무사 기록 선물(35-grow).
   쓰는 법: PC 숫자키 5·6·7·8, 휴대폰은 오른쪽 가방 단추(🎒) → 네 칸. 문제를 푸는 동안에는 힌트 두루마리만 쓸 수 있다.
   그림은 캔버스로 직접(새로 받지 않음). */
const USE = {
  heal: { n: "별빛 사과", i: "🍎", d: "하트 3 회복", key: "Digit5", p: (pt) => 10 + pt * 3 },
  star: { n: "반짝 물약", i: "🧪", d: "별빛 게이지 가득", key: "Digit6", p: (pt) => 12 + pt * 3 },
  hint: { n: "힌트 두루마리", i: "📜", d: "지금(또는 다음) 문제의 틀린 보기 하나 지우기", key: "Digit7", p: (pt) => 8 + pt * 2 },
  ward: { n: "수호 부적", i: "🧿", d: "다음 덤비기 한 번 막기", key: "Digit8", p: (pt) => 12 + pt * 3 },
};
const USE_MAX = 5;
const useSt = () => {
  const st = (save.st = save.st || {});
  st.use = st.use || { heal: 0, star: 0, hint: 0, ward: 0 };
  return st.use;
};
const USEX = { ward: 0, hintNext: 0 };
function useAdd(k, n, why) {
  const u = useSt(),
    before = u[k];
  u[k] = Math.min(USE_MAX, u[k] + (n || 1));
  store();
  const got = u[k] - before;
  if (got > 0) toastLater(() => USE[k].i + " " + USE[k].n + " +" + got + (why ? " (" + why + ")" : ""), 600);
  ubagDraw();
  return got;
}
const answering = () => (typeof ORB === "object" && ORB.on) || !$("bt").hidden || !!($("kp") && !$("kp").hidden);
// 지금 문제의 틀린 보기 하나 지우기
function useHintNow() {
  const Q = (typeof ORB === "object" && ORB.on && ORB.Q) || RQ.last;
  if (!Q) return false;
  const wrong = [...$("bc").children].filter((b) => !b.hidden && !b.disabled && b.dataset.v !== String(Q.a));
  if (wrong.length < 1 || [...$("bc").children].filter((b) => !b.hidden && !b.disabled).length <= 2) return false;
  const b = wrong[Math.floor(Math.random() * wrong.length)];
  b.disabled = true;
  b.hidden = true;
  if (typeof ORB === "object" && ORB.on && typeof orbRender === "function") orbRender($("qst").textContent);
  return true;
}
function useItem(k) {
  const u = useSt();
  if (!USE[k]) return;
  if (!u[k]) return toast(jo(USE[k].n, "이", "가") + " 없어요. 마을 상점에서 살 수 있어요");
  if (mode !== "map") return;
  const q = answering();
  if (q && k !== "hint") return toast("문제를 푸는 동안에는 힌트 두루마리만 쓸 수 있어요");
  if (!q && busy) return;
  let msg = "";
  if (k === "heal") {
    if (pl.hp >= maxHp()) return toast("하트가 가득해요");
    pl.hp = Math.min(maxHp(), pl.hp + 3);
    save.hp = pl.hp;
    msg = "하트 3 회복";
  } else if (k === "star") {
    if (FLD.g >= 3) return toast("별빛 게이지가 가득해요");
    FLD.g = 3;
    msg = "별빛 게이지 가득!";
  } else if (k === "hint") {
    if (q) {
      if (!useHintNow()) return toast("더 지울 보기가 없어요");
      msg = "틀린 보기 하나를 지웠어요";
    } else {
      if (typeof FUN === "object") FUN.hint = (FUN.hint || 0) + 1;
      msg = "다음 문제의 틀린 보기 하나가 지워져요";
    }
  } else if (k === "ward") {
    if (USEX.ward) return toast("이미 수호 부적이 지켜 주고 있어요");
    USEX.ward = 1;
    msg = "다음 덤비기 한 번을 막아요";
  }
  u[k]--;
  store();
  hud();
  if (typeof sfx === "function") sfx("pick");
  if (typeof fxPop === "function") fxPop(pl.x, pl.y - 30, USE[k].i + " " + msg, "#9fe0ff");
  ubagDraw();
}
// 수호 부적: 덤비기에 맞을 때 한 번 막기(31-attack 의 matkHit)
if (typeof matkHit === "function") {
  const mh0 = matkHit;
  matkHit = function (m) {
    if (USEX.ward) {
      USEX.ward = 0;
      if (m && m.atk) m.atk.hit = 1;
      pl.inv = 60;
      if (typeof fxPop === "function") fxPop(pl.x, pl.y - 26, "🧿 부적이 막았어요!", "#9fe0ff");
      if (typeof sfx === "function") sfx("block");
      return;
    }
    return mh0.apply(this, arguments);
  };
}
// 키보드 5~8
document.addEventListener("keydown", (e) => {
  const k = Object.keys(USE).find((q) => USE[q].key === e.code);
  if (!k || !$("panel").hidden) return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  e.preventDefault();
  useItem(k);
});
// 휴대폰: 가방 단추
const ubag = document.createElement("div");
ubag.className = "ubag";
ubag.id = "ubag";
ubag.innerHTML = '<button type="button" class="ubagb" aria-label="가방">🎒</button><div class="ubagl" hidden></div>';
ubag.hidden = true;
$("stage").appendChild(ubag);
function ubagDraw() {
  const u = useSt(),
    L = ubag.querySelector(".ubagl");
  L.innerHTML = Object.keys(USE)
    .map((k) => '<button type="button" data-use="' + k + '"' + (u[k] ? "" : " disabled") + ' title="' + USE[k].n + " · " + USE[k].d + '"><i>' + USE[k].i + "</i><b>" + u[k] + "</b></button>")
    .join("");
  ubag.hidden = !save.job || mode !== "map" || typeof MOBILE === "undefined" || !MOBILE;
}
ubag.addEventListener("click", (e) => {
  if (e.target.closest(".ubagb")) {
    const L = ubag.querySelector(".ubagl");
    L.hidden = !L.hidden;
    ubagDraw();
    return;
  }
  const b = e.target.closest("[data-use]");
  if (b) useItem(b.dataset.use);
});
setInterval(ubagDraw, 1500);

/* ── 얻는 곳: 상점 · 보물 상자 · 열쇠 상자 ── */
const usePart = () => (typeof mapPart === "function" ? mapPart() : 1) || 1;
{
  const sh0 = PANEL.shop;
  PANEL.shop = function () {
    const u = useSt(),
      pt = usePart();
    return (
      sh0.apply(this, arguments) +
      '<h4>물건 (종류마다 ' + USE_MAX + "개까지)</h4>" +
      Object.keys(USE)
        .map((k) => {
          const pr = USE[k].p(pt),
            full = u[k] >= USE_MAX;
          return (
            '<div class="it"><span><small>' + USE[k].i + " 가진 것 " + u[k] + " · " + (USE[k].key.slice(5)) + "번 키</small><b>" + USE[k].n + "</b><small>" + USE[k].d + "</small></span>" +
            (full ? "<em>가득</em>" : '<button type="button" data-ubuy="' + k + '"' + (save.gold < pr ? ' aria-disabled="true"' : "") + ">금화 " + pr + "</button>") +
            "</div>"
          );
        })
        .join("")
    );
  };
  $("panel").addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("button[data-ubuy]");
      if (!b) return;
      e.stopPropagation();
      const k = b.dataset.ubuy,
        pr = USE[k].p(usePart());
      if (useSt()[k] >= USE_MAX) return toast("가득 찼어요");
      if (save.gold < pr) return toast("금화가 " + (pr - save.gold) + " 모자라요");
      save.gold -= pr;
      useSt()[k]++;
      store();
      hud();
      if (typeof sfx === "function") sfx("pick");
      toast(jo(USE[k].n, "을", "를") + " 샀어요");
      renderPanel();
    },
    true,
  );
  // 보물 상자
  const it0 = interact;
  interact = function (t) {
    const ch = t && t.type === "chest" && M.chest && !save.chest[M.chest.id];
    const r = it0.apply(this, arguments);
    if (ch && save.chest[M.chest.id] && Math.random() < 0.4) useAdd(qPickUse(), 1, "보물 상자");
    return r;
  };
  if (typeof kboxOpen === "function") {
    const kb0 = kboxOpen;
    kboxOpen = function () {
      const r = kb0.apply(this, arguments);
      if (Math.random() < 0.3) useAdd(qPickUse(), 1, "열쇠 상자");
      return r;
    };
  }
}
const qPickUse = () => Object.keys(USE)[Math.floor(Math.random() * 4)];
// 패널 「가방」에 소모품
{
  const bg0 = PANEL.bag;
  if (bg0)
    PANEL.bag = function () {
      const u = useSt();
      return (
        '<h4>물건</h4><div class="usegrid">' +
        Object.keys(USE)
          .map((k) => '<div class="it"><span><small>' + USE[k].i + " " + USE[k].key.slice(5) + "번 키</small><b>" + USE[k].n + " × " + u[k] + "</b><small>" + USE[k].d + "</small></span></div>")
          .join("") +
        "</div>" +
        bg0.apply(this, arguments)
      );
    };
}
{
  const st = document.createElement("style");
  st.textContent =
    ".ubag{position:absolute;right:2.5%;bottom:calc(20% + 118px);z-index:7;display:flex;flex-direction:column;align-items:flex-end;gap:4px}" +
    ".ubagb{width:40px;height:40px;border-radius:50%;border:1px solid #f5e3a3;background:rgba(61,52,112,.85);font-size:18px}" +
    ".ubagl{display:flex;gap:4px}.ubagl[hidden]{display:none}.ubagl button{width:44px;height:44px;border-radius:10px;border:1px solid #6f64b0;background:rgba(20,17,42,.85);color:#f5e3a3;position:relative;font-size:16px}" +
    ".ubagl button b{position:absolute;right:3px;bottom:1px;font-size:10px}.ubagl button:disabled{opacity:.35}" +
    ".stage:has(#panel:not([hidden])) .ubag,.stage:has(#mini:not([hidden])) .ubag{display:none}";
  document.head.appendChild(st);
}
