// B-P Atlas v1.3 · © SCOUT SYSTEM
// Hong Kong Scout-history map: the 44 Scout districts (43 on the ground plus the
// language-defined Silver Jubilee District, which has no territory), Scout
// region labels, region headquarters and jamboree sites.
//
// Deliberately independent of js/map.js: this view allows deeper zoom, adds
// keyboard panning and reports focus to the page.
//
// The district outlines are SCHEMATIC. Scout district boundaries are not
// published as geodata, so data/hk-districts.json was built by cutting the 18
// District Council outlines along the rivers, roads and ridgelines named in
// each district's published history; see scripts/build_hk_districts.mjs. They
// show where a district sits and how the map was redrawn, never an official
// boundary. See data/hk.json about.boundaryNote.
import { localize, localizationLanguage } from './i18n.js';
import { clamp } from './state.js';

const NS = 'http://www.w3.org/2000/svg';
// A flat frame stretched for Hong Kong's latitude so that horizontal and
// vertical distances look comparable in the browser's aspect ratio.
export const LON0 = 113.77, LAT0 = 22.13, LON1 = 114.55, LAT1 = 22.63;
const KX = Math.cos((22.4 * Math.PI) / 180);
export const HK_WIDTH = 800;
export const HK_HEIGHT = Math.round((HK_WIDTH * (LAT1 - LAT0)) / ((LON1 - LON0) * KX));
// Default frame: the harbour, the island and the settled New Territories, with
// room for the jamboree tents in Sai Kung and on Lantau.
export const HK_DEFAULT_VIEW = { k: 1.18, x: -72, y: -76 };
const MAX_ZOOM = 6;
// One tint per Scout region, applied as a CSS custom property so that the
// stylesheet's selected/muted states can still override it.
const REGION_FILL = {
  island: '#7fb8a8', kowloon: '#d4c06a', ekowloon: '#96bf72',
  newterritories: '#e0b86a', ntheast: '#b7cf7a', silverjubilee: '#c8d0c2',
};
// How far apart two district labels must stay, in base-map units. Labels are
// counter-scaled so they keep a constant screen size, so the gap shrinks as the
// reader zooms in and more names become legible.
const LABEL_GAP = 34;
// A district must cover at least this many square screen units before its name
// is worth a label; below it the name would sit on top of the shape it names.
const MIN_LABELLED_AREA = 900;
// Square screen units per square kilometre at the base scale, derived from the
// projection so a district's `area` can be compared with what is on screen.
const UNITS_PER_DEG = HK_WIDTH / (LON1 - LON0);
const SCREEN_PER_KM2 = (UNITS_PER_DEG * UNITS_PER_DEG) / 11322;
// Regional headquarters. Kowloon and East Kowloon share the Hong Kong Scout
// Centre, so one combined marker stands for that building and opens Kowloon.
const HQ = {
  island: { point: [114.1668, 22.2768], label: { zh: '港島總部', en: 'Island HQ' }, dx: 6, dy: 2.8, anchor: 'start' },
  kowloon: { point: [114.1728, 22.3033], label: { zh: '總會 · 九龍 · 東九龍', en: 'HQ · Kowloon · E. Kowloon' }, dx: 6, dy: -4.4, anchor: 'start' },
  newterritories: { point: [114.1375, 22.3605], label: { zh: '新界總部', en: 'N.T. HQ' }, dx: 6, dy: 2.8, anchor: 'start' },
  ntheast: { point: [114.1665, 22.4472], label: { zh: '新界東總部', en: 'N.T. East HQ' }, dx: 6, dy: -4.4, anchor: 'start' },
};
// Screen-space nudges (SVG units at the base scale) so tents that nearly
// coincide stay legible: 1999/2001 share Wan Tsai, 2010/2016 share Penny's Bay,
// and 1957, 2006, 1961 and 2016 sit close to headquarters markers.
const JAMBOREE_OFFSET = {
  'hk-jam-1957': [8, -6], 'hk-jam-1961': [14, -4], 'hk-jam-1971': [-4, 4],
  'hk-jam-1975': [6, -8], 'hk-jam-1982': [-26, 6], 'hk-jam-1986': [13, -2],
  'hk-jam-1999': [-24, -11], 'hk-jam-2001': [-24, 9], 'hk-jam-2006': [-34, -8],
  'hk-jam-2007': [8, -4], 'hk-jam-2010': [-40, -10], 'hk-jam-2016': [-26, 12],
};

export function projectHk([lon, lat]) {
  return [
    ((lon - LON0) / (LON1 - LON0)) * HK_WIDTH,
    ((LAT1 - lat) / (LAT1 - LAT0)) * HK_HEIGHT,
  ];
}

const ringToPath = ring => ring
  .map(([lon, lat], index) => `${index ? 'L' : 'M'}${projectHk([lon, lat]).map(n => Math.round(n * 10) / 10).join(',')}`)
  .join('') + 'Z';
export function areaPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.map(polygon => polygon.map(ringToPath).join('')).join('');
}

// Bilingual data falls back to English outside zh/en; mark that on the node so
// assistive technology pronounces the label correctly.
function setLang(node, value) {
  const lang = document.documentElement.dataset.lang || 'zh';
  const actual = localizationLanguage(value, lang);
  if (actual) node.setAttribute('lang', actual);
  else node.removeAttribute('lang');
}

export function createHkMap(districtsData, hk, callbacks = {}) {
  const svg = document.querySelector('#hk-map');
  const root = document.createElementNS(NS, 'g');
  svg.replaceChildren(root);
  const shapes = document.createElementNS(NS, 'g');
  const labels = document.createElementNS(NS, 'g');
  const markers = document.createElementNS(NS, 'g');
  root.append(shapes, labels, markers);

  // Districts and the historical districts/regions they descend from live in
  // one lookup: before a district existed its territory belonged to its parent.
  const byId = new Map();
  for (const rootEntry of districtsData.roots || []) byId.set(rootEntry.id, rootEntry);
  for (const district of districtsData.districts) byId.set(district.id, district);

  function resolve(district, year) {
    if (year == null) return district;
    let current = district;
    const seen = new Set();
    while (current && (current.formed > year || (current.dissolved != null && current.dissolved <= year))) {
      if (!current.parent || seen.has(current.id)) return null;
      seen.add(current.id);
      current = byId.get(current.parent);
    }
    return current && current.formed <= year && (current.dissolved == null || current.dissolved > year) ? current : null;
  }

  const shapesByCode = new Map();
  const areaLabels = new Map();
  for (const district of districtsData.districts) {
    const outline = document.createElementNS(NS, 'path');
    outline.setAttribute('d', areaPath(district.geometry));
    outline.setAttribute('class', 'hk-area hk-district');
    outline.dataset.code = district.id;
    outline.dataset.region = district.region;
    outline.style.setProperty('--region-fill', REGION_FILL[district.region] || '#e4e4d6');
    const title = document.createElementNS(NS, 'title');
    outline.append(title);
    shapes.append(outline);
    shapesByCode.set(district.id, outline);

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('class', 'hk-area-label');
    text.setAttribute('text-anchor', 'middle');
    text.dataset.code = district.id;
    labels.append(text);
    text.dataset.lonlat = district.label.join(',');
    areaLabels.set(district.id, { node: text, district, lonlat: district.label });
  }

  // Approximate label anchors, not boundaries: they are hand-placed to keep the
  // five names apart from each other and from the headquarters and tent markers.
  const regionPoints = {
    island: [114.1650, 22.2260], kowloon: [114.1520, 22.3060], ekowloon: [114.2820, 22.3000],
    newterritories: [114.0120, 22.3980], ntheast: [114.3050, 22.4870],
  };
  const regionLabels = new Map();
  for (const [id, lonlat] of Object.entries(regionPoints)) {
    const region = hk.regions.find(item => item.id === id);
    if (!region) continue;
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('class', `hk-region-label hk-region-${id}`);
    text.dataset.region = id;
    text.dataset.lonlat = lonlat.join(',');
    labels.append(text);
    regionLabels.set(id, { node: text, lonlat });
  }

  const hqNodes = new Map();
  for (const [id, entry] of Object.entries(HQ)) {
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'hk-hq');
    group.dataset.hq = id;
    group.dataset.lonlat = entry.point.join(',');
    const square = document.createElementNS(NS, 'rect');
    square.setAttribute('x', '-3.4'); square.setAttribute('y', '-3.4');
    square.setAttribute('width', '6.8'); square.setAttribute('height', '6.8');
    square.setAttribute('class', 'hk-hq-square');
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(entry.dx)); text.setAttribute('y', String(entry.dy));
    text.setAttribute('text-anchor', entry.anchor);
    text.setAttribute('class', 'hk-hq-label');
    text.dataset.label = 'hq';
    group.append(square, text);
    markers.append(group);
    hqNodes.set(id, { node: group, text, lonlat: entry.point, label: entry.label });
  }

  const jamboreeNodes = new Map();
  for (const event of hk.jamborees) {
    if (!event.coordinate) continue;
    const [ox, oy] = JAMBOREE_OFFSET[event.id] || [0, 0];
    const lonlat = event.coordinate.join(',');
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'hk-jamboree');
    group.dataset.jamboree = event.id;
    group.dataset.lonlat = lonlat;
    const tent = document.createElementNS(NS, 'path');
    tent.setAttribute('d', `M-5.5 3.8 0 -5.8 5.5 3.8z M-1.8 3.8 0 0 1.8 3.8`);
    tent.setAttribute('class', 'hk-jamboree-tent');
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', '0'); text.setAttribute('y', '14');
    text.setAttribute('class', 'hk-jamboree-label');
    text.dataset.label = 'jamboree';
    // The inner group carries the nudge that separates crowded tents, so the
    // outer group can stay pinned to the real coordinate.
    const inner = document.createElementNS(NS, 'g');
    inner.setAttribute('class', 'hk-jamboree-nudge');
    inner.setAttribute('transform', `translate(${ox},${oy})`);
    inner.dataset.nudge = event.id;
    inner.append(tent, text);
    group.append(inner);
    markers.append(group);
    jamboreeNodes.set(event.id, { node: group, inner, text, ox, oy, lonlat: event.coordinate });
  }

  let focus = { k: clamp(HK_DEFAULT_VIEW.k, 1, MAX_ZOOM), x: HK_DEFAULT_VIEW.x, y: HK_DEFAULT_VIEW.y };
  function clampFocus(next) {
    const k = clamp(next.k, 1, MAX_ZOOM);
    return {
      k,
      x: clamp(next.x, HK_WIDTH * (1 - k), 0),
      y: clamp(next.y, HK_HEIGHT * (1 - k), 0),
    };
  }
  focus = clampFocus(focus);

  // Two compensation factors, both driven by how far the SVG is scaled down.
  // Text sizes are in viewBox units, so a phone-sized map would render region
  // names at five pixels; and the tents would shrink to specks. Marker symbols
  // grow a little more than the offsets that separate them, so the cluster near
  // Penny's Bay and Wan Tsai spreads instead of piling up.
  let markerSpread = 1;
  function syncLabelScale() {
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / HK_WIDTH, rect.height / HK_HEIGHT);
    if (!scale) return;
    const factor = 1 / scale;
    const label = clamp(factor, 1, 2.2);
    markerSpread = clamp(factor, 1, 1.7);
    svg.style.setProperty('--hk-label-scale', label.toFixed(2));
    // Region names are long; they grow less than the district names so they do
    // not run into the tent numbers on a phone.
    svg.style.setProperty('--hk-region-scale', clamp(factor, 1, 1.9).toFixed(2));
    applyTransform();
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(syncLabelScale).observe(svg);
  window.addEventListener('resize', syncLabelScale);
  syncLabelScale();

  function applyTransform() {
    root.setAttribute('transform', `translate(${focus.x},${focus.y}) scale(${focus.k})`);
    const inverse = 1 / focus.k;
    for (const { node, lonlat } of [...regionLabels.values(), ...areaLabels.values()]) {
      const [x, y] = projectHk(lonlat);
      node.setAttribute('transform', `translate(${x},${y}) scale(${inverse})`);
    }
    for (const entry of hqNodes.values()) {
      const [x, y] = projectHk(entry.lonlat);
      entry.node.setAttribute('transform', `translate(${x},${y}) scale(${inverse})`);
    }
    for (const entry of jamboreeNodes.values()) {
      const [x, y] = projectHk(entry.lonlat);
      const dx = entry.ox * (markerSpread - 1), dy = entry.oy * (markerSpread - 1);
      entry.node.setAttribute('transform', `translate(${x + dx},${y + dy}) scale(${inverse})`);
      entry.inner.setAttribute('transform', `translate(${entry.ox},${entry.oy})`);
    }
  }

  // Convert a client position to base-map coordinates, accounting for the
  // letterboxing introduced by preserveAspectRatio on the rendered SVG.
  function localPoint(event) {
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / HK_WIDTH, rect.height / HK_HEIGHT) || 1;
    return {
      x: (event.clientX - rect.left - (rect.width - HK_WIDTH * scale) / 2) / scale,
      y: (event.clientY - rect.top - (rect.height - HK_HEIGHT * scale) / 2) / scale,
    };
  }
  function centrePoint() { return { x: HK_WIDTH / 2, y: HK_HEIGHT / 2 }; }
  function zoomAround(point, nextK) {
    nextK = clamp(nextK, 1, MAX_ZOOM);
    const base = { x: (point.x - focus.x) / focus.k, y: (point.y - focus.y) / focus.k };
    focus = clampFocus({ k: nextK, x: point.x - base.x * nextK, y: point.y - base.y * nextK });
    relayout();
    callbacks.onFocus?.({ ...focus });
  }
  function panBy(dx, dy) {
    focus = clampFocus({ ...focus, x: focus.x + dx, y: focus.y + dy });
    relayout();
    callbacks.onFocus?.({ ...focus });
  }
  // Zooming changes how many names fit, so the greedy placement is redone.
  function relayout() {
    if (!lastState) return;
    const year = lastState.year;
    const groupBest = new Map();
    for (const district of districtsData.districts) {
      const key = `${district.region}::${district.name?.en || district.id}`;
      const prev = groupBest.get(key);
      const active = year == null || (district.formed <= year && (district.dissolved == null || district.dissolved > year));
      const prevActive = prev && (year == null || (prev.formed <= year && (prev.dissolved == null || prev.dissolved > year)));
      let take = !prev;
      if (prev) {
        if (active && !prevActive) take = true;
        else if (active === prevActive) {
          const score = d => year == null ? d.formed : (d.formed <= year ? d.formed : -d.formed);
          take = score(district) > score(prev);
        }
      }
      if (take) groupBest.set(key, district);
    }
    const named = new Map();
    for (const district of districtsData.districts) {
      const key = `${district.region}::${district.name?.en || district.id}`;
      if (groupBest.get(key)?.id !== district.id) continue;
      const owner = resolve(district, year);
      if (!owner) continue;
      const record = named.get(owner.id) || { owner, district, weight: 0, anchor: [0, 0] };
      record.weight += district.area;
      record.anchor[0] += district.label[0] * district.area;
      record.anchor[1] += district.label[1] * district.area;
      named.set(owner.id, record);
    }
    layoutLabels(named);
    applyTransform();
  }

  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAround(localPoint(event), focus.k * Math.exp(-event.deltaY * 0.0015));
  }, { passive: false });

  const pointers = new Map();
  let start = null, moved = false, lastMid = null, lastDistance = 0;
  svg.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, localPoint(event));
    if (pointers.size === 1) { moved = false; start = localPoint(event); }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      lastDistance = Math.hypot(a.x - b.x, a.y - b.y);
      moved = true;
    }
  });
  svg.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size === 1) {
      if (!moved && start && Math.hypot(point.x - start.x, point.y - start.y) > 3) moved = true;
      if (moved) {
        if (!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
        svg.classList.add('is-dragging');
        panBy(point.x - previous.x, point.y - previous.y);
      }
    } else if (pointers.size === 2) {
      if (!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      panBy(mid.x - lastMid.x, mid.y - lastMid.y);
      if (lastDistance > 0) zoomAround(mid, focus.k * (distance / lastDistance));
      lastMid = mid; lastDistance = distance;
    }
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) { lastMid = null; lastDistance = 0; }
    if (!pointers.size) {
      svg.classList.remove('is-dragging');
      const wasMoved = moved;
      moved = false;
      if (!wasMoved) handleClick(event);
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', event => { if (pointers.size === 0) svg.classList.remove('is-dragging'); });

  function handleClick(event) {
    const target = event.target.closest?.('[data-jamboree],[data-hq],[data-code]');
    if (!target) return;
    if (target.dataset.jamboree) callbacks.onSelect?.({ kind: 'jamboree', id: target.dataset.jamboree });
    else if (target.dataset.hq) callbacks.onSelect?.({ kind: 'region', id: target.dataset.hq });
    else if (target.dataset.code) {
      const district = byId.get(target.dataset.code);
      callbacks.onSelect?.({ kind: 'district', id: target.dataset.code, region: district?.region });
    }
  }

  let lastState = null;

  // Every label starts hidden; only the districts that exist at this year can
  // earn one back. Greedy decluttering: the largest districts claim their name
  // first and a smaller neighbour keeps its label only if it clears the ones
  // already placed. Without this the 43 names pile up into an unreadable band.
  // Re-run on every zoom or pan so more names appear as the reader closes in.
  function layoutLabels(named) {
    const state = lastState || {};
    const lang = state.lang || 'zh';
    const activeRegion = state.selected?.region ?? (state.selected?.kind === 'region' ? state.selected.id : null);
    const activeDistrict = state.selected?.kind === 'district' ? state.selected.id : null;
    const focusDistrict = state.focusDistrict || null;
    for (const [code, entry] of areaLabels) {
      entry.node.classList.remove('is-visible');
      entry.node.removeAttribute('data-lonlat');
      const district = byId.get(code);
      entry.node.classList.toggle('is-muted', Boolean(activeRegion) && district.region !== activeRegion);
      entry.node.classList.toggle('is-area', sameDistrict(code));
    }
    const placed = [];
    const gap = LABEL_GAP / focus.k;
    const scale = focus.k * focus.k;
    const ordered = [...named.values()]
      .filter(entry => (entry.owner.area ?? entry.weight) * SCREEN_PER_KM2 * scale >= MIN_LABELLED_AREA)
      .sort((a, b) => (b.owner.area ?? b.weight) - (a.owner.area ?? a.weight));
    for (const entry of ordered) {
      // A district keeps its own anchor; a historical root has no territory of
      // its own, so its name sits at the area-weighted middle of the districts
      // that still belong to it.
      const anchor = entry.owner.area
        ? entry.owner.label
        : [entry.anchor[0] / entry.weight, entry.anchor[1] / entry.weight];
      const [x, y] = projectHk(anchor);
      const clear = placed.every(point => Math.hypot(point[0] - x, point[1] - y) >= gap);
      if (!clear) continue;
      placed.push([x, y]);
      const label = areaLabels.get(entry.district.id);
      label.lonlat = anchor;
      label.node.textContent = localize(entry.owner.name, lang);
      setLang(label.node, entry.owner.name);
      label.node.dataset.lonlat = anchor.join(',');
      label.node.classList.add('is-visible');
    }
  }

  function render(state) {
    lastState = state;
    const lang = state.lang || 'zh';
    const selected = state.selected;
    const activeRegion = selected?.region ?? (selected?.kind === 'region' ? selected.id : null);
    const activeDistrict = selected?.kind === 'district' ? selected.id : null;
    const activeDistrictRec = activeDistrict ? byId.get(activeDistrict) : null;
    const focusDistrict = state.focusDistrict || null;
    const focusDistrictRec = focusDistrict ? byId.get(focusDistrict) : null;
    const sameDistrict = (code) => {
      if (code === activeDistrict || code === focusDistrict) return true;
      const d = byId.get(code);
      if (!d) return false;
      return (activeDistrictRec && d.region === activeDistrictRec.region && d.name?.en === activeDistrictRec.name?.en)
        || (focusDistrictRec && d.region === focusDistrictRec.region && d.name?.en === focusDistrictRec.name?.en);
    };
    const year = state.year;
    // Which district name stands for each piece of the map at this year.
    const ownerCache = new Map();
    for (const district of districtsData.districts) ownerCache.set(district.id, resolve(district, year));
    // A name is drawn once per owner; `weight` totals the area it covers, which
    // is what decides whether the name is big enough to be worth a label.
    // Roots (香港區 and the other pre-1958 districts) have no area of their own.
    const named = new Map();

    // Pick one canonical shape per same-named district group to avoid overlapping
    // versioned geometries (e.g. 2018 vs 2023 SKW/CHW boundary).
    const groupBest = new Map();
    for (const district of districtsData.districts) {
      const key = `${district.region}::${district.name?.en || district.id}`;
      const prev = groupBest.get(key);
      const active = year == null || (district.formed <= year && (district.dissolved == null || district.dissolved > year));
      const prevActive = prev && (year == null || (prev.formed <= year && (prev.dissolved == null || prev.dissolved > year)));
      let take = !prev;
      if (prev) {
        if (active && !prevActive) take = true;
        else if (active === prevActive) {
          // prefer the one whose period is closest to year from below, else latest formed
          const score = d => year == null ? d.formed : (d.formed <= year ? d.formed : -d.formed);
          take = score(district) > score(prev);
        }
      }
      if (take) groupBest.set(key, district);
    }

    // Names are placed for the district that exists at this year; a district
    // that has not been formed yet is drawn in its parent's colour with the
    // internal boundary faded, so the map still reads as one territory.
    for (const [code, node] of shapesByCode) {
      const district = byId.get(code);
      const key = `${district.region}::${district.name?.en || district.id}`;
      if (groupBest.get(key)?.id !== code) { node.style.display = 'none'; continue; }
      const owner = ownerCache.get(code);
      if (!owner) { node.style.display = 'none'; continue; }
      node.style.display = '';
      const isOwner = owner.id === code;
      node.style.setProperty('--region-fill', REGION_FILL[owner.region] || '#e4e4d6');
      node.classList.toggle('is-owner', isOwner);
      node.classList.toggle('is-merged', !isOwner);
      node.classList.toggle('is-new', year != null && (district.originalFormed || district.formed) === year);
      node.classList.toggle('is-region', Boolean(activeRegion) && district.region === activeRegion);
      node.classList.toggle('is-muted', Boolean(activeRegion) && district.region !== activeRegion);
      node.classList.toggle('is-area', code === activeDistrict || code === focusDistrict);
      const title = node.querySelector('title');
      if (title) title.textContent = localize(owner.name, lang);
      const record = named.get(owner.id) || { owner, district, weight: 0, anchor: [0, 0] };
      record.weight += district.area;
      record.anchor[0] += district.label[0] * district.area;
      record.anchor[1] += district.label[1] * district.area;
      named.set(owner.id, record);
    }

    layoutLabels(named);

    for (const [id, entry] of regionLabels) {
      const short = hk.regions.find(item => item.id === id)?.short || {};
      entry.node.textContent = localize(short, lang);
      setLang(entry.node, short);
      entry.node.classList.toggle('is-region', id === activeRegion);
      entry.node.classList.toggle('is-muted', Boolean(activeRegion) && id !== activeRegion);
    }
    for (const [id, entry] of hqNodes) {
      entry.text.textContent = localize(entry.label, lang);
      setLang(entry.text, entry.label);
      entry.node.classList.toggle('is-selected', selected?.kind === 'region' && selected.id === id);
    }
    for (const [id, entry] of jamboreeNodes) {
      const event = hk.jamborees.find(item => item.id === id);
      entry.text.textContent = String(event.n);
      entry.node.classList.toggle('is-selected', selected?.kind === 'jamboree' && selected.id === id);
      entry.node.classList.toggle('is-future', Number.isFinite(year) && event.year > year);
    }
    applyTransform();
  }

  return {
    render,
    zoomIn: () => zoomAround(centrePoint(), focus.k * 1.4),
    zoomOut: () => zoomAround(centrePoint(), focus.k / 1.4),
    reset() { focus = clampFocus({ ...HK_DEFAULT_VIEW }); relayout(); callbacks.onFocus?.({ ...focus }); },
    reveal(lonlat) {
      if (!lonlat) return;
      const [x, y] = projectHk(lonlat);
      const padX = HK_WIDTH * 0.22, padY = HK_HEIGHT * 0.22;
      const left = -focus.x, top = -focus.y, right = left + HK_WIDTH * focus.k, bottom = top + HK_HEIGHT * focus.k;
      if (x < left + padX || x > right - padX || y < top + padY || y > bottom - padY) {
        focus = clampFocus({ ...focus, x: HK_WIDTH / 2 - x, y: HK_HEIGHT / 2 - y });
        applyTransform();
      }
    },
    key(name) {
      const horizontal = HK_WIDTH * focus.k * 0.12, vertical = HK_HEIGHT * focus.k * 0.12;
      if (name === '+' || name === '=') zoomAround(centrePoint(), focus.k * 1.25);
      else if (name === '-' || name === '_') zoomAround(centrePoint(), focus.k / 1.25);
      else if (name === 'ArrowLeft') panBy(horizontal, 0);
      else if (name === 'ArrowRight') panBy(-horizontal, 0);
      else if (name === 'ArrowUp') panBy(0, vertical);
      else if (name === 'ArrowDown') panBy(0, -vertical);
      else return false;
      return true;
    },
    get focus() { return { ...focus }; },
  };
}
