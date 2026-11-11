// B-P Atlas v1.2 · © SCOUT SYSTEM
import { localize, localizationLanguage, localeFor, t } from './i18n.js';
import { locationRecordYear, locationsRecordedBy } from './chronicles.js';
import { organizationsAtYear, formatValue } from './chart.js';

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}
function localizedElement(tag, className, value, lang) {
  const el = element(tag, className, localize(value, lang));
  const actual = localizationLanguage(value, lang); if (actual) el.lang = actual;
  return el;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${name}`); svg.append(use); return svg;
}
function sourceBlock(ids, sourceIndex, lang, slot = 'record') {
  const container = element('div', 'source-links');
  if (!ids.length) return container;
  container.append(element('span', '', `${t('source', lang)}：`));
  ids.forEach((id, index) => {
    const source = sourceIndex.get(id); if (!source) return;
    const link = element('a', '', String(index + 1));
    // Data is checked by scripts/validate.js; don't allow arbitrary URL schemes at runtime either.
    try {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol)) return;
      link.href = url.href;
    } catch { return; }
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.dataset.sourceId = id; link.dataset.sourceSlot = slot;
    link.title = localize(source.title, lang);
    link.setAttribute('aria-label', `${t('source', lang)}: ${localize(source.title, lang)}`);
    container.append(link);
  });
  container.append(icon('external'));
  return container;
}
function placeLine(place, country, lang) {
  const line = element('div', 'card-place');
  line.append(element('span', 'place-dot'));
  line.append(localizedElement('span', '', place, lang), document.createTextNode(' · '), localizedElement('span', '', country, lang));
  return line;
}
function heading(top, tag) {
  const row = element('div', 'card-top');
  row.append(element('span', 'card-index', top), element('span', 'card-phase', tag));
  return row;
}
function yearLine(year, yearEnd) {
  const line = element('div', 'card-year');
  line.append(document.createTextNode(String(year)));
  if (yearEnd && yearEnd !== year) line.append(element('span', 'card-year-range', ` — ${yearEnd}`));
  return line;
}
function footer(el, item, data, lang, onNext, showNext) {
  el.append(element('div', 'card-spacer'));
  const foot = element('div', 'card-footer');
  foot.append(sourceBlock(item.sources, new Map(data.sources.map(s => [s.id, s])), lang));
  if (showNext) {
    const next = element('button', 'next-story'); next.type = 'button';
    next.append(document.createTextNode(t('nextStory', lang)), icon('arrow'));
    next.addEventListener('click', onNext); foot.append(next);
  }
  el.append(foot);
  if (item.draft) el.append(element('div', 'draft-line', t('draft', lang)));
}
function memberOverview(container, state, data, onSelect, onYear) {
  const { lang, year } = state;
  const total = data.nso.filter(item => locationRecordYear(item, 'members') !== null).length;
  const count = locationsRecordedBy(data.nso, year).length;
  container.append(heading(t('membersIndex', lang), t('spreadTag', lang)), yearLine(year));
  container.append(element('h2', '', t('membersHeading', lang)));
  const stat = element('div', 'members-stat');
  stat.append(element('strong', '', String(count)), element('span', '', `${t('membersCount', lang)} ${t('membersCountDenominator', lang, { total })}`));
  container.append(stat, element('p', 'card-note membership-caveat', t('membersCaveat', lang)), element('p', 'card-body', t('membersBody', lang)));

  // Separately sourced historical count. It has a different scope from the
  // present-day directory dates above and is never used as the map's count.
  const reported = organizationsAtYear(data.membership, year);
  const picker = element('div', 'reported-year-picker');
  const label = element('label', '', t('reportedJump', lang)); label.htmlFor = 'reported-year-select';
  const select = element('select'); select.id = 'reported-year-select';
  const placeholder = element('option', '', t('reportedChoose', lang)); placeholder.value = ''; placeholder.disabled = true; select.append(placeholder);
  for (const row of data.membership.filter(item => Number.isFinite(item.countries) && item.year <= new Date().getFullYear())) {
    const option = element('option', '', `${row.year} · ${formatValue(organizationsAtYear(data.membership, row.year), lang)}`);
    option.value = String(row.year); select.append(option);
  }
  select.value = reported ? String(year) : '';
  select.addEventListener('change', () => { if (select.value) onYear(Number(select.value)); });
  picker.append(label, select); container.append(picker);
  if (reported) {
    const box = element('div', 'reported-stat');
    box.append(element('span', '', t('reportedCount', lang)), element('strong', '', formatValue(reported, lang)));
    if (reported.note) box.append(localizedElement('p', '', reported.note, lang));
    box.append(element('p', '', t('reportedCountCaveat', lang)));
    const row = data.membership.find(item => item.year === year && Number.isFinite(item.countries));
    box.append(sourceBlock(row.sources, new Map(data.sources.map(source => [source.id, source])), lang, 'reported-count'));
    container.append(box);
  }
  const listWrap = element('div', 'member-year-list');
  listWrap.append(element('h3', '', t('membersThisYear', lang)));
  const entries = data.nso.filter(item => locationRecordYear(item, 'members') === year);
  const collator = new Intl.Collator(localeFor(lang));
  entries.sort((a, b) => collator.compare(localize(a.name, lang), localize(b.name, lang)));
  if (!entries.length) listWrap.append(element('p', '', t('membersNoneThisYear', lang)));
  else {
    const list = element('ul', 'member-year-entries');
    for (const item of entries) {
      const li = element('li'), button = element('button', 'member-year-entry'); button.type = 'button'; button.dataset.nsoId = item.id;
      button.append(localizedElement('span', '', item.name, lang));
      if (item.wosmMembership.dispute === 'year') button.append(element('span', 'year-dispute', t('directoryYearDisputed', lang)));
      button.addEventListener('click', () => onSelect('nso', item.id)); li.append(button); list.append(li);
    }
    listWrap.append(list);
  }
  container.append(listWrap, element('div', 'draft-line', t('draft', lang)));
}

function eventOverview(container, state) {
  const { lang, year } = state;
  container.append(heading(t('eventIndex', lang), t('spreadTag', lang)), yearLine(year));
  container.append(element('h2', '', t('eventOverviewHeading', lang)), element('p', 'card-body', t('eventOverviewBody', lang)));
  container.append(element('p', 'card-note', t('eventRouteNote', lang)), element('div', 'draft-line', t('draft', lang)));
}

function earlyGroupsOverview(container, state, data) {
  const { lang, year } = state;
  const count = data.nso.filter(nso => nso.scoutingStart && nso.scoutingStart <= year).length;
  container.append(heading(t('spreadIndex', lang), t('spreadTag', lang)));
  container.append(yearLine(year), element('h2', '', t('spreadHeading', lang)), element('p', 'card-body', t('spreadBody', lang)));
  const art = element('div', 'empty-art');
  // Static, original line illustration; no user content is interpolated.
  art.innerHTML = '<svg viewBox="0 0 270 70" aria-hidden="true"><path d="M1 60c29-9 53-10 82-4 24 5 49 4 77-4 35-10 73-7 109 3M20 60l13-29 13 29M25 49h16M61 58l21-37 23 37M70 45h25M131 53l20-28 21 28M140 42h22M185 54l17-34 18 34M193 42h18M237 54l11-23 11 23"/><circle cx="120" cy="17" r="8"/><path d="M120 3v4M120 27v4M106 17h4M130 17h4M4 65h260"/></svg>';
  container.append(art, element('div', 'card-spacer'));
  const foot = element('div', 'overview-stat');
  foot.append(element('strong', '', String(count)), element('span', '', t('spreadCount', lang)));
  container.append(foot, element('p', 'card-note', t('spreadCaveat', lang)), element('div', 'draft-line', t('draft', lang)));
}


function overview(container, state, data, onSelect, onYear) {
  if (state.mode === 'members') memberOverview(container, state, data, onSelect, onYear);
  else if (state.mode === 'jamborees') eventOverview(container, state);
  else earlyGroupsOverview(container, state, data);
}

export function renderCard(state, data, { onNext, onSelect, onOverview, onYear }) {
  const el = document.querySelector('#card-content'); el.replaceChildren();
  const { lang, selected } = state;
  if (!selected) { overview(el, state, data, onSelect, onYear); return; }
  if (selected.type === 'stop') {
    const index = data.journey.findIndex(stop => stop.id === selected.id);
    const stop = data.journey[index];
    if (!stop) { overview(el, state, data, onSelect, onYear); return; }
    const phaseKey = { early: 'phaseEarly', military: 'phaseMilitary', scouting: 'phaseScouting', later: 'phaseLater' }[stop.phase];
    el.append(heading(`${t('stopOf', lang)}  ${String(index + 1).padStart(2, '0')} / ${data.journey.length}`, t(phaseKey, lang)));
    el.append(yearLine(stop.year, stop.yearEnd), localizedElement('h2', '', stop.title, lang), placeLine(stop.place, stop.country, lang));
    el.append(localizedElement('p', 'card-body', stop.body, lang));
    if (stop.placeThen) { const line = element('p', 'card-note', t('then', lang)); line.append(localizedElement('span', '', stop.placeThen, lang)); el.append(line); }
    footer(el, stop, data, lang, onNext, index < data.journey.length - 1); return;
  }
  if (selected.type === 'nso' || selected.type === 'nso-reference') {
    const nso = data.nso.find(n => n.id === selected.id);
    if (!nso) { overview(el, state, data, onSelect, onYear); return; }
    const reference = selected.type === 'nso-reference';
    const sourceIndex = new Map(data.sources.map(source => [source.id, source]));
    el.append(heading(t('nsoIndex', lang), t('spreadTag', lang)));
    if (reference) el.append(element('p', 'reference-banner', t('directoryReference', lang)));
    else el.append(yearLine(locationRecordYear(nso, state.mode)));
    const back = element('button', 'back-overview', t(state.mode === 'spread' ? 'backEarlyOverview' : 'backOverview', lang)); back.type = 'button';
    back.addEventListener('click', onOverview);
    el.append(localizedElement('h2', '', nso.name, lang), localizedElement('div', 'card-place', nso.nso, lang));
    if (reference) el.append(element('p', 'card-note reference-note', t('directoryReferenceNote', lang)));
    const facts = element('div', 'nso-facts');
    function fact(key, value, sources, slot, extraClass = '') {
      const node = element('div', `nso-fact ${extraClass}`.trim()); node.dataset.fact = slot;
      node.append(element('span', '', t(key, lang)), element('strong', '', value || t('unknown', lang)));
      if (sources.length) node.append(sourceBlock(sources, sourceIndex, lang, slot));
      facts.append(node); return node;
    }
    const official = nso.wosmMembership;
    const basisLabel = { field: 'wosmDirectoryYear', history: 'wosmHistoryYear', news: 'wosmNewsYear', blank: 'wosmDirectoryYear', unavailable: 'wosmUnverifiedYear' }[official.basis];
    const officialValue = official.year == null ? t(official.basis === 'blank' ? 'wosmNotStated' : 'unknown', lang) : String(official.year);
    const otherYears = nso.membershipYears.filter(year => year !== official.year);
    const primary = fact(basisLabel, officialValue, official.sources, 'wosm-membership', 'nso-fact-primary');
    const value = primary.querySelector('strong'), valueRow = element('div', 'wosm-value-row');
    value.replaceWith(valueRow); valueRow.append(value);
    if (official.dispute === 'year' || official.note || nso.membershipNote || otherYears.length) {
      valueRow.append(element('span', `membership-flag${official.dispute === 'year' ? ' is-disputed' : ''}`, t(official.dispute === 'year' ? 'yearDisputed' : 'membershipContextFlag', lang)));
    }
    if (official.note) {
      const context = element('div', 'wosm-context');
      context.append(localizedElement('p', '', official.note, lang), sourceBlock(official.noteSources, sourceIndex, lang, 'membership-context'));
      primary.append(context);
    }
    // Preserve older sources and visibly surface every additional year, without
    // assuming that an earlier claim is either a contradiction or a first admission.
    if (otherYears.length) fact('otherMembershipYears', otherYears.join(' / '), nso.membershipSources, 'membership', 'nso-fact-related');
    fact('scoutingStart', nso.scoutingStart == null ? '' : String(nso.scoutingStart), nso.scoutingStartSources, 'start');
    fact('orgFounded', localize(nso.organisationFounded, lang), nso.organisationFoundedSources, 'founding');
    el.append(facts, element('p', 'card-note membership-caveat', t('joinedCaveat', lang)), back);
    const body = element('p', 'card-body');
    for (const value of [nso.note, nso.membershipNote].filter(Boolean)) {
      if (body.childNodes.length) body.append(document.createTextNode(' '));
      body.append(localizedElement('span', '', value, lang));
    }
    el.append(body);
    if (!['zh', 'en'].includes(lang)) el.append(element('p', 'card-note translation-note', t('translationNote', lang)));
    if (nso.membershipNote) el.append(sourceBlock(nso.membershipSources, sourceIndex, lang, 'membership-note'));
    if (nso.wikiFoundingLead || nso.startLead) {
      const leads = element('details', 'research-leads');
      leads.append(element('summary', '', t('researchLeads', lang)));
      if (nso.wikiFoundingLead) {
        const value = lang === 'zh' ? nso.wikiFoundingLead.replace('1930s', '1930年代') : nso.wikiFoundingLead;
        leads.append(element('p', '', t('wikiFoundingLead', lang, { value })), sourceBlock(['wiki-members'], sourceIndex, lang, 'wiki-lead'));
      }
      if (nso.startLead) {
        leads.append(element('p', '', t('prototypeStartLead', lang, { year: nso.startLead.year })), sourceBlock(nso.startLead.sources, sourceIndex, lang, 'prototype-lead'));
      }
      el.append(leads);
    }
    footer(el, nso, data, lang, onNext, false); return;
  }
  const event = data.jamborees.find(j => j.id === selected.id);
  if (!event) { overview(el, state, data, onSelect, onYear); return; }
  const future = event.year > new Date().getFullYear();
  const tag = event.cancelled ? t('eventCancelled', lang) : future ? t('eventPlanned', lang) : t('eventHeld', lang);
  const availableCount = data.jamborees.filter(item => !item.cancelled && item.year <= new Date().getFullYear()).length;
  const index = event.cancelled ? '—' : String(event.n).padStart(2, '0');
  el.append(heading(`${t('eventStop', lang)}  ${index} / ${availableCount}`, tag), yearLine(event.year, event.yearEnd));
  el.append(element('h2', '', event.cancelled ? t('eventCancelled', lang) : t('eventNumber', lang, { n: event.n })), placeLine(event.place, event.country, lang));
  el.append(element('p', 'card-body', t(event.cancelled ? 'eventCancelledBody' : future ? 'eventFutureBody' : 'eventBody', lang)));
  if (event.participants != null) el.append(element('p', 'card-note', `${event.participants.toLocaleString(localeFor(lang))} ${t('participants', lang)} · ${t('draft', lang)}`));
  el.append(element('p', 'card-note event-route-note', t('eventRouteNote', lang)));
  const next = data.jamborees[data.jamborees.findIndex(item => item.id === event.id) + 1];
  footer(el, event, data, lang, onNext, Boolean(next && next.year <= new Date().getFullYear()));
}
