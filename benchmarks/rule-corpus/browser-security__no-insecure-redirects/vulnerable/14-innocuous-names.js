/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. Identical to 01 with every telling
 * identifier renamed to something innocuous. Detection must survive: the
 * evidence is `location.search` reaching a Location write, not the spelling
 * `returnTo`.
 */
export function step3() {
  const b = new URLSearchParams(window.location.search);
  const q = b.get('r');
  window.location.href = q;
}
