# Rule corpus — `browser-security/no-sensitive-localstorage` (CWE-922)

Written from CWE-922 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

A write to **`localStorage`** whose resolved key names a **non-bearer** secret:
a password, a key, or a regulated identifier. localStorage has no expiry, so the
value outlives the session on disk and any XSS on the origin reads it.

## What it defers

Bearer credentials (`token`, `jwt`, `session`) go to `no-jwt-in-storage`;
`sessionStorage` goes to `no-sensitive-sessionstorage`. Several `safe/`
fixtures are genuine vulnerabilities owned by those rules.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 took recall to 78.6%: the resolved method name, the template-literal key, and the destructured global. It also forced regular-plural folding — store and key names are written in the plural (`passwords`), and whole-word matching without it trades a false-positive class for a false-negative one.

Current corpus: 14 vulnerable / 11 safe fixtures.
