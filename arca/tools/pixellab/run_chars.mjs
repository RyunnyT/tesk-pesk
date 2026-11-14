// 인물 그리기: node run_chars.mjs [키...]  (PIXELLAB_KEY_FILE 필요)
// 결과: assets/hd/chars/<키>/{south,east,north,west}.png, walk_<방향>_<0~3>.png
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { call, submit, field, sleep, download, loadState, saveState, pool } from "./pl.mjs";
import { CHARS } from "./specs_chars.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "assets/hd/chars");
const STF = path.join(ROOT, "tools/pixellab/state_chars.json");
const st = loadState(STF);
const only = process.argv.slice(2);
const keys = Object.keys(CHARS).filter((k) => !only.length || only.includes(k));
const TMP = process.env.PL_TMP || "/tmp";

async function waitChar(id, test) {
  for (let i = 0; i < 80; i++) {
    const o = await call("get_character", { character_id: id });
    if (test(o)) return o;
    if (/status:\s*failed/.test(o)) throw new Error("failed " + id + " " + o.slice(0, 200));
    await sleep(12000);
  }
  throw new Error("timeout " + id);
}
async function one(k) {
  const s = (st[k] = st[k] || {});
  const dir = path.join(OUT, k);
  if (s.done && fs.existsSync(path.join(dir, "walk_north_3.png"))) return;
  if (!s.id) {
    const o = await submit("create_character", {
      name: "arca " + k,
      mode: "standard",
      n_directions: 4,
      size: 48,
      view: "low top-down",
      proportions: JSON.stringify({ type: "preset", name: "chibi" }),
      description: CHARS[k],
    });
    s.id = field(o, "id");
    if (!s.id) throw new Error("no id: " + o.slice(0, 300));
    saveState(STF, st);
  }
  await waitChar(s.id, (o) => /status:\s*completed/.test(o));
  if (!s.anim) {
    const o = await submit("animate_character", { character_id: s.id, template_animation_id: "walking-4-frames", directions: ["south", "east", "north"] });
    if (/error/i.test(o) && !/job_ids/.test(o)) throw new Error("anim: " + o.slice(0, 300));
    s.anim = 1;
    saveState(STF, st);
  }
  await waitChar(s.id, (o) => /walk[^\n]*3 dir/.test(o) && !/processing|pending/i.test(o.split("animations")[1] || ""));
  // 받기
  const z = path.join(TMP, "pl_" + k + ".zip"),
    zd = path.join(TMP, "pl_" + k);
  if (!(await download("https://api.pixellab.ai/mcp/characters/" + s.id + "/download", z))) throw new Error("download " + k);
  fs.rmSync(zd, { recursive: true, force: true });
  execFileSync("unzip", ["-q", "-o", z, "-d", zd]);
  fs.mkdirSync(dir, { recursive: true });
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(zd)) {
    let m;
    if ((m = f.match(/rotations\/(south|east|north|west)\.png$/))) fs.copyFileSync(f, path.join(dir, m[1] + ".png"));
    if ((m = f.match(/animations\/[^/]+\/(south|east|north)\/frame_0*(\d+)\.png$/))) fs.copyFileSync(f, path.join(dir, "walk_" + m[1] + "_" + m[2] + ".png"));
  }
  s.done = 1;
  saveState(STF, st);
  console.log("done", k);
}
await pool(keys, 4, one);
console.log("all", keys.filter((k) => st[k] && st[k].done).length + "/" + keys.length);
