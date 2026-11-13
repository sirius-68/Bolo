// Opens the built admin panel in a real browser and checks that the sign-in screen appears with no errors.
// It also checks that the page talks to the bolo database and nowhere else. Nothing is sent to the database.
//   node scripts/admin-smoke.mjs <site folder>
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('usage: admin-smoke.mjs <site folder>');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(dir, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': types[extname(path)] || (path === '/' ? 'text/html' : 'application/octet-stream') });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

// the browser driver is looked up from the folder this is run in (CI installs it next to the built library)
const { chromium } = createRequire(join(process.cwd(), 'x.js'))(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
const page = await browser.newPage();
const problems = [];
const outside = [];
page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
page.on('pageerror', (e) => problems.push('page: ' + e.message));
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.origin + '/' === base) return route.continue();
  if (!/\.supabase\.co$/.test(u.hostname)) outside.push(u.origin);
  return route.abort(); // the check never reaches the real database
});
await page.goto(base, { waitUntil: 'load' });
try {
  await page.waitForSelector('form #email', { timeout: 15000 });
  await page.waitForSelector('form #pwd');
  await page.waitForSelector('form button[type=submit]');
} catch {
  problems.push('the sign-in screen did not appear: ' + (await page.locator('#app').innerText().catch(() => '')).slice(0, 200));
}
const cfg = await page.evaluate(() => ({ url: window.BOLO?.url || '', key: window.BOLO?.key || '', inline: document.querySelectorAll('script:not([src]), style').length }));
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url)) problems.push('the database address is missing or wrong');
if (!cfg.key || /^sb_secret_/.test(cfg.key)) problems.push('the public key is missing or is a secret key');
if (cfg.inline) problems.push('the page has inline scripts or styles, which its own safety rules block');
if (outside.length) problems.push('the page tried to reach other sites: ' + [...new Set(outside)].join(', '));
await browser.close();
server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('admin panel: sign-in screen loads, no errors, no contact with other sites');
