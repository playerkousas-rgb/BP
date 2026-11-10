// B-P Atlas v1.0 · © SCOUT SYSTEM
import { applyLanguage, getInitialLanguage, localize, t } from './i18n.js';

const params = new URLSearchParams(location.search);
let lang = getInitialLanguage(params), data = null, failed = false;
const table = document.querySelector('#membership-sources'), list = document.querySelector('#source-list');

function sourceLink(source) {
  const link = document.createElement('a');
  let url;
  try { url = new URL(source.url); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.textContent = localize(source.title, lang); return link;
}
function number(value, precision) {
  if (value == null) return '—';
  const prefix = precision === 'approx' ? t('approximate', lang) : precision === 'at-least' ? t('atLeast', lang) : '';
  return `${prefix}${value.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en')}`;
}
function render() {
  applyLanguage(lang);
  document.title = `${t('creditsTitle', lang)} · B-P Atlas v1.0 · © SCOUT SYSTEM`;
  document.querySelector('#back-link').href = `index.html?lang=${lang}`;
  document.querySelector('.brand').href = `index.html?lang=${lang}`;
  const status = document.querySelector('#sources-status');
  status.textContent = t(failed ? 'creditsLoadError' : 'creditsLoading', lang);
  status.hidden = Boolean(data);
  if (!data) return;
  const byId = new Map(data.sources.map(source => [source.id, source]));
  table.replaceChildren(); list.replaceChildren();
  for (const row of data.membership) {
    const tr = document.createElement('tr');
    for (const value of [String(row.year), number(row.members, row.precision), number(row.countries, row.countriesPrecision)]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    const sources = document.createElement('td'); sources.className = 'source-links';
    if (row.kind === 'estimated-reach') {
      const note = document.createElement('span'); note.textContent = `${t('estimatedReach', lang)}: `; sources.append(note);
    }
    if (row.organisationNote) {
      const note = document.createElement('span'); note.textContent = localize(row.organisationNote, lang); sources.append(note);
    }
    for (const id of row.sources) {
      const source = byId.get(id), link = source && sourceLink(source); if (link) sources.append(link);
    }
    tr.append(sources); table.append(tr);
  }
  for (const source of data.sources) {
    const link = sourceLink(source); if (!link) continue;
    const li = document.createElement('li'), id = document.createElement('span');
    id.className = 'source-id'; id.textContent = source.id; li.append(id, link); list.append(li);
  }
}
document.querySelector('#language-button').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try {
    const url = new URL(location.href); url.searchParams.set('lang', lang);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* Browsing may be restricted; the page can still switch language. */ }
  render();
});
render();
try {
  const entries = await Promise.all(['membership', 'sources'].map(async name => {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`Could not load ${name}`);
    const value = await response.json(); if (!Array.isArray(value)) throw new Error(`Invalid ${name}`);
    return [name, value];
  }));
  data = Object.fromEntries(entries);
} catch (error) { failed = true; console.error('Sources could not be loaded:', error); }
render();
