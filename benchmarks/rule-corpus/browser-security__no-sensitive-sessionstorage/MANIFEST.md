# Rule corpus — `browser-security/no-sensitive-sessionstorage` (CWE-922)

Written from CWE-922 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

A write to **`sessionStorage`** whose resolved key names a **non-bearer**
secret. sessionStorage is per-tab and dies with it, which is why it is the
storage people reach for when they know localStorage is wrong — but it is still
readable by every script on the origin, so an XSS during the session gets it.

## What it defers

Bearer credentials go to `no-jwt-in-storage`; `localStorage` goes to
`no-sensitive-localstorage`.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 took recall to 83.3%: the resolved method name and the template-literal key.

Current corpus: 12 vulnerable / 10 safe fixtures.
