/**
 * VULNERABLE - The destination arrives through two bindings. Neither hop
 * constrains anything; a rule that only looks one level deep misses it.
 */
const raw = window.location.hash;
const trimmed = raw.slice(1);
location.replace(trimmed);
