// 🧪 아르카(베타) 서버 저장 순수 함수 검사: node tests/arca-store.test.cjs
const test = require('node:test'), assert = require('node:assert/strict');
require('../shared/pesk-arca-store.js');
const S = globalThis.PeskArcaStore;
const NOW = Date.parse('2026-11-18T09:00:00+09:00');

test('학습 기록은 1년(365일) 지난 것을 뺀다', () => {
  const log = { v: 1,
    recent: [{ d: '2025-11-17', u: 'A', ok: 1 }, { d: '2025-11-19', u: 'A', ok: 0 }, { d: '2026-11-18', u: 'B', ok: 1 }],
    agg: { old: { d: '2024-03-01', u: 'A', n: 9, ok: 9 }, keep: { d: '2026-01-02', u: 'A', n: 3, ok: 1 } },
    miss: { q1: { last: '2025-01-01', n: 2 }, q2: { last: '2026-11-01', n: 1 } } };
  const p = S.prune(log, NOW);
  assert.deepEqual(p.recent.map((e) => e.d), ['2025-11-19', '2026-11-18']);
  assert.deepEqual(Object.keys(p.agg), ['keep']);
  assert.deepEqual(Object.keys(p.miss), ['q2']);
  assert.equal(log.recent.length, 3, '원본(기기 기록)은 그대로');
});

test('요약: 단원별·진도·별명', () => {
  const s = S.summary({ recent: [{ d: '2026-11-18', u: '약수와 배수', ok: 1, t: 5 }, { d: '2026-11-18', u: '약수와 배수', ok: 0, t: 7 }], agg: {}, miss: { 'q': { a: '6', n: 3, fix: 0 } } },
    { solved: 4, lv: 2, name: '별이', done: { t1: [1, 1, 1, 1, 1, 1, 1, 1], t2: [1, 0, 0, 0, 0, 0, 0, 0] } });
  assert.equal(s.n, 2); assert.equal(s.ok, 1); assert.equal(s.part, 2); assert.equal(s.towns, 1);
  assert.deepEqual(s.units['약수와 배수'], { n: 2, ok: 1 });
  assert.equal(s.miss[0].a, '6'); assert.equal(s.nick, '별이');
});

test('열 때 고르기: 더 많이 진행한 쪽(선생님 결정)', () => {
  const L = JSON.stringify({ solved: 3 }), R = JSON.stringify({ solved: 9 });
  const meta = { rev: 1, h: S.hash(L + '|a') };
  assert.equal(S.choose({ save: L, log: 'a' }, { save: null }, meta).from, 'local', '서버에 없으면 기기');
  assert.equal(S.choose({ save: null }, { save: R, rev: 2 }, meta).from, 'server', '기기에 없으면 서버');
  assert.equal(S.choose({ save: L, log: 'a' }, { save: R, log: 'b', rev: 2 }, meta).from, 'server', '기기는 그대로·서버만 바뀜');
  assert.equal(S.choose({ save: L, log: 'z' }, { save: R, log: 'b', rev: 1 }, meta).from, 'local', '서버는 그대로·기기만 바뀜');
  const both = S.choose({ save: L, log: 'z' }, { save: R, log: 'b', rev: 2 }, meta);
  assert.equal(both.from, 'server'); assert.match(both.note, /9개/);
  const both2 = S.choose({ save: R, log: 'z' }, { save: L, log: 'b', rev: 2 }, { rev: 1, h: 'x' });
  assert.equal(both2.from, 'local');
});

test('두 기기 학습 기록 합치기: 같은 줄은 한 번', () => {
  const e1 = { d: '2026-11-17', u: 'A', ok: 1 }, e2 = { d: '2026-11-18', u: 'A', ok: 0 };
  const m = S.mergeLog({ recent: [e1], agg: {}, miss: {} }, { recent: [e1, e2], agg: {}, miss: {} });
  assert.equal(m.recent.length, 2);
});
