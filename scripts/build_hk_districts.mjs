#!/usr/bin/env node
// B-P Atlas v1.3 · © SCOUT SYSTEM
// Maintenance only: the website has no build step. This script derives the
// schematic Scout-district layer (data/hk-districts.json) from the 18 Council
// outlines in data/hk-areas.json.
//
//   node scripts/build_hk_districts.mjs
//
// WHY THIS EXISTS
//   The Scout Association of Hong Kong publishes district names, unit lists and
//   histories, but never district boundaries as geodata. The Council outlines
//   are the only free vector geography of Hong Kong, so they are used here as a
//   *scaffold*: each Scout district is cut out of the Council areas by straight
//   lines drawn along the features named in the district histories (ridgelines,
//   roads, the harbour front). The result is a SCHEMATIC layer — it shows which
//   district is where and how the map was redrawn, but it is not an official
//   boundary and must never be read as one. Every district carries `sources`.
//
// The cuts below are deliberately simple. Where a district history names a
// feature that is not a straight line (e.g. 深水埗西's 南昌街—荔枝角道—呈祥道
// chain) the nearest straight approximation is used and the district `note`
// keeps the original wording.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const areas = JSON.parse(readFileSync(path.join(root, 'data/hk-areas.json'), 'utf8')).features;
const byCode = new Map(areas.map(feature => [feature.id, feature]));

// Half-plane cut. Two forms:
//   { lon, side: 'E' } / { lat, side: 'N' }  — a meridian or a parallel
//   { line: [[x1,y1],[x2,y2]], side: 'L' }   — a directed straight line;
//     'L' keeps the left-hand side, 'R' the right-hand side.
function clipRing(ring, cut) {
  let keep;
  let crossing;
  if (cut.line) {
    const [a, b] = cut.line;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const sign = cut.side === 'L' ? 1 : -1;
    keep = point => sign * (dx * (point[1] - a[1]) - dy * (point[0] - a[0])) >= 0;
    crossing = (p, q) => {
      const cross = dx * (p[1] - a[1]) - dy * (p[0] - a[0]);
      const other = dx * (q[1] - a[1]) - dy * (q[0] - a[0]);
      const t = cross / (cross - other);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
  } else {
    const value = cut.lon ?? cut.lat;
    const onAxis = cut.lon != null;
    keep = point => onAxis
      ? (cut.side === 'E' ? point[0] >= value : point[0] <= value)
      : (cut.side === 'N' ? point[1] >= value : point[1] <= value);
    crossing = (p, q) => onAxis
      ? [value, p[1] + (q[1] - p[1]) * (value - p[0]) / (q[0] - p[0])]
      : [p[0] + (q[0] - p[0]) * (value - p[1]) / (q[1] - p[1]), value];
  }
  const out = [];
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const aIn = keep(a);
    const bIn = keep(b);
    if (aIn) out.push(a);
    if (aIn !== bIn) out.push(crossing(a, b));
  }
  return out;
}

const ringArea = ring => Math.abs(ring.reduce((sum, point, index) => {
  const next = ring[(index + 1) % ring.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0)) / 2;
const MIN_AREA = 1e-8; // square degrees; drops sliver triangles from a cut

function clipPolygon(polygon, cuts) {
  let rings = [polygon[0]];
  for (const cut of cuts) rings = rings.map(ring => clipRing(ring, cut)).filter(ring => ring.length >= 4 && ringArea(ring) > MIN_AREA);
  return rings;
}

function clipFeature(code, cuts, polygonIndex = null) {
  const feature = byCode.get(code);
  if (!feature) throw new Error(`unknown area code ${code}`);
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const rings = [];
  polygons.forEach((polygon, index) => {
    if (polygonIndex != null && index !== polygonIndex) return;
    rings.push(...clipPolygon(polygon, cuts));
  });
  return rings;
}

const round = value => Math.round(value * 10000) / 10000;
// Douglas–Peucker simplification is deliberately NOT applied to the district
// layer: the cuts share edges with the scaffold, and thinning those edges
// separately would open slivers between neighbouring districts.

// Area centroid of a set of rings, in lon/lat degrees.
function centroid(rings) {
  let area = 0;
  let lon = 0;
  let lat = 0;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index += 1) {
      const a = ring[index];
      const b = ring[(index + 1) % ring.length];
      const cross = a[0] * b[1] - b[0] * a[1];
      area += cross;
      lon += (a[0] + b[0]) * cross;
      lat += (a[1] + b[1]) * cross;
    }
  }
  if (!area) return null;
  return [round(lon / (3 * area)), round(lat / (3 * area))];
}
// Point-in-polygon by ray casting; the scaffold rings are simple outlines.
function insideRing(point, ring) {
  let hits = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    if (a[1] <= point[1] === b[1] <= point[1]) continue;
    const crossing = a[0] + (point[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
    if (crossing > point[0]) hits += 1;
  }
  return hits % 2 === 1;
}
function distanceToRing(point, ring) {
  let best = Infinity;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy)));
  }
  return best;
}
// A label anchor that is guaranteed to sit inside the district. The area
// centroid of a concave outline (Sai Kung, the Islands) falls over the sea, and
// the pole of inaccessibility of a two-part district lands in whichever part
// happens to be bigger, so the anchor is chosen on a grid: inside any part, as
// far from the outline as possible, and as near the district's centre of area
// as possible.
function anchor(rings) {
  const xs = rings.flat().map(point => point[0]);
  const ys = rings.flat().map(point => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const middle = centroid(rings) || [(minX + maxX) / 2, (minY + maxY) / 2];
  let best = null;
  let bestScore = -Infinity;
  const STEPS = 30;
  for (let i = 1; i < STEPS; i += 1) {
    for (let j = 1; j < STEPS; j += 1) {
      const point = [minX + (maxX - minX) * i / STEPS, minY + (maxY - minY) * j / STEPS];
      if (!rings.some(ring => insideRing(point, ring))) continue;
      const clearance = Math.min(...rings.map(ring => distanceToRing(point, ring)));
      const offset = Math.hypot(point[0] - middle[0], point[1] - middle[1]);
      const score = clearance - offset * 0.25;
      if (score > bestScore) { bestScore = score; best = point; }
    }
  }
  return best ? [round(best[0]), round(best[1])] : middle;
}

// ---------------------------------------------------------------------------
// The 44 Scout districts. `parts` lists the scaffold pieces; `cuts` are applied
// to the named Council area in order. `formed` is the year the district took
// its present name/shape; `parent` is the district whose territory it left.
// ---------------------------------------------------------------------------
// The three 1951 districts and the two regions that later split off from them.
// They have no geometry of their own: at a year before their children existed
// they stand for the whole territory those children now cover.
const ROOTS = [
  { id: 'root-hk', region: 'island', name: { zh: '香港區', en: 'Hong Kong District' }, formed: 1951, parent: null, label: [114.175, 22.265] },
  { id: 'root-kln', region: 'kowloon', name: { zh: '九龍區', en: 'Kowloon District' }, formed: 1951, parent: null, label: [114.190, 22.320] },
  { id: 'root-nt', region: 'newterritories', name: { zh: '新界區', en: 'New Territories District' }, formed: 1951, parent: null, label: [114.050, 22.430] },
  { id: 'root-ekln', region: 'ekowloon', name: { zh: '東九龍地域', en: 'East Kowloon Region' }, formed: 1976, parent: 'root-kln', label: [114.225, 22.315] },
  { id: 'root-nthe', region: 'ntheast', name: { zh: '新界東地域', en: 'New Territories East Region' }, formed: 2000, parent: 'root-nt', label: [114.200, 22.400] },
];

const DISTRICTS = [
  // ----- 港島地域 Island Region -----
  {
    id: 'hk-west', region: 'island', name: { zh: '港島西區', en: 'Hong Kong West' },
    formed: 1961, parent: 'root-hk', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '範圍約包括堅尼地城、石塘咀、薄扶林、香港仔及華富一帶。', en: 'Approximately Kennedy Town, Shek Tong Tsui, Pok Fu Lam, Aberdeen and Wah Fu.' },
    parts: [
      { code: 'CW', cuts: [{ lon: 114.147, side: 'W' }] },
      { code: 'S', cuts: [{ line: [[114.118, 22.240], [114.262, 22.258]], side: 'L' }] },
    ],
  },
  {
    id: 'victoria-city', region: 'island', name: { zh: '維多利亞城區', en: 'Victoria City' },
    formed: 1953, parent: 'root-hk', sources: ['hk-wiki-history', 'hk-wiki'],
    note: { zh: '1953 年自香港區分出，名稱沿自舊維多利亞城。', en: 'Split from the Hong Kong District in 1953; the name follows the old City of Victoria.' },
    parts: [{ code: 'CW', cuts: [{ lon: 114.147, side: 'E' }] }],
  },
  {
    id: 'wan-chai', region: 'island', name: { zh: '灣仔區', en: 'Wan Chai' },
    formed: 1953, parent: 'root-hk', sources: ['hk-wiki-history', 'hk-wiki'],
    note: { zh: '前身為 1953 年劃出的黃泥涌區，1961 年正名港島東區，後來再稱灣仔區。', en: 'Began as the Wong Nai Chung District in 1953, renamed Hong Kong East in 1961 and later Wan Chai.' },
    parts: [{ code: 'WC', cuts: [] }],
  },
  {
    id: 'hk-north', region: 'island', name: { zh: '港島北區', en: 'Hong Kong North' },
    formed: 1961, parent: 'root-hk', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括北角及鰂魚涌一帶。', en: 'Approximately North Point and Quarry Bay.' },
    parts: [{ code: 'E', cuts: [{ lon: 114.222, side: 'W' }] }],
  },
  {
    id: 'shau-kei-wan', region: 'island', name: { zh: '筲箕灣區', en: 'Shau Kei Wan' },
    formed: 1961, parent: 'root-hk', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括太古、西灣河及筲箕灣一帶。', en: 'Approximately Tai Koo, Sai Wan Ho and Shau Kei Wan.' },
    parts: [{ code: 'E', cuts: [{ lon: 114.222, side: 'E' }, { lon: 114.246, side: 'W' }] }],
  },
  {
    id: 'chai-wan', region: 'island', name: { zh: '柴灣區', en: 'Chai Wan' },
    formed: 1999, parent: 'shau-kei-wan', sources: ['hk-chaiwan-history', 'hk-hkw-districts'],
    note: { zh: '1999 年成立，服務柴灣、小西灣及杏花邨。', en: 'Formed in 1999, serving Chai Wan, Siu Sai Wan and Heng Fa Chuen.' },
    parts: [{ code: 'E', cuts: [{ lon: 114.246, side: 'E' }] }],
  },
  {
    id: 'hk-south', region: 'island', name: { zh: '港島南區', en: 'Hong Kong South' },
    formed: 1961, parent: 'root-hk', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括黃竹坑、淺水灣、赤柱、石澳及大潭一帶。', en: 'Approximately Wong Chuk Hang, Repulse Bay, Stanley, Shek O and Tai Tam.' },
    parts: [{ code: 'S', cuts: [{ line: [[114.118, 22.240], [114.262, 22.258]], side: 'R' }] }],
  },

  // ----- 九龍地域 Kowloon Region -----
  {
    id: 'yau-tsim', region: 'kowloon', name: { zh: '油尖區', en: 'Yau Tsim' },
    formed: 1988, parent: 'root-kln', sources: ['hk-kr-1981-1990', 'hk-wiki'],
    note: { zh: '1988 年尖沙咀區與油麻地區合併為油尖區。', en: 'Tsim Sha Tsui and Yau Ma Tei were merged into Yau Tsim in 1988.' },
    parts: [{ code: 'YTM', cuts: [{ lat: 22.322, side: 'S' }, { lat: 22.314, side: 'S' }] }],
  },
  {
    id: 'mong-kok', region: 'kowloon', name: { zh: '旺角區', en: 'Mong Kok' },
    formed: 1961, parent: 'root-kln', sources: ['hk-kr-mongkok', 'hk-wiki-history'],
    note: { zh: '1960 年代初自九龍西分出，範圍由窩打老道至界限街。', en: 'Split from West Kowloon in the early 1960s; its territory ran from Waterloo Road to Boundary Street.' },
    parts: [{ code: 'YTM', cuts: [{ lat: 22.322, side: 'S' }, { lat: 22.314, side: 'N' }] }],
  },
  {
    id: 'sham-mong', region: 'kowloon', name: { zh: '深旺區', en: 'Sham Mong' },
    formed: 2003, parent: 'mong-kok', sources: ['hk-smd-boundary', 'hk-wiki-history'],
    note: { zh: '2003 年 7 月 1 日成立，南以佐敦道為界，經渡船街、櫻桃街、大角嘴道、西九龍走廊、蝴蝶谷道、呈祥道、青葵路西南至海濱。', en: 'Formed on 1 July 2003; bounded in the south by Jordan Road and reaching the harbour past Ferry Street, Cherry Street, Tai Kok Tsui Road, the West Kowloon Corridor, Butterfly Valley Road, Ching Cheung Road and Tsing Kwai Highway.' },
    parts: [
      { code: 'YTM', cuts: [{ lat: 22.322, side: 'N' }] },
      { code: 'SSP', cuts: [{ lat: 22.330, side: 'N' }] },
    ],
  },
  {
    id: 'ssp-east', region: 'kowloon', name: { zh: '深水埗東區', en: 'Sham Shui Po East' },
    formed: 1992, parent: 'root-kln', sources: ['hk-kr-sspe', 'hk-wiki'],
    note: { zh: '1992 年 7 月 1 日與深水埗西區同時成立。', en: 'Formed on 1 July 1992 together with Sham Shui Po West.' },
    parts: [{ code: 'SSP', cuts: [{ lat: 22.330, side: 'S' }, { lon: 114.152, side: 'E' }] }],
  },
  {
    id: 'ssp-west', region: 'kowloon', name: { zh: '深水埗西區', en: 'Sham Shui Po West' },
    formed: 1992, parent: 'root-kln', sources: ['hk-kr-sspw', 'hk-wiki'],
    note: { zh: '東起南昌街，南至西九龍走廊，西達荔枝角道、蝴蝶谷道，北及呈祥道、龍翔道。', en: 'From Nam Cheong Street in the east to the West Kowloon Corridor in the south, Lai Chi Kok Road and Butterfly Valley Road in the west, and Ching Cheung Road and Lung Cheung Road in the north.' },
    parts: [{ code: 'SSP', cuts: [{ lat: 22.330, side: 'S' }, { lon: 114.152, side: 'W' }] }],
  },
  {
    id: 'kowloon-tong', region: 'kowloon', name: { zh: '九龍塘區', en: 'Kowloon Tong' },
    formed: 1961, parent: 'root-kln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括九龍塘、又一村及九龍仔一帶。', en: 'Approximately Kowloon Tong, Yau Yat Tsuen and Kowloon Tsai.' },
    parts: [{ code: 'KC', cuts: [{ lat: 22.334, side: 'N' }] }],
  },
  {
    id: 'ho-man-tin', region: 'kowloon', name: { zh: '何文田區', en: 'Ho Man Tin' },
    formed: 1961, parent: 'root-kln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括何文田、愛民邨及忠孝街一帶。', en: 'Approximately Ho Man Tin, Oi Man Estate and Hung Hom’s western side.' },
    parts: [{ code: 'KC', cuts: [{ lat: 22.334, side: 'S' }, { lon: 114.186, side: 'W' }] }],
  },
  {
    id: 'kowloon-city', region: 'kowloon', name: { zh: '九龍城區', en: 'Kowloon City' },
    formed: 1961, parent: 'root-kln', sources: ['hk-kr-klncity', 'hk-wiki'],
    note: { zh: '1961 年成立，所轄區域包括牛津道以東至彩虹道及鳳舞街以西的地方。', en: 'Formed in 1961; its territory ran from Oxford Road east to Rainbow Road and west of Fung Mo Street.' },
    parts: [{ code: 'KC', cuts: [{ lat: 22.334, side: 'S' }, { lon: 114.186, side: 'E' }, { lat: 22.304, side: 'N' }] }],
  },
  {
    id: 'hung-hom', region: 'kowloon', name: { zh: '紅磡區', en: 'Hung Hom' },
    formed: 1961, parent: 'root-kln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括紅磡、鶴園及黃埔一帶。', en: 'Approximately Hung Hom, Hok Yuen and Whampoa.' },
    parts: [{ code: 'KC', cuts: [{ lat: 22.334, side: 'S' }, { lon: 114.186, side: 'E' }, { lat: 22.304, side: 'S' }] }],
  },

  // ----- 東九龍地域 East Kowloon Region -----
  {
    id: 'tsz-wan-shan', region: 'ekowloon', name: { zh: '慈雲山區', en: 'Tsz Wan Shan' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '1976 年東九龍地域成立時的區之一。', en: 'One of the districts when the East Kowloon Region was formed in 1976.' },
    parts: [{ code: 'WTS', cuts: [{ lat: 22.348, side: 'N' }] }],
  },
  {
    id: 'wong-tai-sin', region: 'ekowloon', name: { zh: '黃大仙區', en: 'Wong Tai Sin' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '1976 年東九龍地域成立時的區之一。', en: 'One of the districts when the East Kowloon Region was formed in 1976.' },
    parts: [{ code: 'WTS', cuts: [{ lat: 22.348, side: 'S' }] }],
  },
  {
    id: 'sai-kung', region: 'ekowloon', name: { zh: '西貢區', en: 'Sai Kung' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括西貢市、大網仔、北潭涌及清水灣一帶。', en: 'Approximately Sai Kung Town, Tai Mong Tsai, Pak Tam Chung and Clear Water Bay.' },
    parts: [{ code: 'SK', cuts: [{ lat: 22.345, side: 'N' }] }],
  },
  {
    id: 'tko', region: 'ekowloon', name: { zh: '將軍澳區', en: 'Tseung Kwan O' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki-history'],
    note: { zh: '1976 年東九龍地域成立時的區之一；2002 年 4 月 1 日再確認區界。', en: 'One of the 1976 East Kowloon districts; its boundary was reaffirmed on 1 April 2002.' },
    parts: [{ code: 'SK', cuts: [{ lat: 22.345, side: 'S' }] }],
  },
  {
    id: 'sau-mau-ping', region: 'ekowloon', name: { zh: '秀茂坪區', en: 'Sau Mau Ping' },
    formed: 1981, parent: 'root-ekln', sources: ['hk-lym-history', 'hk-wiki'],
    note: { zh: '1980 年代自觀塘新区分出，覆蓋翠屏道邨、秀茂坪上中下邨及順利、順安邨。', en: 'Split from the new Kwun Tong district in the 1980s, covering Tsui Ping Road Estate, Sau Mau Ping Estate and Shun Lee/Shun On.' },
    parts: [{ code: 'KT', cuts: [{ lat: 22.320, side: 'N' }, { lon: 114.214, side: 'W' }] }],
  },
  {
    id: 'kowloon-bay', region: 'ekowloon', name: { zh: '九龍灣區', en: 'Kowloon Bay' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '約包括九龍灣及牛頭角一帶。', en: 'Approximately Kowloon Bay and Ngau Tau Kok.' },
    parts: [{ code: 'KT', cuts: [{ lat: 22.320, side: 'N' }, { lon: 114.214, side: 'E' }] }],
  },
  {
    id: 'kwun-tong', region: 'ekowloon', name: { zh: '觀塘區', en: 'Kwun Tong' },
    formed: 1976, parent: 'root-ekln', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '1976 年東九龍地域成立時的區之一。', en: 'One of the districts when the East Kowloon Region was formed in 1976.' },
    parts: [{ code: 'KT', cuts: [{ lat: 22.320, side: 'S' }, { lon: 114.234, side: 'W' }] }],
  },
  {
    id: 'lei-yue-mun', region: 'ekowloon', name: { zh: '鯉魚門區', en: 'Lei Yue Mun' },
    formed: 1981, parent: 'root-ekln', sources: ['hk-lym-history', 'hk-wiki'],
    note: { zh: '1981 年 7 月 1 日成立，覆蓋藍田、茶果嶺、油塘、高超道及麗港城。', en: 'Formed on 1 July 1981, covering Lam Tin, Cha Kwo Ling, Yau Tong, Ko Chiu Road and Laguna City.' },
    parts: [{ code: 'KT', cuts: [{ lat: 22.320, side: 'S' }, { lon: 114.234, side: 'E' }] }],
  },

  // ----- 新界地域 New Territories Region -----
  {
    id: 'yuen-long-east', region: 'newterritories', name: { zh: '元朗東區', en: 'Yuen Long East' },
    formed: 1958, parent: 'root-nt', sources: ['hk-ntr-overview', 'hk-yle-timetable'],
    note: { zh: '2007 年 4 月 1 日元朗東、元朗西及十八鄉三區區界重新劃分。', en: 'The boundaries of Yuen Long East, Yuen Long West and Shap Pat Heung were redrawn on 1 April 2007.' },
    parts: [{ code: 'YL', cuts: [{ lon: 114.030, side: 'E' }] }],
  },
  {
    id: 'yuen-long-west', region: 'newterritories', name: { zh: '元朗西區', en: 'Yuen Long West' },
    formed: 1976, parent: 'root-nt', sources: ['hk-ylw-history', 'hk-yle-timetable'],
    note: { zh: '1976 年成立，1990 年代起覆蓋天水圍新市鎮。', en: 'Formed in 1976; from the 1990s it also covered Tin Shui Wai.' },
    parts: [{ code: 'YL', cuts: [{ lon: 114.030, side: 'W' }, { lat: 22.440, side: 'N' }] }],
  },
  {
    id: 'shap-pat-heung', region: 'newterritories', name: { zh: '十八鄉區', en: 'Shap Pat Heung' },
    formed: 1958, parent: 'root-nt', sources: ['hk-ntr-overview', 'hk-yle-timetable'],
    note: { zh: '前身為十八鄉童軍會，2007 年 4 月 1 日重新劃界。', en: 'Began as the Shap Pat Heung Scout Association; redrawn on 1 April 2007.' },
    parts: [{ code: 'YL', cuts: [{ lon: 114.030, side: 'W' }, { lat: 22.440, side: 'S' }] }],
  },
  {
    id: 'tuen-mun-east', region: 'newterritories', name: { zh: '屯門東區', en: 'Tuen Mun East' },
    formed: 1990, parent: 'root-nt', sources: ['hk-yle-timetable', 'hk-wiki'],
    note: { zh: '1990 年 5 月 1 日屯門分為東、西兩區。', en: 'Tuen Mun was divided into East and West on 1 May 1990.' },
    parts: [{ code: 'TM', cuts: [{ lon: 113.990, side: 'E' }] }],
  },
  {
    id: 'tuen-mun-west', region: 'newterritories', name: { zh: '屯門西區', en: 'Tuen Mun West' },
    formed: 1990, parent: 'root-nt', sources: ['hk-yle-timetable', 'hk-wiki'],
    note: { zh: '1990 年 5 月 1 日屯門分為東、西兩區。', en: 'Tuen Mun was divided into East and West on 1 May 1990.' },
    parts: [{ code: 'TM', cuts: [{ lon: 113.990, side: 'W' }] }],
  },
  {
    id: 'tsuen-wan', region: 'newterritories', name: { zh: '荃灣區', en: 'Tsuen Wan' },
    formed: 1958, parent: 'root-nt', sources: ['hk-ntr-overview', 'hk-wiki'],
    note: { zh: '1958 年設區，範圍包括荃灣、大欖及馬灣。', en: 'A district from 1958, covering Tsuen Wan, Tai Lam and Ma Wan.' },
    parts: [{ code: 'TW', cuts: [] }],
  },
  {
    id: 'tsing-yi', region: 'newterritories', name: { zh: '青衣區', en: 'Tsing Yi' },
    formed: 1974, parent: 'root-nt', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '青衣島一帶。', en: 'Tsing Yi Island and its approaches.' },
    parts: [{ code: 'KWT', cuts: [], polygonIndex: 1 }],
  },
  {
    id: 'north-kwai-chung', region: 'newterritories', name: { zh: '北葵涌區', en: 'North Kwai Chung' },
    formed: 1974, parent: 'root-nt', sources: ['hk-nkc-boundary', 'hk-wiki'],
    note: { zh: '1974 年 10 月 1 日由石籬區改名；南以青山道為界，北至城門隧道象鼻山路交匯處。', en: 'Renamed from Shek Lei on 1 October 1974; bounded in the south by Castle Peak Road and in the north by the Lion Rock Tunnel Elephant Road junction.' },
    parts: [{ code: 'KWT', cuts: [{ lat: 22.356, side: 'N' }], polygonIndex: 0 }],
  },
  {
    id: 'south-kwai-chung', region: 'newterritories', name: { zh: '南葵涌區', en: 'South Kwai Chung' },
    formed: 1967, parent: 'root-nt', sources: ['hk-skc-history', 'hk-wiki'],
    note: { zh: '前身為 1967 年的荃灣東區；1975 年起覆蓋葵芳、葵盛、葵興、大窩口、葵涌新區、荔景、祖堯及麗瑤。', en: 'Began as Tsuen Wan East in 1967; from 1975 it covered Kwai Fong, Kwai Shing, Kwai Hing, Tai Wo Hau, Kwai Chung, Lai King, Cho Yiu and Lai Yiu.' },
    parts: [{ code: 'KWT', cuts: [{ lat: 22.356, side: 'S' }], polygonIndex: 0 }],
  },
  {
    id: 'islands', region: 'newterritories', name: { zh: '離島區', en: 'Outlying Islands' },
    formed: 1958, parent: 'root-nt', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '長洲、坪洲、南丫島及離島諸島。', en: 'Cheung Chau, Peng Chau, Lamma Island and the other outlying islands.' },
    parts: [{ code: 'IS', cuts: [], polygonIndex: null, polygonList: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }],
  },
  {
    id: 'lantau', region: 'newterritories', name: { zh: '大嶼山區', en: 'Lantau' },
    formed: 1958, parent: 'root-nt', sources: ['hk-regions', 'hk-wiki'],
    note: { zh: '大嶼山、赤鱲角及東涌一帶。', en: 'Lantau Island, Chek Lap Kok and Tung Chung.' },
    parts: [{ code: 'IS', cuts: [], polygonIndex: null, polygonList: [0, 1, 2] }],
  },

  // ----- 新界東地域 New Territories East Region -----
  {
    id: 'sha-tin-west', region: 'ntheast', name: { zh: '沙田西區', en: 'Sha Tin West' },
    formed: 1996, parent: 'root-nthe', sources: ['hk-stw-history', 'hk-wiki'],
    note: { zh: '城門河上游接城門水塘一段以北；覆蓋沙田市中心、瀝源、禾輋、大圍、美城、下城門、穗禾、火炭及駿馬。', en: 'North of the upper Shing Mun River past the Shing Mun Reservoir; covers Sha Tin town centre, Lek Yuen, Wo Che, Tai Wai, Mei Cheng, Ha Shing Mun, Sui Wo, Fo Tan and Chun Ma.' },
    parts: [{ code: 'ST', cuts: [{ lon: 114.205, side: 'W' }, { lat: 22.385, side: 'N' }] }],
  },
  {
    id: 'sha-tin-south', region: 'ntheast', name: { zh: '沙田南區', en: 'Sha Tin South' },
    formed: 2002, parent: 'root-nthe', sources: ['hk-stn-history', 'hk-wiki-history'],
    note: { zh: '2003 年 4 月 1 日新界東地域擴展區會計劃完成後的四區之一。', en: 'One of the four districts created when the New Territories East expansion plan completed on 1 April 2003.' },
    parts: [{ code: 'ST', cuts: [{ lon: 114.205, side: 'W' }, { lat: 22.385, side: 'S' }] }],
  },
  {
    id: 'sha-tin-east', region: 'ntheast', name: { zh: '沙田東區', en: 'Sha Tin East' },
    formed: 1996, parent: 'root-nthe', sources: ['hk-ste-history', 'hk-stn-history'],
    note: { zh: '1996 年自沙田區分出；2003 年 4 月 1 日再重劃。', en: 'Split from Sha Tin in 1996 and redrawn on 1 April 2003.' },
    parts: [{ code: 'ST', cuts: [{ lon: 114.205, side: 'E' }, { lat: 22.400, side: 'S' }] }],
  },
  {
    id: 'sha-tin-north', region: 'ntheast', name: { zh: '沙田北區', en: 'Sha Tin North' },
    formed: 2003, parent: 'root-nthe', sources: ['hk-stn-boundary', 'hk-wiki-history'],
    note: { zh: '2003 年 4 月 1 日成立，服務馬鞍山：恒安邨、耀安邨、頌安邨、欣安邨、錦泰苑、馬鞍山巿中心、錦英苑、利安邨、烏溪沙。', en: 'Formed on 1 April 2003 to serve Ma On Shan: Heng On, Yiu On, Chung On, Yan On, Kam Tai, Ma On Shan town centre, Kam Ying, Lee On and Wu Kai Sha.' },
    parts: [{ code: 'ST', cuts: [{ lon: 114.205, side: 'E' }, { lat: 22.400, side: 'N' }] }],
  },
  {
    id: 'tai-po-south', region: 'ntheast', name: { zh: '大埔南區', en: 'Tai Po South' },
    formed: 2002, parent: 'root-nthe', sources: ['hk-tps-history', 'hk-wiki-history'],
    note: { zh: '大埔太和路以南，包括大埔墟、廣福邨、太和邨。', en: 'South of Tai Wo Road, Tai Po, including Tai Po Market, Kwu Fong Estate and Tai Wo Estate.' },
    parts: [{ code: 'TP', cuts: [{ lon: 114.145, side: 'E' }, { lon: 114.190, side: 'W' }, { lat: 22.435, side: 'N' }, { lat: 22.470, side: 'S' }] }],
  },
  {
    id: 'tai-po-north', region: 'ntheast', name: { zh: '大埔北區', en: 'Tai Po North' },
    formed: 2002, parent: 'root-nthe', sources: ['hk-tps-history', 'hk-wiki-history'],
    note: { zh: '2002 年 6 月 1 日與大埔南區同時自大埔區分出。', en: 'Split from Tai Po District on 1 June 2002 together with Tai Po South.' },
    parts: [
      { code: 'TP', cuts: [{ lon: 114.145, side: 'W' }] },
      { code: 'TP', cuts: [{ lon: 114.190, side: 'E' }] },
      { code: 'TP', cuts: [{ lon: 114.145, side: 'E' }, { lon: 114.190, side: 'W' }, { lat: 22.435, side: 'S' }] },
      { code: 'TP', cuts: [{ lon: 114.145, side: 'E' }, { lon: 114.190, side: 'W' }, { lat: 22.470, side: 'N' }] },
      // Tai Po North also takes the strip between the two meridians below
      // 22.435, so the two halves of the old Tai Po District meet exactly.
      { code: 'TP', cuts: [{ lon: 114.145, side: 'E' }, { lon: 114.190, side: 'W' }, { lat: 22.435, side: 'N' }] },
    ],
  },
  {
    id: 'sheung-yue', region: 'ntheast', name: { zh: '雙魚區', en: 'Sheung Yue' },
    formed: 2002, parent: 'root-nthe', sources: ['hk-wiki-history', 'hk-wiki'],
    note: { zh: '2002 年 6 月 1 日自北區分出，約包括上水及粉嶺。', en: 'Split from the North District on 1 June 2002; approximately Sheung Shui and Fanling.' },
    parts: [{ code: 'N', cuts: [{ lon: 114.160, side: 'W' }] }],
  },
  {
    id: 'pik-fung', region: 'ntheast', name: { zh: '璧峰區', en: 'Pik Fung' },
    formed: 2002, parent: 'root-nthe', sources: ['hk-wiki-history', 'hk-wiki'],
    note: { zh: '2002 年 6 月 1 日自北區分出，約包括打鼓嶺及沙頭角。', en: 'Split from the North District on 1 June 2002; approximately Ta Kwu Ling and Sha Tau Kok.' },
    parts: [{ code: 'N', cuts: [{ lon: 114.160, side: 'E' }] }],
  },
];

// A few anchors chosen by hand where the grid pick lands in an uninformative
// corner of a large rural district.
const LABEL_ANCHORS = {
  'hk-west': [114.150, 22.256],
  'tko': [114.262, 22.305],
  'tai-po-north': [114.180, 22.480],
  'sai-kung': [114.330, 22.390],
};

function buildGeometry(parts) {
  const rings = [];
  for (const part of parts) {
    const feature = byCode.get(part.code);
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    polygons.forEach((polygon, index) => {
      if (part.polygonIndex != null && index !== part.polygonIndex) return;
      if (part.polygonList && !part.polygonList.includes(index)) return;
      rings.push(...clipPolygon(polygon, part.cuts || []));
    });
  }
  return rings;
}

function toGeometry(rings) {
  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(ring => [ring]) };
}

const seen = new Set();
const output = [];
for (const district of DISTRICTS) {
  if (seen.has(district.id)) throw new Error(`duplicate district ${district.id}`);
  seen.add(district.id);
  // No Douglas–Peucker here: the scaffold rings are already simplified, and
  // simplifying each district on its own would move the shared cut edges and
  // open slivers between neighbours.
  const rings = buildGeometry(district.parts).filter(ring => ring.length >= 4 && ringArea(ring) > MIN_AREA);
  if (!rings.length) throw new Error(`${district.id}: empty geometry`);
  output.push({
    id: district.id,
    region: district.region,
    name: district.name,
    formed: district.formed,
    parent: district.parent,
    label: LABEL_ANCHORS[district.id] || anchor(rings),
    area: Math.round(rings.reduce((sum, ring) => sum + ringArea(ring), 0) * 11322 * 10) / 10,
    sources: district.sources,
    note: district.note,
    geometry: toGeometry(rings),
  });
}

const ids = new Set(output.map(item => item.id));
for (const item of [...ROOTS, ...output]) {
  if (item.parent && !ids.has(item.parent) && !ROOTS.some(root => root.id === item.parent)) {
    throw new Error(`${item.id}: unknown parent ${item.parent}`);
  }
}

const payload = {
  note: {
    zh: '本檔的界線為示意界線：以十八區區議會輪廓為底稿，按各區會公開文字描述（河流、道路、山脊）以直線切割重繪。童軍區界沒有公開地理數據，因此這些界線不代表官方區界，只用來說明各區大約位置及區界演變。',
    en: 'These are schematic boundaries: the 18 District Council outlines are used as a scaffold and cut along the rivers, roads and ridgelines named in each district’s published history. Scout district boundaries are not released as geodata, so these lines are not official boundaries — they only show where each district sits and how the map was redrawn.',
  },
  roots: ROOTS,
  districts: output,
};

writeFileSync(path.join(root, 'data/hk-districts.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote data/hk-districts.json — ${output.length} districts, ${output.reduce((sum, item) => sum + (item.geometry.type === 'Polygon' ? 1 : item.geometry.coordinates.length), 0)} polygons`);
