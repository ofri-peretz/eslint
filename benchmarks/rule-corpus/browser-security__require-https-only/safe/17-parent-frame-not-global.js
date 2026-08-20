/**
 * SAFE FOR THIS RULE - ADVERSARIAL. `top` and `parent` name a DIFFERENT window,
 * so `parent.fetch` is a cross-origin reach, not this document's Fetch API.
 * Treating them as aliases of the global object would be wrong in kind, not
 * just noisy. `no-http-urls` still reports the URL.
 */
export function askParent() {
  return parent.fetch('http://api.acme-corp.io/v1/session');
}
