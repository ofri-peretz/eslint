/**
 * VULNERABLE (adversarial) - the squatted name reaches `require` through ONE
 * intermediate `const`. Hoisting a dependency name to a module constant is
 * ordinary style, not obfuscation, and the loaded package is exactly the same
 * `loadsh` impostor as fixture 01.
 */
const HTTP_CLIENT = 'axois';
const UTIL_PACKAGE = 'loadsh';

const http = require(HTTP_CLIENT);
const { uniqBy } = require(UTIL_PACKAGE);

export async function dedupeAccounts(ids) {
  const responses = await Promise.all(ids.map((id) => http.get(`/accounts/${id}`)));
  return uniqBy(responses.map((r) => r.data), 'id');
}
