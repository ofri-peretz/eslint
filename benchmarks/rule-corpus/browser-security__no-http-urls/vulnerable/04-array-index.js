/**
 * VULNERABLE - A fallback list read by index. The URL is in an array element,
 * not a named binding.
 */
const MIRRORS = ['https://a.acme-corp.io', 'http://b.acme-corp.io'];

export function pickMirror(i) {
  return MIRRORS[i];
}
