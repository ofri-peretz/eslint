# Rule corpus — `secure-coding/no-improper-type-validation` (CWE-1287)

**The question this corpus exists to answer:** CWE-1287 is *Improper Validation of
Specified Type of Input*. Does this rule detect it?

The `vulnerable/` files are written from the vulnerability, not from the rule. In
JavaScript, CWE-1287 is overwhelmingly one shape: Express parses `?email[$ne]=x` into
an **object** and `?tag=a&tag=b` into an **array**, so a value the handler assumes is a
string arrives as neither, and reaches an ORM as a query operator. The corpus carries
that shape at several depths — destructured, one binding hop away, behind an
`as string` cast, as a function parameter — alongside the check-level hazards the
rule's own messages name (`typeof x === 'object'` admitting null, spoofable
`constructor.name`, `==` type juggling in an authorization decision).

## Waves

| Wave | Fixtures | TP | FP | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 — idiom | 8 vuln / 8 safe | 2 | 4 | 6 | 33.3% | 25.0% | **28.6%** |
| 2 — adversarial | 12 vuln / 10 safe | 2 | 5 | 10 | 28.6% | 16.7% | **21.1%** |
| 3 — after the fixes | 12 vuln / 10 safe | 6 | 0 | 6 | 100% | 50.0% | **66.7%** |

21.1% F1 — 28.6% precision — was the starting point: the rule reported on **half the
safe files** and missed **ten of twelve** real vulnerabilities.

## What the corpus proved

Five defects, four of which reported on evidence the rule did not have:

1. **The rule reported its own prescribed remediation.** `unsafeTypeofCheck` tells you
   to write `value != null && typeof value === "object"`. Writing that produced a
   `looseEqualityTypeCheck` on `value != null` (`safe/08`).
2. **`looseEqualityTypeCheck` was inverted.** Its predicate required an operand's
   printed text to contain "null" or "undefined", so the only `==` it ever reported
   was `x == null` — the idiomatic nullish test that core `eqeqeq` exempts under
   `smart` and that this plugin's own `no-insecure-comparison` exempts explicitly —
   while `req.body.otp == storedOtp`, the authentication bypass the message describes,
   was silent.
3. **Substring, not word.** That same printed-text test made `annulled == 1` a type
   confusion, because "annulled" contains "null" (`safe/07`). The rule's own test
   suite documented this approvingly for `if (something != nullinput)`.
4. **A name decided every other verdict.** `isUserInput` was
   `userInputVariables.some(w => varName.includes(w))` over
   `req/request/body/query/params/input/data/userInput`. So `if (metadata)` was a
   security finding (it contains "data"), `typeof req.body.profile === 'object'` was
   not (its object is a MemberExpression, not a bare identifier), and renaming a
   variable turned a real finding off.
5. **`constructor.name` fired on a log label.** Any `constructor.name` in a variable
   declaration reported, so `const errorKind = error.constructor.name` — every
   structured logger's exception tag — was CWE-1287.

Two message IDs had no reachable honest emitter and were deleted:
`improperTypeValidation`'s second emitter required a `CallExpression` whose callee is
an `Identifier` named `typeof`, which **no JavaScript program can produce** — `typeof`
is a keyword and `typeof(x)` parses as a `UnaryExpression`. That branch was vacuous by
construction.

## The structural limit, stated plainly

The rule inspects type checks that are **present**. CWE-1287 is the **absence** of one.
Six vulnerable fixtures remain unreported after the fixes —
`01-nosql-operator-object`, `02-array-coercion`, `04-ts-cast-is-not-a-check`,
`07-param-root-untyped`, `08-fake-mitigation-truthiness`, `11-local-fake-validator` —
and every one of them is that gap. Closing it needs taint tracking from a request to a
type-sensitive sink, which is a different rule, not a tuning of this one. The 66.7% F1
above is the ceiling of the current design; the six misses are recorded here rather
than papered over.
