/* Manual arena RPG. Legacy filename/API retained for saved encounters. No audio or automatic firing. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./pesk-combat.js'):root.PeskCombat;
const W=600,H=430,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MOVES={sword:['회전 베기','slash',135],axe:['대지 가르기','quake',150],mace:['별의 망치','quake',150],spear:['섬광 찌르기','thrust',190],dagger:['그림자 연격','cross',125],staff:['룬 폭발','rune',320],crystal:['수정 결계','crystal',300],bow:['바람의 일격','thrust',350]};
function create(o={}){
 const weapon=C.weaponProfile(o.weaponStyle||'sword',o.weaponId||''),hp=clamp(Number.isFinite(Number(o.heroHp))?Number(o.heroHp):100,0,100);
 return {weapon,move:MOVES[weapon.id],pet:C.petProfile(o.petId,1,o.petTier),ready:o.petCharge>=3,boss:!!o.boss,grade:Number(o.grade)||3,
 t:0,x:140,y:250,targetX:140,targetY:250,enemyX:435,enemyY:250,ammo:clamp(Math.round(Number(o.ammo)||6),1,30),ammoUsed:0,power:clamp(Math.round(Number(o.power)||10),10,60),
 hp,initialHp:hp,hpLost:0,hits:0,dodges:0,bumps:0,skillUsed:false,combo:false,shield:0,guardUntil:0,speedUntil:0,slow:0,
 cooldown:{a:0,s:0,d:0,f:0},attackAt:2.8,warning:null,effects:[],particles:[],labels:[],events:[],burstAt:[],flash:0,heroFlash:0,hitStop:0,kick:0,stagger:0,finishAt:null,finished:false,paused:false,report:null};
}
function event(s,text){s.events.push({text});if(s.events.length>12)s.events.shift();}
function effect(s,type,x,y,color,scale=1){s.effects.push({type,x,y,color,scale,life:.65,max:.65,angle:Math.atan2(s.enemyY-s.y,s.enemyX-s.x)});}
function label(s,text,x,y,color){s.labels.push({text,x,y,color,life:1});}
function impact(s,power=1,type=s.move[1],color=s.weapon.color){
 s.hits+=power;s.flash=.18;s.hitStop=.065;s.stagger=s.t+.45;
 effect(s,type,s.enemyX,s.enemyY,color,power>1?1.25:1);label(s,power>1?'강타!':'명중',s.enemyX,s.enemyY-55,color);
 for(let i=0;i<14;i++)s.particles.push({x:s.enemyX,y:s.enemyY,vx:Math.cos(i*2.4)*160,vy:Math.sin(i*2.4)*120,life:.55,color});
 const angle=Math.atan2(s.enemyY-s.y,s.enemyX-s.x);s.enemyX=clamp(s.enemyX+Math.cos(angle)*18,65,W-65);s.enemyY=clamp(s.enemyY+Math.sin(angle)*18,115,H-65);
 if(s.weapon.element==='ice')s.slow=s.t+2;
 if(s.weapon.element==='fire'){effect(s,'rune',s.enemyX,s.enemyY,'#ff9865',.8);}
}
function action(s,key){
 if(s.finished||s.paused||s.hp<=0||!['a','s','d','f'].includes(key)||s.t<s.cooldown[key])return false;
 if(key==='d'){
  s.cooldown.d=s.t+5;s.guardUntil=s.t+1.5;s.shield=Math.max(1,s.shield);effect(s,'guard',s.x,s.y,'#92dfec');event(s,'방어 자세! 1.5초 동안 반격을 막아요.');return true;
 }
 if(s.ammoUsed>=s.ammo){event(s,'공격권을 모두 사용했어요.');return false;}
 if(key==='f'&&(!s.pet||!s.ready||s.skillUsed||(s.pet.tier==='legend'&&s.hits<3))){event(s,s.pet?.tier==='legend'?'정답 3개와 전투 3회 명중으로 합동기를 준비해요.':'정답 3개로 펫 스킬을 준비해요.');return false;}
 const range=key==='s'?s.move[2]+65:key==='f'?(s.pet?.rank>=2?600:s.pet?.ability==='dash'?350:220):s.move[2];
 if(Math.hypot(s.enemyX-s.x,s.enemyY-s.y)>range){event(s,'몬스터 가까이 다가가서 공격하세요. 공격권은 그대로예요.');effect(s,'range',s.x,s.y,'#d7d4aa',range/100);return false;}
 s.ammoUsed++;s.cooldown.a=s.t+.48;if(key==='s')s.cooldown.s=s.t+3;
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
  const type=key==='s'?s.move[1]:'slash';impact(s,key==='s'?3:1,type);event(s,key==='s'?s.move[0]+'!':s.weapon.name+' · 기본 공격');
 }
 if(s.ammoUsed===s.ammo)s.finishAt=s.t+1.1;
 return true;
}
function activate(s){return action(s,'f');}
function report(s){return {rpg:true,hits:s.hits,dodges:s.dodges,bumps:s.bumps,skillUsed:s.skillUsed,combo:s.combo,hpLost:s.hpLost,attacksUsed:s.ammoUsed};}
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
 s.t+=dt;s.flash=Math.max(0,s.flash-dt);s.heroFlash=Math.max(0,s.heroFlash-dt);
 const speed=s.t<s.speedUntil?310:235;
 const dx=Number(input.direction)||0,dy=Number(input.vertical)||0,length=Math.max(1,Math.hypot(dx,dy));
 if(dx)s.targetX=s.x+dx/length*speed*dt;else if(Number.isFinite(input.x))s.targetX=input.x;
 if(dy)s.targetY=s.y+dy/length*speed*dt;else if(Number.isFinite(input.y))s.targetY=input.y;
 s.x=clamp(s.x+clamp(s.targetX-s.x,-speed*dt,speed*dt),40,W-40);s.y=clamp(s.y+clamp(s.targetY-s.y,-speed*dt,speed*dt),120,H-38);
 if(input.action)action(s,input.action);
 // Monsters approach, wind up a visible strike, then recover. No streams of bullets.
 if(!s.warning&&s.t>s.stagger&&s.finishAt===null){
  const angle=Math.atan2(s.y-s.enemyY,s.x-s.enemyX),dist=Math.hypot(s.x-s.enemyX,s.y-s.enemyY);
  if(dist>115){const v=(s.slow>s.t?20:43)*dt;s.enemyX+=Math.cos(angle)*v;s.enemyY+=Math.sin(angle)*v;}
  if(s.t>=s.attackAt){s.warning={x:s.x,y:s.y,r:s.boss?105:77,at:s.t+(s.grade<=3?1.5:1.15)};event(s,'몬스터가 반격을 준비해요! 붉은 원을 피하거나 D로 방어하세요.');}
 }
 if(s.warning&&s.t>=s.warning.at){
  const w=s.warning;effect(s,'quake',w.x,w.y,'#f4a282',w.r/65);
  if(Math.hypot(s.x-w.x,s.y-w.y)<w.r){
   if(s.guardUntil>s.t&&s.shield>0){s.shield--;label(s,'방어!',s.x,s.y-45,'#95edeb');}
   else{const damage=Math.min(s.hp,s.boss?12:8);s.hp-=damage;s.hpLost+=damage;s.bumps++;s.heroFlash=.4;label(s,'−'+damage+' HP',s.x,s.y-45,'#ffb3a4');event(s,'몬스터 반격! 모험 체력 −'+damage);}
  }else{s.dodges++;label(s,'회피!',s.x,s.y-45,'#c8efba');}
  s.warning=null;s.attackAt=s.t+2.6;
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
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#172e2b');bg.addColorStop(.3,'#315b45');bg.addColorStop(1,'#657855');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Quiet forest ruins, stone arena, grass and runes instead of a shooting grid.
  for(let i=0;i<12;i++){const x=i*57-12;ctx.fillStyle=i%2?'#183c2c':'#244733';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-45,130);ctx.lineTo(x+45,130);ctx.fill();ctx.fillStyle='#284437';ctx.fillRect(x-6,70,12,78);}
  ctx.fillStyle='#a0a18433';ctx.beginPath();ctx.ellipse(300,279,263,123,0,0,7);ctx.fill();ctx.strokeStyle='#d1c59840';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(300,279,222,98,0,0,7);ctx.stroke();
  for(let i=0;i<24;i++){const x=(i*127)%580+10,y=145+(i*61)%270;ctx.fillStyle='#c6c09a22';ctx.fillRect(x,y,22,9);ctx.strokeStyle='#b5c49366';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-6);ctx.stroke();}
  text(s.boss?'우리 반 보스 · 협동의 유적':'초록 숲 · 모험의 뜰',W/2,32,'#e6ead7',15);
  if(s.warning){const w=s.warning,p=clamp(1-(w.at-s.t)/1.5,0,1);ctx.lineWidth=2;circle(w.x,w.y,w.r,'#fa91762b','#f5ad80');circle(w.x,w.y,w.r*p,'#ee927a33');text('반격 예고',w.x,w.y-12,'#ffe4cf',12);}
  for(const [x,y,r] of [[s.x,s.y,26],[s.enemyX,s.enemyY,39]]){ctx.fillStyle='#112f3555';ctx.beginPath();ctx.ellipse(x,y+25,r,10,0,0,7);ctx.fill();}
  const ey=s.enemyY+(motion?Math.sin(s.t*2)*3:0);
  ctx.save();if(s.flash)ctx.filter='brightness(1.8)';if(monster.complete&&monster.naturalWidth)ctx.drawImage(monster,s.enemyX-57,ey-65,114,114);else{text(o.monsterIcon||'🍄',s.enemyX,ey+23,'#fff',70);}ctx.restore();
  if(s.guardUntil>s.t){ctx.lineWidth=3;circle(s.x,s.y,39,'#72bddc1c','#a9edeb');}
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
  text(touch?'왼쪽 이동 · 오른쪽 공격 / 스킬 / 방어 / 펫':'방향키 이동   ·   A 공격   S 무기 스킬   D 방어   F 펫',W/2,411,'#e6edcf',11);
  if(s.paused){ctx.fillStyle='#172f36ad';ctx.fillRect(0,0,W,H);text('잠깐 쉬는 중',W/2,H/2,'#fff',22);}
 }
 function loop(now){
  if(stopped)return;if(!canvas.isConnected){destroy();return;}const dt=last?(now-last)/1000:0;last=now;
  step(s,dt,{direction:stick.x||Number(held.has('arrowright'))-Number(held.has('arrowleft')),vertical:stick.y||Number(held.has('arrowdown'))-Number(held.has('arrowup')),x:aim,y:aimY});
  for(const e of s.events.splice(0))status.textContent=e.text;
  hud.textContent='♥ '+s.hp+'/100 · 💪 '+s.power+' · 공격권 '+(s.ammo-s.ammoUsed)+'/'+s.ammo+' · '+s.hits+'회 명중';
  for(const b of skillButtons){const k=b.dataset.rpgAction,cd=Math.max(0,s.cooldown[k]-s.t);b.disabled=s.paused||cd>0||(k!=='d'&&s.ammoUsed>=s.ammo)||(k==='f'&&(!s.pet||!s.ready||s.skillUsed||(s.pet.tier==='legend'&&s.hits<3)));const name=k==='a'?'기본 공격':k==='s'?s.move[0]:k==='d'?'방어':s.pet?.skill||'펫 없음';b.textContent=(touch?{a:'⚔',s:'✨',d:'🛡',f:'🐾'}[k]:k.toUpperCase())+' · '+name+(Number.isFinite(cd)&&cd>0?' '+Math.ceil(cd)+'초':'');}
  draw();if(s.finished){const result=s.report;destroy();onFinish(result);return;}frame=requestAnimationFrame(loop);
 }
 function destroy(){if(stopped)return;stopped=true;clearInput();cancelAnimationFrame(frame);abort.abort();if(host.open)host.close();}
 frame=requestAnimationFrame(loop);canvas.focus({preventScroll:true});return {state:s,destroy,pause:()=>setPause(true),report:()=>report(s)};
}
const API={create,step,action,activate,finish,report,mount,MOVES,stickVector,controlsHtml};if(typeof module==='object'&&module.exports)module.exports=API;root.PeskShooter=API;
})(typeof window!=='undefined'?window:globalThis);
