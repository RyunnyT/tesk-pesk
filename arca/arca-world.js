/* 🗺️ 아르카 연대기 — 루멘 마을 (Phaser 장면)
   타일은 LPC Tile Atlas(32칸)에서 가져온다. 지도는 코드로 그린다:
     · 땅: 풀 · 물: 바다(물가 자동 연결) · 길: 흙길(가장자리 자동 연결)
   건물·나무는 아틀라스 조각을 붙여 만든 그림이고, 아래쪽만 부딪힌다(지붕 뒤로 걸어 들어갈 수 있게).
   이야기 진행은 모른다. 화면(index.html)이 준 onInteract·markOf 로만 이야기와 이어진다. */
(function(root){
'use strict';
const T = 32, W = 46, H = 34;
const TERRAIN = 'assets/tiles/atlas/terrain_atlas.png', BASEOUT = 'assets/tiles/atlas/base_out_atlas.png';
const idx = (tx, ty) => ty * 32 + tx;   // 아틀라스는 가로 32칸

/* ── 지형 ── */
function isWater(x, y){
  if(x < 0 || y < 0 || x >= W || y >= H) return true;   // 지도 밖은 바다로 본다(가장자리에 물가가 생기지 않게)
  return y >= 29 || (x >= 36 && y >= 23) || (x >= 41 && y >= 20);
}
const PATHS = [
  [2, 16, 45, 17],          // 큰길 (서쪽 끝 → 동쪽 들판)
  [20, 7, 21, 27],          // 남북 길 (길드 → 등대 길)
  [16, 12, 25, 21],         // 광장
  [8, 17, 9, 25],           // 숙소 가는 길
  [6, 12, 7, 16],           // 수련장 가는 길
  [33, 12, 34, 16],         // 도서관 가는 길
  [20, 26, 31, 27],         // 등대 가는 길
  [38, 8, 44, 15]           // 동쪽 들판 공터
];
function isPath(x, y){
  if(x < 0 || y < 0 || x >= W || y >= H) return false;
  return PATHS.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
}
/* 자동 연결 — LPC 지형 블록(3×6칸): 위 2줄 안쪽 모서리 · 가운데 3×3 바깥 테두리 · 맨 아래 채움 */
function autotile(has, x, y, ox, oy, variants){
  const n = has(x, y - 1), s = has(x, y + 1), w = has(x - 1, y), e = has(x + 1, y);
  if(!n && !w) return idx(ox, oy + 2);
  if(!n && !e) return idx(ox + 2, oy + 2);
  if(!s && !w) return idx(ox, oy + 4);
  if(!s && !e) return idx(ox + 2, oy + 4);
  if(!n) return idx(ox + 1, oy + 2);
  if(!s) return idx(ox + 1, oy + 4);
  if(!w) return idx(ox, oy + 3);
  if(!e) return idx(ox + 2, oy + 3);
  if(!has(x + 1, y + 1)) return idx(ox + 1, oy);
  if(!has(x - 1, y + 1)) return idx(ox + 2, oy);
  if(!has(x + 1, y - 1)) return idx(ox + 1, oy + 1);
  if(!has(x - 1, y - 1)) return idx(ox + 2, oy + 1);
  return variants ? variants(x, y) : idx(ox + 1, oy + 3);
}
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

/* ── 건물·장식 (그림 조각 · 놓을 칸 · 부딪히는 칸) ──
   house: 지붕 3줄 + 벽 3줄, 가운데 아래가 문 */
const BUILDINGS = [
  { kind:'house', x:5,  y:7,  sign:null,  label:'train' },
  { kind:'house', x:19, y:5,  sign:30,    label:'guild' },       // 칼 간판 = 모험가 길드
  { kind:'house', x:15, y:5,  sign:31 },                         // 잡화점(장식)
  { kind:'house', x:32, y:7,  sign:null,  label:'library', tint:'#8fa6d8' },
  { kind:'house', x:7,  y:19, sign:29,    label:'home' },        // INN 간판 = 견습생 숙소
  { kind:'house', x:24, y:6,  sign:null },
  { kind:'tower', x:30, y:18, label:'lighthouse' }
];
const PROPS = [
  { kind:'fountain', x:22, y:14 }, { kind:'barrels', x:16, y:19 }, { kind:'barrels', x:11, y:23 },
  { kind:'sign', x:37, y:15, text:'동쪽 들판 →' }
];

/* 상호작용 지점 — 장소(id)는 이야기 대본의 장소와 같다 */
const SPOTS = [
  { id:'home',       npc:null,     x:8.5,  y:25.2, door:true },
  { id:'train',      npc:'mentor', x:9,    y:13.5 },
  { id:'guild',      npc:'dora',   x:22.7, y:11.5 },
  { id:'square',     npc:'marta',  x:17.5, y:18.5 },
  { id:'library',    npc:'momo',   x:35.6, y:13.5 },
  { id:'lighthouse', npc:'oscar',  x:28.5, y:27.6 },
  { id:'field',      npc:null,     x:37.5, y:16.2, signpost:true }
];
const EXTRA_NPCS = [ { npc:'kai', x:18.3, y:11.6, talk:'kai' } ];
const MONSTER_AT = { x:42, y:11 };

/* 사람 키보다 높은 것만 뒤로 걸어갈 수 있게, 그림 아래쪽 기준으로 깊이를 정한다 */
function makeScene(opts){
  return class TownScene extends Phaser.Scene {
    constructor(){ super('town'); }
    preload(){
      this.load.image('terrain', TERRAIN);
      this.load.image('baseout', BASEOUT);
      this.load.spritesheet('terrainTiles', TERRAIN, { frameWidth:T, frameHeight:T });
    }
    create(){
      const sc = this;
      this.cameras.main.setBackgroundColor('#2a6a8a');
      /* 타일 지도 */
      const map = this.make.tilemap({ tileWidth:T, tileHeight:T, width:W, height:H });
      const ts = map.addTilesetImage('terrain', 'terrain', T, T, 0, 0);
      const ground = map.createBlankLayer('ground', ts), water = map.createBlankLayer('water', ts), path = map.createBlankLayer('path', ts);
      const grassVar = (x, y) => { const r = hash(x, y); return r < .78 ? idx(22, 3) : idx(21 + Math.floor((r - .78) / .22 * 3), 5); };
      for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
        ground.putTileAt(grassVar(x, y), x, y);
        if(isWater(x, y)) water.putTileAt(autotile(isWater, x, y, 6, 9, () => idx(7, 12)), x, y);
        if(isPath(x, y)) path.putTileAt(autotile(isPath, x, y, 15, 0, (a, b) => hash(b, a) < .7 ? idx(16, 3) : idx(15 + Math.floor(hash(a + 9, b) * 3), 5)), x, y);
      }
      water.setCollisionByExclusion([-1]);
      this.physics.world.setBounds(0, 0, W * T, H * T);

      /* 그림 조각 만들기 */
      const B = this.textures.get('baseout').getSourceImage(), TR = this.textures.get('terrain').getSourceImage();
      const piece = (key, w, h, draw) => { if(this.textures.exists(key)) return key; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x); this.textures.addCanvas(key, c); return key; };
      const tile = (x, img, tx, ty, dx, dy) => x.drawImage(img, tx * T, ty * T, T, T, dx * T, dy * T, T, T);
      const houseKey = tint => piece('house' + (tint || ''), 96, 192, x => {
        [12, 13, 14].forEach((r, j) => [0, 1, 2].forEach(i => tile(x, B, i, r, i, j)));
        [9, 10, 11].forEach((r, j) => [0, 1, 2].forEach(i => tile(x, B, i, r, i, j + 3)));
        tile(x, B, 3, 9, 1, 4); tile(x, B, 3, 10, 1, 5);
        if(tint){ x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .28; x.fillStyle = tint; x.fillRect(0, 0, 96, 96); }
      });
      piece('tower', 96, 350, x => x.drawImage(B, 512, 674, 96, 350, 0, 0, 96, 350));
      piece('pine', 62, 152, x => x.drawImage(TR, 962, 0, 62, 152, 0, 0, 62, 152));
      piece('oak', 92, 126, x => x.drawImage(TR, 928, 893, 92, 126, 0, 0, 92, 126));
      piece('bush', 60, 101, x => x.drawImage(TR, 866, 920, 60, 101, 0, 0, 60, 101));
      piece('fountain', 32, 64, x => { tile(x, B, 17, 12, 0, 0); tile(x, B, 17, 13, 0, 1); });
      piece('barrels', 64, 64, x => { tile(x, B, 18, 14, 0, 0); tile(x, B, 19, 14, 1, 0); tile(x, B, 18, 15, 0, 1); tile(x, B, 19, 15, 1, 1); });
      [29, 30, 31].forEach(n => piece('sign' + n, 32, 32, x => tile(x, B, n, 10, 0, 0)));
      piece('post', 32, 64, x => { tile(x, B, 12, 16, 0, 0); tile(x, B, 12, 17, 0, 1); });

      const walls = this.physics.add.staticGroup();
      const block = (px, py, w, h) => { const r = sc.add.rectangle(px + w / 2, py + h / 2, w, h); r.setVisible(false); walls.add(r); };
      const put = (key, px, py, ox, oy) => { const s = sc.add.image(px, py, key).setOrigin(ox == null ? 0 : ox, oy == null ? 0 : oy); s.setDepth(py + s.height * (1 - s.originY)); return s; };
      const occupied = new Set();
      const mark = (x0, y0, w, h) => { for(let y = y0; y < y0 + h; y++) for(let x = x0; x < x0 + w; x++) occupied.add(x + ',' + y); };

      BUILDINGS.forEach(b => {
        if(b.kind === 'house'){
          put(houseKey(b.tint), b.x * T, b.y * T);
          block(b.x * T + 2, (b.y + 3) * T, 92, 3 * T - 6);
          if(b.sign) put('sign' + b.sign, (b.x + 2) * T + 4, (b.y + 4) * T - 6).setDepth((b.y + 6) * T + 1);
          mark(b.x - 1, b.y, 5, 7);
        } else if(b.kind === 'tower'){
          put('tower', b.x * T, b.y * T);
          block(b.x * T + 6, (b.y + 8) * T, 84, 3 * T - 4);
          mark(b.x - 1, b.y + 4, 5, 8);
        }
      });
      PROPS.forEach(p => {
        if(p.kind === 'fountain'){ put('fountain', p.x * T, p.y * T); block(p.x * T + 2, p.y * T + 34, 28, 26); }
        if(p.kind === 'barrels'){ put('barrels', p.x * T, p.y * T); block(p.x * T + 4, p.y * T + 24, 56, 38); }
        if(p.kind === 'sign'){ put('post', p.x * T, p.y * T - 32); }
        mark(p.x - 1, p.y - 1, 3, 3);
      });
      /* 나무 — 길·물·건물 둘레와 사람 자리는 비우고, 가장자리와 빈터에 흩뿌린다 */
      const spotsTaken = SPOTS.concat(EXTRA_NPCS).map(s => [Math.floor(s.x), Math.floor(s.y)]);
      const clear = (x, y) => { for(let dy = -2; dy <= 1; dy++) for(let dx = -2; dx <= 2; dx++){ const a = x + dx, b = y + dy; if(isPath(a, b) || isWater(a, b) || occupied.has(a + ',' + b)) return false; } return !spotsTaken.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - y) < 3); };
      const trees = [];
      for(let y = 2; y < H - 2; y += 2) for(let x = 1; x < W - 1; x += 2){
        const edge = x < 4 || y < 4 || x > W - 4, r = hash(x * 3, y * 7);
        if((edge ? r < .8 : r < .16) && clear(x, y) && !trees.some(t => Math.abs(t[0] - x) < 2 && Math.abs(t[1] - y) < 2)) trees.push([x, y]);
      }
      trees.forEach(([x, y]) => {
        const kind = ['pine', 'oak', 'bush'][Math.floor(hash(x, y * 5) * 3)];
        const s = put(kind, x * T + 16, y * T + 30, .5, 1);
        block(x * T + 6, y * T + 14, 20, 14);
      });

      /* 주인공·펫 */
      this.anims.create({ key:'hero-up',    frames:this.anims.generateFrameNumbers('hero', { start:1,  end:8 }),  frameRate:10, repeat:-1 });
      this.anims.create({ key:'hero-left',  frames:this.anims.generateFrameNumbers('hero', { start:10, end:17 }), frameRate:10, repeat:-1 });
      this.anims.create({ key:'hero-down',  frames:this.anims.generateFrameNumbers('hero', { start:19, end:26 }), frameRate:10, repeat:-1 });
      this.anims.create({ key:'hero-right', frames:this.anims.generateFrameNumbers('hero', { start:28, end:35 }), frameRate:10, repeat:-1 });
      const start = opts.start || { x:8.5, y:26.5 };
      const hero = this.physics.add.sprite(start.x * T, start.y * T, 'hero', 18).setOrigin(.5, .9);
      hero.body.setSize(22, 14).setOffset(21, 46);
      hero.setCollideWorldBounds(true);
      this.physics.add.collider(hero, walls);
      this.physics.add.collider(hero, water);
      this.hero = hero; this.facing = 'down';
      const pet = this.add.image(hero.x - 24, hero.y, 'pet').setOrigin(.5, .9).setScale(.32);
      this.pet = pet; this.trail = [];

      /* 사람들 */
      this.people = [];
      const addPerson = (npcId, x, y, spot) => {
        const key = 'npc-' + npcId;
        let obj;
        if(npcId === 'momo') obj = this.add.image(x * T, y * T, 'momo').setOrigin(.5, .9).setScale(1.1);
        else obj = this.add.sprite(x * T, y * T, key, 18).setOrigin(.5, .9);
        obj.setDepth(obj.y);
        block(x * T - 11, y * T - 12, 22, 12);
        const markTxt = this.add.text(x * T, y * T - 66, '', { fontFamily:'Jua, sans-serif', fontSize:'26px', color:'#3a2a10', stroke:'#fff7d6', strokeThickness:5 }).setOrigin(.5).setDepth(9999);
        this.tweens.add({ targets:markTxt, y:markTxt.y - 6, duration:600, yoyo:true, repeat:-1, ease:'Sine.inOut' });
        const name = this.add.text(x * T, y * T + 4, opts.nameOf(npcId), { fontFamily:'Jua, sans-serif', fontSize:'12px', color:'#fff', backgroundColor:'rgba(20,24,48,.65)', padding:{ x:4, y:1 } }).setOrigin(.5, 0).setDepth(9998);
        this.people.push({ spot, npcId, obj, markTxt, name, x:x * T, y:y * T });
      };
      SPOTS.forEach(s => {
        if(s.npc) addPerson(s.npc === 'mentor' ? opts.mentorId : s.npc, s.x, s.y, s);
        else {
          const markTxt = this.add.text(s.x * T, s.y * T - (s.door ? 70 : 54), '', { fontFamily:'Jua, sans-serif', fontSize:'26px', color:'#3a2a10', stroke:'#fff7d6', strokeThickness:5 }).setOrigin(.5).setDepth(9999);
          this.tweens.add({ targets:markTxt, y:markTxt.y - 6, duration:600, yoyo:true, repeat:-1, ease:'Sine.inOut' });
          this.people.push({ spot:s, npcId:null, obj:null, markTxt, x:s.x * T, y:s.y * T });
        }
      });
      EXTRA_NPCS.forEach(n => addPerson(n.npc, n.x, n.y, { id:null, talk:n.talk }));
      /* 들판 안개와 몬스터 */
      this.fog = this.add.graphics().setDepth(5);
      this.monster = this.add.image(MONSTER_AT.x * T, MONSTER_AT.y * T, 'monster').setOrigin(.5, .9).setScale(.55).setTint(0xc4c8de).setAlpha(.92).setVisible(false);
      this.tweens.add({ targets:this.monster, scaleY:.5, duration:500, yoyo:true, repeat:-1, ease:'Sine.inOut' });

      /* 카메라 */
      const cam = this.cameras.main;
      cam.setBounds(0, 0, W * T, H * T);
      cam.startFollow(hero, true, .12, .12);
      cam.setRoundPixels(true);
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());

      /* 입력 */
      this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER');
      this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());
      this.input.keyboard.on('keydown-ENTER', () => this.tryInteract());
      this.near = null;
      this.prompt = this.add.text(0, 0, '💬 말하기', { fontFamily:'Jua, sans-serif', fontSize:'13px', color:'#2a1d07', backgroundColor:'#f0c86c', padding:{ x:6, y:3 } }).setOrigin(.5).setDepth(10000).setVisible(false);
      this.refresh();
      opts.onReady && opts.onReady(this);
    }
    fitZoom(){
      const w = this.scale.width, h = this.scale.height;
      this.cameras.main.setZoom(Math.max(1, Math.min(2.2, Math.min(w / 520, h / 420))));
    }
    /* 이야기 상태가 바뀌면 머리 위 표시·안개·몬스터를 다시 그린다 */
    refresh(){
      this.people.forEach(p => {
        const m = p.spot.id ? opts.markOf(p.spot.id) : null;
        p.markTxt.setText(m ? m.sym : '');
        p.markTxt.setColor(m ? m.color : '#fff');
      });
      const st = opts.worldState ? opts.worldState() : {};
      this.fog.clear();
      if(st.erased){
        for(let i = 0; i < 14; i++){ this.fog.fillStyle(0xf6f5f0, .07 + i * .012); this.fog.fillEllipse(W * T - 40, 11 * T, 420 - i * 22, 330 - i * 16); }
      }
      this.monster.setVisible(!!st.monster);
      if(st.monster) this.monster.setDepth(this.monster.y);
    }
    tryInteract(){
      if(opts.isBusy() || !this.near) return;
      opts.onInteract(this.near);
    }
    update(){
      const hero = this.hero, k = this.keys, js = opts.joystick();
      let vx = 0, vy = 0;
      if(!opts.isBusy()){
        if(k.LEFT.isDown || k.A.isDown) vx -= 1;
        if(k.RIGHT.isDown || k.D.isDown) vx += 1;
        if(k.UP.isDown || k.W.isDown) vy -= 1;
        if(k.DOWN.isDown || k.S.isDown) vy += 1;
        if(js && (Math.abs(js.x) > .2 || Math.abs(js.y) > .2)){ vx = js.x; vy = js.y; }
      }
      const len = Math.hypot(vx, vy), speed = 150;
      if(len > 0){ vx = vx / Math.max(1, len) * speed; vy = vy / Math.max(1, len) * speed; }
      hero.setVelocity(vx, vy);
      if(len > 0){
        this.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
        hero.anims.play('hero-' + this.facing, true);
      } else {
        hero.anims.stop();
        hero.setFrame({ up:0, left:9, down:18, right:27 }[this.facing]);
      }
      hero.setDepth(hero.y);
      /* 펫은 조금 뒤에서 따라온다 */
      this.trail.push([hero.x, hero.y]); if(this.trail.length > 18) this.trail.shift();
      const [px, py] = this.trail[0];
      this.pet.x += (px - 20 - this.pet.x) * .2; this.pet.y += (py - this.pet.y) * .2;
      this.pet.setFlipX(px < this.pet.x - 1).setDepth(this.pet.y);
      /* 가까운 사람 찾기 */
      let best = null, bd = 60;
      this.people.forEach(p => { const d = Math.hypot(p.x - hero.x, p.y - hero.y); if(d < bd){ bd = d; best = p; } });
      if(this.monster.visible){ const d = Math.hypot(this.monster.x - hero.x, this.monster.y - hero.y); if(d < 70){ best = { spot:{ id:'field' }, monster:true, x:this.monster.x, y:this.monster.y + 8 }; } }
      this.near = best;
      this.prompt.setVisible(!!best && !opts.isBusy());
      if(best) this.prompt.setText(best.monster ? '⚔️ 싸우기' : best.spot.door ? '🚪 들어가기' : best.spot.signpost ? '🪧 살펴보기' : '💬 말하기').setPosition(best.x, best.y - 92);
      opts.onNear && opts.onNear(best);
    }
  };
}

async function urlToCanvas(url, w, h){
  return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w || im.width; c.height = h || im.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height); res(c); }; im.onerror = () => res(null); im.src = url; });
}
/* 모모 — 16칸 부엉이 (자체 제작 픽셀) */
function owlCanvas(){
  const G = ['....K......K....','...KBK....KBK...','...KBBKKKKBBK...','..KBBBBBBBBBBK..','..KBWWBBBBWWBK..','.KBWKEWBBWKEWBK.',
             '.KBWEEWNNWEEWBK.','.KBBWWBNNBWWBBK.','.KBLLLBBBBLLLBK.','.KBLDLLLLLLDLBK.','..KBLLDLLDLLBK..','..KBBLLLLLLBBK..',
             '...KBBBBBBBBK...','....KOK..KOK....','....KKK..KKK....','................'];
  const P = { K:'#2b1d12', B:'#8a6440', W:'#fff3d6', E:'#f2b632', N:'#e08a2c', L:'#d9b98a', D:'#a8875c', O:'#e08a2c' };
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  G.forEach((row, j) => [...row].forEach((ch, i) => { if(P[ch]){ x.fillStyle = P[ch]; x.fillRect(i * 2, j * 2, 2, 2); } }));
  return c;
}

/* 시작: 캐릭터 시트를 모두 만든 뒤 Phaser 를 띄운다 */
async function start(opts){
  const S = root.ARCA_SPRITES;
  const heroSheet = await S.compose(opts.heroLook, 'walk');
  const npcSheets = {};
  for(const id of ['dora','kai','marta','oscar', opts.mentorId]) npcSheets[id] = await S.compose(S.NPC_LOOK[id], 'walk');
  const petC = await urlToCanvas(opts.petURL, 128, 128), monC = await urlToCanvas(opts.monsterURL, 160, 160);
  const Scene = makeScene(opts);
  const game = new Phaser.Game({
    type:Phaser.AUTO, parent:opts.parent, pixelArt:true, backgroundColor:'#0d1020',
    scale:{ mode:Phaser.Scale.RESIZE, width:'100%', height:'100%' },
    physics:{ default:'arcade', arcade:{ debug:false } },
    scene:[class Boot extends Phaser.Scene {
      constructor(){ super('boot'); }
      create(){
        this.textures.addSpriteSheet('hero', heroSheet, { frameWidth:64, frameHeight:64 });
        Object.entries(npcSheets).forEach(([id, c]) => this.textures.addSpriteSheet('npc-' + id, c, { frameWidth:64, frameHeight:64 }));
        if(petC) this.textures.addCanvas('pet', petC);
        if(monC) this.textures.addCanvas('monster', monC);
        this.textures.addCanvas('momo', owlCanvas());
        this.scene.start('town');
      }
    }, Scene]
  });
  return { game, heroSheet, npcSheets, scene:() => game.scene.getScene('town') };
}

root.ARCA_WORLD = { start, owlCanvas, SPOTS, W, H };
})(window);
