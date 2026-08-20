/**
 * SAFE - A denylist that names BOTH dangerous schemes. Incomplete is the defect;
 * complete is the fix.
 */
const BLOCKED = ['javascript:', 'data:', 'vbscript:'];

export function sanitize(href) {
  const scheme = href.trim().toLowerCase();
  return BLOCKED.some((prefix) => scheme.startsWith(prefix)) ? '#' : href;
}
