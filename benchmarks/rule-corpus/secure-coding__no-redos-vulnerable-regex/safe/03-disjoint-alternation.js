/**
 * SAFE - Alternation under a quantifier is only catastrophic when the branches
 * OVERLAP. `[a-z]+` and `[0-9]+` share no character, and each repetition is
 * separated by a mandatory `-`, so there is exactly one way to match any input:
 * no backtracking is possible. Compare vulnerable/08, which is `(\d+|\s)*`.
 */
const SLUG = /^(?:[a-z]+|[0-9]+)(?:-(?:[a-z]+|[0-9]+))*$/;
const HTTP_METHOD = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/;

export function isRouteSlug(value) {
  return SLUG.test(value);
}

export function isHttpMethod(value) {
  return HTTP_METHOD.test(value);
}
