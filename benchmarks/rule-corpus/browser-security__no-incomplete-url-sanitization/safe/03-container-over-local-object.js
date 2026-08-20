/**
 * SAFE - A `URLSearchParams` over an object this module built. Same container
 * shape as the vulnerable fixture, opposite content — which is the whole point
 * of the widening: the CONTENT decides, not the constructor.
 */
const DEFAULTS = { host: 'app.example.com', sort: 'name' };

export function usesPrimaryHost() {
  const params = new URLSearchParams(DEFAULTS);
  return params.get('host').includes('app.example.com');
}
