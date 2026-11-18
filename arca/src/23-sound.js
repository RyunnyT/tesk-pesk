/* ════════ 소리와 스킬 효과 그림 (프롬프트 G, 2026-11-15, docs/제안_소리와효과.md, 선생님: 받기·칩튠풍) ════════
   · PixelLab 의 음악·효과음 만들기는 Tier 2 구독이 있어야 해서(지금 Tier 1) 받지 못했다.
     그래서 배경음악·효과음은 브라우저 안에서 칩튠(네모파·세모파·잡음)으로 그 자리에서 만든다 → 파일 0MB, 빌드 크기 그대로.
   · 배경음악 12곡: 지역 테마 10종(마을·숲·바닷가·그림자·정원·돌산·황금 들판·꿈·하얀 세상·눈밭) + 보스전 + 마이룸.
     곡마다 8마디를 끊김 없이 되풀이(앞서 예약해 두는 방식). 맵·보스가 바뀌면 마디 끝에서 바뀐다.
   · 효과음: 예전 소리(08-ui sfx)에 치명타·막기·약점·튕김·콤보·레벨업·전리품 등급별·보스 예고·상자 열기 등을 더하고, 모두 크기 조절.
   · 교실용: 화면을 누르거나 키를 누른 뒤에만 소리가 난다(브라우저 규칙). 기본은 음악 30%·효과음 50%. 메뉴에서 음악 끄기·소리 크기.
   · 스킬 효과 그림: PixelLab VFX(무료, 프리셋 8종: 베기·충격·충격파·번개·보호막·회복·폭발·마법진) → assets/hd/vfx/. */
// 기본은 음악 끔(2026-11-15: 음악을 사람 귀로 확인하기 전까지). 효과음은 켬. 메뉴에서 켠다
UI.musicOn = UI.musicOn === true || UI.musicOn === 1;
UI.vol = UI.vol == null ? 1 : UI.vol; // 0 작게(0.5) · 1 보통 · 2 크게(1.6)
const VOLK = [0.5, 1, 1.6];
const SND = { ctx: null, music: null, sfx: null, cur: null, want: null, next: 0, step: 0, timer: null, noise: null, unlocked: false };
function sndInit() {
  if (SND.ctx) return SND.ctx;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return null;
  }
  SND.ctx = AC;
  SND.music = AC.createGain();
  SND.sfx = AC.createGain();
  SND.music.connect(AC.destination);
  SND.sfx.connect(AC.destination);
  sndVol();
  // 잡음(북) 버퍼
  const b = AC.createBuffer(1, AC.sampleRate * 0.3, AC.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  SND.noise = b;
  return AC;
}
function sndVol() {
  if (!SND.ctx) return;
  const k = VOLK[UI.vol] || 1;
  SND.music.gain.value = UI.mute || !UI.musicOn ? 0 : 0.3 * k;
  SND.sfx.gain.value = UI.mute ? 0 : 0.5 * k * 2; // 예전 소리 크기(0.05 안팎) 기준으로 맞춤
}
// 브라우저 규칙: 사용자가 누른 뒤에만 소리
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  addEventListener(
    ev,
    () => {
      if (!sndInit()) return;
      if (SND.ctx.state === "suspended") SND.ctx.resume();
      SND.unlocked = true;
    },
    { capture: true, passive: true },
  ),
);

/* ── 효과음(크기 조절 + 새 소리) ── */
sfx = function (name) {
  if (UI.mute || !sndInit()) return;
  if (SND.ctx.state === "suspended") SND.ctx.resume();
  const A = SND.ctx,
    t0 = A.currentTime;
  const tone = (f, at, dur, type, vol, f2) => {
    const o = A.createOscillator(),
      g = A.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f, t0 + at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + dur);
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g).connect(SND.sfx);
    o.start(t0 + at);
    o.stop(t0 + at + dur + 0.02);
  };
  const hiss = (at, dur, vol, hp) => {
    const s = A.createBufferSource(),
      g = A.createGain(),
      f = A.createBiquadFilter();
    s.buffer = SND.noise;
    f.type = "highpass";
    f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol || 0.05, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    s.connect(f).connect(g).connect(SND.sfx);
    s.start(t0 + at);
    s.stop(t0 + at + dur);
  };
  const S = {
    ok: () => (tone(660, 0, 0.09, "square", 0.06), tone(990, 0.08, 0.14, "square", 0.06)),
    bad: () => tone(220, 0, 0.22, "sawtooth", 0.05, 140),
    hit: () => (tone(320, 0, 0.08, "triangle", 0.12, 90), hiss(0, 0.06, 0.04, 2000)),
    hurt: () => tone(160, 0, 0.18, "square", 0.06, 80),
    skill: () => [0, 1, 2, 3].forEach((i) => tone(520 + i * 160, i * 0.05, 0.1, "triangle", 0.07)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.14, "square", 0.05)),
    fill: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.18, "triangle", 0.06)),
    restore: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, i * 0.1, 0.35, "triangle", 0.07)),
    lvl: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.22, "square", 0.05)),
    talk: () => tone(880, 0, 0.03, "square", 0.025),
    quest: () => (tone(587, 0, 0.1, "triangle", 0.07), tone(880, 0.1, 0.18, "triangle", 0.07)),
    shard: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.12, 0.4, "sine", 0.08)),
    page: () => tone(1200, 0, 0.04, "triangle", 0.03, 700),
    pick: () => tone(1320, 0, 0.06, "sine", 0.05),
    run: () => tone(500, 0, 0.15, "triangle", 0.05, 900),
    // 새 소리
    crit: () => (tone(1200, 0, 0.05, "square", 0.07), tone(240, 0.03, 0.2, "sawtooth", 0.07, 60), hiss(0, 0.15, 0.07, 1500)),
    block: () => (tone(900, 0, 0.04, "square", 0.05), tone(1800, 0.02, 0.12, "triangle", 0.05, 1200)),
    weak: () => [784, 1046, 1568].forEach((f, i) => tone(f, i * 0.04, 0.16, "square", 0.06)),
    bounce: () => tone(400, 0, 0.12, "triangle", 0.06, 700),
    combo: () => [659, 880, 1175].forEach((f, i) => tone(f, i * 0.05, 0.1, "square", 0.05)),
    warn: () => (tone(440, 0, 0.12, "square", 0.04), tone(440, 0.18, 0.12, "square", 0.04)),
    chest: () => (hiss(0, 0.2, 0.03, 600), [523, 659, 784].forEach((f, i) => tone(f, 0.2 + i * 0.07, 0.15, "triangle", 0.06))),
    loot0: () => tone(784, 0, 0.12, "triangle", 0.05),
    loot1: () => [784, 988].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.06)),
    loot2: () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.07, 0.16, "square", 0.05)),
    loot3: () => [784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.25, "square", 0.05)),
  };
  (S[name] || (() => {}))();
};
// 새 소리를 알맞은 때에
{
  const fpS = fxPop;
  fxPop = function (wx, wy, txt, col) {
    fpS(wx, wy, txt, col);
    const t = String(txt || "");
    if (t.startsWith("치명타")) sfx("crit");
    else if (t.startsWith("막기") || t.includes("막음")) sfx("block");
    else if (t === "약점!" || t.startsWith("약점 대폭발")) sfx("weak");
    else if (t === "튕겼어요") sfx("bounce");
  };
  if (typeof bpStart === "function") {
    const bpS = bpStart;
    bpStart = function (m) {
      bpS(m);
      sfx("warn");
    };
  }
  if (typeof rpgDrop === "function") {
    const rdS = rpgDrop;
    rpgDrop = function (...a) {
      const it = rdS(...a);
      if (it) setTimeout(() => sfx("loot" + Math.max(0, Math.min(3, it.g || 0))), 300);
      return it;
    };
  }
  if (typeof kboxOpen === "function") {
    const koS = kboxOpen;
    kboxOpen = function () {
      sfx("chest");
      koS();
    };
  }
  if (typeof funDmg === "function") {
    const fdS = funDmg;
    funDmg = function (d, ok, m, sk) {
      const r = fdS(d, ok, m, sk);
      if (ok && FLD.streak >= 3) sfx("combo");
      return r;
    };
  }
}

/* ── 배경음악: 칩튠 12곡 ── */
// 음계(반음 간격)와 테마별 성격. root 는 MIDI 번호, prog 는 화음 뿌리(음계 안 몇째 음, 0부터)
const SCALE = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], lyd: [0, 2, 4, 6, 7, 9, 11], pen: [0, 2, 4, 7, 9, 12, 14] };
const SONGS = {
  town: { n: "마을", bpm: 112, root: 60, sc: "maj", prog: [0, 3, 4, 0, 5, 3, 4, 4], drum: 1, seed: 1 },
  forest: { n: "숲", bpm: 100, root: 62, sc: "dor", prog: [0, 6, 3, 0, 0, 6, 4, 4], drum: 1, seed: 2 },
  coast: { n: "바닷가", bpm: 96, root: 65, sc: "maj", prog: [0, 4, 5, 3, 0, 4, 3, 4], drum: 1, seed: 3 },
  dead: { n: "그림자 숲", bpm: 84, root: 57, sc: "min", prog: [0, 5, 3, 4, 0, 5, 6, 4], drum: 0, seed: 4 },
  garden: { n: "정원", bpm: 104, root: 67, sc: "lyd", prog: [0, 1, 0, 4, 0, 1, 3, 4], drum: 1, seed: 5 },
  stone: { n: "돌산", bpm: 120, root: 59, sc: "dor", prog: [0, 0, 6, 6, 3, 3, 4, 4], drum: 2, seed: 6 },
  gold: { n: "황금 들판", bpm: 116, root: 64, sc: "pen", prog: [0, 3, 4, 0, 0, 3, 4, 0], drum: 1, seed: 7 },
  dream: { n: "꿈", bpm: 88, root: 66, sc: "lyd", prog: [0, 5, 1, 4, 0, 5, 1, 4], drum: 0, seed: 8 },
  white: { n: "하얀 세상", bpm: 92, root: 61, sc: "maj", prog: [0, 5, 3, 4, 5, 3, 1, 4], drum: 0, seed: 9 },
  snow: { n: "눈밭", bpm: 98, root: 63, sc: "min", prog: [0, 3, 6, 2, 0, 3, 4, 4], drum: 1, seed: 10 },
  boss: { n: "보스전", bpm: 144, root: 57, sc: "min", prog: [0, 0, 5, 6, 0, 0, 3, 4], drum: 2, seed: 11 },
  home: { n: "마이룸", bpm: 80, root: 65, sc: "maj", prog: [0, 3, 1, 4, 0, 3, 4, 0], drum: 0, seed: 12 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function songNote(S, deg, oct) {
  const sc = SCALE[S.sc],
    o = Math.floor(deg / sc.length);
  return S.root + 12 * (o + (oct || 0)) + sc[((deg % sc.length) + sc.length) % sc.length];
}
// 곡의 한 마디(8분음표 8개) 가락: 씨앗으로 정해져 늘 같은 곡
function songBar(S, bar) {
  let s = S.seed * 7919 + bar * 104729;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ch = S.prog[bar % S.prog.length],
    tones = [ch, ch + 2, ch + 4, ch + 7];
  const lead = [];
  for (let i = 0; i < 8; i++) {
    const rest = r() < (i % 2 ? 0.35 : 0.12);
    lead.push(rest ? null : tones[Math.floor(r() * (i % 4 === 0 ? 3 : 4))] + (r() < 0.2 ? 1 : 0));
  }
  if (bar % 4 === 3) lead[6] = lead[7] = null; // 마디 끝 숨
  return { ch, lead };
}
function musicPick() {
  if (!M) return null;
  if (M.id === "home") return "home";
  const bossNear = typeof bpBoss === "function" && bpBoss();
  if (bossNear || (B && B.MI && B.MI.boss)) return "boss";
  return SONGS[M.theme] ? M.theme : "town";
}
function musicTick() {
  if (!SND.ctx || !SND.unlocked || UI.mute || !UI.musicOn) return;
  const A = SND.ctx;
  SND.want = musicPick();
  if (!SND.want) return;
  if (!SND.cur) {
    SND.cur = SND.want;
    SND.next = A.currentTime + 0.1;
    SND.step = 0;
  }
  const S = SONGS[SND.cur],
    e8 = 60 / S.bpm / 2;
  while (SND.next < A.currentTime + 0.25) {
    const bar = Math.floor(SND.step / 8),
      i = SND.step % 8,
      t = SND.next;
    const B2 = songBar(S, bar % 8);
    // 앞 소리(네모파)
    const ln = B2.lead[i];
    if (ln != null) voice("square", mtof(songNote(S, ln, 1)), t, e8 * 0.9, 0.05);
    // 베이스(세모파): 1·3·5·7 박
    if (i % 2 === 0) voice("triangle", mtof(songNote(S, B2.ch, -1) + (i === 4 ? 7 : 0)), t, e8 * 1.8, 0.09);
    // 화음 바탕(아주 작게)
    if (i === 0) [0, 2, 4].forEach((k) => voice("sine", mtof(songNote(S, B2.ch + k, 0)), t, e8 * 7.5, 0.012));
    // 북
    if (S.drum) {
      if (i % 4 === 0) kick(t);
      if (S.drum >= 1 && i % 4 === 2) snare(t, 0.035);
      if (S.drum >= 2 && i % 2 === 1) snare(t, 0.015, 7000);
    }
    SND.next += e8;
    SND.step++;
    // 마디 끝에서만 곡 바꾸기
    if (SND.step % 8 === 0 && SND.want !== SND.cur) {
      SND.cur = SND.want;
      SND.step = 0;
      break;
    }
    if (SND.step >= 64) SND.step = 0; // 8마디 되풀이
  }
}
function voice(type, f, t, dur, vol) {
  const A = SND.ctx,
    o = A.createOscillator(),
    g = A.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(SND.music);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function kick(t) {
  const A = SND.ctx,
    o = A.createOscillator(),
    g = A.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(SND.music);
  o.start(t);
  o.stop(t + 0.16);
}
function snare(t, vol, hp) {
  const A = SND.ctx,
    s = A.createBufferSource(),
    g = A.createGain(),
    f = A.createBiquadFilter();
  s.buffer = SND.noise;
  f.type = "highpass";
  f.frequency.value = hp || 1800;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  s.connect(f).connect(g).connect(SND.music);
  s.start(t);
  s.stop(t + 0.1);
}
SND.timer = setInterval(musicTick, 100);
document.addEventListener("visibilitychange", () => {
  if (!SND.ctx) return;
  if (document.hidden) SND.ctx.suspend();
  else if (SND.unlocked) SND.ctx.resume();
});

/* ── 메뉴: 음악 켜기/끄기 · 소리 크기 ── */
{
  const menu = document.querySelector(".box.menu");
  if (menu) {
    const lab = () => ["소리 작게", "소리 보통", "소리 크게"][UI.vol];
    const add = () => {
      const row = menu.querySelector(".mrow");
      if (!row || row.querySelector('[data-m="music"]')) return;
      const b1 = document.createElement("button");
      b1.type = "button";
      b1.dataset.m = "music";
      b1.textContent = (UI.musicOn ? "🎵 음악 끄기" : "🎵 음악 켜기") + (SND.cur && UI.musicOn ? " (" + SONGS[SND.cur].n + ")" : "");
      const b2 = document.createElement("button");
      b2.type = "button";
      b2.dataset.m = "vol";
      b2.textContent = "🔉 " + lab();
      row.appendChild(b1);
      row.appendChild(b2);
    };
    new MutationObserver(add).observe(menu, { childList: true });
    menu.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest('[data-m="music"],[data-m="vol"]');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.m === "music") {
          UI.musicOn = !UI.musicOn;
          b.textContent = UI.musicOn ? "🎵 음악 끄기" : "🎵 음악 켜기";
        } else {
          UI.vol = (UI.vol + 1) % 3;
          b.textContent = "🔉 " + lab();
          sfx("ok");
        }
        uiSave();
        sndVol();
      },
      true,
    );
    // 소리 끄기(예전 단추)를 누르면 음악 크기도 따라가게
    menu.addEventListener("click", (e) => {
      if (e.target.closest('[data-m="mute"]')) setTimeout(sndVol, 0);
    });
  }
}

/* ── 스킬 효과 그림(PixelLab VFX 스프라이트 시트) ── */
// 시트의 칸 위치 f([x,y]), 칸 크기 w·h, 앵커 ax·ay, 빠르기 fps. 내보낸 JSON 에서 옮김(끝의 빈 칸은 뺌)
const VFX = {"hit":{"f":[[0,0],[64,0],[128,0],[0,64],[64,64]],"w":64,"h":64,"ax":32,"ay":32,"fps":16},"slash":{"f":[[0,0],[96,0],[192,0],[0,96],[96,96],[192,96]],"w":96,"h":96,"ax":48,"ay":48,"fps":16},"shockwave":{"f":[[0,0],[112,0],[224,0],[0,64],[112,64],[224,64],[0,128]],"w":112,"h":64,"ax":56,"ay":40,"fps":14},"lightning":{"f":[[0,0],[96,0],[192,0],[288,0],[0,128],[96,128],[192,128],[288,128]],"w":96,"h":128,"ax":48,"ay":110,"fps":14},"shield":{"f":[[0,0],[96,0],[192,0],[0,96],[96,96],[192,96],[0,192],[96,192]],"w":96,"h":96,"ax":48,"ay":48,"fps":10,"loops":2},"heal":{"f":[[0,0],[80,0],[160,0],[240,0],[0,112],[80,112],[160,112],[240,112],[0,224],[80,224],[160,224],[240,224]],"w":80,"h":112,"ax":40,"ay":92,"fps":12,"loops":1},"explosion":{"f":[[0,0],[96,0],[192,0],[288,0],[0,96],[96,96],[192,96],[288,96],[0,192],[96,192]],"w":96,"h":96,"ax":48,"ay":48,"fps":14},"circle":{"f":[[0,0],[128,0],[256,0],[384,0],[0,128],[128,128],[256,128],[384,128],[0,256],[128,256],[256,256],[384,256]],"w":128,"h":128,"ax":64,"ay":64,"fps":12,"loops":1}};
const VFXRUN = [];
function vfxPlay(name, wx, wy, scale) {
  const V = VFX[name];
  if (!V || !(typeof HD === "object" && HD.on)) return false;
  const im = hdImg("vfx/" + name + ".png");
  if (!hdOk(im)) return false;
  VFXRUN.push({ V, im, wx, wy, t0: performance.now(), sc: scale || 0.5 });
  return true;
}
// 칸 위치는 시트 그림 크기로 계산(열 수가 달라도 맞게)
function vfxDraw() {
  const now = performance.now();
  for (let i = VFXRUN.length - 1; i >= 0; i--) {
    const R = VFXRUN[i],
      V = R.V,
      total = V.f.length * (V.loops || 1),
      f = Math.floor(((now - R.t0) / 1000) * V.fps);
    if (f >= total) {
      VFXRUN.splice(i, 1);
      continue;
    }
    const [sx, sy] = V.f[f % V.f.length];
    // 그림 3점 = 칸점 1(ART). sc 0.5 = 원래 크기
    const w = (V.w / ART) * R.sc * 2,
      h = (V.h / ART) * R.sc * 2;
    x.drawImage(R.im, sx, sy, V.w, V.h, R.wx - cam.x - (V.ax / V.w) * w, R.wy - cam.y - (V.ay / V.h) * h, w, h);
  }
}
{
  const fxV = drawFx;
  drawFx = function () {
    fxV();
    vfxDraw();
  };
  // 직업·스킬 모양에 맞는 그림
  const pickV = (job, eff) => {
    if (eff === "heal") return "heal";
    if (eff === "guard") return job === "mage" ? "circle" : "shield";
    if (eff === "double") return "circle";
    if (eff === "ult") return "explosion";
    if (eff === "hit3") return job === "warrior" ? "shockwave" : job === "mage" ? "lightning" : "slash";
    return job === "mage" ? "lightning" : job === "archer" ? "hit" : "slash";
  };
  const fsV = fxSkill;
  fxSkill = function (t, nm) {
    fsV(t, nm);
    const job = save.job || "knight",
      v = pickV(job, t),
      tg = B && B.m && ["slash", "hit", "lightning", "explosion", "shockwave"].includes(v) ? B.m : null;
    vfxPlay(v, tg ? tg.x : pl.x, tg ? tg.y - (v === "lightning" ? 0 : 10) : pl.y - (v === "heal" ? 0 : 10), v === "circle" ? 0.35 : 0.5);
  };
  // 약점 구슬 정답·미니 조작 성공에도 작은 터짐
  const fpV = fxPop;
  fxPop = function (wx, wy, txt, col) {
    fpV(wx, wy, txt, col);
    if (txt === "약점!") vfxPlay("hit", wx, wy + 30, 0.45);
    if (String(txt).startsWith("약점 대폭발")) vfxPlay("explosion", wx, wy + 34, 0.6);
  };
}
// 효과 그림을 미리 불러 둔다(처음 쓸 때 안 보이는 일 없게)
Object.keys(VFX).forEach((k) => hdImg("vfx/" + k + ".png"));
