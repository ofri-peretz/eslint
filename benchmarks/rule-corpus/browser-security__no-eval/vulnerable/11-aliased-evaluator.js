/**
 * VULNERABLE - ADVERSARIAL. The evaluator bound to a local name. The sink never
 * appears at a call site, so any rule keyed on the callee's spelling goes quiet.
 */
const run = eval;

export function applyPatch(patch) {
  run(patch.source);
}
