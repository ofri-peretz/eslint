/**
 * SAFE - A parsing base whose origin is destructured away. `new URL(rel, base)`
 * is the standard way to parse a relative path; there is no URL object left to
 * fetch, so the scheme cannot reach any network call.
 */
export function parseRequest(event) {
  const { pathname, search, searchParams } = new URL(event.path, 'http://e.c');
  return { pathname, search, searchParams };
}
