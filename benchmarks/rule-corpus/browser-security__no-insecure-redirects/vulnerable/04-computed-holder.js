/**
 * VULNERABLE - Computed member access reaches the same Location. Bundlers and
 * defensive style both produce this spelling.
 */
const next = location.hash;
window['location'].href = next;
