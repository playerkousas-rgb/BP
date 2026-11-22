#!/usr/bin/env node
// B-P Atlas v1.3 · © SCOUT SYSTEM
// Maintenance only: the website has no build step. This script simplifies
// the 18 District Council boundaries used as the outline of the Hong Kong
// Scout-history view. Source data: Paulkit/HKMap (MIT, © 2018 Paul Chu).
//
//   node scripts/build_hk_areas.mjs /path/to/HKMap/json [tolerance]
//
// The council boundaries are administrative geography, NOT Scout district
// boundaries. Scout districts are listed separately in data/hk.json and are
// never inferred from these polygons.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('Usage: node scripts/build_hk_areas.mjs <HKMap/json directory> [tolerance]');
  process.exit(1);
}
const tolerance = Number(process.argv[3] || 0.0015); // roughly 165 m; the default that reproduces data/hk-areas.json byte for byte
const codes = {
  'Central and Western': 'CW', 'Wan Chai': 'WC', Eastern: 'E', Southern: 'S',
  'Yau Tsim Mong': 'YTM', 'Sham Shui Po': 'SSP', 'Kowloon City': 'KC',
  'Wong Tai Sin': 'WTS', 'Kwun Tong': 'KT', 'Sai Kung': 'SK', 'Sha Tin': 'ST',
  'Tai Po': 'TP', North: 'N', 'Yuen Long': 'YL', 'Tuen Mun': 'TM',
  'Tsuen Wan': 'TW', 'Kwai Tsing': 'KWT', Islands: 'IS',
};

// Where each Council area's name is pinned on the map. Most are the polygon's
// area centroid; the spiky or multi-part ones (Sai Kung, Sha Tin) fall outside
// their own outline, so they are nudged by hand. These are label anchors, not
// anywhere a boundary is claimed to be.
const LABEL_ANCHORS = {
  CW: [114.1450, 22.2790], SK: [114.3250, 22.3900], ST: [114.1990, 22.3800],
};

// Perpendicular distance of p from the line a–b, in degrees.
function distance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy));
}
function simplify(points, epsilon) {
  if (points.length < 4) return points;
  let index = 0, far = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[i], points[0], points[points.length - 1]);
    if (d > far) { far = d; index = i; }
  }
  if (far <= epsilon) return [points[0], points[points.length - 1]];
  const first = simplify(points.slice(0, index + 1), epsilon);
  const last = simplify(points.slice(index), epsilon);
  return [...first.slice(0, -1), ...last];
}
const round = value => Math.round(value * 10000) / 10000;
// Area centroid of a ring in lon/lat degrees (shoelace).
function ringCentroid(ring) {
  let twiceArea = 0, x = 0, y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j], [x2, y2] = ring[i];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross; x += (x1 + x2) * cross; y += (y1 + y2) * cross;
  }
  if (!twiceArea) return ring[0];
  return [round(x / (3 * twiceArea)), round(y / (3 * twiceArea))];
}
function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(area / 2);
}
// Always return polygons (arrays of rings). Only each polygon's outer ring is
// kept: the source outlines have no meaningful holes at this scale.
function geometryPolygons(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'GeometryCollection') return geometry.geometries.flatMap(geometryPolygons);
  return [];
}
function closeRing(ring) {
  const points = ring.map(([lon, lat]) => [round(lon), round(lat)]);
  const first = points[0], last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first]);
  return points;
}

const features = [];
for (const [name, code] of Object.entries(codes)) {
  const raw = JSON.parse(readFileSync(path.join(sourceDir, `${name}.json`), 'utf8'));
  const polygons = raw.features.flatMap(item => geometryPolygons(item.geometry))
    // Drop specks that would only add noise at this scale.
    .filter(polygon => ringArea(polygon[0]) > 0.00002)
    .map(polygon => [closeRing(simplify(polygon[0].map(([lon, lat]) => [lon, lat]), tolerance))]);
  if (!polygons.length) throw new Error(`${name}: no polygon rings found`);
  const geometry = polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] }
    : { type: 'MultiPolygon', coordinates: polygons };
  // Biggest ring by projected area, so multi-part areas label on their mainland.
  const biggest = polygons.reduce((best, polygon) => (ringArea(polygon[0]) > ringArea(best[0]) ? polygon : best), polygons[0]);
  const label = LABEL_ANCHORS[code] || ringCentroid(biggest[0]);
  features.push({ type: 'Feature', id: code, properties: { code, label }, geometry });
}
const collection = {
  type: 'FeatureCollection',
  note: 'Council-area outlines from Paulkit/HKMap (MIT). properties.label is a hand-placed anchor point for the area name, not a geographic truth.',
  features,
};
const text = JSON.stringify(collection);
const target = path.join(root, 'data/hk-areas.json');
writeFileSync(target, `${text}\n`);
const size = statSync(target).size;
const points = features.reduce((sum, feature) => {
  const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return sum + rings.reduce((inner, polygon) => inner + polygon[0].length, 0);
}, 0);
console.log(`Wrote data/hk-areas.json: ${features.length} council areas, ${points} ring points, ${(size / 1024).toFixed(1)} KiB (tolerance ${tolerance}°).`);
console.log('NOTICE: Council boundaries are administrative outlines, not Scout district boundaries.');
