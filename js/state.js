// B-P Atlas v1.2 · © SCOUT SYSTEM
import { stopAtYear } from './journey.js';
import { locationRecordYear } from './chronicles.js';
export const MIN_YEAR = 1857;
export const APP_VERSION = 'v1.2';
export const currentYear = () => Math.max(MIN_YEAR, new Date().getFullYear());
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export const MODES = ['journey', 'members', 'spread', 'jamborees', 'population'];

export function parseView(value) {
  if (!value) return { k: 1, x: 0, y: 0 };
  const parts = value.split(',').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return { k: 1, x: 0, y: 0 };
  const k = clamp(parts[0], 1, 8);
  return { k, x: clamp(parts[1], 1000 * (1 - k), 0), y: clamp(parts[2], 560 * (1 - k), 0) };
}

export function defaultYearForMode(mode, data, maxYear = currentYear()) {
  if (mode === 'members') return clamp(1922, MIN_YEAR, maxYear);
  if (mode === 'jamborees') return clamp(1920, MIN_YEAR, maxYear);
  if (mode === 'population') {
    const years = (data.membership || []).filter(row => Number.isFinite(row.members) && row.year <= maxYear).map(row => row.year);
    return clamp(years.length ? Math.max(...years) : 1907, MIN_YEAR, maxYear);
  }
  return clamp(1907, MIN_YEAR, maxYear);
}

export function selectionAtYear(data, mode, year, maxYear = currentYear()) {
  if (mode === 'journey') {
    const stop = stopAtYear(data.journey.filter(item => item.year <= maxYear), year);
    return stop ? { type: 'stop', id: stop.id } : null;
  }
  if (mode === 'jamborees') {
    const event = stopAtYear(data.jamborees.filter(item => item.year <= maxYear), year);
    return event ? { type: 'jamboree', id: event.id } : null;
  }
  return null;
}

export function readState(params, data, lang, maxYear = currentYear()) {
  const requested = params.get('mode');
  let mode = MODES.includes(requested) ? requested : 'journey';
  // A formerly shared mobile chart link now opens the independent chart.
  if (params.get('panel') === 'chart') mode = 'population';
  const rawYear = params.get('year');
  let year = rawYear && /^\d{4}$/.test(rawYear)
    ? clamp(Number(rawYear), MIN_YEAR, maxYear)
    : defaultYearForMode(mode, data, maxYear);
  const stop = data.journey.find(item => item.id === params.get('stop') && item.year <= maxYear);
  const candidateNso = data.nso.find(item => item.id === params.get('nso'));
  const reference = params.get('ref') === '1' && candidateNso;
  const jamboree = data.jamborees.find(item => item.id === params.get('jamboree') && item.year <= maxYear);
  let selected = null;
  if (mode === 'population') {
    selected = null;
  } else if (jamboree) {
    mode = 'jamborees'; selected = { type: 'jamboree', id: jamboree.id }; year = Math.max(year, jamboree.year);
  } else if (reference) {
    // A present-day reference never selects the historical map or changes its year.
    mode = requested === 'members' ? 'members' : 'spread'; selected = { type: 'nso-reference', id: reference.id };
  } else if (candidateNso) {
    // Old bare ?nso= links keep the earlier local-group meaning; explicit members
    // links use the separately sourced WOSM membership year instead.
    const nsoMode = requested === 'members' ? 'members' : 'spread';
    const availableYear = locationRecordYear(candidateNso, nsoMode);
    if (availableYear !== null && availableYear <= maxYear) {
      mode = nsoMode; selected = { type: 'nso', id: candidateNso.id }; year = Math.max(year, availableYear);
    }
  } else if (stop) {
    mode = 'journey'; selected = { type: 'stop', id: stop.id }; year = Math.max(year, stop.year);
  }
  if (!selected) selected = selectionAtYear(data, mode, year, maxYear);
  return {
    lang, year, mode, selected,
    view: mode === 'population' ? { k: 1, x: 0, y: 0 } : parseView(params.get('view')),
    panel: mode !== 'population' && params.get('panel') === 'story' ? 'story' : null,
    playing: false,
  };
}

export function stateToSearch(state) {
  const p = new URLSearchParams();
  p.set('lang', state.lang); p.set('year', String(state.year)); p.set('mode', state.mode);
  if (state.selected?.type === 'stop') p.set('stop', state.selected.id);
  if (state.selected?.type === 'nso' || state.selected?.type === 'nso-reference') {
    p.set('nso', state.selected.id);
    if (state.selected.type === 'nso-reference') p.set('ref', '1');
  }
  if (state.selected?.type === 'jamboree') p.set('jamboree', state.selected.id);
  if (state.mode !== 'population' && (state.view.k !== 1 || state.view.x !== 0 || state.view.y !== 0)) {
    p.set('view', [state.view.k, state.view.x, state.view.y].map(n => Number(n.toFixed(2))).join(','));
  }
  if (state.panel === 'story' && state.mode !== 'population') p.set('panel', 'story');
  return p.toString();
}
