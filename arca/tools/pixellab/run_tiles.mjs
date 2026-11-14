// 지형 타일: node run_tiles.mjs [키...]
// 이어지는 지형(tileset, 16칸 모서리 규칙): assets/hd/tiles/<키>/<0~15>.png  (mask = NW<<3|NE<<2|SW<<1|SE, 켜진 비트 = 앞 지형)
// 따로 타일(16종): assets/hd/tiles/<키>/<0~15>.png
import fs from "node:fs";
import path from "node:path";
import { call, submit, field, sleep, download, loadState, saveState, pool } from "./pl.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const STF = path.join(ROOT, "tools/pixellab/state_tiles.json");
const st = loadState(STF);
const STYLE = ", cute top-down fantasy RPG";
const GRASS = {
  town: "lush bright green grass",
  coast: "light sunny green seaside grass",
  forest: "deep dark green forest grass with moss",
  dead: "dull gloomy gray-green withered grass",
  garden: "vivid green garden lawn",
  stone: "pale green mountain grass with tiny gravel",
  gold: "golden yellow autumn field grass",
  dream: "soft lavender purple dreamy grass",
  white: "faded pale whitish gray washed-out grass",
  snow: "white snow with light blue shadows",
};
const PATH = {
  town: "light brown dirt path",
  coast: "light sandy brown dirt path",
  forest: "dark brown forest dirt path",
  dead: "gray-brown muddy path",
  garden: "light brown dirt path",
  stone: "gray gravel path",
  gold: "tan dirt farm road",
  dream: "pale pink sparkly star-dust path",
  white: "pale beige faded dirt path",
  snow: "packed light gray-blue snow path",
};
const WATER = {
  town: "clear blue shallow stream water",
  coast: "clear blue shallow stream water",
  forest: "dark blue-green forest stream water",
  dead: "murky dark teal swamp water",
  garden: "clear blue shallow stream water",
  stone: "cold clear blue mountain stream water",
  gold: "clear blue river water",
  dream: "glowing violet dream water",
  white: "pale gray still water",
  snow: "icy pale blue water",
};
export const TILES = {};
for (const th in GRASS) {
  TILES[th + "-path"] = { ts: 1, d: GRASS[th] + " to " + PATH[th] + STYLE };
  TILES[th + "-water"] = { ts: 1, d: GRASS[th] + " to " + WATER[th] + STYLE };
}
for (const th of ["town", "coast"]) {
  TILES[th + "-sand"] = { ts: 1, d: GRASS[th] + " to warm yellow beach sand" + STYLE };
  TILES[th + "-sea"] = { ts: 1, d: "warm yellow beach sand to deep blue sea water with small waves" + STYLE };
}
TILES["solid"] = {
  ts: 0,
  d:
    "seamless repeating ground texture fill, no border, edges continue to the next tile" +
    STYLE +
    ": 1). beige cobblestone plaza 2). beige cobblestone plaza variant 3). wooden bridge planks running vertically 4). wooden bridge planks running horizontally 5). gray rocky cliff ground 6). warm wooden floor boards 7). warm wooden floor boards variant 8). cream plaster interior wall 9). gray stone floor tiles 10). gray cobblestone street 11). deep blue sea water 12). deep blue sea water variant 13). tall wild green grass tufts 14). tall golden wheat 15). red flower bed 16). snowy rocky ground",
};
const only = process.argv.slice(2);
const keys = Object.keys(TILES).filter((k) => !only.length || only.includes(k));
async function one(k) {
  const s = (st[k] = st[k] || {});
  const dir = path.join(ROOT, "assets/hd/tiles", k);
  if (s.done) return;
  if (!s.id) {
    const t = TILES[k];
    const args = { tile_type: "square_topdown", tile_view: "top-down", tile_size: 48, outline_mode: "segmentation", description: t.d };
    if (t.ts) Object.assign(args, { tile_feature: "tileset", boundary_amplitude: 0.1 });
    const o = await submit("create_tiles_pro", args);
    s.id = field(o, "id");
    if (!s.id) throw new Error("no id " + k + o.slice(0, 300));
    saveState(STF, st);
  }
  let o;
  for (let i = 0; i < 80; i++) {
    o = await call("get_tiles_pro", { tile_id: s.id });
    if (/status:\s*completed/.test(o)) break;
    if (/status:\s*failed/.test(o)) throw new Error("failed " + k);
    await sleep(12000);
  }
  fs.mkdirSync(dir, { recursive: true });
  const masks = {};
  for (const m of o.matchAll(/tile_(\d+):\s*mask=(\d+)/g)) masks[m[1]] = +m[2];
  for (const m of o.matchAll(/tile_(\d+):\s*(https:\S+\.png)/g)) {
    const i = +m[1];
    const name = k === "solid" ? i : masks[i] ?? i;
    await download(m[2], path.join(dir, name + ".png"));
  }
  s.done = 1;
  saveState(STF, st);
  console.log("done", k);
}
await pool(keys, 4, one);
console.log("all", keys.filter((k) => st[k] && st[k].done).length + "/" + keys.length);
