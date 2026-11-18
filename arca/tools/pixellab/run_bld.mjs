// 건물·랜드마크: node run_bld.mjs [키...]  → assets/hd/bld/<키>.png
// mo: create_map_object(투명 배경은 넓이 40,000 이하), ip: create_image_pro(no_background, 큰 그림)
import fs from "node:fs";
import path from "node:path";
import { call, submit, field, sleep, download, loadState, saveState, pool } from "./pl.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const STF = path.join(ROOT, "tools/pixellab/state_bld.json");
const st = loadState(STF);
const ST = ", seen from the front at a slight top-down angle, single color dark outline, medium shading, cute kids fantasy RPG pixel art";
const house = (roof, extra) =>
  "cute fantasy village cottage, " + roof + " tiled roof covering the top half, cream plaster walls, wooden door in the center bottom, two small windows" + (extra || "") + ST;
export const BLD = {
  "house-red": { t: "mo", w: 208, h: 192, d: house("red", ", chimney") },
  "house-blue": { t: "mo", w: 208, h: 192, d: house("blue", ", flower boxes") },
  "house-brown": { t: "mo", w: 208, h: 192, d: house("brown wooden shingle", ", wooden beams") },
  "house-purple": { t: "mo", w: 208, h: 192, d: house("indigo purple", ", round window") },
  "house-teal": { t: "mo", w: 208, h: 192, d: house("teal green", ", awning") },
  "house-lavender": { t: "mo", w: 208, h: 192, d: house("soft lavender", ", lantern") },
  "house-green": { t: "mo", w: 208, h: 192, d: house("leafy green", ", ivy on walls") },
  "house-orange": { t: "mo", w: 208, h: 192, d: house("orange", ", barrels by the door") },
  "house-gray": { t: "mo", w: 208, h: 192, d: house("dark gray slate", ", stone base, metal pipes") },
  "house-gold": { t: "mo", w: 208, h: 192, d: house("golden yellow", ", hanging sign") },
  "house-pale": { t: "mo", w: 208, h: 192, d: house("faded pale gray-lavender", ", washed-out faded colors") },
  "house-navy-small": { t: "mo", w: 144, h: 144, d: house("navy blue", ", small hut") },
  "house-big": { t: "mo", w: 208, h: 192, d: "large two-story inn building, indigo purple roof, cream walls, big wooden door in the center bottom, many windows, signboard" + ST },
  lighthouse: { t: "mo", w: 136, h: 288, d: "tall lighthouse tower with red and white stripes, dark lantern room on top with a glowing yellow light, small door at the bottom center" + ST },
  oak: { t: "ip", w: 288, h: 288, d: "giant ancient oak tree with a huge round canopy and thick trunk with a small door in the trunk at the bottom center" + ST },
  clock: { t: "ip", w: 192, h: 384, d: "tall stone clock tower with a big round clock face near the top, gears, dark gray roof, door at the bottom center" + ST },
  academy: { t: "ip", w: 768, h: 336, d: "grand magic academy building, long wide facade, blue slate roofs with towers on both ends, cream stone walls, many arched windows, big double door at the bottom center" + ST },
  palace: { t: "ip", w: 792, h: 336, d: "huge royal palace filling the whole canvas from the left edge to the right edge, very wide white and gold facade with long side wings, red roofs with spires, banners, grand golden double door at the bottom center, stairs" + ST },
  mill: { t: "ip", w: 288, h: 384, d: "tall wooden windmill with four big sails, brown wood, door at the bottom center, golden wheat around" + ST },
  spire: { t: "ip", w: 288, h: 400, d: "tall icy tower of oblivion, pale blue-white stone spire with frost, glowing window at the top, door at the bottom center" + ST },
  compass: { t: "ip", w: 384, h: 384, d: "large round stone star compass plaza monument, a big golden compass rose star on a stone pedestal with glowing star shards, steps" + ST },
};
const only = process.argv.slice(2);
const keys = Object.keys(BLD).filter((k) => !only.length || only.includes(k));
const DIR = path.join(ROOT, "assets/hd/bld");
fs.mkdirSync(DIR, { recursive: true });
async function one(k) {
  const s = (st[k] = st[k] || {}),
    b = BLD[k];
  if (s.done) return;
  if (!s.id) {
    const o =
      b.t === "mo"
        ? await submit("create_map_object", { description: b.d, width: b.w, height: b.h, view: "low top-down", shading: "medium shading", detail: "medium detail" })
        : await submit("create_image_pro", { description: b.d, width: b.w, height: b.h, no_background: true });
    s.id = field(o, "id") || field(o, "job_id");
    if (!s.id) throw new Error("no id " + k + " " + o.slice(0, 300));
    saveState(STF, st);
  }
  let o;
  for (let i = 0; i < 100; i++) {
    o = b.t === "mo" ? await call("get_map_object", { object_id: s.id }) : await call("get_image", { job_id: s.id });
    if (/status:\s*completed|completed/i.test(o) && !/processing|pending/i.test(o)) break;
    if (/failed/i.test(o)) throw new Error("failed " + k + o.slice(0, 200));
    await sleep(12000);
  }
  const url = b.t === "mo" ? "https://api.pixellab.ai/mcp/map-objects/" + s.id + "/download" : field(o, "download") || (o.match(/https:\/\/\S+?\.png/) || [])[0];
  if (!url) throw new Error("no url " + k + "\n" + o.slice(0, 600));
  if (!(await download(url, path.join(DIR, k + ".png")))) throw new Error("dl " + k);
  s.done = 1;
  saveState(STF, st);
  console.log("done", k);
}
await pool(keys, 4, one);
console.log("all", keys.filter((k) => st[k] && st[k].done).length + "/" + keys.length);
