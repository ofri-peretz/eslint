/**
 * VULNERABLE - Optional chaining feature-detects the evaluator; it still evaluates.
 */
export function runLegacyShim(source) {
  window?.eval?.(source);
}
