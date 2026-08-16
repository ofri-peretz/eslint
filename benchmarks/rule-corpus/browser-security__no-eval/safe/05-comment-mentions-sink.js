/**
 * SAFE - The sink name appears only in a comment.
 */
// Never eval(config.script) here — the manifest is attacker-reachable.
export function applyConfig(config) {
  document.body.dataset.theme = config.theme;
}
