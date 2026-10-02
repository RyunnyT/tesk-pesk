const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const PeerSurvey=require('../shared/peer-survey.js');
const html=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(data={}){
  let stored=clone(data),writes=0,fail=false,retry=null;
  const alerts=[],panel={innerHTML:''},button={disabled:false},fields={scale:[],text:[],contexts:[],request:''};
  const c={PeerSurvey,PeerAnalysis:require('../shared/peer-analysis.js'),PeerAI:require('../shared/peer-ai.js'),console,Date,roomId:'demo',myStudentNum:1,myStudentName:'하늘',myAccountUid:'u1',mySurvey:null,allSurveys:{},activeSurveyRoundId:'round-1',activeSurveyRoundLabel:'1회차',
    students:[{num:1,name:'하늘'},{num:2,name:'다온'},{num:3,name:'가람'}],escHtml:PeerSurvey.escape,
    document:{getElementById:id=>id==='counsel-sub-survey'?panel:null,querySelector:s=>s.includes('primary')?button:s==='[data-peer-request]'?{value:fields.request}:null,querySelectorAll:s=>s.includes('scale')?fields.scale:s.includes('text')?fields.text:fields.contexts},
    alert:m=>alerts.push(m),ensureActiveStudentSession:async()=>true,_db:{},_fsDoc:()=>({})};
  c.window=c;
  c._fsRunTxn=async(_db,fn)=>{
    let pending;
    const txn={get:async()=>({exists:()=>true,data:()=>clone(stored)}),set:(_r,value)=>{pending=clone(value);}};
    await fn(txn);if(retry){const run=retry;retry=null;run();pending=null;await fn(txn);}
    if(fail)throw new Error('permission-denied');stored=pending;writes++;
  };
  vm.createContext(c);
  const source=html('pesk.html');
  vm.runInContext(source.slice(source.indexOf('const SURVEY_CATS ='),source.indexOf('/* ⚠️ 학생 화면에서 사회연결망 분석')),c);
  const run=code=>vm.runInContext(code,c);
  return {c,run,panel,button,alerts,fields,data:()=>stored,writes:()=>writes,setData:d=>{stored=clone(d);},fail:()=>{fail=true;},retry:fn=>{retry=fn;}};
}
const old={studentNum:1,accountUid:'u1',study:[2],aspire:[3]};
const round2={activeRoundId:'r2',rounds:{'round-1':{label:'1회차'},r2:{label:'2회차'}},value:{1:old}};

test('all inline application scripts parse',()=>{
  for(const name of ['pesk.html','tesk_teacher_v2.html'])for(const m of html(name).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    if(!/src=|type="module"/.test(m[1]))new vm.Script(m[2],{filename:name});
  }
});
test('legacy first response never completes round two; account identity remains isolated',()=>{
  assert.equal(PeerSurvey.current(round2,1,'u1').response,null);
  assert.deepEqual(PeerSurvey.current({value:{1:old}},1,'u1').response,old);
  assert.equal(PeerSurvey.current({value:{1:old}},1,'new-account').response,null);
  assert.equal(PeerSurvey.current({...round2,value:{'r2:1':{...old,roundId:'round-1'}}},1,'u1').response,null);
  assert.equal(PeerSurvey.current({...round2,value:{'r2:1':{...old,roundId:'r2'}}},1,'u1').response.roundId,'r2');
});
test('new round, submit, edit and submit again preserve aspire and history',async()=>{
  const f=fixture(round2);f.c.applyPeerSurveyDoc(round2,true);
  assert.match(f.panel.innerHTML,/2회차 설문 제출하기/);assert.doesNotMatch(f.panel.innerHTML,/수정하기/);
  f.c.toggleSurveyChip('aspire',2);f.fields.scale=[{dataset:{peerScale:'belonging'},value:'2'}];f.fields.request='선생님과 따로 이야기하고 싶어요';
  await f.c.submitPeerSurvey();assert.deepEqual(f.alerts,[]);assert.equal(f.data().value['r2:1'].reflection.belonging,2);
  f.c.resetSurvey();assert.deepEqual(clone(f.run('surveyPicks.aspire')),[2]);
  f.c.toggleSurveyChip('aspire',3);await f.c.submitPeerSurvey();assert.deepEqual(f.alerts,[]);
  assert.deepEqual(f.data().value['r2:1'].aspire,[2,3]);assert.deepEqual(f.data().value[1],old);
});
test('duplicate clicks write once and empty optional responses submit',async()=>{
  const f=fixture();await Promise.all([f.c.submitPeerSurvey(),f.c.submitPeerSurvey()]);
  assert.equal(f.writes(),1);assert.deepEqual(f.alerts,[]);assert.equal(f.data().value['round-1:1'].reflection.belonging,null);
});
test('write failure keeps picks and reflection, restores button',async()=>{
  const f=fixture();f.c.toggleSurveyChip('aspire',2);f.fields.text=[{dataset:{peerText:'hardMoment'},value:'모둠에 끼기 어려웠어요'}];f.fail();
  await f.c.submitPeerSurvey();assert.equal(f.writes(),0);assert.equal(f.button.disabled,false);
  assert.deepEqual(clone(f.run('surveyPicks.aspire')),[2]);assert.equal(f.run('surveyReflection.hardMoment'),'모둠에 끼기 어려웠어요');assert.match(f.alerts[0],/permission-denied/);
});
test('transaction detects a round change on retry instead of silently submitting into new round',async()=>{
  const f=fixture({value:{1:old}});f.retry(()=>f.setData(round2));await f.c.submitPeerSurvey();
  assert.equal(f.writes(),0);assert.match(f.alerts[0],/회차를 변경/);assert.match(f.panel.innerHTML,/2회차 설문 제출하기/);
});
test('transaction retry preserves another student response and metadata',async()=>{
  const f=fixture();f.retry(()=>f.setData({value:{'round-1:2':{studentNum:2}},custom:'keep'}));await f.c.submitPeerSurvey();
  assert.equal(f.data().value['round-1:2'].studentNum,2);assert.equal(f.data().custom,'keep');
});
test('live updates reset old round but do not interrupt same-round editing',()=>{
  const f=fixture();f.c.applyPeerSurveyDoc({value:{1:old}},true);f.c.resetSurvey();f.c.toggleSurveyChip('play',2);
  f.panel.innerHTML='draft on screen';f.c.applyPeerSurveyDoc({value:{1:old,2:{studentNum:2}}},true);
  assert.equal(f.panel.innerHTML,'draft on screen');f.c.applyPeerSurveyDoc(round2,true);
  assert.equal(f.run('mySurvey'),null);assert.deepEqual(clone(f.run('surveyPicks')),PeerSurvey.emptyPicks());assert.match(f.panel.innerHTML,/2회차/);
});
test('reflection missing values, escape, length limits and mixed evidence interpretation',()=>{
  assert.equal(PeerSurvey.hasReflection({}),false);assert.equal(PeerSurvey.reflection({belonging:0}).belonging,null);
  assert.equal(PeerSurvey.reflection({goodMoment:'x'.repeat(700)}).goodMoment.length,500);
  assert.doesNotMatch(PeerSurvey.form({hardMoment:'</textarea><img src=x onerror=alert(1)>'}),/<img/);
  assert.match(PeerSurvey.interpret({belonging:1,leftOut:4},{posIn:3}).join(' '),/체감이 다릅니다/);
  assert.match(PeerSurvey.interpret({belonging:4},{posIn:0,submitted:true}).join(' '),/고립으로 단정하지/);
});
function teacher(){
  const f=fixture(),c=f.c;
  Object.assign(c,{TESK_ROOM:'demo',peskSurveyAll:{},peskSurveyRounds:{},activePeskSurveyRoundId:'round-1',friendRoundView:'r2',friendData:[],accountUidForStudent:()=>'',showToast:m=>f.alerts.push(m),renderFriends:()=>{},openAppFormModal:async()=>({label:'2회차'}),_fbReady:true});
  const s=html('tesk_teacher_v2.html');vm.runInContext(s.slice(s.indexOf('let friendBestPicks='),s.indexOf('function openFriendSurvey()')),c);
  c.renderFriends=()=>{};
  return f;
}
test('teacher round creation and activation preserve concurrent responses on retries',async()=>{
  const f=teacher();f.retry(()=>f.setData({value:{1:old},custom:'keep'}));await f.c.createFriendSurveyRound();
  assert.deepEqual(f.data().value[1],old);assert.equal(f.data().custom,'keep');assert.equal(f.data().rounds['round-1'].label,'1회차');
  await f.c.setActiveFriendSurveyRound('round-1');assert.equal(f.data().activeRoundId,'round-1');assert.deepEqual(f.data().value[1],old);
});
test('teacher displays and sends reflection evidence in class and student interpretation',()=>{
  const f=teacher();f.c.peskSurveyAll={a:{...old,roundId:'r2',reflection:{belonging:1,request:'선생님과 따로 이야기하고 싶어요',hardMoment:'<script>test</script>'}}};
  const analysis=f.c.analyzeFriends('r2');assert.equal(analysis.rows[0].reflection.belonging,1);
  assert.match(f.c._friendStudentDetailText(1,'r2'),/선생님과 따로/);
});
test('manual backup preserves every round and the detailed responses',()=>{
  const f=teacher();f.c.save=()=>{};f.c.today=()=>'';
  f.c.peskSurveyAll={a:{...old,roundId:'r1',reflection:{belonging:1}},b:{...old,roundId:'r2',reflection:{belonging:4}}};
  f.c.importPeskFriendData();f.c.importPeskFriendData();
  assert.equal(f.c.friendData.length,2);assert.equal(f.c.friendData.find(r=>r.roundId==='r1').reflection.belonging,1);
  assert.deepEqual(f.c.friendData.find(r=>r.roundId==='r2').aspire,[3]);
});

test('AI support draft cites descriptive source and is hidden after evidence changes',async()=>{
  const f=teacher();f.c.peskSurveyAll={a:{...old,roundId:'r2',reflection:{belonging:1}}};let prompt='';
  f.c.callTeachAI=async value=>{prompt=value;return JSON.stringify({version:1,findings:[{evidenceIds:['self.belonging'],interpretation:'편안한 활동을 확인할 필요가 있습니다.',question:'어떤 활동이 편안하니?'}],support:[],limitations:[{evidenceIds:['meta.conditions'],reason:'교사 관찰과 함께 확인해야 합니다.'}]});};
  await f.c.analyzeFriendStudentAI(1,'r2');
  assert.match(prompt,/모든 해석에 자료의 영역 또는 문항 근거/);assert.doesNotMatch(prompt,/상태=|사회적 선호도=/);
  assert.match(f.c._friendStudentAiResultHtml({num:1},'r2'),/편안한 활동/);
  f.c.peskSurveyAll.a.reflection.belonging=4;
  assert.equal(f.c._friendStudentAiResultHtml({num:1},'r2'),'');
});

test('invalid AI numerical claim is dropped, never shown as a result',async()=>{
  const f=teacher();f.c.peskSurveyAll={a:{...old,roundId:'r2'}};
  f.c.callTeachAI=async()=>JSON.stringify({version:1,findings:[{evidenceIds:['domain.study.outgoing'],interpretation:'친구가 99명입니다.',question:'기분이 어떠니?'}],support:[],limitations:[{evidenceIds:['meta.conditions'],reason:'추가 확인이 필요합니다.'}]});
  await f.c.analyzeFriendStudentAI(1,'r2');const html=f.c._friendStudentAiResultHtml({num:1},'r2');assert.doesNotMatch(html,/99명/);assert.match(html,/항목 1개는 제외/);
});
