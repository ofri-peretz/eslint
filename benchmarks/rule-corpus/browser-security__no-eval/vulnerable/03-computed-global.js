/**
 * VULNERABLE - Bracket notation on the global object reaches the same evaluator.
 */
export function runMigration(step) {
  return window['eval'](step.script);
}
