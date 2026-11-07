#!/usr/bin/env node
/**
 * Post-deploy smoke check. Turns "deploy monitoring" from a chore into a gate.
 *
 *   node scripts/smoke.mjs https://my-deployment.vercel.app
 *
 * For a Vercel deployment behind protection, set
 * VERCEL_AUTOMATION_BYPASS_SECRET and it is sent as x-vercel-protection-bypass
 * — the same mechanism Playwright uses, so there is one way to reach a
 * protected preview instead of a separate `vercel curl` workaround.
 *
 * Exits non-zero on the first failure and prints what to do next. It never
 * rolls back: a wrong automatic rollback during a schema transition is worse
 * than a bad deploy.
 */
const base = process.argv[2]?.replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/smoke.mjs <deployment-url>');
  process.exit(2);
}

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
const C = process.stdout.isTTY
  ? { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' }
  : { r: '', g: '', y: '', d: '', x: '' };

const results = [];
const SKIP = Symbol('skip');
async function check(name, fn) {
  try {
    const detail = await fn(SKIP);
    if (detail && typeof detail === 'object' && detail.skip) {
      results.push({ name, skipped: true, detail: detail.skip });
    } else {
      results.push({ name, ok: true, detail });
    }
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
}

const get = async (path, opts = {}) => {
  const res = await fetch(base + path, {
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    ...opts,
  });
  return res;
};

await check('GET / returns 2xx', async () => {
  const res = await get('/');
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `${res.status} — deployment protection. Set VERCEL_AUTOMATION_BYPASS_SECRET and retry.`,
    );
  }
  if (!res.ok) throw new Error(`status ${res.status}`);
  return `${res.status}`;
});

await check('/ renders the app shell (SSR did not fail)', async () => {
  const res = await get('/');
  const html = await res.text();
  // A 500 from a missing env var usually still returns HTML, so check content.
  if (/Missing [A-Z_]+ in /.test(html)) {
    const m = html.match(/Missing ([A-Z_]+) in ([^<\n]*)/);
    throw new Error(`env guard tripped: ${m?.[0]} — run: node scripts/check-env.mjs --remote`);
  }
  if (!/<html[^>]*lang="he"/.test(html)) throw new Error('no <html lang="he"> — not the app shell');
  if (!/dir="rtl"/.test(html)) throw new Error('no dir="rtl" — RTL shell missing');
  return `${html.length} bytes, lang=he dir=rtl`;
});

await check('GET /login returns 2xx', async () => {
  const res = await get('/login');
  if (!res.ok) throw new Error(`status ${res.status}`);
  return `${res.status}`;
});

await check('asset chunks are reachable and cacheable', async () => {
  // Look on /login, not /: the landing page at / is static HTML with no hashed
  // module scripts, so checking it there always skipped and proved nothing.
  const html = await (await get('/login')).text();
  const asset = html.match(/\/_build\/assets\/[A-Za-z0-9._-]+\.js|\/assets\/[A-Za-z0-9._-]+\.js/)?.[0];
  if (!asset) return { skip: 'no hashed asset reference in the HTML to follow' };
  const res = await get(asset);
  if (!res.ok) throw new Error(`${asset} → ${res.status}`);
  return `${asset} → ${res.status} (cache-control: ${res.headers.get('cache-control') ?? 'none'})`;
});

await check('a missing chunk is NOT cached as an immutable 404', async () => {
  // This is what nitro-modules/vercelAssetCache.ts exists to guarantee. If a
  // missing chunk gets a cached immutable 404, returning visitors stay broken
  // until the cache expires.
  const res = await get('/assets/this-chunk-does-not-exist-smoke-test.js');
  const cc = res.headers.get('cache-control') ?? '';
  if (res.status === 200) throw new Error('a nonexistent chunk returned 200');
  if (/immutable/.test(cc) || /max-age=[1-9]/.test(cc)) {
    throw new Error(`404 is cached (cache-control: ${cc}) — the vercelAssetCache rule is not live`);
  }
  return `${res.status}, cache-control: ${cc || 'none'}`;
});

console.log(`\nsmoke: ${base}\n`);
for (const r of results) {
  const tag = r.skipped ? `${C.y}SKIP${C.x}` : r.ok ? `${C.g}PASS${C.x}` : `${C.r}FAIL${C.x}`;
  console.log(`  ${tag}  ${r.name}\n        ${C.d}${r.detail}${C.x}`);
}
const failed = results.filter((r) => !r.ok && !r.skipped);
const skipped = results.filter((r) => r.skipped);
if (failed.length) {
  console.error(`\n${C.r}${failed.length} smoke check(s) failed.${C.x}`);
  console.error(`Not rolling back automatically. To roll back:  vercel rollback\n`);
  process.exit(1);
}
console.log(
  `\n${C.g}${results.length - skipped.length} smoke check(s) passed${C.x}` +
    (skipped.length ? `, ${C.y}${skipped.length} skipped${C.x} — not a full pass.` : '.') +
    '\n',
);
