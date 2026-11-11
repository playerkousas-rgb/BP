#!/usr/bin/env bash
# B-P Atlas v1.2 · © SCOUT SYSTEM
# Optional data-maintenance command. The website itself has no build step.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
npm pack --silent --pack-destination "$tmp" world-atlas@2.0.2 >/dev/null
tar -xzf "$tmp/world-atlas-2.0.2.tgz" -C "$tmp" package/countries-50m.json
npx --yes --package=mapshaper@0.6.113 mapshaper "$tmp/package/countries-50m.json" -simplify 25% keep-shapes -o "$tmp/world.json" format=topojson quantization=100000
node "$root/scripts/rewind_world.mjs" "$tmp/world.json"
if [ "$(wc -c < "$tmp/world.json")" -gt 307200 ]; then echo 'Map exceeds 300 KiB' >&2; exit 1; fi
cp "$tmp/world.json" "$root/data/world.json"
echo 'Updated data/world.json (Natural Earth 1:50m via world-atlas 2.0.2).'
