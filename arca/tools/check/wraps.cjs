// 감싸기 지도(프롬프트 Q 1단계): 어떤 함수를 어느 파일이 어떤 순서로 감싸는지 찾아 docs/코드_흐름.md 를 만든다.
// 사용법: node arca/tools/check/wraps.cjs   (index.html 의 <script> 순서대로 읽는다)
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map((m) => m[1]);
const decl = {}, wraps = {};
for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of s.matchAll(/^(?:async )?function (\w+)\s*\(/gm)) decl[m[1]] = decl[m[1]] || f;
  for (const m of s.matchAll(/^\s*(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/gm)) decl[m[1]] = decl[m[1]] || f;
  // 감싸기: "이름 = function" 또는 "이름 = (…) =>" 로 다시 넣는 곳(선언이 아닌 것)
  for (const m of s.matchAll(/^\s*(\w+)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>)/gm)) {
    (wraps[m[1]] = wraps[m[1]] || []).push(f);
  }
}
const rows = Object.entries(wraps).filter(([n]) => decl[n]).map(([n, L]) => ({ n, first: decl[n], L, depth: L.length })).sort((a, b) => b.depth - a.depth || a.n.localeCompare(b.n));
const short = (f) => f.replace('src/', '').replace('.js', '');
let md = '# 코드 흐름 · 감싸기 지도 (자동 생성)\n\n';
md += '> `node arca/tools/check/wraps.cjs` 로 다시 만든다. 기능을 "감싸기"(원래 함수를 부른 뒤 덧붙임)로 쌓은 순서예요.\n';
md += '> 맨 왼쪽이 원래 함수가 있는 파일, 오른쪽으로 갈수록 바깥(나중에 불리는 순서로는 **가장 먼저** 실행). 한 곳을 고치면 오른쪽 겹들도 확인해요.\n\n';
md += '스크립트 ' + files.length + '개 · 감싸진 함수 ' + rows.length + '개 · 가장 깊은 것 ' + (rows[0] ? rows[0].n + ' ' + rows[0].depth + '겹' : '-') + '\n\n';
md += '| 함수 | 겹 | 원래 | 감싼 순서(안쪽 → 바깥) |\n|---|---|---|---|\n';
for (const r of rows) md += '| `' + r.n + '` | ' + r.depth + ' | ' + short(r.first) + ' | ' + r.L.map(short).join(' → ') + ' |\n';
md += '\n## 문제 한 개의 흐름 (askField 기준, 바깥 → 안쪽으로 실행)\n';
const af = rows.find((r) => r.n === 'askField');
if (af) md += af.L.slice().reverse().map((f, i) => (i + 1) + '. `' + f + '`').join('\n') + '\n' + (af.L.length + 1) + '. `' + af.first + '` (원래 문제 상자)\n';
md += '\n## 정리(리팩터링) 계획 — 아직 하지 않음\n';
md += '- 프롬프트 Q 는 "문제 흐름이 굳은 뒤"에 하기로 되어 있어요. 2026-11-15 에 J·L·M·N·P 로 흐름이 크게 바뀌었고 O(마을·길목·퀘스트)가 남아 있어, **O 와 시범 운영 뒤**에 하는 것이 안전해요.\n';
md += '- 할 때는: ① 이 표에서 5겹 이상인 함수부터 ② 감싸기를 "등록"(onQuestion·addDraw·addUpdate)으로 한 가지씩 옮기고 ③ 옮길 때마다 `tools/check` 의 검사 전부를 돌려요.\n';
fs.writeFileSync(path.join(root, 'docs/코드_흐름.md'), md);
console.log('files', files.length, 'wrapped', rows.length);
console.log(rows.slice(0, 12).map((r) => r.n + ':' + r.depth).join(' '));
