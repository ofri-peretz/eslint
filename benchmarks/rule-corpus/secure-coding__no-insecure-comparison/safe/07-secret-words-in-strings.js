/**
 * SAFE - The secret vocabulary appears only in comments, string literals and
 * documentation data. The one comparison in the executable code matches a
 * documentation id against another documentation id.
 *
 * Documented: `token === expectedToken` leaks timing; use timingSafeEqual.
 */
export const SECURITY_NOTES = [
  { id: 'timing', title: 'password and token comparison', cwe: 'CWE-208' },
  { id: 'coercion', title: 'apiKey == secret type juggling', cwe: 'CWE-697' },
];

export function noteFor(topic) {
  return SECURITY_NOTES.find((note) => note.id === topic) ?? null;
}
