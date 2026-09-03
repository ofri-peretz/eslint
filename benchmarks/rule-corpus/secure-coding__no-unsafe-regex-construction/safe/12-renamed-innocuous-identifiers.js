/**
 * SAFE (adversarial) - The FALSE-NEGATIVE direction, inverted: genuinely safe
 * code whose identifiers are spelled exactly like the taint roots. `request`,
 * `query`, `params` and `body` here are a retry-policy object built from module
 * constants; not one character of them comes from outside the file.
 *
 * JUDGEMENT: safe. A rule that keys on the spelling `request.query.*` reports
 * this; a rule that follows the binding sees three literals.
 */
const RETRY_POLICY = Object.freeze({
  query: { pattern: '^GET /v1/' },
  params: { pattern: '^[a-f0-9]{24}$' },
  body: { pattern: '^application/json' },
});

const request = RETRY_POLICY;

export const matchers = {
  query: new RegExp(request.query.pattern),
  params: new RegExp(request.params.pattern),
  body: new RegExp(request.body.pattern),
};
