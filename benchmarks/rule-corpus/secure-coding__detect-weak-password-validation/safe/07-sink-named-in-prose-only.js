/**
 * SAFE — the weak policy appears only inside a comment and a string literal.
 *
 * A security-advice generator. `password.length >= 6` is data here, never code.
 * A rule that greps its own source text instead of walking the AST reports this
 * file.
 */
export const ADVICE = [
  {
    cwe: 'CWE-521',
    // Bad:  if (password.length >= 6) { accept(); }
    // Good: if (password.length >= 12) { accept(); }
    summary: 'Six characters is roughly 2^34 — a commodity GPU exhausts it in minutes.',
    snippet: 'if (password.length >= 6) { return true; }',
  },
];

export function renderAdvice() {
  return ADVICE.map((entry) => `${entry.cwe}: ${entry.summary}`).join('\n');
}
