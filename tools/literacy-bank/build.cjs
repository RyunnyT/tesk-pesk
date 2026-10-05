/* 📚 오늘의 지문 은행 만들기
   · 분야·수준별 파일(예: 사회-34.cjs)에 지문을 짧은 모양으로 적는다.
   · 이 스크립트가 앱과 같은 규칙(shared/literacy-core.js validate)으로 검사하고 시트용 CSV 를 만든다.
   실행: node tools/literacy-bank/build.cjs   → tools/literacy-bank/literacy-bank.csv

   짧은 모양:
   {id, t:제목, topic?:주제, p:[문단…], g:[[용어,뜻],[용어,뜻]], c:가운데,
    b:[[가지 이름, 내용({{빈칸}}), 덧붙임, 근거 문단], …3~4개],
    q:[4번 문제, [보기1..4], 정답 번호 1~4, 근거 문단, 해설], e:서술형} */
const fs = require('fs'), path = require('path');
const L = require('../../shared/literacy-core.js');
const DIR = __dirname;
const SUBJECTS = ['사회','역사','생활','과학','환경'];
const LEVELS = [['34','low'],['56','high'],['심화','adv']];

function toRaw(x){
  return {title:x.t, paragraphs:x.p, glossary:x.g.map(([term,meaning])=>({term,meaning})),
    map:{center:x.c, branches:x.b.map(([label,text,sub,evidence])=>({label,text,sub:sub||'',evidence}))},
    final_quiz:{text:x.q[0], choices:x.q[1], answer:x.q[2], evidence:x.q[3], explain:x.q[4]||''},
    essay_suggestion:x.e||''};
}
const rows = [L.BANK_COLUMNS], problems = [], seen = new Set(), summary = [];
let total = 0;
for(const subject of SUBJECTS) for(const [tag, level] of LEVELS){
  const file = path.join(DIR, subject + '-' + tag + '.cjs');
  if(!fs.existsSync(file)){ summary.push(subject + '-' + tag + ': (아직 없음)'); continue; }
  const list = require(file);
  let ok = 0;
  list.forEach((x, i) => {
    const where = subject + '-' + tag + ' #' + (i + 1) + ' ' + (x.t || '');
    if(!x.id || seen.has(x.id)) problems.push(where + ': 번호가 없거나 겹쳐요 (' + x.id + ')');
    seen.add(x.id);
    const raw = toRaw(x);
    const v = L.fromAi(raw, {level, seed: x.id});
    if(!v.ok) problems.push(where + ': ' + v.errors.join(' / '));
    else ok++;
    v.warnings.forEach(w => problems.push(where + ' (주의): ' + w));
    if(new Set(x.q[1]).size !== 4) problems.push(where + ': 보기 중복');
    if(x.b.length > 4) problems.push(where + ': 구조도 가지는 시트 열에 맞게 4개까지만 써요');
    rows.push(L.toBankRow({id:x.id, level, subject, topic:x.topic || x.t}, raw));
    total++;
  });
  summary.push(subject + '-' + tag + ': ' + ok + '/' + list.length);
}
fs.writeFileSync(path.join(DIR, 'literacy-bank.csv'), '﻿' + L.toCsv(rows), 'utf8');
// 되읽기 검사: 시트가 돌려줄 CSV 를 앱이 그대로 읽을 수 있는지
const back = L.parseBank(L.toCsv(rows));
const backBad = back.rows.filter(r => !r.ok);
console.log(summary.join('\n'));
console.log('합계 ' + total + '편 · 되읽기 통과 ' + (back.rows.length - backBad.length) + '/' + back.rows.length + (back.missing.length ? ' · 빠진 열 ' + back.missing.join(',') : ''));
if(problems.length){ console.log('\n문제:\n' + problems.join('\n')); }
process.exitCode = problems.some(p => !p.includes('(주의)')) || backBad.length ? 1 : 0;
