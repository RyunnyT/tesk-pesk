const test=require('node:test'),assert=require('node:assert/strict'),T=require('../shared/todo-schedule.js');
const d=s=>{const [y,m,dd]=s.split('-').map(Number);return new Date(y,m-1,dd);};
test('a class that never saved the table keeps the old behaviour',()=>{
  const s=T.normalize(null);
  assert.deepEqual(T.activeOn(s,'2026-10-05'),['writing','adventure','challenge']);            // 월
  assert.deepEqual(T.activeOn(s,'2026-10-06'),['writing','adventure','literacy','challenge']); // 화
  assert.deepEqual(T.activeOn(s,'2026-10-04'),['adventure','challenge']);                      // 일: 글쓰기 없음
});
test('checking or unchecking a weekday changes that weekday every week',()=>{
  let s=T.normalize({weekly:{writing:[1,3,5]}});
  assert.equal(T.isOn(s,'writing','2026-10-08'),false);
  s=T.toggle(s,'writing',4);
  assert.equal(T.isOn(s,'writing','2026-10-08'),true);
  assert.equal(T.isOn(s,'writing',d('2026-10-15')),true);
  s=T.toggle(s,'writing',4);
  assert.equal(T.isOn(s,'writing','2026-10-08'),false);
  assert.deepEqual(s.weekly.adventure,T.DEFAULT_WEEKLY.adventure,'other rows keep defaults');
});
test('bad stored values are dropped and an empty row really means no days',()=>{
  const s=T.normalize({weekly:{writing:[1,'3',9,-1,1.5,'x'],adventure:[]}});
  assert.deepEqual(s.weekly.writing,[1,3]);
  assert.equal(T.isOn(s,'adventure','2026-10-05'),false);
  assert.equal(T.isOn(s,'nope','2026-10-05'),false);
  assert.equal(T.isOn(s,'writing','2026-13-45x'),false);
});
test('labels read naturally for the teacher',()=>{
  assert.equal(T.dowLabel([1,2,3,4,5]),'평일');assert.equal(T.dowLabel([0,1,2,3,4,5,6]),'매일');
  assert.equal(T.dowLabel([2,4]),'화·목');assert.equal(T.dowLabel([0,6]),'토·일');assert.equal(T.dowLabel([]),'없음');
});
