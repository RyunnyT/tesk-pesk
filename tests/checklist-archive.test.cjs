const test = require('node:test');
const assert = require('node:assert');
const A = require('../shared/checklist-archive.js');

const rec = (who, at)=>({checked:true, checkerName:who, checkedAt:at});

test('이번 달·지난 달은 남기고 그 전 달만 보관 (해 넘김 포함)', ()=>{
  assert.strictEqual(A.cutoffMonth(new Date(2026, 9, 21)), '2026-09');
  assert.strictEqual(A.cutoffMonth(new Date(2027, 0, 5)), '2026-12');
  const main = {'2026-05-20':{a:{1:rec('x')}}, '2026-08-31':{a:{2:rec('y')}}, '2026-09-01':{a:{3:rec('z')}}, '2026-10-21':{a:{4:rec('w')}}, meta:{keepMe:true}};
  const {keep, byMonth} = A.split(main, new Date(2026, 9, 21));
  assert.deepStrictEqual(Object.keys(keep).sort(), ['2026-09-01', '2026-10-21', 'meta']);
  assert.deepStrictEqual(Object.keys(byMonth).sort(), ['2026-05', '2026-08']);
  assert.deepStrictEqual(byMonth['2026-05'], {'2026-05-20':main['2026-05-20']});
});

test('합치기: 같은 날짜는 항목·학생 단위로, 나중 것이 이김, 다른 학생 기록은 보존', ()=>{
  const old = {'2026-05-20':{a:{1:rec('old'), 2:rec('old')}, b:{1:rec('old')}}};
  const neu = {'2026-05-20':{a:{1:rec('new')}}, '2026-05-21':{a:{3:rec('new')}}};
  const m = A.mergeRecords(old, neu);
  assert.strictEqual(m['2026-05-20'].a[1].checkerName, 'new');
  assert.strictEqual(m['2026-05-20'].a[2].checkerName, 'old');
  assert.strictEqual(m['2026-05-20'].b[1].checkerName, 'old');
  assert.ok(m['2026-05-21'].a[3]);
  assert.deepStrictEqual(old['2026-05-20'].a[1].checkerName, 'old', '원본을 바꾸지 않는다');
});

test('보관 → 다시 합치면 원래 기록과 같다 (기록 손실 없음)', ()=>{
  const main = {};
  for(let m = 5; m <= 10; m++) for(let d = 1; d <= 28; d += 3){
    const date = `2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    main[date] = {clean:{[d]:rec('t'+m)}, morning:{[m]:rec('s'+d)}};
  }
  const {keep, byMonth} = A.split(main, new Date(2026, 9, 21));
  let archive = {};
  Object.values(byMonth).forEach(v=>{ archive = A.mergeRecords(archive, v); });
  assert.deepStrictEqual(A.history(keep, archive), main);
  assert.deepStrictEqual(A.indexWith(['2026-05'], Object.keys(byMonth)), ['2026-05', '2026-06', '2026-07', '2026-08']);
});

test('하루 약 7KB × 학기 → 원래 문서는 두 달치만 남는다', ()=>{
  const main = {};
  const big = Object.fromEntries(Array.from({length:23}, (_, i)=>[i+1, rec('반장 이름', '2026-10-21T08:00:00.000Z')]));
  for(let m = 3; m <= 10; m++) for(let d = 1; d <= 28; d++){
    main[`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = {i1:big, i2:big, i3:big};
  }
  const bytes = o=>Buffer.byteLength(JSON.stringify(o));
  const {keep} = A.split(main, new Date(2026, 9, 21));
  assert.ok(bytes(main) > 1048576, '보관 안 하면 1MB를 넘는다');
  assert.ok(bytes(keep) < 1048576 * 0.5, '두 달치는 절반 아래');
});
