// B-P Atlas v1.2 · © SCOUT SYSTEM
import { feature, geoEqualEarth, geoGraticule, geoInterpolate, geoPath } from '../vendor/geography.min.js';
import { localize, localeFor, t } from './i18n.js';
import { clamp } from './state.js';
import { locationRecordYear, recordedByYear } from './chronicles.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => { const node = document.createElementNS(NS, name); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); return node; };
const WIDTH = 1000, HEIGHT = 560;
function withinView(view) {
  const k = clamp(view.k, 1, 8);
  return { k, x: clamp(view.x, WIDTH * (1 - k), 0), y: clamp(view.y, HEIGHT * (1 - k), 0) };
}
function spreadColour(year) {
  if (year <= 1909) return '#7d9c80';
  if (year <= 1919) return '#a2b99d';
  if (year <= 1949) return '#bfd0b5';
  return '#d5dec5';
}
function membershipColour(year) {
  if (year <= 1939) return '#698c70';
  if (year <= 1969) return '#86a788';
  if (year <= 1989) return '#a6bfa0';
  if (year <= 2009) return '#bfd0b4';
  return '#d3dfc8';
}
// A short geodesic near the view's centre. Equal Earth has no single global scale.
export function greatCircleKm([lon1, lat1], [lon2, lat2]) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function createMap(world, data, initialView, callbacks) {
  const svg = document.querySelector('#world-map');
  const projection = geoEqualEarth().fitExtent([[19, 20], [981, 540]], { type: 'Sphere' });
  const path = geoPath(projection);
  const root = el('g'); svg.replaceChildren(root);
  const graticule = el('path', { d: path(geoGraticule().step([30, 30])()), class: 'map-graticule' }); root.append(graticule);
  const oceans = el('g'); root.append(oceans);
  const land = el('g'); root.append(land);
  const routes = el('g'); root.append(routes);
  const markers = el('g'); root.append(markers);
  const features = feature(world, world.objects.countries).features;
  const countryPaths = new Map();
  for (const item of features) {
    const country = el('path', { d: path(item) || '', class: 'map-country' });
    const title = el('title'); title.textContent = item.properties?.name || ''; country.append(title); land.append(country);
    if (item.id != null) {
      const id = String(item.id).padStart(3, '0');
      // Natural Earth can split one ISO area across separate features (for
      // example Australia and Ashmore/Cartier). Retain all of them.
      if (!countryPaths.has(id)) countryPaths.set(id, []);
      countryPaths.get(id).push(country);
    }
  }
  const nsoByMap = new Map(data.nso.filter(n => n.mapId).map(n => [n.mapId, n]));
  let view = withinView(initialView), state = null, suppressClickUntil = 0;
  const mapPoints = new Map();
  function applyTransform() {
    root.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
    const rect = svg.getBoundingClientRect();
    // Keep marker sizes and touch targets in CSS pixels at every viewport and zoom level.
    const screenScale = Math.min(rect.width / WIDTH, rect.height / HEIGHT) || 1;
    markers.querySelectorAll('.map-marker').forEach(marker => marker.setAttribute('transform', `translate(${marker.dataset.x},${marker.dataset.y}) scale(${1 / (view.k * screenScale)}) translate(${marker.dataset.dx || 0},${marker.dataset.dy || 0})`));
    updateScale(rect);
  }
  function updateScale(rect) {
    const scale = document.querySelector('#map-scale'), label = document.querySelector('#map-scale-label');
    if (!rect.width || !rect.height || !svg.getScreenCTM()) { scale.hidden = true; return; }
    const centreX = rect.left + rect.width / 2, centreY = rect.top + rect.height / 2;
    const points = [-30, 30].map(dx => {
      const p = localPoint({ clientX: centreX + dx, clientY: centreY });
      return projection.invert([(p.x - view.x) / view.k, (p.y - view.y) / view.k]);
    });
    // Outside the projected globe, there is no meaningful scale to display.
    if (points.some(p => !p || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) { scale.hidden = true; return; }
    const km = greatCircleKm(points[0], points[1]);
    if (!Number.isFinite(km) || km <= 0) { scale.hidden = true; return; }
    const step = km >= 1000 ? 100 : km >= 100 ? 10 : km >= 10 ? 1 : .1;
    const distance = (Math.round(km / step) * step).toLocaleString(localeFor(state?.lang), { maximumFractionDigits: 1 });
    label.textContent = t('scaleAtCentre', state?.lang || 'zh', { distance }); scale.hidden = false;
  }
  function setView(next, notify = true) {
    view = withinView(next); applyTransform(); if (notify) callbacks.onView({ ...view });
  }
  function localPoint(event) {
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const ctm = svg.getScreenCTM(); return ctm ? point.matrixTransform(ctm.inverse()) : point;
  }
  function zoomAt(newK, x, y) {
    newK = clamp(newK, 1, 8);
    const factor = newK / view.k;
    setView({ k: newK, x: x - (x - view.x) * factor, y: y - (y - view.y) * factor });
  }
  window.addEventListener('resize', applyTransform);
  svg.addEventListener('wheel', event => { event.preventDefault(); const point = localPoint(event); zoomAt(view.k * Math.exp(-event.deltaY * .0015), point.x, point.y); }, { passive: false });
  let moved = false, lastMid = null, lastDistance = 0, start = null;
  svg.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    mapPoints.set(event.pointerId, localPoint(event));
    if (mapPoints.size === 1) { moved = false; start = localPoint(event); }
    if (mapPoints.size === 2) {
      const [a,b] = [...mapPoints.values()]; lastMid = { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }; lastDistance = Math.hypot(a.x-b.x,a.y-b.y); moved = true;
    }
  });
  svg.addEventListener('pointermove', event => {
    if (!mapPoints.has(event.pointerId)) return;
    const old = mapPoints.get(event.pointerId), point = localPoint(event); mapPoints.set(event.pointerId, point);
    if (mapPoints.size === 1) {
      if (!moved && start && Math.hypot(point.x - start.x, point.y - start.y) > 4) moved = true;
      if (moved) {
        if (!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
        svg.classList.add('is-dragging'); setView({ ...view, x: view.x + point.x - old.x, y: view.y + point.y - old.y });
      }
    } else if (mapPoints.size === 2) {
      if (!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
      const [a,b] = [...mapPoints.values()], mid = { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }, distance = Math.hypot(a.x-b.x,a.y-b.y);
      if (lastMid && lastDistance > 0) {
        const k = clamp(view.k * distance / lastDistance, 1, 8), factor = k / view.k;
        setView({ k, x: mid.x - (lastMid.x - view.x) * factor, y: mid.y - (lastMid.y - view.y) * factor });
      }
      lastMid = mid; lastDistance = distance; moved = true; svg.classList.add('is-dragging');
    }
  });
  const endPointer = event => {
    if (moved) suppressClickUntil = Date.now() + 350;
    mapPoints.delete(event.pointerId); if (mapPoints.size < 2) { lastMid = null; lastDistance = 0; }
    if (mapPoints.size === 1) start = [...mapPoints.values()][0];
    if (!mapPoints.size) { svg.classList.remove('is-dragging'); start = null; }
  };
  svg.addEventListener('pointerup', endPointer); svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('click', event => { if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); } }, true);
  svg.addEventListener('keydown', event => {
    if (event.target !== svg) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); event.stopPropagation(); zoomAt(view.k * 1.4, WIDTH/2, HEIGHT/2); }
    if (event.key === '-') { event.preventDefault(); event.stopPropagation(); zoomAt(view.k / 1.4, WIDTH/2, HEIGHT/2); }
  });
  document.querySelector('#zoom-in').addEventListener('click', () => zoomAt(view.k * 1.5, WIDTH / 2, HEIGHT / 2));
  document.querySelector('#zoom-out').addEventListener('click', () => zoomAt(view.k / 1.5, WIDTH / 2, HEIGHT / 2));
  document.querySelector('#zoom-reset').addEventListener('click', () => setView({ k: 1, x: 0, y: 0 }));
  function activate(node, type, id) {
    node.addEventListener('click', event => { event.stopPropagation(); callbacks.onSelect(type, id); });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); callbacks.onSelect(type, id); }
    });
  }
  for (const [id, parts] of countryPaths) {
    const nso = nsoByMap.get(id);
    if (nso) for (const country of parts) { country.dataset.nsoId = nso.id; activate(country, 'nso', nso.id); }
  }
  function addOceanLabel(key, coords, lang) {
    const p = projection(coords); if (!p) return;
    const text = el('text', { x: p[0], y: p[1], class: 'map-ocean-label', 'text-anchor': 'middle' }); text.textContent = t(key, lang); oceans.append(text);
  }
  function addMarker(item, type, index, selected, lang, offset = {}) {
    const point = projection(type === 'nso' ? item.marker : [item.lon, item.lat]); if (!point) return;
    const dx = offset.dx ?? (item.id === 'HKG' ? 9 : item.id === 'MAC' ? -9 : 0);
    const dy = offset.dy ?? 0;
    const marker = el('g', { class: `map-marker ${type === 'nso' ? 'nso-marker' : type === 'jamboree' ? 'jamboree-marker' : 'stop-marker'}${selected ? ' selected' : ''}${item.cancelled ? ' cancelled' : ''}`, role: 'button', tabindex: '0' });
    marker.dataset.x = point[0]; marker.dataset.y = point[1]; marker.dataset.dx = dx; marker.dataset.dy = dy;
    marker.dataset.type = type; marker.dataset.id = item.id;
    const nsoYear = type === 'nso' ? locationRecordYear(item, state.mode) : null;
    const dispute = type === 'nso' && state.mode === 'members' && item.wosmMembership.dispute === 'year';
    const label = type === 'stop' ? `${item.year} · ${localize(item.place, lang)} · ${localize(item.title, lang)}`
      : type === 'nso' ? `${localize(item.name, lang)} · ${nsoYear}${dispute ? ` · ${t('directoryYearDisputed', lang)}` : ''}`
      : `${item.year} · ${localize(item.place, lang)} · ${item.cancelled ? t('eventCancelled', lang) : t('eventNumber', lang, { n: item.n })}`;
    marker.classList.toggle('is-disputed', Boolean(dispute));
    if (type === 'nso') {
      // Small locations must follow the same date encoding as the polygons;
      // otherwise Hong Kong or Macau could appear older than they are.
      marker.style.setProperty('--nso-record-fill', state.mode === 'members' ? membershipColour(nsoYear) : spreadColour(nsoYear));
      marker.classList.toggle('is-new-record', state.mode === 'members' && nsoYear === state.year);
    }
    marker.setAttribute('aria-label', label); marker.setAttribute('aria-pressed', String(Boolean(selected)));
    const title = el('title'); title.textContent = label; marker.append(title);
    if (dx || dy) marker.append(el('line', { x1: -dx, y1: -dy, x2: 0, y2: 0, class: 'marker-leader' }));
    if (selected) marker.append(el('circle', { r: 15, class: 'marker-halo' }));
    // The transparent hit area keeps small markers usable with touch and keyboard.
    marker.append(el('circle', { r: 18, fill: 'transparent' }));
    if (type === 'stop') {
      marker.append(el('circle', { r: selected ? 7.5 : 6.5, class: 'marker-circle' }));
      const number = el('text', { class: 'marker-number', y: .2 }); number.textContent = String(index + 1); marker.append(number);
    } else if (type === 'nso') marker.append(el('circle', { r: 5.5, class: 'marker-circle' }));
    else {
      marker.append(el('circle', { r: 7.5, class: 'marker-circle' }));
      marker.append(el('path', { d: item.cancelled ? 'M-3,-3L3,3M3,-3L-3,3' : 'M-4,3 L0,-4 L4,3 Z M0,-4 L0,3', class: 'tent' }));
    }
    if (selected) {
      const short = type === 'nso' ? localize(item.name, lang) : localize(item.place, lang);
      const labelWidth = Math.min(145, 16 + Array.from(short).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 10 : 6), 0));
      marker.append(el('path', { d: 'M6,-6L16,-16', class: 'label-line' }));
      marker.append(el('rect', { x: 15, y: -30, width: labelWidth, height: 19, rx: 2, class: 'label-bg' }));
      const text = el('text', { x: 22, y: -20, class: 'marker-label' }); text.textContent = short; marker.append(text);
    }
    activate(marker, type, item.id); markers.append(marker);
  }
  function render(nextState) {
    state = nextState; const { year, lang, mode, selected } = state;
    const focused = document.activeElement?.closest?.('.map-marker');
    const focusedKey = focused && svg.contains(focused) ? [focused.dataset.type, focused.dataset.id] : null;
    oceans.replaceChildren();
    addOceanLabel('oceanPacific', [-145, 7], lang); addOceanLabel('oceanAtlantic', [-32, 7], lang); addOceanLabel('oceanIndian', [78, -31], lang);
    for (const [id, parts] of countryPaths) {
      const nso = nsoByMap.get(id);
      const available = Boolean(nso && recordedByYear(nso, year, mode));
      const recordYear = available ? locationRecordYear(nso, mode) : null;
      const disputed = available && mode === 'members' && nso.wosmMembership.dispute === 'year';
      parts.forEach((country, index) => {
        country.style.fill = available ? (mode === 'members' ? membershipColour(recordYear) : spreadColour(recordYear)) : '';
        country.classList.toggle('is-selectable', available);
        country.classList.toggle('is-selected', Boolean(available && selected?.type === 'nso' && selected.id === nso.id));
        country.classList.toggle('is-disputed', Boolean(disputed));
        country.classList.toggle('is-new-record', Boolean(available && recordYear === year));
        if (available) {
          const label = `${localize(nso.name, lang)} · ${recordYear}${disputed ? ` · ${t('directoryYearDisputed', lang)}` : ''}`;
          // Extra pieces remain clickable, but only the first is a keyboard
          // target to avoid duplicate controls for the same organisation.
          if (index === 0) {
            country.setAttribute('role', 'button'); country.setAttribute('tabindex', '0'); country.setAttribute('aria-label', label);
            country.setAttribute('aria-pressed', String(selected?.type === 'nso' && selected.id === nso.id));
          } else {
            country.removeAttribute('role'); country.removeAttribute('tabindex'); country.removeAttribute('aria-label'); country.removeAttribute('aria-pressed');
          }
          country.querySelector('title').textContent = label;
        } else {
          country.removeAttribute('role'); country.removeAttribute('tabindex'); country.removeAttribute('aria-label'); country.removeAttribute('aria-pressed');
          if (nso) country.querySelector('title').textContent = localize(nso.name, lang);
        }
        // No primary date (or a later date) is not a historical map selection.
        country.style.pointerEvents = available ? 'auto' : 'none';
      });
    }
    routes.replaceChildren(); markers.replaceChildren();
    const visibleMarkers = [];
    if (mode === 'journey') {
      const stops = data.journey.filter(stop => stop.year <= year);
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i-1], b = stops[i];
        if (a.lon === b.lon && a.lat === b.lat) continue;
        const interpolate = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
        const coordinates = Array.from({ length: 21 }, (_, j) => interpolate(j / 20));
        routes.append(el('path', { d: path({ type: 'LineString', coordinates }) || '', class: `map-route${selected?.type === 'stop' && selected.id === b.id ? ' current' : ''}` }));
      }
      stops.forEach(stop => visibleMarkers.push({ item: stop, type: 'stop', index: data.journey.indexOf(stop), selected: selected?.type === 'stop' && selected.id === stop.id }));
    } else if (mode === 'members' || mode === 'spread') {
      data.nso.filter(nso => nso.small && nso.marker && recordedByYear(nso, year, mode)).forEach(nso => {
        visibleMarkers.push({ item: nso, type: 'nso', index: 0, selected: selected?.type === 'nso' && selected.id === nso.id });
      });
      // Selected larger areas also get a labelled point so the selection is visible.
      const selectedNso = data.nso.find(n => selected?.type === 'nso' && selected.id === n.id && !n.small && n.marker && recordedByYear(n, year, mode));
      if (selectedNso) visibleMarkers.push({ item: selectedNso, type: 'nso', index: 0, selected: true });
    } else if (mode === 'jamborees') {
      const events = data.jamborees.filter(item => item.year <= year);
      // The line is an event sequence, not a route travelled; cancelled events
      // remain marked but are not included among held sites.
      const held = events.filter(item => !item.cancelled);
      for (let i = 1; i < held.length; i++) {
        const a = held[i - 1], b = held[i];
        if (a.lon === b.lon && a.lat === b.lat) continue;
        const interpolate = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
        const coordinates = Array.from({ length: 21 }, (_, j) => interpolate(j / 20));
        routes.append(el('path', { d: path({ type: 'LineString', coordinates }) || '', class: `map-route jamboree-route${selected?.type === 'jamboree' && selected.id === b.id ? ' current' : ''}` }));
      }
      events.forEach(event => visibleMarkers.push({ item: event, type: 'jamboree', index: 0, selected: selected?.type === 'jamboree' && selected.id === event.id }));
    }
    // Coincident records (e.g. a journey stop and a jamboree at the same park)
    // need distinct click targets even at maximum zoom. Their offsets are in CSS px.
    const colocated = new Map();
    for (const marker of visibleMarkers) {
      const coords = marker.type === 'nso' ? marker.item.marker : [marker.item.lon, marker.item.lat];
      const key = coords.map(value => value.toFixed(4)).join(',');
      if (!colocated.has(key)) colocated.set(key, []);
      colocated.get(key).push(marker);
    }
    for (const group of colocated.values()) if (group.length > 1) {
      const radius = Math.max(14, group.length * 8);
      group.forEach((marker, index) => {
        const angle = -Math.PI / 2 + index * 2 * Math.PI / group.length;
        marker.offset = { dx: Math.round(radius * Math.cos(angle)), dy: Math.round(radius * Math.sin(angle)) };
      });
    }
    visibleMarkers.sort((a, b) => Number(a.selected) - Number(b.selected));
    visibleMarkers.forEach(marker => addMarker(marker.item, marker.type, marker.index, marker.selected, lang, marker.offset));
    applyTransform();
    // A render replaces marker nodes; keep keyboard focus on the equivalent marker.
    if (focusedKey) {
      const replacement = [...markers.querySelectorAll('.map-marker')].find(marker => marker.dataset.type === focusedKey[0] && marker.dataset.id === focusedKey[1]);
      replacement?.focus({ preventScroll: true });
    }
  }
  return { render, setView, focus(item) {
    const point = projection(item.marker || [item.lon, item.lat]); if (!point) return;
    const k = 3; setView({ k, x: WIDTH / 2 - point[0] * k, y: HEIGHT / 2 - point[1] * k });
  }, getView: () => ({ ...view }) };
}
