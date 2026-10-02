/* ─────────────────────────────────────────────────────────────────────────
   boss-sprites.js — 반 보스 도감 (벡터 SVG · 픽셀 아트)

   pet-sprites.js 와 같은 방식이되 격자가 48×48 이다.
   보스는 화면에서 크게(140px 이상) 뜨므로 32칸으로는 뿔·균열·손가락 같은
   디테일이 안 들어간다. 칸을 늘리면 그만큼 위압감이 산다.

   좌우 대칭축은 x=23.5 — mrect/mell/mpoly 를 쓰면 양쪽이 한 번에 그려진다.
   대칭으로 형태를 잡고, 명암만 왼쪽 밝게 / 오른쪽 어둡게 넣어 입체를 만든다.

   공개 API : window.BOSS_SPECIES              종류 목록
              window.BOSS_SVG(key, opt)        SVG 문자열
              window.BOSS_DATAURL(key, size, opt)
                opt = { rage:true, size:n }    rage = 체력 절반 이하일 때
   ───────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

const N = 48;
const MX = N - 1;                 // 대칭: x → MX - x

/* ── 팔레트 ── */
const BASE = {
  K:'#11131a',                    // 외곽선
  S:'#79838f', L:'#a6b1bd', D:'#4b5460', X:'#2c323b',   // 돌: 기본/밝은면/그늘/틈
  G:'#ffb43d', H:'#ffe9a8', E:'#ffcf5c',                // 빛나는 코어 / 하이라이트 / 눈
  M:'#5d9e52', m:'#3d6d36',                             // 이끼
  W:'#ffffff'
};

const SPECIES = [
  { key:'golem', name:'돌골렘', icon:'🗿', color:'#8b7a63',
    pal:  {},
    rage: {G:'#ff5230', H:'#ffd2c2', E:'#ff7d52', X:'#3a2622'} }
];

/* ── 격자 ───────────────────────────────────────────────── */
function Grid(){ this.d = new Array(N*N).fill('.'); }
Grid.prototype.set = function(x,y,c){
  x = Math.round(x); y = Math.round(y);
  if(x<0 || y<0 || x>=N || y>=N) return;
  this.d[y*N+x] = c;
};
Grid.prototype.get = function(x,y){
  return (x<0||y<0||x>=N||y>=N) ? '.' : this.d[y*N+x];
};
Grid.prototype.rect = function(x0,y0,x1,y1,c){
  for(let y=Math.round(y0); y<=Math.round(y1); y++)
    for(let x=Math.round(x0); x<=Math.round(x1); x++) this.set(x,y,c);
};
Grid.prototype.ell = function(cx,cy,rx,ry,c){
  const x0=Math.floor(cx-rx-1), x1=Math.ceil(cx+rx+1);
  const y0=Math.floor(cy-ry-1), y1=Math.ceil(cy+ry+1);
  for(let y=y0; y<=y1; y++) for(let x=x0; x<=x1; x++){
    const dx=(x+0.5-cx)/rx, dy=(y+0.5-cy)/ry;
    if(dx*dx+dy*dy <= 1) this.set(x,y,c);
  }
};
Grid.prototype.poly = function(pts,c){
  let ymin=1e9, ymax=-1e9;
  pts.forEach(p=>{ if(p[1]<ymin)ymin=p[1]; if(p[1]>ymax)ymax=p[1]; });
  for(let y=Math.floor(ymin); y<=Math.ceil(ymax); y++){
    const yc=y+0.5, xs=[];
    for(let i=0,j=pts.length-1; i<pts.length; j=i++){
      const a=pts[j], b=pts[i];
      if((a[1]>yc) !== (b[1]>yc))
        xs.push(a[0] + (yc-a[1])/(b[1]-a[1])*(b[0]-a[0]));
    }
    xs.sort((p,q)=>p-q);
    for(let k=0; k+1<xs.length; k+=2)
      for(let x=Math.floor(xs[k]); x<=Math.ceil(xs[k+1]); x++)
        if(x+0.5>=xs[k] && x+0.5<=xs[k+1]) this.set(x,y,c);
  }
};
Grid.prototype.line = function(x0,y0,x1,y1,c,w){
  w = w||1;
  const steps = Math.max(Math.abs(x1-x0), Math.abs(y1-y0))*2 + 1;
  const off = (w-1)>>1;
  for(let i=0; i<=steps; i++){
    const t=i/steps, px=Math.round(x0+(x1-x0)*t), py=Math.round(y0+(y1-y0)*t);
    for(let dy=0; dy<w; dy++) for(let dx=0; dx<w; dx++)
      this.set(px+dx-off, py+dy-off, c);
  }
};
/* 좌우 동시 — 왼쪽 좌표만 주면 오른쪽은 알아서 */
Grid.prototype.mrect = function(x0,y0,x1,y1,c){
  this.rect(x0,y0,x1,y1,c); this.rect(MX-x1,y0,MX-x0,y1,c);
};
Grid.prototype.mell = function(cx,cy,rx,ry,c){
  this.ell(cx,cy,rx,ry,c); this.ell(MX-cx,cy,rx,ry,c);
};
Grid.prototype.mpoly = function(pts,c){
  this.poly(pts,c); this.poly(pts.map(p=>[MX-p[0],p[1]]),c);
};
Grid.prototype.mline = function(x0,y0,x1,y1,c,w){
  this.line(x0,y0,x1,y1,c,w); this.line(MX-x0,y0,MX-x1,y1,c,w);
};
/* 실루엣 바깥 한 칸을 외곽선으로 (맨 마지막) */
Grid.prototype.outline = function(c){
  const add=[];
  for(let y=0; y<N; y++) for(let x=0; x<N; x++){
    if(this.get(x,y) !== '.') continue;
    if(this.get(x-1,y)!=='.' || this.get(x+1,y)!=='.' ||
       this.get(x,y-1)!=='.' || this.get(x,y+1)!=='.') add.push([x,y]);
  }
  add.forEach(p=>this.set(p[0],p[1],c));
};

/* ── 그림 ───────────────────────────────────────────────── */
const ART = {

/* 🗿 돌골렘
   위압감의 정체는 비율이다 — 어깨를 머리보다 높게, 머리는 작게 파묻고,
   주먹은 머리보다 크게. 그러면 같은 화면 크기에서도 훨씬 무겁게 보인다. */
golem: function(g, rage){
  /* 빛나는 것은 눈과 가슴 코어 둘뿐이다. 균열은 평소엔 어두운 홈이고,
     분노했을 때만 같은 자리가 타오른다 — 그래서 상태 변화가 한눈에 온다. */
  const CRACK = rage ? 'G' : 'X';

  /* 다리 — 짧고 좁게. 몸통 아래에 숨어야 상체가 커 보인다 */
  g.mrect(17,36,22,44,'D');
  g.mrect(18,36,21,42,'S');
  g.mrect(16,44,23,46,'D');                    // 발
  g.mrect(17,44,22,45,'S');

  /* 몸통 — 넓게. 팔보다 확실히 두꺼워야 세 기둥처럼 안 보인다 */
  g.poly([[12,14],[35,14],[33,29],[31,38],[16,38],[14,29]],'S');
  g.poly([[12,14],[16,14],[17,38],[16,38],[14,29]],'L');   // 왼쪽 밝은면
  g.poly([[31,14],[35,14],[33,29],[31,38],[30,38]],'D');   // 오른쪽 그늘
  g.rect(16,36,31,38,'D');                                 // 허리 그늘
  g.line(15,29,32,29,'X',1);                               // 갈비 결

  /* 어깨 — 각지게. 매끈한 타원은 돌이 아니라 근육처럼 보인다 */
  g.mpoly([[2,19],[5,10],[11,6],[18,13],[20,23],[9,27]],'S');
  g.poly([[5,10],[11,6],[15,11],[7,16]],'L');
  g.poly([[MX-5,10],[MX-11,6],[MX-15,11],[MX-7,16]],'D');
  g.mline(9,27,20,23,'X',1);                   // 어깨와 몸통 사이 결

  /* 팔 — 몸통보다 가늘게, 어깨 밑에서 바로 내려온다 */
  g.mpoly([[1,26],[10,24],[12,35],[3,37]],'S');
  g.poly([[1,26],[5,25],[6,36],[3,37]],'L');
  g.poly([[MX-1,26],[MX-5,25],[MX-6,36],[MX-3,37]],'D');

  /* 주먹 — 위압감은 손에서 나온다. 뭉툭한 돌덩이로 */
  g.mpoly([[0,34],[11,33],[12,43],[1,45]],'S');
  g.poly([[0,34],[5,33.5],[6,44],[1,45]],'L');
  g.poly([[MX-0,34],[MX-5,33.5],[MX-6,44],[MX-1,45]],'D');
  g.mline(0,38,11,37,'X',1);                   // 손가락 골
  g.mline(1,41,11,40,'X',1);

  /* 머리 — 작게. 주둥이를 붙이면 고릴라가 되므로 각진 바위로 둔다 */
  g.poly([[19,7],[28,7],[30,12],[29,20],[18,20],[17,12]],'S');
  g.poly([[19,7],[22,7],[18,13],[17,12]],'L');
  g.poly([[28,7],[30,12],[29,20],[27,20]],'D');
  g.poly([[18,11],[29,11],[28,16],[19,16]],'X');     // 깊은 그늘 — 눈만 보인다
  g.rect(19,17,28,20,'D');                           // 턱
  g.mline(20,20,22,20,'X',1);                        // 이빨 틈

  /* 눈 */
  g.mrect(20,12,22,14,'G');
  g.mrect(21,13,21,13,'H');

  /* 가슴 코어 — 반 전체가 때려서 깨는 곳. 원보다 결정 모양이 낫다 */
  g.poly([[23.5,21],[28,27],[23.5,33],[19,27]],'X');
  g.poly([[23.5,23],[26.5,27],[23.5,31],[20.5,27]],'G');
  g.poly([[23.5,24.5],[25,27],[23.5,29],[22,27]],'H');

  /* 균열 — 코어에서 사방으로 뻗치면 거미처럼 보인다.
     결을 따라 세로로 흐르게 두고, 분노했을 때 이 자리가 타오른다. */
  g.mline(17,18,19,24,CRACK,1);
  g.mline(19,31,17,37,CRACK,1);
  if(rage){
    g.mline(13,11,15,18,CRACK,1);              // 어깨
    g.mline(6,29,8,37,CRACK,1);                // 팔
    g.mline(20,39,19,44,CRACK,1);              // 다리
    g.poly([[23.5,22],[27.5,27],[23.5,32],[19.5,27]],'G');   // 코어가 부풀어 오른다
    g.poly([[23.5,24],[25.5,27],[23.5,30],[21.5,27]],'H');
  }

  /* 이끼 — 오래된 것이라는 신호.
     가로로 길게 깔면 머리띠처럼 보인다. 작게 흩어 얹는다. */
  g.ell(9,10.5,2.6,1.3,'M');  g.ell(13,12,1.6,1,'M');  g.set(6,12,'M');
  g.ell(MX-9,10.5,2.6,1.3,'m'); g.ell(MX-13,12,1.6,1,'m'); g.set(MX-6,12,'m');
  g.ell(19,37,2,1,'M');  g.ell(MX-19,37,2,1,'m');      // 허리께에도 조금
}

};

/* ── 만들기 ─────────────────────────────────────────────── */
const _cache = {};
function build(key, rage){
  const g = new Grid();
  (ART[key] || ART.golem)(g, !!rage);
  g.outline('K');
  const runs = {};
  for(let y=0; y<N; y++){
    let x=0;
    while(x<N){
      const c=g.get(x,y);
      if(c==='.'){ x++; continue; }
      let w=1; while(x+w<N && g.get(x+w,y)===c) w++;
      (runs[c] = runs[c] || []).push([x,y,w]);
      x += w;
    }
  }
  return runs;
}
function paletteOf(key, rage, override){
  const sp = SPECIES.find(s=>s.key===key);
  return Object.assign({}, BASE, sp ? sp.pal : {},
                       (rage && sp) ? sp.rage : {}, override || {});
}

function bossSVG(key, opt){
  opt = opt || {};
  const rage = !!opt.rage;
  const ck = key+'|'+(rage?'r':'n');
  const runs = _cache[ck] || (_cache[ck] = build(key, rage));
  const pal = paletteOf(key, rage, opt.pal);
  let body = '';
  for(const c in runs){
    const color = pal[c]; if(!color) continue;
    let d = '';
    runs[c].forEach(r=>{ d += 'M'+r[0]+' '+r[1]+'h'+r[2]+'v1h-'+r[2]+'z'; });
    body += '<path fill="'+color+'" d="'+d+'"/>';
  }
  const wh = opt.size ? ' width="'+opt.size+'" height="'+opt.size+'"' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+N+' '+N+'"'+wh+
         ' shape-rendering="crispEdges">'+body+'</svg>';
}
function bossDataURL(key, size, opt){
  return 'data:image/svg+xml;charset=utf-8,' +
         encodeURIComponent(bossSVG(key, Object.assign({size:size||160}, opt||{})));
}

window.BOSS_SPECIES = SPECIES;
window.BOSS_SVG     = bossSVG;
window.BOSS_DATAURL = bossDataURL;
window.BOSS_INFO    = function(key){ return SPECIES.find(s=>s.key===key) || null; };

})();
