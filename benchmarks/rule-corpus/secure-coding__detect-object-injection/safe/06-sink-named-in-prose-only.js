/**
 * SAFE — dot notation throughout; the sink appears only in a comment and a
 * string literal.
 *
 * A security-advice generator. `obj[userInput] = value` is data here, never
 * code. A rule that greps its own source text instead of walking the AST reports
 * this file.
 */
export const ADVICE = {
  cwe: 'CWE-915',
  // Bad:  obj[userInput] = value
  // Good: const map = new Map(); map.set(userInput, value)
  summary: 'Never write obj[userInput] = value against a plain object.',
  snippet: "settings[req.body.key] = req.body.value; // prototype pollution",
};

export function renderAdvice() {
  return `${ADVICE.cwe}: ${ADVICE.summary}\n${ADVICE.snippet}`;
}
