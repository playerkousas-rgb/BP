// B-P Atlas v1.1 · © SCOUT SYSTEM
// Mapshaper can reverse small rings across the antimeridian during simplification.
// Restore d3-geo's spherical winding convention without altering shared arcs.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature, geoArea } from '../vendor/geography.min.js';
const file = process.argv[2] || 'data/world.json';
const topology = JSON.parse(readFileSync(file, 'utf8'));
let fixed = 0;
for (const object of Object.values(topology.objects)) {
  for (const geometry of object.geometries || []) {
    if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) continue;
    const decoded = feature(topology, geometry).geometry.coordinates;
    const polygons = geometry.type === 'Polygon' ? [decoded] : decoded;
    const arcs = geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs;
    polygons.forEach((rings, polygonIndex) => rings.forEach((ring, ringIndex) => {
      const area = geoArea({ type: 'Polygon', coordinates: [ring] });
      if ((ringIndex === 0 && area > 2 * Math.PI) || (ringIndex > 0 && area < 2 * Math.PI)) {
        arcs[polygonIndex][ringIndex] = arcs[polygonIndex][ringIndex].slice().reverse().map(index => ~index);
        fixed++;
      }
    }));
  }
}
writeFileSync(file, JSON.stringify(topology));
console.log(`Rewound ${fixed} ring(s) in ${file}`);
