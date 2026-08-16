/**
 * VULNERABLE - ADVERSARIAL. A LOCAL function wearing an allowlisted
 * validator's name that returns its input unchanged. The allowlist was by
 * name, so this is the evasion it invites.
 */
const isSafeUrl = (u) => u;
const next = location.hash.slice(1);
if (isSafeUrl(next)) {
  location.assign(next);
}
