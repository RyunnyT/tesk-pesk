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

// 교사 화면을 열 때 이 컴퓨터의 낡은 학생 잔액을 서버에 덮어쓰지 않는다 (학생 돈이 되돌아가던 문제)
test('처음 올리기는 서버에 없는 문서만 올린다', async()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const html=fs.readFileSync(path.join(__dirname,'..','tesk_teacher_v2.html'),'utf8');
  const start=html.indexOf('const FORCE_SYNC_KEYS'),end=html.indexOf('setTimeout(()=>_forceSyncAll()',start);
  assert.ok(start>0&&end>start);
  const server={'tesk-students':[{num:1,points:900}]},saved=[];
  const local={'tesk-students':[{num:1,points:100}],'tesk-jobs':[{title:'은행원'}]};
  const ctx={TESK_ROOM:'r',console,load:(k,d)=>k in local?local[k]:d,saveFirebase:async(k,v)=>{saved.push(k);server[k]=v;},
    window:{_fbReady:true,_db:{},_fsDoc:(_db,...p)=>p.at(-1),_fsGetDoc:async k=>({exists:()=>k in server})}};
  vm.runInNewContext(html.slice(start,end)+';this.run=_forceSyncAll;',ctx);
  await ctx.run();
  assert.deepEqual(saved,['tesk-jobs']);
  assert.equal(server['tesk-students'][0].points,900,'서버의 학생 잔액은 그대로');
});
