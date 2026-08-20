/**
 * VULNERABLE - An exported URL builder. Its callers are outside this module, so
 * nothing here can vouch for `term`, and the encoding contract belongs to the
 * line that does the interpolating.
 */
export function buildSearchUrl(term) {
  return `https://api.example.com/v1/search?term=${term}`;
}
