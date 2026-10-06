const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Store = require('../shared/pesk-writing-store.js');
const ROOT = path.resolve(__dirname, '..');
const LEGACY = 'classrooms/test/data/pesk-writings';
const ITEMS = LEGACY + '/items';
const LIMIT = 1048576;
const copy = x=>structuredClone(x);

function database(legacy = [], entries = []){
  const docs = new Map([[LEGACY, {value:copy(legacy)}]]);
  for(const w of entries) docs.set(ITEMS+'/'+w.id, copy(w));
  const writes = [], listeners = [];
  let seq = 0, retry = null, failure = null;
  const ref = (p, type='doc')=>({path:p, id:p.split('/').at(-1), type});
  const snapshot = r=>({id:r.id, exists:()=>docs.has(r.path), data:()=>copy(docs.get(r.path))});
  const field = (o, f)=>f.split('.').reduce((v, k)=>v==null ? undefined : v[k], o);
  const collectionSnapshot = r=>({docs:[...docs.keys()].filter(p=>p.startsWith(r.path+'/') && !p.slice(r.path.length+1).includes('/'))
    .filter(p=>!r.where || field(docs.get(p), r.where.f)===r.where.v).map(p=>snapshot(ref(p)))});
  function emit(){ for(const l of listeners) if(l.active) l.next(l.ref.type==='collection' ? collectionSnapshot(l.ref) : snapshot(l.ref)); }
  function commit(pending){
    if(failure) throw failure;
    for(const [r, data] of pending) if(Buffer.byteLength(JSON.stringify(data))>LIMIT) throw new Error('maximum document size exceeded');
    for(const [r, data] of pending){ docs.set(r.path, copy(data)); writes.push(r.path); }
    emit();
  }
  const api = {
    _db:{},
    _fsDoc:(first,...parts)=>first.path ? ref(first.path+'/'+(parts.length ? parts.join('/') : 'new'+(++seq))) : ref(parts.join('/')),
    _fsCollection:(_db,...parts)=>ref(parts.join('/'),'collection'),
    _fsGetDoc:async r=>snapshot(r),
    _fsGetDocs:async r=>collectionSnapshot(r),
    _fsWhere:(f,op,v)=>({f,op,v}),
    _fsQuery:(r,w)=>({...r,where:w}),
    _fsSetDoc:async(r,data)=>commit([[r,data]]),
    _fsOnSnapshot:(r,next,error)=>{
      const l={ref:r,next,error,active:true};listeners.push(l);
      queueMicrotask(()=>{if(l.active) next(r.type==='collection' ? collectionSnapshot(r) : snapshot(r));});
      return ()=>{l.active=false;};
    },
    _fsRunTxn:async(_db,fn)=>{
      let pending=[];
      const txn={get:async r=>snapshot(r),set:(r,data)=>pending.push([r,copy(data)])};
      let result=await fn(txn);
      if(retry){ const run=retry;retry=null;run();pending=[];result=await fn(txn); }
      commit(pending);return result;
    }
  };
  return {api,docs,writes,listeners,store:Store.create(api,'test'),emit,
    retry:fn=>{retry=fn;},fail:e=>{failure=e;}};
}
const entry = (id, extra={})=>({id,studentNum:1,accountUid:'student1',studentName:'테스트',title:'제목',content:'본문',status:'pending',feedback:'',readAt:'',submittedAt:'2026-09-08T01:00:00.000Z',...extra});

test('near-limit legacy data can accept new writing without rewriting or truncating old writing',async()=>{
  const old=[entry('old1',{content:'a'.repeat(349000)}),entry('old2',{content:'b'.repeat(349000)}),entry('old3',{content:'c'.repeat(349000),feedback:'기존 피드백'})];
  const d=database(old), before=copy(d.docs.get(LEGACY));
  const next=entry(d.store.newId(),{content:'한글 글쓰기 '.repeat(500)});
  assert.ok(Buffer.byteLength(JSON.stringify(before))<LIMIT);
  assert.ok(Buffer.byteLength(JSON.stringify({value:[...old,next]}))>LIMIT);
  await d.store.add(next);
  assert.equal((await d.store.load()).length,4);
  assert.deepEqual(d.docs.get(LEGACY),before);
  assert.deepEqual(d.writes,[ITEMS+'/'+next.id]);
});

test('legacy edit and teacher feedback/rubric merge on one document and keep unrelated fields',async()=>{
  const old=entry('old',{feedback:'피드백',rubric:{total:80}}),d=database([old]);
  await d.store.update('old',w=>({...w,content:'고쳐 쓴 글',editCount:1}));
  await d.store.update('old',w=>({...w,feedback:'새 피드백',status:'reviewed'}));
  const rows=await d.store.load();
  assert.equal(rows.length,1);assert.equal(rows[0].content,'고쳐 쓴 글');
  assert.equal(rows[0].feedback,'새 피드백');assert.equal(rows[0].rubric.total,80);
  assert.deepEqual(d.docs.get(LEGACY).value,[old]);
  assert.equal(rows[0].revision,2);assert.equal(rows[0].needsRevisionReview,true);assert.equal(rows[0].rubricStale,true);
  const history=await d.store.history('old');assert.equal(history.length,1);assert.equal(history[0].content,'본문');assert.equal(history[0].feedback,'피드백');
});

test('deletion markers hide legacy writing on reload and prevent editing it back into existence',async()=>{
  const d=database([entry('old')],[entry('new')]);
  await d.store.remove('old');await d.store.remove('new');
  assert.deepEqual(await d.store.load(),[]);
  await assert.rejects(d.store.update('old',w=>({...w,content:'revive'})),/WRITING_NOT_FOUND/);
  assert.equal(d.docs.get(LEGACY).value.length,1);
});

test('transaction retry preserves teacher read status while editing',async()=>{
  const d=database([entry('old')]);
  d.retry(()=>d.docs.set(ITEMS+'/old',entry('old',{readAt:'2026-09-08',status:'read'})));
  await d.store.update('old',w=>({...w,content:'수정'}));
  assert.equal(d.docs.get(ITEMS+'/old').content,'수정');
  assert.equal(d.docs.get(ITEMS+'/old').readAt,'2026-09-08');
  assert.equal(d.docs.get(ITEMS+'/old').status,'read');
});

test('confirming a revision clears its queue flag and preserves feedback, original read date and stale rubric',async()=>{
  const old=entry('old',{readAt:'2026-09-08',feedback:'이전 피드백',rubric:{total:80}}),d=database([old]);
  const edited=await d.store.update('old',w=>({...w,content:'고친 본문'}));
  const saved=await d.store.update('old',w=>Store.confirmRead(w,Store.signature(edited),'2026-09-29'));
  assert.equal(saved.needsRevisionReview,false);assert.equal(saved.readBasisRevision,2);
  assert.equal(saved.revisionReviewedAt,'2026-09-29');assert.equal(saved.readAt,'2026-09-08');
  assert.equal(saved.feedback,'이전 피드백');assert.equal(saved.rubricStale,true);
  const again=await d.store.update('old',w=>({...w,title:'다시 수정'}));
  assert.equal(again.needsRevisionReview,true);assert.equal(again.revision,3);
});

test('confirmation transaction retries cannot acknowledge unseen edits',async()=>{
  const old=entry('old',{readAt:'2026-09-08',revision:2,needsRevisionReview:true}),d=database([],[old]);
  d.retry(()=>d.docs.set(ITEMS+'/old',{...old,content:'확인 중 다시 수정',revision:3}));
  await assert.rejects(d.store.update('old',w=>Store.confirmRead(w,Store.signature(old),'2026-09-29')),/다시 수정/);
  assert.equal((await d.store.load())[0].needsRevisionReview,true);assert.equal(d.writes.length,0);
});

test('new submissions have different IDs and retry does not duplicate',async()=>{
  const d=database(),a=entry(d.store.newId()),b=entry(d.store.newId());
  d.retry(()=>{});await d.store.add(a);await d.store.add(b);
  assert.notEqual(a.id,b.id);assert.equal((await d.store.load()).length,2);
  await assert.rejects(d.store.add(a),/WRITING_ALREADY_EXISTS/);
});

test('live list waits for both formats, deduplicates overrides and unsubscribes both listeners',async()=>{
  const d=database([entry('old')],[entry('old',{content:'수정본'})]);
  const events=[];const stop=d.store.subscribe(rows=>events.push(rows));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.length,1);assert.equal(events[0].length,1);assert.equal(events[0][0].content,'수정본');
  await d.store.add(entry('new'));assert.equal(events.at(-1).length,2);
  stop();assert.ok(d.listeners.every(l=>!l.active));
  const count=events.length;d.emit();assert.equal(events.length,count);
});

test('backup roundtrip includes both formats and restores larger than 1 MiB into individual documents',async()=>{
  const rows=[entry('a',{content:'a'.repeat(550000)}),entry('b',{content:'b'.repeat(550000)})];
  const d=database([entry('removed')],[entry('other')]);
  await d.store.replaceAll(rows);
  assert.deepEqual(await d.store.load(),rows);
  assert.ok(d.writes.every(p=>p.startsWith(ITEMS+'/')));
  await assert.rejects(d.store.replaceAll({value:rows}),/WRITING_INVALID_BACKUP/);
});

function student(d){
  const elements={};
  const el=id=>elements[id] ||= {style:{display:'none'},classList:{add(){},remove(){},toggle(){}},value:'',textContent:'',innerHTML:'',disabled:false};
  const storage=new Map(Object.entries({'pesk-room-id':'test','pesk-student-num':'1','pesk-student-name':'테스트','pesk-account-uid':'student1','pesk-session-version':'1','pesk-login-id':'test'}));
  const alerts=[],notices=[];
  const c={console,URL,URLSearchParams,Intl,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    document:{getElementById:el,querySelector:()=>el('submit'),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{classList:{add(){},remove(){}}}},
    setTimeout(){},setInterval(){},clearTimeout(){},clearInterval(){},navigator:{},location:{},alert:m=>alerts.push(m),confirm:()=>true,Image:class{},addEventListener(){}};
  c.window=c;vm.createContext(c);
  const html=fs.readFileSync(path.join(ROOT,'pesk.html'),'utf8');
  vm.runInContext(html.split('<script>')[1].split('</script>')[0],c);
  Object.assign(c,d.api,{PeskWritings:Store,_fbReady:true});
  d.docs.set('classrooms/test/data/tesk-accounts',{value:{1:{accountUid:'student1',sessionVersion:1,mustChangePassword:false,studentNum:1,roomId:'test',id:'test'}}});
  c.showFeedbackNotice=m=>notices.push(m);
  c.petGrow=async()=>0;c.maybeAutoPayAutoChallenge=async()=>{};
  el('w-title-inp').value='새 글';el('w-content-inp').value='학생이 작성한 내용';el('writing-form-wrap').style.display='block';
  return {c,el,alerts,notices,storage,state:()=>vm.runInContext('({writingDraft,peskWritings,_writingSubmitting})',c)};
}

test('actual student submit succeeds near the limit and deduplicates an early snapshot',async()=>{
  const d=database([entry('old',{content:'x'.repeat(LIMIT-500)})]),s=student(d);
  s.el('w-content-inp').value='학생 글쓰기 '.repeat(200);
  const stop=d.store.subscribe(rows=>{s.c.incoming=rows;vm.runInContext('peskWritings=incoming',s.c);});
  await s.c.submitPeskWriting();stop();
  assert.deepEqual(s.alerts,[]);assert.ok(s.notices.includes('글이 제출됐어요.'));
  assert.equal((await d.store.load()).length,2);assert.equal(s.state().peskWritings.length,2);
  assert.equal(s.el('w-content-inp').value,'');assert.equal(s.el('submit').disabled,false);
});

test('actual student submit keeps draft and restores button when writes fail',async()=>{
  const d=database(),s=student(d);d.fail(new Error('permission-denied'));
  await s.c.submitPeskWriting();
  assert.equal(s.state().writingDraft.content,'학생이 작성한 내용');
  assert.equal(s.el('w-content-inp').value,'학생이 작성한 내용');
  assert.match(s.alerts[0],/제출 실패/);assert.equal(s.el('submit').disabled,false);
  assert.equal((await d.store.load()).length,0);
});

test('committed writing stays successful when local history storage is full',async()=>{
  const d=database(),s=student(d);
  s.c.addTxn=()=>{throw new Error('QuotaExceededError');};
  await s.c.submitPeskWriting();
  assert.equal((await d.store.load()).length,1);
  assert.deepEqual(s.alerts,[]);assert.ok(s.notices.includes('글이 제출됐어요.'));
  assert.equal(s.el('w-content-inp').value,'');assert.equal(s.el('submit').disabled,false);
});

test('optional password reminder storage failure does not reject a valid session',async()=>{
  const d=database(),s=student(d),set=s.c.localStorage.setItem;
  s.c.localStorage.setItem=(k,v)=>{if(k==='pesk-pw-changed')throw new Error('QuotaExceededError');set(k,v);};
  assert.equal(await s.c.ensureActiveStudentSession(false),true);
  assert.deepEqual(s.alerts,[]);
});

test('student logout ends Firebase auth, clears the session and replaces history',async()=>{
  const s=student(database());let signedOut=0,stopped=0,target='';
  s.c._auth={};s.c._signOut=async()=>signedOut++;s.c.location.replace=url=>target=url;
  s.c.stopListener=()=>stopped++;vm.runInContext('_unsubs.push(stopListener)',s.c);
  await Promise.all([s.c.logout(),s.c.logout()]);
  assert.equal(signedOut,1);assert.equal(stopped,1);assert.equal(target,'landing.html');
  assert.equal(s.storage.has('pesk-account-uid'),false);assert.equal(s.storage.has('pesk-room-id'),false);
  assert.equal(await s.c.ensureActiveStudentSession(false),false);
});

test('failed Firebase logout still logs out after removing the device login record',async()=>{
  const s=student(database());let forced=0,target='';s.c._auth={};s.c._signOut=async()=>{throw Error('Quota exceeded');};
  s.c._forceLocalSignOut=async()=>{forced++;};s.c.location.replace=url=>target=url;
  await s.c.logout();assert.equal(forced,1);assert.equal(target,'landing.html');assert.equal(s.storage.has('pesk-account-uid'),false);assert.equal(s.alerts.length,0);
});

test('logout stops and can be retried only when the device login record cannot be removed',async()=>{
  const s=student(database());s.c._auth={};s.c._signOut=async()=>{throw Error('auth failed');};s.c._forceLocalSignOut=async()=>{throw Error('storage failed');};s.c.location.replace=()=>assert.fail('must not redirect');
  await s.c.logout();assert.equal(s.storage.get('pesk-account-uid'),'student1');assert.match(s.alerts[0],/로그아웃을 완료하지 못했어요/);
  s.c._signOut=async()=>{};s.c.location.replace=()=>{};await s.c.logout();assert.equal(s.storage.has('pesk-account-uid'),false);
});

test('damaged local JSON falls back without rejecting valid server state',()=>{
  const s=student(database());s.storage.set('bad','{broken');s.storage.set('wrong','null');
  assert.equal(s.c.readLocalJson('bad',[]).length,0);assert.equal(s.c.readLocalJson('wrong',[]).length,0);
});

test('actual student rapid double click creates one submission',async()=>{
  const d=database(),s=student(d);
  await Promise.all([s.c.submitPeskWriting(),s.c.submitPeskWriting()]);
  assert.equal((await d.store.load()).length,1);
});

test('actual student edit preserves feedback and student deletion hides the old record',async()=>{
  const d=database([entry('old',{feedback:'기존 피드백'})]),s=student(d);
  vm.runInContext("writingDraft.editId='old'",s.c);
  await s.c.submitPeskWriting();
  assert.equal((await d.store.load())[0].feedback,'기존 피드백');
  assert.equal((await d.store.load())[0].content,'학생이 작성한 내용');
  await s.c.deletePeskWriting('old');
  assert.deepEqual(await d.store.load(),[]);
});

test('actual student can open and edit read or reviewed writing without losing teacher records',async()=>{
  for(const extra of [{status:'read'},{readAt:'2026-09-08',status:'reviewed',feedback:'기존 피드백',feedbackDate:'2026-09-08',rubric:{total:90},score:90}]){
    const original=entry('old',extra),d=database([original]),s=student(d);
    s.c.incoming=[original];vm.runInContext('peskWritings=incoming; writingDraft={title:"",content:"",editId:"",open:false};',s.c);
    assert.match(s.c.buildWritingListHtml(),/고쳐 쓰기/);
    assert.doesNotMatch(s.c.buildWritingListHtml(),/deletePeskWriting/);
    s.c.startEditWriting('old');assert.equal(s.state().writingDraft.editId,'old');
    assert.match(s.c.buildWritingFormHtml(),/읽은 뒤에도 고쳐/);
    await s.c.submitPeskWriting();
    const updated=(await d.store.load())[0];
    assert.equal(updated.content,'학생이 작성한 내용');assert.equal(updated.title,'새 글');
    for(const [key,value] of Object.entries(extra))assert.deepEqual(updated[key],value);
    assert.equal(updated.editCount,1);assert.ok(updated.updatedAt);assert.deepEqual(s.alerts,[]);
    await s.c.deletePeskWriting('old');assert.equal((await d.store.load()).length,1);assert.match(s.alerts.at(-1),/지울 수 없어요/);
  }
});

test('actual edit preserves teacher changes committed during transaction retry',async()=>{
  const d=database([entry('old')]),s=student(d);
  vm.runInContext("writingDraft.editId='old'",s.c);
  d.retry(()=>d.docs.set(ITEMS+'/old',entry('old',{readAt:'2026-09-17',status:'reviewed',feedback:'동시에 작성한 피드백',rubric:{total:85}})));
  await s.c.submitPeskWriting();const updated=(await d.store.load())[0];
  assert.equal(updated.content,'학생이 작성한 내용');assert.equal(updated.readAt,'2026-09-17');assert.equal(updated.status,'reviewed');
  assert.equal(updated.feedback,'동시에 작성한 피드백');assert.equal(updated.rubric.total,85);assert.equal(updated.editCount,1);assert.deepEqual(s.alerts,[]);
});

test('actual student cannot edit another student writing, including a read writing',async()=>{
  for(const extra of [{accountUid:'student2',studentNum:2},{accountUid:'student2',studentNum:2,readAt:'2026-09-08',status:'read'}]){
    const d=database([entry('old',extra)]),s=student(d);
    vm.runInContext("writingDraft.editId='old'",s.c);await s.c.submitPeskWriting();
    assert.equal(d.writes.length,0);assert.equal(s.alerts.length,1);
  }
});

test('teacher feedback, read, rubric and deletion use individual documents',async()=>{
  const d=database([entry('old')]);
  const c={window:{...d.api,PeskWritings:Store,_fbReady:true},TESK_ROOM:'test',peskWritingsAll:[entry('old')],console,
    writingDetailId:null,_peskFeedbackId:null,today:()=> '2026-09-08',showToast(){},addActivity(){},renderWriting(){},
    openAppConfirmModal:async()=>true,document:{getElementById:()=>({value:'선생님 피드백'}),querySelector:()=>null}};
  vm.createContext(c);
  const source=fs.readFileSync(path.join(ROOT,'tesk_teacher_v2.html'),'utf8');
  function take(a,b){return source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));}
  vm.runInContext(take('function writingStore(){','let peskSurveyAll'),c);
  vm.runInContext(take('async function markPeskWritingRead(', 'function escHtml('),c);
  vm.runInContext(take('async function savePeskWritingRubric(', 'async function submitWriting('),c);
  vm.runInContext(take('async function deletePeskWriting(', '// Pesk 제출 글 피드백 모달'),c);
  await c.submitPeskFeedback('old');await c.markPeskWritingRead('old');await c.savePeskWritingRubric('old',{total:90});
  const w=(await d.store.load())[0];
  assert.equal(w.feedback,'선생님 피드백');assert.equal(w.readAt,'2026-09-08');assert.equal(w.score,90);
  await c.deletePeskWriting('old');assert.deepEqual(await d.store.load(),[]);
  assert.ok(d.writes.every(p=>p.startsWith(ITEMS+'/')));
});

test('student loads only own writings and published anthology, not the whole class',async()=>{
  const legacy=[entry('oldMine'),entry('oldOther',{studentNum:2,accountUid:'student2'})];
  const d=database(legacy,[
    entry('mine'),
    entry('other',{studentNum:2,accountUid:'student2'}),
    entry('published',{studentNum:3,accountUid:'student3',anthology:{status:'published',publishedAt:'2026-10-01'}}),
    entry('oldMine',{deleted:true})
  ]);
  const owner={studentNum:1,accountUid:'student1'};
  const ids=rows=>rows.map(w=>w.id).sort();
  assert.deepEqual(ids(await d.store.loadMine(owner)),['mine','published']);
  const seen=[];
  const stop=d.store.subscribeMine(owner,rows=>seen.push(ids(rows)));
  await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(seen.at(-1),['mine','published']);
  await d.store.add(entry('mine2'));
  await d.store.add(entry('other2',{studentNum:2,accountUid:'student2'}));
  assert.deepEqual(seen.at(-1),['mine','mine2','published']);
  stop();
});
