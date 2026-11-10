// B-P Atlas v1.0 · © SCOUT SYSTEM
import { t } from './i18n.js';
import { MIN_YEAR } from './state.js';
export function createTimeline(data, maxYear, callbacks) {
  const range = document.querySelector('#year-range'); range.max = maxYear;
  range.addEventListener('input', () => callbacks.onYear(Number(range.value)));
  document.querySelector('#previous-button').addEventListener('click', () => callbacks.onAdjacent(-1));
  document.querySelector('#next-button').addEventListener('click', () => callbacks.onAdjacent(1));
  document.querySelector('#play-button').addEventListener('click', callbacks.onPlay);
  const ticks = document.querySelector('#timeline-ticks');
  const years = [...new Set([MIN_YEAR, 1900, 1920, 1950, 1980, 2000, maxYear].filter(y => y <= maxYear))];
  for (const year of years) {
    const tick = document.createElement('span'); tick.style.left = `${(year - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`; tick.textContent = year; ticks.append(tick);
  }
  document.querySelectorAll('[data-current-year]').forEach(el => { el.textContent = maxYear; });
  return { render(state) {
    const { year, lang, mode, playing } = state;
    range.value = year; range.style.setProperty('--progress', `${(year - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`);
    range.setAttribute('aria-valuetext', lang === 'zh' ? `${year} 年` : String(year));
    document.querySelector('#timeline-year').textContent = year;
    const previous = document.querySelector('#previous-button'), next = document.querySelector('#next-button');
    for (const [button, key] of [[previous, mode === 'journey' ? 'previousStop' : 'previousYear'], [next, mode === 'journey' ? 'nextStop' : 'nextYear']]) {
      button.setAttribute('aria-label', t(key, lang)); button.title = t(key, lang);
    }
    const play = document.querySelector('#play-button');
    play.setAttribute('aria-label', t(playing ? 'pause' : 'play', lang)); play.title = t(playing ? 'pause' : 'play', lang);
    play.querySelector('use').setAttribute('href', playing ? '#icon-pause' : '#icon-play');
    const events = document.querySelector('#timeline-events');
    const restoreCancelFocus = document.activeElement?.classList.contains('timeline-cancel');
    events.replaceChildren();
    const eventYears = mode === 'journey' ? data.journey.map(item => item.year) : data.jamborees.map(item => item.year);
    for (const eventYear of new Set(eventYears.filter(y => y <= maxYear))) {
      const dot = document.createElement('span'); dot.className = 'timeline-event'; dot.setAttribute('aria-hidden', 'true'); dot.style.left = `${(eventYear - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`; events.append(dot);
    }
    if (maxYear >= 1979) {
      const cancelled = document.createElement('button'); cancelled.type = 'button'; cancelled.className = 'timeline-cancel';
      cancelled.style.left = `${(1979 - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`;
      cancelled.textContent = t('cancel1979', lang); cancelled.addEventListener('click', () => callbacks.onEvent('jamboree-1979-cancelled'));
      events.append(cancelled); if (restoreCancelFocus) cancelled.focus({ preventScroll: true });
    }
  }};
}
