const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../quiz-bank.js'),'utf8'),c);
const Q=c.window.QUIZ;
const make=(term,unitNo,level,i)=>Q.makeQuestion({subject:'math',grade:3,term,unitNos:[unitNo],level,seed:'grade-check-'+i,presentation:false});
test('3rd grade subtraction never requires negative numbers and arithmetic is correct',()=>{
  for(const level of [1,4,8])for(let i=0;i<500;i++){
    const q=make(1,1,level,i),m=q.q.match(/(\d+) ([+-]) (\d+)/),a=Number(m[1]),b=Number(m[3]);
    assert.equal(q.answer,m[2]==='+'?a+b:a-b);assert.ok(q.answer>=0);
    assert.ok(q.options.every(x=>Number(x)>=0),JSON.stringify(q));
    assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(String)).size,4);
  }
});
test('3rd grade multiplication does not expand to three digits times two digits',()=>{
  for(const level of [1,4,8])for(let i=0;i<500;i++){
    const q=make(2,1,level,i),m=q.q.match(/(\d+) × (\d+)/),a=Number(m[1]),b=Number(m[2]);
    assert.ok(a<100||b<10);assert.equal(q.answer,a*b);
  }
});
test('3rd grade fractions use parts, comparison, or mixed-number conversion with a unique answer',()=>{
  for(const level of [1,4,8])for(let i=0;i<500;i++){
    const q=make(2,4,level,i);assert.doesNotMatch(q.q,/\d\/\d [+-] \d\/\d/);
    assert.equal(q.options.filter(x=>String(x)===String(q.answer)).length,1);
    assert.equal(new Set(q.options.map(String)).size,4);
    if(q.q.includes('구슬')){const m=q.q.match(/구슬 (\d+)개의 (\d+)\/(\d+)/);assert.equal(q.answer,Number(m[1])*Number(m[2])/Number(m[3]));}
    else if(q.q.includes('대분수')){const m=q.q.match(/대분수 (\d+) (\d+)\/(\d+)/);assert.equal(q.answer,`${Number(m[1])*Number(m[3])+Number(m[2])}/${m[3]}`);}
    else{const value=x=>{const [a,b]=x.split('/').map(Number);return a/b;};assert.equal(value(q.answer),Math.max(...q.options.map(value)));}
  }
});
test('3rd grade table maximum has only one correct option',()=>{
  for(let i=0;i<1000;i++){
    const q=make(2,6,1,i);if(!q.q.includes('가장 많은'))continue;
    const values=[...q.q.matchAll(/(사과|포도|딸기|수박|귤) (\d+)명/g)].map(m=>({name:m[1],count:Number(m[2])}));
    const max=Math.max(...values.map(v=>v.count));assert.equal(values.filter(v=>v.count===max).length,1);assert.equal(q.answer,values.find(v=>v.count===max).name);
  }
});
test('explicit unsupported unit or grade returns no question instead of widening teacher scope',()=>{
  assert.equal(Q.makeQuestion({grade:4,term:1,unitNos:[4]}),null);
  assert.equal(Q.makeQuestion({grade:2,term:1}),null);
  assert.equal(Q.makeQuestion({grade:3,term:1,unitNos:[99]}),null);
});
test('teacher UI renders and collects the selected third-grade units',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../tesk_teacher_v2.html'),'utf8');
  const elements={'qz-grade':{value:'3'},'qz-term':{value:'2'},'qz-units':{innerHTML:''},'qz-enabled':{checked:true},'qz-math-on':{checked:true},'qz-eng-on':{checked:false}};
  const box=elements['qz-units'];const selected=()=>[...box.innerHTML.matchAll(/data-unit="(\d+)" checked/g)].map(m=>({dataset:{unit:m[1]}}));
  const context={window:{QUIZ:Q},document:{getElementById:id=>elements[id],querySelectorAll:selected},escHtml:x=>x,QZ_CATS:[],qzGoalsFromForm:()=>[],QZ_MAX_GOALS:3,QZ_DEFAULT:{goal:{}},qzConfig:{mathUnits:[2,4]}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function qzRenderUnits(){'),source.indexOf('function qzRenderLocks(){')),context);
  vm.runInContext(source.slice(source.indexOf('function qzCollect(){'),source.indexOf('async function qzSaveConfig(){')),context);
  context.qzRenderUnits();assert.match(box.innerHTML,/4단원<\/b> 분수/);assert.doesNotMatch(box.innerHTML,/분수의 덧셈/);
  const cfg=context.qzCollect();assert.equal(cfg.grade,3);assert.equal(cfg.term,2);assert.deepEqual(Array.from(cfg.mathUnits),[2,4]);
});
