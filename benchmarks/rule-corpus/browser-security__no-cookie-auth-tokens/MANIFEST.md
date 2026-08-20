# Rule corpus — `browser-security/no-cookie-auth-tokens` (CWE-1004)

Written from CWE-1004 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

A `document.cookie` write whose **cookie NAME** denotes a bearer credential. A
cookie a script can WRITE is a cookie a script can READ — it is not HttpOnly by
construction — so the credential is exposed to every XSS on the origin.

## What it defers

Non-bearer secrets go to `no-sensitive-cookie-js`. Missing `Secure` /
`SameSite` attributes go to `require-cookie-secure-attrs`, which is
COMPLEMENTARY rather than duplicate: it can legitimately co-report on the same
line, because a hardened auth cookie is still a JS-readable auth cookie.

Every vulnerable fixture below carries `Secure; SameSite` so the corpus scores
this rule and not its neighbour.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 held at 100%: `document.cookie +=`, a cookie NAME split across a concatenation, leading whitespace, and fully-renamed identifiers.

Current corpus: 12 vulnerable / 10 safe fixtures.
