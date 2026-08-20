/**
 * SAFE - The catastrophic shape `(a+)+$` appears twice in this file: once in a
 * comment, once inside a string literal that documents what the linter forbids.
 * Neither is a regex. A rule that reads printed source rather than the AST
 * reports here; a rule that reads the AST cannot.
 *
 * Rejected pattern for reference: (a+)+$
 */
export const FORBIDDEN_REGEX_SHAPES = [
  '(a+)+$',
  '(\\s*,\\s*)*',
  '([\\/\\w \\.-]*)*',
];

// A nested quantifier such as (\w+)* is what we are scanning source files for.
const LINE_SPLIT = /\r?\n/;

export function findForbiddenShapes(source) {
  return source
    .split(LINE_SPLIT)
    .filter((line) => FORBIDDEN_REGEX_SHAPES.some((shape) => line.includes(shape)));
}
