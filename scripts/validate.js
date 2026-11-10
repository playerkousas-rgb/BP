#!/usr/bin/env node
// B-P Atlas v1.0 · © SCOUT SYSTEM
// Structural validation only: passing this script does NOT verify historical claims.
import { readFileSync, statSync } from 'node:fs';
import { feature, geoArea } from '../vendor/geography.min.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const bilingual = value => value && typeof value.zh === 'string' && value.zh.trim() && typeof value.en === 'string' && value.en.trim();
const unique = (items, key, label) => {
  const ids = items.map(item => item[key]);
  check(new Set(ids).size === ids.length && ids.every(Boolean), `${label}: duplicate or missing ${key}`);
};
const year = value => Number.isInteger(value) && value >= 1857 && value <= 2100;
const coords = (lon, lat) => Number.isFinite(lon) && lon >= -180 && lon <= 180 && Number.isFinite(lat) && lat >= -90 && lat <= 90;
const sources = read('sources'); unique(sources, 'id', 'sources');
const ids = new Set(sources.map(source => source.id));
const sourceById = new Map(sources.map(source => [source.id, source]));
check(new Set(sources.map(source => source.url)).size === sources.length, 'sources: duplicate URLs');
for (const source of sources) {
  check(bilingual(source.title), `source ${source.id}: missing bilingual title`);
  try { check(['https:', 'http:'].includes(new URL(source.url).protocol), `source ${source.id}: unsafe URL scheme`); }
  catch { errors.push(`source ${source.id}: invalid URL`); }
}
function contentSources(item, label) {
  check(Array.isArray(item.sources) && item.sources.length > 0, `${label}: missing sources`);
  for (const id of item.sources || []) check(ids.has(id), `${label}: unknown source ${id}`);
  check(typeof item.draft === 'boolean', `${label}: missing draft status`);
}
const world = read('world');
check(world.type === 'Topology' && world.objects?.countries?.geometries?.length >= 200, 'world: invalid or incomplete topology');
check(statSync(new URL('../data/world.json', import.meta.url)).size <= 300 * 1024, 'world: exceeds 300 KiB');
const worldIds = new Set((world.objects?.countries?.geometries || []).map(g => String(g.id).padStart(3, '0')));
for (const country of feature(world, world.objects.countries).features) {
  check(geoArea(country) < 2 * Math.PI, `world: invalid spherical winding for ${country.properties?.name || country.id}`);
}
const journey = read('journey'); unique(journey, 'id', 'journey');
check(journey.length === 20, `journey: expected 20 stops, got ${journey.length}`);
journey.forEach((item, index) => {
  const label = `journey ${item.id}`;
  check(year(item.year) && year(item.yearEnd) && item.yearEnd >= item.year, `${label}: invalid years`);
  check(!index || journey[index - 1].year <= item.year, `${label}: records out of order`);
  check(coords(item.lon, item.lat), `${label}: invalid coordinates`);
  check(['early', 'military', 'scouting', 'later'].includes(item.phase), `${label}: invalid phase`);
  for (const field of ['place', 'country', 'title', 'body']) check(bilingual(item[field]), `${label}: missing ${field} translation`);
  check(item.placeThen === null || bilingual(item.placeThen), `${label}: incomplete historical place`);
  contentSources(item, label);
});
const nso = read('nso'); unique(nso, 'id', 'nso'); unique(nso, 'iso2', 'nso');
const mappedIds = nso.filter(item => item.mapId !== null).map(item => item.mapId);
check(new Set(mappedIds).size === mappedIds.length, 'nso: multiple records use the same map feature');
function factSources(item, field, required, label) {
  const refs = item[field];
  check(Array.isArray(refs) && (!required || refs.length > 0), `${label}: missing ${field}`);
  if (!Array.isArray(refs)) return;
  for (const id of refs) check(ids.has(id) && item.sources?.includes(id), `${label}: ${field} has unlisted or unknown source ${id}`);
}
for (const item of nso) {
  const label = `nso ${item.id}`;
  check(/^[A-Z]{3}$/.test(item.id) && /^[A-Z]{2}$/.test(item.iso2), `${label}: invalid location id`);
  check(item.mapId === null || (typeof item.mapId === 'string' && worldIds.has(item.mapId)), `${label}: map id not found in world topology`);
  check(item.marker === null || (Array.isArray(item.marker) && item.marker.length === 2 && coords(...item.marker)), `${label}: invalid marker`);
  check(item.scoutingStart === null || year(item.scoutingStart), `${label}: invalid start`);
  if (item.scoutingStart !== null) check(item.marker !== null && (item.mapId !== null || item.small), `${label}: plotted record requires a marker and a map feature or small-area point`);
  factSources(item, 'scoutingStartSources', item.scoutingStart !== null, label);
  if (item.scoutingStart === null) check(item.scoutingStartSources?.length === 0, `${label}: an undated record must not pretend to have a plotted start`);
  check(item.organisationFounded === null || bilingual(item.organisationFounded), `${label}: invalid organisation founding`);
  factSources(item, 'organisationFoundedSources', item.organisationFounded !== null, label);
  const official = item.wosmMembership;
  check(official && typeof official === 'object' && !Array.isArray(official), `${label}: missing WOSM membership record`);
  if (official && typeof official === 'object' && !Array.isArray(official)) {
    const dated = ['field', 'history', 'news'].includes(official.basis);
    const undated = ['blank', 'unavailable'].includes(official.basis);
    check(dated || undated, `${label}: invalid WOSM membership basis`);
    check(dated ? year(official.year) && official.year >= 1922 : official.year === null, `${label}: WOSM membership year does not match basis`);
    for (const field of ['sources', 'noteSources']) {
      const refs = official[field];
      check(Array.isArray(refs), `${label}: invalid WOSM ${field}`);
      for (const id of Array.isArray(refs) ? refs : []) check(ids.has(id) && item.sources?.includes(id), `${label}: WOSM ${field} has unlisted or unknown source ${id}`);
    }
    const refs = Array.isArray(official.sources) ? official.sources : [];
    check(official.basis === 'unavailable' ? refs.length === 0 : refs.length > 0, `${label}: WOSM basis requires its own source except when unavailable`);
    if (['field', 'history', 'blank'].includes(official.basis)) {
      check(refs.some(id => /^https:\/\/directory\.scout\.org\/organizations\/\d+\/detail$/.test(sourceById.get(id)?.url || '')), `${label}: WOSM directory basis needs a direct detail URL`);
    }
    if (official.basis === 'news') {
      check(refs.some(id => { try { const host = new URL(sourceById.get(id)?.url).hostname; return host === 'scout.org' || host.endsWith('.scout.org'); } catch { return false; } }), `${label}: WOSM news basis needs a World Scouting URL`);
    }
    check(official.note === null || bilingual(official.note), `${label}: invalid WOSM context note`);
    check(Array.isArray(official.noteSources) && (official.note ? official.noteSources.length > 0 : official.noteSources.length === 0), `${label}: WOSM context note and sources must be paired`);
    const sourcedDisputeNote = (bilingual(official.note) && Array.isArray(official.noteSources) && official.noteSources.length > 0)
      || (bilingual(item.membershipNote) && Array.isArray(item.membershipSources) && item.membershipSources.length > 0);
    check(official.dispute === undefined || (official.dispute === 'year' && sourcedDisputeNote), `${label}: year dispute needs an explanatory sourced note`);
  }
  // An empty array is valid when no accession year can be substantiated; do not
  // force contributors to invent a date merely to satisfy structural validation.
  check(Array.isArray(item.membershipYears) && item.membershipYears.every((y, i, years) => year(y) && (!i || years[i - 1] < y)), `${label}: invalid or unsorted membership years`);
  factSources(item, 'membershipSources', item.membershipYears?.length > 0 || item.membershipNote !== null, label);
  check(item.membershipNote === null || bilingual(item.membershipNote), `${label}: invalid membership note`);
  check(item.wikiFoundingLead === null || (typeof item.wikiFoundingLead === 'string' && item.wikiFoundingLead.trim()), `${label}: invalid Wikipedia research lead`);
  if (item.wikiFoundingLead) check(item.sources?.includes('wiki-members'), `${label}: Wikipedia research lead has no source`);
  if (item.startLead !== null) {
    check(item.scoutingStart === null && year(item.startLead?.year), `${label}: invalid unplotted prototype lead`);
    factSources(item.startLead, 'sources', true, label);
    for (const id of item.startLead?.sources || []) check(item.sources?.includes(id), `${label}: unlisted prototype lead source ${id}`);
  }
  check(typeof item.small === 'boolean', `${label}: missing small-area flag`);
  for (const field of ['name', 'nso', 'note']) check(bilingual(item[field]), `${label}: missing ${field} translation`);
  contentSources(item, label);
}
const jamborees = read('jamborees'); unique(jamborees, 'id', 'jamborees');
const editions = jamborees.filter(j => !j.cancelled).map(j => j.n).sort((a, b) => a - b);
check(editions.length === 26 && editions.every((n, index) => n === index + 1) && jamborees.filter(j => j.cancelled && j.year === 1979).length === 1, 'jamborees: expected editions 1–26 and one 1979 cancellation');
for (const item of jamborees) {
  const label = `jamboree ${item.id}`;
  check(year(item.year) && year(item.yearEnd) && item.yearEnd >= item.year, `${label}: invalid years`);
  check(coords(item.lon, item.lat), `${label}: invalid coordinates`);
  check(item.cancelled ? item.n === null : Number.isInteger(item.n) && item.n > 0, `${label}: invalid edition`);
  check(item.participants === null || (Number.isInteger(item.participants) && item.participants >= 0), `${label}: invalid participation`);
  check(bilingual(item.place) && bilingual(item.country), `${label}: missing translation`);
  contentSources(item, label);
}
const membership = read('membership'); unique(membership, 'year', 'membership');
check(membership.filter(row => Number.isFinite(row.members)).length >= 15, 'membership: fewer than 15 reported population points');
check(membership.some(row => row.year === 1907 && row.members === 20), 'membership: missing 1907 Brownsea baseline');
membership.forEach((row, index) => {
  const label = `membership ${row.year}`;
  check(year(row.year) && (!index || membership[index - 1].year < row.year), `${label}: invalid or unsorted year`);
  check(row.members === null || (Number.isInteger(row.members) && row.members >= 0), `${label}: invalid members`);
  check(row.countries === null || (Number.isInteger(row.countries) && row.countries >= 0), `${label}: invalid organisations`);
  check(row.members !== null || row.countries !== null, `${label}: no statistic`);
  check(['count', 'approx', 'at-least'].includes(row.precision), `${label}: invalid precision`);
  check(row.countries === null ? row.countriesPrecision === null : ['count', 'approx', 'at-least'].includes(row.countriesPrecision), `${label}: invalid organisation-count precision`);
  check(row.organisationNote === undefined || (row.countries !== null && bilingual(row.organisationNote)), `${label}: organisation note needs a count and both translations`);
  check(row.kind === undefined || row.kind === 'estimated-reach', `${label}: unknown measurement kind`);
  if (row.kind === 'estimated-reach') check(row.precision === 'approx' && Number.isFinite(row.members), `${label}: estimated reach needs an approximate member value`);
  contentSources(row, label);
});
if (errors.length) { for (const error of errors) console.error(`FAIL ${error}`); process.exitCode = 1; }
else console.log(`PASS: ${journey.length} stops, ${nso.length} directory entries (${nso.filter(item => item.scoutingStart !== null).length} provisionally plotted, ${nso.filter(item => item.wosmMembership?.year != null).length} with primary WOSM directory/news years), ${jamborees.length} jamborees/cancellation, ${membership.length} statistical rows, ${sources.length} sources; world map under 300 KiB and correctly wound.`);
console.log('NOTICE: Structure is valid; historical accuracy, coverage, source relevance, licences and release readiness require human verification.');
