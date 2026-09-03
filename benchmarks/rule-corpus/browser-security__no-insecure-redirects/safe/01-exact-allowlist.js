/**
 * SAFE - The correct remediation: an exact allowlist of destinations. The
 * attacker's string either IS one of three known paths or it is not used.
 */
const ALLOWED = new Set(['/dashboard', '/billing', '/settings']);
const next = new URLSearchParams(location.search).get('next');
if (ALLOWED.has(next)) {
  window.location.href = next;
}
