// B-P Atlas v1.2 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultYearForMode, parseView, readState, selectionAtYear, stateToSearch } from '../js/state.js';
import { adjacentYear, locationRecordYear, locationsRecordedBy, recordedByYear, trackYears } from '../js/chronicles.js';
import { stopAtYear, adjacentStop } from '../js/journey.js';
import { formatValue, membershipAtYear, organizationsAtYear } from '../js/chart.js';
import { greatCircleKm } from '../js/map.js';
import { getInitialLanguage, localizationLanguage, localize, messageKeys, normalizeLanguage, SUPPORTED_LANGUAGES, t } from '../js/i18n.js';
import { extraLanguages, extraMessages } from '../js/translations.js';
import { enhanceLocalizedData } from '../js/data-translations.js';
const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const data = { journey: read('journey'), nso: read('nso'), jamborees: read('jamborees'), membership: read('membership') };

test('journey lookup respects years and stable order for same-year stops', () => {
  assert.equal(stopAtYear(data.journey, 1907).id, 'brownsea');
  assert.equal(stopAtYear(data.journey, 1912).id, 'parkstone');
  assert.equal(adjacentStop(data.journey, 'hong-kong', 1912, 1).id, 'parkstone');
  assert.equal(adjacentStop(data.journey, 'london-birth', 1857, -1).id, 'london-birth');
});
test('invalid camera input is rejected and valid inputs are clamped', () => {
  assert.deepEqual(parseView('NaN,3,4'), { k: 1, x: 0, y: 0 });
  assert.deepEqual(parseView('2,-10000,20'), { k: 2, x: -1000, y: 0 });
  assert.deepEqual(parseView('1,0,0,9'), { k: 1, x: 0, y: 0 });
});
test('legacy spread, story and camera links round-trip; old chart links migrate explicitly', () => {
  const params = new URLSearchParams('lang=en&year=2020&mode=spread&nso=HKG&view=2,-250,-200&orgs=1&jamborees=0&panel=story');
  const state = readState(params, data, 'en', 2026);
  assert.equal(state.year, 2020); assert.equal(state.mode, 'spread');
  assert.deepEqual(state.selected, { type: 'nso', id: 'HKG' });
  assert.deepEqual(state.view, { k: 2, x: -250, y: -200 }); assert.equal(state.panel, 'story');
  const migrated = new URLSearchParams(stateToSearch(state));
  assert.equal(migrated.has('orgs'), false); assert.equal(migrated.has('jamborees'), false);
  assert.deepEqual(readState(migrated, data, 'en', 2026), state);
  const oldChart = readState(new URLSearchParams('lang=en&year=2020&mode=spread&nso=HKG&view=2,-250,-200&orgs=1&panel=chart'), data, 'en', 2026);
  assert.equal(oldChart.mode, 'population'); assert.equal(oldChart.year, 2020); assert.equal(oldChart.selected, null);
  assert.deepEqual(readState(new URLSearchParams(stateToSearch(oldChart)), data, 'en', 2026), oldChart);
});
test('independent chronicles have meaningful defaults and round-trip', () => {
  assert.equal(defaultYearForMode('journey', data, 2026), 1907);
  assert.equal(defaultYearForMode('members', data, 2026), 1922);
  assert.equal(defaultYearForMode('jamborees', data, 2026), 1920);
  assert.equal(defaultYearForMode('population', data, 2026), 2025);
  for (const query of ['mode=members&year=2004&nso=NAM&view=2,-250,-200', 'mode=jamborees&year=1979&jamboree=jamboree-1979-cancelled', 'mode=population&year=2025']) {
    const state = readState(new URLSearchParams(query), data, 'en', 2026);
    assert.deepEqual(readState(new URLSearchParams(stateToSearch(state)), data, 'en', 2026), state, query);
  }
  assert.deepEqual(selectionAtYear(data, 'jamborees', 1979, 2026), { type: 'jamboree', id: 'jamboree-1979-cancelled' });
  assert.equal(selectionAtYear(data, 'jamborees', 1919, 2026), null);
});
test('member chronology only counts sourced WOSM dates for current entries, not early groups', () => {
  for (const [year, count] of [[1907, 0], [1922, 19], [1950, 40], [1980, 105], [2000, 139], [2024, 171]]) {
    assert.equal(locationsRecordedBy(data.nso, year).length, count, String(year));
  }
  const pakistan = data.nso.find(item => item.id === 'PAK');
  assert.equal(locationRecordYear(pakistan, 'members'), 1948); assert.equal(locationRecordYear(pakistan, 'spread'), null);
  assert.equal(recordedByYear(pakistan, 1947), false); assert.equal(recordedByYear(pakistan, 1948), true);
  const costaRica = data.nso.find(item => item.id === 'CRI');
  assert.equal(locationRecordYear(costaRica, 'members'), null);
  assert.equal(recordedByYear(costaRica, 2026), false, 'Historical alternatives must not fill a blank current date');
  assert.equal(data.nso.filter(item => locationRecordYear(item, 'members') !== null).length, 171);
  assert.equal(data.nso.filter(item => locationRecordYear(item, 'spread') !== null).length, 37);
  assert.notEqual(locationsRecordedBy(data.nso, 1922).length, organizationsAtYear(data.membership, 1922).value, 'A directory accumulation is not the historical source total');
});
test('record-year stepping is ordered, deduplicated and does not fabricate missing statistics', () => {
  const memberYears = trackYears(data, 'members', 2026), populationYears = trackYears(data, 'population', 2026), events = trackYears(data, 'jamborees', 2026);
  assert.equal(memberYears[0], 1922); assert.equal(memberYears.at(-1), 2025);
  assert.ok(memberYears.includes(2018) && memberYears.includes(2025), 'Reported totals remain reachable even without a directory date in that year');
  assert.equal(new Set(memberYears).size, memberYears.length);
  assert.equal(populationYears[0], 1907); assert.equal(populationYears.at(-1), 2025);
  assert.ok(!populationYears.includes(1971), 'An organisation-only row cannot become a population point');
  assert.ok(events.includes(1979)); assert.ok(!events.includes(2027));
  assert.equal(adjacentYear(populationYears, 1907, 1), 1922); assert.equal(adjacentYear(populationYears, 1923, -1), 1922);
  assert.equal(adjacentYear(memberYears, 2017, 1), 2018);
  assert.equal(adjacentYear(memberYears, 2024, 1), 2025);
  assert.equal(adjacentYear(memberYears, 2026, 1), null); assert.equal(adjacentYear(memberYears, 1857, -1), null);
});
test('deep links cannot select future events beyond the current year', () => {
  const state = readState(new URLSearchParams('year=9999&jamboree=jamboree-26'), data, 'zh', 2026);
  assert.equal(state.year, 2026); assert.notEqual(state.selected?.id, 'jamboree-26');
});
test('unknown selected ids and corrupt years fall back safely', () => {
  const state = readState(new URLSearchParams('year=not-a-year&stop=unknown&view=bad'), data, 'zh', 2026);
  assert.equal(state.year, 1907); assert.equal(state.selected.id, 'brownsea');
  assert.deepEqual(state.view, { k: 1, x: 0, y: 0 });
});
test('both chart series return only source points, with their own precision and scope', () => {
  const rows = read('membership');
  assert.deepEqual(membershipAtYear(rows, 1907), { value: 20, precision: 'count', year: 1907 });
  assert.equal(membershipAtYear(rows, 1923), null, 'Do not interpolate within the range');
  assert.equal(membershipAtYear(rows, 1971), null, 'An organisation-only row is not a people count');
  assert.equal(membershipAtYear(rows, 2013).precision, 'at-least');
  assert.equal(membershipAtYear(rows, 2025).precision, 'approx');
  assert.equal(membershipAtYear(rows, 2025).kind, 'estimated-reach');
  assert.equal(membershipAtYear(rows, 1906), null); assert.equal(membershipAtYear(rows, 2026), null);
  assert.deepEqual(organizationsAtYear(rows, 1971), { value: 100, precision: 'at-least', year: 1971 });
  assert.deepEqual(organizationsAtYear(rows, 2013), { value: 162, precision: 'count', year: 2013 });
  assert.deepEqual(organizationsAtYear(rows, 2025), { value: 176, precision: 'count', year: 2025 });
  assert.equal(organizationsAtYear(rows, 2024).value, 175);
  assert.match(organizationsAtYear(rows, 2024).note.en, /10 August.*176/);
  assert.ok(rows.find(row => row.year === 2024).sources.includes('wosm-albania-176'));
  assert.equal(organizationsAtYear(rows, 1923), null); assert.equal(organizationsAtYear(rows, 1931), null);
  assert.equal(organizationsAtYear(rows, 1906), null); assert.equal(organizationsAtYear(rows, 2026), null);
});

test('WOSM audit matches every location, source, basis and selected unresolved conflicts', () => {
  const text = readFileSync(new URL('../docs/research/wosm-directory-audit-2026-11.tsv', import.meta.url), 'utf8').trim().split('\n');
  assert.equal(text.shift(), 'location_id\tdirectory_id\tyear\tbasis');
  const audit = text.map(line => line.split('\t'));
  assert.equal(audit.length, data.nso.length);
  assert.equal(new Set(audit.map(row => row[0])).size, data.nso.length);
  const sourceIndex = new Map(read('sources').map(source => [source.id, source]));
  for (const [id, directoryId, value, basis] of audit) {
    const entry = data.nso.find(item => item.id === id);
    assert.ok(entry, `Missing ${id}`);
    const primary = entry.wosmMembership;
    assert.equal(primary.basis, basis, id);
    assert.equal(primary.year, value === 'null' ? null : Number(value), id);
    if (['field', 'history', 'blank'].includes(basis)) {
      assert.equal(sourceIndex.get(primary.sources[0]).url, `https://directory.scout.org/organizations/${directoryId}/detail`, id);
    } else if (basis === 'news') {
      assert.match(sourceIndex.get(primary.sources[0]).url, /^https:\/\/www\.scout\.org\//);
    } else assert.deepEqual(primary.sources, [], id);
  }
  const byId = new Map(data.nso.map(item => [item.id, item]));
  assert.deepEqual(byId.get('SVN').membershipYears, [1994]);
  assert.equal(byId.get('SVN').wosmMembership.year, 1997);
  assert.match(byId.get('SVN').wosmMembership.note.en, /disagreement remains unresolved/i);
  assert.match(byId.get('MOZ').wosmMembership.note.en, /1999.*1990.*1994/);
  for (const id of ['SVN', 'MOZ', 'PNG', 'IDN', 'PHL', 'SYC', 'BLR', 'BWA', 'BDI', 'CPV', 'TCD', 'COD', 'DOM', 'ETH', 'NIC', 'PAN', 'VCT', 'ZWE', 'CRI']) {
    assert.equal(byId.get(id).wosmMembership.dispute, 'year', `${id} has an explicitly documented year conflict`);
  }
  // Unflagged alternative dates are not thereby confirmed, reconciled or disproved.
  for (const id of ['JPN', 'MCO', 'SMR', 'PSE', 'NAM']) {
    assert.equal(byId.get(id).wosmMembership.dispute, undefined, `${id} is not an explicitly classified dispute`);
    assert.ok(byId.get(id).membershipYears.some(year => year !== byId.get(id).wosmMembership.year));
  }
  const seychelles = byId.get('SYC');
  assert.equal(seychelles.wosmMembership.year, 2016);
  assert.equal(seychelles.wosmMembership.basis, 'field');
  assert.deepEqual(seychelles.membershipYears, [1927, 2002, 2016]);
  assert.match(seychelles.membershipNote.en, /Wikipedia.*1927.*joining-year column/);
  assert.match(seychelles.wosmMembership.note.en, /Africa report lists 2002.*accreditation in 2002.*full membership in 2016.*remains unverified/i);
  assert.deepEqual(seychelles.wosmMembership.noteSources, ['wosm-africa-report-2022-25', 'wosm-seychelles']);
  assert.ok(seychelles.membershipSources.includes('wosm-africa-report-2022-25'));
  // The notes themselves cite Wikipedia, so the links must appear next to those notes,
  // not only in the record-wide bibliography or the unrelated founding-lead section.
  for (const id of ['ALB', 'AUS', 'BLR', 'IDN', 'COG', 'SYC']) {
    assert.match(byId.get(id).membershipNote.en, /Wikipedia/);
    assert.ok(byId.get(id).membershipSources.includes('wiki-members'), `${id}: membership note must directly cite Wikipedia`);
  }
  assert.deepEqual(byId.get('BLR').membershipYears, [1989, 1998, 2010]);
  assert.match(byId.get('BLR').membershipNote.en, /1989.*discrepancy remains unresolved/i);
  assert.match(byId.get('SMR').wosmMembership.note.en, /accredited in 1990.*member in 2017/);
  assert.ok(byId.get('SMR').wosmMembership.noteSources.includes('wosm-san-marino-2017'));
  assert.deepEqual(byId.get('PSE').membershipYears, [1996, 2016]);
  assert.match(byId.get('PSE').wosmMembership.note.en, /without voting rights in 1996.*full membership in 2016/);
  assert.ok(byId.get('PSE').wosmMembership.noteSources.includes('wosm-baku-2017-membership'));
  assert.deepEqual(byId.get('CPV').membershipYears, [1992, 2002]);
  assert.match(byId.get('CPV').wosmMembership.note.en, /1992.*2002.*domestic legal recognition/);
  assert.ok(byId.get('CPV').wosmMembership.noteSources.includes('wosm-africa-report-2022-25'));
  assert.deepEqual(byId.get('NIC').membershipYears, [1946, 1948]);
  assert.match(byId.get('PAN').wosmMembership.note.en, /1924–1936.*1950.*1955/);
  const costaRica = byId.get('CRI');
  assert.equal(costaRica.wosmMembership.year, null, 'Historic WOSM tables must not fill a blank directory field');
  assert.deepEqual(costaRica.membershipYears, [1925, 1935]);
  assert.deepEqual(costaRica.wosmMembership.noteSources, ['wosm-statistics-2007', 'wosm-statistics-2010']);
  for (const id of ['ESP', 'URY', 'VEN', 'SDN']) {
    const entry = byId.get(id);
    assert.equal(entry.wosmMembership.year, null, `${id}: leave the current detail blank or unavailable`);
    assert.ok(entry.wosmMembership.noteSources.includes('wosm-statistics-2010'), `${id}: cite the historical claim separately`);
  }
  const canada = byId.get('CAN');
  assert.equal(canada.wosmMembership.year, 1946);
  assert.match(canada.wosmMembership.note.en, /Association des Scouts du Canada.*does not state a separate joining year/i);
  assert.equal(sourceIndex.get('wosm-canada-special-case').url, 'https://directory.scout.org/organizations/34/detail');
  assert.ok(canada.wosmMembership.noteSources.includes('wosm-canada-special-case'));
  assert.equal(byId.get('LBN').wosmMembership.basis, 'history');
  assert.equal(byId.get('SLB').wosmMembership.basis, 'news');
  assert.equal(byId.get('SDN').wosmMembership.year, null);
  assert.deepEqual(byId.get('SDN').membershipYears, [1956]);
  assert.equal(data.nso.filter(item => item.wosmMembership.year != null).length, 171);
});

test('legacy selections migrate to their own chronicle without inventing dates', () => {
  const undated = readState(new URLSearchParams('year=2026&mode=spread&nso=PAK'), data, 'en', 2026);
  assert.equal(undated.selected, null);
  const cancelled = readState(new URLSearchParams('year=1920&jamboree=jamboree-1979-cancelled&jamborees=0'), data, 'en', 2026);
  assert.equal(cancelled.year, 1979); assert.equal(cancelled.mode, 'jamborees');
  assert.deepEqual(cancelled.selected, { type: 'jamboree', id: 'jamboree-1979-cancelled' });
  const wosm = readState(new URLSearchParams('year=1907&mode=members&nso=PAK'), data, 'en', 2026);
  assert.equal(wosm.year, 1948); assert.deepEqual(wosm.selected, { type: 'nso', id: 'PAK' });
  assert.equal(readState(new URLSearchParams('year=2026&mode=members&nso=CRI'), data, 'en', 2026).selected, null);
  assert.deepEqual(readState(new URLSearchParams(stateToSearch(cancelled)), data, 'en', 2026), cancelled);
});
test('directory references round-trip without changing the timeline or becoming historical selections', () => {
  const reference = readState(new URLSearchParams('year=1907&mode=journey&nso=PAK&ref=1&view=2,-250,-200'), data, 'en', 2026);
  assert.equal(reference.year, 1907);
  assert.equal(reference.mode, 'spread');
  assert.deepEqual(reference.selected, { type: 'nso-reference', id: 'PAK' });
  assert.deepEqual(reference.view, { k: 2, x: -250, y: -200 });
  assert.deepEqual(readState(new URLSearchParams(stateToSearch(reference)), data, 'en', 2026), reference);

  const futureGroup = readState(new URLSearchParams('year=1907&nso=JPN&ref=1'), data, 'en', 2026);
  assert.equal(futureGroup.year, 1907);
  assert.deepEqual(futureGroup.selected, { type: 'nso-reference', id: 'JPN' });
  const historical = readState(new URLSearchParams('year=1907&nso=JPN'), data, 'en', 2026);
  assert.equal(historical.year, data.nso.find(item => item.id === 'JPN').scoutingStart);
  assert.deepEqual(historical.selected, { type: 'nso', id: 'JPN' });
  assert.equal(new URLSearchParams(stateToSearch(historical)).has('ref'), false);
  assert.equal(readState(new URLSearchParams('year=1907&mode=spread&nso=PAK&ref=0'), data, 'en', 2026).selected, null);
  assert.equal(readState(new URLSearchParams('year=1907&mode=spread&nso=UNKNOWN&ref=1'), data, 'en', 2026).selected, null);
});
test('validation permits unknown accession dates but requires evidence for claimed dates', t => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const temp = mkdtempSync(path.join(tmpdir(), 'bp-validate-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  cpSync(path.join(root, 'data'), path.join(temp, 'data'), { recursive: true });
  mkdirSync(path.join(temp, 'scripts')); mkdirSync(path.join(temp, 'vendor'));
  copyFileSync(path.join(root, 'scripts/validate.js'), path.join(temp, 'scripts/validate.js'));
  copyFileSync(path.join(root, 'vendor/geography.min.js'), path.join(temp, 'vendor/geography.min.js'));
  copyFileSync(path.join(root, 'package.json'), path.join(temp, 'package.json'));
  const recordsPath = path.join(temp, 'data/nso.json');
  const records = JSON.parse(readFileSync(recordsPath, 'utf8'));
  const pakistan = records.find(item => item.id === 'PAK');
  const validate = () => {
    writeFileSync(recordsPath, JSON.stringify(records));
    return spawnSync(process.execPath, [path.join(temp, 'scripts/validate.js')], { encoding: 'utf8' });
  };
  pakistan.membershipYears = []; pakistan.membershipSources = []; pakistan.wikiFoundingLead = null;
  pakistan.wosmMembership = { year: null, basis: 'unavailable', sources: [], note: null, noteSources: [] };
  let result = validate();
  assert.equal(result.status, 0, result.stderr);
  pakistan.membershipYears = [1948];
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /nso PAK: missing membershipSources/);
  pakistan.membershipYears = []; pakistan.wosmMembership.year = 1948;
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /WOSM membership year does not match basis/);
  pakistan.wosmMembership.basis = 'field'; pakistan.wosmMembership.sources = ['wiki-members'];
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /WOSM directory basis needs a direct detail URL/);
  pakistan.wosmMembership = { year: null, basis: 'unavailable', sources: [], note: null, noteSources: [], dispute: 'year' };
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /year dispute needs an explanatory sourced note/);
  pakistan.membershipNote = { zh: '有差異', en: 'A difference' };
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /year dispute needs an explanatory sourced note/);
  delete pakistan.wosmMembership.dispute;
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /nso PAK: missing membershipSources/, 'A membership note needs sources even without reported years');
  pakistan.wosmMembership.dispute = 'year';
  pakistan.membershipSources = ['wiki-members'];
  result = validate();
  assert.equal(result.status, 0, result.stderr);
  pakistan.wosmMembership.dispute = 'something-else';
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /year dispute needs an explanatory sourced note/);
  delete pakistan.wosmMembership.dispute;
  pakistan.scoutingStartSources = ['wiki-members'];
  result = validate();
  assert.notEqual(result.status, 0); assert.match(result.stderr, /undated record must not pretend to have a plotted start/);
});
test('static guard rejects stale runtime versions and missing translation keys', t => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const temp = mkdtempSync(path.join(tmpdir(), 'bp-guard-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const excluded = new Set(['.git', 'node_modules', '.screenshots', '.vercel', 'coverage', 'dist', 'test-results', 'playwright-report']);
  cpSync(root, temp, { recursive: true, filter: source => !excluded.has(path.basename(source)) });
  const guard = () => spawnSync(process.execPath, [path.join(temp, 'scripts/guard.mjs')], { encoding: 'utf8' });
  assert.equal(guard().status, 0, 'The unmodified temporary snapshot should pass');
  const dictionary = path.join(temp, 'js/i18n.js'), original = readFileSync(dictionary, 'utf8');
  writeFileSync(dictionary, original.replace('  journeyMode:', '  missingJourneyMode:'));
  const missing = guard(); assert.notEqual(missing.status, 0); assert.match(missing.stderr, /missing translation key journeyMode/);
  writeFileSync(dictionary, original);
  const chart = path.join(temp, 'js/chart.js');
  writeFileSync(chart, `${readFileSync(chart, 'utf8')}\n// v1.0 stale version test\n`);
  const stale = guard(); assert.notEqual(stale.status, 0); assert.match(stale.stderr, /stale or inconsistent version v1\.0/);
});
test('a scale sample measures a short geodesic, including across the date line', () => {
  assert.equal(greatCircleKm([0, 0], [0, 0]), 0);
  assert.ok(Math.abs(greatCircleKm([0, 0], [0, 1]) - 111.2) < 0.2);
  assert.ok(Math.abs(greatCircleKm([179, 0], [-179, 0]) - 222.4) < 0.3);
});
test('explicit language wins; without it the browser language takes precedence over storage', () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-US' } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'zh' } });
    assert.equal(getInitialLanguage(new URLSearchParams('')), 'en');
    assert.equal(getInitialLanguage(new URLSearchParams('lang=zh')), 'zh');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'zh-HK' } });
    assert.equal(getInitialLanguage(new URLSearchParams('lang=invalid')), 'zh');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: '' } });
    assert.equal(getInitialLanguage(new URLSearchParams('')), 'zh');
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor); else delete globalThis.navigator;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage;
  }
});


test('all interface messages and substitution tokens exist in the seven additional languages', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['zh', 'en', 'ja', 'ko', 'fr', 'es', 'id', 'pt', 'hi']);
  assert.deepEqual(new Set(Object.keys(extraMessages)), new Set(messageKeys));
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const key of messageKeys) for (const [index, lang] of extraLanguages.entries()) {
    const translation = extraMessages[key][index];
    assert.ok(typeof translation === 'string' && translation.trim(), `${key}: ${lang}`);
    assert.deepEqual(placeholders(translation), placeholders(t(key, 'en')), `${key}: ${lang} placeholders`);
    assert.equal(t(key, lang), translation);
  }
  assert.match(t('eventNumber', 'hi', { n: 12 }), /12/);
  assert.match(t('populationSpacing', 'en'), /not elapsed time.*not zero.*too small/i);
});

test('non-Chinese data falls back to English with an accurate language tag', () => {
  const bilingual = { zh: '中文', en: 'English source' };
  assert.equal(localize(bilingual, 'ja'), 'English source');
  assert.equal(localizationLanguage(bilingual, 'ja'), 'en');
  assert.equal(localize(bilingual, 'zh'), '中文');
  assert.equal(localizationLanguage(bilingual, 'zh'), 'zh-Hant-HK');
  assert.equal(localize({ zh: '中文' }, 'ko'), '中文');
  assert.equal(localizationLanguage({ zh: '中文' }, 'ko'), 'zh-Hant-HK');
  assert.equal(normalizeLanguage('PT-br'), 'pt');
  assert.equal(normalizeLanguage('ja_JP'), 'ja');
  assert.equal(normalizeLanguage('de-DE'), null);
  assert.match(formatValue({ value: 40000000, precision: 'at-least' }, 'ja'), /40,000,000超/);
  assert.match(formatValue({ value: 40000000, precision: 'at-least' }, 'hi'), /4,00,00,000 से अधिक/);
  assert.match(formatValue({ value: 60000000, precision: 'approx' }, 'fr'), /^environ /);
});

test('display translations preserve records and multi-territory scope', () => {
  const source = structuredClone(data), translated = enhanceLocalizedData(structuredClone(data));
  for (const stop of translated.journey) for (const lang of extraLanguages) {
    assert.ok(stop.title[lang] && stop.body[lang], `${stop.id} ${lang}`);
    const original = source.journey.find(entry => entry.id === stop.id);
    assert.deepEqual(stop.sources, original.sources); assert.equal(stop.year, original.year);
  }
  for (const item of translated.nso) {
    const original = source.nso.find(entry => entry.id === item.id);
    assert.deepEqual(item.wosmMembership, original.wosmMembership);
    assert.deepEqual(item.membershipYears, original.membershipYears);
    assert.equal(item.name.en, original.name.en);
  }
  const combined = translated.nso.find(entry => entry.id === 'CUW');
  assert.match(combined.name.fr, /Curaçao.*Saint-Martin.*Pays-Bas/i);
  assert.match(combined.name.en, /Curaçao.*Sint Maarten.*Caribbean Netherlands/);
  for (const row of translated.membership) {
    const original = source.membership.find(entry => entry.year === row.year);
    assert.equal(row.members, original.members); assert.equal(row.countries, original.countries);
    assert.equal(row.precision, original.precision); assert.deepEqual(row.sources, original.sources);
  }
  assert.ok(translated.membership.find(row => row.year === 2024).organisationNote.ja);
});

test('language selection respects URL, ordered browser preferences, fallback and blocked storage', () => {
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'de-DE', languages: ['de-DE', 'fr-CA', 'en-US'] } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'ko' } });
    assert.equal(getInitialLanguage(new URLSearchParams('')), 'fr');
    assert.equal(getInitialLanguage(new URLSearchParams('lang=pt-BR')), 'pt');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'de-DE', languages: ['de-DE'] } });
    assert.equal(getInitialLanguage(new URLSearchParams('lang=invalid')), 'en');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: '' } });
    assert.equal(getInitialLanguage(new URLSearchParams('')), 'ko');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.equal(getInitialLanguage(new URLSearchParams('')), 'zh');
  } finally {
    if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage;
  }
});
