// B-P Atlas v1.3 · © SCOUT SYSTEM
// Entry point for hong-kong.html. Mirrors js/app.js's gating and error
// handling, then hands the page to js/hk-view.js.
import { applyLanguage, getInitialLanguage, mergeHkMessages, t } from './i18n.js';
// Page-specific strings, loaded only on this page.
import { hkMessages } from './hk-i18n.js';
import { hkMessages as hkTranslations } from './translations-hk.js';
import { enhanceLocalizedData } from './data-translations.js';
import { currentYear } from './state.js';
import { startHkView } from './hk-view.js';

mergeHkMessages(hkMessages, hkTranslations);

const params = new URLSearchParams(location.search);
const initialLang = getInitialLanguage(params);
const maxYear = currentYear();

async function loadData() {
  const names = ['hk', 'hk-areas', 'sources'];
  const entries = await Promise.all(names.map(async name => {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`Could not load ${name}`);
    return [name, await response.json()];
  }));
  return Object.fromEntries(entries);
}

if (!document.documentElement.hasAttribute('data-store-gated')) try {
  applyLanguage(initialLang);
  const supportLink = document.getElementById('storeSupportTop');
  const storeGate = globalThis.ScoutStoreGate;
  if (supportLink && typeof storeGate?.getAppStoreUrl === 'function') {
    supportLink.href = storeGate.getAppStoreUrl('bp');
    supportLink.hidden = false;
  }
  const loaded = await loadData();
  // Only the shared source titles are localised; Hong Kong text is authored
  // directly in data/hk.json.
  const sources = enhanceLocalizedData({ sources: loaded.sources }).sources;
  await startHkView({
    params,
    data: { hk: loaded.hk, hkAreas: loaded['hk-areas'], sources },
  });
} catch (error) {
  console.error('Hong Kong view could not be loaded:', error);
  document.querySelectorAll('.hk-stage, .hk-layout').forEach(node => { node.hidden = true; });
  const message = document.querySelector('#load-error');
  message.hidden = false;
  let fallbackLang = initialLang;
  function showError() {
    message.replaceChildren(document.createTextNode(t('loadError', fallbackLang)));
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = t('retry', fallbackLang);
    retry.addEventListener('click', () => location.reload());
    message.append(retry);
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
