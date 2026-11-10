#!/usr/bin/env node
// B-P Atlas v1.0 · © SCOUT SYSTEM
// Static-project guard: deliberately does not require a build, dist/ or environment variables.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = name => path.join(root, name), read = name => readFileSync(file(name), 'utf8');
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
const required = ['README.md', 'Readme', 'LICENSE', 'CREDITS.md', '.gitignore', '.vercelignore', '.env.example', 'vercel.json', 'package.json', 'package-lock.json', 'index.html', 'credits.html', 'bp-atlas_v1.0.html', 'credits_v1.0.html', 'css/style.css', 'css/credits.css', 'js/state.js', 'data/world.json', 'data/sources.json', 'vendor/geography.min.js', 'vendor/LICENSES.txt', 'docs/RESEARCH.md', 'docs/DESIGN_REVIEW.md', 'docs/NSO_DATA.md', 'docs/RELEASE_CHECKLIST.md'];
for (const name of required) check(existsSync(file(name)), `Missing required file: ${name}`);
if (errors.length) { errors.forEach(error => console.error(`FAIL ${error}`)); process.exit(1); }
const version = 'v1.0';
const sync = spawnSync(process.execPath, [file('scripts/sync-html.mjs'), '--check'], { encoding: 'utf8' });
check(sync.status === 0, `HTML deployment copies differ from their sources: ${(sync.stderr || sync.error?.message || '').trim()}`);
for (const name of ['bp-atlas_v1.0.html', 'credits_v1.0.html', 'index.html', 'credits.html']) {
  const html = read(name);
  check(html.includes(`<meta name="app-version" content="${version}">`), `${name}: app-version missing`);
  check(html.includes('<meta name="copyright" content="© SCOUT SYSTEM">'), `${name}: copyright meta missing`);
  check(html.includes(`COPYRIGHT SCOUT SYSTEM · B-P Atlas ${version}`), `${name}: visible copyright/version missing`);
  check(new RegExp(`<title>[^<]*${version.replace('.', '\\.')}`).test(html), `${name}: title version missing`);
  check(!/<(?:script|link)\b[^>]+(?:src|href)=["']https?:\/\//i.test(html), `${name}: remote script or stylesheet`);
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (/^(?:#|https?:|mailto:|tel:|data:)/i.test(ref)) continue;
    check(existsSync(path.resolve(root, ref.split(/[?#]/)[0])), `${name}: missing local reference ${ref}`);
  }
}
check(read('js/state.js').includes(`APP_VERSION = '${version}'`), 'Runtime APP_VERSION mismatch');
const pkg = JSON.parse(read('package.json'));
check(pkg.version.split('.').slice(0, 2).join('.') === version.slice(1), 'package.json version mismatch');
for (const dir of ['js', 'css']) for (const name of readdirSync(file(dir))) {
  const fullName = `${dir}/${name}`, text = read(fullName);
  check(text.slice(0, 100).includes(version) && text.slice(0, 100).includes('© SCOUT SYSTEM'), `${fullName}: missing version/copyright header`);
  if (name.endsWith('.js')) for (const match of text.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
    check(existsSync(path.resolve(path.dirname(file(fullName)), match[1])), `${fullName}: missing module ${match[1]}`);
  }
}
const cfg = JSON.parse(read('vercel.json'));
check(cfg.framework === null && cfg.installCommand === '' && cfg.buildCommand === '', 'Vercel must explicitly skip framework, install and build for this static app');
check(!cfg.outputDirectory || cfg.outputDirectory === '.', 'Vercel must serve the project root, not dist');
const headers = cfg.headers?.flatMap(route => route.headers || []) || [];
const csp = headers.find(header => header.key.toLowerCase() === 'content-security-policy')?.value || '';
check(csp.includes("script-src 'self'") && csp.includes("object-src 'none'"), 'Expected restrictive Content-Security-Policy missing');
check(read('.gitignore').includes('.env*'), '.gitignore must exclude .env*');
for (const entry of ['.env*', 'tests/', 'scripts/', 'docs/']) check(read('.vercelignore').includes(entry), `.vercelignore must exclude ${entry}`);
const initialAssets = ['index.html', 'css/style.css', 'js/app.js', 'js/state.js', 'js/chart.js', 'js/timeline.js', 'js/journey.js', 'js/map.js', 'js/card.js', 'js/i18n.js', 'vendor/geography.min.js', 'data/world.json', 'data/journey.json', 'data/nso.json', 'data/jamborees.json', 'data/membership.json', 'data/sources.json', 'manifest.webmanifest', 'icons/favicon.ico'];
let bytes = 0;
for (const asset of initialAssets) {
  check(existsSync(file(asset)), `Missing runtime asset: ${asset}`);
  if (existsSync(file(asset))) bytes += statSync(file(asset)).size;
}
check(bytes < 1_000_000, `First-load asset budget exceeds 1 MB (${bytes} bytes)`);
const excluded = new Set(['.git', 'node_modules', '.screenshots', '.vercel', 'coverage', 'dist', 'test-results', 'playwright-report']);
const secretPatterns = [/AIza[\w-]{35}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{30,}/];
function scan(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const full = path.join(dir, item.name), rel = path.relative(root, full);
    if (item.isDirectory()) scan(full);
    else if (item.isFile()) {
      const size = statSync(full).size;
      check(size < 2_000_000, `${rel}: unexpectedly large file (${size} bytes)`);
      check(!/^\.env(?!\.example$)/.test(item.name), `${rel}: environment file must not be in the project`);
      if (size < 1_000_000 && /\.(?:md|txt|json|js|mjs|html|css|sh|yml|yaml|example)$/.test(item.name)) {
        const content = readFileSync(full, 'utf8');
        for (const pattern of secretPatterns) check(!pattern.test(content), `${rel}: possible credential or private key`);
      }
    }
  }
}
scan(root);
if (errors.length) { errors.forEach(error => console.error(`FAIL ${error}`)); process.exitCode = 1; }
else console.log(`PASS static guard: versions, local references, deployment copies, Vercel, secrets and ${bytes.toLocaleString('en')} byte initial asset budget.`);
console.log('NOTICE: This guard cannot validate historical accuracy, source relevance, selected project licence, or public deployment.');
