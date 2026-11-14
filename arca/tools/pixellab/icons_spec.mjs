// 아이콘 64개(32점) 목록: 무기 28 · 장신구 22 · 옷 14
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "src/04b-items.js"), "utf8") + "\nthis.ITEMS = ITEMS;", ctx);
const MAT = ["plain wooden", "iron", "steel with blue grip", "silver", "silver with green gem", "golden", "glowing starlight gold"];
const KIND = { sword: "short sword", axe: "hand axe", hammer: "war hammer", spear: "spear", dagger: "dagger", staff: "magic staff", crystal: "magic crystal orb on a small stand", bow: "bow" };
const STORY = {
  c_badge: "paper badge with a hand-drawn star",
  c_flute: "small seashell flute",
  c_pouch: "green herb pouch",
  c_watch: "old stopped pocket watch",
  c_tang: "orange tangerine",
  c_ribbon: "pink royal ribbon",
  c_scarf: "warm red knitted scarf",
  c_mark: "library bookmark with a tassel",
  c_brooch: "starlight brooch",
  c_bell: "small golden cat bell",
  c_feather: "brown owl feather",
  c_lens: "small lighthouse glass lens",
};
const ACC = {
  c_ring1: "copper ring",
  c_neck1: "wooden bead necklace",
  c_charm: "lucky four-leaf clover charm",
  c_note: "small study notebook",
  c_ring2: "silver ring",
  c_neck2: "seashell necklace",
  c_star: "star fragment brooch",
  c_ring3: "gold ring with a star gem",
  c_neck3: "glowing starlight pendant necklace",
  c_crown: "small golden crown",
};
export const ICONS = [];
for (const [id, d] of Object.entries(ctx.ITEMS)) {
  if (d.s === "w") ICONS.push([id, MAT[+id.split("_")[2]] + " " + KIND[d.kind] + " icon, diagonal"]);
}
for (const [id, t] of Object.entries(ACC)) ICONS.push([id, t + " icon"]);
for (const [id, t] of Object.entries(STORY)) ICONS.push([id, t + " icon"]);
for (const [id, d] of Object.entries(ctx.ITEMS)) if (d.s === "o") ICONS.push([id, "folded clothing icon: " + d.art]);
