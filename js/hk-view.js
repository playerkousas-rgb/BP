// B-P Atlas v1.3 · © SCOUT SYSTEM
// One-page Hong Kong Scout history view: year band drives the map, left selector,
// right story card, and a map overlay showing the Chief Scout and Commissioner
// of the selected year. All text comes from data/hk.json, data/hk-districts.json
// and data/sources.json.
import { applyLanguage, getInitialLanguage, localize, localizationLanguage, localeFor, t } from './i18n.js';
import { clamp } from './state.js';
import { createHkMap } from './hk-map.js';
import { renderHkCard, setHkSources, setHkDistricts } from './hk-card.js';

const MIN_YEAR = 1909;
const MAX_YEAR = Math.max(new Date().getFullYear(), 2026);
const LEFT_VIEWS = ['milestones', 'jamborees', 'boundaries', 'regions', 'people'];

export function readHkState(params, maxYear = MAX_YEAR) {
  const rawYear = params.get('year');
  const year = rawYear && /^\d{4}$/.test(rawYear) ? clamp(Number(rawYear), MIN_YEAR, maxYear) : null;
  const rawView = params.get('view');
  const leftView = LEFT_VIEWS.includes(rawView) ? rawView : 'milestones';
  const rawSelection = params.get('sel');
  let selected = null;
  if (rawSelection) {
    const [kind, ...rest] = rawSelection.split(':');
    const value = rest.join(':');
    if ((kind === 'region' || kind === 'district' || kind === 'jamboree') && value) selected = { kind, id: value };
    else if (kind === 'change' && /^\d{4}$/.test(value)) selected = { kind, id: Number(value) };
    else if (kind === 'milestone' && /^\d{4}$/.test(value)) selected = { kind, id: Number(value) };
    else if ((kind === 'leader' || kind === 'chief') && /^\d+$/.test(value)) selected = { kind, id: Number(value) };
  }
  return { tab: 'map', leftView, year, selected };
}

export function hkStateToSearch(state, lang) {
  const params = new URLSearchParams();
  params.set('lang', lang);
  if (state.leftView && state.leftView !== 'milestones') params.set('view', state.leftView);
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
  const actual = localizationLanguage(value, lang);
  if (actual) node.lang = actual;
  return node;
}

function inOffice(record, year) {
  if (year == null) return record.to == null;
  return record.from <= year && (record.to == null || record.to >= year);
}

export async function startHkView({ params, data }) {
  const hkDistricts = data.hkDistricts;
  const hk = data.hk;
  const sources = data.sources;
  const sourceIndex = new Map(sources.map(source => [source.id, source]));
  setHkSources(sources);
  setHkDistricts(data.hkDistricts);
  let lang = getInitialLanguage(params);
  const state = readHkState(params);
  state.lang = lang;
  state.focusDistrict = null;

  const panel = document.querySelector('#hk-panel');
  const map = createHkMap(hkDistricts, hk, {
    onSelect(selection) {
      if (!selection) return;
      select(selection);
    },
  });

  function sourceLinks(ids) {
    const box = element('span', 'hk-source-links');
    for (const id of ids || []) {
      const source = sourceIndex.get(id);
      if (!source) continue;
      const label = localize(source.title, lang);
      let node = null;
      try {
        const url = new URL(source.url || '');
        if (['https:', 'http:'].includes(url.protocol)) {
          const link = element('a', '', label);
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          node = link;
        }
      } catch { /* no public url */ }
      if (!node) node = element('span', 'hk-source-text', label);
      const actual = localizationLanguage(source.title, lang);
      if (actual) node.lang = actual;
      box.append(node);
    }
    return box;
  }

  function updateUrl() {
    try {
      history.replaceState(null, '', `${location.pathname}?${hkStateToSearch(state, lang)}${location.hash}`);
    } catch { /* optional */ }
  }

  const districtById = new Map(hkDistricts.districts.map(district => [district.id, district]));
  function districtCentre(code) {
    const district = districtById.get(code);
    return district ? district.label : null;
  }

  function revealSelection() {
    if (state.selected?.kind === 'jamboree') {
      const event = hk.jamborees.find(item => item.id === state.selected.id);
      if (event?.coordinate) map.reveal(event.coordinate);
    } else if (state.selected?.kind === 'district') {
      const centre = districtCentre(state.selected.id);
      if (centre) map.reveal(centre);
    }
  }

  function leftViewForSelection(selection) {
    if (!selection) return state.leftView;
    if (selection.kind === 'milestone') return 'milestones';
    if (selection.kind === 'jamboree') return 'jamborees';
    if (selection.kind === 'change') return 'boundaries';
    if (selection.kind === 'region' || selection.kind === 'district') return 'regions';
    if (selection.kind === 'leader' || selection.kind === 'chief') return 'people';
    return state.leftView;
  }

  function select(selection) {
    state.selected = selection;
    state.leftView = leftViewForSelection(selection);
    state.focusDistrict = selection?.kind === 'district' ? selection.id : null;
    if (selection?.kind === 'jamboree') {
      const event = hk.jamborees.find(item => item.id === selection.id);
      if (event) state.year = event.year;
    } else if (selection?.kind === 'milestone' || selection?.kind === 'change') {
      state.year = selection.id;
    }
    revealSelection();
    render();
  }

  function renderSummary() {
    const label = state.year == null ? t('hkAllYears', lang) : String(state.year);
    document.querySelector('#hk-year-label').textContent = label;
    const inHongKong = hk.jamborees.filter(event => event.inHongKong).length;
    const districtCount = hkDistricts.districts.length;
    const formed = state.year == null ? districtCount
      : hkDistricts.districts.filter(district => (district.originalFormed || district.formed) <= state.year).length;
    const scope = state.year == null
      ? t('hkMapScopeAll', lang, { count: districtCount })
      : t('hkMapScopeYear', lang, { year: state.year, count: formed, total: districtCount });
    const separator = lang === 'zh' ? '。' : '. ';
    const note = document.querySelector('#hk-map-note');
    if (note) note.textContent = `${scope}${separator}${t('hkMapNote', lang, { count: inHongKong })}`;
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

  function renderLeadersOverlay() {
    const box = document.querySelector('#hk-leaders-overlay');
    if (!box) return;
    box.replaceChildren();
    const year = state.year;
    const leader = hk.leaders.find(r => inOffice(r, year)) || hk.leaders[hk.leaders.length - 1];
    const chief = hk.chiefs.find(r => inOffice(r, year)) || hk.chiefs[hk.chiefs.length - 1];
    const title = element('div', 'hk-overlay-title');
    title.append(element('span', '', year == null ? t('hkCurrentOfficeholders', lang) : t('hkOfficeholdersAtYear', lang, { year })));
    box.append(title);
    const grid = element('div', 'hk-overlay-grid');
    const person = (role, record) => {
      const card = element('div', 'hk-overlay-person');
      if (record.photo) {
        const img = element('img', 'hk-overlay-photo');
        img.src = record.photo;
        img.alt = localize(record.name, lang);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.width = 56; img.height = 70;
        img.addEventListener('error', () => img.remove(), { once: true });
        card.append(img);
      }
      const body = element('div', 'hk-overlay-body');
      body.append(element('span', 'hk-overlay-role', role));
      body.append(localized('strong', 'hk-overlay-name', record.name, lang));
      body.append(element('span', 'hk-overlay-years', record.to ? `${record.from}–${record.to}` : `${record.from}–`));
      card.append(body);
      return card;
    };
    grid.append(person(t('hkTabLeaders', lang), leader));
    grid.append(person(t('hkTabChiefs', lang), chief));
    box.append(grid);
  }

  function renderLeftTabs() {
    for (const btn of document.querySelectorAll('[data-hk-left]')) {
      const active = btn.dataset.hkLeft === state.leftView;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    }
  }

  function renderLeftList() {
    const host = document.querySelector('#hk-left-list');
    if (!host) return;
    host.replaceChildren();
    if (state.leftView === 'milestones') renderMilestones(host);
    else if (state.leftView === 'jamborees') renderJamborees(host);
    else if (state.leftView === 'boundaries') renderBoundaries(host);
    else if (state.leftView === 'regions') renderRegions(host);
    else if (state.leftView === 'people') renderPeople(host);
  }

  function renderMilestones(host) {
    const list = element('ol', 'hk-synced-timeline hk-left-timeline');
    for (const entry of hk.timeline) {
      const item = element('li', 'hk-synced-item');
      const button = element('button', 'hk-synced-btn');
      button.type = 'button';
      button.dataset.hkSelect = `milestone:${entry.year}`;
      button.append(element('span', 'hk-synced-year', String(entry.year)));
      const text = element('span', 'hk-synced-text');
      text.append(localized('strong', 'hk-synced-title', entry.title, lang));
      text.append(localized('span', 'hk-synced-body', entry.body, lang));
      button.append(text);
      item.append(button);
      const activeYear = state.year === entry.year;
      const selected = state.selected?.kind === 'milestone' && state.selected.id === entry.year;
      item.classList.toggle('is-active', activeYear);
      item.classList.toggle('is-selected', selected);
      if (selected) button.setAttribute('aria-current', 'true');
      list.append(item);
    }
    host.append(list);
    scrollSelectedIntoView(list);
  }

  function renderJamborees(host) {
    const list = element('ol', 'hk-left-compact-list');
    for (const event of hk.jamborees) {
      const item = element('li', 'hk-left-compact-item');
      const button = element('button', 'hk-left-compact-btn');
      button.type = 'button';
      button.dataset.hkSelect = `jamboree:${event.id}`;
      button.append(element('span', 'hk-left-compact-year', event.yearEnd && event.yearEnd !== event.year ? `${event.year}–${event.yearEnd}` : String(event.year)));
      const body = element('span', 'hk-left-compact-body');
      body.append(localized('strong', 'hk-left-compact-title', event.name, lang));
      body.append(localized('span', 'hk-left-compact-meta', event.place, lang));
      button.append(body);
      item.append(button);
      item.classList.toggle('is-selected', state.selected?.kind === 'jamboree' && state.selected.id === event.id);
      item.classList.toggle('is-future', state.year != null && event.year > state.year);
      list.append(item);
    }
    host.append(list);
    scrollSelectedIntoView(list);
  }

  function renderBoundaries(host) {
    const list = element('ol', 'hk-left-compact-list');
    for (const change of hk.boundaryChanges) {
      const item = element('li', 'hk-left-compact-item');
      const button = element('button', 'hk-left-compact-btn');
      button.type = 'button';
      button.dataset.hkSelect = `change:${change.year}`;
      button.append(element('span', 'hk-left-compact-year', String(change.year)));
      const body = element('span', 'hk-left-compact-body');
      body.append(localized('strong', 'hk-left-compact-title', { zh: '區界變動', en: 'Boundary change' }, lang));
      body.append(localized('span', 'hk-left-compact-meta', change.changes[0], lang));
      button.append(body);
      item.append(button);
      const active = state.year === change.year;
      item.classList.toggle('is-active', active);
      item.classList.toggle('is-selected', state.selected?.kind === 'change' && state.selected.id === change.year);
      list.append(item);
    }
    host.append(list);
    scrollSelectedIntoView(list);
  }

  function renderRegions(host) {
    const wrap = element('div', 'hk-left-regions');
    for (const region of hk.regions) {
      const card = element('section', 'hk-left-region-card');
      const head = element('button', 'hk-left-region-head');
      head.type = 'button';
      head.dataset.hkSelect = `region:${region.id}`;
      head.append(localized('strong', '', region.name, lang));
      head.append(element('span', 'hk-left-region-count', t('hkDistrictCount', lang, { count: region.districts.length })));
      head.classList.toggle('is-selected', state.selected?.kind === 'region' && state.selected.id === region.id);
      card.append(head);
      const chips = element('div', 'hk-left-district-chips');
      for (const district of region.districts) {
        const record = hkDistricts.districts.find(item => item.region === region.id && item.name.en === district.en);
        if (!record) continue;
        const btn = element('button', 'hk-left-district-chip');
        btn.type = 'button';
        btn.dataset.hkSelect = `district:${record.id}`;
        btn.textContent = localize(district, lang);
        const actual = localizationLanguage(district, lang);
        if (actual) btn.lang = actual;
        const formedYear = record.originalFormed || record.formed;
        if (formedYear) btn.append(element('span', 'hk-left-district-year', ` ${formedYear}`));
        btn.disabled = state.year != null && formedYear > state.year;
        btn.classList.toggle('is-selected', state.selected?.kind === 'district' && state.selected.id === record.id);
        chips.append(btn);
      }
      card.append(chips);
      wrap.append(card);
    }
    host.append(wrap);
  }

  function renderPeople(host) {
    const wrap = element('div', 'hk-left-people');
    const section = (title, items, kind) => {
      const sec = element('section', 'hk-left-people-sec');
      sec.append(localized('h3', 'hk-left-people-title', title, lang));
      const list = element('ol', 'hk-left-people-list');
      for (const row of items) {
        const item = element('li', 'hk-left-person');
        const btn = element('button', 'hk-left-person-btn');
        btn.type = 'button';
        btn.dataset.hkSelect = `${kind}:${row.n}`;
        if (row.photo) {
          const img = element('img', 'hk-left-person-photo');
          img.src = row.photo; img.alt = localize(row.name, lang);
          img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
          img.width = 40; img.height = 50;
          img.addEventListener('error', () => img.remove(), { once: true });
          btn.append(img);
        }
        const body = element('span', 'hk-left-person-body');
        body.append(localized('strong', '', row.name, lang));
        body.append(element('span', 'hk-left-person-years', row.to ? `${row.from}–${row.to}` : `${row.from}–`));
        btn.append(body);
        item.append(btn);
        const active = inOffice(row, state.year);
        item.classList.toggle('is-active', active);
        item.classList.toggle('is-selected', state.selected?.kind === kind && state.selected.id === row.n);
        list.append(item);
      }
      sec.append(list);
      wrap.append(sec);
    };
    section(hk.offices.leader.title, hk.leaders, 'leader');
    section(hk.offices.chief.title, hk.chiefs, 'chief');
    host.append(wrap);
  }

  function scrollSelectedIntoView(list) {
    const current = list.querySelector('.is-selected, .is-active');
    if (current && typeof current.scrollIntoView === 'function') {
      current.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderPanel() {
    if (!panel) return;
    panel.replaceChildren();
    renderHkCard(panel, state, hk);
  }

  let toastTimer = null;
  function toast(message) {
    const node = document.querySelector('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2500);
  }

  function render() {
    state.lang = lang;
    applyLanguage(lang);
    renderSummary();
    renderLeadersOverlay();
    renderLeftTabs();
    map.render(state);
    renderLeftList();
    renderPanel();
    updateUrl();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-hk-select]');
    if (!button) return;
    const [kind, ...rest] = button.dataset.hkSelect.split(':');
    const value = rest.join(':');
    select({ kind, id: kind === 'change' || kind === 'milestone' || kind === 'leader' || kind === 'chief' ? Number(value) : value });
  });

  document.querySelector('.hk-left-tabs')?.addEventListener('click', event => {
    const btn = event.target.closest('[data-hk-left]');
    if (!btn) return;
    state.leftView = btn.dataset.hkLeft;
    render();
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
  mapSvg.addEventListener('keydown', event => { if (map.key(event.key)) event.preventDefault(); });
  document.querySelector('#language-select').addEventListener('change', event => { lang = event.target.value; render(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    const openPopover = document.querySelector('.hk-legend-panel:not([hidden])');
    if (openPopover) { openPopover.hidden = true; return; }
    if (!state.selected) return;
    state.selected = null; state.focusDistrict = null; render();
  });
  document.querySelector('#hk-share').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t('copied', lang)); }
    catch { toast(t('copyFailed', lang)); }
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
  const activeMode = document.querySelector('.primary-nav .is-active');
  if (activeMode && typeof activeMode.scrollIntoView === 'function') {
    activeMode.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  return { state, render, select };
}
