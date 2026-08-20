/**
 * VULNERABLE (adversarial) - The pattern is assembled with `+` instead of a
 * template literal. Every fragment is a static string, so the resulting pattern
 * is fully known at lint time: `^([a-z0-9]+)+$`. Only the node type differs
 * from the template-literal form the rule already handles.
 */
const CHARS = '[a-z0-9]';

export function createSlugMatcher() {
  return new RegExp('^(' + CHARS + '+)+$');
}
