// B-P Atlas v1.0 · © SCOUT SYSTEM
// Optional, dev-only browser tests. The website itself requires no build or server-side code.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
let server, origin;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, `.${pathname}`);
      if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length }); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}/`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

async function pageFor(t, options = {}) {
  const launchOptions = { headless: true };
  if (process.env.CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
  if (process.env.CHROMIUM_SINGLE_PROCESS === '1') launchOptions.args = ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage', '--disable-gpu'];
  const browser = await chromium.launch(launchOptions); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', ...options });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'Unexpected browser JavaScript errors'));
  return { page, context };
}
const visit = (page, query = '') => page.goto(`${origin}${query}`, { waitUntil: 'networkidle' });
const setYear = (page, year) => page.locator('#year-range').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, String(year));

// One browser per test also supports constrained single-process/headless environments.
test('journey, camera, keyboard focus, cancellation and sharing stay in sync', async t => {
  const { page } = await pageFor(t);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { if (window.rejectClipboard) throw new Error('blocked'); window.copiedLink = text; } } });
    document.execCommand = command => { if (command !== 'copy') return false; window.fallbackLink = document.querySelector('textarea')?.value; return true; };
  });
  await visit(page, '?lang=en&year=1907&stop=brownsea');
  assert.equal(await page.locator('.map-country').count(), 241);
  assert.equal(await page.locator('.intro-draft').isVisible(), true);
  assert.match(await page.locator('.intro-draft').textContent(), /research draft/i);
  assert.match(await page.locator('#card-content h2').textContent(), /one camp/i);
  assert.equal(await page.locator('#map-scale').isVisible(), true);
  const scaleBefore = await page.locator('#map-scale-label').textContent();
  await page.locator('#zoom-in').click();
  assert.notEqual(await page.locator('#map-scale-label').textContent(), scaleBefore);
  const map = page.locator('#world-map'), beforePan = await page.locator('#world-map > g').getAttribute('transform');
  const rect = await map.boundingBox(), x = rect.x + rect.width * .45, y = rect.y + rect.height * .65;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 70, y + 25, { steps: 5 }); await page.mouse.up();
  assert.notEqual(await page.locator('#world-map > g').getAttribute('transform'), beforePan, 'Dragging should pan a zoomed map');
  await page.locator('#zoom-reset').click();
  await page.locator('.next-story').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#year-range').inputValue(), '1908');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('next-story')), true);
  await page.waitForTimeout(170);
  assert.match(page.url(), /stop=scouting-for-boys/); assert.match(page.url(), /view=/);
  await page.locator('#share-button').click();
  assert.equal(await page.evaluate(() => window.copiedLink), page.url());
  assert.match(await page.locator('#toast').textContent(), /copied/i);
  await page.evaluate(() => { window.rejectClipboard = true; });
  await page.locator('#share-button').click();
  assert.equal(await page.evaluate(() => window.fallbackLink), page.url());
  assert.equal(await page.evaluate(() => document.activeElement.id), 'share-button');
  const cancel = page.locator('.timeline-cancel'); await cancel.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#year-range').inputValue(), '1979');
  assert.match(await page.locator('#card-content h2').textContent(), /cancelled/i);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('timeline-cancel')), true);
  assert.equal(await page.locator('#jamboree-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#jamboree-toggle').click();
  assert.equal(await page.locator('.jamboree-marker').count(), 0);
  const transferred = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].reduce((sum, entry) => sum + entry.transferSize, 0));
  assert.ok(transferred > 0 && transferred < 1_000_000, `First load should be under 1 MB, got ${transferred}`);
});

test('chart slider, source qualifiers, URL bounds and selected marker focus', async t => {
  const { page } = await pageFor(t);
  await visit(page, '?lang=en&year=1857&mode=spread');
  const chart = page.locator('#membership-chart');
  assert.equal(await chart.getAttribute('role'), 'slider');
  assert.equal(await chart.getAttribute('aria-valuemin'), '1857');
  await chart.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#year-range').inputValue(), '1858');
  await page.keyboard.press('Home'); assert.equal(await chart.getAttribute('aria-valuenow'), '1857');
  await page.keyboard.press('End'); assert.equal(await chart.getAttribute('aria-valuenow'), String(new Date().getFullYear()));
  await setYear(page, 2025);
  assert.equal(await page.locator('#chart-value').textContent(), 'about 60,000,000');
  assert.match(await page.locator('#chart-value-label').textContent(), /estimated reach/i);
  assert.match(await chart.getAttribute('aria-valuetext'), /2025.*estimated reach/i);
  await page.locator('.timeline-cancel').click();
  assert.equal(await page.locator('#year-range').inputValue(), '1979', 'The timeline cancellation should jump back from a later year');
  await page.locator('#chart-org-toggle').click();
  assert.equal(await chart.locator('polyline, .chart-line, .chart-org-line').count(), 0, 'Neither series may imply intermediate values');
  const rows = JSON.parse(await readFile(path.join(root, 'data/membership.json'), 'utf8'));
  assert.equal(await chart.locator('.chart-point').count(), rows.filter(row => row.members != null && row.year <= new Date().getFullYear()).length);
  assert.equal(await chart.locator('.chart-org-point').count(), rows.filter(row => row.countries != null && row.year <= new Date().getFullYear()).length);
  await setYear(page, 1923);
  assert.equal(await page.locator('#chart-value').textContent(), 'No data');
  assert.equal(await page.locator('#chart-org-value').textContent(), 'No data');
  assert.match(await chart.getAttribute('aria-valuetext'), /1923.*No data.*Orgs \/ countries: No data/i);
  await setYear(page, 1971);
  assert.equal(await page.locator('#chart-value').textContent(), 'No data');
  assert.equal(await page.locator('#chart-org-value').textContent(), 'over 100');
  await setYear(page, 1931);
  assert.equal(await page.locator('#chart-value').textContent(), '2,039,349');
  assert.equal(await page.locator('#chart-org-value').textContent(), 'No data');
  await setYear(page, 2013);
  assert.equal(await page.locator('#chart-value').textContent(), 'over 40,000,000');
  assert.equal(await page.locator('#chart-org-value').textContent(), '162');
  await setYear(page, 2024);
  assert.equal(await page.locator('#chart-org-value').textContent(), '175');
  assert.match(await page.locator('#chart-org-note').textContent(), /10 August report.*176/i);
  assert.match(await chart.getAttribute('aria-valuetext'), /175.*10 August report.*176/i);
  await setYear(page, 2025);
  assert.equal(await page.locator('#chart-org-value').textContent(), '176');
  assert.equal(await page.locator('#chart-org-note').textContent(), '');
  await visit(page, '?lang=en&year=9999&mode=spread&nso=PAK');
  assert.equal(await page.locator('#year-range').inputValue(), String(new Date().getFullYear()));
  assert.match(await page.locator('#card-content h2').textContent(), /idea travels/i);
  await visit(page, '?lang=en&year=1857&stop=brownsea');
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  const marker = page.locator('.map-marker[data-id="brownsea"]'); await marker.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'brownsea');
  assert.match(await page.locator('#card-content h2').textContent(), /one camp/i);
  await visit(page, '?lang=en&year=1920&jamboree=jamboree-1979-cancelled&jamborees=0');
  assert.equal(await page.locator('#year-range').inputValue(), '1979');
  assert.equal(await page.locator('#jamboree-toggle').getAttribute('aria-pressed'), 'true');
  await visit(page, '?lang=en&year=1937&stop=vogelenzang');
  await page.locator('.map-marker[data-id="vogelenzang"]').focus(); await page.keyboard.press('Enter');
  const samePlaceStop = page.locator('.map-marker[data-id="vogelenzang"]');
  const samePlaceEvent = page.locator('.map-marker[data-id="jamboree-5"]');
  assert.notEqual(await samePlaceStop.getAttribute('data-dy'), await samePlaceEvent.getAttribute('data-dy'));
  await samePlaceEvent.click();
  assert.match(await page.locator('#card-content h2').textContent(), /Jamboree 5/i);
  await page.locator('.map-marker[data-id="vogelenzang"]').click();
  assert.match(await page.locator('#card-content h2').textContent(), /farewell/i);
});

test('mobile drawers, 1979 control and genuine two-finger zoom', async t => {
  const { page, context } = await pageFor(t, { viewport: { width: 390, height: 844 }, locale: 'zh-HK', isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await visit(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 115, y: 285, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 115, y: 285, id: 1 }, { x: 255, y: 285, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 85, y: 285, id: 1 }, { x: 285, y: 285, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const transform = await page.locator('#world-map > g').getAttribute('transform');
  assert.ok(Number(transform.match(/scale\(([^)]+)/)[1]) > 1, transform);
  await page.locator('#mobile-teaser').tap();
  assert.equal(await page.locator('#story-panel').isVisible(), true);
  assert.equal(await page.locator('#mobile-story').getAttribute('aria-expanded'), 'true');
  const close = await page.locator('#story-panel [data-close-panel]').boundingBox();
  const badge = await page.locator('#story-panel .card-phase').boundingBox();
  assert.ok(close.x >= badge.x + badge.width, 'Close button should not overlap the phase badge');
  await page.locator('#story-panel [data-close-panel]').click();
  assert.equal(await page.locator('#story-panel').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'mobile-story');
  await page.locator('#mobile-chart').click();
  assert.equal(await page.locator('#chart-panel').isVisible(), true);
  assert.equal(await page.locator('#story-panel').isVisible(), false);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#chart-panel').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'mobile-chart');
  await page.locator('[data-mode="spread"]').click();
  await page.locator('.timeline-cancel').click();
  assert.equal(await page.locator('#year-range').inputValue(), '1979');
  assert.equal(await page.locator('#story-panel').isVisible(), true);
  assert.match(await page.locator('#card-content h2').textContent(), /取消/);
  await page.setViewportSize({ width: 320, height: 568 });
  const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, mapBottom: document.querySelector('.map-panel').getBoundingClientRect().bottom, timelineTop: document.querySelector('.timeline').getBoundingClientRect().top }));
  assert.equal(bounds.width, bounds.viewport); assert.ok(bounds.mapBottom <= bounds.timelineTop, JSON.stringify(bounds));
});

test('browser language wins without a URL parameter and storage failures are harmless', async t => {
  const { page } = await pageFor(t, { locale: 'en-US' });
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await visit(page);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.locator('#language-button').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant-HK');
  await page.waitForTimeout(160); await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant-HK');
});

test('load error has a translated accessible retry and recovers', async t => {
  const { page } = await pageFor(t);
  const pattern = '**/data/world.json';
  await page.route(pattern, route => route.fulfill({ status: 503, body: 'unavailable' }));
  await visit(page, '?lang=en');
  assert.equal(await page.locator('#load-error').getAttribute('role'), 'alert');
  assert.match(await page.locator('#load-error').textContent(), /could not load/i);
  assert.equal(await page.locator('.atlas-workspace').isVisible(), false);
  await page.locator('#language-button').click();
  assert.match(await page.locator('#load-error').textContent(), /未能載入/);
  await page.unroute(pattern);
  await Promise.all([page.waitForURL('**/*'), page.locator('#load-error button').click()]);
  await page.waitForSelector('.map-country');
  assert.equal(await page.locator('.atlas-workspace').isVisible(), true);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant-HK');
});

test('bilingual credits provide year-by-year source links and accurate qualifiers', async t => {
  const { page } = await pageFor(t, { viewport: { width: 390, height: 844 } });
  await visit(page, 'credits.html?lang=en#membership-figures');
  const membershipRows = JSON.parse(await readFile(path.join(root, 'data/membership.json'), 'utf8'));
  const sources = JSON.parse(await readFile(path.join(root, 'data/sources.json'), 'utf8'));
  const directory = JSON.parse(await readFile(path.join(root, 'data/nso.json'), 'utf8'));
  assert.equal(await page.locator('#membership-sources tr').count(), membershipRows.length);
  assert.equal(await page.locator('#source-list li').count(), sources.length);
  const scope = await page.locator('[data-i18n="creditsScope"]').textContent();
  assert.match(scope, new RegExp(`\\b${directory.length}\\b`));
  assert.match(scope, new RegExp(`\\b${directory.filter(item => item.scoutingStart !== null).length}\\b`));
  assert.match(await page.locator('[data-i18n="creditsWikipedia"]').textContent(), /Wikipedia contributors.*CC BY-SA 4\.0/i);
  assert.equal(await page.locator('a[href="https://creativecommons.org/licenses/by-sa/4.0/"]').count(), 1);
  const row = page.locator('#membership-sources tr').filter({ hasText: '2025' });
  assert.match(await row.textContent(), /about 60,000,000.*176.*estimated reach/i);
  assert.ok(await row.locator('a').count() >= 1);
  assert.match(await page.locator('[data-i18n="creditsStatsMethod"]').textContent(), /census.*51.4/i);
  const row2024 = page.locator('#membership-sources tr').filter({ hasText: /^2024/ });
  assert.match(await row2024.textContent(), /175.*10 August report.*176/i);
  assert.equal(await row2024.locator('a[href="https://www.scout.org/news/news/scouting-albania-joins-176th-member-organization"]').count(), 1);
  await page.locator('#language-button').click();
  assert.match(await row2024.textContent(), /175.*8 月 10 日.*176/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant-HK');
  assert.match(await page.locator('h1').textContent(), /資料來源/);
  assert.match(page.url(), /lang=zh/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
});

test('directory references preserve the year and camera, share, reload and never select the map', async t => {
  const { page } = await pageFor(t);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedLink = text; } } });
  });
  await visit(page, '?lang=en&year=1907&mode=spread&jamborees=0');
  await page.locator('#zoom-in').click();
  const transform = await page.locator('#world-map > g').getAttribute('transform');
  const mapSnapshot = () => page.locator('.map-country').evaluateAll(nodes => nodes.map(node => [node.getAttribute('style'), node.getAttribute('class')]));
  const before = await mapSnapshot();
  assert.equal(await page.locator('.map-country.is-selectable').count(), 0);

  await page.locator('#directory-button').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#directory-dialog').getAttribute('open'), '');
  assert.match(await page.locator('#directory-intro').textContent(), /present-day research entries.*without changing the timeline/i);
  const entries = JSON.parse(await readFile(path.join(root, 'data/nso.json'), 'utf8'));
  assert.equal(await page.locator('#directory-list .directory-entry').count(), entries.length);
  assert.match(await page.locator('.directory-entry[data-nso-id="PAK"] .directory-year').textContent(), /WOSM directory.*1948/i);
  assert.match(await page.locator('.directory-entry[data-nso-id="CRI"] .directory-year').textContent(), /year not stated/i);
  assert.match(await page.locator('.directory-entry[data-nso-id="SLB"] .directory-year').textContent(), /WOSM news.*2021/i);
  assert.match(await page.locator('.directory-entry[data-nso-id="SDN"] .directory-year').textContent(), /unverified/i);
  for (const [id, year] of [['SVN', 1997], ['MOZ', 1999], ['PNG', 1977]]) {
    assert.match(await page.locator(`.directory-entry[data-nso-id="${id}"] .directory-year`).textContent(), new RegExp(`${year}.*year disputed`, 'i'));
  }
  assert.doesNotMatch(await page.locator('.directory-entry[data-nso-id="JPN"] .directory-year').textContent(), /disputed|resolved/i);
  assert.match(await page.locator('#directory-intro').textContent(), new RegExp(`\\b${entries.length}\\b`));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#directory-dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'directory-button');

  await page.locator('#directory-button').click();
  const pakistan = page.locator('.directory-entry[data-nso-id="PAK"]');
  await pakistan.scrollIntoViewIfNeeded(); await pakistan.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#directory-dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'story-panel');
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  assert.equal(await page.locator('#world-map > g').getAttribute('transform'), transform);
  assert.deepEqual(await mapSnapshot(), before);
  assert.equal(await page.locator('.map-country.is-selected, .map-marker.selected').count(), 0);
  assert.equal(await page.locator('#card-content h2').textContent(), 'Pakistan');
  assert.match(await page.locator('.reference-banner').textContent(), /independent of the timeline/i);
  assert.match(await page.locator('.reference-note').textContent(), /does not establish/i);
  assert.match(await page.locator('[data-fact="wosm-membership"]').textContent(), /WOSM directory membership year.*1948/i);
  assert.match(await page.locator('[data-fact="start"]').textContent(), /to be verified/i);
  assert.equal(await page.locator('[data-fact="start"] a').count(), 0);

  // A dated entry shown as a present-day reference is equally independent.
  await page.locator('#directory-button').click();
  await page.locator('.directory-entry[data-nso-id="JPN"]').click();
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  assert.deepEqual(await mapSnapshot(), before);
  assert.equal(await page.locator('#world-map > g').getAttribute('transform'), transform);
  assert.equal(await page.locator('#card-content h2').textContent(), 'Japan');
  await setYear(page, 1911);
  assert.equal(await page.locator('.map-country[aria-label="Japan · 1911"]').count(), 1);
  assert.equal(await page.locator('.map-country.is-selected, .map-marker.selected').count(), 0);
  assert.match(await page.locator('.reference-banner').textContent(), /independent/i);
  await setYear(page, 1907);
  await page.locator('#share-button').click();
  const shared = await page.evaluate(() => window.copiedLink);
  const search = new URL(shared).searchParams;
  assert.equal(search.get('year'), '1907'); assert.equal(search.get('nso'), 'JPN'); assert.equal(search.get('ref'), '1');
  await page.goto(shared, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  assert.equal(await page.locator('#card-content h2').textContent(), 'Japan');
  assert.equal(await page.locator('#world-map > g').getAttribute('transform'), transform);
  assert.equal(await page.locator('.map-country.is-selected, .map-marker.selected').count(), 0);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  assert.match(await page.locator('.reference-banner').textContent(), /independent/i);

  await setYear(page, 1911);
  await page.locator('.map-country[aria-label="Japan · 1911"]').dispatchEvent('click');
  assert.equal(await page.locator('.reference-banner').count(), 0);
  assert.equal(await page.locator('.map-country.is-selected').count(), 1);
  await page.waitForTimeout(160);
  assert.equal(new URL(page.url()).searchParams.has('ref'), false);
  await setYear(page, 1910);
  assert.equal(await page.locator('.map-country.is-selected').count(), 0);
  assert.match(await page.locator('#card-content h2').textContent(), /idea travels/i);
});

test('organisation cards prioritise WOSM while retaining field-specific evidence', async t => {
  const { page } = await pageFor(t);
  const fact = slot => page.locator(`[data-fact="${slot}"]`);
  await visit(page, '?lang=en&year=1907&nso=JPN&ref=1');
  const facts = page.locator('#card-content .nso-fact');
  assert.equal(await facts.count(), 4);
  assert.match(await facts.nth(0).textContent(), /WOSM directory membership year.*1950/i);
  assert.match(await fact('membership').textContent(), /other reported membership years.*1922/i);
  assert.match(await fact('start').textContent(), /early local troop.*1911/i);
  assert.match(await fact('founding').textContent(), /present organisation founded.*1922/i);
  assert.equal(await fact('start').locator('[data-source-id="japan-troop"]').count(), 1);
  assert.equal(await fact('start').locator('[data-source-id="wosm-japan"]').count(), 0);
  assert.equal(await fact('founding').locator('[data-source-id="wosm-japan"]').count(), 1);
  assert.equal(await fact('wosm-membership').locator('[data-source-slot="wosm-membership"][data-source-id="wosm-japan"]').count(), 1);
  assert.equal(await fact('membership').locator('[data-source-slot="membership"][data-source-id="wosm-japan"]').count(), 1);
  assert.match(await page.locator('.membership-caveat').textContent(), /not necessarily first admission or uninterrupted membership/i);
  await page.locator('.research-leads summary').click();
  assert.match(await page.locator('.research-leads').textContent(), /Wikipedia.*1913.*unverified/i);
  assert.equal(await page.locator('[data-source-slot="wiki-lead"][data-source-id="wiki-members"]').count(), 1);
  await setYear(page, 1911);
  assert.equal(await page.locator('.research-leads').evaluate(el => el.open), true, 'Rerenders should preserve expanded leads');
  await page.locator('#language-button').click();
  assert.match(await page.locator('.reference-banner').textContent(), /與時間軸年份無關/);
  assert.match(await fact('start').textContent(), /早期當地童軍團／旅.*1911/);
  assert.match(await fact('wosm-membership').textContent(), /WOSM 名錄會籍年份.*1950/);
  assert.equal(await page.locator('.research-leads').evaluate(el => el.open), true);

  await visit(page, '?lang=en&year=1907&nso=IDN&ref=1');
  assert.match(await fact('start').textContent(), /to be verified/i);
  assert.match(await fact('founding').textContent(), /1961/);
  assert.match(await fact('wosm-membership').textContent(), /1953/);
  assert.match(await page.locator('#card-content .card-body').textContent(), /Wikipedia lists 1961 as accession/i);
  await page.locator('.research-leads summary').click();
  assert.match(await page.locator('.research-leads').textContent(), /starting-year lead: 1912.*not plotted/i);
  assert.equal(await page.locator('[data-source-slot="prototype-lead"][data-source-id="wosm-indonesia-news"]').count(), 1);

  await visit(page, '?lang=en&year=1907&nso=PHL&ref=1');
  assert.match(await page.locator('#card-content .card-body').textContent(), /1911.*1910.*1912.*1914.*1946.*1947/i);
  assert.match(await fact('start').textContent(), /1911/);
  assert.equal(await page.locator('[data-source-slot="start"][data-source-id="phl-handbook-1911"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="wosm-membership"][data-source-id="wosm-philippines"]').count(), 1);
  await setYear(page, 1910);
  assert.equal(await page.locator('.map-country[aria-label="Philippines · 1911"]').count(), 0);
  await setYear(page, 1911);
  assert.equal(await page.locator('.map-country[aria-label="Philippines · 1911"]').count(), 1);

  await visit(page, '?lang=en&year=1907&nso=MAC&ref=1');
  assert.match(await fact('start').textContent(), /1911/);
  assert.match(await fact('founding').textContent(), /1983/);
  assert.match(await fact('wosm-membership').textContent(), /2017/);
  assert.equal(await page.locator('[data-source-slot="start"][data-source-id="portugal-aep-history"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="founding"][data-source-id="wosm-macau"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="wosm-membership"][data-source-id="wosm-member-mac"]').count(), 1);
  await setYear(page, 1910);
  assert.equal(await page.locator('.nso-marker[data-id="MAC"]').count(), 0);
  await setYear(page, 1911);
  assert.equal(await page.locator('.nso-marker[data-id="MAC"]').count(), 1);

  await visit(page, '?lang=en&year=1907&nso=PRT&ref=1');
  assert.match(await fact('start').textContent(), /1912/);
  assert.match(await fact('founding').textContent(), /1982/);
  assert.match(await fact('wosm-membership').textContent(), /1922.*1982/);
  assert.match(await page.locator('#card-content .card-body').textContent(), /constituent.*not the federation itself.*not necessarily the founding or accession/i);
  assert.equal(await page.locator('[data-source-slot="start"][data-source-id="portugal-aep-history"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="portugal-aep-history"]').count(), 1);
  await page.locator('#language-button').click();
  assert.match(await page.locator('#card-content .card-body').textContent(), /AEP.*1912.*1913.*成員組織.*1922/);
});

test('conflicts, re-admissions, blank directory fields and unavailable WOSM pages remain explicit', async t => {
  const { page } = await pageFor(t);
  const fact = slot => page.locator(`[data-fact="${slot}"]`);
  await visit(page, '?lang=en&year=1907&nso=SVN&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /1997.*1994.*disagreement remains unresolved/i);
  assert.match(await fact('membership').textContent(), /1994/);
  assert.match(await fact('wosm-membership').locator('.membership-flag.is-disputed').textContent(), /conflicting years/i);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="slovenia-zts-wosm"]').count(), 1);
  await page.locator('#language-button').click();
  assert.match(await fact('wosm-membership').textContent(), /1997.*1994.*矛盾/);
  assert.match(await fact('wosm-membership').locator('.membership-flag.is-disputed').textContent(), /年份有爭議/);
  await page.locator('#directory-button').click();
  for (const [id, year] of [['SVN', 1997], ['MOZ', 1999], ['PNG', 1977]]) {
    assert.match(await page.locator(`.directory-entry[data-nso-id="${id}"] .directory-year`).textContent(), new RegExp(`${year}.*年份有爭議`));
  }
  assert.doesNotMatch(await page.locator('.directory-entry[data-nso-id="JPN"] .directory-year').textContent(), /爭議|已解決/);
  await page.keyboard.press('Escape');

  await visit(page, '?lang=en&year=1907&nso=MOZ&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /1999.*1990.*1994.*inconsistency/i);
  assert.match(await fact('wosm-membership').locator('.membership-flag.is-disputed').textContent(), /conflicting years/i);
  await visit(page, '?lang=en&year=1907&nso=PNG&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /1977.*1976.*discrepancy remains unresolved/i);
  assert.match(await fact('wosm-membership').locator('.membership-flag.is-disputed').textContent(), /conflicting years/i);
  await visit(page, '?lang=en&year=1907&nso=MCO&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2014.*1990.*full membership/i);
  assert.match(await fact('membership').textContent(), /1990/);
  assert.match(await fact('wosm-membership').locator('.membership-flag').textContent(), /other claims \/ membership context/i);
  assert.equal(await fact('wosm-membership').locator('.is-disputed').count(), 0);
  await visit(page, '?lang=en&year=1907&nso=BDI&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /1978.*conflicting years.*1979/i);
  assert.match(await fact('membership').textContent(), /1979/);
  assert.equal(await fact('wosm-membership').locator('.is-disputed').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-africa-report-2022-25"]').count(), 1);
  assert.match(await page.locator('.membership-caveat').textContent(), /unresolved conflicts.*need checking/i);
  await visit(page, '?lang=en&year=1907&nso=CPV&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2002.*conflicting years.*1992.*domestic legal recognition/i);
  assert.match(await fact('membership').textContent(), /1992/);
  await visit(page, '?lang=en&year=1907&nso=SMR&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2017.*accredited in 1990.*member in 2017/i);
  assert.equal(await fact('wosm-membership').locator('.is-disputed').count(), 0);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-san-marino-2017"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=PSE&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2016.*without voting rights in 1996.*full membership in 2016/i);
  assert.match(await fact('membership').textContent(), /1996/);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-baku-2017-membership"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=SYC&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2016.*conflicting years.*Africa report lists 2002.*accreditation in 2002.*full membership in 2016.*remains unverified/i);
  assert.match(await fact('membership').textContent(), /1927.*2002/);
  assert.match(await page.locator('#card-content .card-body').textContent(), /Wikipedia.*1927.*joining-year column/i);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-africa-report-2022-25"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-seychelles"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-note"][data-source-id="wiki-members"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=BLR&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2010.*conflicting years/i);
  assert.match(await fact('membership').textContent(), /1989.*1998/);
  assert.match(await page.locator('#card-content .card-body').textContent(), /1989.*discrepancy remains unresolved/i);
  assert.equal(await page.locator('[data-source-slot="membership-note"][data-source-id="wiki-members"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=COG&ref=1');
  assert.match(await page.locator('#card-content .card-body').textContent(), /Wikipedia.*1930s.*1991/i);
  assert.equal(await page.locator('[data-source-slot="membership-note"][data-source-id="wiki-members"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=CAN&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /1946.*Association des Scouts du Canada.*does not state a separate joining year/i);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-canada-special-case"]').count(), 1);
  await visit(page, '?lang=en&year=1907&nso=LBN&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /directory membership history.*1947.*field is blank.*1924/i);
  await visit(page, '?lang=en&year=1907&nso=AFG&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /2020.*rejoined/i);
  await visit(page, '?lang=en&year=1907&nso=SLB&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /WOSM news membership year.*2021/i);
  await visit(page, '?lang=en&year=1907&nso=CRI&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /WOSM directory membership year.*not stated.*conflicting years.*1925.*1935/i);
  assert.equal(await fact('wosm-membership').locator('[data-source-slot="wosm-membership"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-statistics-2007"]').count(), 1);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-statistics-2010"]').count(), 1);
  assert.match(await fact('membership').textContent(), /1925.*1935/);
  await page.locator('#language-button').click();
  assert.match(await fact('wosm-membership').textContent(), /未列明.*年份有爭議.*1925.*1935/);
  await visit(page, '?lang=en&year=1907&nso=SDN&ref=1');
  assert.match(await fact('wosm-membership').textContent(), /directory detail unavailable.*to be verified.*2010 WOSM archive.*1956/i);
  assert.equal(await fact('wosm-membership').locator('[data-source-slot="wosm-membership"]').count(), 0);
  assert.equal(await page.locator('[data-source-slot="membership-context"][data-source-id="wosm-statistics-2010"]').count(), 1);
  assert.match(await fact('membership').textContent(), /1956/);
  assert.equal(await fact('membership').locator('[data-source-id="wiki-members"]').count(), 1);
});

test('unknown membership and absent research leads render without inventing values', async t => {
  const { page } = await pageFor(t);
  const entries = JSON.parse(await readFile(path.join(root, 'data/nso.json'), 'utf8'));
  const pakistan = entries.find(item => item.id === 'PAK');
  pakistan.membershipYears = []; pakistan.membershipSources = []; pakistan.wikiFoundingLead = null;
  pakistan.wosmMembership = { year: null, basis: 'unavailable', sources: [], note: null, noteSources: [] };
  await page.route('**/data/nso.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) }));
  await visit(page, '?lang=en&year=1907&nso=PAK&ref=1');
  assert.match(await page.locator('[data-fact="wosm-membership"]').textContent(), /to be verified/i);
  assert.equal(await page.locator('[data-fact="wosm-membership"] a').count(), 0);
  assert.equal(await page.locator('[data-fact="membership"]').count(), 0);
  assert.equal(await page.locator('.research-leads').count(), 0);
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
});

test('directory and reference cards fit narrow screens in both languages', async t => {
  const { page } = await pageFor(t, { viewport: { width: 320, height: 568 }, locale: 'en-US', isMobile: true, hasTouch: true });
  await visit(page, '?lang=en&year=1907&mode=spread');
  for (const language of ['en', 'zh']) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, `${language} page width`);
    const header = await page.locator('#directory-button').boundingBox();
    assert.ok(header.x >= 0 && header.x + header.width <= 320, `${language} directory button ${JSON.stringify(header)}`);
    await page.locator('#directory-button').click();
    const dimensions = await page.locator('#directory-dialog').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, viewport: innerWidth }));
    assert.ok(dimensions.content <= dimensions.width && dimensions.left >= 0 && dimensions.right <= dimensions.viewport, JSON.stringify(dimensions));
    const last = page.locator('#directory-list .directory-entry').last();
    await last.scrollIntoViewIfNeeded();
    assert.equal(await last.isVisible(), true, 'The end of the directory must be reachable');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'directory-button');
    if (language === 'en') await page.locator('#language-button').click();
  }
  await page.locator('#directory-button').click();
  await page.locator('.directory-entry[data-nso-id="PAK"]').click();
  assert.equal(await page.locator('#story-panel').isVisible(), true);
  assert.equal(await page.locator('#year-range').inputValue(), '1907');
  assert.match(await page.locator('.reference-banner').textContent(), /與時間軸年份無關/);
  const dimensions = await page.locator('#story-panel').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, document: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(dimensions.content <= dimensions.width && dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
  // Longer cross-border research notes and their citations must also wrap in both languages.
  for (const language of ['en', 'zh']) for (const id of ['MAC', 'PRT']) {
    await visit(page, `?lang=${language}&year=1907&nso=${id}&ref=1&panel=story`);
    assert.equal(await page.locator('#story-panel').isVisible(), true);
    const size = await page.locator('#story-panel').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, document: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(size.content <= size.width && size.document <= size.viewport, `${language} ${id}: ${JSON.stringify(size)}`);
    assert.equal(await page.locator('[data-source-slot="start"][data-source-id="portugal-aep-history"]').count(), 1);
  }
});

test('disputed years and chart context remain visible and scrollable on 320px screens', async t => {
  const { page } = await pageFor(t, { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const inside = (locator, selector) => locator.evaluate((el, parentSelector) => {
    const target = el.getBoundingClientRect(), panel = el.closest(parentSelector).getBoundingClientRect();
    return { top: target.top, bottom: target.bottom, left: target.left, right: target.right, panelTop: panel.top, panelBottom: panel.bottom, panelLeft: panel.left, panelRight: panel.right };
  }, selector);
  for (const lang of ['en', 'zh']) for (const id of ['SVN', 'MOZ', 'PNG', 'CRI', 'CPV']) {
    await visit(page, `?lang=${lang}&year=1907&nso=${id}&ref=1&panel=story`);
    const panel = page.locator('#story-panel'), badge = panel.locator('.membership-flag.is-disputed');
    assert.match(await badge.textContent(), lang === 'en' ? /conflicting years/i : /年份有爭議/);
    const first = await inside(badge, '#story-panel');
    assert.ok(first.top >= first.panelTop && first.bottom <= first.panelBottom - 2 && first.left >= first.panelLeft && first.right <= first.panelRight, `${lang} ${id}: badge should be in the initial view ${JSON.stringify(first)}`);
    const explanation = panel.locator('.wosm-context p');
    await explanation.scrollIntoViewIfNeeded();
    const visible = await inside(explanation, '#story-panel');
    assert.ok(visible.top >= visible.panelTop && visible.bottom <= visible.panelBottom, `${lang} ${id}: explanation can be scrolled into view ${JSON.stringify(visible)}`);
    await panel.locator('.membership-caveat').scrollIntoViewIfNeeded();
    assert.ok(await panel.evaluate(el => el.scrollTop) > 0, `${lang} ${id}: the story must scroll to the further caveat`);
    const size = await panel.evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, document: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(size.content <= size.width && size.document <= size.viewport, `${lang} ${id}: ${JSON.stringify(size)}`);
  }
  for (const lang of ['en', 'zh']) {
    await visit(page, `?lang=${lang}&year=2024&orgs=1&panel=chart`);
    assert.match(await page.locator('#chart-org-current').textContent(), lang === 'en' ? /175.*10 August.*176/ : /175.*8 月 10 日.*176/);
    const graph = await inside(page.locator('#membership-chart'), '#chart-panel');
    assert.ok(graph.top >= graph.panelTop && graph.bottom <= graph.panelBottom, `${lang}: whole chart should fit in the initial view ${JSON.stringify(graph)}`);
    const link = page.locator('#chart-panel .chart-note a');
    await link.scrollIntoViewIfNeeded();
    const visible = await inside(link, '#chart-panel');
    assert.ok(visible.top >= visible.panelTop && visible.bottom <= visible.panelBottom, `${lang}: chart source link must be reachable ${JSON.stringify(visible)}`);
  }
});

test('representative desktop, mobile and credits states pass automated accessibility rules', async t => {
  const { page } = await pageFor(t);
  const audit = async label => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(result.violations.map(item => `${item.id}: ${item.nodes.map(node => node.target.join(' ')).join(', ')}`), [], label);
  };
  await visit(page, '?lang=en&year=2025&mode=spread'); await audit('desktop spread');
  await page.locator('#about-button').click(); await audit('about dialog'); await page.locator('#about-close').click();
  await page.locator('#directory-button').click(); await audit('desktop directory'); await page.keyboard.press('Escape');
  await visit(page, '?lang=en&year=1907&nso=PAK&ref=1'); await audit('desktop reference card');
  await visit(page, '?lang=en&year=1907&nso=SVN&ref=1'); await audit('desktop disputed membership');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#directory-button').click(); await audit('mobile directory'); await page.keyboard.press('Escape');
  await page.locator('#mobile-story').click();
  await page.locator('#story-panel').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
  await audit('mobile story');
  await page.locator('#mobile-chart').click();
  await page.locator('#chart-panel').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
  await audit('mobile chart');
  await visit(page, 'credits.html?lang=en'); await audit('credits');
});

test('sample organisation names are sourced, bilingual and wrap on a small screen', async t => {
  const { page } = await pageFor(t, { viewport: { width: 320, height: 700 }, locale: 'en-US' });
  await visit(page, '?lang=en&year=2025&mode=spread&nso=DEU&panel=story');
  assert.equal(await page.locator('#card-content .card-place').textContent(), 'Ring deutscher Pfadfinder*innenverbände');
  assert.equal(await page.locator('#card-content [data-source-id="wosm-directory"]').count(), 1);
  const dimensions = await page.locator('#story-panel').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth, document: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(dimensions.content <= dimensions.width && dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
  await page.locator('#language-button').click();
  assert.equal(await page.locator('#card-content .card-place').textContent(), '德國童軍聯合會');
  await visit(page, '?lang=en&year=2025&mode=spread&nso=CAN&panel=story');
  assert.equal(await page.locator('#card-content .card-place').textContent(), 'Scouts Canada');
  assert.match(await page.locator('#card-content .wosm-context').textContent(), /Association des Scouts du Canada.*special case/i);
  await visit(page, '?lang=en&year=2025&mode=spread&nso=USA&panel=story');
  assert.match(await page.locator('#card-content .card-body').textContent(), /Pawhuska.*1909.*first remains disputed.*Scouting America.*trade name.*Boy Scouts of America.*legal name/i);
  assert.match(await page.locator('#card-content [data-source-id="usa-name"]').getAttribute('href'), /2025_Charter_Bylaws\.pdf$/);
  assert.match(await page.locator('[data-source-slot="start"][data-source-id="usa-early-troop"]').getAttribute('href'), /history\/waite-phillips$/);
  assert.equal(await page.locator('[data-source-slot="start"][data-source-id="usa-history"]').count(), 0);
});

test('changing a long story resets the scroll position without leaving focus off-screen', async t => {
  const { page } = await pageFor(t, { viewport: { width: 1280, height: 720 }, locale: 'en-US' });
  await visit(page, '?lang=en&year=2025&mode=spread&nso=CAN');
  const panel = page.locator('#story-panel');
  const scrollable = await panel.evaluate(el => el.scrollHeight > el.clientHeight);
  assert.equal(scrollable, true);
  await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const scrollTop = await panel.evaluate(el => el.scrollTop);
  assert.ok(scrollTop > 0);
  const sourceInView = await panel.evaluate(el => {
    const panelRect = el.getBoundingClientRect(), sourceRect = el.querySelector('[data-source-id="wosm-directory"]').getBoundingClientRect();
    return sourceRect.top >= panelRect.top && sourceRect.bottom <= panelRect.bottom;
  });
  assert.equal(sourceInView, true, 'Sources must remain reachable by scrolling');
  await page.locator('#chart-org-toggle').click();
  assert.equal(await panel.evaluate(el => el.scrollTop), scrollTop, 'Rerendering the same story should preserve scroll');
  // Select a different country while the previous card is scrolled to its sources.
  await page.locator('.map-country[aria-label^="France"]').dispatchEvent('click');
  assert.equal(await page.locator('#card-content h2').textContent(), 'France');
  assert.equal(await panel.evaluate(el => el.scrollTop), 0);
  await visit(page, '?lang=en&year=1907&stop=brownsea');
  await page.locator('.next-story').click();
  assert.equal(await page.locator('#year-range').inputValue(), '1908');
  assert.equal(await panel.evaluate(el => el.scrollTop), 0);
  const focused = await page.evaluate(() => {
    const el = document.activeElement, panelRect = document.querySelector('#story-panel').getBoundingClientRect(), rect = el.getBoundingClientRect();
    return { panel: el.id === 'story-panel', next: el.classList.contains('next-story'), visible: rect.top >= panelRect.top && rect.bottom <= panelRect.bottom };
  });
  assert.ok((focused.panel || focused.next) && focused.visible, JSON.stringify(focused));
});

test('without JavaScript the page shows a clear bilingual fallback rather than dead controls', async t => {
  const { page } = await pageFor(t, { javaScriptEnabled: false });
  await visit(page);
  assert.equal(await page.locator('#noscript-error').isVisible(), true);
  assert.match(await page.locator('#noscript-error').textContent(), /needs JavaScript/i);
  assert.equal(await page.locator('.atlas-workspace').isVisible(), false);
});
