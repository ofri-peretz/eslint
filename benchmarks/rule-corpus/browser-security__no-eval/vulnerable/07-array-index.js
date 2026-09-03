/**
 * VULNERABLE - The executed value is reached through an array index.
 */
const HOOKS = window.__APP_HOOKS__ ?? [];

export function runHook(index) {
  eval(HOOKS[index]);
}
