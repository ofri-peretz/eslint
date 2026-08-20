# Rule corpus — `browser-security/no-sensitive-data-in-cache` (CWE-524)

Written from CWE-524 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

The **Cache Storage API** — `put`, `add` and `addAll` on a `Cache`, where
a `Cache` is proven by resolving the receiver back to `caches.open()`. A
response cached here is written to disk, survives the session, and is served
back to any user of the browser profile.

## What it defers

Web Storage and IndexedDB. And, crucially, **every `.set`/`.put`/`.store`
call that is not a Cache** — a Map, a metrics counter and a Redux store all have
those method names, and all three were CWE-200 findings before the sink was
proven.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 held at 100%. The four shapes aimed at it — a cache name through a binding, a `function` rather than arrow `.then` callback, an absolute URL, and fully-renamed identifiers — all landed, because the receiver is resolved back to `caches.open()` rather than matched by spelling.

Current corpus: 13 vulnerable / 10 safe fixtures.
