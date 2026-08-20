/**
 * VULNERABLE - `decodeURIComponent` is the OPPOSITE of a sanitiser here: it
 * turns already-safe percent-encoding back into raw metacharacters immediately
 * before the value is re-interpolated.
 */
export function replay() {
  const raw = decodeURIComponent(location.search.slice(1));
  return fetch(`https://api.example.com/v1/replay?state=${raw}`);
}
