/** SAFE - fixed at build time. "Dynamic" means an attacker can change the
 * pattern, not that it is spelled as something other than a literal. */
const SLUG_PATTERN = '^[a-z0-9-]+$';
export const SLUG = new RegExp(SLUG_PATTERN);
