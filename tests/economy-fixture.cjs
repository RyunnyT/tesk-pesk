const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const G=require('../rpg-monsters.js'),R=require('../quiz-rating.js'),C=require('../shared/pesk-combat.js');
function fixture(){
  const storage=new Map([['pesk-room-id','test'],['pesk-student-num','1'],['pesk-account-uid','one']]);
  const elements={};const el=id=>elements[id]||null;
  elements['header-class']={textContent:''};
  const context={console,URL,URLSearchParams,Intl,Image:class{},navigator:{},location:{},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}}},
    setTimeout(){},setInterval(){},clearInterval(){},clearTimeout(){},requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener(){},alert(){}};
  context.window=context;context.RPG=G;context.PeskBossQuest=require('../shared/pesk-boss-quest.js');context.PeskQuizStore=require('../shared/pesk-quiz-store.js');vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/pesk-class-quest-ui.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/econ-core.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/pesk-econ-ui.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/economy-ownership.js'),'utf8'),context);
  for(const name of ['quiz-bank.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context);
  const source=fs.readFileSync(path.join(__dirname,'../pesk.html'),'utf8').split('<script>')[1].split('</script>')[0];
  vm.runInContext(source,context);
  const date=context.qzToday();
  const docs={'pesk-quiz-progress':{1:{xp:0,tried:0,correct:0,rating:1100,byUnit:{},daily:{},game:G.newGameState(),boss:{roundId:'round1',dmg:10,titles:[]},goalClaims:{keep:true}}},'tesk-students':[{num:1,name:'학생',points:0}],'pesk-class-boss':{enabled:true,roundId:'round1',maxHp:3000,entryNeed:0}};
  let fail=false;
  Object.assign(context,{RPG:G,QRATE:R,PeskCombat:C,PeskSubjects:require('../shared/pesk-subjects.js'),_fbReady:true,_db:{},
    _fsDoc:(_,...parts)=>parts.at(-1),_fsGetDoc:async ref=>({exists:()=>!!docs[ref],data:()=>({value:structuredClone(docs[ref])})}),
    _fsRunTxn:async(db,fn)=>{const writes=[];const out=await fn({get:context._fsGetDoc,set:(ref,value)=>writes.push([ref,value.value])});if(fail)throw new Error('unavailable');for(const [ref,value] of writes)docs[ref]=structuredClone(value);return out;},
    avRefresh(){},showFeedbackNotice(){},addNotif(){},addTxn(){},pushEconLog:async()=>{},renderEconomyPanels(){},petGrow:async()=>{},avCharDataURL:()=>''});
  context.incoming=structuredClone(docs['pesk-quiz-progress']);context._applyQuizProgress(context.incoming);
  context._applyBossCfg(docs['pesk-class-boss']);
  vm.runInContext('students=[{num:1,name:"학생",points:0}]; myAvatar={equipped:{},owned:[]};',context);
  return {c:context,docs,date,storage,elements,fail:()=>{fail=true;},run:code=>vm.runInContext(code,context),
    rec:n=>docs[String(n)]||docs['pesk-quiz-progress'][n]};   // 학생별 문서(fake ref = 마지막 경로 조각)가 있으면 그것, 없으면 옛 묶음 문서
}
module.exports=fixture;
