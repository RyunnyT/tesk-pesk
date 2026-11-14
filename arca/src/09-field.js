/* 길 위 전투 (선생님 제안, 2026-11-14)
   · 공격(Q)·스킬(E·R·T·Y)은 길을 걷다 언제든 쓴다. 몬스터에 닿으면 작은 문제 상자가 뜬다.
     맞히면 피해 그대로, 틀리면 절반(올림). 틀리면 정답과 풀이를 잠깐 보여 준다.
   · 몬스터가 부딪혀 오면 「피하기」 문제: 맞히면 피하고, 틀리면 하트가 준다.
   · 별빛 게이지 ◆(최대 3)는 문제를 맞힐 때 차고, 스킬을 쓰면 준다.
   · 몬스터 체력은 맵 위 막대로 보인다. 0이 되면 win() 으로 보상(퀘스트·문지기·핵심 자리 보스 처리 포함).
   · 문제를 푸는 동안만 B(대상 정보)를 잠깐 채워 카메라·체력 막대·이펙트가 그 몬스터를 보게 한다. 옛 전투 모드(startBattle)는 쓰지 않는다. */
const FLD = { g: 0, streak: 0, guard: 0, dbl: 0 };

/* ── 문제 상자 ── */
function askField(MI, title, cb) {
  busy = true;
  const Q = makeQ(MI.dif),
    job = save.job || "knight";
  if (job === "archer" && skLearned(STUDY.archer) && Q.ch.length > 2) {
    const i = Q.ch.findIndex((v) => v !== Q.a);
    Q.ch.splice(i, 1);
  }
  $("btt").textContent = title;
  $("bth").hidden = false;
  $("bth").textContent = "맞히면 그대로 · 틀리면 절반   별빛 " + "◆".repeat(FLD.g) + "◇".repeat(3 - FLD.g);
  $("bs").hidden = true;
  $("bq").textContent = Q.q;
  $("bq").classList.toggle("long", Q.q.length > 18);
  $("bm").textContent = "";
  const bc = $("bc");
  bc.innerHTML = "";
  let done = false;
  const finish = (ok) => {
    done = true;
    [...bc.children].forEach((b) => {
      b.disabled = true;
      if (b.dataset.v === String(Q.a)) b.classList.add("ans");
    });
    if (ok) {
      save.solved = (save.solved || 0) + 1;
      FLD.streak++;
      FLD.g = Math.min(3, FLD.g + 1);
      sfx("ok");
      $("bm").textContent = "정답!" + (Q.wrong && Q.ex ? "\n풀이: " + Q.ex : "");
    } else {
      FLD.streak = 0;
      noteWrong(Q);
      sfx("bad");
      $("bm").textContent = "아쉬워요. 정답은 " + Q.a + (Q.ex ? "\n풀이: " + Q.ex : "");
    }
    store();
    setTimeout(
      () => {
        $("bt").hidden = true;
        $("bt").classList.remove("battle");
        $("bs").hidden = false;
        cb(ok);
      },
      ok ? 450 : Q.ex ? 2200 : 1400,
    );
  };
  Q.ch.forEach((v, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.v = String(v);
    b.textContent = i + 1 + ". " + v;
    b.onclick = () => {
      if (done) return;
      if (v === Q.a) return finish(true);
      // 마법사 ★ 시간 늦추기: 한 문제에 한 번은 다시 생각할 기회
      if (job === "mage" && skLearned(STUDY.mage) && !Q.retried) {
        Q.retried = 1;
        Q.wrong = 1;
        b.disabled = true;
        $("bm").textContent = "시간 늦추기! 한 번 더 생각해 봐요.";
        return;
      }
      finish(false);
    };
    bc.appendChild(b);
  });
  $("bt").classList.add("battle");
  $("bt").hidden = false;
  bc.firstChild.focus();
}

/* ── 공격이 닿음 ── */
function fieldStrike(m, sk) {
  if (busy || mode !== "map" || !m || m.dead) return;
  const MI = mstat(m);
  if (m.hpNow == null) m.hpNow = MI.hp;
  pl.dir = m.x > pl.x ? 1 : -1;
  pl.face = "s";
  m.dir = pl.x < m.x ? -1 : 1;
  B = { m, MI, hp: m.hpNow, g: FLD.g, core: m.core, field: 1 };
  const base = sk ? { hit2: 2, hit3: 3, ult: 5 }[sk.t] : atk();
  askField(MI, (sk ? sk.nm : "공격") + " · " + MI.n, (ok) => {
    let d = ok ? base : Math.ceil(base / 2);
    const job = save.job || "knight";
    if (ok && job === "warrior" && skLearned(STUDY.warrior) && FLD.streak >= 2) d++;
    if (ok && petOn(0) && Math.random() < 0.25) d++;
    if (FLD.dbl) {
      d *= 2;
      FLD.dbl = 0;
    }
    m.hpNow -= d;
    B.hp = m.hpNow;
    m.hit = 10;
    fxHit(d);
    if (!ok) fxPop(m.x, m.y - 34, "절반", "#cfc6ee");
    for (let i = 0; i < 12; i++) sp.push({ a: m.x - 8 + Math.random() * 16, y: m.y - 18 + Math.random() * 16, t: 8 + Math.random() * 8 });
    setTimeout(() => {
      if (m.hpNow <= 0) {
        m.hpNow = null;
        win();
        return;
      }
      if (!MI.boss) tryMove(m, (m.x > pl.x ? 1 : -1) * 10, 0, false);
      pl.inv = Math.max(pl.inv, 24);
      B = null;
      busy = false;
      hud();
      $("stage").focus();
    }, 420);
  });
}

/* ── 몬스터가 부딪혀 옴: 피하기 문제 ── */
function fieldContact(m) {
  if (busy || mode !== "map" || m.dead) return;
  const MI = mstat(m),
    away = () => {
      pl.inv = 45;
      tryMove(pl, (pl.x < m.x ? -1 : 1) * 14, 0, false);
      if (!MI.boss) tryMove(m, (m.x > pl.x ? 1 : -1) * 8, 0, false);
    };
  if (FLD.guard) {
    FLD.guard = 0;
    fxPop(pl.x, pl.y - 24, "막음!", "#9fe0ff");
    sfx("hit");
    return away();
  }
  if (petOn(4) && !m.pb) {
    m.pb = 1;
    fxPop(pl.x, pl.y - 24, save.pet.name + " 막음!", "#9fe0ff");
    sfx("hit");
    return away();
  }
  if (m.hpNow == null) m.hpNow = MI.hp;
  B = { m, MI, hp: m.hpNow, g: FLD.g, core: m.core, field: 1 };
  askField(MI, jo(MI.n, "이", "가") + " 덤벼요! 맞히면 피해요", (ok) => {
    const job = save.job || "knight";
    if (ok) {
      fxPop(pl.x, pl.y - 24, "피함!", "#9fe0ff");
      sfx("run");
    } else if (job === "knight" && skLearned(STUDY.knight) && Math.random() < 0.5) {
      fxPop(pl.x, pl.y - 24, "굳센 마음!", "#9fe0ff");
      sfx("hit");
    } else {
      pl.hp -= MI.dmg;
      shakeT = 10;
      fxHurt(MI.dmg);
    }
    away();
    setTimeout(() => {
      B = null;
      if (pl.hp <= 0) return lose();
      save.hp = pl.hp;
      busy = false;
      store();
      hud();
      $("stage").focus();
    }, 420);
  });
}

/* ── 핵심 자리 보스: 맵에 나타나 서 있고, 공격해서 물리친다 ── */
function fieldBoss(m, p) {
  m.core = p;
  toast(jo(MON[m.type].n, "이", "가") + " 나타났어요! 다가가 공격(Q)하거나 스킬을 써요");
}

/* ── 스킬 (E·R·T·Y) ── */
function fieldSkill(i) {
  if (busy || mode !== "map") return;
  const job = save.job;
  if (!job) return toast("먼저 스승님께 직업을 배워요");
  if (i >= slots()) return toast(SKEY[i] + " 칸은 Lv " + [1, 3, 5, 7][i] + "에 열려요");
  const k = (save.sk || [])[i];
  if (k == null) return toast(SKEY[i] + " 칸이 비어 있어요. 마이룸 책장에서 스킬을 장착해요");
  const t = SKE[job][k],
    nm = SKL[job][k][0],
    ef = EFF[t];
  if (!ef) return toast("「" + nm + "」은(는) 늘 저절로 발동하는 스킬이에요");
  if (FLD.g < ef.c) return toast("별빛 게이지가 모자라요(" + "◆".repeat(FLD.g) + "◇".repeat(ef.c - FLD.g) + "). 문제를 맞혀 채워요");
  if (t === "hit2" || t === "hit3" || t === "ult") {
    const reach = job === "archer" || job === "mage" ? 80 : 34;
    let best = null,
      bd = reach;
    mons.forEach((m) => {
      if (m.dead) return;
      const d = Math.hypot(m.x - pl.x, m.y - pl.y);
      if (d < bd) {
        bd = d;
        best = m;
      }
    });
    if (!best) return toast("「" + nm + "」이 닿을 만큼 가까운 몬스터가 없어요");
    FLD.g -= ef.c;
    hud();
    B = { m: best, MI: mstat(best), hp: best.hpNow == null ? mstat(best).hp : best.hpNow, g: FLD.g, core: best.core, field: 1 };
    fxSkill(t, nm);
    busy = true;
    setTimeout(() => {
      busy = false;
      fieldStrike(best, { t, nm });
    }, 380);
    return;
  }
  FLD.g -= ef.c;
  fxSkill(t, nm);
  if (t === "guard") FLD.guard = 1;
  if (t === "heal") pl.hp = Math.min(maxHp(), pl.hp + 2);
  if (t === "double") FLD.dbl = 1;
  save.hp = pl.hp;
  store();
  hud();
  toast(nm + "! " + { guard: "다음에 부딪히는 공격을 막아요", heal: "하트 2 회복", double: "다음 공격 피해 두 배" }[t]);
}

/* ── 상단 별빛 게이지 · 다친 몬스터 체력 막대 ── */
{
  const hg = document.createElement("span");
  hg.id = "hg";
  $("hud").insertBefore(hg, $("h3"));
  const hud1 = hud;
  hud = function () {
    hud1();
    hg.hidden = !save.job;
    hg.textContent = "별빛 " + "◆".repeat(FLD.g) + "◇".repeat(3 - FLD.g) + (FLD.guard ? " · 막기" : "") + (FLD.dbl ? " · 두 배" : "");
  };
  const fx2 = drawFx;
  drawFx = function () {
    fx2();
    mons.forEach((m) => {
      if (m.dead || m.hpNow == null || (B && B.m === m)) return;
      const MI = MON[m.type],
        full = mstat(m).hp,
        big = MI.boss,
        sx = Math.round(m.x - cam.x),
        sy = Math.round(m.y - cam.y) - (big ? 44 : 26),
        w = big ? 36 : 22,
        k = Math.max(0, m.hpNow) / full;
      P(x, sx - w / 2 - 1, sy - 1, w + 2, 5, "#1e1b3f");
      P(x, sx - w / 2, sy, w, 3, "#5a2a3a");
      P(x, sx - w / 2, sy, Math.round(w * k), 3, k > 0.5 ? "#7ee07a" : k > 0.25 ? "#ffd86b" : "#ff6b7a");
    });
  };
  hud();
}

/* ── 휴대폰: 스킬 버튼 ── */
{
  const row = document.createElement("div");
  row.className = "skrow";
  row.id = "skrow";
  $("stage").appendChild(row);
  const draw = () => {
    const job = save.job;
    row.hidden = !MOBILE || !job || mode !== "map";
    if (row.hidden) return;
    row.innerHTML = SKEY.map((key, i) => {
      const k = (save.sk || [])[i],
        on = i < slots() && k != null;
      return '<button type="button" data-fs="' + i + '"' + (on ? "" : " disabled") + ">" + (on ? SKL[job][k][0].slice(0, 4) : key) + "</button>";
    }).join("");
  };
  row.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    e.preventDefault();
    fieldSkill(+b.dataset.fs);
  });
  draw();
  setInterval(draw, 1500);
}
