// 아바타(옷 한 벌 = 그림 한 벌): node run_av.mjs [키...]
// 기본 몸 av-m-base·av-f-base 를 create_character 로, 옷은 create_character_state(같은 얼굴·몸)로 만들고 걷기를 붙인다.
// 결과: assets/hd/chars/av-<m|f>-<옷 키>/ (4방향 + 걷기) — 옷 키는 ITEMS 의 o_ 뒤 이름(src/04b-items.js)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { call, submit, field, sleep, download, loadState, saveState, pool } from "./pl.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "assets/hd/chars");
const STF = path.join(ROOT, "tools/pixellab/state_av.json");
const st = loadState(STF);
const TMP = process.env.PL_TMP || "/tmp";
// 옷 목록은 게임 데이터에서 읽는다
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "src/04b-items.js"), "utf8") + "\nthis.ITEMS = ITEMS;", ctx);
const OUTFITS = Object.entries(ctx.ITEMS).filter(([, d]) => d.s === "o");
const BASE = {
  m: "cute chibi fantasy RPG kid, boy, short brown hair, simple plain cream short-sleeved shirt, brown shorts, brown shoes, empty hands, friendly face",
  f: "cute chibi fantasy RPG kid, girl, brown hair in a short ponytail, simple plain cream short-sleeved shirt, brown knee-length skirt, brown shoes, empty hands, friendly face",
};
const jobs = [];
for (const b of ["m", "f"]) {
  jobs.push({ key: "av-" + b + "-base", base: b });
  for (const [id, d] of OUTFITS) jobs.push({ key: "av-" + b + "-" + id.slice(2), from: "av-" + b + "-base", d: "wearing " + d.art + ", same face and hair, empty hands" });
}
const only = process.argv.slice(2);
const todo = jobs.filter((j) => !only.length || only.includes(j.key));
async function waitChar(id, test) {
  for (let i = 0; i < 100; i++) {
    const o = await call("get_character", { character_id: id });
    if (test(o)) return o;
    if (/status:\s*failed/.test(o)) throw new Error("failed " + id + " " + o.slice(0, 200));
    await sleep(12000);
  }
  throw new Error("timeout " + id);
}
const walkOk = (o) => {
  const got = new Set();
  for (const m of o.matchAll(/walking[^\n]*?dir \(([^)]*)\)/g)) m[1].split(/,\s*/).forEach((d) => got.add(d.trim()));
  return ["south", "east", "north"].every((d) => got.has(d)) && !/pending jobs|processing/i.test(o.split(/^animations/m)[1] || "");
};
async function one(j) {
  const s = (st[j.key] = st[j.key] || {});
  if (s.done) return;
  if (!s.id) {
    let o;
    if (j.base)
      o = await submit("create_character", { name: "arca " + j.key, mode: "standard", n_directions: 4, size: 48, view: "low top-down", proportions: JSON.stringify({ type: "preset", name: "chibi" }), description: BASE[j.base] });
    else {
      const src = st[j.from];
      if (!src || !src.done) throw new Error("base not ready " + j.from);
      o = await submit("create_character_state", { character_id: src.id, edit_description: j.d, state_name: j.key.slice(5) });
    }
    s.id = field(o, "id") || field(o, "character_id") || (o.match(/[0-9a-f]{8}-[0-9a-f-]{27}/) || [])[0];
    if (!s.id) throw new Error("no id " + j.key + " " + o.slice(0, 300));
    saveState(STF, st);
  }
  await waitChar(s.id, (o) => /status:\s*completed/.test(o));
  if (!s.anim) {
    const o = await submit("animate_character", { character_id: s.id, template_animation_id: "walking-4-frames", directions: ["south", "east", "north"] });
    if (/^error/m.test(o) && !/job_ids/.test(o)) throw new Error("anim " + o.slice(0, 300));
    s.anim = 1;
    saveState(STF, st);
  }
  await waitChar(s.id, walkOk);
  const z = path.join(TMP, "av_" + j.key + ".zip"),
    zd = path.join(TMP, "av_" + j.key),
    dir = path.join(OUT, j.key);
  if (!(await download("https://api.pixellab.ai/mcp/characters/" + s.id + "/download", z))) throw new Error("download " + j.key);
  fs.rmSync(zd, { recursive: true, force: true });
  execFileSync("unzip", ["-q", "-o", z, "-d", zd]);
  fs.mkdirSync(dir, { recursive: true });
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  // 상태(state)는 묶음 안에 여러 상태가 같이 들어 있을 수 있다: 이 상태의 폴더만 쓴다
  const files = walk(zd);
  const pick = files.filter((f) => f.includes("/" + (j.base ? "Idle" : j.key.slice(5)) + "/"));
  for (const f of pick.length ? pick : files) {
    let m;
    if ((m = f.match(/rotations\/(south|east|north|west)\.png$/))) fs.copyFileSync(f, path.join(dir, m[1] + ".png"));
    if ((m = f.match(/animations\/[^/]+\/(south|east|north)\/frame_0*(\d+)\.png$/))) fs.copyFileSync(f, path.join(dir, "walk_" + m[1] + "_" + m[2] + ".png"));
  }
  s.done = 1;
  saveState(STF, st);
  console.log("done", j.key);
}
// 기본 몸 먼저, 그다음 옷
await pool(todo.filter((j) => j.base), 2, one);
await pool(todo.filter((j) => !j.base), 4, one);
console.log("all", todo.filter((j) => st[j.key] && st[j.key].done).length + "/" + todo.length);
