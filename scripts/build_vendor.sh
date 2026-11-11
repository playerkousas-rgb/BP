#!/usr/bin/env bash
# B-P Atlas v1.2 · © SCOUT SYSTEM
# Optional maintenance only: rebuild the local runtime bundle, not the website.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
npm install --prefix "$tmp" --no-audit --no-fund --silent \
  esbuild@0.25.12 d3-geo@3.1.2 d3-array@3.2.5 internmap@2.0.3 topojson-client@3.1.0
cat > "$tmp/entry.js" <<'JS'
export { geoEqualEarth, geoPath, geoGraticule, geoInterpolate, geoArea } from 'd3-geo';
export { feature } from 'topojson-client';
JS
"$tmp/node_modules/.bin/esbuild" "$tmp/entry.js" --bundle --format=esm --minify --outfile="$tmp/geography.min.js"
cp "$tmp/geography.min.js" "$root/vendor/geography.min.js"
echo 'Updated vendor/geography.min.js; retain and update vendor/LICENSES.txt if dependencies change.'
