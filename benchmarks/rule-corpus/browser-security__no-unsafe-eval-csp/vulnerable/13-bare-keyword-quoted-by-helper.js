/** VULNERABLE - ADVERSARIAL. The directives are authored as BARE keywords and
 *  the builder adds the CSP quotes. The shipped header is
 *  "script-src 'self' 'unsafe-eval'" but the two apostrophes never appear in
 *  this file, so anything matching the printed token "'unsafe-eval'" is blind
 *  to it. This is how csp-header, next-secure-headers and most hand-rolled
 *  builders are written. */
const KEYWORDS = new Set(['self', 'none', 'unsafe-eval', 'unsafe-inline', 'strict-dynamic']);

function quote(source) {
  return KEYWORDS.has(source) ? `'${source}'` : source;
}

function serialize(directives) {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.map(quote).join(' ')}`)
    .join('; ');
}

export const csp = serialize({
  'default-src': ['self'],
  'script-src': ['self', 'unsafe-eval'],
});
