# Rule corpus - `secure-coding/no-pii-in-logs` (CWE-359)

**The question this corpus exists to answer:** this rule decides entirely by
the SPELLING of a property. What does that cost in both directions, and how
much of the cost is fixable without inventing evidence the rule does not have?

The rule was one of the three flagged for `nominal-inference-report`, and it is
the source of the canonical shipped example:

```js
console.log(device.microphoneEnabled);   // "PII in console logs" — phone ⊂ microphone
```

## Score

| wave | TP | FP | FN | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| as shipped | 3 | 5 | 5 | 37.5% | 37.5% | **37.5%** |
| after fixes | 8 | 1 | 0 | 88.9% | 100.0% | **94.1%** |

8 vulnerable / 7 safe fixtures. No crashes. There is no external competitor for
this sink, so the duel table has one row.

## What the corpus proved

**Substring matching over the PII vocabulary (false positives).** `piiProps.some(p => propName.includes(p))`
reported four of the seven safe fixtures. `phone` is a substring of `microphone`,
`headphones`, `smartphone` and `saxophone`; `password` is a substring of
`passwordless`, which means the opposite thing. Fixed with `nameHasAnyWord`,
which splits the identifier into segments first. `creditCard` is carried as a
two-word term so it still matches `creditCardNumber` and not `wildcardPolicy`.

**A string literal reported as PII.** `text.includes('email:')` reported
`console.error('Validation failed - email: must be a valid address')` — UI copy
naming a form field. A literal is a compile-time constant and cannot hold a
user's data, so it can only LABEL a sibling value; the check now requires the
literal to be exactly a label AND to have an argument after it.

**Only a bare MemberExpression argument was inspected (false negatives).** Five
of the eight vulnerable fixtures leak the identical field and were silent:
template interpolation, `+` concatenation, a structured-log object literal, an
`as string` cast, and one destructuring hop. Fixed by walking the
VALUE-PRESERVING sub-expressions of each argument, and by resolving a binding
back to the destructuring key or field read it came from.

A CallExpression is deliberately NOT traversed: `hash(user.email)` logs a
digest, not the address. Traversing it would report `safe/05-redacted-remediation.js`,
which is the recommended fix.

## The residual, and what it says about the rule

`safe/07-tokenizer-metrics.js` is still reported and is left that way on
purpose. `config.promptEmailTemplateId` carries `email` as a genuine whole word
and holds a template ID such as `welcome-v3` — no personal data at all. No
structural signal separates it from `user.emailAddress`, because there is none:
**this rule has no evidence except the name.** Whole-word matching makes a
name-based rule correct about English; it does not make it a taint analysis.

The same limit is the honest ceiling on recall. Every vulnerable fixture here is
detected only because someone spelled the field conventionally. Rename
`user.email` to `subscriber.contactAddress` and the finding disappears — see
`vulnerable/08-destructured-hop.js` for the binding-resolution half that WAS
recoverable, and note that nothing recovers the vocabulary half.
