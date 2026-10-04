/* 🎓 학습 퀘스트 문제 생성기 — 초등 3~6학년 교육과정
   · 수학: 학년-학기-단원 구조. 단원별 절차적 생성(무한 생성 → 답 외우기 불가)
   · 영어: 학년군별 단어장
   · 오답 보기에 "흔한 실수"를 넣어 오답노트가 되도록 설계
   · 시드 RNG: 같은 학생·같은 날·같은 문항번호면 항상 같은 문제 (새로고침 리롤 방지)
   교사가 학년/학기/단원을 고르면 그 단원만 출제됩니다.
*/
(function(){
'use strict';

/* ───────── 유틸 ───────── */
function makeRng(seedStr){
  const s = String(seedStr);
  let h = 1779033703 ^ s.length;
  for(let i=0;i<s.length;i++){ h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h<<13 | h>>>19; }
  let a = h >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a>>>15, 1|a);
    t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  };
}
const ri   = (r,lo,hi) => lo + Math.floor(r()*(hi-lo+1));
const pick = (r,a) => a[Math.floor(r()*a.length)];
function shuffle(r,arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b];} return a||1; }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function fr(n,d){ if(d<0){n=-n;d=-d;} const g=gcd(n,d); return {n:n/g, d:d/g}; }
function frStr(f){
  const {n,d} = fr(f.n,f.d);
  if(d===1) return String(n);
  if(Math.abs(n)<d) return n+'/'+d;
  const w=Math.trunc(n/d), r=Math.abs(n%d);
  return w+' '+r+'/'+d;
}
/* 받침을 보고 조사를 골라줌 — "모서리은(는)" 같은 어색한 표기 방지
   숫자로 끝나면 읽는 소리(일·이·삼…)의 받침을 따름 */
const _NUM_JONG = {'0':true,'1':true,'3':true,'6':true,'7':true,'8':true,'2':false,'4':false,'5':false,'9':false};
function hasJong(word){
  const s = String(word).replace(/[)\]\s]+$/,'');
  const ch = s[s.length-1];
  if(!ch) return false;
  if(/[0-9]/.test(ch)) return !!_NUM_JONG[ch];
  const code = ch.charCodeAt(0);
  if(code < 0xAC00 || code > 0xD7A3) return false;   // 한글이 아니면 받침 없음으로
  return (code - 0xAC00) % 28 !== 0;
}
function J(word, withJong, withoutJong){
  return String(word) + (hasJong(word) ? withJong : withoutJong);
}
const eun = w => J(w,'은','는');
const eul = w => J(w,'을','를');
const iga = w => J(w,'이','가');

const rnd = (x,p) => { const m=Math.pow(10,p); return Math.round(x*m)/m; };
const dec = x => String(rnd(x,4));
const comma = n => Number(n).toLocaleString('ko-KR');

function numericValue(value){
  const s=String(value??'').normalize('NFKC').trim();
  if(/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s)){
    const n=Number(s.replace(/,/g,''));return Number.isFinite(n)?n:null;
  }
  const m=s.match(/^(?:(\d+)(?:과)?\s+)?(\d+)\/(\d+)$/);
  return m&&Number(m[3])>0?Number(m[1]||0)+Number(m[2])/Number(m[3]):null;
}
function answerKey(value){const n=numericValue(value);return n===null?'s:'+String(value):'n:'+n.toFixed(10);}
function sameAnswer(q,value){
  if(q.subject==='english'&&q.responseMode==='short')return String(value).normalize('NFKC').trim().toLowerCase()===String(q.answer).toLowerCase();
  return answerKey(value)===answerKey(q.answer);
}
function fractionDisplay(n,d){
  const whole=Math.floor(n/d),rest=n%d;
  return !rest?String(whole):whole?`${whole} ${rest}/${d}`:`${rest}/${d}`;
}

/* 보기 만들기: 정답 + 오답3. 중복/정답충돌 제거, 모자라면 filler 로 채움 */
function opts(r, answer, wrongs, filler){
  const out=[answer], seen=new Set([answerKey(answer)]);
  for(const w of (wrongs||[])){
    if(w===null||w===undefined) continue;
    const s=answerKey(w);
    if(String(w)===''||/NaN|Infinity|undefined/.test(String(w))||seen.has(s)) continue;
    seen.add(s); out.push(w);
    if(out.length>=4) break;
  }
  let g=0;
  while(out.length<4 && g++<80){
    const fraction=String(answer).match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
    const f = filler ? filler(r,g) : fraction ? `${Number(fraction[1]||0)*Number(fraction[3])+Number(fraction[2])+g}/${fraction[3]}` : (numericValue(answer)!==null ? dec(numericValue(answer)+g) : null);
    if(f===null||f===undefined) continue;
    const s=answerKey(f);
    if(String(f)===''||/NaN|Infinity|undefined/.test(String(f))||seen.has(s)) continue;
    seen.add(s); out.push(f);
  }
  return shuffle(r,out);
}
/* 숫자 답 문제 헬퍼 */
function Qn(q, answer, wrongs, explain, r){
  // 초등 자연수 문항은 오답 보기와 빈칸 채우기용 보기에도 음수를 넣지 않는다.
  const value=numericValue(answer),nonnegative=value!==null&&value>=0;
  const clean=(wrongs||[]).filter(x=>numericValue(x)!==null&&(!nonnegative||numericValue(x)>=0));
  return {q, answer, options: opts(r, answer, clean, (rr,g)=>{
    const candidate=value+(g%2?g:-g);
    const n=nonnegative&&candidate<0?value+g:candidate;
    return typeof answer==='string'&&answer.includes(',')?comma(n):dec(n);
  }), explain};
}

/* ───────── 교육과정 정의 ─────────
   각 단원: {no, name, gen(r, tier) | null}
   gen 이 null 이면 자동 출제가 어려운 단원(도형 이동, 그래프 읽기 등) → 교사 화면에서 '준비 중'
*/
const C = {math:{}, };
function sem(grade, term, units){ C.math[grade+'-'+term] = units; }
const U = (no,name,gen) => ({no,name,gen:gen||null});

/* ===== 3학년 1학기 ===== */
sem(3,1,[
U(1,'덧셈과 뺄셈',(r,t)=>{
  const a=ri(r,t>=2?300:100, t>=2?899:499), b=ri(r,t>=2?200:100, t>=2?a-1:a);
  const plus=r()<0.5, ans=plus?a+b:a-b;
  return Qn(`계산해 보세요.\n${a} ${plus?'+':'-'} ${b}`, ans,
    [plus?a-b:a+b, ans+10, ans-100], plus?'받아올림에 주의하세요.':'받아내림에 주의하세요.', r);
}),
U(2,'평면도형',(r,t)=>{
  const k=pick(r,['angle','side']);
  if(k==='angle'){
    const shp=pick(r,[['직사각형',4],['정사각형',4],['직각삼각형',1]]);
    return Qn(`${shp[0]}에 있는 직각은 모두 몇 개일까요?`, shp[1], [shp[1]+1, shp[1]-1, 2],
      '직각은 반듯하게 만나는 각이에요.', r);
  }
  const shp=pick(r,[['삼각형',3],['사각형',4],['오각형',5],['육각형',6]]);
  return Qn(`${shp[0]}의 변은 모두 몇 개일까요?`, shp[1], [shp[1]+1, shp[1]-1, shp[1]+2],
    `${shp[0]}은 변이 ${shp[1]}개예요.`, r);
}),
U(3,'나눗셈',(r,t)=>{
  const b=ri(r,2,9), q=ri(r,2,9), a=b*q;
  return Qn(`계산해 보세요.\n${a} ÷ ${b}`, q, [a-b, b, q+1], `${b} × ${q} = ${a} 이므로 몫은 ${q}예요.`, r);
}),
U(4,'곱셈',(r,t)=>{
  const a=ri(r,t>=2?12:2, t>=2?99:9), b=ri(r,2,9), ans=a*b;
  return Qn(`계산해 보세요.\n${a} × ${b}`, ans, [a+b, ans+a, ans-b], '자리마다 곱한 뒤 더해요.', r);
}),
U(5,'길이와 시간',(r,t)=>{
  const k=pick(r,['len','time']);
  if(k==='len'){
    const a=ri(r,1,9), b=ri(r,1,9), millimetres=r()<0.5, factor=millimetres?10:1000;
    return Qn(`${a}${millimetres?'cm':'km'} ${b}${millimetres?'mm':'m'}는 몇 ${millimetres?'mm':'m'}일까요?`,a*factor+b,[a+b,a*factor,a*factor+b+factor],millimetres?'1cm = 10mm예요.':'1km = 1000m예요.',r);
  }
  const mi=ri(r,1,50), se=ri(r,1,59), ans=mi*60+se;
  return Qn(`${mi}분 ${se}초는 몇 초일까요?`, ans, [mi+se, mi*100+se, ans+60], '1분 = 60초 예요.', r);
}),
U(6,'분수와 소수',(r,t)=>{
  if(r()<0.5){
    const d=ri(r,3,9), n=ri(r,1,d-1);
    return {q:`전체를 똑같이 ${d}로 나눈 것 중 ${n}만큼을 분수로 나타내면?`, answer:`${n}/${d}`,
      options:opts(r,`${n}/${d}`,[`${d}/${n}`,`${n}/${d+1}`,`${n+1}/${d}`],(rr,g)=>`${n}/${d+g}`),
      explain:'분모는 전체를 나눈 수, 분자는 그중 세는 수예요.'};
  }
  const n=ri(r,1,9), ans=dec(n/10);
  return {q:`1/10 이 ${n}개이면 소수로 얼마일까요?`, answer:ans,
    options:opts(r,ans,[String(n), dec(n/100), dec(n)], (rr,g)=>dec((n+g)/10)),
    explain:'1/10 = 0.1 이에요.'};
})]);

/* ===== 3학년 2학기 ===== */
sem(3,2,[
U(1,'곱셈',(r,t)=>{
  const a=ri(r,t===2?100:12, t===2?999:99), b=ri(r,t>=3?11:2, t>=3?99:9), ans=a*b;
  return Qn(`계산해 보세요.\n${a} × ${b}`, ans, [ans+a, ans-b, a+b], '자리마다 곱해 더해요.', r);
}),
U(2,'나눗셈',(r,t)=>{
  const b=ri(r,2,9), q=ri(r,11,t>=2?99:49), rem=t>=2?ri(r,0,b-1):0;
  const a=b*q+rem;
  if(rem===0) return Qn(`계산해 보세요.\n${a} ÷ ${b}`, q, [q+1,q-1,a-b], `${b} × ${q} = ${a}`, r);
  return Qn(`${a} ÷ ${b} 의 나머지를 구하세요.`, rem, [q, rem+1, b-rem], `${a} = ${b} × ${q} + ${rem}`, r);
}),
U(3,'원',(r,t)=>{
  if(r()<0.5){ const rad=ri(r,2,20), ans=rad*2;
    return Qn(`반지름이 ${rad}cm인 원의 지름은 몇 cm일까요?`, ans, [rad, rad+2, ans+2], '지름 = 반지름 × 2', r); }
  const dia=ri(r,2,20)*2, ans=dia/2;
  return Qn(`지름이 ${dia}cm인 원의 반지름은 몇 cm일까요?`, ans, [dia, dia*2, ans+1], '반지름 = 지름 ÷ 2', r);
}),
U(4,'분수',(r,t)=>{
  // 3학년은 분수의 의미·종류·크기 비교를 다룬다. 분수 덧뺄셈은 4학년 단원에 둔다.
  const d=ri(r,3,9), n=ri(r,1,d-1), kind=pick(r,t>=2?['part','compare','mixed']:['part','compare']);
  if(kind==='part'){
    const group=ri(r,2,9), total=d*group;
    return Qn(`구슬 ${total}개의 ${n}/${d}은 몇 개일까요?`,group*n,
      [group, d*n, total-n], `${total}개를 ${d}묶음으로 똑같이 나눈 뒤 ${n}묶음을 세어요.`,r);
  }
  if(kind==='mixed'){
    const whole=ri(r,1,3), numerator=whole*d+n, answer=`${numerator}/${d}`;
    return {q:`대분수 ${whole} ${n}/${d}을 가분수로 나타내면?`,answer,
      options:opts(r,answer,[`${whole+n}/${d}`,`${whole*d}/${d}`,`${numerator+1}/${d}`]),
      explain:`1은 ${d}/${d}이므로 ${whole} ${n}/${d}은 ${numerator}/${d}이에요.`};
  }
  const den=ri(r,5,9), nums=shuffle(r,Array.from({length:den-1},(_,i)=>i+1)).slice(0,4);
  const answer=`${Math.max(...nums)}/${den}`;
  return {q:'다음 분수 중 가장 큰 분수는?',answer,options:nums.map(x=>`${x}/${den}`),
    explain:'분모가 같을 때는 분자가 큰 분수가 더 커요.'};
}),
U(5,'들이와 무게',(r,t)=>{
  if(r()<0.5){ const L=ri(r,1,9), mL=ri(r,1,999), ans=L*1000+mL;
    return Qn(`${L}L ${mL}mL 는 몇 mL일까요?`, ans, [L+mL, L*100+mL, ans+1000], '1L = 1000mL 예요.', r); }
  const kg=ri(r,1,9), g=ri(r,1,999), ans=kg*1000+g;
  return Qn(`${kg}kg ${g}g 은 몇 g일까요?`, ans, [kg+g, kg*100+g, ans+1000], '1kg = 1000g 이에요.', r);
}),
U(6,'자료의 정리',(r,t)=>{
  const names=shuffle(r,['사과','포도','딸기','수박','귤']).slice(0,4);
  const vals=shuffle(r,Array.from({length:18},(_,i)=>i+3)).slice(0,4);
  const total=vals.reduce((a,b)=>a+b,0);
  const k=pick(r,['max','total']);
  if(k==='max'){
    const mx=Math.max(...vals), ans=names[vals.indexOf(mx)];
    return {q:`표를 보고 물음에 답하세요.\n${names.map((n,i)=>n+' '+vals[i]+'명').join(' / ')}\n\n가장 많은 학생이 좋아하는 과일은?`,
      answer:ans, options:opts(r,ans,shuffle(r,names.filter(n=>n!==ans)).slice(0,3),(rr,g)=>names[g%names.length]),
      explain:`${ans}이(가) ${mx}명으로 가장 많아요.`};
  }
  return Qn(`표를 보고 물음에 답하세요.\n${names.map((n,i)=>n+' '+vals[i]+'명').join(' / ')}\n\n조사한 학생은 모두 몇 명일까요?`,
    total, [total-vals[0], total+10, Math.max(...vals)], '각 항목의 수를 모두 더해요.', r);
})]);

/* ===== 4학년 1학기 ===== */
sem(4,1,[
U(1,'큰 수',(r,t)=>{
  const k=pick(r,['place','times']);
  if(k==='place'){
    const n=ri(r,1000,9999)*ri(r,1000,9999);
    const s=String(n), pos=ri(r,1,Math.min(4,s.length-1));
    const digit=Number(s[s.length-1-pos]);
    const names={1:'십',2:'백',3:'천',4:'만'};
    return Qn(`${comma(n)} 에서 ${names[pos]}의 자리 숫자는 무엇일까요?`, digit,
      [Number(s[s.length-pos])||0, (digit+1)%10, (digit+2)%10], '오른쪽부터 일·십·백·천의 자리예요.', r);
  }
  const base=ri(r,2,9)*1000, mul=pick(r,[10,100,1000]);
  const ans=base*mul;
  return Qn(`${comma(base)} 의 ${mul}배는 얼마일까요?`, comma(ans),
    [comma(base*mul*10), comma(base*mul/10), comma(base+mul)],
    `${mul}배는 0을 ${String(mul).length-1}개 더 붙여요.`, r);
}),
U(2,'각도',(r,t)=>{
  const k=pick(r,['sum','tri']);
  if(k==='tri'){
    const a=ri(r,20,110), b=ri(r,20,160-a), ans=180-a-b;
    return Qn(`삼각형의 두 각이 ${a}°, ${b}° 일 때 나머지 한 각은 몇 도일까요?`, ans,
      [180-a, a+b, 360-a-b], '삼각형 세 각의 합은 180°예요.', r);
  }
  const a=ri(r,20,150), ans=180-a;
    return Qn(`한 직선을 이루는 두 각 중 하나가 ${a}°입니다. 다른 각은 몇 도일까요?`, ans,
    [90-a>0?90-a:a+90, 360-a, a], '두 각의 합이 180°가 되는 각이에요.', r);
}),
U(3,'곱셈과 나눗셈',(r,t)=>{
  if(r()<0.5){ const a=ri(r,101,999), b=ri(r,11,99), ans=a*b;
    return Qn(`계산해 보세요.\n${a} × ${b}`, comma(ans), [comma(ans+a), comma(ans-b), comma(a+b)], '자리마다 곱해 더해요.', r); }
  const b=ri(r,11,99), a=ri(r,b,999), q=Math.floor(a/b), rem=a%b;
  return Qn(`${comma(a)} ÷ ${b} 의 몫을 구하세요.`, q, [q+1, q-1, q+10], `${a} = ${b} × ${q} + ${rem}이므로 몫은 ${q}, 나머지는 ${rem}이에요.`, r);
}),
U(4,'평면도형의 이동', null),
U(5,'막대그래프', null),
U(6,'규칙 찾기',(r,t)=>{
  const a=ri(r,2,9), b=ri(r,1,20), n=ri(r,6,12);
  const seq=[1,2,3,4,5].map(i=>a*i+b);
  const ans=a*n+b;
  return Qn(`규칙을 찾아 ${n}번째 수를 구하세요.\n${seq.join(', ')}, ...`, ans,
    [a*n, seq[4]+a, ans+a], `${a}씩 커지는 규칙이에요. (${n}번째 = ${a}×${n}${b?'+'+b:''})`, r);
})]);

/* ===== 4학년 2학기 ===== */
sem(4,2,[
U(1,'분수의 덧셈과 뺄셈',(r,t)=>{
  const d=ri(r,3,12);
  const n1=ri(r,1,d*2), n2=ri(r,1,d*2);
  const plus=r()<0.5;
  if(plus){ const ans=fractionDisplay(n1+n2,d);
    return {q:`계산해 보세요.\n${fractionDisplay(n1,d)} + ${fractionDisplay(n2,d)}`, answer:ans,
      options:opts(r,ans,[frStr(fr(n1+n2,d*2)), frStr(fr(n1+n2+1,d)), frStr(fr(n1+n2-1,d))],(rr,g)=>frStr(fr(n1+n2+g,d))),
      explain:'분모가 같으면 분자끼리 더한 뒤 대분수로 고쳐요.'};
  }
  const A=Math.max(n1,n2), B=Math.min(n1,n2);
  if(A===B) return C.math['4-2'][0].gen(r,t);
  const ans=fractionDisplay(A-B,d);
  return {q:`계산해 보세요.\n${fractionDisplay(A,d)} - ${fractionDisplay(B,d)}`, answer:ans,
    options:opts(r,ans,[frStr(fr(A+B,d)), frStr(fr(A-B+1,d)), frStr(fr(A-B-1,d))],(rr,g)=>frStr(fr(A-B+g,d))),
    explain:'자연수 부분끼리, 분수 부분끼리 빼요. 모자라면 받아내림해요.'};
}),
U(2,'삼각형',(r,t)=>{
  const k=pick(r,['iso','kind']);
  if(k==='iso'){
    const apex=ri(r,20,140);
    if((180-apex)%2!==0) return C.math['4-2'][1].gen(r,t);
    const ans=(180-apex)/2;
    return Qn(`이등변삼각형의 꼭지각이 ${apex}° 일 때, 한 밑각은 몇 도일까요?`, ans,
      [180-apex, apex, ans+10], '이등변삼각형의 두 밑각은 크기가 같아요.', r);
  }
  const set=pick(r,[[[60,60,60],'세 각이 모두 예각이다.'],[[90,45,45],'직각이 한 개 있다.'],[[100,40,40],'둔각이 한 개 있다.'],[[70,60,50],'세 각이 모두 예각이다.']]);
  return {q:`세 각이 ${set[0].join('°, ')}°인 삼각형에 대한 설명으로 알맞은 것은?`,answer:set[1],
    options:opts(r,set[1],['세 각이 모두 예각이다.','직각이 한 개 있다.','둔각이 한 개 있다.','직각이 두 개 있다.']),
    explain:'90°보다 작으면 예각, 90°이면 직각, 90°보다 크면 둔각이에요.'};
}),
U(3,'소수의 덧셈과 뺄셈',(r,t)=>{
  const p=t>=2?2:1, m=Math.pow(10,p);
  const a=rnd(ri(r,11,999)/m,p), b=rnd(ri(r,11,999)/m,p);
  const plus=r()<0.5;
  if(!plus && a<b) return C.math['4-2'][2].gen(r,t);
  const ans=dec(plus?rnd(a+b,p):rnd(a-b,p));
  return Qn(`계산해 보세요.\n${a} ${plus?'+':'-'} ${b}`, ans,
    [dec(plus?rnd(a-b,p):rnd(a+b,p)), dec(rnd((plus?a+b:a-b)*10,p)), dec(rnd((plus?a+b:a-b)/10,p+1))],
    '소수점의 자리를 맞추어 계산해요.', r);
}),
U(4,'사각형',(r,t)=>{
  const k=pick(r,['angle','name']);
  if(k==='angle'){
    const a=ri(r,50,130), ans=180-a;
    return Qn(`평행사변형의 한 각이 ${a}° 일 때, 그 각과 이웃한 각은 몇 도일까요?`, ans,
      [a, 360-a, ans+10], '평행사변형에서 이웃한 두 각의 합은 180°예요.', r);
  }
  const set=pick(r,[['정사각형','네 변의 길이가 모두 같고 네 각이 모두 직각이다.'],['직사각형','네 각이 모두 직각이다.'],['마름모','네 변의 길이가 모두 같다.'],['평행사변형','마주 보는 두 쌍의 변이 각각 평행하다.']]);
  return {q:`${set[0]}에 항상 알맞은 설명은?`,answer:set[1],
    options:opts(r,set[1],['변이 다섯 개이다.','직각이 반드시 한 개뿐이다.','마주 보는 변이 모두 평행하지 않다.']),explain:`${set[0]}은 ${set[1]}`};
}),
U(5,'꺾은선그래프', null),
U(6,'다각형',(r,t)=>{
  const n=ri(r,3,8),name={3:'정삼각형',4:'정사각형',5:'정오각형',6:'정육각형',7:'정칠각형',8:'정팔각형'}[n];
  if(r()<0.5)return Qn(`${name}의 한 변의 길이가 3cm입니다. 길이가 3cm인 변은 모두 몇 개일까요?`,n,[n-1,n+1,3*n],'정다각형은 모든 변의 길이가 같아요.',r);
  return {q:'다각형의 대각선에 대한 설명으로 알맞은 것은?',answer:'서로 이웃하지 않는 두 꼭짓점을 이은 선분이다.',options:opts(r,'서로 이웃하지 않는 두 꼭짓점을 이은 선분이다.',['서로 이웃한 두 꼭짓점을 이은 변이다.','도형 바깥에 그은 모든 직선이다.','도형의 둘레를 따라 그은 곡선이다.']),explain:'대각선은 서로 이웃하지 않는 두 꼭짓점을 이은 선분이에요.'};
})]);

/* ===== 5학년 1학기 ===== */
sem(5,1,[
U(1,'자연수의 혼합 계산',(r,t)=>{
  const a=ri(r,2,t>=3?15:9), b=ri(r,2,9), c=ri(r,2,9), d=ri(r,2,9);
  let q,ans,wrong;
  if(t===1){ q=`${a} + ${b} × ${c}`; ans=a+b*c; wrong=(a+b)*c; }
  else if(t===2){ q=`${a} × (${b} + ${c})`; ans=a*(b+c); wrong=a*b+c; }
  else { const s=b+c; q=`${a*s} ÷ ${s} + ${d} × ${b}`; ans=a+d*b; wrong=(a+d)*b; }
  return Qn(`계산해 보세요.\n${q}`, ans, [wrong, ans+ri(r,1,5), ans-ri(r,1,5)],
    '괄호 → 곱셈·나눗셈 → 덧셈·뺄셈 순서로 계산해요.', r);
}),
U(2,'약수와 배수',(r,t)=>{
  const k=t===1?'gcd':pick(r,['gcd','lcm','count']);
  if(k==='count'){
    const n=pick(r,[12,18,20,24,28,30,36,40,45,48]);
    let c=0; for(let i=1;i<=n;i++) if(n%i===0) c++;
    return Qn(`${n}의 약수는 모두 몇 개일까요?`, c, [c+1,c-1,c+2], `${n}을 나누어떨어지게 하는 수를 세요.`, r);
  }
  const base=ri(r,2,9), a=base*ri(r,2,t>=3?9:6), b=base*ri(r,2,t>=3?9:6);
  if(a===b) return C.math['5-1'][1].gen(r,t);
  if(k==='gcd'){ const ans=gcd(a,b);
    return Qn(`${a}와 ${b}의 최대공약수를 구하세요.`, ans, [lcm(a,b), Math.min(a,b), ans*2],
      '두 수를 모두 나누어떨어지게 하는 수 중 가장 큰 수예요.', r); }
  const ans=lcm(a,b);
  return Qn(`${a}와 ${b}의 최소공배수를 구하세요.`, ans, [a*b, gcd(a,b), ans+Math.min(a,b)],
    '두 수의 공배수 중 가장 작은 수예요. (두 수의 곱이 항상 답은 아니에요)', r);
}),
U(3,'규칙과 대응',(r,t)=>{
  const a=ri(r,2,t>=2?7:4), b=0;
  const xs=[1,2,3,4], ys=xs.map(x=>a*x+b), askX=ri(r,6,12), ans=a*askX+b;
  return Qn(`표에서 ○와 △ 사이의 규칙을 찾아, ○가 ${askX}일 때 △를 구하세요.\n○ : ${xs.join(', ')}\n△ : ${ys.join(', ')}`,
    ans, [a*askX, askX+b, ans+a], `△ = ○ × ${a}${b?' + '+b:''}`, r);
}),
U(4,'약분과 통분',(r,t)=>{
  if(r()<0.6){
    const d0=ri(r,2,9), n0=ri(r,1,d0-1), k=ri(r,2,t>=3?9:5);
    const ans=frStr({n:n0,d:d0});
    return {q:`${n0*k}/${d0*k}를 기약분수로 나타내세요.`, answer:ans,
      options:opts(r,ans,[`${n0*k}/${d0}`, `${n0}/${d0*k}`, frStr(fr(n0+1,d0))],(rr,g)=>frStr(fr(n0+g,d0+g))),
      explain:`분자와 분모를 최대공약수 ${gcd(n0*k,d0*k)}(으)로 나누어요.`};
  }
  const d1=ri(r,2,9); let d2=ri(r,2,9); if(d2===d1) d2=d1+1;
  const ans=lcm(d1,d2);
  return Qn(`${d1}분의 □ 와 ${d2}분의 □ 를 통분할 때, 공통분모로 알맞은 가장 작은 수는?`,
    ans, [d1*d2, gcd(d1,d2), ans+d1], `${d1}과 ${d2}의 최소공배수예요.`, r);
}),
U(5,'분수의 덧셈과 뺄셈',(r,t)=>{
  const d1=ri(r,2,t>=3?12:8); let d2=ri(r,2,t>=3?12:8); if(d2===d1) d2=d1+1;
  const n1=ri(r,1,d1-1), n2=ri(r,1,d2-1), plus=r()<0.5;
  const res = plus ? fr(n1*d2+n2*d1, d1*d2) : fr(n1*d2-n2*d1, d1*d2);
  if(!plus && res.n<=0) return C.math['5-1'][4].gen(r,t);
  const ans=frStr(res);
  const naive = plus ? `${n1+n2}/${d1+d2}` : `${Math.abs(n1-n2)}/${Math.abs(d1-d2)||1}`;
  return {q:`계산해 보세요.\n${n1}/${d1} ${plus?'+':'-'} ${n2}/${d2}`, answer:ans,
    options:opts(r,ans,[naive, frStr(fr(res.n+1,res.d)), frStr(fr(res.n,res.d+1))],(rr,g)=>frStr(fr(res.n+g,res.d))),
    explain:`통분해서 계산해요. 공통분모는 ${lcm(d1,d2)}예요.`};
}),
U(6,'다각형의 둘레와 넓이',(r,t)=>{
  const k=t===1?pick(r,['para','tri']):pick(r,['para','tri','trap','rhom','peri']);
  if(k==='peri'){ const w=ri(r,3,20), h=ri(r,3,20), ans=(w+h)*2;
    return Qn(`가로 ${w}cm, 세로 ${h}cm인 직사각형의 둘레는 몇 cm일까요?`, ans, [w*h, w+h, ans/2],
      '직사각형의 둘레 = (가로 + 세로) × 2', r); }
  if(k==='para'){ const b=ri(r,3,15), h=ri(r,3,15), ans=b*h;
    return Qn(`밑변이 ${b}cm, 높이가 ${h}cm인 평행사변형의 넓이는 몇 cm²일까요?`, ans,
      [b*h/2, (b+h)*2, b+h], '평행사변형의 넓이 = 밑변 × 높이', r); }
  if(k==='tri'){ const b=ri(r,3,15)*2, h=ri(r,3,15), ans=b*h/2;
    return Qn(`밑변이 ${b}cm, 높이가 ${h}cm인 삼각형의 넓이는 몇 cm²일까요?`, ans,
      [b*h, (b+h)*2, b+h], '삼각형의 넓이 = 밑변 × 높이 ÷ 2 (÷2 잊지 않기!)', r); }
  if(k==='trap'){ const a=ri(r,3,12), b=a+ri(r,1,8), h=ri(r,2,9)*2, ans=(a+b)*h/2;
    return Qn(`윗변 ${a}cm, 아랫변 ${b}cm, 높이 ${h}cm인 사다리꼴의 넓이는 몇 cm²일까요?`, ans,
      [(a+b)*h, a*b, (a+b+h)*2], '사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2', r); }
  const d1=ri(r,2,12)*2, d2=ri(r,2,12), ans=d1*d2/2;
  return Qn(`두 대각선이 ${d1}cm, ${d2}cm인 마름모의 넓이는 몇 cm²일까요?`, ans,
    [d1*d2, (d1+d2)*2, d1+d2], '마름모의 넓이 = 두 대각선의 곱 ÷ 2', r);
})]);

/* ===== 5학년 2학기 ===== */
sem(5,2,[
U(1,'수의 범위와 어림하기',(r,t)=>{
  const k=pick(r,['round','range']);
  if(k==='range'){
    const n=ri(r,10,60);
    const kind=pick(r,[['이상',n,'포함'],['초과',n,'미포함'],['이하',n,'포함'],['미만',n,'미포함']]);
    const ans=kind[2]==='포함'?'포함된다':'포함되지 않는다';
    return {q:`${n} ${kind[0]}인 수의 범위에 ${n}${hasJong(n)?"은":"는"} 포함될까요?`, answer:ans,
      options:opts(r,ans,[ans==='포함된다'?'포함되지 않는다':'포함된다','알 수 없다','때에 따라 다르다'],(rr,g)=>'모두 맞다'),
      explain:'이상·이하는 그 수를 포함하고, 초과·미만은 포함하지 않아요.'};
  }
  const place=t>=2?pick(r,[10,100,1000]):pick(r,[10,100]);
  const n=ri(r, place*3, place*99);
  const kind=pick(r,['반올림','올림','버림']);
  const label={10:'십',100:'백',1000:'천'}[place];
  const ans = kind==='반올림'?Math.round(n/place)*place : kind==='올림'?Math.ceil(n/place)*place : Math.floor(n/place)*place;
  const other = kind==='올림'?Math.floor(n/place)*place : Math.ceil(n/place)*place;
  return Qn(`${eul(comma(n))} ${kind}하여 ${label}의 자리까지 나타내세요.`, comma(ans),
    [comma(other), comma(ans+place), comma(ans-place)],
    kind==='반올림'?`${label}의 자리 바로 아랫자리가 5 이상이면 올리고 4 이하면 버려요.`
    :kind==='올림'?'아랫자리에 수가 있으면 무조건 올려요.':'아랫자리를 무조건 0으로 만들어요.', r);
}),
U(2,'분수의 곱셈',(r,t)=>{
  const d1=ri(r,2,9), n1=ri(r,1,d1-1);
  if(t===1){ const k=ri(r,2,9), res=fr(n1*k,d1), ans=frStr(res);
    return {q:`계산해 보세요.\n${n1}/${d1} × ${k}`, answer:ans,
      options:opts(r,ans,[frStr(fr(n1,d1*k)), frStr(fr(n1*k,d1*k)), frStr(fr(n1+k,d1))],(rr,g)=>frStr(fr(n1*k+g,d1))),
      explain:'분수에 자연수를 곱할 때는 분자에만 곱해요.'};
  }
  const d2=ri(r,2,9), n2=ri(r,1,d2-1), res=fr(n1*n2,d1*d2), ans=frStr(res);
  return {q:`계산해 보세요.\n${n1}/${d1} × ${n2}/${d2}`, answer:ans,
    options:opts(r,ans,[frStr(fr(n1*d2+n2*d1,d1*d2)), frStr(fr(n1*n2,d1+d2)), frStr(fr(n1+n2,d1*d2))],(rr,g)=>frStr(fr(res.n+g,res.d))),
    explain:'분자는 분자끼리, 분모는 분모끼리 곱해요.'};
}),
U(3,'합동과 대칭',(r,t)=>{
  const k=pick(r,['side','angle']);
  const v=ri(r,3,20);
  if(k==='side') return Qn(`서로 합동인 두 도형에서, 한 도형의 변이 ${v}cm이면 대응하는 변은 몇 cm일까요?`,
    v, [v*2, v+1, v-1], '합동인 도형의 대응변의 길이는 서로 같아요.', r);
  const a=ri(r,20,150);
  return Qn(`서로 합동인 두 도형에서, 한 도형의 각이 ${a}° 이면 대응하는 각은 몇 도일까요?`,
    a, [180-a, a*2, 360-a], '합동인 도형의 대응각의 크기는 서로 같아요.', r);
}),
U(4,'소수의 곱셈',(r,t)=>{
  if(t===1){ const a=rnd(ri(r,11,99)/10,1), k=ri(r,2,9), ans=dec(rnd(a*k,3));
    return Qn(`계산해 보세요.\n${a} × ${k}`, ans, [dec(rnd(a*k/10,3)), dec(rnd(a*k*10,3)), dec(rnd(a+k,3))],
      '자연수처럼 곱한 뒤 소수점 자리 수만큼 소수점을 찍어요.', r); }
  const a=rnd(ri(r,11,99)/10,1), b=rnd(ri(r,11,99)/10,1), ans=dec(rnd(a*b,3));
  return Qn(`계산해 보세요.\n${a} × ${b}`, ans, [dec(rnd(a*b*10,3)), dec(rnd(a*b/10,4)), dec(rnd(a+b,3))],
    `${a}는 소수 1자리, ${b}도 소수 1자리이므로 답은 소수 2자리예요.`, r);
}),
U(5,'직육면체',(r,t)=>{
  const k=pick(r,['edge','count']);
  if(k==='count'){
    const set=pick(r,[['면',6],['모서리',12],['꼭짓점',8]]);
    return Qn(`직육면체의 ${eun(set[0])} 모두 몇 개일까요?`, set[1], [set[1]+2, set[1]-2, set[1]*2],
      '직육면체는 면 6개, 모서리 12개, 꼭짓점 8개예요.', r);
  }
  const a=ri(r,2,12), b=ri(r,2,12), c=ri(r,2,12), ans=(a+b+c)*4;
  return Qn(`가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm인 직육면체의 모든 모서리 길이의 합은 몇 cm일까요?`,
    ans, [(a+b+c)*2, a*b*c, a+b+c], '길이가 같은 모서리가 4개씩 3종류 있어요. (가로+세로+높이) × 4', r);
}),
U(6,'평균과 가능성',(r,t)=>{
  if(r()<0.7){
    const cnt=t===1?4:5, mean=ri(r,5,30), vals=[]; let sum=0;
    for(let i=0;i<cnt-1;i++){ const v=mean+ri(r,-4,4); vals.push(v); sum+=v; }
    vals.push(mean*cnt-sum);
    if(vals[vals.length-1]<1) return C.math['5-2'][5].gen(r,t);
    return Qn(`다음 자료의 평균을 구하세요.\n${shuffle(r,vals).join(', ')}`, mean,
      [mean+1, mean-1, Math.max(...vals)], `모두 더하면 ${mean*cnt}, ${cnt}(으)로 나누면 평균이에요.`, r);
  }
  const set=pick(r,[['동전 한 개를 던질 때 그림 면이 나올','1/2'],
                    ['각 눈이 나올 가능성이 같은 주사위를 굴릴 때 짝수가 나올','1/2'],
                    ['주사위를 굴릴 때 7이 나올','0'],
                    ['주사위를 굴릴 때 6 이하가 나올','1']]);
  return {q:`${set[0]} 가능성을 수로 나타내면?`, answer:set[1],
    options:opts(r,set[1],['1/2','0','1','가능성을 정할 수 없다']),
    explain:'확실하면 1, 불가능하면 0, 일어날 가능성과 일어나지 않을 가능성이 같으면 1/2로 나타내요.'};
})]);

/* ===== 6학년 1학기 ===== */
sem(6,1,[
U(1,'분수의 나눗셈',(r,t)=>{
  const d=ri(r,2,9), n=ri(r,1,d-1), k=ri(r,2,9);
  { const res=fr(n,d*k), ans=frStr(res);
    return {q:`계산해 보세요.\n${n}/${d} ÷ ${k}`, answer:ans,
      options:opts(r,ans,[frStr(fr(n*k,d)), frStr(fr(n,d+k)), frStr(fr(n*k,d*k))],(rr,g)=>frStr(fr(n,d*k+g))),
      explain:'분수를 자연수로 나눌 때는 분모에 곱해요. (÷k = ×1/k)'};
  }
}),
U(2,'각기둥과 각뿔',(r,t)=>{
  const n=ri(r,3,8), isPrism=r()<0.5;
  const names={3:'삼',4:'사',5:'오',6:'육',7:'칠',8:'팔'};
  const part=pick(r,['면','모서리','꼭짓점']);
  const val = isPrism ? ({'면':n+2,'모서리':3*n,'꼭짓점':2*n})[part] : ({'면':n+1,'모서리':2*n,'꼭짓점':n+1})[part];
  return Qn(`${names[n]}각${isPrism?'기둥':'뿔'}의 ${eun(part)} 모두 몇 개일까요?`, val,
    [val+n, val-1, val+2],
    isPrism?`각기둥: 면 (n+2), 모서리 3n, 꼭짓점 2n (n=${n})`:`각뿔: 면 (n+1), 모서리 2n, 꼭짓점 (n+1) (n=${n})`, r);
}),
U(3,'소수의 나눗셈',(r,t)=>{
  const b=ri(r,2,9), q=rnd(ri(r,11,99)/10,1), a=rnd(q*b,2);
  const ans=dec(q);
  return Qn(`계산해 보세요.\n${a} ÷ ${b}`, ans, [dec(rnd(q*10,2)), dec(rnd(q/10,3)), dec(rnd(a-b,2))],
    '소수점의 위치를 그대로 내려 계산해요.', r);
}),
U(4,'비와 비율',(r,t)=>{
  const k=pick(r,['ratio','percent']);
  if(k==='percent'){
    const base=pick(r,[20,25,40,50,80,100,200]), pct=pick(r,[10,20,25,50,75]);
    const ans=base*pct/100;
    return Qn(`${base}의 ${pct}%는 얼마일까요?`, ans, [base*pct, base+pct, ans*10],
      `${pct}% = ${pct}/100 이므로 ${base} × ${pct}/100 = ${ans}`, r);
  }
  const a=ri(r,2,12), b=ri(r,2,12), g=gcd(a,b);
  const ans=`${a/g}:${b/g}`;
  return {q:`${a} : ${b} 를 가장 간단한 자연수의 비로 나타내세요.`, answer:ans,
    options:opts(r,ans,[`${b/g}:${a/g}`, `${a}:${b}`, `${a+1}:${b+1}`],(rr,gg)=>`${a/g+gg}:${b/g+gg}`),
    explain:`두 수를 최대공약수 ${g}(으)로 나누어요.`};
}),
U(5,'여러 가지 그래프', null),
U(6,'직육면체의 부피와 겉넓이',(r,t)=>{
  const a=ri(r,2,12), b=ri(r,2,12), c=ri(r,2,12);
  if(r()<0.5){ const ans=a*b*c;
    return Qn(`가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm인 직육면체의 부피는 몇 cm³일까요?`, ans,
      [(a+b+c)*4, 2*(a*b+b*c+c*a), a+b+c], '직육면체의 부피 = 가로 × 세로 × 높이', r); }
  const ans=2*(a*b+b*c+c*a);
  return Qn(`가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm인 직육면체의 겉넓이는 몇 cm²일까요?`, ans,
    [a*b*c, a*b+b*c+c*a, (a+b+c)*4], '겉넓이 = (가로×세로 + 세로×높이 + 높이×가로) × 2', r);
})]);

/* ===== 6학년 2학기 ===== */
sem(6,2,[
U(1,'분수의 나눗셈',(r,t)=>{
  const d=ri(r,2,9), n=ri(r,1,d-1), d2=ri(r,2,9), n2=ri(r,1,d2-1);
  const res=fr(n*d2, d*n2), ans=frStr(res);
  return {q:`계산해 보세요.\n${n}/${d} ÷ ${n2}/${d2}`, answer:ans,
    options:opts(r,ans,[frStr(fr(n*n2,d*d2)), frStr(fr(d*n2,n*d2)), frStr(fr(n+n2,d+d2))],(rr,g)=>frStr(fr(res.n+g,res.d))),
    explain:'÷ 뒤의 분수를 뒤집어 곱해요.'};
}),
U(2,'소수의 나눗셈',(r,t)=>{
  const q=rnd(ri(r,11,99)/10,1), b=rnd(ri(r,11,99)/10,1), a=rnd(q*b,3);
  const ans=dec(q);
  return Qn(`계산해 보세요.\n${a} ÷ ${b}`, ans, [dec(rnd(q*10,2)), dec(rnd(q/10,3)), dec(rnd(a*b,3))],
    '나누는 수를 자연수로 만들도록 두 수의 소수점을 같이 옮겨요.', r);
}),
U(3,'공간과 입체', null),
U(4,'비례식과 비례배분',(r,t)=>{
  const k=pick(r,['prop','share']);
  if(k==='share'){
    const a=ri(r,1,5), b=ri(r,1,5), total=(a+b)*ri(r,2,12);
    const ans=total*a/(a+b);
    return Qn(`${eul(comma(total))} ${a} : ${b} 로 나눌 때, 앞의 몫은 얼마일까요?`, ans,
      [total*b/(a+b), total/(a+b), total/2], `전체를 ${a+b}칸으로 나누어 ${a}칸을 가져요.`, r);
  }
  const a=ri(r,2,9), b=ri(r,2,9), k2=ri(r,2,9);
  const ans=b*k2;
  return Qn(`비례식 ${a} : ${b} = ${a*k2} : □ 에서 □ 에 알맞은 수는?`, ans,
    [a*k2, b+k2, b*k2+a], `앞의 항이 ${k2}배가 되었으므로 뒤의 항도 ${k2}배예요.`, r);
}),
U(5,'원의 넓이',(r,t)=>{
  const rad=ri(r,2,15);
  if(r()<0.5){ const ans=rnd(rad*rad*3.14,2);
    return Qn(`반지름이 ${rad}cm인 원의 넓이는 몇 cm²일까요? (원주율 3.14)`, dec(ans),
      [dec(rnd(2*3.14*rad,2)), dec(rnd(rad*3.14,2)), dec(rnd(rad*rad,2))],
      '원의 넓이 = 반지름 × 반지름 × 원주율', r); }
  const ans=rnd(2*3.14*rad,2);
  return Qn(`반지름이 ${rad}cm인 원의 둘레는 몇 cm일까요? (원주율 3.14)`, dec(ans),
    [dec(rnd(rad*rad*3.14,2)), dec(rnd(3.14*rad,2)), dec(rnd(rad*2,2))],
    '원의 둘레 = 지름 × 원주율 = 반지름 × 2 × 원주율', r);
}),
U(6,'원기둥, 원뿔, 구',(r,t)=>{
  const set=pick(r,[['원기둥','밑면',2],['원뿔','밑면',1],['구','밑면',0],['원기둥','옆면',1]]);
  return Qn(`${set[0]}의 ${eun(set[1])} 몇 개일까요?`, set[2], [set[2]+1, set[2]+2, set[2]-1>=0?set[2]-1:3],
    '원기둥은 밑면 2개, 원뿔은 밑면 1개, 구는 밑면이 없어요.', r);
})]);

/* ───────── 영어 단어 (학년군별) ───────── */
const WORDS = [
  // [단어, 뜻, 분류, 최소학년]
  ['school','학교','place',3],['teacher','선생님','person',3],['student','학생','person',3],
  ['friend','친구','person',3],['book','책','thing',3],['pencil','연필','thing',3],
  ['desk','책상','thing',3],['chair','의자','thing',3],['bag','가방','thing',3],
  ['apple','사과','food',3],['banana','바나나','food',3],['milk','우유','food',3],
  ['bread','빵','food',3],['water','물','food',3],['egg','달걀','food',3],
  ['dog','개','animal',3],['cat','고양이','animal',3],['bird','새','animal',3],
  ['fish','물고기','animal',3],['rabbit','토끼','animal',3],['bear','곰','animal',3],
  ['red','빨간','adj',3],['blue','파란','adj',3],['green','초록','adj',3],
  ['big','큰','adj',3],['small','작은','adj',3],['happy','행복한','adj',3],
  ['run','달리다','verb',3],['jump','뛰어오르다','verb',3],['eat','먹다','verb',3],
  ['drink','마시다','verb',3],['read','읽다','verb',3],['sing','노래하다','verb',3],
  ['head','머리','body',3],['hand','손','body',3],['foot','발','body',3],
  ['eye','눈','body',3],['nose','코','body',3],['mouth','입','body',3],

  ['family','가족','family',4],['father','아버지','family',4],['mother','어머니','family',4],
  ['brother','형제','family',4],['sister','자매','family',4],['grandmother','할머니','family',4],
  ['park','공원','place',4],['library','도서관','place',4],['hospital','병원','place',4],
  ['store','가게','place',4],['kitchen','부엌','place',4],['garden','정원','place',4],
  ['Monday','월요일','time',4],['Tuesday','화요일','time',4],['Wednesday','수요일','time',4],
  ['Thursday','목요일','time',4],['Friday','금요일','time',4],['Saturday','토요일','time',4],
  ['Sunday','일요일','time',4],['morning','아침','time',4],['evening','저녁','time',4],
  ['spring','봄','time',4],['summer','여름','time',4],['winter','겨울','time',4],
  ['rain','비','weather',4],['snow','눈','weather',4],['wind','바람','weather',4],
  ['sunny','화창한','weather',4],['cloudy','흐린','weather',4],['windy','바람 부는','weather',4],
  ['study','공부하다','verb',4],['write','쓰다','verb',4],['listen','듣다','verb',4],
  ['speak','말하다','verb',4],['swim','수영하다','verb',4],['help','돕다','verb',4],
  ['soccer','축구','sport',4],['baseball','야구','sport',4],['basketball','농구','sport',4],
  ['tired','피곤한','adj',4],['hungry','배고픈','adj',4],['angry','화난','adj',4],
  ['kind','친절한','adj',4],['strong','강한','adj',4],['heavy','무거운','adj',4],

  ['doctor','의사','job',5],['nurse','간호사','job',5],['farmer','농부','job',5],
  ['pilot','조종사','job',5],['scientist','과학자','job',5],['writer','작가','job',5],
  ['artist','화가, 예술가','job',5],['driver','운전기사','job',5],['cook','요리사','job',5],
  ['museum','박물관','place',5],['airport','공항','place',5],['station','역','place',5],
  ['restaurant','식당','place',5],['market','시장','place',5],['bank','은행','place',5],
  ['mountain','산','nature',5],['river','강','nature',5],['forest','숲','nature',5],
  ['island','섬','nature',5],['ocean','바다','nature',5],['sky','하늘','nature',5],
  ['visit','방문하다','verb',5],['invite','초대하다','verb',5],['remember','기억하다','verb',5],
  ['forget','잊다','verb',5],['choose','고르다','verb',5],['borrow','빌리다','verb',5],
  ['practice','연습하다','verb',5],['travel','여행하다','verb',5],['collect','모으다','verb',5],
  ['excited','신난','adj',5],['bored','지루한','adj',5],['nervous','긴장한','adj',5],
  ['brave','용감한','adj',5],['honest','정직한','adj',5],['careful','조심스러운','adj',5],
  ['famous','유명한','adj',5],['difficult','어려운','adj',5],['important','중요한','adj',5],
  ['expensive','비싼','adj',5],['umbrella','우산','thing',5],['scissors','가위','thing',5],
  ['notebook','공책','thing',5],['backpack','책가방','thing',5],['ticket','표','thing',5],

  ['weather','날씨','nature',6],['temperature','온도','nature',6],['environment','환경','nature',6],
  ['pollution','오염','nature',6],['energy','에너지','nature',6],['planet','행성','nature',6],
  ['culture','문화','abstract',6],['history','역사','abstract',6],['future','미래','abstract',6],
  ['problem','문제','abstract',6],['reason','이유','abstract',6],['chance','기회','abstract',6],
  ['health','건강','abstract',6],['dream','꿈','abstract',6],['message','메시지','abstract',6],
  ['exercise','운동하다','verb',6],['protect','보호하다','verb',6],['decide','결정하다','verb',6],
  ['explain','설명하다','verb',6],['imagine','상상하다','verb',6],['succeed','성공하다','verb',6],
  ['prepare','준비하다','verb',6],['introduce','소개하다','verb',6],['recycle','재활용하다','verb',6],
  ['delicious','맛있는','adj',6],['dangerous','위험한','adj',6],['comfortable','편안한','adj',6],
  ['wonderful','멋진','adj',6],['terrible','끔찍한','adj',6],['possible','가능한',  'adj',6]
];

function wordsFor(grade){
  const list = WORDS.filter(w => w[3] <= grade);
  return list.length >= 12 ? list : WORDS;
}
function makeEnglish(r, grade, tier, word){
  const list = wordsFor(grade);
  // 복수 몬스터: 전에 틀린 단어를 다시 낸다 (학년 목록에 없으면 전체 목록에서 찾는다)
  const w = (word && (list.find(x => x[0] === word) || WORDS.find(x => x[0] === word))) || pick(r, list);
  const same = list.filter(x => x[2]===w[2] && x[0]!==w[0]);
  const pool = same.length>=3 ? same : list.filter(x=>x[0]!==w[0]);
  const kind = tier>=3 ? pick(r,['e2k','k2e','spell']) : (tier===2 ? pick(r,['e2k','k2e']) : 'e2k');

  if(kind==='e2k'){
    return {q:`다음 단어의 뜻으로 알맞은 것은?\n\n${w[0]}`, answer:w[1],
      options:opts(r,w[1], shuffle(r,pool).slice(0,3).map(x=>x[1]), (rr,g)=>pick(rr,list)[1]),
      explain:`${w[0]} = ${w[1]}`, word:w[0]};
  }
  if(kind==='k2e'){
    return {q:`"${w[1]}"${hasJong(w[1])?"을":"를"} 뜻하는 영어 단어는?`, answer:w[0],
      options:opts(r,w[0], shuffle(r,pool).slice(0,3).map(x=>x[0]), (rr,g)=>pick(rr,list)[0]),
      explain:`${w[1]} = ${w[0]}`, word:w[0]};
  }
  const letters=w[0].split('');
  const idxs=letters.map((c,i)=>({c,i})).filter(x=>/[a-z]/i.test(x.c));
  const hide=shuffle(r,idxs).slice(0, Math.min(idxs.length-1, tier>=3?2:1)).map(x=>x.i);
  const masked=letters.map((c,i)=>hide.includes(i)?'_':c).join('');
  return {q:`빈칸에 알맞은 단어는?  (뜻: ${w[1]})\n\n${masked}`, answer:w[0],
    options:opts(r,w[0], shuffle(r,pool).slice(0,3).map(x=>x[0]), (rr,g)=>pick(rr,list)[0]),
    explain:`${w[0]} = ${w[1]}`, word:w[0]};
}

/* ───────── 공개 API ───────── */
/* 문제의 내용(계산/문장제)과 응답 방식(선택/직접 입력)은 서로 독립이다. */
function wordProblem(q){
  const large=q.q.match(/^([\d,]+) 에서 (.+)의 자리 숫자는 무엇일까요\?$/);
  if(large)return `어느 도시를 방문한 사람은 ${large[1]}명입니다.\n이 수에서 ${large[2]}의 자리 숫자는 무엇일까요?`;
  const plusProduct=q.q.match(/^계산해 보세요\.\s*(\d+) \+ (\d+) × (\d+)$/);
  if(plusProduct)return `낱개 연필이 ${plusProduct[1]}자루 있고, 한 상자에 ${plusProduct[2]}자루씩 든 연필이 ${plusProduct[3]}상자 있습니다.\n연필은 모두 몇 자루일까요?`;
  const bracket=q.q.match(/^계산해 보세요\.\s*(\d+) × \((\d+) \+ (\d+)\)$/);
  if(bracket)return `오전 체험에 ${bracket[2]}명, 오후 체험에 ${bracket[3]}명이 참여했습니다.\n모든 참여자에게 색종이를 ${bracket[1]}장씩 주면 필요한 색종이는 모두 몇 장일까요?`;
  const divisionPlus=q.q.match(/^계산해 보세요\.\s*(\d+) ÷ (\d+) \+ (\d+) × (\d+)$/);
  if(divisionPlus)return `꽃 ${divisionPlus[1]}송이를 ${divisionPlus[2]}묶음으로 똑같이 나누었습니다.\n그중 한 묶음과, 꽃 ${divisionPlus[3]}송이씩 든 ${divisionPlus[4]}묶음을 모으면 꽃은 모두 몇 송이일까요?`;
  const m=q.q.match(/^계산해 보세요\.\s*([\d,.\/ ]+) ([+×÷-]) ([\d,.\/ ]+)$/);
  if(!m)return q.q;
  const a=m[1].trim(),op=m[2],b=m[3].trim(),whole=x=>/^\d[\d,]*$/.test(x);
  if(op==='+')return whole(a)&&whole(b)?`도서관에 책이 ${a}권 있었습니다. 새 책 ${b}권이 들어왔습니다.\n책은 모두 몇 권일까요?`:`통에 물이 ${a}L 있었습니다. 물 ${b}L를 더 넣었습니다.\n물은 모두 몇 L일까요?`;
  if(op==='-')return whole(a)&&whole(b)?`준비한 색종이 ${a}장 중 ${b}장을 사용했습니다.\n남은 색종이는 몇 장일까요?`:`길이가 ${a}m인 리본에서 ${b}m를 잘랐습니다.\n남은 리본은 몇 m일까요?`;
  if(op==='×'&&whole(b))return whole(a)?`한 상자에 연필이 ${a}자루씩 들어 있습니다.\n${b}상자에 들어 있는 연필은 모두 몇 자루일까요?`:`한 병에 주스가 ${a}L씩 들어 있습니다.\n${b}병에 들어 있는 주스는 모두 몇 L일까요?`;
  if(op==='×')return `가로가 ${a}m, 세로가 ${b}m인 직사각형 모양의 텃밭이 있습니다.\n넓이는 몇 m²일까요?`;
  if(op==='÷'&&whole(b))return whole(a)&&Number.isInteger(numericValue(q.answer))?`구슬 ${a}개를 ${b}명에게 똑같이 나누어 줍니다.\n한 명이 받는 구슬은 몇 개일까요?`:`주스 ${a}L를 ${b}명이 똑같이 나누어 마십니다.\n한 명이 마시는 주스는 몇 L일까요?`;
  if(op==='÷')return `빨간 끈의 길이는 ${a}m이고 파란 끈의 길이는 ${b}m입니다.\n빨간 끈의 길이는 파란 끈의 길이의 몇 배일까요?`;
  return q.q;
}
function prepareQuestion(question,seed,opt){
  if(!question)return null;
  const q=Object.assign({},question),o=opt||{},r=makeRng(String(seed)+':presentation');
  q.responseMode='choice';q.questionStyle='direct';
  if(o.presentation===false)return q;
  if(q.subject==='math'&&(o.contextMode==='word'||(o.contextMode!=='plain'&&r()<0.5))){
    const text=wordProblem(q);if(text!==q.q){
      if(q.q.startsWith('계산해 보세요.'))q.explain=q.q.replace(/^계산해 보세요\.\s*/,'')+' = '+q.answer+'\n'+q.explain;
      q.q=text;q.questionStyle='word';
    }
  }
  const short=o.responseMode==='short'||(o.responseMode!=='choice'&&r()<0.35);
  if(short&&q.subject==='english'&&q.word){
    const w=WORDS.find(x=>x[0]===q.word);
    if(w){
      q.answer=w[0];q.options=opts(r,w[0],shuffle(r,wordsFor(q.grade).filter(x=>x[0]!==w[0])).slice(0,3).map(x=>x[0]));
      q.q=`다음 뜻에 알맞은 영어 단어를 쓰세요.\n\n${w[1]}\n(첫 글자: ${w[0][0]} · ${w[0].length}글자)`;
      q.responseMode='short';q.inputKind='word';
    }
  }else if(short&&q.subject==='math'&&/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(String(q.answer))){
    q.responseMode='short';q.inputKind='number';
  }
  return q;
}

function tierForLevel(level){ return level>=8 ? 3 : (level>=4 ? 2 : 1); }

/* 교사가 고른 범위에서 출제 가능한 단원 목록 */
function unitsOf(grade, term, unitNos){
  const all = (C.math[grade+'-'+term] || []).filter(u=>u.gen);
  if(!all.length) return [];
  const want = Array.isArray(unitNos) ? unitNos.map(Number).filter(n=>n>0) : [];
  if(!want.length) return all;                         // 지정 없으면 그 학기 전체
  return all.filter(u => want.includes(Number(u.no))); // 미지원 범위를 다른 단원으로 넓히지 않는다
}

/* 한 문제 생성
   opt = {subject:'math'|'english', grade, term, unitNos:[1,3,5], level, seed} */
function makeQuestion(opt){
  opt = opt || {};
  const grade = Number(opt.grade)||5;
  const term  = Number(opt.term)||1;
  const level = Number(opt.level)||1;
  // 복수 몬스터는 틀렸을 때의 난이도(tier)로 다시 낸다
  const tier  = [1,2,3].includes(Number(opt.tier)) ? Number(opt.tier) : tierForLevel(level);
  const r     = makeRng(opt.seed==null ? Math.random() : opt.seed);

  if(opt.subject === 'english'){
    if(![3,4,5,6].includes(grade))return null;
    return prepareQuestion(Object.assign({subject:'english', grade, unit:'영단어', tier}, makeEnglish(r, grade, tier, opt.word)),opt.seed,opt);
  }
  const nos = opt.unitNos != null ? opt.unitNos : (opt.unitNo != null ? [opt.unitNo] : null);
  const units = unitsOf(grade, term, nos);
  if(!units.length) return null;
  const u = pick(r, units);
  const made = u.gen(r, tier);
  return prepareQuestion(Object.assign({subject:'math', grade, term, unitNo:u.no,
    unit:`${grade}-${term} ${u.no}단원 ${u.name}`, unitName:u.name, tier}, made),opt.seed,opt);
}
function makeSet(opt, count){
  const out=[], seen=new Set();
  for(let i=0, g=0; out.length<count && g<count*10; i++, g++){
    const q = makeQuestion(Object.assign({}, opt, {seed:(opt.seed||'s')+':'+i}));
    if(!q) break;
    if(seen.has(q.q)) continue;
    seen.add(q.q); out.push(q);
  }
  return out;
}
/* 교사 화면용 목차 */
function curriculum(){
  const out=[];
  [3,4,5,6].forEach(g=>[1,2].forEach(t=>{
    const units=(C.math[g+'-'+t]||[]).map(u=>({no:u.no, name:u.name, supported:!!u.gen}));
    if(units.length) out.push({grade:g, term:t, units});
  }));
  return out;
}

/* ── 레벨 규칙 (학생앱·교사앱 공용) ──
   레벨이 오를수록 필요한 XP가 늘어난다: Lv.n → Lv.n+1 에 100×n XP.
   (고정 100씩이면 1년에 Lv.380까지 올라가 숫자가 의미를 잃는다.
    이 곡선이면 하루 20문제를 다 맞혀도 한 달에 Lv.9, 1년에 Lv.28 정도.) */
const XP_PER_LEVEL = 100;                                  // Lv.1→2 비용 (이후 배수로 증가)
const xpToReach = L => XP_PER_LEVEL * L * (L-1) / 2;       // Lv.L 도달에 필요한 누적 XP
function levelOfXp(xp){
  const x = Math.max(0, Number(xp)||0);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 8*x/XP_PER_LEVEL)) / 2));
}
function xpInLevel(xp){                                    // 현재 레벨에서 모은 XP
  const x = Math.max(0, Number(xp)||0);
  return Math.round(x - xpToReach(levelOfXp(x)));
}
function xpForNextLevel(xp){                               // 다음 레벨까지 필요한 총 XP
  return XP_PER_LEVEL * levelOfXp(xp);
}

window.QUIZ = {
  prepareQuestion, numericValue, answerKey, sameAnswer,
  makeQuestion, makeSet, makeRng, tierForLevel, curriculum, unitsOf,
  levelOfXp, xpInLevel, xpForNextLevel, xpToReach, XP_PER_LEVEL,
  WORD_COUNT: WORDS.length,
  _internal:{C, WORDS, fr, frStr, gcd, lcm, wordsFor}
};
})();
