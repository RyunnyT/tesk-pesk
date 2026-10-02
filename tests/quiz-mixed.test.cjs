const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../quiz-bank.js'),'utf8'),c);
const Q=c.window.QUIZ,R=require('../quiz-rating.js');
test('all grade generators keep four finite, numerically distinct options',()=>{
 for(const sem of Q.curriculum())for(const unit of sem.units.filter(u=>u.supported))for(const level of [1,4,8])for(let i=0;i<200;i++){
  const q=Q.makeQuestion({grade:sem.grade,term:sem.term,unitNo:unit.no,level,seed:`quality:${sem.grade}:${sem.term}:${unit.no}:${level}:${i}`});
  assert.equal(q.options.length,4,JSON.stringify(q));assert.ok(q.options.every(x=>x!=null&&!/NaN|Infinity|undefined/.test(String(x))),JSON.stringify(q));
  assert.equal(new Set(q.options.map(Q.answerKey)).size,4,JSON.stringify(q));assert.equal(q.options.filter(x=>Q.sameAnswer(q,x)).length,1,JSON.stringify(q));
 }
});
test('rating options never mark an equivalent fraction as incorrect',()=>{
 for(const code of Object.keys(R.TYPES))for(const difficulty of [800,1200,1600])for(let i=0;i<100;i++){
  const q=R.generateQuestion(code,difficulty,`quality:${code}:${difficulty}:${i}`);
  assert.equal(q.options.length,4,JSON.stringify(q));assert.equal(new Set(q.options.map(Q.answerKey)).size,4,JSON.stringify(q));
 }
});
test('every grade produces reproducible choice, short answer, and contextual arithmetic',()=>{
 for(const grade of [3,4,5,6]){
  const modes=new Set(),styles=new Set();
  for(let i=0;i<200;i++){
   const opt={grade,term:1,unitNo:1,seed:'mixed-'+i};const q=Q.makeQuestion(opt);
   modes.add(q.responseMode);styles.add(q.questionStyle);assert.deepEqual(q,Q.makeQuestion(opt));
   assert.equal(q.grade,grade);assert.equal(q.term,1);assert.equal(q.unitNo,1);
   assert.doesNotMatch(q.q,/풀이.*쓰|이유.*쓰|서술하세요/);
  }
  // 6-1 answers are often fractions, but some quotients simplify to a decimal-free number only rarely.
  if(grade===6){for(let i=0;i<80;i++)modes.add(Q.makeQuestion({grade,term:1,unitNo:3,seed:'six-'+i}).responseMode);}
  assert.ok(modes.has('choice'));assert.ok(modes.has('short'));assert.ok(styles.has('word'));
 }
});
test('short English prompts do not expose the target and accept case and surrounding spaces',()=>{
 for(const grade of [3,4,5,6])for(let i=0;i<80;i++){
  const q=Q.makeQuestion({subject:'english',grade,seed:'english-'+i,responseMode:'short'});
  assert.equal(q.responseMode,'short');assert.equal(q.inputKind,'word');assert.ok(!q.q.toLowerCase().includes(q.answer.toLowerCase()),JSON.stringify(q));
  assert.ok(Q.sameAnswer(q,'  '+q.answer.toUpperCase()+'  '));assert.ok(!Q.sameAnswer(q,q.answer+'x'));
 }
});
test('numeric input accepts equivalent decimal formatting but rejects malformed numbers and blank',()=>{
 const q={subject:'math',responseMode:'short',answer:'1,200'};
 for(const value of ['1200',' 1,200 ','１２００','1200.0'])assert.ok(Q.sameAnswer(q,value));
 for(const value of ['',' ','12,00','1200원','1201','Infinity','1e3'])assert.ok(!Q.sameAnswer(q,value));
 assert.ok(Q.sameAnswer({subject:'math',answer:1.5},'1.50'));
});
test('fourth grade fractions retain denominator, division stays below 1000, and explanations are correct',()=>{
 for(let i=0;i<500;i++){
  const f=Q.makeQuestion({grade:4,term:2,unitNo:1,seed:'den-'+i,presentation:false});
  const ds=[...f.q.matchAll(/\/(\d+)/g)].map(m=>m[1]);assert.ok(ds.length<2||ds[0]===ds[1],f.q);
  const d=Q.makeQuestion({grade:4,term:1,unitNo:3,seed:'divide-'+i,presentation:false});
  if(d.q.includes('÷'))assert.ok(Number(d.q.match(/([\d,]+) ÷/)[1].replaceAll(',',''))<=999);
  const a=Q.makeQuestion({grade:5,term:1,unitNo:4,seed:'reduce-'+i,presentation:false});
  if(a.q.includes('기약분수')){const m=a.q.match(/(\d+)\/(\d+)/);assert.equal(Number(a.explain.match(/최대공약수 (\d+)/)[1]),Q._internal.gcd(+m[1],+m[2]));}
 }
});
