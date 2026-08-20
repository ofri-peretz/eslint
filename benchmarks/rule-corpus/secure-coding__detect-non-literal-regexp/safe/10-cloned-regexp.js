/**
 * SAFE - Cloning a RegExp the file can SEE.
 *
 * `.source` is a string the engine produced from an already-compiled pattern,
 * so the copy compiles to exactly what the original did — proven by execution
 * against `recheck` in REGEXP-FACTS.md, four patterns spanning safe and
 * exponential, every clone byte-identical with the same oracle verdict.
 *
 * The qualifier is "the file can see". This one resolves to a literal declared
 * above it, so the program itself says the receiver is a RegExp. A clone whose
 * receiver is a PARAMETER proves nothing and lives in
 * vulnerable/16-clone-of-unknown-regexp.js.
 */
const PLACEHOLDER = /\{\{(.*?)\}\}/;

export function globalPlaceholder() {
  return new RegExp(PLACEHOLDER.source, 'g');
}

const BUILT = new RegExp('a+');

export function cloneOfConstructed() {
  return new RegExp(BUILT.source, 'g');
}
