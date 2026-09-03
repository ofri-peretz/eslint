/**
 * SAFE - The sink name appears only inside a string literal.
 */
export const CSP_HINT =
  "unsafe-eval is not in our policy; new Function() and eval() will throw";

export function reportViolation(directive) {
  navigator.sendBeacon('/csp-report', directive);
}
