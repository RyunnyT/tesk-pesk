// ─────────────────────────────────────────────────────────────
// 오류 모으기 Worker (Cloudflare Workers 무료 + KV)
//
// 교사·학생 화면이 보낸 오류(학생 정보 없음)를 날짜별로 개수만 쌓는다. 같은 오류는 count 만 오른다.
//   POST /log   {app, ver, where, name, code, msg, ua, at}
//   GET  /log?day=2026-11-17     헤더 x-admin-key 가 ADMIN_KEY 와 같을 때만 (master.html 에서 본다)
//
// 아직 배포하지 않았다. 켜는 순서:
//   1) npx wrangler kv namespace create TESK_LOG   → 나온 id 를 worker/log-wrangler.toml 의 kv_namespaces 에 넣는다
//   2) npx wrangler secret put ADMIN_KEY --config worker/log-wrangler.toml   (운영자만 아는 긴 문자열)
//   3) npx wrangler deploy --config worker/log-wrangler.toml
//   4) 나온 주소 + '/log' 를 shared/firebase-config.js 의 ERROR_WORKER_URL 에 넣는다
// 무료 한도: KV 쓰기 하루 1,000회 → 같은 오류는 한 키에 모으고, 앱은 세션당 10건까지만 보낸다.
// ─────────────────────────────────────────────────────────────
const ALLOW = ['https://tesk-pesk.pages.dev'];   // 허용할 사이트 주소 (사용자 지정 도메인이 있으면 더한다)
const cors = origin => ({
  'Access-Control-Allow-Origin': ALLOW.some(a => origin === a || origin.endsWith('.tesk-pesk.pages.dev')) ? origin : ALLOW[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Vary': 'Origin'
});
const json = (body, status, origin) => new Response(JSON.stringify(body), {status, headers: {...cors(origin), 'Content-Type': 'application/json'}});
const s = (v, n) => String(v == null ? '' : v).slice(0, n);
async function hash(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
export default {
  async fetch(request, env){
    const url = new URL(request.url), origin = request.headers.get('Origin') || '';
    if(request.method === 'OPTIONS') return new Response(null, {headers: cors(origin)});
    if(url.pathname !== '/log') return json({error: 'not found'}, 404, origin);
    if(request.method === 'POST'){
      if(origin && !ALLOW.some(a => origin === a || origin.endsWith('.tesk-pesk.pages.dev'))) return json({error: 'origin'}, 403, origin);
      const b = await request.json().catch(() => null);
      if(!b) return json({error: 'body'}, 400, origin);
      const p = {app: s(b.app, 10), ver: s(b.ver, 30), where: s(b.where, 60), name: s(b.name, 40), code: s(b.code, 60), msg: s(b.msg, 200), ua: s(b.ua, 80)};
      const day = new Date().toISOString().slice(0, 10);
      const key = day + ':' + await hash(p.app + p.ver + p.where + p.name + p.code + p.msg);
      const prev = await env.TESK_LOG.get(key, 'json');
      const next = prev ? {...prev, count: prev.count + 1, last: new Date().toISOString()} : {...p, count: 1, first: new Date().toISOString(), last: new Date().toISOString()};
      await env.TESK_LOG.put(key, JSON.stringify(next), {expirationTtl: 60 * 60 * 24 * 30});
      return json({ok: true}, 200, origin);
    }
    if(request.method === 'GET'){
      if(!env.ADMIN_KEY || request.headers.get('x-admin-key') !== env.ADMIN_KEY) return json({error: 'forbidden'}, 403, origin);
      const day = s(url.searchParams.get('day') || new Date().toISOString().slice(0, 10), 10);
      const list = await env.TESK_LOG.list({prefix: day + ':'});
      const rows = (await Promise.all(list.keys.map(k => env.TESK_LOG.get(k.name, 'json')))).filter(Boolean).sort((a, b) => b.count - a.count);
      return json({day, rows}, 200, origin);
    }
    return json({error: 'method'}, 405, origin);
  }
};
