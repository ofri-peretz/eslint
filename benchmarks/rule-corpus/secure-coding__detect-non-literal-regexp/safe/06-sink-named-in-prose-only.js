/**
 * SAFE — the sink appears only inside a comment and a string literal.
 *
 * A docs generator that emits security guidance. The text `new RegExp(userInput)`
 * is data here, never code. A rule that greps its own source text instead of
 * walking the AST reports this file, which is the failure mode the repo's
 * "AST, not printed source" doctrine exists to prevent.
 */
export const ADVICE = [
  {
    cwe: 'CWE-400',
    // Bad:  new RegExp(userInput)
    // Good: PATTERNS[userChoice]
    summary: 'Avoid new RegExp(userInput); look the pattern up in a constant table instead.',
    snippet: "const matcher = new RegExp(req.query.pattern); // do not ship this",
  },
];

export function renderAdvice() {
  return ADVICE.map((entry) => `${entry.cwe}: ${entry.summary}`).join('\n');
}
