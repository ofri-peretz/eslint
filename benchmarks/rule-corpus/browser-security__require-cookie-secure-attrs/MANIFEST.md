# Rule corpus — `browser-security/require-cookie-secure-attrs` (CWE-614)

Written from CWE-614 semantics and real front-end idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What this rule owns

The ATTRIBUTES of a `document.cookie` write. Without `Secure` the cookie is
sent over plaintext HTTP (CWE-614); without `SameSite` it rides along on
cross-site requests (CWE-352). Independent of what the cookie HOLDS — it fires on
`theme=dark` exactly as it fires on `sid=…`.

This rule is COMPLEMENTARY to `no-cookie-auth-tokens` and
`no-sensitive-cookie-js`: those report what is in the cookie, this reports how
it travels, and a line can legitimately earn both.

## What it abstains on

A cookie whose NAME is not statically known, and a cookie DELETION
(`name=; Max-Age=0`) — demanding `Secure` on a value that no longer exists is
noise.

## Wave 2 — the adversarial pass

Once the rule reached 100% on the first wave, a SECOND wave was written to break
it: identifiers renamed to innocuous words, evidence arriving through a binding,
the sink reached by a computed key, and the real library idiom the rule was not
written against.

Wave 2 held at 100%: the append idiom, a bare `SameSite` with no value (which browsers ignore), the word `Secure` appearing inside the cookie VALUE, and lowercase attribute spellings.

Current corpus: 12 vulnerable / 11 safe fixtures.
