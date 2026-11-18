/* 지문 은행(tools/literacy-bank/*.cjs) → arca/data/passages.js
   Pesk '오늘의 지문'과 같은 지문을 게임에서도 쓰려고, 필요한 칸(제목·문단·용어·4번 문제)만 뽑아
   전역 변수 ARCA_BANK 로 내보낸다. file:// 로 열어도 읽히도록 JSON 이 아니라 JS 파일로 만든다.
   실행: node arca/tools/build_passages.cjs */
const fs = require("fs"),
  path = require("path");
const SRC = path.join(__dirname, "..", "..", "tools", "literacy-bank");
const OUT = path.join(__dirname, "..", "data", "passages.js");
const SUBJECTS = ["사회", "역사", "환경", "생활", "과학"];
const LEVELS = ["34", "56", "심화"];
const bank = {};
let total = 0;
for (const lv of LEVELS) {
  bank[lv] = [];
  for (const s of SUBJECTS) {
    const f = path.join(SRC, s + "-" + lv + ".cjs");
    if (!fs.existsSync(f)) continue;
    for (const x of require(f)) {
      bank[lv].push({ id: x.id, s, t: x.t, p: x.p, g: x.g, q: x.q.slice(0, 3) });
      total++;
    }
  }
}
const body =
  "/* 자동 생성 파일 — 고치지 말고 tools/literacy-bank/*.cjs 를 고친 뒤 node arca/tools/build_passages.cjs 를 다시 실행하세요. */\n" +
  "window.ARCA_BANK = " +
  JSON.stringify(bank) +
  ";\n";
fs.writeFileSync(OUT, body);
console.log(
  "지문 " + total + "편 → data/passages.js (" + Math.round(body.length / 1024) + "KB) · " +
    LEVELS.map((l) => l + ":" + bank[l].length).join(" "),
);
