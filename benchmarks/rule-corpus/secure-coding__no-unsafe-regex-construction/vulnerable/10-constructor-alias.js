/**
 * VULNERABLE (adversarial) - The sink reached through a const alias. Aliasing a
 * constructor to shorten a hot loop is ordinary, and the compiled pattern is
 * identical.
 */
const Pattern = RegExp;

export function buildFilter(req) {
  return new Pattern(req.query.filter, 'i');
}
