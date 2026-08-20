/**
 * SAFE - a `req` this file BUILDS is not an inbound request.
 *
 * The measured false positive: a fixture, default or test double spelled `req`
 * was read as attacker-controlled. The initialiser is right there, so asserting
 * a caller exists is asserting against visible evidence.
 */
const req = { params: { id: 'demo-1' }, body: { theme: 'dark' } };

export function preview(table) {
  return table[req.params.id];
}
