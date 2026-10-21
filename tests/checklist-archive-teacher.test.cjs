/* 교사 앱(tesk_teacher_v2.html)의 실제 보관 함수를 메모리 Firestore로 실행한다. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const ChecklistArchive = require('../shared/checklist-archive.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'tesk_teacher_v2.html'), 'utf8');
const start = html.indexOf('let checklistArchive = {};');
const end = html.indexOf('\n}', html.indexOf('async function startChecklistArchive')) + 2;
const block = html.slice(start, end);

function fakeDb(){
  const store = new Map();
  const snap = (p)=>({exists:()=>store.has(p), data:()=>JSON.parse(JSON.stringify(store.get(p)))});
  let beforeCommit = null;   // 트랜잭션 도중 다른 사람이 쓰는 상황 흉내
  const api = {
    store,
    _fbReady:true, _db:{},
    _fsDoc:(db, ...parts)=>parts.join('/'),
    _fsGetDoc:async p=>snap(p),
    _fsSetDoc:async (p, v)=>{ store.set(p, JSON.parse(JSON.stringify(v))); },
    // 낙관적 트랜잭션: 읽은 문서가 커밋 전에 바뀌면 다시 실행
    _fsRunTxn:async (db, fn)=>{
      for(let attempt = 0; attempt < 5; attempt++){
        const reads = new Map(), writes = new Map();
        const txn = {
          get:async p=>{ reads.set(p, JSON.stringify(store.get(p) ?? null)); return snap(p); },
          set:(p, v)=>{ writes.set(p, JSON.parse(JSON.stringify(v))); }
        };
        const out = await fn(txn);
        if(beforeCommit){ const f = beforeCommit; beforeCommit = null; f(); }
        if([...reads].every(([p, v])=>JSON.stringify(store.get(p) ?? null) === v)){
          writes.forEach((v, p)=>store.set(p, v));
          return out;
        }
      }
      throw new Error('too much contention');
    },
    onceBeforeCommit:f=>{ beforeCommit = f; }
  };
  return api;
}
function load(db){
  const env = {...db, ChecklistArchive};
  const activity = [];
  const f = new Function('window', 'TESK_ROOM', 'ChecklistArchive', 'addActivity', 'document', 'renderTeacherChecklistPanel', 'checklistRecords',
    block + '\nreturn {archiveOldChecklists, loadChecklistArchive, startChecklistArchive, checklistHistory, checklistDay, get archive(){return checklistArchive}, get months(){return checklistArchiveMonths}, setMain(v){checklistRecords=v}};');
  const fns = f(env, 'R1', ChecklistArchive, a=>activity.push(a), {getElementById:()=>null}, ()=>{}, {});
  return {fns, activity};
}
const rec = who=>({checked:true, checkerName:who});
// 보관 기준은 '오늘'이라 날짜를 2026-10-21로 고정해서 돌린다
async function on20261021(fn){
  const RealDate = Date;
  global.Date = class extends RealDate { constructor(...a){ super(...(a.length ? a : [2026, 9, 21, 9])); } static now(){ return new RealDate(2026, 9, 21, 9).getTime(); } };
  try{ return await fn(); } finally { global.Date = RealDate; }
}
const P = k=>'classrooms/R1/data/' + k;

test('오래된 달을 옮기고, 다시 합치면 원래와 같고, 두 번 돌려도 그대로', async()=>{
  const db = fakeDb();
  const main = {'2026-06-03':{c1:{1:rec('a'), 2:rec('a')}}, '2026-07-10':{c1:{3:rec('b')}}, '2026-09-02':{c1:{4:rec('c')}}, '2026-10-21':{c1:{5:rec('d')}}};
  db.store.set(P('pesk-checklists'), {value:main});
  const {fns, activity} = load(db);
  await on20261021(()=>fns.startChecklistArchive());
  assert.deepStrictEqual(Object.keys(db.store.get(P('pesk-checklists')).value).sort(), ['2026-09-02', '2026-10-21']);
  assert.deepStrictEqual(db.store.get(P('pesk-checklist-archive-index')).value, ['2026-06', '2026-07']);
  assert.deepStrictEqual(fns.months, ['2026-06', '2026-07']);
  fns.setMain(db.store.get(P('pesk-checklists')).value);
  assert.deepStrictEqual(fns.checklistHistory(), main);
  assert.ok(fns.checklistDay('2026-06-03').c1[2].checked);
  assert.match(activity[0], /2026-06, 2026-07/);
  assert.deepStrictEqual(await on20261021(()=>fns.archiveOldChecklists()), []);
});

test('보관 도중 학생이 오늘 날짜를 체크해도 그 체크가 남는다', async()=>{
  const db = fakeDb();
  db.store.set(P('pesk-checklists'), {value:{'2026-05-02':{c1:{1:rec('old')}}, '2026-10-21':{c1:{1:rec('s')}}}});
  db.onceBeforeCommit(()=>{
    const cur = db.store.get(P('pesk-checklists'));
    cur.value['2026-10-21'].c1[2] = rec('student-live');
    db.store.set(P('pesk-checklists'), cur);
  });
  const {fns} = load(db);
  const moved = await on20261021(()=>fns.archiveOldChecklists());
  const main = db.store.get(P('pesk-checklists')).value;
  assert.ok(moved.length >= 1);
  assert.ok(main['2026-10-21'].c1[2], '동시에 한 학생 체크 보존');
  assert.ok(!main['2026-05-02']);
  assert.ok(db.store.get(P('pesk-checklist-archive-2026-05')).value['2026-05-02'].c1[1]);
});

test('이미 보관한 달에 같은 날짜가 다시 생기면 합쳐서 옮긴다', async()=>{
  const db = fakeDb();
  db.store.set(P('pesk-checklist-archive-2026-05'), {value:{'2026-05-02':{c1:{1:rec('old')}}}});
  db.store.set(P('pesk-checklist-archive-index'), {value:['2026-05']});
  db.store.set(P('pesk-checklists'), {value:{'2026-05-02':{c1:{2:rec('late')}}}});
  const {fns} = load(db);
  await on20261021(()=>fns.archiveOldChecklists());
  const day = db.store.get(P('pesk-checklist-archive-2026-05')).value['2026-05-02'].c1;
  assert.deepStrictEqual(Object.keys(day).sort(), ['1', '2']);
  assert.deepStrictEqual(db.store.get(P('pesk-checklist-archive-index')).value, ['2026-05']);
});
