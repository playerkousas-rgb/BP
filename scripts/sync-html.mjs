#!/usr/bin/env node
// B-P Atlas v1.1 · © SCOUT SYSTEM
// Maintenance only: versioned HTML is the source, stable names are static deployment copies.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
for (const [source, output] of [['bp-atlas_v1.1.html', 'index.html'], ['credits_v1.1.html', 'credits.html']]) {
  const text = readFileSync(path.join(root, source), 'utf8');
  const copy = text.replace('\n', `\n<!-- GENERATED from ${source} (v1.1); edit the versioned source. -->\n`);
  let existing = ''; try { existing = readFileSync(path.join(root, output), 'utf8'); } catch { /* Missing copy. */ }
  if (existing !== copy) {
    if (check) { console.error(`FAIL ${output} is not in sync with ${source}`); process.exitCode = 1; }
    else { writeFileSync(path.join(root, output), copy); console.log(`Updated ${output} from ${source}`); }
  } else console.log(`PASS ${output} matches ${source}`);
}
