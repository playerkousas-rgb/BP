// B-P Atlas v1.2 · © SCOUT SYSTEM
// These are reported dates for present-day directory entries, not reconstructed
// year-by-year membership histories. Never replace a missing WOSM year with a
// founding date, a local-group date, or an unsourced estimate.
export function locationRecordYear(item, mode) {
  const year = mode === 'members' ? item.wosmMembership?.year : mode === 'spread' ? item.scoutingStart : null;
  return Number.isInteger(year) ? year : null;
}

export function recordedByYear(item, year, mode = 'members') {
  const recorded = locationRecordYear(item, mode);
  return recorded !== null && recorded <= year;
}

export function locationsRecordedBy(items, year, mode = 'members') {
  return items.filter(item => recordedByYear(item, year, mode));
}

// The controls advance to observed years, never fabricated annual counts.
export function trackYears(data, mode, maxYear) {
  let years;
  if (mode === 'journey') years = data.journey.map(item => item.year);
  else if (mode === 'jamborees') years = data.jamborees.map(item => item.year);
  else if (mode === 'population') years = data.membership.filter(item => Number.isFinite(item.members)).map(item => item.year);
  else if (mode === 'members') {
    // Include years with independently sourced historical totals even if no
    // current-directory date falls there. They remain a separate statistic.
    years = [...data.nso.map(item => locationRecordYear(item, mode)), ...(data.membership || []).filter(item => Number.isFinite(item.countries)).map(item => item.year)];
  } else if (mode === 'spread') years = data.nso.map(item => locationRecordYear(item, mode));
  else years = [];
  return [...new Set(years.filter(year => Number.isInteger(year) && year <= maxYear))].sort((a, b) => a - b);
}

export function adjacentYear(years, year, direction) {
  if (direction > 0) return years.find(candidate => candidate > year) ?? null;
  for (let i = years.length - 1; i >= 0; i--) if (years[i] < year) return years[i];
  return null;
}
