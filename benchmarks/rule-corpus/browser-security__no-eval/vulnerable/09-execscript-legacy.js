/**
 * VULNERABLE - The IE-era evaluator, still shipped in legacy compatibility paths.
 */
export function runLegacy(script) {
  if (typeof execScript === 'function') {
    execScript(script);
  }
}
