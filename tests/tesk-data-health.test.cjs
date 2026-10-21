const test = require('node:test');
const assert = require('node:assert');
const H = require('../shared/tesk-data-health.js');

test('한글은 UTF-8 3바이트로 센다', ()=>{
  assert.strictEqual(H.utf8Bytes('가나'), 6);
  assert.strictEqual(H.utf8Bytes('ab'), 2);
  assert.ok(H.docBytes(['가'.repeat(1000)]) > 3000);
});

test('단계: 70% 주의, 90% 위험', ()=>{
  assert.strictEqual(H.level(H.LIMIT * 0.5), 'ok');
  assert.strictEqual(H.level(H.LIMIT * 0.75), 'warn');
  assert.strictEqual(H.level(H.LIMIT * 0.95), 'danger');
});

test('보고서: 큰 순서, 나눠 저장한 자료는 제외, 크기 기록으로 되돌리기', ()=>{
  const docs = {'tesk-counsels':[{memo:'가'.repeat(300000)}], 'tesk-settings':{a:1}, 'pesk-writings':[{content:'가'.repeat(400000)}]};
  const rows = H.report(docs, ['pesk-writings']);
  assert.deepStrictEqual(rows.map(r=>r.key), ['tesk-counsels', 'tesk-settings']);
  assert.strictEqual(rows[0].label, '상담 기록');
  assert.strictEqual(rows[0].level, 'warn');
  assert.deepStrictEqual(H.fromSizes(H.toSizes(rows)), rows);
});

test('거래 로그는 자동 정리 범위(약 81%)까지는 경고하지 않는다', ()=>{
  const [r] = H.fromSizes({'pesk-purchase-log':850000});
  assert.strictEqual(r.level, 'ok'); assert.strictEqual(r.auto, true);
  assert.strictEqual(H.fromSizes({'pesk-purchase-log':Math.round(H.LIMIT*0.93)})[0].level, 'danger');
  assert.strictEqual(H.fromSizes({'pesk-checklists':850000})[0].level, 'warn');
});

test('Firestore 크기 초과 오류를 알아본다', ()=>{
  const e = new Error('Document cannot be written because its size (1,100,000 bytes) exceeds the maximum allowed size of 1,048,576 bytes.');
  assert.ok(H.isSizeError(e));
  assert.ok(!H.isSizeError(new Error('Failed to get document because the client is offline.')));
  assert.match(H.failureText('tesk-records', e), /생활기록부.*가득/);
  assert.match(H.failureText('tesk-records', new Error('offline')), /인터넷 연결/);
});

test('백업 알림: 기록 없음·14일 이상만, 미루기 존중', ()=>{
  const now = new Date(2026, 9, 21, 9);
  assert.deepStrictEqual(H.backupDue('', now), {days:null, never:true});
  assert.strictEqual(H.backupDue(new Date(2026, 9, 10, 23).toISOString(), now), null);
  assert.deepStrictEqual(H.backupDue(new Date(2026, 9, 7, 23).toISOString(), now), {days:14, never:false});
  assert.strictEqual(H.backupDue('', now, new Date(2026, 9, 22).toISOString()), null);
  assert.deepStrictEqual(H.backupDue('', now, new Date(2026, 9, 20).toISOString()), {days:null, never:true});
});
