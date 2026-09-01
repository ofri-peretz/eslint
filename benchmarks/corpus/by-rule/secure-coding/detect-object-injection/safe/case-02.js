// secure-coding/detect-object-injection — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/detect-object-injection
export function apply(target) {
  const req = { body: { a: 1 } };
  for (const k in req.body) {
    target[k] = req.body[k];
  }
}
