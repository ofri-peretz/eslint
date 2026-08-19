/**
 * SAFE - Cloning an existing RegExp.
 *
 * `.source` is a string the ENGINE produced from an already-compiled pattern,
 * not one a caller supplied, so the copy compiles to exactly what the original
 * did. Proven by execution against `recheck` in REGEXP-FACTS.md: four patterns
 * spanning safe and exponential, every clone byte-identical to its original
 * with the same oracle verdict.
 *
 * A finding here is therefore a duplicate of whatever the original already
 * earns, or a misattribution pointing at the copy. This shape occurs in
 * mongoose, webpack and n8n; it was in none of the fixtures until 2026-08-19,
 * which is why the duel scored 100% while never testing it.
 */
export function cloneRegExp(regexp) {
  const ret = new RegExp(regexp.source, regexp.flags);
  ret.lastIndex = regexp.lastIndex;
  return ret;
}

const PLACEHOLDER = /\{\{(.*?)\}\}/;

export function globalPlaceholder() {
  return new RegExp(PLACEHOLDER.source, 'g');
}
