// B-P Atlas v1.0 · © SCOUT SYSTEM
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
function formatValue(point, lang) {
  if (!point) return t('noData', lang);
  const value = point.value.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en');
  if (point.precision === 'at-least') return `${t('atLeast', lang)}${value}`;
  if (point.precision === 'approx') return `${t('approximate', lang)}${value}`;
  return value;
}

export function createChart(rows, maxYear, onYear) {
  const svg = document.querySelector('#membership-chart');
  const startYear = 1907, x0 = 29, x1 = 306, y0 = 9, y1 = 84;
  const x = year => x0 + (year - startYear) / (maxYear - startYear) * (x1 - x0);
  const yMember = count => y1 - clamp(count / 60000000, 0, 1) * (y1 - y0);
  const yOrg = count => y1 - clamp(count / 180, 0, 1) * (y1 - y0);
  svg.addEventListener('click', event => {
    const rect = svg.getBoundingClientRect();
    const vx = (event.clientX - rect.left) / rect.width * 320;
    onYear(Math.round(startYear + clamp((vx - x0) / (x1 - x0), 0, 1) * (maxYear - startYear)));
  });
  svg.addEventListener('keydown', event => {
    const current = Number(svg.dataset.year);
    const offsets = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (Object.hasOwn(offsets, event.key)) { event.preventDefault(); onYear(current + offsets[event.key]); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); onYear(event.key === 'Home' ? MIN_YEAR : maxYear); }
  });
  return {
    render(state) {
      const { lang, year } = state; svg.dataset.year = year; svg.setAttribute('aria-valuemax', String(maxYear));
      svg.setAttribute('aria-valuenow', String(year)); svg.replaceChildren();
      const title = svgEl('title'); title.textContent = t('chartClick', lang); svg.append(title);
      for (const [value, label] of [[60000000, lang === 'zh' ? '6千萬' : '60m'], [30000000, lang === 'zh' ? '3千萬' : '30m'], [0, '0']]) {
        const yy = yMember(value); svg.append(svgEl('line', { x1: x0, y1: yy, x2: x1, y2: yy, class: 'chart-grid' }));
        const text = svgEl('text', { x: x0 - 6, y: yy + 3, 'text-anchor': 'end', class: 'chart-axis-text' }); text.textContent = label; svg.append(text);
      }
      const members = rows.filter(row => Number.isFinite(row.members) && row.year <= maxYear);
      for (const row of members) svg.append(svgEl('circle', { cx: x(row.year), cy: yMember(row.members), r: 2.5, class: 'chart-point', 'data-year': row.year }));
      if (state.showOrganizations) {
        const orgs = rows.filter(row => Number.isFinite(row.countries) && row.year <= maxYear);
        for (const row of orgs) svg.append(svgEl('circle', { cx: x(row.year), cy: yOrg(row.countries), r: 2.3, class: 'chart-org-point', 'data-year': row.year }));
        const rightAxis = svgEl('text', { x: x1, y: y0 - 2, 'text-anchor': 'end', class: 'chart-axis-text' }); rightAxis.textContent = '180'; svg.append(rightAxis);
      }
      const cursorX = x(clamp(year, startYear, maxYear));
      svg.append(svgEl('line', { x1: cursorX, y1: y0, x2: cursorX, y2: y1, class: 'chart-cursor' }));
      for (const [yearLabel, anchor] of [[startYear, 'start'], [maxYear, 'end']]) {
        const text = svgEl('text', { x: x(yearLabel), y: 104, 'text-anchor': anchor, class: 'chart-axis-text' }); text.textContent = String(yearLabel); svg.append(text);
      }
      const point = membershipAtYear(rows, year);
      const value = formatValue(point, lang);
      const label = point ? `${t('people', lang)} · ${year} · ${t(point.kind === 'estimated-reach' ? 'estimatedReach' : 'dataPoint', lang)}` : t(year < startYear ? 'chartBefore' : 'chartAfter', lang);
      document.querySelector('#chart-value').textContent = value;
      document.querySelector('#chart-value-label').textContent = label;
      const orgPoint = organizationsAtYear(rows, year), orgValue = formatValue(orgPoint, lang);
      const orgNote = orgPoint?.note ? localize(orgPoint.note, lang) : '';
      document.querySelector('#chart-org-current').hidden = !state.showOrganizations;
      document.querySelector('#chart-org-value').textContent = orgValue;
      document.querySelector('#chart-org-note').textContent = orgNote ? ` · ${orgNote}` : '';
      const orgText = state.showOrganizations ? ` ${t('organizations', lang)}: ${orgValue}.${orgNote ? ` ${orgNote}` : ''}` : '';
      svg.setAttribute('aria-valuetext', `${year}: ${value}. ${label}.${orgText}`);
      document.querySelector('#chart-org-toggle').setAttribute('aria-pressed', String(state.showOrganizations));
    },
  };
}
