/**
 * The tainted root is a function parameter — an exported helper compiled from
 * whatever a caller hands it.
 *
 * This is the shape that makes a library dangerous rather than an application:
 * nothing in this file proves the pattern is safe, and the rule cannot see the
 * caller. A parameter must therefore count as unproven, not as constant.
 */
export function buildTagMatcher(rawPattern) {
  return new RegExp(rawPattern, 'gi');
}

export function highlightTags(text, rawPattern) {
  return text.replace(buildTagMatcher(rawPattern), (tag) => `<mark>${tag}</mark>`);
}
