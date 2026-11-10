// B-P Atlas v1.0 · © SCOUT SYSTEM
import { localize, t } from './i18n.js';

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
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
  line.append(document.createTextNode(`${localize(place, lang)} · ${localize(country, lang)}`));
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
function overview(container, state, data) {
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

export function renderCard(state, data, onNext) {
  const el = document.querySelector('#card-content'); el.replaceChildren();
  const { lang, selected } = state;
  if (!selected) { overview(el, state, data); return; }
  if (selected.type === 'stop') {
    const index = data.journey.findIndex(stop => stop.id === selected.id);
    const stop = data.journey[index];
    if (!stop) { overview(el, state, data); return; }
    const phaseKey = { early: 'phaseEarly', military: 'phaseMilitary', scouting: 'phaseScouting', later: 'phaseLater' }[stop.phase];
    el.append(heading(`${t('stopOf', lang)}  ${String(index + 1).padStart(2, '0')} / ${data.journey.length}`, t(phaseKey, lang)));
    el.append(yearLine(stop.year, stop.yearEnd), element('h2', '', localize(stop.title, lang)), placeLine(stop.place, stop.country, lang));
    el.append(element('p', 'card-body', localize(stop.body, lang)));
    if (stop.placeThen) el.append(element('p', 'card-note', `${t('then', lang)}${localize(stop.placeThen, lang)}`));
    footer(el, stop, data, lang, onNext, index < data.journey.length - 1); return;
  }
  if (selected.type === 'nso' || selected.type === 'nso-reference') {
    const nso = data.nso.find(n => n.id === selected.id);
    if (!nso) { overview(el, state, data); return; }
    const reference = selected.type === 'nso-reference';
    const sourceIndex = new Map(data.sources.map(source => [source.id, source]));
    el.append(heading(t('nsoIndex', lang), t('spreadTag', lang)));
    if (reference) el.append(element('p', 'reference-banner', t('directoryReference', lang)));
    else el.append(yearLine(nso.scoutingStart));
    el.append(element('h2', '', localize(nso.name, lang)), element('div', 'card-place', localize(nso.nso, lang)));
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
      context.append(element('p', '', localize(official.note, lang)), sourceBlock(official.noteSources, sourceIndex, lang, 'membership-context'));
      primary.append(context);
    }
    // Preserve older sources and visibly surface every additional year, without
    // assuming that an earlier claim is either a contradiction or a first admission.
    if (otherYears.length) fact('otherMembershipYears', otherYears.join(' / '), nso.membershipSources, 'membership', 'nso-fact-related');
    fact('scoutingStart', nso.scoutingStart == null ? '' : String(nso.scoutingStart), nso.scoutingStartSources, 'start');
    fact('orgFounded', localize(nso.organisationFounded, lang), nso.organisationFoundedSources, 'founding');
    el.append(facts, element('p', 'card-note membership-caveat', t('joinedCaveat', lang)));
    const body = [localize(nso.note, lang), localize(nso.membershipNote, lang)].filter(Boolean).join(' ');
    el.append(element('p', 'card-body', body));
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
  if (!event) { overview(el, state, data); return; }
  const future = event.year > new Date().getFullYear();
  const tag = event.cancelled ? t('eventCancelled', lang) : future ? t('eventPlanned', lang) : t('eventIndex', lang);
  el.append(heading(t('eventIndex', lang), tag), yearLine(event.year, event.yearEnd));
  el.append(element('h2', '', event.cancelled ? t('eventCancelled', lang) : t('eventNumber', lang, { n: event.n })), placeLine(event.place, event.country, lang));
  el.append(element('p', 'card-body', t(event.cancelled ? 'eventCancelledBody' : future ? 'eventFutureBody' : 'eventBody', lang)));
  if (event.participants != null) el.append(element('p', 'card-note', `${event.participants.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en')} ${t('participants', lang)} · ${t('draft', lang)}`));
  footer(el, event, data, lang, onNext, false);
}
