// B-P Atlas v1.0 · © SCOUT SYSTEM
import { stopAtYear } from './journey.js';
export const MIN_YEAR = 1857;
export const APP_VERSION = 'v1.0';
export const currentYear = () => Math.max(MIN_YEAR, new Date().getFullYear());
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

export function parseView(value) {
  if (!value) return { k: 1, x: 0, y: 0 };
  const parts = value.split(',').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return { k: 1, x: 0, y: 0 };
  const k = clamp(parts[0], 1, 8);
  return { k, x: clamp(parts[1], 1000 * (1 - k), 0), y: clamp(parts[2], 560 * (1 - k), 0) };
}

export function readState(params, data, lang, maxYear = currentYear()) {
  const rawYear = params.get('year');
  let year = rawYear && /^\d{4}$/.test(rawYear) ? clamp(Number(rawYear), MIN_YEAR, maxYear) : clamp(1907, MIN_YEAR, maxYear);
  let mode = params.get('mode') === 'spread' ? 'spread' : 'journey';
  const stop = data.journey.find(item => item.id === params.get('stop') && item.year <= maxYear);
  const candidateNso = data.nso.find(item => item.id === params.get('nso'));
  const reference = params.get('ref') === '1' && candidateNso;
  const nso = candidateNso?.scoutingStart != null && candidateNso.scoutingStart <= maxYear ? candidateNso : null;
  const jamboree = data.jamborees.find(item => item.id === params.get('jamboree') && item.year <= maxYear);
  let selected = null;
  if (jamboree) { selected = { type: 'jamboree', id: jamboree.id }; year = Math.max(year, jamboree.year); }
  // A present-day directory reference is intentionally independent of the historical map.
  else if (reference) { mode = 'spread'; selected = { type: 'nso-reference', id: reference.id }; }
  else if (nso) { mode = 'spread'; selected = { type: 'nso', id: nso.id }; year = Math.max(year, nso.scoutingStart); }
  else if (stop) { mode = 'journey'; selected = { type: 'stop', id: stop.id }; year = Math.max(year, stop.year); }
  else if (mode === 'journey') { const nearest = stopAtYear(data.journey, year); if (nearest) selected = { type: 'stop', id: nearest.id }; }
  return { lang, year, mode, selected, view: parseView(params.get('view')), showJamborees: selected?.type === 'jamboree' || params.get('jamborees') !== '0', showOrganizations: params.get('orgs') === '1', panel: params.get('panel') === 'chart' ? 'chart' : params.get('panel') === 'story' ? 'story' : null, playing: false };
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
  if (state.view.k !== 1 || state.view.x !== 0 || state.view.y !== 0) p.set('view', [state.view.k, state.view.x, state.view.y].map(n => Number(n.toFixed(2))).join(','));
  if (!state.showJamborees) p.set('jamborees', '0');
  if (state.showOrganizations) p.set('orgs', '1');
  if (state.panel) p.set('panel', state.panel);
  return p.toString();
}
