/* ─────────────────────────────────────────────────────────────────────────
   pet-sprites.js — 펫 도감 (벡터 SVG · 픽셀 아트 · 3단계 진화)

   그리는 법 : 32×32 픽셀 격자 위에 원/다각형/선으로 그린 뒤,
               같은 색 칸을 가로로 이어 붙여 SVG <path> 로 내보낸다.
               → 결과가 벡터라 아무리 키워도 안 뭉개지고,
                 칸이 정사각형이라 화면에서는 픽셀아트로 보인다. (굽지 않음)

   진화 조건 : 펫을 데려온 순간의 레벨(adoptedLevel) 기준
               +3레벨 → 2단계(성장) / +8레벨 → 3단계(완전체)

   공개 API  : window.PET_SPECIES  종류 목록 {key,name,pal}
               window.PET_STAGE(level, adoptedLevel)      → 1|2|3
               window.PET_PROGRESS(level, adoptedLevel)   → 진화 진행 정보
               window.PET_SVG(key, stage, palOverride)    → SVG 문자열
               window.PET_DATAURL(key, stage, size, pal)  → data:image/svg+xml
   ───────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

const N = 32;              // 격자 한 변 (좌우 대칭축은 x=16)
const EVO2 = 3, EVO3 = 8;  // 진화에 필요한 "데려온 뒤 오른 레벨"

/* ── 공통 팔레트 ── (종류별로 B/D/L/N 만 덮어씀) */
const BASE = {
  K:'#17131b',  // 외곽선
  E:'#17131b',  // 눈
  W:'#ffffff',  // 하이라이트
  B:'#cccccc', D:'#999999', L:'#eeeeee', N:'#f295ad',   // 몸(기본값)
  O:'#f58d25', R:'#c93b2f', Y:'#f4c84a', T:'#7c4a31',   // 주황·빨강·금·갈색
  S:'#aebdcc', s:'#566676', H:'#e7f4ff',                // 강철·강철어둠·광택
  C:'#35d9f2', V:'#836ee0', M:'#56cf5b', P:'#f2919f'    // 얼음·보라·초록·분홍
};

/* ── 종류 ── */
const SPECIES = [
  {key:'chick',  name:'병아리', pal:{B:'#ffd94f',D:'#e9a62c',L:'#fff3c4',N:'#f58d25'},
   stages:['병아리','중병아리','수탉','황금 왕 수탉']},
  {key:'cat',    name:'고양이', pal:{B:'#ee8322',D:'#bd551f',L:'#ffd486',N:'#f2919f'},
   stages:['아기 고양이','고양이','기사 고양이','고양이 왕']},
  {key:'dog',    name:'강아지', pal:{B:'#c1793e',D:'#7c4a31',L:'#f2d193',N:'#33241b'},
   stages:['강아지','개','기사 강아지','개의 왕']},
  {key:'slime',  name:'슬라임', pal:{B:'#49a7e8',D:'#236fa7',L:'#b8f8ff',N:'#ffffff'},
   stages:['꼬마 슬라임','슬라임','얼음 슬라임','슬라임 왕']},
  {key:'rabbit', name:'토끼',   pal:{B:'#f3efe3',D:'#c9c2ad',L:'#ffffff',N:'#f295ad'},
   stages:['아기 토끼','토끼','기사 토끼','토끼 왕']}
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
/* 칸 좌표(포함) 사각형 */
Grid.prototype.rect = function(x0,y0,x1,y1,c){
  for(let y=Math.round(y0); y<=Math.round(y1); y++)
    for(let x=Math.round(x0); x<=Math.round(x1); x++) this.set(x,y,c);
};
/* 연속 좌표 타원 (칸 중심으로 판정) */
Grid.prototype.ell = function(cx,cy,rx,ry,c){
  const x0=Math.floor(cx-rx-1), x1=Math.ceil(cx+rx+1);
  const y0=Math.floor(cy-ry-1), y1=Math.ceil(cy+ry+1);
  for(let y=y0; y<=y1; y++) for(let x=x0; x<=x1; x++){
    const dx=(x+0.5-cx)/rx, dy=(y+0.5-cy)/ry;
    if(dx*dx+dy*dy <= 1) this.set(x,y,c);
  }
};
/* 연속 좌표 다각형 (짝홀 규칙 스캔라인) */
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
/* 두께 w 의 직선 */
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
/* 실루엣 바깥 한 칸을 외곽선으로 (그리기 맨 마지막) */
Grid.prototype.outline = function(c){
  const add=[];
  for(let y=0; y<N; y++) for(let x=0; x<N; x++){
    if(this.get(x,y) !== '.') continue;
    if(this.get(x-1,y)!=='.' || this.get(x+1,y)!=='.' ||
       this.get(x,y-1)!=='.' || this.get(x,y+1)!=='.') add.push([x,y]);
  }
  add.forEach(p=>this.set(p[0],p[1],c));
};

/* ── 부품 ───────────────────────────────────────────────── */
/* 동그란 눈 (좌우 대칭축 15.5 기준, x=바깥쪽 시작칸) */
function eyes(g,x,y,w,h){
  g.rect(x, y, x+w-1, y+h-1, 'E');
  g.rect(31-x-w+1, y, 31-x, y+h-1, 'E');
  if(h >= 3){ g.set(x, y, 'W'); g.set(31-x-w+1, y, 'W'); }   // 2px 눈은 점광이 눈을 다 먹는다
}
/* 사나운 눈 */
function angryEyes(g,x,y,w,h){
  g.poly([[x,y+1],[x+w,y],[x+w,y+h],[x,y+h]], 'E');
  g.poly([[32-x,y+1],[32-x-w,y],[32-x-w,y+h],[32-x,y+h]], 'E');
}
/* 투구 (cx=16 고정, y=이마 윗줄) */
function helmet(g,y,halfW,plume){
  const x0=16-halfW, x1=16+halfW-1;
  g.rect(x0, y+2, x1, y+5, 'S');           // 챙
  g.rect(x0+2, y, x1-2, y+2, 'S');         // 돔
  g.rect(x0+3, y+1, x1-5, y+2, 'H');       // 광택
  g.rect(x0, y+5, x1, y+6, 's');           // 아래 테
  if(plume){ g.rect(15, y-4, 16, y, plume); g.rect(14, y-3, 17, y-1, plume); }
}
/* 가슴 갑옷 */
function armor(g,y0,y1,halfW){
  const x0=16-halfW, x1=16+halfW-1;
  g.rect(x0, y0, x1, y1, 'S');
  g.rect(x0+2, y0+1, x1-4, y0+3, 'H');
  g.rect(x0, y1-1, x1, y1, 's');
  g.rect(15, y0+2, 16, y1-2, 's');
}
/* 검 (오른쪽 아래 → 위로) */
function sword(g,x,y){
  g.line(x, y, x+6, y-13, 'H', 3);
  g.line(x+1, y-1, x+6, y-12, 'W', 1);
  g.rect(x-3, y, x+4, y+1, 'Y');           // 코등이
  g.rect(x-1, y+2, x+1, y+5, 'T');         // 손잡이
}
/* 방패 (왼쪽) */
function shield(g,x,y,mark){
  g.poly([[x,y+2],[x+4,y],[x+9,y+2],[x+9,y+10],[x+4.5,y+15],[x,y+10]], 's');
  g.poly([[x+1.5,y+3.5],[x+4,y+2],[x+7.5,y+3.5],[x+7.5,y+9.5],[x+4.5,y+13],[x+1.5,y+9.5]], 'S');
  if(mark) mark(g,x,y);
}

/* ── 그림 ───────────────────────────────────────────────── */
const ART = {

/* 🐣 병아리 → 중병아리 → 수탉 */
chick:[
function(g){                                   // 1단계 · 아기
  g.rect(12,25,13,29,'O'); g.rect(18,25,19,29,'O');       // 다리
  g.rect(10,29,14,29,'O'); g.rect(17,29,21,29,'O');       // 발
  g.ell(16,20,6.5,6.5,'B');                               // 몸
  g.ell(16,22,4,3.5,'L');                                 // 배
  g.poly([[14,21],[18,21],[16,24]],'N');                  // 부리
  eyes(g,12,17,2,2);
  g.set(16,13,'D'); g.set(16,12,'D'); g.set(17,11,'D');   // 머리깃
},
function(g){                                   // 2단계 · 성장
  g.rect(11,26,13,30,'O'); g.rect(18,26,20,30,'O');
  g.rect(9,30,14,30,'O');  g.rect(17,30,22,30,'O');
  g.ell(6.5,20,2.5,5,'D'); g.ell(25.5,20,2.5,5,'D');      // 날개
  g.ell(16,19,9,9.5,'B');
  g.ell(16,22,5.5,5,'L');
  g.rect(13,8,14,11,'R'); g.rect(15,6,16,11,'R'); g.rect(17,8,18,11,'R'); // 볏
  g.poly([[13,20],[19,20],[16,24]],'N');
  eyes(g,11,15,3,3);
  g.ell(9,22,2,1.5,'N'); g.ell(23,22,2,1.5,'N');          // 볼
},
function(g){                                   // 3단계 · 수탉
  /* 꼬리깃 — 겹치는 삼각형 3장을 밝고 어둡게 번갈아 (틈을 두면 외곽선이 메워버린다) */
  g.poly([[13,25],[2,13],[6,8],[16,19]],'D');
  g.poly([[13,25],[6,11],[11,6],[17,19]],'B');
  g.poly([[14,25],[12,9],[16,7],[19,21]],'D');
  g.rect(16,26,17,30,'O'); g.rect(21,26,22,30,'O');       // 다리
  g.rect(14,30,19,30,'O'); g.rect(19,30,24,30,'O');       // 발
  g.ell(19,21,7,6.5,'B');                                 // 몸통
  g.ell(17,22,4.5,3.5,'D');                               // 날개
  g.ell(22,23,3,3,'L');                                   // 가슴털
  g.poly([[16,20],[22,20],[23,11],[17,10]],'B');          // 목
  g.ell(20,9,4.5,4,'B');                                  // 머리
  g.rect(17,3,18,7,'R'); g.rect(19,2,20,7,'R'); g.rect(21,3,22,7,'R'); // 볏
  g.rect(19,13,20,15,'R');                                // 육수
  g.poly([[24,9],[28,10.5],[24,12]],'N');                 // 부리
  g.rect(20,7,21,8,'E'); g.set(20,7,'W');
}],

/* 🐱 아기 고양이 → 고양이 → 기사 고양이 */
cat:[
function(g){                                   // 1단계
  g.line(22,26,26,22,'D',2); g.line(26,22,26,19,'D',2);   // 꼬리
  g.ell(16,24,6,5,'B');                                   // 몸
  g.ell(16,25,3.5,3,'L');
  g.rect(11,27,13,28,'L'); g.rect(18,27,20,28,'L');       // 발
  g.poly([[10,13],[9,5],[16,12]],'B');                    // 귀
  g.poly([[22,13],[23,5],[16,12]],'B');
  g.poly([[11.5,12],[10.8,7.5],[15,11.5]],'N');
  g.poly([[20.5,12],[21.2,7.5],[17,11.5]],'N');
  g.ell(16,15,6,5.5,'B');                                 // 머리
  eyes(g,12,14,2,3);
  g.rect(15,17,16,17,'N');                                // 코
  g.set(14,19,'D'); g.set(17,19,'D');
},
function(g){                                   // 2단계
  g.line(24,26,29,20,'D',3); g.line(29,20,28,15,'D',3);
  g.ell(16,23,7.5,7,'B');
  g.ell(16,25,4.5,4,'L');
  g.rect(10,28,13,29,'L'); g.rect(18,28,21,29,'L');
  g.poly([[9,11],[7,2],[16,10]],'B');
  g.poly([[23,11],[25,2],[16,10]],'B');
  g.poly([[10.5,10],[9.2,4.5],[15,9.5]],'N');
  g.poly([[21.5,10],[22.8,4.5],[17,9.5]],'N');
  g.ell(16,13,7,6.5,'B');
  g.rect(13,5,14,7,'D'); g.rect(15,4,16,7,'D'); g.rect(17,5,18,7,'D'); // 무늬
  eyes(g,11,11,3,3);
  g.rect(15,15,16,16,'N');
  g.set(13,18,'D'); g.set(18,18,'D');
  g.rect(10,19,21,20,'R');                                // 목걸이
  g.rect(15,21,16,22,'Y');                                // 방울
},
function(g){                                   // 3단계 · 기사
  g.poly([[9,15],[3,29],[16,29],[13,15]],'R');            // 망토
  g.line(25,26,29,20,'D',3);
  g.ell(16,22,8,7.5,'B');
  g.ell(16,24,4.5,4,'L');
  g.rect(9,28,13,29,'L'); g.rect(18,28,22,29,'L');
  g.poly([[9,11],[7,3],[15,10]],'B');                     // 귀
  g.poly([[23,11],[25,3],[17,10]],'B');
  g.ell(16,13,7,6.5,'B');
  armor(g,18,27,6);
  g.rect(14,22,17,24,'Y'); g.rect(15,19,16,20,'Y');       // 발바닥 문장
  g.set(13,20,'Y'); g.set(18,20,'Y');
  angryEyes(g,10,11,4,4);
  g.rect(15,17,16,18,'N');
  helmet(g,3,7,'R');
  sword(g,25,26);
  shield(g,1,14,function(gg,x,y){                         // 십자 문장
    gg.rect(x+4,y+4,x+5,y+11,'Y'); gg.rect(x+2,y+6,x+7,y+7,'Y'); });
}],

/* 🐶 강아지 → 개 → 기사 강아지 */
dog:[
function(g){                                   // 1단계
  g.line(23,25,27,21,'D',2);
  g.ell(16,24,7,5.5,'B');
  g.ell(16,25,4,3,'L');
  g.rect(11,27,13,28,'L'); g.rect(18,27,20,28,'L');
  g.ell(8.5,15,2.5,5,'D'); g.ell(23.5,15,2.5,5,'D');      // 귀
  g.ell(16,14,6.5,5.5,'B');
  g.ell(16,18,4,3,'L');                                   // 주둥이
  eyes(g,12,12,2,3);
  g.rect(15,17,16,18,'N');
  g.set(15,20,'D'); g.set(16,20,'D');
},
function(g){                                   // 2단계
  g.line(24,24,29,18,'D',3);
  g.ell(16,23,8,7,'B');
  g.ell(16,25,5,4,'L');
  g.rect(10,28,13,30,'L'); g.rect(18,28,21,30,'L');
  g.ell(7,14,3,6.5,'D'); g.ell(25,14,3,6.5,'D');
  g.ell(16,13,7.5,6.5,'B');
  g.ell(16,17,5,3.5,'L');                                 // 주둥이
  eyes(g,11,10,3,3);
  g.rect(15,15,16,16,'N');                                // 코
  g.rect(15,17,16,17,'D'); g.rect(13,18,18,18,'D');       // 입
  g.rect(15,19,16,20,'P');                                // 혀
  g.rect(9,22,22,23,'R');                                 // 목걸이
  g.rect(15,24,16,25,'Y');                                // 이름표
},
function(g){                                   // 3단계 · 기사
  g.poly([[10,16],[4,29],[17,29],[14,16]],'s');           // 망토
  g.ell(16,22,8.5,7.5,'B');
  g.ell(16,24,4.5,4,'L');
  g.rect(9,28,13,30,'L'); g.rect(18,28,22,30,'L');
  g.ell(6.5,14,3,6,'D'); g.ell(25.5,14,3,6,'D');
  g.ell(16,13,7.5,6.5,'B');
  g.ell(16,17,4.5,3,'L');
  armor(g,18,27,7);
  angryEyes(g,10,10,4,4);
  g.rect(15,16,16,17,'N');
  helmet(g,2,7,'C');
  /* 철퇴 */
  g.line(25,27,28,19,'T',2);
  g.ell(28,16,3.5,3.5,'S'); g.set(28,13,'H'); g.set(24,16,'H'); g.set(31,16,'H');
  shield(g,1,14,function(gg,x,y){                         // 뼈다귀 문장
    gg.rect(x+4,y+5,x+5,y+10,'W');
    gg.set(x+3,y+4,'W'); gg.set(x+6,y+4,'W');
    gg.set(x+3,y+11,'W'); gg.set(x+6,y+11,'W'); });
}],

/* 🟦 꼬마 슬라임 → 슬라임 → 얼음 슬라임 */
slime:[
function(g){                                   // 1단계
  g.ell(16,24,8,6,'B');
  g.rect(8,24,23,28,'B');
  g.rect(8,26,23,28,'D');
  g.ell(11,20,2.5,1.5,'L');
  eyes(g,12,21,2,3);
  g.rect(14,26,17,26,'K'); g.set(13,25,'K'); g.set(18,25,'K');
},
function(g){                                   // 2단계
  g.ell(16,22,11,9,'B');
  g.rect(5,22,26,29,'B');
  g.rect(5,27,26,29,'D');
  g.set(16,10,'B'); g.set(15,11,'B'); g.set(16,11,'B');   // 물방울 뿔
  g.ell(10,17,3.5,2,'L');
  eyes(g,10,18,3,4);
  g.rect(13,25,18,26,'K'); g.set(12,24,'K'); g.set(19,24,'K');
  g.ell(7,22,2,1.5,'L'); g.ell(25,22,2,1.5,'L');
},
function(g){                                   // 3단계 · 얼음
  g.poly([[6,16],[10,3],[14,16]],'H');                    // 얼음 뿔
  g.poly([[13,14],[16,0],[20,14]],'H');
  g.poly([[19,16],[24,4],[27,16]],'H');
  g.ell(16,21,12,10,'C');
  g.rect(4,21,27,29,'C');
  g.rect(4,27,27,29,'D');
  g.ell(9,15,4,2.5,'H');
  angryEyes(g,8,17,5,5);
  g.rect(12,25,19,26,'K'); g.set(11,24,'K'); g.set(20,24,'K');
  g.rect(13,26,14,27,'W'); g.rect(17,26,18,27,'W');       // 송곳니
  g.set(2,12,'V'); g.set(29,12,'V'); g.set(4,25,'V'); g.set(27,25,'V');
  g.set(1,19,'C'); g.set(30,19,'C');
}],

/* 🐰 아기 토끼 → 토끼 → 기사 토끼 */
rabbit:[
function(g){                                   // 1단계
  g.ell(11.5,10,2.5,6,'B'); g.ell(20.5,10,2.5,6,'B');     // 귀
  g.ell(11.5,10,1,4,'N');   g.ell(20.5,10,1,4,'N');
  g.ell(16,25,7,5,'B');
  g.ell(16,26,4,3,'L');
  g.rect(10,28,13,29,'L'); g.rect(18,28,21,29,'L');
  g.set(23,25,'L'); g.ell(23,25,1.5,1.5,'L');             // 꼬리
  g.ell(16,18,6,5.5,'B');
  eyes(g,12,17,2,3);
  g.rect(15,20,16,20,'N');
  g.set(14,22,'D'); g.set(17,22,'D');
},
function(g){                                   // 2단계
  g.ell(10.5,9,3,8,'B'); g.ell(21.5,9,3,8,'B');
  g.ell(10.5,9,1.5,5.5,'N'); g.ell(21.5,9,1.5,5.5,'N');
  g.ell(16,24,8,6.5,'B');
  g.ell(16,26,5,4,'L');
  g.rect(9,29,13,30,'L'); g.rect(18,29,22,30,'L');
  g.ell(24.5,24,2.5,2.5,'L');
  g.ell(16,17,7,6.5,'B');
  eyes(g,11,15,3,3);
  g.rect(15,19,16,20,'N');
  g.set(13,22,'D'); g.set(18,22,'D');
  g.rect(9,22,22,23,'R');                                 // 목도리
  g.poly([[19,23],[23,23],[21,28]],'R');
},
function(g){                                   // 3단계 · 기사
  g.ell(10,7,3,7.5,'B'); g.ell(22,7,3,7.5,'B');           // 귀 (투구 위로 솟게)
  g.ell(10,7,1.5,5,'N');  g.ell(22,7,1.5,5,'N');
  g.poly([[10,18],[5,30],[17,30],[14,18]],'V');           // 망토
  g.ell(16,25,8,5.5,'B');
  g.ell(16,26,4.5,3.5,'L');
  g.rect(9,29,13,30,'L'); g.rect(18,29,22,30,'L');
  g.ell(16,16,7,6.5,'B');                                 // 머리
  armor(g,21,28,6);
  /* 투구 — 이마만 덮는 캡 + 코가리개 (눈은 아래로 내보낸다) */
  g.rect(11,10,20,11,'S'); g.rect(9,12,22,13,'S');
  g.rect(12,11,17,12,'H'); g.rect(9,14,22,14,'s');
  g.rect(15,14,16,17,'s');
  angryEyes(g,10,15,4,4);
  g.rect(15,20,16,21,'N');
  /* 창 */
  g.line(26,30,28,13,'T',2);
  g.poly([[26.5,13],[28,6],[29.5,13]],'H');
  shield(g,1,16,function(gg,x,y){
    gg.poly([[x+3,y+5],[x+6,y+5],[x+4.5,y+12]],'O');      // 당근 문장
    gg.rect(x+3,y+3,x+4,y+5,'M'); gg.rect(x+5,y+3,x+6,y+5,'M');
  });
}]
};

/* ── SVG 로 굽기 ─────────────────────────────────────────── */
const _cache = {};

/* 👑 4단계 — 전설 펫만 도달하는 모습.
   종류마다 머리 위치가 다르므로 '눈'을 찾아 그 위에 왕관을 얹는다.
   눈은 어떤 펫이든 반드시 있으므로 새 종류가 늘어도 그대로 맞는다.
   왕관 색(Y·R)은 종류별 팔레트가 덮어쓰지 않는 공통 색이라 항상 금색으로 보인다. */
function royal(g){
  let ex0 = N, ex1 = -1, ey = -1;
  for(let y = 0; y < N; y++){
    for(let x = 0; x < N; x++){
      if(g.get(x, y) === 'E'){ if(ey < 0) ey = y; if(x < ex0) ex0 = x; if(x > ex1) ex1 = x; }
    }
  }
  if(ey < 0) return;
  const cx = Math.round((ex0 + ex1) / 2);
  /* 머리에 얹으려면 볏·귀 같은 장식 위로 올라가야 한다. 눈 위로 실루엣이 끝나는 곳까지
     따라 올라간 뒤, 남은 자리에 맞춰 큰 왕관 / 납작한 왕관을 골라 그린다.
     (수탉은 볏이 높아 자리가 좁고, 고양이·토끼는 넉넉하다) */
  let top = ey;
  while(top > 0 && g.get(cx, top - 1) !== '.') top--;
  const room = top - 1;                                 // 왕관을 그릴 수 있는 맨 아랫줄
  if(room >= 6){
    const y = room;
    g.rect(cx-3, y-1, cx+3, y,   'Y');                  // 관테
    g.rect(cx-3, y-4, cx-2, y-2, 'Y');                  // 왼 봉우리
    g.rect(cx-1, y-5, cx,   y-2, 'Y');                  // 가운데 봉우리
    g.rect(cx+2, y-4, cx+3, y-2, 'Y');                  // 오른 봉우리
    g.set(cx-1, y-6, 'R'); g.set(cx, y-6, 'R');         // 보석
    g.set(cx-3, y-5, 'W'); g.set(cx+3, y-5, 'W');       // 반짝임
  } else {
    const y = Math.max(2, room);                        // 자리가 좁으면 납작한 왕관
    g.rect(cx-3, y,   cx+3, y,   'Y');
    g.rect(cx-3, y-2, cx-3, y-1, 'Y');
    g.rect(cx-1, y-2, cx,   y-1, 'Y');
    g.rect(cx+3, y-2, cx+3, y-1, 'Y');
    g.set(cx-1, y-2, 'R');
  }
}
function build(key, stage){
  const g = new Grid();
  const st = Math.min(4, Math.max(1, stage));
  (ART[key] || ART.cat)[Math.min(3, st) - 1](g);
  if(st >= 4) royal(g);
  g.outline('K');
  /* 같은 색 가로줄을 이어 붙여 색깔별 path 로 */
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

function paletteOf(key, override){
  const sp = SPECIES.find(s=>s.key===key);
  return Object.assign({}, BASE, sp ? sp.pal : {}, override || {});
}

/* SVG 문자열 */
function petSVG(key, stage, override, size){
  const ck = key+'|'+stage;
  const runs = _cache[ck] || (_cache[ck] = build(key, stage));
  const pal = paletteOf(key, override);
  let body = '';
  for(const c in runs){
    const color = pal[c]; if(!color) continue;
    let d = '';
    runs[c].forEach(r=>{ d += 'M'+r[0]+' '+r[1]+'h'+r[2]+'v1h-'+r[2]+'z'; });
    body += '<path fill="'+color+'" d="'+d+'"/>';
  }
  const wh = size ? ' width="'+size+'" height="'+size+'"' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+N+' '+N+'"'+wh+
         ' shape-rendering="crispEdges">'+body+'</svg>';
}

function petDataURL(key, stage, size, override){
  return 'data:image/svg+xml;charset=utf-8,' +
         encodeURIComponent(petSVG(key, stage, override, size||96));
}

/* ── 진화 ───────────────────────────────────────────────── */
/* 데려온 뒤 +3레벨 → 2단계, +8레벨 → 3단계 */
function petStage(level, adoptedLevel){
  const grown = Math.max(0, (Number(level)||0) - (Number(adoptedLevel)||0));
  return grown >= EVO3 ? 3 : grown >= EVO2 ? 2 : 1;
}
/* 다음 진화까지 얼마나 남았는지 */
function petProgress(level, adoptedLevel){
  const grown = Math.max(0, (Number(level)||0) - (Number(adoptedLevel)||0));
  const stage = petStage(level, adoptedLevel);
  const need  = stage === 1 ? EVO2 : stage === 2 ? EVO3 : null;
  return {
    stage: stage,
    grown: grown,
    need: need,                                   // 다음 단계에 필요한 누적 레벨
    remain: need === null ? 0 : need - grown,     // 남은 레벨
    ratio: need === null ? 1 : Math.min(1, grown / need),
    max: stage === 3
  };
}

/* ── 공개 ───────────────────────────────────────────────── */
window.PET_SPECIES  = SPECIES;
window.PET_EVO      = {stage2:EVO2, stage3:EVO3};
window.PET_SVG      = petSVG;
window.PET_DATAURL  = petDataURL;
window.PET_STAGE    = petStage;
window.PET_PROGRESS = petProgress;
window.PET_INFO     = function(key){ return SPECIES.find(s=>s.key===key) || null; };

})();
