/**
 * SAFE - the mirror of vulnerable/05. This `let` is declared once and never
 * written again, and the `const` object below is never read as a specifier.
 * A binding that is never reassigned holds the same value at the sink as at
 * its declaration, whatever keyword declared it.
 */
let cachePlugin = './plugins/memory-cache.js';

const cache = require(cachePlugin);

export function createCache(ttlMs) {
  return cache.build({ ttlMs, name: cachePlugin });
}
