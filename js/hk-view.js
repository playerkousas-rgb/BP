// B-P Atlas v1.3 · © SCOUT SYSTEM
// Controls the standalone Hong Kong Scout-history page: one year band drives
// the map, the region directory, the jamboree table and the milestone list
// together, and one story card explains whatever is selected. All text comes
// from data/hk.json, data/hk-areas.json and data/sources.json.
import { applyLanguage, getInitialLanguage, localize, localizationLanguage, localeFor, t } from './i18n.js';
import { clamp } from './state.js';
import { createHkMap } from './hk-map.js';
import { renderHkCard, setHkSources } from './hk-card.js';

const MIN_YEAR = 1909;
const MAX_YEAR = Math.max(new Date().getFullYear(), 2026);
const TABS = ['map', 'regions', 'boundaries', 'jamborees', 'leaders', 'chiefs', 'timeline'];
// Tabs whose main section is itself a full list, so the story card is hidden.
const FULL_WIDTH_TABS = new Set(['leaders', 'chiefs', 'timeline']);
const SELECTIONS = {
  map: () => true,
  regions: kind => kind === 'region' || kind === 'area',
  boundaries: kind => kind === 'change',
  jamborees: kind => kind === 'jamboree',
  leaders: () => false, chiefs: () => false, timeline: kind => kind === 'milestone',
};

export function readHkState(params, maxYear = MAX_YEAR) {
  const requested = params.get('hk');
  const tab = TABS.includes(requested) ? requested : 'map';
  const rawYear = params.get('year');
  const year = rawYear && /^\d{4}$/.test(rawYear) ? clamp(Number(rawYear), MIN_YEAR, maxYear) : null;
  const rawSelection = params.get('sel');
  let selected = null;
  if (rawSelection) {
    const [kind, ...rest] = rawSelection.split(':');
    const value = rest.join(':');
    if ((kind === 'region' || kind === 'area' || kind === 'jamboree') && value) selected = { kind, id: value };
    else if (kind === 'change' && /^\d{4}$/.test(value)) selected = { kind, id: Number(value) };
    else if (kind === 'milestone' && /^\d{4}$/.test(value)) selected = { kind, id: Number(value) };
  }
  // A selection from another tab would show a card for an invisible list item.
  if (selected && !SELECTIONS[tab](selected.kind)) selected = null;
  return { tab, year, selected };
}

export function hkStateToSearch(state, lang) {
  const params = new URLSearchParams();
  params.set('lang', lang);
  params.set('hk', state.tab);
  if (state.year != null) params.set('year', String(state.year));
  if (state.selected) params.set('sel', `${state.selected.kind}:${state.selected.id}`);
  return params.toString();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function localized(tag, className, value, lang) {
  const node = element(tag, className, localize(value, lang));
  const actual = localizationLanguage(value, lang); if (actual) node.lang = actual;
  return node;
}

export async function startHkView({ params, data }) {
  const areas = data.hkAreas;
  const hk = data.hk;
  const sources = data.sources;
  const sourceIndex = new Map(sources.map(source => [source.id, source]));
  setHkSources(sources);
  let lang = getInitialLanguage(params);
  const state = readHkState(params);
  state.lang = lang;
  state.focusArea = null;

  const tabsNav = document.querySelector('#hk-tabs');
  // Map, regions, boundaries and jamborees each pair a list with a story
  // card; the map section has its own panel under the map.
  const panel = document.querySelector('#hk-section-map #hk-panel');
  const fullWidthNodes = [...document.querySelectorAll('[data-hk-section]')];

  const map = createHkMap(areas, hk, {
    onSelect(selection) {
      if (!selection) return;
      select(selection);
    },
  });

  function sourceLinks(ids) {
    const box = element('span', 'hk-source-links');
    for (const id of ids) {
      const source = sourceIndex.get(id);
      if (!source) continue;
      const link = element('a', '', localize(source.title, lang));
      try {
        const url = new URL(source.url);
        if (!['https:', 'http:'].includes(url.protocol)) continue;
        link.href = url.href;
      } catch { continue; }
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      const actual = localizationLanguage(source.title, lang); if (actual) link.lang = actual;
      box.append(link);
    }
    return box;
  }

  function updateUrl() {
    try {
      history.replaceState(null, '', `${location.pathname}?${hkStateToSearch(state, lang)}${location.hash}`);
    } catch { /* URL syncing is optional in restricted contexts. */ }
  }

  function areaCentre(code) {
    const feature = areas.features.find(item => item.id === code);
    if (!feature) return null;
    const rings = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
    let lon = 0, lat = 0, count = 0;
    for (const ring of rings) for (const point of ring) { lon += point[0]; lat += point[1]; count++; }
    return count ? [lon / count, lat / count] : null;
  }

  function revealSelection() {
    if (state.selected?.kind === 'jamboree') {
      const event = hk.jamborees.find(item => item.id === state.selected.id);
      if (event?.coordinate) map.reveal(event.coordinate);
    } else if (state.selected?.kind === 'area') {
      const centre = areaCentre(state.selected.id);
      if (centre) map.reveal(centre);
    }
  }

  function select(selection) {
    state.selected = selection;
    state.focusArea = selection?.kind === 'area' ? selection.id : null;
    if (selection?.kind === 'jamboree') {
      const event = hk.jamborees.find(item => item.id === selection.id);
      if (event) state.year = event.year;
    } else if (selection?.kind === 'milestone') {
      state.year = selection.id;
    }
    revealSelection();
    render();
  }

  let tabScrollDone = false;
  function renderTabs() {
    for (const button of tabsNav.querySelectorAll('[data-hk-tab]')) {
      const active = button.dataset.hkTab === state.tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    // On a narrow screen the tab strip scrolls; bring the active tab into view
    // once at start-up so the open section is never hidden off the edge.
    if (!tabScrollDone) {
      tabScrollDone = true;
      tabsNav.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    updateTabEdges();
  }

  // Fade the edge that still has tabs behind it, so a clipped label reads as
  // "scroll for more" instead of a broken line of text.
  function updateTabEdges() {
    const wrap = tabsNav.parentElement;
    if (!wrap?.classList.contains('hk-tabs-wrap')) return;
    wrap.classList.toggle('can-scroll-left', tabsNav.scrollLeft > 2);
    wrap.classList.toggle('can-scroll-right', tabsNav.scrollLeft + tabsNav.clientWidth < tabsNav.scrollWidth - 2);
  }

  function renderSummary() {
    const label = state.year == null ? t('hkAllYears', lang) : String(state.year);
    document.querySelector('#hk-year-label').textContent = label;
    const inHongKong = hk.jamborees.filter(event => event.area).length;
    document.querySelector('#hk-map-note').textContent = t('hkMapNote', lang, { count: inHongKong });
    const slider = document.querySelector('#hk-year-range');
    slider.value = String(state.year ?? MIN_YEAR);
    slider.setAttribute('aria-valuetext', label);
    document.querySelector('#hk-year-clear').hidden = state.year == null;
    const all = document.querySelector('#hk-year-all');
    all.setAttribute('aria-pressed', String(state.year == null));
    all.classList.toggle('is-active', state.year == null);
    for (const button of document.querySelectorAll('[data-hk-year]')) {
      button.classList.toggle('is-active', state.year === Number(button.dataset.hkYear));
      button.setAttribute('aria-pressed', String(state.year === Number(button.dataset.hkYear)));
    }
    document.querySelector('#hk-figures').textContent = t('hkFigures', lang);
  }

  // The rail under the map is a compact directory of what the map shows.
  function renderRail() {
    const list = document.querySelector('#hk-rail-list');
    list.replaceChildren();
    const entry = (button, className) => {
      const item = element('li', className || '');
      item.append(button); list.append(item);
      return button;
    };
    for (const region of hk.regions) {
      const button = element('button', 'hk-rail-region');
      button.type = 'button'; button.dataset.hkSelect = `region:${region.id}`;
      button.append(localized('strong', '', region.name, lang));
      // 銀禧區 has no Council outline, so its count is the only map clue.
      button.append(element('span', '', t('hkDistrictCount', lang, { count: region.districts.length })));
      button.classList.toggle('is-selected', state.selected?.kind === 'region' && state.selected.id === region.id);
      entry(button);
    }
    // The explanatory note belongs in the list, not beside it, so the markup
    // stays a valid list of regions.
    const noteItem = element('li', 'hk-rail-note-item');
    const note = element('p', 'hk-rail-note');
    note.append(document.createTextNode(t('hkRailNote', lang)), document.createTextNode(' '), document.createTextNode(t('hkBoundaryNote', lang)));
    noteItem.append(note);
    list.append(noteItem);
  }

  function renderMain() {
    document.querySelectorAll('[data-hk-section]').forEach(section => {
      section.hidden = section.dataset.hkSection !== state.tab;
    });
    if (state.tab === 'map') { map.render(state); renderRail(); }
    else if (state.tab === 'regions') renderRegions();
    else if (state.tab === 'boundaries') renderBoundaries();
    else if (state.tab === 'jamborees') renderJamborees();
    else if (state.tab === 'leaders' || state.tab === 'chiefs') renderPeople(state.tab);
    else if (state.tab === 'timeline') renderTimeline();
    const full = FULL_WIDTH_TABS.has(state.tab);
    for (const section of fullWidthNodes) section.classList.toggle('hk-full-width', full);
  }

  function renderRegions() {
    const board = document.querySelector('#hk-region-board');
    board.replaceChildren();
    for (const region of hk.regions) {
      const card = element('article', 'hk-region-tile');
      card.dataset.region = region.id;
      const title = element('button', 'hk-region-title');
      title.type = 'button'; title.dataset.hkSelect = `region:${region.id}`;
      title.append(localized('strong', '', region.name, lang));
      title.append(element('span', 'hk-region-founded-label', t('hkFounded', lang, { year: region.founded })));
      card.append(title);
      // district chips: names only, because only a few have a sourced history
      const chips = element('ul', 'hk-district-chips');
      // District names are chip text only: only a handful have a sourced
      // history, so clicking one would promise detail the data cannot give.
      for (const district of region.districts) chips.append(localized('li', '', district, lang));
      card.append(localized('p', 'hk-region-founded', region.foundedText, lang));
      card.append(chips);
      card.append(localized('p', 'hk-region-insight', region.insight, lang));
      const hq = element('p', 'hk-region-hq');
      hq.append(element('strong', '', `${t('hkHq', lang)}：`), localized('span', '', region.hq, lang));
      card.append(hq);
      card.append(sourceLinks(region.sources));
      card.classList.toggle('is-selected', state.selected?.kind === 'region' && state.selected.id === region.id);
      board.append(card);
    }
  }

  function renderBoundaries() {
    const list = document.querySelector('#hk-boundary-list');
    list.replaceChildren();
    for (const change of hk.boundaryChanges) {
      const row = element('li', 'hk-boundary-row');
      const button = element('button', 'hk-boundary-entry');
      button.type = 'button'; button.dataset.hkSelect = `change:${change.year}`;
      button.append(element('span', 'hk-boundary-year', String(change.year)));
      const copy = element('span', 'hk-boundary-copy');
      for (const entry of change.changes) copy.append(localized('span', '', entry, lang));
      button.append(copy);
      // Citations sit beside the button, never inside it: a button may not
      // contain links.
      const sources = sourceLinks(change.sources);
      sources.classList.add('hk-boundary-sources');
      const body = element('div', 'hk-boundary-body');
      body.append(button, sources);
      row.append(body);
      row.classList.toggle('is-selected', state.selected?.kind === 'change' && state.selected.id === change.year);
      list.append(row);
    }
    document.querySelector('#hk-boundary-note').textContent = t('hkBoundaryNote', lang);
  }

  function renderJamborees() {
    const body = document.querySelector('#hk-jamboree-body');
    body.replaceChildren();
    for (const event of hk.jamborees) {
      const row = element('tr');
      row.dataset.jamboree = event.id;
      const nameCell = element('th', 'hk-jamboree-name');
      nameCell.scope = 'row';
      const button = element('button', 'hk-jamboree-link');
      button.type = 'button'; button.dataset.hkSelect = `jamboree:${event.id}`;
      button.append(element('span', 'hk-jamboree-number', String(event.n)), localized('strong', '', event.name, lang));
      nameCell.append(button);
      const year = element('td', 'hk-jamboree-year', event.yearEnd && event.yearEnd !== event.year ? `${event.year}–${event.yearEnd}` : String(event.year));
      const place = element('td');
      const theme = element('td');
      place.append(localized('span', '', event.place, lang));
      if (event.theme) theme.append(localized('span', '', event.theme, lang));
      else theme.append(element('span', 'hk-muted', t('hkUnknown', lang)));
      const count = element('td', 'hk-jamboree-count', event.participants ? event.participants.toLocaleString(localeFor(lang)) : t('hkUnknown', lang));
      const note = element('td', 'hk-jamboree-note');
      note.append(localized('span', '', event.note, lang), sourceLinks(event.sources));
      row.append(nameCell, year, place, theme, count, note);
      row.classList.toggle('is-future', state.year != null && event.year > state.year);
      row.classList.toggle('is-selected', state.selected?.kind === 'jamboree' && state.selected.id === event.id);
      body.append(row);
    }
    document.querySelector('#hk-jamboree-caption').textContent = t('hkJamboreeCaption', lang);
  }

  function renderPeople(kind) {
    const list = document.querySelector(kind === 'leaders' ? '#hk-leaders-list' : '#hk-chiefs-list');
    list.replaceChildren();
    const office = hk.offices[kind === 'leaders' ? 'leader' : 'chief'];
    const note = list.closest('[data-hk-section]').querySelector('.hk-office-note');
    note.replaceChildren(localized('p', '', office.note, lang));
    for (const row of kind === 'leaders' ? hk.leaders : hk.chiefs) {
      const item = element('li', 'hk-person');
      item.append(element('span', 'hk-person-number', String(row.n)));
      item.append(localized('strong', '', row.name, lang));
      item.append(element('span', 'hk-person-years', row.to ? `${row.from}–${row.to}` : `${row.from}–`));
      if (kind === 'leaders') item.append(element('span', 'hk-person-office', t(row.office === 'governor' ? 'hkGovernor' : 'hkChiefExecutive', lang)));
      list.append(item);
    }
    const head = list.closest('[data-hk-section]').querySelector('.hk-office-title');
    head.replaceChildren(localized('span', '', office.title, lang));
  }

  function renderTimeline() {
    const list = document.querySelector('#hk-timeline-list');
    list.replaceChildren();
    for (const entry of hk.timeline) {
      const item = element('li', 'hk-timeline-item');
      const button = element('button', 'hk-timeline-card');
      button.type = 'button'; button.dataset.hkSelect = `milestone:${entry.year}`;
      button.append(element('span', 'hk-timeline-year', String(entry.year)));
      const copy = element('span', 'hk-timeline-copy');
      copy.append(localized('strong', '', entry.title, lang), localized('span', '', entry.body, lang));
      button.append(copy);
      item.append(button);
      item.classList.toggle('is-future', state.year != null && entry.year > state.year);
      list.append(item);
    }
    document.querySelector('#hk-timeline-note').textContent = t('hkTimelineNote', lang);
  }

  // Each section owns a panel; the map section's sits under the map, the list
  // sections' panels stand beside their lists. Every panel is cleared first so
  // a stale card never survives a tab switch.
  function renderPanel() {
    for (const node of document.querySelectorAll('[data-hk-panel]')) node.replaceChildren();
    const host = state.tab === 'map' ? panel
      : document.querySelector(`[data-hk-section="${state.tab}"] [data-hk-panel]`);
    if (host) renderHkCard(host, state, hk);
  }

  let toastTimer = null;
  function toast(message) {
    const node = document.querySelector('#toast');
    node.textContent = message; node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2500);
  }

  function render() {
    state.lang = lang;
    applyLanguage(lang);
    document.body.dataset.hkTab = state.tab;
    renderTabs();
    renderSummary();
    renderMain();
    renderPanel();
    updateUrl();
  }

  // One delegated handler for every selection control on the page.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-hk-select]');
    if (!button) return;
    const [kind, ...rest] = button.dataset.hkSelect.split(':');
    const value = rest.join(':');
    select({ kind, id: kind === 'change' || kind === 'milestone' ? Number(value) : value });
  });

  tabsNav.addEventListener('scroll', updateTabEdges, { passive: true });
  window.addEventListener('resize', updateTabEdges);

  tabsNav.addEventListener('click', event => {
    const button = event.target.closest('[data-hk-tab]');
    if (!button) return;
    state.tab = button.dataset.hkTab;
    if (!SELECTIONS[state.tab](state.selected?.kind)) state.selected = null;
    state.focusArea = state.selected?.kind === 'area' ? state.selected.id : null;
    render();
  });
  tabsNav.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...tabsNav.querySelectorAll('[data-hk-tab]')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    buttons[next].click();
  });

  for (const button of document.querySelectorAll('[data-hk-year]')) {
    button.addEventListener('click', () => {
      const year = Number(button.dataset.hkYear);
      state.year = state.year === year ? null : year;
      render();
    });
  }
  document.querySelector('#hk-year-range').addEventListener('input', event => {
    state.year = clamp(Number(event.target.value), MIN_YEAR, MAX_YEAR);
    render();
  });
  document.querySelector('#hk-year-all').addEventListener('click', () => { state.year = null; render(); });
  document.querySelector('#hk-year-clear').addEventListener('click', () => { state.year = null; render(); });
  document.querySelector('#hk-zoom-in').addEventListener('click', () => map.zoomIn());
  document.querySelector('#hk-zoom-out').addEventListener('click', () => map.zoomOut());
  document.querySelector('#hk-zoom-reset').addEventListener('click', () => map.reset());
  const mapSvg = document.querySelector('#hk-map');
  mapSvg.addEventListener('keydown', event => {
    if (map.key(event.key)) event.preventDefault();
  });
  document.querySelector('#language-select').addEventListener('change', event => {
    lang = event.target.value;
    render();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    const openPopover = document.querySelector('.hk-legend-panel:not([hidden])');
    if (openPopover) { openPopover.hidden = true; return; }
    if (!state.selected) return;
    state.selected = null; state.focusArea = null; render();
  });
  document.querySelector('#hk-share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast(t('copied', lang));
    } catch {
      toast(t('copyFailed', lang));
    }
  });
  const aboutDialog = document.querySelector('#about-dialog');
  document.querySelector('#about-button').addEventListener('click', () => aboutDialog.showModal());
  document.querySelector('#about-close').addEventListener('click', () => aboutDialog.close());
  aboutDialog.addEventListener('click', event => { if (event.target === aboutDialog) aboutDialog.close(); });
  const legendToggle = document.querySelector('#hk-legend-toggle');
  const legendPanel = document.querySelector('#hk-legend');
  legendToggle.addEventListener('click', () => {
    legendPanel.hidden = !legendPanel.hidden;
    legendToggle.setAttribute('aria-expanded', String(!legendPanel.hidden));
  });

  render();
  // At narrow widths the header's five mode links scroll; bring the current
  // page's link into view so it is not the one hidden behind the fade.
  document.querySelector('.primary-nav .is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  document.querySelector('#hk-stage-root')?.setAttribute('data-ready', 'true');
  return { state, render, select };
}
