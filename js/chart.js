// B-P Atlas v1.2 · © SCOUT SYSTEM
import { localize, localizationLanguage, localeFor, t } from './i18n.js';
import { clamp, MIN_YEAR } from './state.js';
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs = {}) => { const el = document.createElementNS(NS, name); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value)); return el; };

// A missing year is not a count. Do not interpolate, carry forward or extrapolate.
export function membershipAtYear(rows, year) {
  const row = rows.find(point => point.year === year && Number.isFinite(point.members));
  return row ? { value: row.members, precision: row.precision, year, ...(row.kind ? { kind: row.kind } : {}) } : null;
}
export function organizationsAtYear(rows, year) {
  const row = rows.find(point => point.year === year && Number.isFinite(point.countries));
  return row ? { value: row.countries, precision: row.countriesPrecision, year, ...(row.organisationNote ? { note: row.organisationNote } : {}) } : null;
}
export function formatValue(point, lang) {
  if (!point) return t('noData', lang);
  const value = point.value.toLocaleString(localeFor(lang));
  if (point.precision === 'at-least') return ['ja', 'ko', 'hi'].includes(lang) ? `${value}${t('atLeast', lang)}` : `${t('atLeast', lang)}${value}`;
  if (point.precision === 'approx') return `${t('approximate', lang)}${value}`;
  return value;
}

export function createChart(rows, sources, maxYear, onYear) {
  const svg = document.querySelector('#membership-chart');
  const select = document.querySelector('#chart-year-select');
  const startYear = 1907;
  let width = 800, height = 230, x0 = 58, x1 = 776, y0 = 20, y1 = 186;
  const available = rows.filter(row => Number.isFinite(row.members) && row.year <= maxYear).sort((a, b) => a.year - b.year);
  const sourceIndex = new Map(sources.map(source => [source.id, source]));
  const maxValue = Math.max(60000000, ...available.map(row => row.members));
  const y = count => y1 - clamp(count / maxValue, 0, 1) * (y1 - y0);
  // Bars are equally spaced by reported record, not by elapsed time. Selecting
  // a band (including a tiny bar such as 1907) finds that actual source year.
  svg.addEventListener('click', event => {
    if (!available.length || !svg.getScreenCTM()) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const vx = point.matrixTransform(svg.getScreenCTM().inverse()).x;
    const index = Math.min(available.length - 1, Math.floor(clamp((vx - x0) / (x1 - x0), 0, 1) * available.length));
    onYear(available[index].year);
  });
  svg.addEventListener('keydown', event => {
    const current = Number(svg.dataset.year);
    const offsets = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (Object.hasOwn(offsets, event.key)) { event.preventDefault(); onYear(current + offsets[event.key]); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); onYear(event.key === 'Home' ? MIN_YEAR : maxYear); }
  });
  select.addEventListener('change', () => { if (select.value) onYear(Number(select.value)); });
  return {
    render(state) {
      const { lang, year } = state;
      const point = membershipAtYear(rows, year);
      const label = point
        ? point.year === 1907 ? t('populationCamp', lang) : `${t('people', lang)} · ${t(point.kind === 'estimated-reach' ? 'estimatedReach' : 'dataPoint', lang)}`
        : t(year < startYear ? 'chartBefore' : 'chartAfter', lang);
      const value = formatValue(point, lang);
      document.querySelector('#chart-year').textContent = String(year);
      document.querySelector('#chart-value').textContent = value;
      document.querySelector('#chart-value-label').textContent = label;
      document.querySelector('#chart-meter').style.width = `${point ? point.value / maxValue * 100 : 0}%`;

      const sourceBox = document.querySelector('#chart-source'); sourceBox.replaceChildren();
      const row = rows.find(item => item.year === year && Number.isFinite(item.members));
      const sourceLabel = document.createElement('span'); sourceLabel.textContent = t(row ? 'populationSource' : 'populationNoSource', lang); sourceBox.append(sourceLabel);
      if (row) for (const id of row.sources) {
        const source = sourceIndex.get(id); if (!source) continue;
        try {
          const url = new URL(source.url); if (!['https:', 'http:'].includes(url.protocol)) continue;
          const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.textContent = localize(source.title, lang); link.lang = localizationLanguage(source.title, lang) || localeFor(lang); link.dataset.sourceId = id; sourceBox.append(link);
        } catch { /* Invalid source URLs are rejected by the data validator. */ }
      }
      if (row && !['zh', 'en'].includes(lang)) {
        const note = document.createElement('p'); note.className = 'translation-note'; note.textContent = t('translationNote', lang); sourceBox.append(note);
      }
      select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.disabled = true; placeholder.textContent = point ? t('populationChoose', lang) : `${year} · ${t('noData', lang)}`; select.append(placeholder);
      for (const item of available) {
        const option = document.createElement('option'); option.value = String(item.year); option.textContent = String(item.year); select.append(option);
      }
      select.value = point ? String(year) : '';

      // Match SVG units to its rendered size so labels do not shrink on mobile.
      const bounds = svg.getBoundingClientRect();
      width = Math.max(240, Math.round(bounds.width)); height = Math.max(140, Math.round(bounds.height));
      x0 = width < 400 ? 44 : 58; x1 = width - 18; y0 = 18; y1 = height - 31;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.dataset.year = year; svg.setAttribute('aria-valuemax', String(maxYear)); svg.setAttribute('aria-valuenow', String(year));
      svg.setAttribute('aria-valuetext', `${year}: ${value}. ${label}`); svg.replaceChildren();
      const title = svgEl('title'); title.textContent = t('chartClick', lang); svg.append(title);
      const defs = svgEl('defs');
      const pattern = svgEl('pattern', { id: 'estimate-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
      pattern.append(svgEl('rect', { width: 6, height: 6, fill: '#f2e6d9' }), svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#a35e40', 'stroke-width': 2 }));
      defs.append(pattern); svg.append(defs);
      const number = new Intl.NumberFormat(localeFor(lang), { notation: 'compact', maximumFractionDigits: 1 });
      for (const count of [maxValue, maxValue / 2, 0]) {
        const yy = y(count); svg.append(svgEl('line', { x1: x0, y1: yy, x2: x1, y2: yy, class: 'chart-grid' }));
        const text = svgEl('text', { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', class: 'chart-axis-text' }); text.textContent = number.format(count); svg.append(text);
      }
      const band = (x1 - x0) / Math.max(1, available.length);
      const barWidth = Math.min(20, band * .72);
      available.forEach((item, index) => {
        const top = y(item.members), selected = item.year === year;
        const bar = svgEl('rect', { x: x0 + index * band + (band - barWidth) / 2, y: top, width: barWidth, height: y1 - top, class: `chart-bar${item.kind === 'estimated-reach' ? ' is-estimate' : ''}${selected ? ' is-current' : ''}`, 'data-year': item.year });
        const hint = svgEl('title'); hint.textContent = `${item.year} · ${formatValue(membershipAtYear(rows, item.year), lang)}`; bar.append(hint); svg.append(bar);
      });
      // Labels sample the categorical record sequence; the caption explicitly
      // says spacing is equal and missing years are omitted, not zero.
      if (available.length) {
        const count = width < 400 ? 3 : 5;
        const indices = [...new Set(Array.from({ length: count }, (_, i) => Math.round(i * (available.length - 1) / (count - 1))))];
        indices.forEach((index, position) => {
          const text = svgEl('text', { x: x0 + (index + .5) * band, y: height - 5, 'text-anchor': position === 0 ? 'start' : position === indices.length - 1 ? 'end' : 'middle', class: 'chart-axis-text' });
          text.textContent = String(available[index].year); svg.append(text);
        });
      }
    },
  };
}
