/**
 * SAFE (wave 2) - A `URLSearchParams` built over an object this module owns.
 * The container shape is identical to the vulnerable one; only the CONTENT is
 * different, which is the only thing the proof is allowed to look at.
 */
export function defaultsUrl(settings) {
  const params = new URLSearchParams({ sort: 'name', dir: 'asc' });
  return `https://api.example.com/v1/items?filter=${params.get('sort')}`;
}
