// 한 번 부르기: node cli.mjs <도구> '<json>' [--until 정규식] [--retry]
import { call, submit, sleep } from "./pl.mjs";
const [tool, json, ...rest] = process.argv.slice(2);
const args = JSON.parse(json || "{}");
const ui = rest.indexOf("--until");
const until = ui >= 0 ? new RegExp(rest[ui + 1]) : null;
const fn = rest.includes("--retry") ? submit : call;
for (let i = 0; i < 100; i++) {
  const o = await fn(tool, args);
  if (!until || until.test(o)) {
    console.log(o);
    process.exit(0);
  }
  await sleep(15000);
}
console.log("timeout");
