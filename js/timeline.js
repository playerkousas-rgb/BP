// B-P Atlas v1.1 · © SCOUT SYSTEM
import { t } from './i18n.js';
import { MIN_YEAR } from './state.js';
import { adjacentYear, trackYears } from './chronicles.js';
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
    const storyMode = mode === 'journey' || mode === 'jamborees';
    for (const [button, key] of [[previous, storyMode ? 'previousStop' : 'previousRecord'], [next, storyMode ? 'nextStop' : 'nextRecord']]) {
      button.setAttribute('aria-label', t(key, lang)); button.title = t(key, lang);
    }
    const available = trackYears(data, mode, maxYear);
    if (storyMode) {
      const items = (mode === 'journey' ? data.journey : data.jamborees).filter(item => item.year <= maxYear);
      const selectedType = mode === 'journey' ? 'stop' : 'jamboree';
      const index = state.selected?.type === selectedType ? items.findIndex(item => item.id === state.selected.id) : -1;
      previous.disabled = index >= 0 ? index === 0 : !items.some(item => item.year < year);
      next.disabled = index >= 0 ? index === items.length - 1 : !items.some(item => item.year > year);
    } else {
      previous.disabled = adjacentYear(available, year, -1) === null;
      next.disabled = adjacentYear(available, year, 1) === null;
    }
    const play = document.querySelector('#play-button'); play.disabled = !available.length;
    play.setAttribute('aria-label', t(playing ? 'pause' : 'play', lang)); play.title = t(playing ? 'pause' : 'play', lang);
    play.querySelector('use').setAttribute('href', playing ? '#icon-pause' : '#icon-play');
    const hintKey = mode === 'population' ? 'timelinePopulationHint' : mode === 'members' ? 'timelineMembersHint' : mode === 'jamborees' ? 'timelineJamboreeHint' : 'timelineHint';
    document.querySelector('.timeline-hint').textContent = t(hintKey, lang);
    document.querySelector('.timeline-instruction span').textContent = t(mode === 'population' ? 'timelinePopulationHint' : mode === 'members' ? 'timelineMembersInstruction' : 'timelineInstruction', lang);
    const events = document.querySelector('#timeline-events');
    const restoreCancelFocus = document.activeElement?.classList.contains('timeline-cancel');
    events.replaceChildren();
    for (const eventYear of available) {
      const dot = document.createElement('span'); dot.className = 'timeline-event'; dot.setAttribute('aria-hidden', 'true'); dot.style.left = `${(eventYear - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`; events.append(dot);
    }
    if (mode === 'jamborees' && maxYear >= 1979) {
      const cancelled = document.createElement('button'); cancelled.type = 'button'; cancelled.className = 'timeline-cancel';
      cancelled.style.left = `${(1979 - MIN_YEAR) / (maxYear - MIN_YEAR) * 100}%`;
      cancelled.textContent = t('cancel1979', lang); cancelled.addEventListener('click', () => callbacks.onEvent('jamboree-1979-cancelled'));
      events.append(cancelled); if (restoreCancelFocus) cancelled.focus({ preventScroll: true });
    }
  }};
}
