// B-P Atlas v1.0 · © SCOUT SYSTEM
import { applyLanguage, getInitialLanguage, localize, t } from './i18n.js';
import { clamp, currentYear, MIN_YEAR, readState, stateToSearch } from './state.js';
import { stopAtYear, adjacentStop } from './journey.js';
import { createMap } from './map.js';
import { createTimeline } from './timeline.js';
import { createChart } from './chart.js';
import { renderCard } from './card.js';

const params = new URLSearchParams(location.search);
const initialLang = getInitialLanguage(params);
applyLanguage(initialLang);
const maxYear = currentYear();

async function loadData() {
  const names = ['world', 'journey', 'nso', 'jamborees', 'membership', 'sources'];
  const entries = await Promise.all(names.map(async name => {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`Could not load ${name}`);
    return [name, await response.json()];
  }));
  return Object.fromEntries(entries);
}

try {
  const data = await loadData();
  const state = readState(params, data, initialLang, maxYear);
  let playTimer = null, urlTimer = null, toastTimer = null, displayedCardKey = null, directoryLang = null;
  const isNso = type => type === 'nso' || type === 'nso-reference';
  const directoryDialog = document.querySelector('#directory-dialog');

  function renderDirectory(lang) {
    if (directoryLang === lang) return;
    directoryLang = lang;
    const list = document.querySelector('#directory-list'); list.replaceChildren();
    const collator = new Intl.Collator(lang === 'zh' ? 'zh-Hant-HK' : 'en');
    const entries = [...data.nso].sort((a, b) => collator.compare(localize(a.name, lang), localize(b.name, lang)));
    for (const item of entries) {
      const li = document.createElement('li'), button = document.createElement('button');
      const name = document.createElement('strong'), organisation = document.createElement('span'), year = document.createElement('span');
      button.type = 'button'; button.className = 'directory-entry'; button.dataset.nsoId = item.id;
      name.textContent = localize(item.name, lang); organisation.textContent = localize(item.nso, lang);
      const membership = item.wosmMembership;
      const label = { field: 'directoryYearField', history: 'directoryYearHistory', news: 'directoryYearNews', blank: 'directoryYearBlank', unavailable: 'directoryYearUnknown' }[membership.basis];
      year.className = 'directory-year'; year.textContent = t(label, lang, { year: membership.year });
      if (membership.dispute === 'year') year.textContent += ` · ${t('directoryYearDisputed', lang)}`;
      button.append(name, year, organisation); li.append(button); list.append(li);
    }
  }
  directoryDialog.addEventListener('click', event => {
    const button = event.target.closest('.directory-entry');
    if (!button) return;
    directoryDialog.close();
    selectItem('nso-reference', button.dataset.nsoId, { focus: false });
    document.querySelector('#story-panel').focus({ preventScroll: true });
  });
  document.querySelector('#directory-button').addEventListener('click', () => {
    pause(); render(); directoryDialog.showModal();
  });
  document.querySelector('#directory-close').addEventListener('click', () => directoryDialog.close());

  function updateUrl() {
    try { history.replaceState(null, '', `${location.pathname}?${stateToSearch(state)}${location.hash}`); } catch { /* URL syncing is optional in restricted contexts. */ }
  }
  function scheduleUrl() { clearTimeout(urlTimer); urlTimer = setTimeout(updateUrl, 120); }
  const map = createMap(data.world, data, state.view, {
    onView(view) { state.view = view; scheduleUrl(); },
    onSelect: selectItem,
  });
  const chart = createChart(data.membership, maxYear, year => setYear(year));
  const timeline = createTimeline(data, maxYear, { onYear: year => setYear(year), onAdjacent: direction => step(direction), onPlay: togglePlay, onEvent: id => selectItem('jamboree', id, { jumpToEvent: true }) });

  function render() {
    applyLanguage(state.lang);
    renderDirectory(state.lang);
    document.querySelectorAll('a[href^="credits.html"]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      link.setAttribute('href', `credits.html?lang=${state.lang}${url.hash}`);
    });
    document.querySelectorAll('.mode-button').forEach(button => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#map-title').textContent = t(state.mode === 'journey' ? 'mapJourneyTitle' : 'mapSpreadTitle', state.lang);
    document.querySelector('#map-subtitle').textContent = t(state.mode === 'journey' ? 'mapJourneySubtitle' : 'mapSpreadSubtitle', state.lang);
    document.querySelector('#map-legend').textContent = t(state.mode === 'journey' ? 'mapLegendJourney' : 'mapLegendSpread', state.lang);
    document.querySelector('.map-heading-icon use').setAttribute('href', state.mode === 'journey' ? '#icon-route' : '#icon-globe');
    document.querySelector('#jamboree-toggle').setAttribute('aria-pressed', String(state.showJamborees));
    for (const panel of ['story', 'chart']) {
      document.querySelector(`#${panel}-panel`).classList.toggle('is-open', state.panel === panel);
      document.querySelector(`#mobile-${panel}`).setAttribute('aria-pressed', String(state.panel === panel));
      document.querySelector(`#mobile-${panel}`).setAttribute('aria-expanded', String(state.panel === panel));
    }
    document.querySelector('#mobile-teaser').setAttribute('aria-expanded', String(state.panel === 'story'));
    const selectedCollection = state.selected?.type === 'stop' ? data.journey : isNso(state.selected?.type) ? data.nso : data.jamborees;
    const selectedItem = selectedCollection.find(item => item.id === state.selected?.id);
    const teaserDate = state.selected?.type === 'nso-reference' ? t('directoryButton', state.lang) : selectedItem?.year ?? selectedItem?.scoutingStart ?? state.year;
    document.querySelector('#mobile-teaser-meta').textContent = selectedItem ? `${teaserDate} · ${localize(selectedItem.place || selectedItem.name, state.lang)}` : String(state.year);
    document.querySelector('#mobile-teaser-title').textContent = selectedItem ? (selectedItem.title ? localize(selectedItem.title, state.lang) : selectedItem.n ? t('eventNumber', state.lang, { n: selectedItem.n }) : selectedItem.cancelled ? t('eventCancelled', state.lang) : localize(selectedItem.nso, state.lang)) : t('spreadHeading', state.lang);
    map.render(state); chart.render(state); timeline.render(state);
    const storyPanel = document.querySelector('#story-panel'), cardContent = document.querySelector('#card-content'), focused = document.activeElement;
    const cardFocus = cardContent.contains(focused) ? (focused.classList.contains('next-story') ? { kind: 'next' } : focused.matches('summary') ? { kind: 'summary' } : focused.dataset.sourceId ? { kind: 'source', id: focused.dataset.sourceId, slot: focused.dataset.sourceSlot } : null) : null;
    const leadsOpen = cardContent.querySelector('.research-leads')?.open;
    const cardKey = state.selected ? `${state.selected.type}:${state.selected.id}` : `overview:${state.mode}`;
    const cardChanged = cardKey !== displayedCardKey; displayedCardKey = cardKey;
    renderCard(state, data, () => step(1));
    if (!cardChanged && leadsOpen && cardContent.querySelector('.research-leads')) cardContent.querySelector('.research-leads').open = true;
    // A newly selected story should start at its heading, not inherit the previous card's scroll position.
    if (cardChanged) storyPanel.scrollTop = 0;
    if (cardFocus) {
      const replacement = cardFocus.kind === 'next' ? cardContent.querySelector('.next-story') : cardFocus.kind === 'summary' ? cardContent.querySelector('.research-leads summary') : [...cardContent.querySelectorAll('[data-source-id]')].find(link => link.dataset.sourceId === cardFocus.id && link.dataset.sourceSlot === cardFocus.slot);
      const panelBounds = storyPanel.getBoundingClientRect(), targetBounds = replacement?.getBoundingClientRect();
      const targetVisible = targetBounds && targetBounds.top >= panelBounds.top && targetBounds.bottom <= panelBounds.bottom;
      // Keep the equivalent control when visible. Otherwise focus the scrollable story, not an off-screen button.
      (replacement && (!cardChanged || targetVisible) ? replacement : storyPanel).focus({ preventScroll: true });
    }
    scheduleUrl();
  }
  function pause() {
    if (playTimer) clearInterval(playTimer);
    playTimer = null; state.playing = false;
  }
  function setYear(year, options = {}) {
    if (!Number.isFinite(year)) return;
    if (!options.automatic) pause();
    state.year = clamp(Math.round(year), MIN_YEAR, maxYear);
    if (state.mode === 'journey') {
      const stop = stopAtYear(data.journey, state.year);
      state.selected = stop ? { type: 'stop', id: stop.id } : null;
    } else if (state.selected && state.selected.type !== 'nso-reference') {
      const item = state.selected.type === 'nso' ? data.nso.find(n => n.id === state.selected.id) : data.jamborees.find(j => j.id === state.selected.id);
      if (!item || (item.scoutingStart ?? item.year ?? MIN_YEAR) > state.year) state.selected = null;
    }
    render();
  }
  function selectItem(type, id, options = {}) {
    if (!options.automatic) pause();
    const collection = type === 'stop' ? data.journey : isNso(type) ? data.nso : data.jamborees;
    const item = collection.find(entry => entry.id === id); if (!item) return;
    // Map selections must already exist at the selected historical year; directory
    // references deliberately bypass this rule without highlighting or focusing a map feature.
    if (type === 'nso' && (item.scoutingStart == null || item.scoutingStart > state.year)) return;
    if (type === 'stop') { state.mode = 'journey'; state.year = item.year; }
    else if (isNso(type)) { state.mode = 'spread'; }
    else { state.year = options.jumpToEvent ? item.year : Math.max(state.year, item.year); state.showJamborees = true; }
    state.selected = { type, id };
    if (!options.keepPanel && window.matchMedia('(max-width: 900px)').matches) state.panel = 'story';
    if (type !== 'nso-reference' && options.focus !== false) map.focus(item);
    render();
  }
  function step(direction, automatic = false) {
    if (!automatic) pause();
    if (state.mode === 'journey') {
      const id = state.selected?.type === 'stop' ? state.selected.id : null;
      const currentIndex = data.journey.findIndex(stop => stop.id === id);
      if (automatic && currentIndex === data.journey.length - 1) { pause(); render(); return; }
      const stop = adjacentStop(data.journey, id, state.year, direction);
      selectItem('stop', stop.id, { automatic, keepPanel: automatic });
    } else {
      if (automatic && state.year >= maxYear) { pause(); render(); return; }
      setYear(state.year + direction, { automatic });
    }
  }
  function togglePlay() {
    if (state.playing) { pause(); render(); return; }
    if (state.mode === 'journey' && state.selected?.id === data.journey.at(-1).id) selectItem('stop', data.journey[0].id, { automatic: true, keepPanel: true });
    if (state.mode === 'spread' && state.year >= maxYear) setYear(MIN_YEAR, { automatic: true });
    state.playing = true; render();
    playTimer = setInterval(() => step(1, true), state.mode === 'journey' ? 2200 : 150);
  }
  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
    if (state.mode === button.dataset.mode) return;
    pause(); state.mode = button.dataset.mode;
    if (state.mode === 'journey') {
      const stop = stopAtYear(data.journey, state.year); state.selected = stop ? { type: 'stop', id: stop.id } : null;
    } else state.selected = null;
    map.setView({ k: 1, x: 0, y: 0 }); render();
  }));
  document.querySelector('#language-button').addEventListener('click', () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; render(); });
  document.querySelector('#jamboree-toggle').addEventListener('click', () => {
    state.showJamborees = !state.showJamborees;
    if (!state.showJamborees && state.selected?.type === 'jamboree') {
      const stop = state.mode === 'journey' ? stopAtYear(data.journey, state.year) : null;
      state.selected = stop ? { type: 'stop', id: stop.id } : null;
    }
    render();
  });
  document.querySelector('#chart-org-toggle').addEventListener('click', () => { state.showOrganizations = !state.showOrganizations; render(); });
  document.querySelector('#mobile-teaser').addEventListener('click', () => { state.panel = 'story'; render(); });
  for (const panel of ['story', 'chart']) {
    document.querySelector(`#mobile-${panel}`).addEventListener('click', () => { state.panel = state.panel === panel ? null : panel; render(); });
  }
  document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', () => {
    const old = state.panel; state.panel = null; render(); if (old) document.querySelector(`#mobile-${old}`).focus();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]') && state.panel) {
      const old = state.panel; state.panel = null; render();
      if (window.matchMedia('(max-width: 900px)').matches) document.querySelector(`#mobile-${old}`).focus();
      return;
    }
    if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (document.querySelector('dialog[open]') || event.target.closest('input,button,a,svg,[role=button],summary')) return;
    event.preventDefault(); setYear(state.year + (event.key === 'ArrowRight' ? 1 : -1));
  });
  const dialog = document.querySelector('#about-dialog');
  document.querySelector('#about-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#about-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  function toast(message) {
    const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2500);
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Try the older selection API below. */ }
    }
    const previousFocus = document.activeElement;
    const input = document.createElement('textarea'); input.value = text; input.readOnly = true;
    input.style.position = 'fixed'; input.style.opacity = '0'; input.setAttribute('aria-hidden', 'true');
    document.body.append(input);
    let ok = false;
    try { input.select(); ok = Boolean(document.execCommand?.('copy')); }
    finally { input.remove(); previousFocus?.focus?.({ preventScroll: true }); }
    if (!ok) throw new Error('copy failed');
  }
  document.querySelector('#share-button').addEventListener('click', async () => {
    clearTimeout(urlTimer); updateUrl();
    try { await copyText(location.href); toast(t('copied', state.lang)); }
    catch { toast(t('copyFailed', state.lang)); }
  });
  render();
} catch (error) {
  console.error('Atlas could not be loaded:', error);
  // Avoid presenting a blank map with controls that cannot operate.
  document.querySelectorAll('.atlas-workspace, .timeline').forEach(el => { el.hidden = true; });
  document.querySelectorAll('.mode-button, #directory-button, #about-button, #share-button').forEach(el => { el.disabled = true; });
  const message = document.querySelector('#load-error'); message.hidden = false;
  let fallbackLang = initialLang;
  function showError() {
    message.replaceChildren(document.createTextNode(t('loadError', fallbackLang)));
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('retry', fallbackLang);
    retry.addEventListener('click', () => location.reload()); message.append(retry);
  }
  document.querySelector('#language-button').addEventListener('click', () => {
    fallbackLang = fallbackLang === 'zh' ? 'en' : 'zh';
    try {
      const url = new URL(location.href); url.searchParams.set('lang', fallbackLang);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* The translated message still works in restricted contexts. */ }
    applyLanguage(fallbackLang); showError();
  });
  showError();
}
