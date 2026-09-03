/** SAFE - a variable whose NAME resembles the directive while its VALUE is a
 *  strict policy. A rule that decides by spelling reports this; a rule that
 *  reads the policy does not. */
const unsafeEvalPolicy = "default-src 'self'; script-src 'self'";
const allowUnsafeEval = false;

export function policy() {
  return allowUnsafeEval ? "script-src 'self'" : unsafeEvalPolicy;
}
