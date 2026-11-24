// B-P Atlas v1.3 · © SCOUT SYSTEM
// Story cards for the Hong Kong Scout-history view. Same visual language as
// js/card.js, but the content is Hong Kong specific and never reuses the world
// atlas's membership or jamboree records.
import { localize, localizationLanguage, localeFor, t } from './i18n.js';

// The atlas already loads data/sources.json; the Hong Kong cards reuse it so
// that every historical claim keeps a numbered, clickable citation.
let cachedSources = null;
function sourceIndex() {
  if (!cachedSources) cachedSources = new Map((globalThis.__bpSources || []).map(source => [source.id, source]));
  return cachedSources;
}
export function setHkSources(sources) { cachedSources = new Map(sources.map(source => [source.id, source])); }
// The district layer lives in its own file (data/hk-districts.json); the cards
// read it through this cache so every panel still takes (state, hk).
let cachedDistricts = null;
export function setHkDistricts(districts) { cachedDistricts = districts; }
function districtIndex() {
  if (!cachedDistricts) return new Map();
  return new Map(cachedDistricts.districts.map(district => [district.id, district]));
}
globalThis.__bpSources = globalThis.__bpSources || [];

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}
export function localizedElement(tag, className, value, lang) {
  const el = element(tag, className, localize(value, lang));
  const actual = localizationLanguage(value, lang); if (actual) el.lang = actual;
  return el;
}
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${name}`); svg.append(use); return svg;
}
function sourceBlock(ids, lang, slot) {
  const container = element('div', 'source-links');
  if (!ids?.length) return container;
  const index = sourceIndex();
  container.append(element('span', '', `${t('source', lang)}：`));
  let hasLink = false;
  ids.forEach((id, position) => {
    const source = index.get(id); if (!source) return;
    const label = localize(source.title, lang);
    let node = null;
    try {
      const url = new URL(source.url || '');
      if (['https:', 'http:'].includes(url.protocol)) {
        const link = element('a', '', String(position + 1));
        link.href = url.href;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.dataset.sourceId = id; link.dataset.sourceSlot = slot;
        link.title = label;
        link.setAttribute('aria-label', `${t('source', lang)}: ${label}`);
        node = link;
        hasLink = true;
      }
    } catch { /* no public url */ }
    if (!node) {
      node = element('span', 'source-text', String(position + 1));
      node.title = label;
      node.setAttribute('aria-label', `${t('source', lang)}: ${label}`);
    }
    container.append(node);
  });
  if (hasLink) container.append(icon('external'));
  return container;
}
function heading(top, tag) {
  const row = element('div', 'card-top');
  row.append(element('span', 'card-index', top), element('span', 'card-phase', tag));
  return row;
}
function yearLine(year, yearEnd, lang) {
  const line = element('div', 'card-year');
  // One continuous run of text: the end year inherits the same size and colour
  // so a two-year jamboree reads as "1961–1962" rather than two stacked years.
  line.append(document.createTextNode(String(year)));
  if (yearEnd && yearEnd !== year) line.append(document.createTextNode(`–${yearEnd}`));
  line.setAttribute('lang', localeFor(lang));
  return line;
}
function footer(el, item, lang, slot) {
  el.append(element('div', 'card-spacer'));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(item.sources, lang, slot));
  el.append(foot);
  el.append(element('div', 'draft-line', t('hkDraftCard', lang)));
}

// Panels are plain functions of (state, hk) and return DOM content.
function overview(state, hk) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-overview');
  wrap.append(heading(t('hkIndexLabel', lang), t('hkDraftTag', lang)));
  wrap.append(element('h2', '', t('hkHeading', lang)));
  wrap.append(element('p', 'card-body', t('hkBody', lang)));
  const stats = element('div', 'hk-stats');
  const stat = (value, label) => {
    const box = element('div', 'hk-stat');
    box.append(element('strong', '', String(value)), element('span', '', label));
    return box;
  };
  stats.append(
    stat(hk.regions.length, t('hkStatRegions', lang)),
    // 43 plotted districts plus Silver Jubilee, which has no territory.
    stat(hk.regions.reduce((sum, region) => sum + region.districts.length, 0), t('hkStatDistricts', lang)),
    stat(hk.boundaryChanges.length, t('hkStatChanges', lang)),
    stat(hk.jamborees.length, t('hkStatJamborees', lang)),
  );
  wrap.append(stats);
  const members = element('ul', 'hk-member-list');
  for (const region of hk.regions) {
    const item = element('li');
    const button = element('button', 'hk-member-button');
    button.type = 'button'; button.dataset.hkSelect = `region:${region.id}`;
    button.append(localizedElement('strong', '', region.name, lang));
    button.append(element('span', '', t('hkDistrictCount', lang, { count: region.districts.length })));
    item.append(button); members.append(item);
  }
  wrap.append(members);
  wrap.append(element('p', 'card-note', t('hkSchematicNote', lang)));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(['hk-regions', 'hk-wiki', 'hk-council-areas'], lang, 'overview'));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function regionCard(region, state, hk) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-region-card');
  wrap.append(heading(t('hkIndexLabel', lang), t('hkDraftTag', lang)));
  wrap.append(localizedElement('h2', '', region.name, lang));
  const meta = element('div', 'hk-meta');
  meta.append(element('span', '', t('hkFounded', lang, { year: region.founded })));
  wrap.append(meta);
  wrap.append(element('p', 'card-body', localize(region.foundedText, lang)));
  const hq = element('p', 'card-note hk-hq-note');
  hq.append(element('strong', '', `${t('hkHq', lang)}：`), document.createTextNode(localize(region.hq, lang)));
  wrap.append(hq);
  wrap.append(element('h3', 'hk-subheading', t('hkDistricts', lang)));
  const list = element('ul', 'hk-district-list');
  const districts = districtIndex();
  for (const district of region.districts) {
    // Region lists use the English display names; the district layer keeps the
    // same name under the same id, so match on either language.
    const record = [...districts.values()].find(item => item.region === region.id
      && (item.name.en === district.en || item.name.zh === district.zh));
    const item = element('li');
    if (record) {
      const button = element('button', 'hk-district-button');
      button.type = 'button';
      button.dataset.hkSelect = `district:${record.id}`;
      button.append(localizedElement('span', '', record.name, lang));
      const formedYear = record.originalFormed || record.formed;
      if (formedYear) button.append(element('span', 'hk-district-year', String(formedYear)));
      item.append(button);
    } else {
      item.append(localizedElement('span', '', district, lang));
    }
    item.dataset.district = localize(district, 'en');
    list.append(item);
  }
  wrap.append(list);
  wrap.append(element('p', 'card-note', localize(region.insight, lang)));
  if (Array.isArray(region.historicMaps) && region.historicMaps.length) {
    wrap.append(element('h3', 'hk-subheading', t('hkHistoricMaps', lang)));
    const maps = element('div', 'hk-historic-maps');
    for (const m of region.historicMaps) {
      const fig = element('figure', 'hk-historic-map');
      const img = element('img');
      img.src = m.src;
      img.alt = localize(m.title, lang);
      img.loading = 'lazy';
      img.decoding = 'async';
      fig.append(img);
      const cap = element('figcaption');
      cap.append(localizedElement('span', '', m.title, lang));
      if (m.source) cap.append(sourceBlock([m.source], lang, `map:${region.id}:${m.year}`));
      fig.append(cap);
      maps.append(fig);
    }
    wrap.append(maps);
  }
  wrap.append(element('p', 'card-note', t('hkSchematicNote', lang)));
  footer(wrap, region, lang, `region:${region.id}`);
  return wrap;
}

function districtCard(district, hk, state) {
  const lang = state.lang;
  const region = hk.regions.find(item => item.id === district.region);
  const wrap = element('div', 'hk-card hk-district-card');
  wrap.append(heading(t('hkDistrictTag', lang), t('hkDraftTag', lang)));
  wrap.append(localizedElement('h2', '', district.name, lang));
  const facts = element('dl', 'hk-facts');
  const fact = (term, value) => {
    facts.append(element('dt', '', `${term}：`));
    // Bilingual names go through localizedElement(); years and areas are plain
    // strings, which localize() would otherwise flatten to nothing.
    if (value && typeof value === 'object') facts.append(localizedElement('dd', '', value, lang));
    else facts.append(element('dd', '', String(value)));
  };
  fact(t('hkFormedLabel', lang), String(district.originalFormed || district.formed));
  if (region) fact(t('hkRegionLabel', lang), region.name);
  fact(t('hkDistrictArea', lang), `${district.area.toFixed(1)} km²`);
  wrap.append(facts);
  wrap.append(element('p', 'card-body', localize(district.note, lang)));
  wrap.append(element('p', 'card-note', t('hkSchematicNote', lang)));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(district.sources, lang, `district:${district.id}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function jamboreeCard(event, hk, state) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-jamboree-card');
  wrap.append(heading(`${t('hkJamboree', lang)} ${event.n}`, t('hkDraftTag', lang)));
  wrap.append(yearLine(event.year, event.yearEnd, lang));
  wrap.append(localizedElement('h2', '', event.name, lang));
  const place = element('div', 'card-place');
  place.append(element('span', 'place-dot'), localizedElement('span', '', event.place, lang));
  wrap.append(place);
  const facts = element('dl', 'hk-facts');
  // Bilingual history fields go through localizedElement(); plain strings
  // (numbers, "not recorded") are written as text.
  const textFact = (term, value) => {
    facts.append(element('dt', '', `${term}：`), element('dd', '', value));
  };
  const localizedFact = (term, value) => {
    facts.append(element('dt', '', `${term}：`), localizedElement('dd', '', value, lang));
  };
  localizedFact(t('hkDates', lang), event.dates);
  if (event.theme) localizedFact(t('hkTheme', lang), event.theme);
  localizedFact(t('hkPlace', lang), event.place);
  textFact(t('hkParticipants', lang), event.participants ? event.participants.toLocaleString(localeFor(lang)) : t('hkUnknown', lang));
  wrap.append(facts);
  wrap.append(element('p', 'card-body', localize(event.note, lang)));
  if (!event.area) wrap.append(element('p', 'card-note', t('hkNotOnMap', lang)));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(event.sources, lang, `jamboree:${event.id}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function changeCard(change, hk, state) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-change-card');
  wrap.append(heading(t('hkChangeTag', lang), t('hkDraftTag', lang)));
  wrap.append(element('h2', 'hk-year-heading', String(change.year)));
  const list = element('ul', 'hk-change-list');
  for (const entry of change.changes) list.append(localizedElement('li', '', entry, lang));
  wrap.append(list);
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(change.sources, lang, `change:${change.year}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function peopleCard(kind, hk, state) {
  const lang = state.lang;
  const office = hk.offices[kind === 'leaders' ? 'leader' : 'chief'];
  const rows = kind === 'leaders' ? hk.leaders : hk.chiefs;
  const wrap = element('div', 'hk-card hk-people-card');
  wrap.append(heading(t('hkPeopleTag', lang), t('hkDraftTag', lang)));
  wrap.append(localizedElement('h2', '', office.title, lang));
  wrap.append(element('p', 'card-note', localize(office.note, lang)));
  const list = element('ol', 'hk-people-list');
  for (const row of rows) {
    const item = element('li');
    item.append(element('span', 'hk-people-number', String(row.n)));
    item.append(localizedElement('strong', '', row.name, lang));
    item.append(element('span', 'hk-people-years', row.to ? `${row.from}–${row.to}` : `${row.from}–`));
    list.append(item);
  }
  wrap.append(list);
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(['hk-wiki'], lang, `people:${kind}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function timelineCard(hk, state) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-timeline-card');
  wrap.append(heading(t('hkMilestones', lang), t('hkDraftTag', lang)));
  wrap.append(element('h2', '', t('hkTimelineHeading', lang)));
  wrap.append(element('p', 'card-note', t('hkTimelineNote', lang)));
  const list = element('ol', 'hk-timeline-list');
  for (const entry of hk.timeline) {
    const item = element('li');
    const button = element('button', 'hk-timeline-entry');
    button.type = 'button'; button.dataset.hkSelect = `milestone:${entry.year}`;
    button.append(element('span', 'hk-timeline-year', String(entry.year)));
    button.append(localizedElement('strong', '', entry.title, lang));
    button.append(localizedElement('span', 'hk-timeline-body', entry.body, lang));
    item.append(button); list.append(item);
  }
  wrap.append(list);
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(['hk-wiki-history', 'hk-wiki', 'hk-ntr-overview'], lang, 'timeline'));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function milestoneCard(entry, hk, state) {
  const lang = state.lang;
  const wrap = element('div', 'hk-card hk-change-card');
  wrap.append(heading(t('hkMilestones', lang), t('hkDraftTag', lang)));
  wrap.append(element('h2', 'hk-year-heading', String(entry.year)));
  wrap.append(localizedElement('h3', '', entry.title, lang));
  wrap.append(element('p', 'card-body', localize(entry.body, lang)));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(entry.sources, lang, `milestone:${entry.year}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

function personCard(kind, row, hk, state) {
  const lang = state.lang;
  const office = hk.offices[kind === 'leader' ? 'leader' : 'chief'];
  const wrap = element('div', 'hk-card hk-person-card');
  wrap.append(heading(t(kind === 'leader' ? 'hkTabLeaders' : 'hkTabChiefs', lang), t('hkDraftTag', lang)));
  if (row.photo) {
    const img = element('img', 'hk-person-card-photo');
    img.src = row.photo;
    img.alt = localize(row.name, lang);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.width = 140; img.height = 175;
    img.addEventListener('error', () => img.remove(), { once: true });
    wrap.append(img);
  }
  wrap.append(localizedElement('h2', '', row.name, lang));
  const facts = element('dl', 'hk-facts');
  facts.append(element('dt', '', `${t('hkOfficeLabel', lang)}：`));
  facts.append(localizedElement('dd', '', office.title, lang));
  facts.append(element('dt', '', `${t('hkTermLabel', lang)}：`));
  facts.append(element('dd', '', row.to ? `${row.from}–${row.to}` : `${row.from}–`));
  if (kind === 'leader') {
    facts.append(element('dt', '', `${t('hkRoleLabel', lang)}：`));
    facts.append(element('dd', '', t(row.office === 'governor' ? 'hkGovernor' : 'hkChiefExecutive', lang)));
  }
  wrap.append(facts);
  wrap.append(element('p', 'card-note', localize(office.note, lang)));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(['hk-wiki'], lang, `person:${kind}:${row.n}`));
  wrap.append(foot);
  wrap.append(element('div', 'draft-line', t('hkDraftCard', lang)));
  return wrap;
}

export function renderHkCard(panel, state, hk) {
  panel.classList.toggle('hk-selected', Boolean(state.selected));
  const selected = state.selected;
  if (!selected) panel.append(overview(state, hk));
  else if (selected.kind === 'region') {
    const region = hk.regions.find(item => item.id === selected.id);
    if (region) panel.append(regionCard(region, state, hk));
  } else if (selected.kind === 'district') {
    const district = districtIndex().get(selected.id);
    if (district) panel.append(districtCard(district, hk, state));
  } else if (selected.kind === 'jamboree') {
    const event = hk.jamborees.find(item => item.id === selected.id);
    if (event) panel.append(jamboreeCard(event, hk, state));
  } else if (selected.kind === 'change') {
    const change = hk.boundaryChanges.find(item => item.year === selected.id);
    if (change) panel.append(changeCard(change, hk, state));
  } else if (selected.kind === 'leader' || selected.kind === 'chief') {
    const rows = selected.kind === 'leader' ? hk.leaders : hk.chiefs;
    const row = rows.find(item => item.n === selected.id);
    if (row) panel.append(personCard(selected.kind, row, hk, state));
    else panel.append(peopleCard(selected.kind === 'leader' ? 'leaders' : 'chiefs', hk, state));
  } else if (selected.kind === 'leaders' || selected.kind === 'chiefs') {
    panel.append(peopleCard(selected.kind, hk, state));
  } else if (selected.kind === 'timeline') {
    panel.append(timelineCard(hk, state));
  } else if (selected.kind === 'milestone') {
    const entry = hk.timeline.find(item => item.year === selected.id);
    if (entry) panel.append(milestoneCard(entry, hk, state));
  } else panel.append(overview(state, hk));
}
