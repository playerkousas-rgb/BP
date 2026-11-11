// B-P Atlas v1.1 · © SCOUT SYSTEM
import { localize, t } from './i18n.js';
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
  const value = point.value.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en');
  if (point.precision === 'at-least') return `${t('atLeast', lang)}${value}`;
  if (point.precision === 'approx') return `${t('approximate', lang)}${value}`;
  return value;
}

export function createChart(rows, sources, maxYear, onYear) {
  const svg = document.querySelector('#membership-chart');
  const select = document.querySelector('#chart-year-select');
  const startYear = 1907;
  let width = 800, height = 230, x0 = 58, x1 = 776, y0 = 20, y1 = 186;
  const endYear = Math.max(startYear + 1, maxYear);
  const available = rows.filter(row => Number.isFinite(row.members) && row.year <= maxYear).sort((a, b) => a.year - b.year);
  const sourceIndex = new Map(sources.map(source => [source.id, source]));
  const maxValue = Math.max(60000000, ...available.map(row => row.members));
  const x = year => x0 + (year - startYear) / (endYear - startYear) * (x1 - x0);
  const y = count => y1 - clamp(count / maxValue, 0, 1) * (y1 - y0);
  // Snap taps to actual reported years so even closely-spaced dots are usable.
  svg.addEventListener('click', event => {
    if (!available.length || !svg.getScreenCTM()) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const vx = point.matrixTransform(svg.getScreenCTM().inverse()).x;
    const target = startYear + clamp((vx - x0) / (x1 - x0), 0, 1) * (endYear - startYear);
    const closest = available.reduce((best, row) => Math.abs(row.year - target) < Math.abs(best.year - target) ? row : best);
    onYear(closest.year);
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
          link.textContent = localize(source.title, lang); link.dataset.sourceId = id; sourceBox.append(link);
        } catch { /* Invalid source URLs are rejected by the data validator. */ }
      }
      // The blank choice also accurately represents a selected year without data.
      select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.disabled = true; placeholder.textContent = point ? t('populationChoose', lang) : `${year} · ${t('noData', lang)}`; select.append(placeholder);
      for (const item of available) {
        const option = document.createElement('option'); option.value = String(item.year); option.textContent = String(item.year); select.append(option);
      }
      select.value = point ? String(year) : '';

      // Match SVG units to its rendered size so axis labels remain legible on
      // small screens rather than shrinking with a fixed desktop viewBox.
      const bounds = svg.getBoundingClientRect();
      width = Math.max(240, Math.round(bounds.width)); height = Math.max(140, Math.round(bounds.height));
      x0 = width < 400 ? 44 : 58; x1 = width - 18; y0 = 18; y1 = height - 31;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.dataset.year = year; svg.setAttribute('aria-valuemax', String(maxYear)); svg.setAttribute('aria-valuenow', String(year));
      svg.setAttribute('aria-valuetext', `${year}: ${value}. ${label}`); svg.replaceChildren();
      const title = svgEl('title'); title.textContent = t('chartClick', lang); svg.append(title);
      for (const [value, axisLabel] of [[maxValue, lang === 'zh' ? `${maxValue / 10000000}千萬` : `${maxValue / 1000000}m`], [maxValue / 2, lang === 'zh' ? `${maxValue / 20000000}千萬` : `${maxValue / 2000000}m`], [0, '0']]) {
        const yy = y(value); svg.append(svgEl('line', { x1: x0, y1: yy, x2: x1, y2: yy, class: 'chart-grid' }));
        const text = svgEl('text', { x: x0 - 10, y: yy + 4, 'text-anchor': 'end', class: 'chart-axis-text' }); text.textContent = axisLabel; svg.append(text);
      }
      if (year >= startYear) {
        const cursorX = x(clamp(year, startYear, endYear));
        svg.append(svgEl('line', { x1: cursorX, y1: y0, x2: cursorX, y2: y1, class: 'chart-cursor' }));
      }
      for (const item of available) {
        const selected = item.year === year;
        const circle = svgEl('circle', { cx: x(item.year), cy: y(item.members), r: selected ? 7 : 4.5, class: `chart-point${item.kind === 'estimated-reach' ? ' is-estimate' : ''}${selected ? ' is-current' : ''}`, 'data-year': item.year });
        const hint = svgEl('title'); hint.textContent = `${item.year} · ${formatValue(membershipAtYear(rows, item.year), lang)}`; circle.append(hint); svg.append(circle);
      }
      const labels = [1907, 1950, 1980, 2000, maxYear].filter((item, index, array) => item <= maxYear && array.indexOf(item) === index);
      labels.forEach((yearLabel, index) => {
        const text = svgEl('text', { x: x(yearLabel), y: height - 5, 'text-anchor': index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle', class: 'chart-axis-text' }); text.textContent = String(yearLabel); svg.append(text);
      });
    },
  };
}
