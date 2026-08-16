/**
 * VULNERABLE - The payload is laundered through a helper before it reaches the sink.
 */
function decode(raw) {
  return atob(raw);
}

export function applyTheme(encodedRules) {
  eval(decode(encodedRules));
}
