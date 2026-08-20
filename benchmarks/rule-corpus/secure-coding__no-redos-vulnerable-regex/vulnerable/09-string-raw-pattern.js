/**
 * VULNERABLE (adversarial) - The same catastrophic `(\w+\s*)+` pattern, written
 * through `String.raw` so the backslashes do not have to be doubled. This is
 * the idiomatic way to write a regex source string in modern JS and it is a
 * TaggedTemplateExpression, not a TemplateLiteral - one node type away from
 * everything the rule reads.
 */
export function createDisplayNameMatcher() {
  return new RegExp(String.raw`^(\w+\s*)+$`);
}
