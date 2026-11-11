// B-P Atlas v1.2 · © SCOUT SYSTEM
import { applyLanguage, getInitialLanguage, localize, localizationLanguage, localeFor, t } from './i18n.js';
import { enhanceLocalizedData } from './data-translations.js';
import { clamp, currentYear, defaultYearForMode, MIN_YEAR, readState, selectionAtYear, stateToSearch } from './state.js';
import { adjacentYear, locationRecordYear, locationsRecordedBy, recordedByYear, trackYears } from './chronicles.js';
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
  const data = enhanceLocalizedData(await loadData());
  const state = readState(params, data, initialLang, maxYear);
  let playTimer = null, urlTimer = null, toastTimer = null, displayedCardKey = null, directoryLang = null;
  const snapshots = new Map();
  const isNso = type => type === 'nso' || type === 'nso-reference';
  const directoryDialog = document.querySelector('#directory-dialog');

  function renderDirectory(lang) {
    if (directoryLang === lang) return;
    directoryLang = lang;
    const list = document.querySelector('#directory-list'); list.replaceChildren();
    const collator = new Intl.Collator(localeFor(lang));
    const entries = [...data.nso].sort((a, b) => collator.compare(localize(a.name, lang), localize(b.name, lang)));
    for (const item of entries) {
      const li = document.createElement('li'), button = document.createElement('button');
      const name = document.createElement('strong'), organisation = document.createElement('span'), year = document.createElement('span');
      button.type = 'button'; button.className = 'directory-entry'; button.dataset.nsoId = item.id;
      name.textContent = localize(item.name, lang); name.lang = localizationLanguage(item.name, lang) || localeFor(lang);
      organisation.textContent = localize(item.nso, lang); organisation.lang = localizationLanguage(item.nso, lang) || localeFor(lang);
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
  const chart = createChart(data.membership, data.sources, maxYear, year => setYear(year));
  const timeline = createTimeline(data, maxYear, { onYear: year => setYear(year), onAdjacent: direction => step(direction), onPlay: togglePlay, onEvent: id => selectItem('jamboree', id) });

  function render() {
    const { mode, lang, year, selected } = state;
    applyLanguage(lang); document.body.dataset.view = mode;
    renderDirectory(lang);
    document.querySelectorAll('a[href^="credits.html"]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      link.setAttribute('href', `credits.html?lang=${lang}${url.hash}`);
    });
    document.querySelectorAll('.mode-button').forEach(button => {
      const active = button.dataset.mode === mode || (button.dataset.mode === 'members' && mode === 'spread');
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
    const headings = {
      journey: ['headline', 'subtitle'], members: ['membersHeadline', 'membersSubtitle'], spread: ['earlyHeadline', 'earlyPageSubtitle'],
      jamborees: ['jamboreeHeadline', 'jamboreePageSubtitle'], population: ['populationHeadline', 'populationPageSubtitle'],
    };
    document.querySelector('#page-title').textContent = t(headings[mode][0], lang);
    document.querySelector('.intro p').textContent = t(headings[mode][1], lang);
    document.querySelector('.atlas-workspace').hidden = mode === 'population';
    document.querySelector('#chart-panel').hidden = mode !== 'population';

    if (mode !== 'population') {
      const mapText = {
        journey: ['mapJourneyTitle', 'mapJourneySubtitle', 'mapLegendJourney', '#icon-route'],
        members: ['mapMembersTitle', 'mapMembersSubtitle', 'mapLegendMembers', '#icon-globe'],
        spread: ['mapSpreadTitle', 'mapSpreadSubtitle', 'mapLegendSpread', '#icon-globe'],
        jamborees: ['mapJamboreeTitle', 'mapJamboreeSubtitle', 'mapLegendJamborees', '#icon-tent'],
      }[mode];
      document.querySelector('#map-title').textContent = t(mapText[0], lang);
      document.querySelector('#map-subtitle').textContent = t(mapText[1], lang);
      document.querySelector('#map-legend').textContent = t(mapText[2], lang);
      document.querySelector('.map-heading-icon use').setAttribute('href', mapText[3]);
      const basis = document.querySelector('#basis-button'), counter = document.querySelector('#map-counter');
      basis.hidden = mode !== 'members' && mode !== 'spread';
      basis.textContent = t(mode === 'spread' ? 'showMemberMap' : 'showEarlyGroups', lang);
      counter.hidden = mode !== 'members';
      if (mode === 'members') {
        const count = locationsRecordedBy(data.nso, year).length;
        const total = data.nso.filter(item => locationRecordYear(item, 'members') !== null).length;
        counter.textContent = t('mapCounter', lang, { count, total });
        counter.dataset.short = `${count} / ${total}`;
      }
      const open = state.panel === 'story';
      document.querySelector('#story-panel').classList.toggle('is-open', open);
      document.querySelector('#mobile-story').setAttribute('aria-pressed', String(open));
      document.querySelector('#mobile-story').setAttribute('aria-expanded', String(open));
      document.querySelector('#mobile-teaser').setAttribute('aria-expanded', String(open));
      const collection = selected?.type === 'stop' ? data.journey : isNso(selected?.type) ? data.nso : data.jamborees;
      const item = collection.find(entry => entry.id === selected?.id);
      const teaserDate = selected?.type === 'nso-reference' ? t('directoryButton', lang) : item?.year ?? (item ? locationRecordYear(item, mode) : null) ?? year;
      document.querySelector('#mobile-teaser-meta').textContent = item ? `${teaserDate} · ${localize(item.place || item.name, lang)}` : String(year);
      const overviewKey = mode === 'members' ? 'membersHeading' : mode === 'jamborees' ? 'eventOverviewHeading' : 'spreadHeading';
      document.querySelector('#mobile-teaser-title').textContent = item ? (item.title ? localize(item.title, lang) : item.n ? t('eventNumber', lang, { n: item.n }) : item.cancelled ? t('eventCancelled', lang) : localize(item.nso, lang)) : t(overviewKey, lang);
      map.render(state);
      const storyPanel = document.querySelector('#story-panel'), cardContent = document.querySelector('#card-content'), focused = document.activeElement;
      const previousScrollTop = storyPanel.scrollTop;
      const cardFocus = cardContent.contains(focused) ? (focused.classList.contains('next-story') ? { kind: 'next' } : focused.classList.contains('back-overview') ? { kind: 'back' } : focused.id === 'reported-year-select' ? { kind: 'reported' } : focused.dataset.nsoId ? { kind: 'nso', id: focused.dataset.nsoId } : focused.matches('summary') ? { kind: 'summary' } : focused.dataset.sourceId ? { kind: 'source', id: focused.dataset.sourceId, slot: focused.dataset.sourceSlot } : null) : null;
      const leadsOpen = cardContent.querySelector('.research-leads')?.open;
      const cardKey = selected ? `${mode}:${selected.type}:${selected.id}` : `overview:${mode}:${year}`;
      const cardChanged = cardKey !== displayedCardKey; displayedCardKey = cardKey;
      renderCard(state, data, { onNext: () => step(1), onSelect: selectItem, onYear: year => setYear(year), onOverview: () => { pause(); state.selected = null; render(); } });
      if (!cardChanged && leadsOpen && cardContent.querySelector('.research-leads')) cardContent.querySelector('.research-leads').open = true;
      // Replacing the card temporarily empties it and browsers clamp scrollTop
      // to zero. Restore the position for the same card or its year selector.
      storyPanel.scrollTop = !cardChanged || cardFocus?.kind === 'reported' ? previousScrollTop : 0;
      if (cardFocus) {
        const replacement = cardFocus.kind === 'next' ? cardContent.querySelector('.next-story')
          : cardFocus.kind === 'back' ? cardContent.querySelector('.back-overview')
          : cardFocus.kind === 'reported' ? cardContent.querySelector('#reported-year-select')
          : cardFocus.kind === 'nso' ? [...cardContent.querySelectorAll('.member-year-entry')].find(button => button.dataset.nsoId === cardFocus.id)
          : cardFocus.kind === 'summary' ? cardContent.querySelector('.research-leads summary')
          : [...cardContent.querySelectorAll('[data-source-id]')].find(link => link.dataset.sourceId === cardFocus.id && link.dataset.sourceSlot === cardFocus.slot);
        const panelBounds = storyPanel.getBoundingClientRect();
        let targetBounds = replacement?.getBoundingClientRect();
        if (replacement && cardFocus.kind === 'reported' && targetBounds) {
          // Content height can change with the newly selected source; keep the
          // restored selector visible inside the drawer without scrolling the page.
          if (targetBounds.top < panelBounds.top) storyPanel.scrollTop += targetBounds.top - panelBounds.top;
          else if (targetBounds.bottom > panelBounds.bottom) storyPanel.scrollTop += targetBounds.bottom - panelBounds.bottom;
          targetBounds = replacement.getBoundingClientRect();
        }
        const targetVisible = targetBounds && targetBounds.top >= panelBounds.top && targetBounds.bottom <= panelBounds.bottom;
        (replacement && (!cardChanged || targetVisible || cardFocus.kind === 'reported') ? replacement : storyPanel).focus({ preventScroll: true });
      }
    } else chart.render(state);
    timeline.render(state); scheduleUrl();
  }
  function pause() {
    if (playTimer) clearInterval(playTimer);
    playTimer = null; state.playing = false;
  }
  function switchMode(mode, { keepYear = false, renderNow = true } = {}) {
    if (mode === state.mode) return;
    pause();
    snapshots.set(state.mode, { year: state.year, selected: state.selected && { ...state.selected }, view: { ...state.view }, panel: state.panel });
    const oldYear = state.year, saved = keepYear ? null : snapshots.get(mode);
    state.mode = mode;
    state.year = saved?.year ?? (keepYear ? oldYear : defaultYearForMode(mode, data, maxYear));
    state.selected = saved ? saved.selected && { ...saved.selected } : selectionAtYear(data, mode, state.year, maxYear);
    state.view = saved ? { ...saved.view } : { k: 1, x: 0, y: 0 };
    state.panel = saved?.panel ?? null;
    map.setView(state.view);
    if (renderNow) render();
  }
  function setYear(year, options = {}) {
    if (!Number.isFinite(year)) return;
    if (!options.automatic) pause();
    state.year = clamp(Math.round(year), MIN_YEAR, maxYear);
    if (state.mode === 'journey' || state.mode === 'jamborees') state.selected = selectionAtYear(data, state.mode, state.year, maxYear);
    else if (state.selected?.type !== 'nso-reference' || options.automatic) state.selected = null;
    render();
  }
  function selectItem(type, id, options = {}) {
    if (!options.automatic) pause();
    const collection = type === 'stop' ? data.journey : isNso(type) ? data.nso : data.jamborees;
    const item = collection.find(entry => entry.id === id); if (!item) return;
    if (type === 'nso' && !recordedByYear(item, state.year, state.mode)) return;
    if (type === 'stop') {
      if (state.mode !== 'journey') switchMode('journey', { keepYear: true, renderNow: false });
      state.year = item.year;
    } else if (type === 'nso-reference') {
      if (state.mode !== 'members' && state.mode !== 'spread') switchMode('members', { keepYear: true, renderNow: false });
    } else if (type === 'jamboree') {
      if (item.year > maxYear) return;
      if (state.mode !== 'jamborees') switchMode('jamborees', { keepYear: true, renderNow: false });
      state.year = item.year;
    }
    state.selected = { type, id };
    if (!options.keepPanel && window.matchMedia('(max-width: 900px)').matches) state.panel = 'story';
    if (type !== 'nso-reference' && options.focus !== false) map.focus(item);
    render();
  }
  function adjacentStory(direction) {
    const type = state.mode === 'journey' ? 'stop' : 'jamboree';
    const items = (state.mode === 'journey' ? data.journey : data.jamborees).filter(item => item.year <= maxYear);
    const index = state.selected?.type === type ? items.findIndex(item => item.id === state.selected.id) : -1;
    if (index >= 0) return items[index + direction] || null;
    return direction > 0 ? items.find(item => item.year > state.year) || null : [...items].reverse().find(item => item.year < state.year) || null;
  }
  function step(direction, automatic = false) {
    if (!automatic) pause();
    if (state.mode === 'journey' || state.mode === 'jamborees') {
      const item = adjacentStory(direction);
      if (!item) { if (automatic) { pause(); render(); } return; }
      selectItem(state.mode === 'journey' ? 'stop' : 'jamboree', item.id, { automatic, keepPanel: automatic });
    } else {
      const year = adjacentYear(trackYears(data, state.mode, maxYear), state.year, direction);
      if (year === null) { if (automatic) { pause(); render(); } return; }
      setYear(year, { automatic });
    }
  }
  function togglePlay() {
    if (state.playing) { pause(); render(); return; }
    const years = trackYears(data, state.mode, maxYear); if (!years.length) return;
    if (state.mode === 'journey' || state.mode === 'jamborees') {
      if (!adjacentStory(1)) {
        const items = (state.mode === 'journey' ? data.journey : data.jamborees).filter(item => item.year <= maxYear);
        selectItem(state.mode === 'journey' ? 'stop' : 'jamboree', items[0].id, { automatic: true, keepPanel: true });
      }
    } else {
      if (!adjacentYear(years, state.year, 1)) setYear(years[0], { automatic: true });
      if (state.selected?.type === 'nso-reference') state.selected = null;
    }
    state.playing = true; render();
    const delay = state.mode === 'members' || state.mode === 'spread' ? 700 : state.mode === 'population' ? 1500 : 2200;
    playTimer = setInterval(() => step(1, true), delay);
  }
  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
  document.querySelector('#basis-button').addEventListener('click', () => switchMode(state.mode === 'members' ? 'spread' : 'members', { keepYear: true }));
  document.querySelector('#language-select').addEventListener('change', event => { state.lang = event.target.value; render(); });
  window.addEventListener('resize', () => { if (state.mode === 'population') chart.render(state); });
  document.querySelector('#mobile-teaser').addEventListener('click', () => { state.panel = 'story'; render(); });
  document.querySelector('#mobile-story').addEventListener('click', () => { state.panel = state.panel === 'story' ? null : 'story'; render(); });
  document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', () => {
    const old = state.panel; state.panel = null; render(); if (old) document.querySelector('#mobile-story').focus();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]') && state.panel) {
      state.panel = null; render();
      if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('#mobile-story').focus();
      return;
    }
    if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (document.querySelector('dialog[open]') || event.target.closest('input,select,textarea,button,a,svg,[role=button],summary')) return;
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
  // Avoid presenting a blank map or chart with controls that cannot operate.
  document.querySelectorAll('.atlas-workspace, .population-view, .timeline').forEach(el => { el.hidden = true; });
  document.querySelectorAll('.mode-button, #directory-button, #about-button, #share-button').forEach(el => { el.disabled = true; });
  const message = document.querySelector('#load-error'); message.hidden = false;
  let fallbackLang = initialLang;
  function showError() {
    message.replaceChildren(document.createTextNode(t('loadError', fallbackLang)));
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('retry', fallbackLang);
    retry.addEventListener('click', () => location.reload()); message.append(retry);
  }
  document.querySelector('#language-select').addEventListener('change', event => {
    fallbackLang = event.target.value;
    try {
      const url = new URL(location.href); url.searchParams.set('lang', fallbackLang);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* The translated message still works in restricted contexts. */ }
    applyLanguage(fallbackLang); showError();
  });
  showError();
}
