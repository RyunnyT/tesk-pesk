/* Manual arena RPG. Legacy filename/API retained for saved encounters. No audio or automatic firing. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./pesk-combat.js'):root.PeskCombat;
const W=600,H=430,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MOVES={sword:['회전 베기','slash',135],axe:['대지 가르기','quake',150],mace:['별의 망치','quake',150],spear:['섬광 찌르기','thrust',190],dagger:['그림자 연격','cross',125],staff:['룬 폭발','rune',320],crystal:['수정 결계','crystal',300],bow:['바람의 일격','thrust',350]};
/* 몬스터마다 다른 반격. 모두 예고(붉은 영역) 뒤에 들어오고, 어린 학년은 예고가 더 길다. 보스는 기본 원. */
const PATTERNS={
 circle:{name:'반격 예고',tip:'붉은 원 밖으로 피하세요'},
 dash:{name:'돌진!',tip:'곧장 돌진해요. 붉은 길 옆으로 비켜요'},
 double:{name:'연속 공격',tip:'두 번 연달아 와요. 두 번째 원도 피하세요'},
 big:{name:'대지 진동',tip:'아주 큰 원! 멀리 달아나요'},
 blink:{name:'기습!',tip:'순간이동했어요! 붉은 원 밖으로'},
 triple:{name:'마법진',tip:'마법진 3개! 빈 곳으로 피하세요'},
 breath:{name:'불숨!',tip:'앞으로 불을 뿜어요. 옆이나 뒤로 돌아가요'},
 mix:{name:'수호자의 공격',tip:'공격이 매번 바뀌어요! 예고를 잘 보세요'}
};
// 단원 보스는 패턴을 차례로 바꿔 가며 쓴다
const MIX=['big','dash','triple','double','breath'];
const REGION_ART={field:'🌿 들판 · 초록 숲',cave:'🕳️ 동굴 · 어둠 동굴',tower:'🗼 탑 · 별빛 탑'};
function makeWarning(s){
 let p=s.boss?'circle':s.pattern;if(p==='mix')p=s.second?'double':MIX[s.mixN++%MIX.length];
 const wt=s.grade<=3?1.5:1.15,base={kind:'circle',p,at:s.t+wt,dur:wt};
 if(p==='dash'){const a=Math.atan2(s.y-s.enemyY,s.x-s.enemyX);return {...base,kind:'line',x1:s.enemyX,y1:s.enemyY,x2:clamp(s.enemyX+Math.cos(a)*380,50,W-50),y2:clamp(s.enemyY+Math.sin(a)*380,120,H-45),w:70};}
 if(p==='big')return {...base,x:s.x,y:s.y,r:125,at:s.t+wt*1.3,dur:wt*1.3};
 if(p==='double')return s.second?{...base,x:s.x,y:s.y,r:62,at:s.t+wt*.65,dur:wt*.65,second:true}:{...base,x:s.x,y:s.y,r:62};
 if(p==='blink'){
  const a=(s.t*2.3)%(Math.PI*2);effect(s,'rune',s.enemyX,s.enemyY,'#c9d4f0',.8);
  s.enemyX=clamp(s.x+Math.cos(a)*150,65,W-65);s.enemyY=clamp(s.y+Math.sin(a)*150,115,H-65);effect(s,'rune',s.enemyX,s.enemyY,'#c9d4f0',.8);
  return {...base,x:s.x,y:s.y,r:80};
 }
 if(p==='triple'){const a=(s.t*1.7)%(Math.PI*2),c=[{x:s.x,y:s.y}];for(const d of [2.1,4.2])c.push({x:clamp(s.x+Math.cos(a+d)*125,45,W-45),y:clamp(s.y+Math.sin(a+d)*125,125,H-40)});return {...base,kind:'multi',circles:c,r:62};}
 if(p==='breath')return {...base,kind:'cone',x:s.enemyX,y:s.enemyY,a:Math.atan2(s.y-s.enemyY,s.x-s.enemyX),spread:.5,len:330};
 return {...base,x:s.x,y:s.y,r:s.boss?105:77};
}
function inWarning(s,w){
 if(w.kind==='line'){const dx=w.x2-w.x1,dy=w.y2-w.y1,l=dx*dx+dy*dy||1,t=clamp(((s.x-w.x1)*dx+(s.y-w.y1)*dy)/l,0,1);return Math.hypot(s.x-(w.x1+dx*t),s.y-(w.y1+dy*t))<w.w/2+14;}
 if(w.kind==='multi')return w.circles.some(c=>Math.hypot(s.x-c.x,s.y-c.y)<w.r);
 if(w.kind==='cone'){const d=Math.hypot(s.x-w.x,s.y-w.y);if(d>w.len)return false;if(d<40)return true;let da=Math.atan2(s.y-w.y,s.x-w.x)-w.a;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<w.spread;}
 return Math.hypot(s.x-w.x,s.y-w.y)<w.r;
}
function strikeEffect(s,w){
 if(w.kind==='line'){for(let i=0;i<=4;i++)effect(s,'quake',w.x1+(w.x2-w.x1)*i/4,w.y1+(w.y2-w.y1)*i/4,'#f4a282',.55);}
 else if(w.kind==='multi'){for(const c of w.circles)effect(s,'quake',c.x,c.y,'#c7a8ff',w.r/65);}
 else if(w.kind==='cone'){for(let i=0;i<26;i++){const a=w.a+(i/25-.5)*w.spread*2,v=260+(i%5)*40;s.particles.push({x:w.x,y:w.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.8,color:i%2?'#ff9b5c':'#ffd36b'});}}
 else effect(s,'quake',w.x,w.y,'#f4a282',w.r/65);
}
function create(o={}){
 const weapon=C.weaponProfile(o.weaponStyle||'sword',o.weaponId||''),hp=clamp(Number.isFinite(Number(o.heroHp))?Number(o.heroHp):100,0,100);
 return {weapon,move:MOVES[weapon.id],pet:C.petProfile(o.petId,1,o.petTier),ready:o.petCharge>=3,boss:!!o.boss,grade:Number(o.grade)||3,
 t:0,x:140,y:250,targetX:140,targetY:250,enemyX:435,enemyY:250,ammo:clamp(Math.round(Number(o.ammo)||6),1,30),ammoUsed:0,power:clamp(Math.round(Number(o.power)||10),10,60),
 hp,initialHp:hp,hpLost:0,hits:0,dodges:0,bumps:0,skillUsed:false,combo:false,shield:0,guardUntil:0,speedUntil:0,slow:0,
 pattern:PATTERNS[o.pattern]?o.pattern:'circle',region:REGION_ART[o.region]?o.region:'field',second:false,mixN:0,unitBoss:!!o.unitBoss,units:0,boost:false,boosts:0,blocks:0,killed:false,killAt:0,perfect:false,
 baseDamage:Number(o.baseDamage)>0?Number(o.baseDamage):clamp(Math.round(Number(o.ammo)||6),1,30)*12,powerRaw:o.power,
 enemyHp:Number.isFinite(Number(o.monsterHp))&&o.monsterHp!==null&&o.monsterHp!==''?Math.max(0,Number(o.monsterHp)):null,enemyMax:Math.max(1,Number(o.monsterMax)||Number(o.monsterHp)||1),shownHp:Math.max(0,Number(o.monsterHp)||0),
 cooldown:{a:0,s:0,d:0,f:0},attackAt:2.8,warning:null,effects:[],particles:[],labels:[],events:[],burstAt:[],flash:0,heroFlash:0,hitStop:0,kick:0,stagger:0,finishAt:null,finished:false,paused:false,report:null};
}
function event(s,text){s.events.push({text});if(s.events.length>12)s.events.shift();}
function effect(s,type,x,y,color,scale=1){s.effects.push({type,x,y,color,scale,life:.65,max:.65,angle:Math.atan2(s.enemyY-s.y,s.enemyX-s.x)});}
function label(s,text,x,y,color){s.labels.push({text,x,y,color,life:1});}
/* 지금까지 준 피해 — 저장할 때와 같은 식(PeskCombat.arenaDamage)으로 계산한다 */
function dealt(s,perfect=s.perfect){return C.arenaDamage({ammo:s.ammo,baseDamage:s.baseDamage,power:s.powerRaw},s.units,perfect);}
function enemyLeft(s){return s.enemyHp===null?null:Math.max(0,s.enemyHp-dealt(s));}
function endFight(s,delay){
 if(s.finishAt!==null)return;
 s.finishAt=s.t+delay;s.warning=null;
 s.perfect=s.bumps===0&&s.dodges+s.blocks>0&&s.ammoUsed>0;
 if(s.perfect){label(s,'완벽한 사냥! +10%',W/2,H/2-40,'#ffe28a');event(s,'한 대도 맞지 않았어요! 완벽한 사냥 · 피해 +10%');}
 if(!s.killed&&s.enemyHp!==null&&dealt(s)>=s.enemyHp)kill(s);
}
function kill(s){
 if(s.killed)return;s.killed=true;s.killAt=s.t;s.warning=null;
 for(let i=0;i<30;i++)s.particles.push({x:s.enemyX,y:s.enemyY,vx:Math.cos(i*.9)*(120+i*6),vy:Math.sin(i*.9)*120-80,life:.9,color:['#ffe28a','#ffffff','#f6a96b'][i%3]});
 const left=s.ammo-s.ammoUsed;
 event(s,s.boss?'보스를 쓰러뜨렸어요!':'처치!'+(left>0?' 남은 공격권 '+left+'회는 다음 몬스터에게 써요.':''));
 endFight(s,1.6);
}
function impact(s,power=1,type=s.move[1],color=s.weapon.color,units=power){
 const boosted=s.boost;if(boosted){units*=1.5;s.boost=false;s.boosts++;}
 const before=dealt(s);s.units+=units;const dmg=dealt(s)-before;
 s.hits+=power;s.flash=.18;s.hitStop=.065;s.stagger=s.t+.45;
 effect(s,type,s.enemyX,s.enemyY,color,power>1||boosted?1.25:1);label(s,(boosted?'강타! ':'')+(dmg>0?'−'+dmg:'명중'),s.enemyX,s.enemyY-55,boosted?'#ffe28a':color);
 for(let i=0;i<14;i++)s.particles.push({x:s.enemyX,y:s.enemyY,vx:Math.cos(i*2.4)*160,vy:Math.sin(i*2.4)*120,life:.55,color});
 const angle=Math.atan2(s.enemyY-s.y,s.enemyX-s.x);s.enemyX=clamp(s.enemyX+Math.cos(angle)*18,65,W-65);s.enemyY=clamp(s.enemyY+Math.sin(angle)*18,115,H-65);
 if(s.weapon.element==='ice')s.slow=s.t+2;
 if(s.weapon.element==='fire'){effect(s,'rune',s.enemyX,s.enemyY,'#ff9865',.8);}
 if(s.enemyHp!==null&&dealt(s)>=s.enemyHp)kill(s);
}
function action(s,key){
 if(s.finished||s.paused||s.killed||s.hp<=0||!['a','s','d','f'].includes(key)||s.t<s.cooldown[key])return false;
 if(key==='d'){
  s.cooldown.d=s.t+5;s.guardUntil=s.t+1.5;s.shield=Math.max(1,s.shield);effect(s,'guard',s.x,s.y,'#92dfec');event(s,'방어 자세! 1.5초 동안 반격을 막아요.');return true;
 }
 if(s.ammoUsed>=s.ammo){event(s,'공격권을 모두 사용했어요.');return false;}
 if(key==='s'&&s.ammo-s.ammoUsed<2){event(s,'무기 스킬은 공격권 2개가 필요해요. A로 마무리하세요.');return false;}
 if(key==='f'&&(!s.pet||!s.ready||s.skillUsed||(s.pet.tier==='legend'&&s.hits<3))){event(s,s.pet?.tier==='legend'?'정답 3개와 전투 3회 명중으로 합동기를 준비해요.':'정답 3개로 펫 스킬을 준비해요.');return false;}
 const range=key==='s'?s.move[2]+65:key==='f'?(s.pet?.rank>=2?600:s.pet?.ability==='dash'?350:220):s.move[2];
 if(Math.hypot(s.enemyX-s.x,s.enemyY-s.y)>range){event(s,'몬스터 가까이 다가가서 공격하세요. 공격권은 그대로예요.');effect(s,'range',s.x,s.y,'#d7d4aa',range/100);return false;}
 s.ammoUsed+=key==='s'?2:1;s.cooldown.a=s.t+.48;if(key==='s')s.cooldown.s=s.t+3;
 if(key==='f'){
  const p=s.pet;s.skillUsed=true;s.combo=p.tier==='legend';s.cooldown.f=Infinity;
  if(p.ability==='shield'){s.shield=3;s.guardUntil=s.t+4;effect(s,'guard',s.x,s.y,p.color,1.3);}
  if(p.ability==='speed'){s.speedUntil=s.t+5;s.slow=s.t+5;}
  if(p.ability==='ambush'||p.ability==='support')s.burstAt.push({at:s.t+.45,power:2,color:p.color});
  if(p.rank>=1)s.stagger=s.t+1.2;
  impact(s,p.ability==='double'?3:p.ability==='dash'?4:2,s.combo?'nova':'pet',p.color);
  if(s.combo){s.shield++;effect(s,'nova',s.enemyX,s.enemyY,'#ffe7a5',1.7);}
  event(s,(s.combo?'전설 합동기 · ':'')+p.skill);
 }else{
  const type=key==='s'?s.move[1]:'slash';impact(s,key==='s'?3:1,type,s.weapon.color,key==='s'?2:1);
  // 무기 스킬은 공격권 2개 — 대신 몬스터가 준비하던 반격을 끊는다
  if(key==='s'&&s.warning&&!s.killed){s.warning=null;s.second=false;s.attackAt=s.t+2.6;s.stagger=s.t+.9;label(s,'반격 차단!',s.enemyX,s.enemyY-82,'#c8efba');event(s,s.move[0]+'! 몬스터의 반격을 끊었어요.');}
  else event(s,key==='s'?s.move[0]+'!':s.weapon.name+' · 기본 공격');
 }
 if(s.ammoUsed>=s.ammo&&!s.killed)endFight(s,1.1);
 return true;
}
function activate(s){return action(s,'f');}
function report(s){return {rpg:true,v:2,hits:s.hits,dodges:s.dodges,blocks:s.blocks,bumps:s.bumps,skillUsed:s.skillUsed,combo:s.combo,hpLost:s.hpLost,attacksUsed:s.ammoUsed,units:Math.round(s.units*100)/100,boosts:s.boosts,perfect:s.perfect,killed:s.killed};}
function finish(s){s.finished=true;s.report=report(s);return s.report;}
function stickVector(x,y,radius){
 const distance=Math.hypot(x,y),r=Math.max(1,radius);
 if(distance<r*.12)return {x:0,y:0};
 const scale=Math.min(1,distance/r)/Math.max(1,distance);
 return {x:x*scale,y:y*scale};
}
function controlsHtml(){
 return '<div class="shooter-gamepad"><div class="rpg-stick-wrap"><div class="rpg-stick" data-joystick role="group" aria-label="이동 조이스틱: 누른 채 움직이세요"><span class="rpg-stick-cross" aria-hidden="true">✚</span><span data-stick-knob class="rpg-stick-knob" aria-hidden="true"></span></div><small>이동 · 누른 채 움직이기</small></div><div class="rpg-skillbar"><button type="button" data-rpg-action="a">⚔ 공격</button><button type="button" data-rpg-action="s">✨ 무기 스킬</button><button type="button" data-rpg-action="d">🛡 방어</button><button type="button" data-rpg-action="f">🐾 펫 스킬</button></div></div>';
}
function step(s,dt,input={}){
 if(s.finished||s.paused)return s;
 dt=clamp(Number(dt)||0,0,.05);
 if(s.hitStop>0){s.hitStop=Math.max(0,s.hitStop-dt);return s;}
 s.t+=dt;s.flash=Math.max(0,s.flash-dt);if(s.enemyHp!==null)s.shownHp+=(enemyLeft(s)-s.shownHp)*Math.min(1,dt*5);s.heroFlash=Math.max(0,s.heroFlash-dt);
 const speed=s.t<s.speedUntil?310:235;
 const dx=Number(input.direction)||0,dy=Number(input.vertical)||0,length=Math.max(1,Math.hypot(dx,dy));
 if(dx)s.targetX=s.x+dx/length*speed*dt;else if(Number.isFinite(input.x))s.targetX=input.x;
 if(dy)s.targetY=s.y+dy/length*speed*dt;else if(Number.isFinite(input.y))s.targetY=input.y;
 s.x=clamp(s.x+clamp(s.targetX-s.x,-speed*dt,speed*dt),40,W-40);s.y=clamp(s.y+clamp(s.targetY-s.y,-speed*dt,speed*dt),120,H-38);
 if(input.action)action(s,input.action);
 // Monsters approach, wind up a visible strike, then recover. No streams of bullets.
 if(!s.warning&&!s.killed&&s.t>s.stagger&&s.finishAt===null){
  const angle=Math.atan2(s.y-s.enemyY,s.x-s.enemyX),dist=Math.hypot(s.x-s.enemyX,s.y-s.enemyY);
  if(dist>115){const v=(s.slow>s.t?20:43)*dt;s.enemyX+=Math.cos(angle)*v;s.enemyY+=Math.sin(angle)*v;}
  if(s.t>=s.attackAt){s.warning=makeWarning(s);const P=PATTERNS[s.warning.p];event(s,s.warning.second?'한 번 더! 두 번째 공격이 와요.':P.name+' '+P.tip+' · 피하거나 D로 막으면 다음 공격이 강타!');}
 }
 if(s.warning&&s.t>=s.warning.at){
  const w=s.warning;strikeEffect(s,w);
  if(inWarning(s,w)){
   if(s.guardUntil>s.t&&s.shield>0){s.shield--;s.blocks++;s.boost=true;label(s,'방어! 다음 공격 강타',s.x,s.y-45,'#95edeb');}
   else{const damage=Math.min(s.hp,s.boss?12:s.unitBoss?10:8);s.hp-=damage;s.hpLost+=damage;s.bumps++;s.heroFlash=.4;label(s,'−'+damage+' HP',s.x,s.y-45,'#ffb3a4');event(s,'몬스터 반격! 모험 체력 −'+damage);}
  }else{s.dodges++;s.boost=true;label(s,'회피! 다음 공격 강타',s.x,s.y-45,'#c8efba');}
  if(w.kind==='line'){s.enemyX=w.x2;s.enemyY=w.y2;}
  s.warning=null;
  if(w.p==='double'&&!s.second){s.second=true;s.attackAt=s.t+.35;}else{s.second=false;s.attackAt=s.t+2.6;}
 }
 for(const b of s.burstAt)if(s.t>=b.at){impact(s,b.power,'pet',b.color);b.done=true;}s.burstAt=s.burstAt.filter(b=>!b.done);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);
 for(const l of s.labels){l.life-=dt;l.y-=24*dt;}s.labels=s.labels.filter(l=>l.life>0);
 if(s.hp<=0||(s.finishAt!==null&&s.t>=s.finishAt))finish(s);
 return s;
}
function mount(host,o,onFinish){
 const s=create(o),canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),hud=host.querySelector('[data-shooter-hud]'),status=host.querySelector('[data-shooter-status]'),pause=host.querySelector('[data-shooter-pause]');
 const abort=new AbortController(),held=new Set();let frame=0,last=0,stopped=false,pointer=null,aim=null,aimY=null,stickPointer=null,stick={x:0,y:0};
 const joystick=host.querySelector('[data-joystick]'),knob=host.querySelector('[data-stick-knob]');
 const touch=root.matchMedia?.('(pointer:coarse)').matches||root.navigator?.maxTouchPoints>0;
 const motion=!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const hero=new Image(),pet=new Image(),monster=new Image();hero.src=o.hero||'';pet.src=o.petImage||'';monster.src=o.monsterImage||'';
 const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
 const skillButtons=[...host.querySelectorAll('[data-rpg-action]')];
 function resetStick(){stickPointer=null;stick={x:0,y:0};if(knob)knob.style.transform='translate(0px,0px)';s.targetX=s.x;s.targetY=s.y;}
 function clearInput(){held.clear();pointer=null;aim=null;aimY=null;resetStick();}
 function setPause(value){s.paused=value;clearInput();last=0;pause.textContent=value?'▶ 계속하기':'Ⅱ 잠깐 쉬기';status.textContent=value?'잠깐 쉬는 중이에요.':'왼쪽 조이스틱 이동 · 오른쪽 공격·스킬·방어 · 방향키와 A/S/D/F도 가능';}
 // Listen for the active arena, even after a button took focus. Never intercept typing.
 listen(root,'keydown',e=>{if(!host.open||e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||e.isComposing)return;const key=e.key.toLowerCase(),code=(e.code||'').toLowerCase();const k=['keya','keys','keyd','keyf'].includes(code)?code.slice(3):key;if(['arrowleft','arrowright','arrowup','arrowdown','a','s','d','f','escape'].includes(k)){e.preventDefault();if(k.startsWith('arrow'))held.add(k);else if(!e.repeat){if(k==='escape')setPause(!s.paused);else action(s,k);}}});
 listen(root,'keyup',e=>{held.delete(e.key.toLowerCase());s.targetX=s.x;s.targetY=s.y;});
 listen(canvas,'blur',()=>{held.clear();s.targetX=s.x;s.targetY=s.y;});
 const point=e=>{const r=canvas.getBoundingClientRect();aim=(e.clientX-r.left)/r.width*W;aimY=(e.clientY-r.top)/r.height*H;};
 listen(canvas,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});pointer=e.pointerId;canvas.setPointerCapture(pointer);point(e);});
 listen(canvas,'pointermove',e=>{if(pointer===e.pointerId)point(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,()=>{pointer=null;aim=null;aimY=null;s.targetX=s.x;s.targetY=s.y;});
 for(const b of skillButtons){
  listen(b,'pointerdown',e=>{if(e.button!==0||b.disabled)return;e.preventDefault();action(s,b.dataset.rpgAction);});
  // Keyboard and assistive technology activate buttons through a synthetic click.
  listen(b,'click',e=>{if(e.detail===0&&!b.disabled)action(s,b.dataset.rpgAction);});
 }
 if(joystick){
  const move=e=>{const rect=joystick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)/2;stick=stickVector(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,radius*.8);if(knob)knob.style.transform='translate('+(stick.x*radius*.55)+'px,'+(stick.y*radius*.55)+'px)';};
  listen(joystick,'pointerdown',e=>{if(e.button!==0||stickPointer!==null||s.paused)return;e.preventDefault();stickPointer=e.pointerId;aim=null;aimY=null;joystick.setPointerCapture(e.pointerId);move(e);});
  listen(joystick,'pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(joystick,type,e=>{if(e.pointerId===stickPointer)resetStick();});
 }
 for(const b of host.querySelectorAll('[data-move]')){const key='arrow'+b.dataset.move;listen(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(key);});for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(b,type,()=>{held.delete(key);s.targetX=s.x;s.targetY=s.y;});}
 listen(pause,'click',()=>{setPause(!s.paused);canvas.focus({preventScroll:true});});listen(host,'cancel',e=>{e.preventDefault();setPause(true);});listen(root,'blur',()=>setPause(true));listen(document,'visibilitychange',()=>{if(document.hidden)setPause(true);});
 function text(value,x,y,color,size=13){ctx.fillStyle=color;ctx.font='700 '+size+'px system-ui';ctx.textAlign='center';ctx.fillText(value,x,y);}
 function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
 function draw(){
  const dpr=Math.min(2,root.devicePixelRatio||1);if(canvas.width!==W*dpr){canvas.width=W*dpr;canvas.height=H*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);
  const region=s.boss?'field':s.region,sky={field:['#172e2b','#315b45','#657855'],cave:['#121219','#2a2836','#4b4656'],tower:['#191433','#3a2e69','#6b5a8e']}[region];
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,sky[0]);bg.addColorStop(.3,sky[1]);bg.addColorStop(1,sky[2]);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(region==='field'){
  // Quiet forest ruins, stone arena, grass and runes instead of a shooting grid.
  for(let i=0;i<12;i++){const x=i*57-12;ctx.fillStyle=i%2?'#183c2c':'#244733';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-45,130);ctx.lineTo(x+45,130);ctx.fill();ctx.fillStyle='#284437';ctx.fillRect(x-6,70,12,78);}
  ctx.fillStyle='#a0a18433';ctx.beginPath();ctx.ellipse(300,279,263,123,0,0,7);ctx.fill();ctx.strokeStyle='#d1c59840';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(300,279,222,98,0,0,7);ctx.stroke();
  for(let i=0;i<24;i++){const x=(i*127)%580+10,y=145+(i*61)%270;ctx.fillStyle='#c6c09a22';ctx.fillRect(x,y,22,9);ctx.strokeStyle='#b5c49366';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-6);ctx.stroke();}
  }else if(region==='cave'){
   // 종유석, 바위 바닥, 빛나는 수정
   for(let i=0;i<15;i++){const x=i*43+8,h=40+(i*37)%70;ctx.fillStyle=i%2?'#2b2937':'#3a3747';ctx.beginPath();ctx.moveTo(x-20,0);ctx.lineTo(x+20,0);ctx.lineTo(x,h);ctx.fill();}
   ctx.fillStyle='#8a84a02e';ctx.beginPath();ctx.ellipse(300,279,263,123,0,0,7);ctx.fill();ctx.strokeStyle='#b8b0d040';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(300,279,222,98,0,0,7);ctx.stroke();
   for(let i=0;i<9;i++){const x=(i*151)%560+20,y=170+(i*83)%230,c=i%2?'#7fe0d877':'#b79cff77';ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-14);ctx.lineTo(x+7,y);ctx.lineTo(x,y+5);ctx.lineTo(x-7,y);ctx.fill();}
  }else{
   // 별빛 하늘, 탑 성벽, 룬 원
   for(let i=0;i<40;i++){const x=(i*97)%600,y=(i*53)%110;ctx.fillStyle=i%3?'#ffffff55':'#ffe9a088';ctx.fillRect(x,y,2,2);}
   ctx.fillStyle='#2c2450';ctx.fillRect(0,96,W,44);ctx.strokeStyle='#4a3f7a';ctx.lineWidth=1;for(let r=0;r<3;r++){ctx.beginPath();ctx.moveTo(0,96+r*15);ctx.lineTo(W,96+r*15);ctx.stroke();for(let x=(r%2)*20;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,96+r*15);ctx.lineTo(x,111+r*15);ctx.stroke();}}
   for(let x=0;x<W;x+=40){ctx.fillStyle='#2c2450';ctx.fillRect(x,82,22,14);}
   ctx.fillStyle='#b9a6e82a';ctx.beginPath();ctx.ellipse(300,279,263,123,0,0,7);ctx.fill();ctx.strokeStyle='#d9c8ff55';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(300,279,222,98,0,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(300,279,160,70,0,0,7);ctx.stroke();
  }
  text(s.boss?'우리 반 보스 · 협동의 유적':s.unitBoss?'👑 단원 보스 · 수호자의 탑':REGION_ART[region],W/2,32,'#e6ead7',15);
  if(s.warning){const w=s.warning,p=clamp(1-(w.at-s.t)/w.dur,0,1),name=w.second?'한 번 더!':PATTERNS[w.p].name;ctx.lineWidth=2;
   if(w.kind==='line'){const a=Math.atan2(w.y2-w.y1,w.x2-w.x1),len=Math.hypot(w.x2-w.x1,w.y2-w.y1);ctx.save();ctx.translate(w.x1,w.y1);ctx.rotate(a);ctx.fillStyle='#fa91762b';ctx.strokeStyle='#f5ad80';ctx.fillRect(0,-w.w/2,len,w.w);ctx.strokeRect(0,-w.w/2,len,w.w);ctx.fillStyle='#ee927a44';ctx.fillRect(0,-w.w/2,len*p,w.w);ctx.restore();text(name,(w.x1+w.x2)/2,(w.y1+w.y2)/2-w.w/2-6,'#ffe4cf',12);}
   else if(w.kind==='cone'){for(const [r,fill,stroke] of [[w.len,'#fa91762b','#f5ad80'],[w.len*p,'#ee927a33',null]]){ctx.beginPath();ctx.moveTo(w.x,w.y);ctx.arc(w.x,w.y,r,w.a-w.spread,w.a+w.spread);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}text(name,w.x+Math.cos(w.a)*w.len*.6,w.y+Math.sin(w.a)*w.len*.6,'#ffe4cf',12);}
   else{const cs=w.circles||[w],tone=w.kind==='multi'?['#b48cff2b','#c7a8ff','#a88ce033']:['#fa91762b','#f5ad80','#ee927a33'];for(const c of cs){circle(c.x,c.y,w.r,tone[0],tone[1]);circle(c.x,c.y,w.r*p,tone[2]);}text(name,cs[0].x,cs[0].y-12,'#ffe4cf',12);}}
  for(const [x,y,r] of [[s.x,s.y,26],[s.enemyX,s.enemyY,39]]){ctx.fillStyle='#112f3555';ctx.beginPath();ctx.ellipse(x,y+25,r,10,0,0,7);ctx.fill();}
  const ey=s.enemyY+(motion?Math.sin(s.t*2)*3:0);
  const k=s.killed?clamp((s.t-s.killAt)/.9,0,1):0;
  ctx.save();if(s.flash)ctx.filter='brightness(1.8)';if(k){ctx.globalAlpha=1-k;ctx.translate(s.enemyX,ey+30*k);ctx.rotate(k*.7);ctx.translate(-s.enemyX,-ey);}
  if(monster.complete&&monster.naturalWidth)ctx.drawImage(monster,s.enemyX-57,ey-65,114,114);else{text(o.monsterIcon||'🍄',s.enemyX,ey+23,'#fff',70);}ctx.restore();
  if(s.enemyHp!==null&&!s.killed){const bx=clamp(s.enemyX-55,6,W-116),by=Math.max(46,ey-88),cur=enemyLeft(s),pct=cur/s.enemyMax;
   if(o.monsterName)text(o.monsterName,bx+55,by-6,'#f4f1dc',11);
   ctx.fillStyle='#10262acc';ctx.fillRect(bx-1,by-1,112,11);ctx.fillStyle='#fff6d8';ctx.fillRect(bx,by,110*clamp(s.shownHp/s.enemyMax,0,1),9);
   ctx.fillStyle=pct>.5?'#9fdc7c':pct>.2?'#f2c94c':'#ef7d64';ctx.fillRect(bx,by,110*clamp(pct,0,1),9);
   text(cur.toLocaleString()+' / '+s.enemyMax.toLocaleString(),bx+55,by+22,'#ffffff',11);}
  if(s.killed)text(s.boss?'보스 격파!':'처치!',W/2,H/2-70,'#ffe28a',34);
  if(s.guardUntil>s.t){ctx.lineWidth=3;circle(s.x,s.y,39,'#72bddc1c','#a9edeb');}
  if(s.boost){ctx.lineWidth=3;circle(s.x,s.y,44+(motion?Math.sin(s.t*8)*3:0),'#ffe28a22','#ffe28a');text('⚡ 강타 준비',s.x,s.y-64,'#ffe28a',12);}
  ctx.save();if(s.heroFlash)ctx.filter='sepia(1) saturate(4)';if(hero.complete&&hero.naturalWidth)ctx.drawImage(hero,s.x-40,s.y-57,80,90);else text('🧙',s.x,s.y+20,'#fff',55);ctx.restore();
  if(s.pet){const px=s.x-40,py=s.y+20;if(pet.complete&&pet.naturalWidth)ctx.drawImage(pet,px-17,py-24,34,34);else text(s.pet.icon,px,py,'#fff',25);}
  ctx.fillStyle='#192f33';ctx.fillRect(s.x-31,s.y+37,62,7);ctx.fillStyle=s.hp<30?'#e98e78':'#bee295';ctx.fillRect(s.x-30,s.y+38,60*s.hp/100,5);
  for(const e of s.effects){const p=1-e.life/e.max;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=e.life/e.max;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=5;const r=(25+p*65)*e.scale;
   if(e.type==='slash'||e.type==='cross'){ctx.rotate(e.angle);ctx.lineWidth=10*(1-p)+1;ctx.beginPath();ctx.arc(-12,0,r,-1.2,1.2);ctx.stroke();if(e.type==='cross'){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.arc(0,0,r,-1,1);ctx.stroke();}}
   else if(e.type==='thrust'){ctx.rotate(e.angle);ctx.beginPath();ctx.moveTo(-85*(1-p),-8);ctx.lineTo(50,0);ctx.lineTo(-85*(1-p),8);ctx.fill();}
   else{ctx.lineWidth=e.type==='range'?1:4;circle(0,0,r,null,e.color);if(e.type!=='range'){for(let i=0;i<8;i++){const a=i*Math.PI/4+p;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.6,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a)*r*1.3,Math.sin(a)*r*1.3);ctx.stroke();}if(['rune','crystal','nova','pet'].includes(e.type)){ctx.rotate(p*2);ctx.strokeRect(-r*.65,-r*.65,r*1.3,r*1.3);}}}
   ctx.restore();
  }
  if(motion)for(const p of s.particles){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);}ctx.globalAlpha=1;
  for(const l of s.labels){ctx.globalAlpha=Math.min(1,l.life*2);text(l.text,l.x,l.y,l.color,17);}ctx.globalAlpha=1;
  text(touch?'반격을 피하거나 막으면 다음 공격이 강타!':'방향키 이동 · A 공격 · S 스킬(공격권 2) · D 방어 · F 펫 · 피하면 강타!',W/2,411,'#e6edcf',11);
  if(s.paused){ctx.fillStyle='#172f36ad';ctx.fillRect(0,0,W,H);text('잠깐 쉬는 중',W/2,H/2,'#fff',22);}
 }
 function loop(now){
  if(stopped)return;if(!canvas.isConnected){destroy();return;}const dt=last?(now-last)/1000:0;last=now;
  step(s,dt,{direction:stick.x||Number(held.has('arrowright'))-Number(held.has('arrowleft')),vertical:stick.y||Number(held.has('arrowdown'))-Number(held.has('arrowup')),x:aim,y:aimY});
  for(const e of s.events.splice(0))status.textContent=e.text;
  hud.textContent='♥ '+s.hp+'/100 · 공격권 '+(s.ammo-s.ammoUsed)+'/'+s.ammo+' · 준 피해 '+dealt(s)+(s.boost?' · ⚡강타 준비':'');
  for(const b of skillButtons){const k=b.dataset.rpgAction,cd=Math.max(0,s.cooldown[k]-s.t);b.disabled=s.paused||s.killed||cd>0||(k!=='d'&&s.ammoUsed>=s.ammo)||(k==='s'&&s.ammo-s.ammoUsed<2)||(k==='f'&&(!s.pet||!s.ready||s.skillUsed||(s.pet.tier==='legend'&&s.hits<3)));const name=k==='a'?'기본 공격':k==='s'?s.move[0]+' (2)':k==='d'?'방어':s.pet?.skill||'펫 없음';b.textContent=(touch?{a:'⚔',s:'✨',d:'🛡',f:'🐾'}[k]:k.toUpperCase())+' · '+name+(Number.isFinite(cd)&&cd>0?' '+Math.ceil(cd)+'초':'');}
  draw();if(s.finished){const result=s.report;destroy();onFinish(result);return;}frame=requestAnimationFrame(loop);
 }
 function destroy(){if(stopped)return;stopped=true;clearInput();cancelAnimationFrame(frame);abort.abort();if(host.open)host.close();}
 frame=requestAnimationFrame(loop);canvas.focus({preventScroll:true});return {state:s,destroy,pause:()=>setPause(true),report:()=>report(s)};
}
const API={create,step,action,activate,finish,report,mount,dealt,makeWarning,inWarning,PATTERNS,MOVES,stickVector,controlsHtml};if(typeof module==='object'&&module.exports)module.exports=API;root.PeskShooter=API;
})(typeof window!=='undefined'?window:globalThis);
