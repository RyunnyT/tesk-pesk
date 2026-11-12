/* 🧍 아르카 연대기 — LPC 캐릭터 합성
   LPC 원본 시트(몸·머리·눈·옷·머리카락·무기)를 겹쳐 캐릭터 한 명의 시트를 만든다.
   · walk  : 64칸, 9프레임 × 4방향 (위·왼쪽·아래·오른쪽)
   · attack: 128칸, 6프레임 × 4방향 — 큰 무기(128·192칸)도 가운데를 맞춰 넣는다
   색은 '곱하기'로 입힌다. 흰 옷·회색 머리에 잘 먹고, 원래 투명한 곳은 그대로 둔다.
   그림 출처는 assets/CREDITS.md. */
(function(root){
'use strict';
const BASE = 'assets/lpc/';
const DIRS = ['up','left','down','right'];

/* 직업별 옷차림 — 겉모습만 다르고 능력 차이는 없다 */
const JOB_LOOK = {
  knight:  { torso:'plate',      weapon:'sword' },
  warrior: { torso:'chainmail',  weapon:'waraxe' },
  mage:    { torso:'longsleeve', torsoTint:'#8a6ce0', legsTint:'#5b4a8c', weapon:'staff' },
  archer:  { torso:'leather',    torsoTint:'#6fae5f', legsTint:'#5e6b45', weapon:'dagger' }
};

/* NPC 생김새 */
const NPC_LOOK = {
  dora:  { sex:'f', hair:'long',    hairTint:'#6b3b2a', torso:'longsleeve', torsoTint:'#e58aa7', legsTint:'#7a4a5a' },
  kai:   { sex:'m', hair:'bangs',   hairTint:'#2e3550', torso:'longsleeve', torsoTint:'#4d6fb8', legsTint:'#33405e', weapon:'dagger' },
  marta: { sex:'f', head:'female_elderly', hair:'bob', hairTint:'#d6d6d6', torso:'longsleeve', torsoTint:'#c9935a', legsTint:'#8a6a4a' },
  oscar: { sex:'m', head:'male_elderly',   hair:'buzzcut', hairTint:'#cfcfcf', torso:'longsleeve', torsoTint:'#3f5f8a', legsTint:'#3a3a48' },
  bran:  { sex:'m', head:'male_elderly',   hair:'buzzcut', hairTint:'#bdbdbd', torso:'plate', weapon:'sword' },
  gord:  { sex:'m', hair:'buzzcut', hairTint:'#3b2a20', torso:'chainmail', legsTint:'#5a4632', weapon:'waraxe' },
  iset:  { sex:'f', hair:'long',    hairTint:'#3a2a55', torso:'longsleeve', torsoTint:'#5b3fa8', legsTint:'#3a2a55', weapon:'staff' },
  pila:  { sex:'f', hair:'bangs',   hairTint:'#5a7a3a', torso:'leather', torsoTint:'#4f7a43', legsTint:'#45503a', weapon:'dagger' }
};

const WEAPONS = {
  sword:  { walk:['weapon/sword/arming/universal/walk/bg.png', 'weapon/sword/arming/universal/walk/fg.png'],
            attack:['weapon/sword/arming/attack_slash/bg.png', 'weapon/sword/arming/attack_slash/fg.png'] },
  waraxe: { walk:['weapon/blunt/waraxe/behind/walk/waraxe.png', 'weapon/blunt/waraxe/walk/waraxe.png'],
            attack:['weapon/blunt/waraxe/attack_slash/behind/waraxe.png', 'weapon/blunt/waraxe/attack_slash/waraxe.png'] },
  staff:  { walk:['weapon/magic/simple/background/walk/simple.png', 'weapon/magic/simple/foreground/walk/simple.png'],
            attack:[null, null] },   // 마법사는 지팡이를 들어 올리는 대신 별빛을 쏜다
  dagger: { walk:['weapon/sword/dagger/behind/walk/dagger.png', 'weapon/sword/dagger/walk/dagger.png'],
            attack:['weapon/sword/dagger/behind/slash/dagger.png', 'weapon/sword/dagger/slash/dagger.png'] }
};

function torsoPath(kind, g){
  if(kind === 'plate') return 'torso/armour/plate/' + g + '/';
  if(kind === 'leather') return 'torso/armour/leather/' + g + '/';
  if(kind === 'chainmail') return g === 'male' ? 'torso/chainmail/male/' : 'torso/armour/leather/female/';
  return 'torso/clothes/longsleeve/longsleeve/' + g + '/';
}
/* 겹치는 순서: 무기 뒤 → 몸 → 머리 → 눈 → 신발 → 바지 → 윗옷 → 머리카락 → 무기 앞 */
function layers(look, anim){
  const f = look.sex === 'f', g = f ? 'female' : 'male', thin = f ? 'thin' : 'male';
  const a = anim === 'attack' ? 'slash' : 'walk';
  const w = look.weapon ? WEAPONS[look.weapon][anim] : [null, null];
  return [
    { src:w[0] },
    { src:'body/bodies/' + g + '/' + a + '.png' },
    { src:'head/heads/human/' + (look.head || g) + '/' + a + '.png' },
    { src:look.head && look.head.includes('elderly') ? null : 'eyes/human/adult/default/' + a + '.png' },
    { src:'feet/boots/basic/' + thin + '/' + a + '.png', tint:look.feetTint },
    { src:'legs/pants/' + thin + '/' + a + '.png', tint:look.legsTint || '#6b5a48' },
    { src:torsoPath(look.torso, g) + a + '.png', tint:look.torsoTint },
    { src:look.hair ? 'hair/' + look.hair + '/adult/' + a + '.png' : null, tint:look.hairTint },
    { src:w[1] }
  ].filter(l => l.src);
}

const IMG = {};
function loadImg(src){
  if(IMG[src]) return IMG[src];
  return (IMG[src] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = BASE + src; }));
}
function tinted(im, color){
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.filter = 'grayscale(1) brightness(1.25)';   // 주황 머리도 회색·검정으로 칠할 수 있게 먼저 색을 뺀다
  x.drawImage(im, 0, 0);
  x.filter = 'none';
  x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
  return c;
}
/* 시트 하나 합성. 칸 크기가 다른 층은 칸마다 가운데를 맞춰 옮긴다 */
async function compose(look, anim){
  const cell = anim === 'attack' ? 128 : 64, frames = anim === 'attack' ? 6 : 9;
  const out = document.createElement('canvas'); out.width = cell * frames; out.height = cell * 4;
  const ctx = out.getContext('2d'); ctx.imageSmoothingEnabled = false;
  for(const l of layers(look, anim)){
    let im = await loadImg(l.src);
    if(!im) continue;
    if(l.tint) im = tinted(im, l.tint);
    const src = im.height / 4, n = Math.min(frames, Math.round(im.width / src)), off = (cell - src) / 2;
    for(let d = 0; d < 4; d++) for(let i = 0; i < n; i++)
      ctx.drawImage(im, i * src, d * src, src, src, i * cell + off, d * cell + off, src, src);
  }
  return out;
}
function heroLook(job, sex){
  const j = JOB_LOOK[job] || JOB_LOOK.knight;
  return Object.assign({ sex, hair:sex === 'f' ? 'bob' : 'messy1' }, j);
}
/* 한 프레임만 잘라 그림 문자열로 (대화 얼굴·만들기 화면용) */
function frameURL(sheet, cell, frame, dir, crop){
  const c = document.createElement('canvas'), s = crop || cell;
  c.width = c.height = s;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const o = (cell - s) / 2;
  x.drawImage(sheet, frame * cell + o, DIRS.indexOf(dir) * cell + o, s, s, 0, 0, s, s);
  return c.toDataURL();
}
/* 얼굴 확대 — 머리 부분만 */
function faceURL(sheet){
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(sheet, 16, 128 + 6, 32, 32, 0, 0, 32, 32);
  return c.toDataURL();
}

root.ARCA_SPRITES = { DIRS, JOB_LOOK, NPC_LOOK, compose, heroLook, frameURL, faceURL };
})(window);
