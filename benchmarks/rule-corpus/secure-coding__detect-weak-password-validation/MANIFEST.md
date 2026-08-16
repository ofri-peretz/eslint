# Rule corpus — `secure-coding/detect-weak-password-validation` (CWE-521)

**The question this corpus exists to answer:** this rule is the one CLAUDE.md
uses as its worked example of the repo's first-listed defect — `if (passengers.length >= 4)`
reporting *"Password length requirement is too weak"*. It was also registered
debt in `scripts/lint-name-inference.ts`, direction `report`, which is the
direction CLAUDE.md says to fix first. So: how much of this rule was actually
working?

Answer, measured before any change: **F1 15.4% — TP 1 / FP 5 / FN 6.** It found
one of seven real weak password policies and reported five of seven files that
contain no password policy at all. There is no competitor row because no
mainstream plugin ships a CWE-521 length rule; the comparison that matters here
is against the rule's own claim.

## Scores

`RESULTS.json` is the verbatim output of `benchmarks/suites/ilb-rule-duel/run.mjs`.

| Stage | Fixtures | TP | FP | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| Before any change | 7 vuln / 7 safe | 1 | 5 | 6 | 16.7% | 14.3% | **15.4%** |
| After the rewrite | 7 vuln / 7 safe | 6 | 0 | 1 | 100.0% | 85.7% | **92.3%** |
| + adversarial wave | 10 vuln / 8 safe | 7 | 0 | 3 | 100.0% | 70.0% | **82.4%** |
| After the adversarial fixes | 10 vuln / 8 safe | 9 | 0 | 1 | 100.0% | 90.0% | **94.7%** |

The one remaining miss is `vulnerable/07-zod-schema-minimum.ts`, deliberately
unfixed — see the last section.

## What was wrong

The rule was: `BinaryExpression`, operator in `['>=','>','==','===']`, left is
`<Identifier>.length`, right is a numeric literal `< 8`, and
`left.object.name.toLowerCase()` contains `'password'`, `'pwd'` or `'pass'`.
Every clause of that carried a defect.

| # | Fixture | Defect | Fix |
|---|---|---|---|
| 1 | `safe/03-passenger-group-fare.js`, `safe/05-bypass-list.js`, `safe/04-one-time-passcode.js` | **FP, decided by a name.** `passengers`, `bypassList`, `compassHeadings` and a six-digit `passcode` all contain `pass` as a substring | whole-word membership via devkit's `nameHasAnyWord` — which exists *because of this rule*; its header names `passengers` as the motivating case. `vulnerable/10-vocabulary-breadth.js` locks the other direction: `userPwd`, `newPassphrase` and `confirmPassword` must all still match |
| 2 | `vulnerable/02-guard-clause-reject.js`, `vulnerable/06-inclusive-upper-bound.js` | **FN — half the policy space.** `<` and `<=` were not in the operator list, so `if (password.length < 6) throw` was invisible. Early-return validation is the more common of the two spellings | the rule now computes the MINIMUM a comparison enforces: `>= n` and `< n` both give `n`; `> n` and `<= n` both give `n + 1`. The four spellings of one policy became one question |
| 3 | `safe/06-strict-greater-than-seven.js` | **FP — off by one.** `password.length > 7` is a minimum of *eight*, the NIST floor and the rule's own documented "✅ Correct" example. It reported because the literal 7 is below 8 | same fix: the test is on the enforced minimum, not on the literal |
| 4 | `safe/02-presence-check.js` | **FP — a presence check is not a policy.** `if (password.length === 0) throw` and `if (password.length > 0)` state no requirement, and were described as "Password length requirement is too weak (less than 8 characters)" | a minimum below 2 is never reported. No policy has ever required "at least 0 characters" |
| 5 | `vulnerable/03-request-body-member.js`, `vulnerable/04-ts-cast.ts` | **FN — `left.object` had to be a bare Identifier**, so every policy applied straight to `req.body.password` or a cast DTO field was invisible | the measured value may be a non-computed member access; the last property name carries the evidence |
| 6 | `vulnerable/05-named-constant-threshold.js` | **FN — the threshold had to be a numeric literal**, so `const MIN_PASSWORD_LENGTH = 6` — the better-written form of the same weak policy — was the one that escaped | one `const` hop resolved through scope analysis; a multi-definition binding or a non-literal initialiser yields no finding |
| 7 | `vulnerable/08-optional-chaining.js` | FN — `req.body?.password?.length` wraps the access in a `ChainExpression` | the chain is unwrapped; optional links change nothing about which value is measured |
| 8 | `vulnerable/09-trimmed-length.js` | FN — `password.trim().length < 6`, the first line of every form validator, puts a CallExpression where the Identifier was | the receiver of a non-computed method call is followed (depth-bounded); `.trim()`, `.normalize()`, `.toString()` do not change whose length is measured |

Defects 2, 3 and 4 share one root cause: the rule enumerated operators and then
tested the literal, instead of deriving what the comparison actually enforces.

## The registry entry must be deleted in the same commit

`scripts/lint-name-inference.ts` registers this file with
`direction: 'report'` and the reason *"`varName.includes("password"|"pwd"|"pass")`
decides that a variable holds a password. `pass` matches `passenger`,
`passthrough`, `bypassCount`"*. That debt is now paid — there is no `.includes`
on a name left in the file. **The gate fails on a stale registry entry**, so the
entry at `scripts/lint-name-inference.ts` must be removed alongside this change.
This worker was scoped out of `scripts/`.

## What a name is still doing here, and why

Whole-word matching fixes the false-positive half of name inference. It does not
fix the false-negative half: rename `password` to `secretPhrase` and the rule
goes quiet. That is stated rather than hidden, and it is inherent — CWE-521 is a
statement about a *credential*, and no AST fact distinguishes a credential from
any other string. What changed is the ORDER: the rule now proves a structural
fact first (this comparison establishes a minimum, and the minimum is between 2
and 7 inclusive) and only then asks whether the measured value is called a
password. The name narrows proven evidence instead of being the whole verdict,
which is the boundary `@interlace/eslint-devkit`'s `identifier-words.ts` draws
for itself.

One residual is worth naming: `pass` is kept in the vocabulary because the rule's
own test suite and documentation use `pass.length > 3` as a canonical weak
policy. As a whole word it still matches `boardingPass`, `seasonPass` and
`hallPass`. That trade was left alone rather than decided quietly — dropping
`pass` would silence legacy credential code, and no fixture here settles which
is more common.

## Deliberately NOT fixed — and it is the biggest gap

`vulnerable/07-zod-schema-minimum.ts` is a permanent miss. Password minimums in
code written after roughly 2021 live in schemas, not in `.length` comparisons:

```ts
z.string().min(6)                          // zod
Joi.string().min(6)                        // joi
body('password').isLength({ min: 6 })      // express-validator
@MinLength(6) password: string;            // class-validator
```

None of these contains a `.length` comparison, so a rule built entirely around
`BinaryExpression` on a `.length` MemberExpression cannot see any of them. That
is a different sink family, not a variation on the implemented one, and closing
it is a redesign rather than a bug fix. The fixture stays in the corpus at a
measured cost of 10 points of recall, because the size of the gap is a truer
statement about the rule than a corpus that only tests what it already handles.

**Verdict: not vacuous, but substantially unfit before this pass** — 15.4% F1
against realistic code — and still blind to the dominant modern spelling of the
very policy it exists to check.
