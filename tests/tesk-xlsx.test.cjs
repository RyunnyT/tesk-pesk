const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const JSZip = require('../shared/tesk-jszip.min.js');
const X = require('../shared/tesk-xlsx.js');

test('시트 이름: 금지 문자 제거, 31자, 중복 구분', ()=>{
  const names = X.sheetNames(['3번 홍길동', '3번 홍길동', 'a/b:c*?[d]', '', 'x'.repeat(40)]);
  assert.deepStrictEqual(names.slice(0, 2), ['3번 홍길동', '3번 홍길동 (2)']);
  assert.ok(!/[\[\]:*?\/\\]/.test(names[2]));
  assert.strictEqual(names[3], '시트4');
  assert.strictEqual(names[4].length, 31);
});

test('열 이름', ()=>{
  assert.deepStrictEqual([0, 25, 26, 27, 701, 702].map(X.col), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
});

test('여러 시트 xlsx — 줄바꿈·특수문자·제어문자를 그대로 담고 Excel 형식으로 열린다', async()=>{
  const zip = X.fill(new JSZip(), [
    {name:'전체', headers:['번호', '글'], rows:[[1, '첫 줄\n둘째 <줄> & "따옴표"\u0001'], [2, '=1+1']]},
    {name:'1번 김가나', headers:['제목'], rows:[['봄']]}
  ]);
  const buf = await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE'});
  const back = await JSZip.loadAsync(buf);
  const sheet1 = await back.file('xl/worksheets/sheet1.xml').async('string');
  assert.ok(sheet1.includes('첫 줄\n둘째 &lt;줄&gt; &amp; &quot;따옴표&quot;</t>'));
  assert.ok(!sheet1.includes('\u0001'));
  assert.ok(sheet1.includes('<t xml:space="preserve">=1+1</t>'), '수식이 아니라 글자로 저장');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-')), 't.xlsx');
  fs.writeFileSync(file, buf);
  let py;
  try{ execFileSync('python', ['-c', 'import openpyxl']); py = true; }catch{ py = false; }
  if(!py) return;
  const out = execFileSync('python', ['-c',
    'import sys,json,openpyxl;wb=openpyxl.load_workbook(sys.argv[1]);print(json.dumps([[ws.title,[[c.value for c in r] for r in ws.iter_rows()]] for ws in wb],ensure_ascii=False))',
    file], {encoding:'utf8', env:{...process.env, PYTHONIOENCODING:'utf-8'}});
  const wb = JSON.parse(out);
  assert.deepStrictEqual(wb.map(w=>w[0]), ['전체', '1번 김가나']);
  assert.strictEqual(wb[0][1][1][1], '첫 줄\n둘째 <줄> & "따옴표"');
  assert.strictEqual(wb[0][1][2][1], '=1+1');
  assert.strictEqual(wb[1][1][1][0], '봄');
});
