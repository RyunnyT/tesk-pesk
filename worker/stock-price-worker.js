// ─────────────────────────────────────────────────────────────
// 주식 시세 Worker (Cloudflare Workers)
//
// 브라우저는 CORS 때문에 네이버/야후를 직접 못 불러 공용 프록시(corsproxy.io 등)에
// 의존했고, 그게 느리고 불안정했습니다. 이 Worker 는 서버에서 직접·병렬로 가져와
// 한 번의 요청으로 모든 종목 시세를 돌려줍니다.
//
// 요청:  POST /  { "codes": ["005930","000660", ...] }
//        또는 GET /?codes=005930,000660
// 응답:  { "prices": { "005930": 78600, "000660": 152300, ... },
//          "failed": ["..."], "tookMs": 1234 }
//   * 가격은 "실제 원화" 종가/현재가. 학급화폐 환산(/10)은 클라이언트가 수행.
//
// 배포:  cd worker && npx wrangler deploy
//   배포 후 출력되는 https://stock-price-worker.<계정>.workers.dev 주소를
//   shared/firebase-config.js 의 STOCK_PRICE_WORKER_URL 에 넣으세요.
// ─────────────────────────────────────────────────────────────

const MAX_CODES = 120;          // 한 요청당 최대 종목 수
const CONCURRENCY = 24;         // 동시 fetch 수 (subrequest 한도 고려)
const PER_FETCH_TIMEOUT = 4000; // 개별 fetch 타임아웃(ms)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function toNum(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, cf: { cacheTtl: 30, cacheEverything: true } });
  } finally {
    clearTimeout(t);
  }
}

// 한 종목 시세: 네이버 → Yahoo(.KS/.KQ) 순. 서버라서 프록시 불필요.
async function fetchPrice(code) {
  // ① 네이버 모바일 basic
  try {
    const res = await fetchWithTimeout(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: { 'User-Agent': UA, 'Referer': 'https://m.stock.naver.com/' }
    });
    if (res.ok) {
      const d = await res.json();
      const p = toNum(d.closePrice) || toNum(d.currentPrice) || toNum(d.stockEndPrice);
      if (p > 0) return p;
    }
  } catch (_e) {}

  // ② 네이버 폴링
  try {
    const res = await fetchWithTimeout(`https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`, {
      headers: { 'User-Agent': UA, 'Referer': 'https://finance.naver.com/' }
    });
    if (res.ok) {
      const d = await res.json();
      const item = d?.datas?.[0] || d?.result?.areas?.[0]?.datas?.[0] || {};
      const p = toNum(item.closePrice) || toNum(item.nowVal) || toNum(item.nv);
      if (p > 0) return p;
    }
  } catch (_e) {}

  // ③ Yahoo Finance (.KS 코스피 / .KQ 코스닥)
  for (const suffix of ['.KS', '.KQ']) {
    try {
      const res = await fetchWithTimeout(
        `https://query1.finance.yahoo.com/v8/finance/chart/${code}${suffix}?interval=1d&range=1d`,
        { headers: { 'User-Agent': UA } }
      );
      if (!res.ok) continue;
      const d = await res.json();
      const meta = d?.chart?.result?.[0]?.meta;
      const p = toNum(meta?.regularMarketPrice) || toNum(meta?.previousClose) || toNum(meta?.chartPreviousClose);
      if (p > 0) return p;
    } catch (_e) {}
  }
  return 0;
}

// 동시성 제한 병렬 처리
async function fetchAll(codes) {
  const prices = {};
  const failed = [];
  let i = 0;
  async function worker() {
    while (i < codes.length) {
      const code = codes[i++];
      const p = await fetchPrice(code);
      if (p > 0) prices[code] = Math.round(p);
      else failed.push(code);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, codes.length) }, worker));
  return { prices, failed };
}

async function parseCodes(request) {
  const url = new URL(request.url);
  let raw = [];
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    raw = Array.isArray(body.codes) ? body.codes : [];
  } else {
    raw = (url.searchParams.get('codes') || '').split(',');
  }
  return [...new Set(raw.map((c) => String(c).trim()).filter(Boolean))].slice(0, MAX_CODES);
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const t0 = Date.now();
    const codes = await parseCodes(request);
    if (codes.length === 0) {
      return new Response(JSON.stringify({ error: 'no codes' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
    const { prices, failed } = await fetchAll(codes);
    return new Response(JSON.stringify({ prices, failed, tookMs: Date.now() - t0 }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
};
