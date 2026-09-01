// secure-coding/detect-object-injection — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/detect-object-injection
const SAFE_DEFAULTS = { a: 1 };
export function copy(req, target) {
  let source = req.body;
  source = SAFE_DEFAULTS;
  for (const k in source) {
    target[k] = source[k];
  }
}
