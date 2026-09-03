# Rule corpus — `browser-security/no-sensitive-cookie-js` (CWE-1004)

Written from CWE-1004 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

A `document.cookie` write whose **cookie NAME** denotes a **non-bearer** secret
— a password, a key, or a regulated identifier. Cookies travel on every request
to the origin, so a secret in one is exposed to XSS AND to every log and proxy
on the path.

## What it defers

Bearer credentials go to `no-cookie-auth-tokens`; missing attributes go to
`require-cookie-secure-attrs`. Every vulnerable fixture carries
`Secure; SameSite` so the corpus scores this rule and not its neighbours.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 held at 100%: the append idiom, a split cookie name, and fully-renamed identifiers.

Current corpus: 11 vulnerable / 10 safe fixtures.
