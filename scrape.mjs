// Scraper de perfiles públicos de Instagram para el Panorama de cine porteño.
// Lee accounts.json (config editorial), scrapea seguidores/posts/sigue de cada
// perfil SIN login (solo metadata pública), y escribe data.json + history.json.
//
// Uso local:  npm install && npx playwright install chromium && node scrape.mjs
// En CI:      lo corre .github/workflows/scrape.yml 1x/día.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('accounts.json', 'utf8')).accounts;
const today = new Date().toISOString().slice(0, 10);

// "24.8K" -> 24800 | "25K" -> 25000 | "1,214" -> 1214 | "1.7M" -> 1700000
function toInt(s) {
  if (s == null) return null;
  s = String(s).trim().replace(/,/g, '');
  const m = s.match(/^([\d.]+)\s*([KM]?)$/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (/k/i.test(m[2])) n *= 1e3;
  if (/m/i.test(m[2])) n *= 1e6;
  return Math.round(n);
}

async function scrapeOne(page, handle) {
  await page.goto(`https://www.instagram.com/${handle}/`, {
    waitUntil: 'domcontentloaded', timeout: 25000,
  });
  await page.waitForTimeout(1200);

  const { og, title, html } = await page.evaluate(() => ({
    og: document.querySelector('meta[property="og:description"]')?.content || '',
    title: document.querySelector('meta[property="og:title"]')?.content || document.title || '',
    html: document.documentElement.innerHTML,
  }));

  if (!og || /Profile isn't available/i.test(title)) {
    return { handle, ok: false };
  }

  // Números redondeados desde el meta tag (robusto, siempre presente).
  const m = og.match(/([\d.,KM]+)\s+Followers,\s+([\d.,KM]+)\s+Following,\s+([\d.,KM]+)\s+Posts/i);
  let followers = m ? toInt(m[1]) : null;
  let following = m ? toInt(m[2]) : null;
  let posts = m ? toInt(m[3]) : null;

  // Si el HTML embebe el JSON exacto, lo preferimos (mejor para series temporales).
  const exF = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
  const exG = html.match(/"edge_follow":\{"count":(\d+)\}/);
  const exP = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/);
  if (exF) followers = +exF[1];
  if (exG) following = +exG[1];
  if (exP) posts = +exP[1];

  return { handle, ok: followers != null, followers, following, posts };
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  locale: 'en-US',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
});
const page = await ctx.newPage();

const scraped = {};
for (const a of cfg) {
  try {
    const r = await scrapeOne(page, a.handle);
    scraped[a.handle] = r;
    console.log(r.ok ? `✓ ${a.handle}: ${r.followers} seg · ${r.posts} posts` : `✗ ${a.handle}: sin datos`);
  } catch (e) {
    scraped[a.handle] = { handle: a.handle, ok: false };
    console.log(`✗ ${a.handle}: ${String(e).slice(0, 80)}`);
  }
}
await browser.close();

// --- data.json: config editorial + números scrapeados (preserva los previos si falla) ---
let prev = {};
if (existsSync('data.json')) {
  try {
    for (const a of JSON.parse(readFileSync('data.json', 'utf8')).accounts) prev[a.handle] = a;
  } catch {}
}

const accounts = cfg.map(a => {
  const s = scraped[a.handle];
  const p = prev[a.handle] || {};
  return {
    ...a,
    followers: s?.ok ? s.followers : (p.followers ?? null),
    posts:     s?.ok ? s.posts     : (p.posts ?? null),
    following: s?.ok ? s.following : (p.following ?? null),
    stale:     !(s?.ok),
  };
});

writeFileSync('data.json', JSON.stringify({ capturedAt: today, accounts }, null, 2) + '\n');

// --- history.json: un snapshot por día (para series temporales / crecimiento) ---
let history = [];
if (existsSync('history.json')) {
  try { history = JSON.parse(readFileSync('history.json', 'utf8')); } catch {}
}
const snap = {};
for (const a of accounts) if (a.followers != null) snap[a.handle] = a.followers;
history = history.filter(h => h.date !== today);
history.push({ date: today, followers: snap });
history.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync('history.json', JSON.stringify(history, null, 2) + '\n');

const okCount = Object.values(scraped).filter(s => s.ok).length;
console.log(`\nListo: ${okCount}/${cfg.length} cuentas OK · ${today}`);
