// 1방향 물건(몬스터·펫·소품): 움직임을 만들고 그림을 받는다.
// state_objs.json: { 키: { id, anim(움직임 설명, 없으면 정지 그림만), kind(폴더), frames } }
// 결과: assets/hd/<kind>/<키>.png (기본), <키>_<0~n>.png (움직임)
import fs from "node:fs";
import path from "node:path";
import { call, submit, sleep, download, loadState, saveState, pool } from "./pl.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const STF = path.join(ROOT, "tools/pixellab/state_objs.json");
const st = loadState(STF);
const only = process.argv.slice(2);
const keys = Object.keys(st).filter((k) => !only.length || only.includes(k));

async function getObj(id) {
  return call("get_object", { object_id: id });
}
async function one(k) {
  const s = st[k];
  const dir = path.join(ROOT, "assets/hd", s.kind);
  fs.mkdirSync(dir, { recursive: true });
  if (s.done) return;
  if (s.anim && !s.animQ) {
    const o = await submit("animate_object", { object_id: s.id, mode: "v3", animation_description: s.anim, frame_count: s.frames || 4, keep_first_frame: false });
    if (/^error/m.test(o)) throw new Error("anim " + k + ": " + o.slice(0, 300));
    s.animQ = 1;
    saveState(STF, st);
  }
  let o;
  for (let i = 0; i < 80; i++) {
    o = await getObj(s.id);
    const busy = /processing|pending|queued/i.test(o);
    const hasAnim = !s.anim || /animations?[^\n]*\n[\s\S]*\{i\}/.test(o.split(/rotations?:/i).slice(-1)[0] + o);
    if (!busy && hasAnim) break;
    await sleep(12000);
  }
  // 주소 찾기
  const urls = [...o.matchAll(/https:\/\/backblaze\.pixellab\.ai\/\S+?\.png\S*/g)].map((m) => m[0].replace(/[),]+$/, ""));
  const rot = urls.find((u) => /rotations\//.test(u) && !/\{i\}/.test(u)) || urls.find((u) => /rotations\//.test(u));
  if (rot) await download(rot.replace("{i}", "0"), path.join(dir, k + ".png"));
  const an = urls.find((u) => /animations\//.test(u));
  if (s.anim) {
    if (!an) throw new Error("no anim url " + k + "\n" + o.slice(0, 800));
    const n = +((o.match(/\(i=0\.\.(\d+)\)/) || [])[1] ?? (s.frames || 4) - 1);
    for (let i = 0; i <= n; i++) await download(an.replace("{i}", i), path.join(dir, k + "_" + i + ".png"));
    s.nf = n + 1;
  }
  s.done = 1;
  saveState(STF, st);
  console.log("done", k, s.nf || 0);
}
await pool(keys, 6, one);
console.log("all", keys.filter((k) => st[k].done).length + "/" + keys.length);
