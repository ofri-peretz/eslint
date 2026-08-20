# Rule corpus — `browser-security/require-https-only` (CWE-319)

Written from CWE-319 semantics and real front-end request idiom — a fetch
wrapper, a React data hook, an axios client — **not** from the rule's own test
file. A corpus derived from the tests can only re-derive what the author already
thought of.

This rule owns the **request call site**: the URL argument of `fetch(…)` and
`axios.<verb>(…)`. A call site is proof that a request is MADE, which is
strictly stronger evidence than "a string that looks like a URL exists". The
corpus is built around that distinction, so `safe/` contains cleartext URLs that
are genuinely reportable BY A SIBLING (`no-http-urls`, `detect-mixed-content`).
They are not "safe code" — they are "not this rule's finding", which is the only
honest way to measure a partitioned family.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
