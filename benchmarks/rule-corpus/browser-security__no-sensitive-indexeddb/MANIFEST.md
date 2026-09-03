# Rule corpus — `browser-security/no-sensitive-indexeddb` (CWE-922)

Written from CWE-922 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

IndexedDB. Two shapes, both proven structurally: `createObjectStore(name)`
(which exists on `IDBDatabase` and nowhere else), and `add`/`put` on a
receiver that resolves back to an `objectStore()` call. IndexedDB is the
largest and longest-lived origin store in the browser, so a secret written here
outlives everything else.

## What it defers

Web Storage and the Cache Storage API. Bearer credentials are IN scope — no
sibling rule covers IndexedDB, so deferring them would be a false negative.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 took recall to 84.6% and found the biggest gap in the group: the `idb` package. It is how most production code touches IndexedDB, its shape is `db.put(storeName, value)`, and it shares no AST with the raw `objectStore(name).put(value)` the rule was written against. Wave 2 also found an object store reached through an alias binding.

Current corpus: 13 vulnerable / 10 safe fixtures.
