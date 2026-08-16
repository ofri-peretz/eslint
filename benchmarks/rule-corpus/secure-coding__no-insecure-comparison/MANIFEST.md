# Rule corpus — `secure-coding/no-insecure-comparison` (CWE-697 / CWE-208)

**The question this corpus exists to answer:** the rule is marked
`deprecated: true, replacedBy: ['node-security/no-timing-unsafe-compare']`. Is that
supported by what the two rules actually detect?

The rule covers two hazards at once: type coercion in `==`/`!=` (CWE-697) and a
short-circuiting comparison of a secret (CWE-208). The corpus carries both, because
the deprecation claim can only be judged against both.

## Waves

| Wave | Fixtures | TP | FP | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 — idiom | 9 vuln / 8 safe | 7 | 2 | 2 | 77.8% | 77.8% | **77.8%** |
| 2 — adversarial | 13 vuln / 11 safe | 7 | 4 | 6 | 63.6% | 53.8% | **58.3%** |
| 3 — after the fixes | 13 vuln / 11 safe | 13 | 0 | 0 | 100% | 100% | **100%** |

## The verdict on the deprecation

`node-security/no-timing-unsafe-compare`, measured on this same corpus:

| Rule | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| `secure-coding/no-insecure-comparison` (fixed) | 13 | 0 | 0 | 100% | 100% | **100%** |
| `node-security/no-timing-unsafe-compare` | 2 | 0 | 11 | 100% | 15.4% | **26.7%** |

**The `replacedBy` pointer is wrong as written.** The replacement covers only the
timing half; it is silent by design on `vulnerable/03-otp-type-juggling.js` and
`vulnerable/05-privilege-loose-equality.js`, which are pure CWE-697 — a `==` in an
authentication and an authorization decision. A consumer who follows the
`replacedBy` and deletes this rule loses the whole type-coercion class. Either the
deprecation should be withdrawn or `replacedBy` should be narrowed to the CWE-208
subset and paired with core `eqeqeq` for the rest.

## What the corpus proved

**One defect, and it is the repo's named worst class.** An `isSecurityContext` walk
matched the ENCLOSING function or method's name against
`/security|auth|crypto|hash|token|secret|insecure|verify|validate/` and, on a match,
promoted the generic words `provided`, `expected`, `actual`, `input`, `value` and
`data` to secrets. Two names, both generic, decided a CWE-208 finding between them:

```js
function validateAddress(value) { return value === 'US'; }   // reported
function normalizeAddress(value) { return value === 'US'; }  // silent
```

`validate` is the commonest verb in application code and `value` the commonest
parameter name, so the pair fires on ordinary business logic. It produced three of the
four false positives here: a country-code validator, an order-state machine, and an
asset-hash helper. The fourth was a `let` whose every write is a string literal, which
lost the both-operands-are-strings exemption because that exemption required exactly
one write.

**The rule's own test suite asserted the defect as correct behaviour**, in two cases
with an approving comment ("so generic contextKeywords … become potential secrets
too"), and paired them with two `valid` cases proving the same comparison is silent
inside `computeTotal`. So did `src/rules/__tests__/integration-demo.test.ts`, whose
fixture is named `insecure_noInsecureComparison` — the word "insecure" in the
fixture's own name is what opened the security context.

## What replaced it

The escalation is deleted. A secret is matched by its own word, and a secret one
binding away is found by resolving the binding — through single-write initializers,
destructuring keys, computed string-literal keys, ternary branches and TS casts —
which is what recovered all six adversarial false negatives without the name heuristic.

Locked in `no-insecure-comparison.test.ts`; 9 of its cases fail on the pre-fix rule.
