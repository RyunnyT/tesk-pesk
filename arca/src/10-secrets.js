/* 숨은 것들 (이스터에그) — 어디에 무엇이 있는지는 docs/비밀_목록.md (선생님용)
   1 별고양이 12마리  2 조사하면 반응하는 사물  3 행동 이스터에그  4 숫자 이스터에그  5 도서관 비밀 서고  6 떠돌이 상인
   · 맵 위의 숨은 것은 SEC[맵 id] 목록. near() 를 감싸서 가까이 가면 「조사」할 수 있게 하고, interact 의 "secret" 으로 act() 를 부른다.
   · 길 안내 화살표·미니맵에는 나오지 않는다. 발견 기록은 save.cats · save.st 에 남는다. */
const SEC = {};
function secAdd(map, o) {
  (SEC[map] = SEC[map] || []).push(o);
}
function walkOK(m, a, y) {
  return a >= 0 && y >= 0 && a < m.w && y < m.h && !m.O[y][a] && !BLOCKG.has(m.G[y][a]);
}
/* 출구에서 걸어서 갈 수 있는 칸 (BFS) */
function reachSet(m) {
  const seen = new Set(),
    q = [];
  (m.exits || []).forEach((e) => {
    for (let y = e.y0; y <= e.y1; y++)
      for (let a = e.x0; a <= e.x1; a++)
        if (walkOK(m, a, y)) {
          seen.add(a + "," + y);
          q.push([a, y]);
        }
  });
  if (m.spawn && walkOK(m, m.spawn[0], m.spawn[1])) q.push(m.spawn);
  while (q.length) {
    const [a, y] = q.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const k = a + dx + "," + (y + dy);
      if (!seen.has(k) && walkOK(m, a + dx, y + dy)) {
        seen.add(k);
        q.push([a + dx, y + dy]);
      }
    });
  }
  return seen;
}
/* 나무에 둘러싸인, 출구에서 먼 구석 */
function hidePos(m, seed) {
  const R = reachSet(m),
    ex = (m.exits || []).map((e) => [e.x0, e.y0]);
  let best = null,
    bs = -1;
  R.forEach((k) => {
    const [a, y] = k.split(",").map(Number);
    if (m.G[y][a] === ":" || m.G[y][a] === "b") return;
    let trees = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if ((m.O[y + dy] || [])[a + dx] === "T") trees++;
    if (trees < 3) return;
    const d = Math.min(...ex.map(([x0, y0]) => Math.abs(x0 - a) + Math.abs(y0 - y)), 99);
    const sc = trees * 20 + d + (hsh(a + seed, y * 3) % 9);
    if (sc > bs) {
      bs = sc;
      best = [a, y];
    }
  });
  if (!best) {
    // 나무가 없으면 출구에서 가장 먼 칸
    R.forEach((k) => {
      const [a, y] = k.split(",").map(Number),
        d = Math.min(...ex.map(([x0, y0]) => Math.abs(x0 - a) + Math.abs(y0 - y)), 99);
      if (d > bs) {
        bs = d;
        best = [a, y];
      }
    });
  }
  return best;
}
/* 탁 트인 빈 칸 (마을 사물 놓을 자리) */
function openPos(m, cx, cy, used) {
  const R = reachSet(m);
  for (let r = 0; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const a = cx + dx,
          y = cy + dy;
        if (!R.has(a + "," + y) || m.G[y][a] === ":" || used.has(a + "," + y)) continue;
        let ok = true;
        for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (!walkOK(m, a + i, y + j)) ok = false;
        if (!ok) continue;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) used.add(a + i + "," + (y + j));
        return [a, y];
      }
  return null;
}
const say = (who, lines, cb) => openDlg(typeof who === "string" ? storyWho(who) : who, lines.map(storyText), cb);

/* ════════ 1. 별고양이 12마리 ════════ */
const CAT_MAPS = ["d1", "d2", "d3", "d4", "d5", "r14", "d6", "d7", "d8", "r25", "r26", "r27"];
const catCount = () => Object.keys(save.cats || {}).length;
function drawCat(sx, sy, f, col) {
  const c = col || "#f5e3a3",
    blink = f % 40 < 2;
  P(x, sx + 3, sy + 15, 10, 1, "rgba(0,0,0,0.2)");
  P(x, sx + 4, sy + 9, 8, 6, c);
  P(x, sx + 5, sy + 4, 7, 6, c);
  P(x, sx + 5, sy + 2, 2, 2, c);
  P(x, sx + 10, sy + 2, 2, 2, c);
  P(x, sx + 12, sy + 10 + (f % 16 < 8 ? 0 : 1), 3, 2, c);
  P(x, sx + 7, sy + 6, 1, blink ? 0 : 1, "#2b2b2b");
  P(x, sx + 10, sy + 6, 1, blink ? 0 : 1, "#2b2b2b");
  P(x, sx + 8, sy + 3, 1, 1, "#ffd86b");
  P(x, sx + 8, sy + 8, 1, 1, "#e58fb0");
}
CAT_MAPS.forEach((id, k) => {
  const m = MAPS[id];
  if (!m) return;
  const p = hidePos(m, k * 7 + 3);
  if (!p) return;
  const cid = "cat" + (k + 1);
  secAdd(id, {
    tx: p[0],
    ty: p[1],
    n: "반짝이는 무언가 살펴보기",
    cat: 1,
    show: () => !(save.cats && save.cats[cid]),
    draw(sx, sy, d) {
      if (d < 64) drawCat(sx, sy, fr);
      else if (fr % 60 < 4) P(x, sx + 8, sy + 4, 1, 1, "#fff6d0");
    },
    act() {
      save.cats = save.cats || {};
      save.cats[cid] = 1;
      store();
      sfx("shard");
      for (let i = 0; i < 18; i++) sp.push({ a: p[0] * T + Math.random() * 16, y: p[1] * T + Math.random() * 12, t: 10 + Math.random() * 10 });
      const n = catCount();
      say({ n: "별고양이" }, [
        "냐옹! (별 무늬가 있는 작은 고양이예요.)",
        n < 12 ? "별고양이가 꼬리를 흔들더니 마이룸 쪽으로 사라졌어요. (" + n + " / 12)" : "열두 번째 별고양이예요! 모두 마이룸에 모였어요.",
      ], () => {
        if (n >= 12) {
          fxRestore();
          toast("별고양이 12마리를 모두 찾았어요! " + (save.pet ? save.pet.name + "에게 별무늬가 생겼어요" : "마이룸에 가 봐요"));
        } else toast("별고양이 " + n + " / 12");
      });
    },
  });
});
// 펫 별무늬 (12마리 모두)
{
  const pd0 = petDraw;
  petDraw = function (r, sp2, f, mv) {
    pd0(r, sp2, f, mv);
    if (catCount() >= 12) {
      r(6, 13, 1, 1, "#ffd86b");
      r(8, 12, 1, 1, "#ffd86b");
      r(5, 11, 1, 1, "#fff6d0");
    }
  };
}

/* ════════ 2. 조사하면 반응하는 사물 ════════ */
const SPR = {
  fountain: (sx, sy) => {
    P(x, sx + 1, sy + 9, 14, 6, "#8a8f9c");
    P(x, sx + 2, sy + 9, 12, 3, "#5aa6dc");
    P(x, sx + 7, sy + 2, 2, 8, "#8a8f9c");
    P(x, sx + 6, sy + 1 + (fr % 8 < 4 ? 0 : 1), 4, 1, "#cfe6f6");
    P(x, sx + 4, sy + 10, 1, 1, "#ffffff");
  },
  mailbox: (sx, sy) => {
    P(x, sx + 7, sy + 9, 2, 6, "#5e3f29");
    P(x, sx + 4, sy + 3, 8, 7, "#d6453d");
    P(x, sx + 5, sy + 5, 6, 1, "#7e2a25");
  },
  anchor: (sx, sy) => {
    P(x, sx + 7, sy + 2, 2, 11, "#5F5E5A");
    P(x, sx + 5, sy + 4, 6, 1, "#5F5E5A");
    P(x, sx + 3, sy + 11, 10, 2, "#5F5E5A");
    P(x, sx + 3, sy + 9, 1, 2, "#5F5E5A");
    P(x, sx + 12, sy + 9, 1, 2, "#5F5E5A");
    P(x, sx + 6, sy + 0, 4, 2, "#a8742a");
  },
  gull: (sx, sy) => {
    const up = fr % 10 < 5;
    P(x, sx + 5, sy + 8, 6, 3, "#ffffff");
    P(x, sx + 10, sy + 7, 2, 2, "#ffffff");
    P(x, sx + 12, sy + 8, 1, 1, "#f0a43c");
    P(x, sx + 3, sy + (up ? 5 : 8), 4, 1, "#c9cdd6");
    P(x, sx + 6, sy + 11, 1, 2, "#f0a43c");
  },
  hole: (sx, sy) => {
    P(x, sx + 3, sy + 4, 10, 11, "#6b4a32");
    P(x, sx + 5, sy + 7, 6, 6, "#2a1a10");
  },
  rock: (sx, sy) => {
    P(x, sx + 2, sy + 7, 12, 8, "#8a857b");
    P(x, sx + 3, sy + 6, 10, 2, "#5a9e3a");
    P(x, sx + 5, sy + 9, 3, 1, "#b8b3a9");
  },
  bell: (sx, sy) => {
    P(x, sx + 7, sy + 1, 2, 2, "#8a5a35");
    P(x, sx + 5, sy + 3, 6, 7, "#c9a24a");
    P(x, sx + 4, sy + 10, 8, 2, "#c9a24a");
    P(x, sx + 7, sy + 12, 2, 2, "#5e3f29");
  },
  statue: (sx, sy) => {
    P(x, sx + 3, sy + 12, 10, 4, "#8a857b");
    P(x, sx + 5, sy + 6, 6, 6, "#b8b3a9");
    P(x, sx + 6, sy + 2, 4, 4, "#b8b3a9");
    P(x, sx + 7, sy + 0, 3, 2, "#9aa3b0");
  },
  musicbox: (sx, sy) => {
    P(x, sx + 3, sy + 8, 10, 7, "#8a5a35");
    P(x, sx + 3, sy + 6, 10, 2, "#c9a24a");
    P(x, sx + 12, sy + 9, 3, 1, "#c9a24a");
    if (fr % 30 < 15) P(x, sx + 6, sy + 2, 1, 3, "#534AB7");
  },
  telescope: (sx, sy) => {
    P(x, sx + 7, sy + 8, 2, 7, "#5e3f29");
    P(x, sx + 4, sy + 14, 8, 1, "#5e3f29");
    P(x, sx + 3, sy + 4, 10, 3, "#3C3489");
    P(x, sx + 12, sy + 3, 2, 5, "#c9a24a");
  },
  bench: (sx, sy) => PROPS.bench(x, sx, sy),
  barrel: (sx, sy) => PROPS.barrel(x, sx, sy),
  crate: (sx, sy) => PROPS.crate(x, sx, sy),
  lantern: (sx, sy) => PROPS.lantern(x, sx, sy),
  hay: (sx, sy) => PROPS.hay(x, sx, sy),
  fbook: (sx, sy) => PROPS.fbook(x, sx, sy - (fr % 16 < 8 ? 0 : 1)),
  crystal: (sx, sy) => PROPS.crystal(x, sx, sy),
  snowman: (sx, sy) => PROPS.snowman(x, sx, sy),
};
const cnt = {};
const tick = (k) => (cnt[k] = (cnt[k] || 0) + 1);
const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
const OBJ = {
  t1: [
    [12, 22, "fountain", "분수에 동전 던지기", () => {
      if (save.gold < 1) return say({ n: "분수" }, ["동전이 없어요. 물소리만 졸졸…"]);
      save.gold--;
      const lucky = Math.random() < 0.1;
      if (lucky) save.gold += 3;
      store();
      hud();
      sfx(lucky ? "win" : "pick");
      say({ n: "분수" }, [
        "퐁당! 동전을 던지고 소원을 빌었어요.",
        pickOf(["「내일 받아쓰기 다 맞게 해 주세요.」", "「{pet}이랑 오래오래 같이 놀게 해 주세요.」", "「급식에 떡볶이 나오게 해 주세요.」", "「나침반 조각을 금방 찾게 해 주세요.」", "「카이가 조금만 더 웃게 해 주세요.」"]),
        lucky ? "…반짝! 동전이 세 개가 되어 튀어나왔어요!" : "물결이 반짝 빛났어요.",
      ]);
    }],
    [26, 24, "mailbox", "우체통 들여다보기", () =>
      say({ n: "우체통" }, ["우체통 안에 핀이 깜빡 두고 간 쪽지가 있어요.", "「도서관 책장은 별, 바다, 숲, 땅 순서로 숨을 쉰대. 모모 선생님한테는 비밀!」"])],
  ],
  t2: [
    [16, 18, "anchor", "녹슨 닻 살펴보기", () =>
      say({ n: "녹슨 닻" }, tick("anchor") < 3 ? ["오래된 닻이에요. 무언가 새겨져 있는데 녹이 슬어 잘 안 보여요."] : ["녹을 문지르자 글자가 보여요.", "「새벽의 넷 — B · G · I · P, 이 바다를 지켰다」"])],
    [29, 19, "gull", "갈매기에게 빵 부스러기 주기", () => {
      sfx("pick");
      for (let i = 0; i < 10; i++) sp.push({ a: pl.x + Math.random() * 30, y: pl.y - 20 - Math.random() * 20, t: 12 });
      say({ n: "갈매기" }, ["끼룩! 갈매기가 빵을 물고 빙글빙글 날아올랐어요.", "{pet}이(가) 부러운 듯 쳐다봐요."]);
    }],
  ],
  t3: [
    [16, 18, "hole", "나무 아래 구멍 들여다보기", () => {
      if (save.st.chichi) return say({ n: "다람쥐 구멍" }, ["텅 비었어요. 치치가 또 어딘가에 숨겨 뒀겠죠?"]);
      save.st.chichi = 1;
      save.dust += 2;
      store();
      hud();
      sfx("shard");
      say({ n: "다람쥐 구멍" }, ["치치가 숨겨 둔 반짝 도토리 두 알을 찾았어요!", "별빛 가루 +2. (치치에게는 비밀이에요.)"]);
    }],
    [29, 19, "rock", "이끼 낀 돌 쓰다듬기", () => say({ n: "이끼 낀 돌" }, ["돌을 쓰다듬자 어디선가 낮은 웃음소리가 들려요.", "「허허, 간지럽구나…」 참나무 할아버지 목소리 같아요."])],
  ],
  t4: [
    [16, 18, "bell", "시계탑 종 아래에서 소리 지르기", () =>
      say({ n: "메아리" }, partDone(3) ? ["「6월 4일!」", "메아리가 신이 나서 대답해요. 「내일이 왔다! 내일이 왔다!」"] : ["「…6월 3일… 6월 3일…」", "메아리가 같은 날만 되풀이해요."])],
    [29, 19, "crate", "고장 난 신문 자판기 두드리기", () =>
      say({ n: "신문 자판기" }, tick("vend") < 3 ? ["덜컹. 아무 일도 없어요. 한 번 더?"] : ["덜컹! 신문 한 장이 툭 떨어졌어요.", "1면 제목: 「견습생, 오늘도 문제 " + (save.solved || 0) + "개를 맞히다」 — 기자 제이"])],
  ],
  t5: [
    [16, 18, "statue", "창립자 동상 코 만지기", () =>
      say({ n: "창립자 동상" }, ["아카데미 전통: 시험 전에 동상 코를 만지면 다 맞는대요.", "동상 코만 반들반들해요. 머리 위 비둘기가 「구구」 하고 웃어요."])],
    [29, 19, "crate", "분실물함 열어 보기", () =>
      say({ n: "분실물함" }, ["「포포」라고 적힌 지우개가 열두 개 들어 있어요.", "…포포는 지우개를 정말 자주 잃어버리나 봐요."])],
  ],
  t6: [
    [16, 18, "lantern", "소원 등불에 소원 적기", () => {
      fxRestore();
      say({ n: "소원 등불" }, ["등불에 소원을 적었어요.", "「" + jo(save.name || "견습생", "이", "가") + " 멋진 모험가가 되게 해 주세요.」", "등불이 하늘로 천천히 날아올라요."]);
    }],
    [29, 19, "barrel", "불꽃 통 살짝 열기", () => {
      shakeT = 6;
      sfx("restore");
      for (let i = 0; i < 30; i++) sp.push({ a: pl.x - 20 + Math.random() * 40, y: pl.y - 40 + Math.random() * 30, t: 14 });
      say({ n: "불꽃 통" }, ["펑! 펑! 작은 불꽃이 터졌어요.", "펑펑 할아버지: 「허허, 미리 터뜨리면 안 되는데!」"]);
    }],
  ],
  t7: [
    [16, 18, "bench", "텅 빈 벤치에 앉기", () =>
      say({ n: "벤치" }, partDone(6) ? ["벤치 위에 종이 배지가 놓여 있어요.", "「형, 누나 자리! — 토토」"] : ["누군가 늘 여기 앉아 있었던 것 같은데… 기억이 나지 않아요."])],
  ],
  t8: [
    [16, 18, "hay", "수줍은 허수아비에게 말 걸기", () =>
      say({ n: "허수아비" }, tick("shy") < 5 ? ["……"] : ["…아, 안녕. 나는 짚순이야.", "짚돌이한테는 내가 말할 줄 안다는 거 비밀이야. 부끄러우니까."])],
  ],
  t9: [
    [16, 18, "fbook", "떠다니는 책 펼치기", () =>
      say({ n: "떠다니는 책" }, [pickOf(["(아스트라의 글씨) 「오늘 별을 세다가 잠들었다. 몇 개까지 셌는지 모르겠다.」", "(마레의 글씨) 「바다는 기록을 지우지 않는다. 파도로 다시 쓸 뿐.」", "(이그니의 글씨) 「불은 따뜻하게 쓰면 등불, 함부로 쓰면 재.」", "(모모네의 글씨) 「책 읽다 또 밥 먹는 걸 잊었다. 녹스 선생님한테 혼날 거다.」", "(녹스의 글씨) 「루크가 그린 별은 다섯 갈래가 아니라 여섯 갈래다. 그게 더 예쁘다나.」"])])],
  ],
  t10: [
    [16, 18, "musicbox", "오래된 오르골 태엽 감기", () => {
      if (!UI.mute) {
        try {
          AC = AC || new (window.AudioContext || window.webkitAudioContext)();
          const t0 = AC.currentTime;
          [392, 440, 392, 330, 349, 392, 330, 262].forEach((f, i) => {
            const o = AC.createOscillator(),
              g = AC.createGain();
            o.type = "sine";
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t0 + i * 0.4);
            g.gain.exponentialRampToValueAtTime(0.08, t0 + i * 0.4 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.4 + 0.38);
            o.connect(g).connect(AC.destination);
            o.start(t0 + i * 0.4);
            o.stop(t0 + i * 0.4 + 0.4);
          });
        } catch (e) {}
      }
      say({ n: "오르골" }, ["♪ 잊어도 괜찮아… 내가 대신 기억할게… ♪", "세레나의 자장가예요. 카이가 들으면 좋아할 거예요."]);
    }],
  ],
  t11: [
    [16, 18, "crystal", "얼음 비석의 낙서 읽기", () =>
      say({ n: "얼음 비석" }, ["얼음 속에 오래된 낙서가 갇혀 있어요.", "「아스트라 왔다 감 ★」 「마레: 여기 너무 추워」", "「녹스 & 루크 — 언젠가 같이 별 보러 오자」"])],
    [29, 19, "snowman", "눈사람에게 인사하기", () => say({ n: "눈사람" }, ["…봄에 보자.", "(눈사람이 조금 웃은 것 같아요.)"])],
  ],
  t12: [
    [16, 18, "telescope", "망원경으로 밤하늘 보기", () => {
      fxRestore();
      const n = save.solved || 0;
      say({ n: "망원경" }, n ? ["밤하늘에 별이 가득해요.", "세어 보니 " + n + "개… 1년 동안 내가 맞힌 문제 수와 똑같아요."] : ["밤하늘이 아직 텅 비어 있어요.", "문제를 하나 맞힐 때마다 별이 하나씩 생긴대요."]);
    }],
  ],
};
for (const id in OBJ) {
  const m = MAPS[id],
    used = new Set();
  if (!m) continue;
  OBJ[id].forEach(([cx, cy, spr, n, act]) => {
    const p = openPos(m, cx, cy, used);
    if (!p) return;
    secAdd(id, { tx: p[0], ty: p[1], n, act, draw: (sx, sy) => SPR[spr](sx, sy), solid: 1 });
  });
}

/* ════════ 5. 도서관 비밀 서고 ════════ */
const SHELF_ORDER = ["별", "바다", "숲", "땅"];
let shelfSeq = [];
[[2, "바다"], [6, "땅"], [11, "별"], [15, "숲"]].forEach(([tx, k]) =>
  secAdd("lib1", {
    tx,
    ty: 4,
    n: k + "의 책장 살펴보기",
    act() {
      sfx("page");
      shelfSeq.push(k);
      const ok = SHELF_ORDER.slice(0, shelfSeq.length).join() === shelfSeq.join();
      if (!ok) shelfSeq = k === SHELF_ORDER[0] ? [k] : [];
      if (shelfSeq.length === 4 && !save.st.secretLib) {
        save.st.secretLib = 1;
        store();
        shakeT = 10;
        sfx("shard");
        return say({ n: "도서관" }, ["「" + k + "의 책」을 꺼내자… 덜컹!", "책장 사이 벽에서 숨은 문이 나타났어요!"]);
      }
      say({ n: k + "의 책장" }, ["「" + k + "의 책」을 한 권 꺼냈다가 다시 꽂았어요."]);
    },
  }),
);
secAdd("lib1", {
  tx: 8,
  ty: 3,
  r: 20,
  n: "숨은 문 열기",
  show: () => !!save.st.secretLib,
  draw(sx, sy) {
    P(x, sx + 2, sy - 14, 12, 18, "#3a2418");
    P(x, sx + 3, sy - 13, 10, 17, "#6b4a32");
    P(x, sx + 10, sy - 5, 2, 2, "#ffd86b");
    if (fr % 20 < 10) P(x, sx + 7, sy - 18, 2, 2, "#fff6d0");
  },
  act() {
    saveEx();
    loadMap("lib2", 8, 9);
  },
});
bRoom(
  "lib2",
  "비밀 서고",
  "lib1",
  [8, 4],
  [
    { id: "shelf", x: 1, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 5, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 10, y: 3, w: 3, h: 1 },
    { id: "shelf", x: 14, y: 3, w: 3, h: 1 },
    { id: "globe", x: 2, y: 7, w: 1, h: 1 },
    { id: "desk", x: 7, y: 6, w: 2, h: 1 },
  ],
  [],
);
const SECRET_BOOK = {
  id: "secretbook",
  t: "7현자의 낙서장",
  n: "비밀 서고",
  no: "★",
  p: [
    "이 책은 7현자가 돌아가며 쓴 낙서장이에요. 맨 앞 장에는 이렇게 적혀 있어요. 「여기에는 중요한 것은 하나도 쓰지 말 것. — 테라」",
    "그런데 두 번째 장부터 중요한 이야기가 가득해요. 아스트라는 별의 개수를 세다가 1000에서 멈췄어요. 「천 개쯤 세면 다음 날 다시 세도 된다.」",
    "모모네는 책 귀퉁이에 작은 부엉이를 그려 두었어요. 녹스는 그 옆에 「책 읽다 밥 거르지 마라」라고 적었고요.",
    "마지막 장에는 일곱 명의 이름이 나란히 적혀 있어요. 그리고 누군가 아주 작게 덧붙였어요. 「다음 견습생에게: 배운 것은 별빛이 된다.」",
  ],
  q: [
    ["낙서장 맨 앞 장에 적힌 말은 무엇인가요?", ["중요한 것은 하나도 쓰지 말 것", "별을 매일 셀 것", "밥을 꼭 먹을 것"], 0],
    ["아스트라는 별을 몇까지 세고 멈췄나요?", ["100", "365", "1000"], 2],
  ],
};
secAdd("lib2", { tx: 8, ty: 7, n: "7현자의 낙서장 읽기", act: () => openBook(SECRET_BOOK) });
secAdd("lib2", {
  tx: 3,
  ty: 8,
  n: "낡은 지도 펼치기",
  act: () =>
    say({ n: "낡은 지도" }, [
      "바다 건너 낯선 섬들이 그려진 지도예요. 아르카 지도에는 없던 곳이에요.",
      "귀퉁이에 이렇게 적혀 있어요. 「아르카 연대기 2 — 바다 건너의 별빛」",
      "…아직은 비밀이래요.",
    ]),
});

/* ════════ 맵 위 숨은 것 그리기 · 가까이 가면 조사 ════════ */
{
  const near0 = near;
  near = function () {
    const r = near0();
    if (r && r.type === "npc") return r;
    const L = SEC[M.id];
    if (!L || busy) return r;
    let best = null,
      bd = 99;
    L.forEach((o) => {
      if (o.show && !o.show()) return;
      const d = Math.hypot(o.tx * T + 8 - pl.x, o.ty * T + 12 - pl.y);
      if (d < (o.r || 21) && d < bd) {
        bd = d;
        best = o;
      }
    });
    if (best && (!r || bd < 18)) return { type: "secret", ref: best };
    return r;
  };
  const fx3 = drawFx;
  drawFx = function () {
    (SEC[M.id] || []).forEach((o) => {
      if (o.show && !o.show()) return;
      const sx = o.tx * T - cam.x,
        sy = o.ty * T - cam.y;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) return;
      if (o.draw) o.draw(sx, sy, Math.hypot(o.tx * T + 8 - pl.x, o.ty * T + 12 - pl.y));
    });
    // 마이룸: 찾은 별고양이들이 방석 둘레에 모인다
    if (M.id === "home") {
      const L = CAT_MAPS.map((id, k) => "cat" + (k + 1)).filter((c) => save.cats && save.cats[c]);
      L.forEach((c, i) => {
        const a = 11 + (i % 6),
          y = 9 + Math.floor(i / 6);
        drawCat(a * T - cam.x, y * T - cam.y + 2, fr + i * 5, ["#f5e3a3", "#c9cdd6", "#f0a43c", "#ffffff"][i % 4]);
      });
    }
    fx3();
  };
}

/* ════════ 3. 행동 이스터에그 ════════ */
let bedN = 0,
  petN = 0,
  petDance = 0,
  totoN = 0;
{
  const lm0 = loadMap;
  loadMap = function (id, tx, ty, quiet) {
    bedN = 0;
    petN = 0;
    lm0(id, tx, ty, quiet);
    merchantMaybe();
  };
  const fa0 = furAct;
  furAct = function (f) {
    if (f.act === "bed" && ++bedN >= 5 && !save.st.dream) {
      save.st.dream = 1;
      store();
      fa0(f);
      return playScene(
        [
          ["nar", "다섯 번째로 눈을 감자, 깊은 꿈이 찾아왔어요."],
          ["nar", "구름 위에 떠 있는 커다란 도서관. 책장 사이로 부엉이 깃털 하나가 팔랑 떨어져요."],
          ["nar", "누군가 웃으며 말해요. 「또 책 읽다가 잠들었니, 모모네?」"],
          ["nar", "…잠에서 깼어요. 꿈이 이상하게 생생해요."],
        ],
        () => {},
      );
    }
    if (f.act === "pet" && save.pet && ++petN >= 5) {
      petN = 0;
      petDance = tk + 70;
      sfx("restore");
      return toast(jo(save.pet.name, "이", "가") + " 신나게 춤을 춰요!");
    }
    fa0(f);
  };
  const dp0 = drawPet;
  drawPet = function () {
    if (tk < petDance) {
      const oy = pet.y,
        od = pet.dir;
      pet.y -= Math.abs(Math.sin(tk / 3)) * 6;
      pet.dir = Math.floor(tk / 6) % 2 ? 1 : -1;
      dp0();
      pet.y = oy;
      pet.dir = od;
    } else dp0();
  };
  const tk0 = talk;
  talk = function (n) {
    if (n.id === "toto" && ++totoN === 10) {
      return openDlg(n, ["형, 누나! 또 왔어? 나 귀찮지?", "…그래도 좋아! 열 번째로 말 걸어 준 사람한테만 알려 주는 비밀이야.", "어딘가에 별 무늬 고양이가 숨어 산대. 열두 마리나!"]);
    }
    if (n.id === "merchant") return merchantTalk(n);
    tk0(n);
  };
}
// 이름 이스터에그 (시작 화면에서 적은 이름)
const NAME_EGG = {
  모모: ["momo", ["어? 제 이름이잖아요! 견습생님도 모모라니… 우리 정말 잘 맞겠는데요?"]],
  녹스: ["nox", ["…그 이름은 함부로 쓰는 게 아니란다, 아이야."]],
  카이: ["kai", ["…흉내 내지 마. (귀가 조금 빨개졌어요.)"]],
  토토: ["toto", ["나랑 이름이 똑같아! 우리 쌍둥이 하자!"]],
  선생님: ["momo", ["선생님이 직접 오셨군요! 학생들 몰래 구경하시는 거죠? 비밀로 해 드릴게요."]],
};

/* ════════ 4. 숫자 이스터에그 ════════ */
const MILESTONE = [
  [100, "백 개의 별빛"],
  [365, "1년의 별빛"],
  [1000, "천 개의 별빛"],
];
setInterval(() => {
  if (busy || mode !== "map" || $(".titlebox")) return;
  const eg = NAME_EGG[(save.name || "").trim()];
  if (eg && !save.st.nameEgg && save.st.in_home) {
    save.st.nameEgg = 1;
    store();
    return say(eg[0], eg[1]);
  }
  for (const [n, t] of MILESTONE)
    if ((save.solved || 0) >= n && !save.st["ms" + n]) {
      save.st["ms" + n] = 1;
      save.titles = (save.titles || []).concat(t);
      store();
      fxRestore();
      return toast("맞힌 문제 " + n + "개! 칭호 「" + t + "」를 얻었어요");
    }
  if (FLD.streak >= 10 && !FLD.burstOn) {
    FLD.burstOn = 1;
    FLD.dbl = 1;
    fxRestore();
    hud();
    return toast("10문제 연속 정답! 별빛 폭주 — 다음 공격 피해 두 배");
  }
  if (FLD.streak < 10) FLD.burstOn = 0;
  if (save.gold === 314 && !save.st.pi) {
    save.st.pi = 1;
    store();
    sfx("shard");
    return toast("금화 314개… 3.14! 원주율 금화예요");
  }
}, 600);
{
  const me1 = PANEL.me;
  PANEL.me = function () {
    const t = save.titles || [];
    return me1() + (t.length ? "<h4>칭호</h4><p>" + t.map((s) => "「" + esc(s) + "」").join(" ") + "</p>" : "") + (catCount() ? "<h4>별고양이</h4><p>" + catCount() + " / 12마리</p>" : "");
  };
  // 12마리 모두 찾으면 졸업식에도 온다
  const fin0 = storyFinale;
  storyFinale = function () {
    if (catCount() >= 12 && !SC_FINALE._cat) {
      SC_FINALE.splice(SC_FINALE.length - 1, 0, ["nar", "졸업식 무대 아래에 별고양이 열두 마리가 나란히 앉아 꼬리를 흔들어요."]);
      SC_FINALE._cat = 1;
    }
    fin0();
  };
}

/* ════════ 6. 떠돌이 상인 ════════ */
D.merchant = {
  n: "떠돌이 상인 루포",
  hair: "#5a3a22",
  ht: "short",
  top: "#BA7517",
  top2: "#3a7ac0",
  bot: "#5e3f29",
  ex: (r, b) => {
    r(1, 8 + b, 3, 7, "#8a5a35");
    r(1, 7 + b, 3, 1, "#5e3f29");
  },
};
const RARE = [
  ["c_brooch", "별빛 브로치", { exp: 0.15, d: "경험치 +15%" }],
  ["c_bell", "고양이 방울", { heal: 1, d: "몬스터를 이기면 하트 1 회복" }],
  ["c_feather", "부엉이 깃털", { gold: 0.15, d: "금화 +15%" }],
  ["c_lens", "작은 등대 렌즈", { hp: 1, d: "체력 +1" }],
];
RARE.forEach(([id, n, o]) => {
  EQ[id] = { s: "c", n, ...o };
  I2E[n] = id;
});
let lastMerchantMap = "";
function merchantMaybe() {
  if (!save.job || (M.kind !== "route" && M.kind !== "dead") || M.id === lastMerchantMap) return;
  if (Math.random() > 0.18) return;
  const R = reachSet(M),
    sx = Math.floor(pl.x / T),
    sy = Math.floor(pl.y / T);
  let p = null;
  for (let r = 3; r < 8 && !p; r++)
    for (let dy = -r; dy <= r && !p; dy++)
      for (let dx = -r; dx <= r && !p; dx++) if (R.has(sx + dx + "," + (sy + dy)) && G[sy + dy][sx + dx] !== ":") p = [sx + dx, sy + dy];
  if (!p) return;
  lastMerchantMap = M.id;
  const X = p[0] * T + 8,
    Y = p[1] * T + 14;
  npcs.push({ ...D.merchant, id: "merchant", x: X, y: Y, hx: X, hy: Y, tx: X, ty: Y, lines: [], wait: 0, dir: -1, face: "d", f: 0, mv: false, talk: 0, still: 1 });
  const here = M.id;
  setTimeout(() => !busy && M.id === here && toast("어디선가 방울 소리가… 떠돌이 상인이 지나가요"), 900);
}
function merchantTalk(n) {
  if (n.sold) return openDlg(n, ["또 만나요, 견습생! 길 위에서 또 마주칠 거예요."]);
  const left = RARE.filter(([id]) => !save.own.includes(id));
  openDlg(
    n,
    ["반가워요, 견습생! 나는 떠돌이 상인 루포.", left.length ? "문제 세 개를 맞히면, 희귀한 장신구를 금화 60에 팔게요." : "희귀한 장신구는 다 가지셨네요! 문제 세 개를 맞히면 별빛 가루를 드릴게요."],
    null,
    [
      ["도전할래요", () => merchantQuiz(n, 0)],
      ["다음에요", () => {}],
    ],
  );
}
function merchantQuiz(n, k) {
  quizBox(
    "루포의 문제 " + (k + 1) + " / 3",
    3,
    () => {
      closeBox();
      if (k < 2) return merchantQuiz(n, k + 1);
      n.sold = 1;
      const left = RARE.filter(([id]) => !save.own.includes(id));
      if (!left.length) {
        save.dust += 5;
        store();
        hud();
        return openDlg(n, ["훌륭해요! 약속대로 별빛 가루 5개!"]);
      }
      if (save.gold < 60) return openDlg(n, ["훌륭해요! …그런데 금화가 모자라네요. 다음에 또 만나요!"]);
      const [id, nm, o] = left[Math.floor(Math.random() * left.length)];
      save.gold -= 60;
      save.own.push(id);
      save.items.push(nm);
      store();
      hud();
      sfx("win");
      openDlg(n, ["훌륭해요! 오늘의 물건은… 「" + nm + "」!", "(" + o.d + ") 마이룸 옷장에서 장착할 수 있어요."]);
    },
    () => ($("bm").textContent = "괜찮아요, 다시 생각해 봐요."),
  );
}
