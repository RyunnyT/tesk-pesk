// PixelLab 연결 도우미 (Node 18+). 키는 저장소 밖 파일(PIXELLAB_KEY_FILE)이나 환경변수 PIXELLAB_KEY 에서 읽는다.
import fs from "node:fs";
const KEY = process.env.PIXELLAB_KEY || fs.readFileSync(process.env.PIXELLAB_KEY_FILE, "utf8").trim();
let rid = 1;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function call(name, args) {
  for (let tries = 0; ; tries++) {
    try {
      const res = await fetch("https://api.pixellab.ai/mcp", {
        method: "POST",
        headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: rid++, method: "tools/call", params: { name, arguments: args } }),
      });
      const t = await res.text();
      let out = "";
      for (const line of t.split("\n")) {
        const l = line.startsWith("data: ") ? line.slice(6) : line;
        if (!l.startsWith("{")) continue;
        const d = JSON.parse(l);
        if (d.error) out += "error: " + JSON.stringify(d.error);
        for (const c of (d.result && d.result.content) || []) if (c.type === "text") out += c.text + "\n";
      }
      return out;
    } catch (e) {
      if (tries > 4) throw e;
      await sleep(3000 * (tries + 1));
    }
  }
}
// 바쁠 때(동시 작업 한도) 기다렸다 다시
export async function submit(name, args) {
  for (let i = 0; i < 60; i++) {
    const o = await call(name, args);
    if (/rate limit|concurren|parallel generations|max concurrent|slots but only|active\)/i.test(o)) {
      await sleep(15000);
      continue;
    }
    return o;
  }
  throw new Error("busy too long: " + name);
}
export const field = (o, k) => {
  const m = o.match(new RegExp("^" + k + ":\\s*(.+)$", "m"));
  return m ? m[1].trim() : null;
};
export async function download(url, file) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        return true;
      }
    } catch (e) {}
    await sleep(3000);
  }
  return false;
}
export function loadState(f) {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    return {};
  }
}
export const saveState = (f, s) => fs.writeFileSync(f, JSON.stringify(s, null, 1));
// 동시에 n개씩
export async function pool(items, n, fn) {
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const it = items[i++];
      try {
        await fn(it);
      } catch (e) {
        console.log("FAIL", it.id || it, e.message);
      }
    }
  };
  await Promise.all(Array.from({ length: n }, run));
}
