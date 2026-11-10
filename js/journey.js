// B-P Atlas v1.0 · © SCOUT SYSTEM
export function stopAtYear(stops, year) {
  let result = null;
  for (const stop of stops) if (stop.year <= year) result = stop; else break;
  return result;
}
export function adjacentStop(stops, currentId, year, direction) {
  let index = stops.findIndex(stop => stop.id === currentId);
  if (index < 0) index = Math.max(0, stops.findIndex(stop => stop.id === stopAtYear(stops, year)?.id));
  return stops[Math.max(0, Math.min(stops.length - 1, index + direction))];
}
