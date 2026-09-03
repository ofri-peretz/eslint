# Rule corpus — `browser-security/no-unsafe-eval-csp` (CWE-95)

Written from CWE-95 semantics and real Content-Security-Policy idiom — Express
`setHeader`, a Next.js `headers()` block, a Helmet directives object, a
`<meta http-equiv>` in JSX — and **not** from the rule's own test file. The
point is independent evidence: a corpus derived from the tests can only
re-derive what the author already thought of.

`'unsafe-eval'` is a *value* inside a policy, never an identifier. So the
question every fixture asks is: does the rule read the policy the app will
actually ship, wherever that policy is assembled — or only the one shape
somebody happened to write a test for?

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
