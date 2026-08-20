/**
 * SAFE - A local class that happens to be called `URLSearchParams`. It is an
 * in-memory map, `get` returns what this module put in, and reading it as the
 * WHATWG container would be a verdict about a spelling.
 */
class URLSearchParams {
  constructor(seed) {
    this.seed = seed;
  }
  get(key) {
    return this.seed[key];
  }
}

const defaults = new URLSearchParams({ sort: 'name' });

export function listUrl() {
  return `https://api.example.com/v1/items?sort=${defaults.get('sort')}`;
}
