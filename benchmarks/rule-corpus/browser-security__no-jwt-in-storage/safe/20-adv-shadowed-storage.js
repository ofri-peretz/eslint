/**
 * SAFE (wave 2) - `localStorage` here is a LOCAL parameter holding an
 * in-memory test double, not the browser global. Exact membership against a
 * name is the whole evidence, so this is the shape it costs.
 */
export function seed(localStorage) {
  localStorage.setItem('access_token', 'fake');
}
