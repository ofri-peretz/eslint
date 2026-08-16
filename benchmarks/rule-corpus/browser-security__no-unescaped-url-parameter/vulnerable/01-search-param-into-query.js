/**
 * VULNERABLE - The commonest shape there is: a query value read straight back
 * out of the address bar and spliced into another URL's query. A single `&`
 * in `q` re-partitions the outbound query for whatever parses it.
 */
export async function proxySearch() {
  const q = new URLSearchParams(location.search).get('q');
  return fetch(`https://api.example.com/v1/search?q=${q}&limit=20`);
}
