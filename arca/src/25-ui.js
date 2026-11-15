/* ════════ 화면 다듬기 (프롬프트 K, 2026-11-15, docs/점검_고칠점.md 3-1) ════════
   · 패널 탭 12개 → 5묶음(나·가방·상점·공부·모험) + 묶음 안 작은 탭. 가구·단축키로 여는 길(openPanel("eq") 등)은 그대로.
   · 왼쪽 위 알약 줄이기: 열쇠 조각은 가루·금화 줄에, 단원 이름은 퀘스트 머리에. 접으면 두 줄(상태·퀘스트 머리)만.
   · (모양 규칙은 style.css: 낮은 가로 화면의 숫자 판 두 칸, 상단 글 줄바꿈 금지) */
const PGROUP = [
  ["나", ["me", "skill", "pet"]],
  ["가방", ["eq", "bag", "deco"]],
  ["상점", ["shop"]],
  ["공부", ["note", "wrong", "book", "dex"]],
  ["모험", ["log", "world"]],
];
{
  const rp0 = renderPanel;
  renderPanel = function () {
    rp0();
    const name = Object.fromEntries(TABS),
      have = (id) => id in name && typeof PANEL[id] === "function";
    // 묶음에 없는 탭은 '모험'에 붙인다(나중에 탭이 늘어도 빠지지 않게)
    const used = new Set(PGROUP.flatMap((g) => g[1]));
    const groups = PGROUP.map(([n, ids]) => [n, ids.filter(have)]).filter((g) => g[1].length);
    TABS.forEach(([id]) => !used.has(id) && have(id) && groups[groups.length - 1][1].push(id));
    const cur = groups.find((g) => g[1].includes(tab)) || groups[0];
    $("tabs").innerHTML =
      '<div class="tgrp">' +
      groups.map((g) => '<button type="button" data-tab="' + (g === cur ? tab : g[1][0]) + '" aria-pressed="' + (g === cur) + '">' + g[0] + "</button>").join("") +
      "</div>" +
      (cur[1].length > 1 ? '<div class="tsub">' + cur[1].map((id) => '<button type="button" data-tab="' + id + '" aria-pressed="' + (id === tab) + '">' + name[id] + "</button>").join("") + "</div>" : "");
  };
}
{
  const hudU = hud;
  hud = function () {
    hudU();
    // 열쇠 조각을 가루·금화 줄에
    const k = $("hkey");
    if (k) {
      k.hidden = true;
      const st = save.st || {};
      $("h3").textContent += " · 🔑 " + (st.key || 0) + "/10" + (st.kbox ? " (상자 " + st.kbox + ")" : "");
    }
    // 단원 이름을 퀘스트 머리에
    const u = $("qunit"),
      nm = typeof unitName === "function" ? unitName(mapPart()) : null;
    if (u) u.hidden = true;
    $("qhead").textContent = "퀘스트 " + (UI.qFold ? "▸" : "▾") + (nm ? " · " + mapPart() + "부 " + nm : "");
    $("qlist").parentNode.hidden = false;
  };
  $("qhead").addEventListener("click", () => setTimeout(hud, 0));
  hud();
}
