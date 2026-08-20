# Rule corpus — `browser-security/no-jwt-in-storage` (CWE-922)

Written from CWE-922 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

A write to Web Storage (`localStorage` / `sessionStorage`) of a **bearer
credential** — something an attacker who reads it can replay to become the user.
Evidence is either the resolved key naming one by whole word, or the stored
value being provably a JWT (header base64url-decodes to a JOSE header).

## What it defers

Non-bearer secrets (`password`, `api_key`, `ssn`) go to
`no-sensitive-localstorage` / `no-sensitive-sessionstorage`. IndexedDB goes to
`no-sensitive-indexeddb`, the Cache Storage API to `no-sensitive-data-in-cache`,
cookies to `no-cookie-auth-tokens`. `safe/` therefore contains fixtures that
ARE vulnerabilities — just somebody else's. That is the partition, not a miss.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 took recall from 100% to 77.8% and precision to 93.3%. It found four false negatives — a method name arriving through a binding (`const WRITE = 'setItem'`), a namespaced key built with a template literal, a key built by concatenation, and the SSR-safety destructure `const { localStorage: store } = window` — and one false positive: a PARAMETER named `localStorage` holding a test double. All five are fixed; the parameter case needed scope analysis, which is the only thing that can tell a free global from a local binding of the same spelling.

Current corpus: 18 vulnerable / 14 safe fixtures.
