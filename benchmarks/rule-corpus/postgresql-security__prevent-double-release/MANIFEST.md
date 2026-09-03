# Rule corpus - `postgresql-security/prevent-double-release` (CWE-415)

## What the rule owns

The same pooled client returned to the pool twice. The pool then hands that one
connection to two callers at once, and their queries interleave on a single
socket — one caller's `COMMIT` lands inside the other's transaction.

Two spellings, and the corpus holds both:

- `client.release()` on the modern promise API
- `done()` — the third callback parameter of `pool.connect(cb)`, which IS the
  release on the legacy API

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | released in the catch AND the finally |
| `vulnerable/02` | two releases in a row |
| `vulnerable/03` | an early return releases, the finally releases again |
| `vulnerable/04` | the CALLBACK form: `done(err)` then fall-through to `done()` |
| `vulnerable/05` | one checkout, a release inside a loop |
| `vulnerable/06` | a typed handle released on the success path and in the finally |
| `vulnerable/07` | a guard whose flag is NEVER assigned guards nothing |
| `vulnerable/08` | the destructured-release spelling, inside a loop |
| `vulnerable/09` | the `function` expression spelling of the callback form |
| `safe/01` | the remediation: exactly one release, in the finally |
| `safe/02` | two releases that are the two arms of one if/else |
| `safe/03` | a release-once guard whose flag is named `settled` |
| `safe/04` | two DIFFERENT clients, each released once |
| `safe/05` | the callback form done correctly — the error path returns |
| `safe/06` | two functions, each owning its own client |
| `safe/07` | the checkout INSIDE the loop, so each iteration owns one |
| `safe/08` | guards using flag names that are not `released`/`done`/`closed` |
| `safe/09` | the callback error path THROWS rather than returning |
| `safe/10` | the loop and release in a different function from the checkout |

## Deliberately out of scope

- **A release in a different function scope** (`safe/10`). This scope cannot say
  how often the other one runs.
- **Ternaries and dynamic dispatch.** `condition ? handleA(client) : handleB(client)`
  hides the release behind a call.

## The defects this corpus proved

The rule scored **72.7% F1**:

1. **The guard was a spelling.** `isGuardedByCondition` asked whether the negated
   identifier contained `released`, `done` or `closed` — control-flow state
   inferred from a variable name, and this rule's registered name-inference
   debt. It was wrong in both directions: it reported a correct release-once
   guard whose flag was called `settled`, and it ACCEPTED
   `if (!client.released) { client.release(); }` twice, which is a real double
   release because the flag is never assigned. A guard is now proven by the
   guarded block ASSIGNING the flag it tested.
2. **`doubleReleaseCallback` was an orphan message.** Declared, never reported,
   with a note in the test file deferring it as "requires complex scope
   analysis". It was not dead metadata — it was a report path that had never
   been built, so the whole legacy `pool.connect(cb)` API was a blind spot.
3. **A release inside a loop was invisible**, because the pairwise comparison
   needs two release calls and a loop only has one in the source.

## Tests that asserted a defect as correct behaviour

Four, and two of them said so in their own names:

- `index.spec.ts` — "Loop pattern - requires CFG (documented FN)" and "While
  loop with release - requires CFG (documented FN)". Both are textbook double
  releases asserted as VALID. They are now invalid cases.
- `index.spec.ts` — "Guarded with !client.released member": a fake guard,
  asserted valid.
- `coverage-gaps.spec.ts` — two more fake guards, existing only to cover the
  name-substring arms that no longer exist.

## Adversarial wave

Fixtures 07–09 (vulnerable) and 08–10 (safe) were written after the rule reached
100%. The score HELD, because the structural rewrite already covered the fake
guard, the destructured spelling and the `function`-expression callback without
special-casing any of them.
