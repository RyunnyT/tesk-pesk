/* ════════ 마을 사람들의 움직임 · 12부 모두의 벽 (프롬프트 O, 2026-11-16) ════════
   마을마다 그 마을다운 일을 하는 사람(2~12부, 1~2명)을 더한다. 그림은 있는 인물 그림을 빌려 쓰고(HD_ALIAS),
   하는 일은 캔버스로 덧그린다: 낚시(줄·찌), 망치질(불꽃), 책 읽기(책), 춤(통통), 짐 나르기(볏단), 줍기(쪼그려 줍기),
   그림 그리기(이젤·붓), 날기(부엉이가 책장 사이), 서성이기(「?」). 말을 걸면 한마디(되살리기 전/후가 다름).
   12부 별빛 언덕에는 「모두의 벽」: 지나온 마을 사람들이 줄지어 모여 한마디씩. 퀘스트 표시는 없다(id 가 amb_로 시작). */
const LIFE = {
  t2: [
    { b: "oscar", act: "fish", at: [10, 25], face: "d", say: ["찌가 안 움직여… 안개 때문에 물고기도 숨었나 봐.", "오늘은 대풍이야! 바다가 다시 살아났어."] },
    { b: "evan", act: "carry", at: [21, 17], say: ["배가 안 들어와서 짐이 그대로야.", "짐이 산더미! 배들이 돌아왔거든."] },
  ],
  t3: [{ b: "ruru", act: "pick", at: [7, 12], say: ["버섯이 다 회색이야…", "봐! 버섯이 다시 알록달록해!"] }],
  t4: [{ b: "barg", act: "hammer", at: [3, 10], face: "s", say: ["톱니가 자꾸 녹슬어서 망치질만 하루 종일이야.", "땅땅! 새 톱니가 아주 잘 맞물려."] }],
  t5: [
    { b: "luke", act: "read", at: [17, 12], say: ["책 글씨가 자꾸 흐려져…", "다시 읽히는 책은 더 재미있어!"] },
    { b: "rito", act: "read", at: [26, 12], say: ["아카데미 숙제가 산더미야.", "숙제를 다 했어! 계산이 술술 풀려."] },
  ],
  t6: [
    { b: "serena", act: "dance", at: [17, 19], say: ["축제 춤을 연습하는데 음악이 안 들려.", "하나 둘, 하나 둘! 같이 춰요!"] },
    { b: "layla", act: "dance", at: [26, 19], say: ["발이 자꾸 엉켜…", "축제가 열리면 제일 앞에서 출 거야!"] },
  ],
  t7: [{ b: "fin", act: "pick", at: [12, 22], say: ["조개를 줍는데 다 비어 있어.", "반짝 조개 찾았다! 하나 줄까?"] }],
  t8: [{ b: "evan", act: "carry", at: [13, 20], say: ["볏단이 다 바랬어. 추수제를 할 수 있을까?", "황금 볏단! 올해 추수제는 성대하겠어."] }],
  t9: [{ b: "icowl", act: "fly", at: [13, 10], to: [30, 10], say: ["부엉— 책장이 자꾸 떠내려가네.", "부엉! 책장이 제자리를 찾았어."] }],
  t10: [{ b: "luke", act: "paint", at: [17, 26], say: ["색이 다 지워져서 그릴 수가 없어.", "봐, 하늘색! 네가 색을 돌려줬어."] }],
  t11: [{ b: "oscar", act: "wander", at: [12, 24], say: ["나는… 누구였더라? 이름이 생각나지 않아.", "기억났다! 나는 이 탑의 문지기야. 고마워."] }],
};
// 12부 모두의 벽: 지나온 마을 사람들
const WALL12 = [
  ["dora", "첫 의뢰를 맡겼던 날이 엊그제 같아!"],
  ["marinda", "갈매기호 선원들도 다 왔다네."],
  ["halmi", "약초 향기처럼 오래 기억하마."],
  ["kron", "톱니는 함께여야 돌지. 고맙네."],
  ["gris", "틀린 곳을 찾는 눈, 잊지 마세요."],
  ["arien", "왕궁의 모두가 너를 응원해."],
  ["harold", "보리내의 들판이 다 너 덕분이야."],
  ["momone", "별빛 계단에서 기다릴게요."],
  ["reno", "우리 노래 마지막 소절, 기억하지?"],
  ["mor", "귤 하나, 받아 가게."],
];
const ambId = (town, i) => "amb_" + town + "_" + i;
function ambFree(m, a, y) {
  for (let r = 0; r < 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const p = a + dx, q = y + dy;
        if (p > 0 && q > 0 && p < m.w - 1 && q < m.h - 1 && !m.O[q][p] && !["~", "-", "#", "W"].includes(m.G[q][p])) return [p, q];
      }
  return [a, y];
}
function ambMake(id, base, a, y, extra) {
  if (typeof HD_ALIAS === "object") HD_ALIAS[id] = base;
  return { ...D[base], id, x: a * T + 8, y: y * T + 14, hx: a * T + 8, hy: y * T + 14, tx: a * T + 8, ty: y * T + 14, lines: [], wait: 0, dir: 1, face: "d", f: 0, mv: false, talk: 0, still: 1, ...extra };
}
function ambSpawn() {
  if (!M || M.kind !== "town") return;
  const L = LIFE[M.id] || [];
  L.forEach((d, i) => {
    if (!D[d.b]) return;
    const [a, y] = ambFree(M, d.at[0], d.at[1]);
    const n = ambMake(ambId(M.id, i), d.b, a, y, { amb: d, face: d.face || "d", by: y * T + 14 });
    if (d.act === "fly") Object.assign(n, { owl: 1, fx0: a * T + 8, fx1: d.to[0] * T + 8 });
    npcs.push(n);
  });
  if (M.id === "t12") {
    // 모두의 벽: 아래쪽 줄에 나란히
    const y0 = M.h - 3;
    let k = 0;
    WALL12.forEach(([b, line], i) => {
      if (!D[b] || npcs.some((n) => n.id === b)) return;
      const [a, y] = ambFree(M, 6 + k * 3, y0);
      k++;
      npcs.push(ambMake(ambId("wall", i), b, a, y, { amb: { act: "wall", say: [line, line] }, face: "d", by: y * T + 14 }));
    });
  }
}
{
  const lm0 = loadMap;
  loadMap = function () {
    const r = lm0.apply(this, arguments);
    ambSpawn();
    return r;
  };
  const tk0 = talk;
  talk = function (n) {
    if (n && n.amb) {
      const done = typeof partDone === "function" && M.part != null ? partDone(M.part) : (save.done[M.id] || []).filter(Boolean).length >= 8;
      const line = n.amb.say[done ? 1 : 0];
      return openDlg(n, [n.amb.act === "wall" ? line + " (모두의 벽)" : line]);
    }
    return tk0(n);
  };
  const up0 = update;
  update = function () {
    up0();
    if (busy || !M || M.kind !== "town") return;
    for (const n of npcs) {
      const d = n.amb;
      if (!d || n.talk) continue;
      if (d.act === "dance") {
        n.y = n.by - Math.abs(Math.sin(tk / 5)) * 4;
        n.dir = Math.sin(tk / 20) > 0 ? 1 : -1;
        n.mv = true;
        if (tk % 4 === 0) n.f++;
      } else if (d.act === "carry") {
        // 짐을 들고 짧게 왔다 갔다
        const k = Math.sin(tk / 60);
        n.x = n.hx + k * 28;
        n.dir = Math.cos(tk / 60) > 0 ? 1 : -1;
        n.face = "s";
        n.mv = true;
        if (tk % 5 === 0) n.f++;
      } else if (d.act === "wander") {
        n.x = n.hx + Math.sin(tk / 90) * 20;
        n.dir = Math.cos(tk / 90) > 0 ? 1 : -1;
        n.face = "s";
        n.mv = Math.abs(Math.cos(tk / 90)) > 0.2;
        if (tk % 6 === 0) n.f++;
      } else if (d.act === "fly") {
        const k = (Math.sin(tk / 80) + 1) / 2;
        n.x = n.fx0 + (n.fx1 - n.fx0) * k;
        n.y = n.by - 10 - Math.abs(Math.sin(tk / 12)) * 6;
      } else if (d.act === "pick" || d.act === "hammer") {
        n.y = n.by + (Math.sin(tk / (d.act === "hammer" ? 4 : 10)) > 0.6 ? 1 : 0);
      }
    }
  };
  const fx0 = drawFx;
  drawFx = function () {
    fx0.apply(this, arguments);
    if (!M || M.kind !== "town") return;
    try {
      for (const n of npcs) {
        const d = n.amb;
        if (!d) continue;
        const X = Math.round(n.x - cam.x), Y = Math.round(n.y - cam.y);
        if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
        if (d.act === "fish") {
          // 낚싯대(사람 → 물), 찌가 까딱
          const ex = X + 2, ey = Y + 26 + Math.round(Math.sin(tk / 8) * 1.5);
          x.strokeStyle = "#5a3a1a";
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(X + 4, Y - 10);
          x.lineTo(X + 10, Y - 20);
          x.stroke();
          x.strokeStyle = "rgba(255,255,255,.8)";
          x.beginPath();
          x.moveTo(X + 10, Y - 20);
          x.lineTo(ex, ey);
          x.stroke();
          P(x, ex - 1, ey - 1, 3, 3, tk % 120 < 10 ? "#ffd86b" : "#e05a4a");
          if (tk % 120 < 10) P(x, ex - 4, ey + 2, 9, 1, "rgba(255,255,255,.7)");
        } else if (d.act === "hammer") {
          const up = Math.sin(tk / 4) > 0.6;
          P(x, X + 6, Y - (up ? 16 : 10), 2, 7, "#6b4a2a");
          P(x, X + 4, Y - (up ? 18 : 12), 6, 3, "#5a5a64");
          if (!up && tk % 8 < 2) for (let i = 0; i < 3; i++) P(x, X + 9 + i * 2, Y - 8 - i, 1, 1, "#ffd86b");
        } else if (d.act === "read") {
          P(x, X - 5, Y - 12, 10, 6, "#f4ead6");
          P(x, X - 1, Y - 12, 1, 6, "#c0563f");
          if (tk % 160 < 8) P(x, X + 1, Y - 13, 4, 1, "#ffffff");
        } else if (d.act === "carry") {
          P(x, X - 6, Y - 34, 12, 6, "#e8c56a");
          P(x, X - 6, Y - 31, 12, 1, "#a8892a");
        } else if (d.act === "pick") {
          if (tk % 90 < 20) {
            const yy = Y - 8 - (tk % 90) / 2;
            P(x, X + 5, yy, 3, 3, M.id === "t7" ? "#f4d0e0" : "#e05a4a");
          }
        } else if (d.act === "paint") {
          P(x, X + 9, Y - 20, 10, 9, "#d9a83a");
          P(x, X + 10, Y - 19, 8, 7, "#f4f0e8");
          const cols = ["#6ab4e0", "#7ee07a", "#ffb84a", "#f08ad0"];
          P(x, X + 11 + (tk >> 4) % 5, Y - 17 + (tk >> 6) % 4, 2, 2, cols[(tk >> 5) % 4]);
          P(x, X + 10, Y - 11, 1, 6, "#6b4a2a");
          P(x, X + 17, Y - 11, 1, 6, "#6b4a2a");
        } else if (d.act === "wander") {
          if (tk % 200 < 70 && typeof glyph === "function") glyph("?", "#c9c5d8", X, Y - 30);
        }
      }
    } catch (e) {}
  };
}
