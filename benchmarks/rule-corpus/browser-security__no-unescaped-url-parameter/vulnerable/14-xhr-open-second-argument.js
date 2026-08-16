/**
 * VULNERABLE - `XMLHttpRequest.open(method, url)` takes the URL SECOND. A sink
 * list that only ever looks at argument zero misses every legacy call site.
 */
export function legacyLookup(term) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/api/v1/lookup?term=${term}`);
  xhr.send();
}
