/**
 * SAFE - The sink appears only as text. A comment showing the ANTI-pattern and a
 * documentation constant quoting it are not calls.
 */
// Do not write `new RegExp(req.query.pattern)` here - compile from the allowlist.
export const SECURITY_NOTE = 'new RegExp(userInput) is CWE-400; escape first.';

const ALLOWED = new Map([['slug', /^[a-z0-9-]+$/]]);

export function patternFor(kind) {
  return ALLOWED.get(kind) ?? null;
}
