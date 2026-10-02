/* ✨ 화려한 고급 아이템 (모자 · 소지품)
   원본 LPC 스프라이트를 캔버스에서 다시 색칠해 만든 파생 아이템입니다.
   새 그림을 그린 게 아니라 기존 파츠의 색만 바꾼 것이라 원본과 같은
   CC-BY-SA 3.0 / GPL 3.0 조건을 그대로 따릅니다. (AVATAR-CREDITS.md 참고)

   · avatar-sprites.js 를 먼저 읽은 뒤에 로드해야 합니다.
   · window.AV_MANIFEST 에 항목을 덧붙이므로 기존 화면 코드는 수정 없이 동작합니다.
   · 합성할 때만 window.AV_EXTRA 를 참고해 색을 입힙니다.
*/
(function(){
'use strict';
if(!window.AV_MANIFEST){ console.warn('avatar-extras: AV_MANIFEST 가 없어 건너뜁니다'); return; }

/* base: 원본 스프라이트 키 / tint: 입힐 색 / glow: 아바타 주변 발광색
   minLevel: 이 아이템만의 필요 학습 레벨 (부위 잠금보다 높은 쪽이 적용됨) */
const EX = {
  // ── 🪖 모자 ──
  a_crown_gold:   {cat:'hat', base:'hat/a_crown',   name:'황금 왕관',   tint:'#ffc93c', glow:'#ffd76a', boost:0.42, minLevel:12, price:2500},
  a_crown_rose:   {cat:'hat', base:'hat/a_crown',   name:'장미 왕관',   tint:'#ff7aa8', glow:'#ffb3cc', boost:0.22, minLevel:9,  price:1800},
  a_tiara_ice:    {cat:'hat', base:'hat/a_tiara',   name:'서리 티아라', tint:'#7fd8f5', glow:'#bdeeff', boost:0.3, minLevel:8,  price:1600},
  a_barbuta_dark: {cat:'hat', base:'hat/a_barbuta', name:'흑철 투구',   tint:'#6b5bd6', glow:'#a99bff', boost:0.18, minLevel:10, price:2000},
  a_horned_flame: {cat:'hat', base:'hat/a_horned',  name:'화염 뿔투구', tint:'#ff6a3d', glow:'#ffa06a', boost:0.26, minLevel:14, price:3000},
  a_hood_emerald: {cat:'hat', base:'hat/a_hood',    name:'비취 후드',   tint:'#35c98a', glow:'#7ff0c0', boost:0.22, minLevel:7,  price:1400},

  // ── 🎒 소지품 ──
  w_sword_flame:  {cat:'weapon', base:'weapon/w_sword',   name:'불꽃 검',     tint:'#ff5a2b', glow:'#ff9b5a', boost:0.24, minLevel:12, price:2600},
  w_sword_frost:  {cat:'weapon', base:'weapon/w_sword',   name:'서리 검',     tint:'#5ec8f0', glow:'#a8e8ff', boost:0.28, minLevel:11, price:2400},
  w_staff_arcane: {cat:'weapon', base:'weapon/w_staff',   name:'비전 지팡이', tint:'#a86bff', glow:'#cfa8ff', boost:0.24, minLevel:13, price:2800},
  w_axe_gold:     {cat:'weapon', base:'weapon/w_axe',     name:'황금 도끼',   tint:'#ffc93c', glow:'#ffe08a', boost:0.4, minLevel:15, price:3200},
  w_crystal_rose: {cat:'weapon', base:'weapon/w_crystal', name:'장미 수정',   tint:'#ff7aa8', glow:'#ffc2d8', boost:0.26, minLevel:9,  price:1900},
  w_spear_storm:  {cat:'weapon', base:'weapon/w_spear',   name:'폭풍 창',     tint:'#4fd6c4', glow:'#9ff2e6', boost:0.26, minLevel:10, price:2100}
};

/* 원본이 실제로 있는 것만 등록 (스프라이트 구성이 바뀌어도 깨지지 않게) */
const HAS = window.AV_SPRITES || {};
Object.keys(EX).forEach(id=>{
  const e = EX[id];
  if(!HAS[e.base]){ delete EX[id]; return; }
  if(!Array.isArray(window.AV_MANIFEST[e.cat])) window.AV_MANIFEST[e.cat] = [];
  window.AV_MANIFEST[e.cat].push({
    id, name: e.name, price: e.price, extra: true,
    minLevel: e.minLevel, glow: e.glow
  });
});

window.AV_EXTRA = EX;
window.AV_IS_EXTRA = id => !!EX[id];
window.AV_EXTRA_GLOW = id => (EX[id] ? EX[id].glow : null);

/* 색 입히기
   1) 'color' 블렌드로 색상만 갈아끼움 (명암은 원본 유지)
   2) boost 만큼 'screen' 으로 밝기를 올려 반짝이게 함
      — 원본이 이미 비슷한 색인 경우(예: 금색 왕관) 색만 바꾸면 티가 안 나서 필요함
   3) 원본 알파로 잘라내 모양을 그대로 보존 */
const _cache = {};
window.AV_EXTRA_CANVAS = function(id, img){
  if(!EX[id] || !img) return null;
  if(_cache[id]) return _cache[id];
  const e = EX[id];
  const cv = document.createElement('canvas');
  cv.width = img.width || 64; cv.height = img.height || 64;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;

  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = 'color';
  c.fillStyle = e.tint;
  c.fillRect(0, 0, cv.width, cv.height);

  const boost = Number(e.boost || 0);
  if(boost > 0){
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = Math.min(0.85, boost);
    c.fillStyle = e.glow || e.tint;
    c.fillRect(0, 0, cv.width, cv.height);
    c.globalAlpha = 1;
  }

  c.globalCompositeOperation = 'destination-in';   // 원본 모양 밖은 지움
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = 'source-over';
  return _cache[id] = cv;
};
/* 합성기에서 쓸 헬퍼: 이 아이템을 ctx 에 그려준다. 원본 이미지가 없으면 false
   tint 가 있으면(머리·옷 색 선택) 그 색으로 갈아입혀 그린다. */
window.AV_DRAW = function(ctx, cat, id, IMG, tint){
  const e = EX[id];
  if(e){
    const base = IMG[e.base];
    if(!base) return false;
    const cv = window.AV_EXTRA_CANVAS(id, base);
    if(!cv) return false;
    ctx.drawImage(cv, 0, 0);
    return true;
  }
  const key = cat + '/' + id;
  const im = IMG[key];
  if(!im) return false;
  if(tint && window.AV_TINT_CANVAS){
    const cv = window.AV_TINT_CANVAS(key, im, tint);
    if(cv){ ctx.drawImage(cv, 0, 0); return true; }
  }
  ctx.drawImage(im, 0, 0);
  return true;
};
})();

/* 🏠 방 테마 — 그림 없이 CSS 만으로 만든 배경.
   AV_MANIFEST 에 'room' 부위로 등록해 두면 가격 설정·판매 중지·레벨 잠금 같은
   기존 옷장 기능이 그대로 적용된다. (캐릭터에 그려지는 파츠가 아니므로 합성에서는 제외) */
(function(){
'use strict';
const ROOMS = [
  {id:'r_class',   name:'우리 교실',   price:0,    minLevel:1,
   v:{wallA:'#7f93c4',wallB:'#93a6d4',floorA:'#a9855f',floorB:'#bb9a72',
      wallLine:'rgba(255,255,255,.10)',floorLine:'rgba(0,0,0,.10)',
      winSky1:'#bde3fb',winSky2:'#7fb6e2',winFrame:'#3b4a6b'}},
  {id:'r_sunset',  name:'노을 지는 방', price:600,  minLevel:2,
   v:{wallA:'#f7a072',wallB:'#f8c8a0',floorA:'#8d5a3b',floorB:'#a4704a',
      wallLine:'rgba(255,255,255,.16)',floorLine:'rgba(0,0,0,.14)',
      winSky1:'#ffd9a0',winSky2:'#ff8f6b',winFrame:'#6b3f2f'}},
  {id:'r_forest',  name:'숲속 오두막',  price:800,  minLevel:3,
   v:{wallA:'#5c8f6a',wallB:'#7fae89',floorA:'#7a5a35',floorB:'#8f6c42',
      wallLine:'rgba(255,255,255,.13)',floorLine:'rgba(0,0,0,.16)',
      winSky1:'#d7f0c8',winSky2:'#8fc98a',winFrame:'#3c5a3f'}},
  {id:'r_ocean',   name:'바닷속 방',    price:900,  minLevel:4,
   v:{wallA:'#2f7fa8',wallB:'#57a9cc',floorA:'#c9b485',floorB:'#e0d0a6',
      wallLine:'rgba(255,255,255,.16)',floorLine:'rgba(0,0,0,.10)',
      winSky1:'#c9f2ff',winSky2:'#6fd0ef',winFrame:'#1f4f68',
      deco:'radial-gradient(circle at 20% 30%,rgba(255,255,255,.35) 2px,transparent 3px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.28) 3px,transparent 4px)'}},
  {id:'r_sakura',  name:'벚꽃 방',      price:1000, minLevel:5,
   v:{wallA:'#f2b8cf',wallB:'#f9d8e6',floorA:'#a3735c',floorB:'#bd8d72',
      wallLine:'rgba(255,255,255,.22)',floorLine:'rgba(0,0,0,.12)',
      winSky1:'#ffe6f1',winSky2:'#f7a8c8',winFrame:'#7d4a5e',
      deco:'radial-gradient(circle at 30% 20%,rgba(255,255,255,.55) 2px,transparent 3px),radial-gradient(circle at 80% 45%,rgba(255,255,255,.45) 2px,transparent 3px)'}},
  {id:'r_snow',    name:'눈 내리는 방', price:1200, minLevel:7,
   v:{wallA:'#8fb6d8',wallB:'#c3dcef',floorA:'#dfe9f2',floorB:'#f2f7fb',
      wallLine:'rgba(255,255,255,.28)',floorLine:'rgba(0,0,0,.06)',
      winSky1:'#eaf6ff',winSky2:'#a8ccea',winFrame:'#46617a',
      deco:'radial-gradient(circle at 25% 25%,rgba(255,255,255,.75) 2px,transparent 3px),radial-gradient(circle at 65% 55%,rgba(255,255,255,.6) 2px,transparent 3px),radial-gradient(circle at 85% 15%,rgba(255,255,255,.5) 2px,transparent 3px)'}},
  {id:'r_space',   name:'우주 정거장',  price:1600, minLevel:10,
   v:{wallA:'#16183a',wallB:'#2b2f5e',floorA:'#3a3f6b',floorB:'#4d5386',
      wallLine:'rgba(255,255,255,.08)',floorLine:'rgba(255,255,255,.10)',
      winSky1:'#2b2f5e',winSky2:'#0b0c22',winFrame:'#8f95c9',
      deco:'radial-gradient(circle at 15% 20%,#fff 1px,transparent 2px),radial-gradient(circle at 45% 12%,#fff 1px,transparent 2px),radial-gradient(circle at 72% 30%,#ffe9a8 1.5px,transparent 2.5px),radial-gradient(circle at 88% 8%,#fff 1px,transparent 2px)'}},
  {id:'r_neon',    name:'야경 방',      price:2000, minLevel:13,
   v:{wallA:'#241b3d',wallB:'#3c2a5e',floorA:'#2a2140',floorB:'#3b2f57',
      wallLine:'rgba(120,220,255,.14)',floorLine:'rgba(255,120,220,.14)',
      winSky1:'#ff7ad9',winSky2:'#5b8cff',winFrame:'#120e1f',
      deco:'radial-gradient(circle at 20% 35%,rgba(255,122,217,.5) 2px,transparent 4px),radial-gradient(circle at 75% 18%,rgba(91,140,255,.5) 2px,transparent 4px)'}}
];
window.AV_ROOMS = ROOMS;
window.AV_ROOM = id => ROOMS.find(r=>r.id===id) || ROOMS[0];
/* 스테이지에 인라인으로 넣을 CSS 변수 문자열 */
window.AV_ROOM_STYLE = function(id){
  const r = window.AV_ROOM(id), v = r.v || {};
  const parts = Object.keys(v).map(k => '--' + k + ':' + v[k]);
  parts.push('--deco:' + (v.deco ? v.deco : 'none'));
  return parts.join(';');
};
if(window.AV_MANIFEST){
  window.AV_MANIFEST.room = ROOMS.map(r=>({id:r.id, name:r.name, price:r.price, minLevel:r.minLevel, isRoom:true}));
}
})();

/* 🎨 머리·옷 색상 — 스타일과 별개로 고르는 색.
   아이템을 색깔별로 늘리면(헤어 12종 × 8색 = 96개) 옷장이 못 쓰게 되므로,
   '무엇을 입을지'와 '무슨 색으로 입을지'를 분리한다. */
(function(){
'use strict';
const NONE = {id:'', name:'기본', color:null};
window.AV_TINTS = {
  hair: [NONE,
    {id:'h_black',  name:'검정',   color:'#2f2a28', mul:0.55},
    {id:'h_brown',  name:'갈색',   color:'#7a4a25', mul:0.15},
    {id:'h_blonde', name:'금발',   color:'#e8c05a', scr:0.28},
    {id:'h_red',    name:'빨강',   color:'#c8452f'},
    {id:'h_pink',   name:'분홍',   color:'#f07ab0'},
    {id:'h_blue',   name:'파랑',   color:'#4a7fd6'},
    {id:'h_mint',   name:'민트',   color:'#4fc9b0'},
    {id:'h_purple', name:'보라',   color:'#9b6ad6'}],
  top: [NONE,
    {id:'c_white',  name:'흰색',   color:'#e8e8ea', scr:0.5},
    {id:'c_black',  name:'검정',   color:'#3a3a42', mul:0.6},
    {id:'c_red',    name:'빨강',   color:'#d64545'},
    {id:'c_orange', name:'주황',   color:'#e88b3d'},
    {id:'c_yellow', name:'노랑',   color:'#e8c93d', scr:0.22},
    {id:'c_green',  name:'초록',   color:'#4aab6a'},
    {id:'c_blue',   name:'파랑',   color:'#4a7fd6'},
    {id:'c_purple', name:'보라',   color:'#8f5fc9'}]
};
window.AV_TINTS.bottom = window.AV_TINTS.top;      // 하의도 같은 팔레트
window.AV_TINTABLE = ['hair','top','bottom'];
window.AV_TINT_COLOR = function(cat, tintId){
  const list = window.AV_TINTS[cat];
  if(!list || !tintId) return null;
  const t = list.find(x => x.id === tintId);
  return (t && t.color) ? t : null;      // 정의 객체째로 (색 + 명도 조절값)
};

/* 색 입힌 스프라이트 (키+색 조합으로 캐시) */
const _tc = {};
window.AV_TINT_CANVAS = function(cacheKey, img, tint){
  if(!img || !tint) return null;
  const def = (typeof tint === 'string') ? {id:tint, color:tint} : tint;
  if(!def.color) return null;
  const k = cacheKey + '|' + (def.id || def.color);
  if(_tc[k]) return _tc[k];
  const cv = document.createElement('canvas');
  cv.width = img.width || 64; cv.height = img.height || 64;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(img, 0, 0);

  c.globalCompositeOperation = 'color';        // 색상만 갈아끼움 (명암 유지)
  c.fillStyle = def.color;
  c.fillRect(0, 0, cv.width, cv.height);

  // 'color' 블렌드는 명도를 보존해서 검정·흰색이 안 나온다 → 명도를 따로 조절
  if(def.mul > 0){
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = Math.min(0.9, def.mul);
    c.fillStyle = def.color;
    c.fillRect(0, 0, cv.width, cv.height);
    c.globalAlpha = 1;
  }
  if(def.scr > 0){
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = Math.min(0.9, def.scr);
    c.fillStyle = def.color;
    c.fillRect(0, 0, cv.width, cv.height);
    c.globalAlpha = 1;
  }

  c.globalCompositeOperation = 'destination-in';
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = 'source-over';
  return _tc[k] = cv;
};
})();

/* 🐾 펫 — 16×16 픽셀아트. 색상 격자를 코드에 담아 캔버스로 그린다.
   (직접 그린 것이라 LPC 라이선스와 무관한 자체 제작물)
   캐릭터 위에 겹쳐 그리지 않고 방 안 옆자리에 세우므로 합성 레이어에는 넣지 않는다. */
(function(){
'use strict';
const G = {
  cat:[
'................','..DD.......DD...','.DLBD.....DBLD..','.DBBBD...DBBBD..',
'.DBBBBDDDBBBBD..','..DBBBBBBBBBD...','.DBBBBBBBBBBBD..','.DBBEBBBBBEBBD..',
'.DBBBBBNNBBBBD..','.DWBBBBBBBBBWD..','..DBBBBBBBBBD.DD','...DBBBBBBBD.DBD',
'...DBBBBBBBDDBD.','...DBBBBBBBBBD..','...DDBDDDBDDD...','.....DD..DD.....'],
  dog:[
'................','..DD.......DD...','.DBBD.....DBBD..','.DBBBDDDDDBBBD..',
'.DBBBBBBBBBBBD..','.DBBBBBBBBBBBD..','.DBBEBBBBBEBBD..','.DBBBBBBBBBBBD..',
'..DBBBLLLBBBD...','..DBBLLNLLBBD...','...DBLLLLLLBD...','...DBBLLLLBBD...',
'....DBBBBBBD....','....DBBBBBBD....','...DDBDDDDBDD...','.....DD..DD.....'],
  chick:[
'................','.......DDD......','......DBLBD.....','.....DBBLBBD....',
'.....DBEBEBD....','.....DBBNBBD....','....DDBBBBBDD...','...DLLBBBBBLLD..',
'..DLLLBBBBBLLLD.','..DLLLBBBBBLLLD.','...DLLBBBBBLLD..','....DDBBBBBDD...',
'.....DBBBBBD....','.....DDBBBDD....','......DNNND.....','.......DDD......'],
  slime:[
'................','................','.......DD.......','......DLLD......',
'.....DBLLBD.....','....DBBLLBBD....','...DBBBBBBBBD...','..DBBBBBBBBBBD..',
'..DBEEBBBBEEBD..','.DBBEEBBBBEEBBD.','.DBBBBBNNBBBBBD.','.DBBBBBBBBBBBBD.',
'.DBBBBBBBBBBBBD.','..DBBBBBBBBBBD..','...DDDDDDDDDD...','................'],
  rabbit:[
'................','...DD...DD......','..DBLD.DBLD.....','..DBLD.DBLD.....',
'..DBLD.DBLD.....','..DBBDDDBBD.....','...DBBBBBBD.....','..DBBBBBBBBD....',
'..DBEBBBBEBD....','..DBBBNNBBBD....','.DBBBBBBBBBBD...','.DBBBBBBBBBBD...',
'.DBBBBBBBBBBD...','..DBBBBBBBBD....','..DDBDDDDBDD....','....DD..DD......']
};
/* 펫 목록: 같은 그림에 팔레트만 달리해 종류를 늘림 */
const PETS = [
  {id:'p_chick',  name:'병아리',     g:'chick',  price:400,  minLevel:5,
   pal:{D:'#a8761a',B:'#ffd93d',L:'#fff1a8',E:'#2b2119',N:'#f2932b',W:'#fff'}},
  {id:'p_cat',    name:'고양이',     g:'cat',    price:600,  minLevel:5,
   pal:{D:'#4a3b32',B:'#e8a552',L:'#f7c98a',E:'#2b2119',N:'#f08a9b',W:'#fff3e0'}},
  {id:'p_dog',    name:'강아지',     g:'dog',    price:700,  minLevel:5,
   pal:{D:'#4a3226',B:'#c98a5a',L:'#f0d3b0',E:'#241a12',N:'#3a2a20',W:'#fff'}},
  {id:'p_slime',  name:'슬라임',     g:'slime',  price:800,  minLevel:5,
   pal:{D:'#2f7a63',B:'#5fd6a8',L:'#c7f7e4',E:'#1b3a30',N:'#fff',W:'#fff'}},
  {id:'p_rabbit', name:'토끼',       g:'rabbit', price:900,  minLevel:5,
   pal:{D:'#8a8f9c',B:'#f2f2f5',L:'#ffffff',E:'#2b2119',N:'#f0a0b0',W:'#fff'}},
  {id:'p_cat_bk', name:'검은 고양이', g:'cat',    price:1200, minLevel:5,
   pal:{D:'#1e1c22',B:'#4a4552',L:'#6b6577',E:'#ffd93d',N:'#f08a9b',W:'#8a8496'}},
  {id:'p_slime_p',name:'분홍 슬라임', g:'slime',  price:1500, minLevel:5,
   pal:{D:'#9c3f6b',B:'#f07ab0',L:'#ffd0e6',E:'#4a1f33',N:'#fff',W:'#fff'}},
  {id:'p_chick_g',name:'황금 병아리', g:'chick',  price:2000, minLevel:5,
   pal:{D:'#7a4a00',B:'#f5b400',L:'#fff3a8',E:'#2b2119',N:'#c96400',W:'#ffffff'}}
];
window.AV_PETS = PETS;
window.AV_PET = id => PETS.find(p=>p.id===id) || null;

const _pc = {};
/* 펫 그림 → dataURL (32×32 로 2배 확대해 두면 화면에서 선명함) */
window.AV_PET_URL = function(id){
  const p = window.AV_PET(id);
  if(!p) return '';
  if(_pc[id]) return _pc[id];
  const grid = G[p.g], S = 2, N = 16;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N * S;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const ch = grid[y][x];
    if(ch === '.' || !p.pal[ch]) continue;
    c.fillStyle = p.pal[ch];
    c.fillRect(x*S, y*S, S, S);
  }
  return _pc[id] = cv.toDataURL('image/png');
};
if(window.AV_MANIFEST){
  window.AV_MANIFEST.pet = PETS.map(p=>({id:p.id, name:p.name, price:p.price, minLevel:p.minLevel, isPet:true}));
}
})();
