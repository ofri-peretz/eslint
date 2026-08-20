# Rule corpus — `browser-security/no-missing-csrf-protection` (CWE-352)

Written from CWE-352 semantics — a state-changing route a third-party page can
make the victim's browser call, with the victim's cookies attached — and from
real Express idiom: `app.post`, a mounted `Router`, `router.route(…).post(…)`,
middleware chains. **Not** from the rule's own test file.

The distinction the corpus is built around: a route REGISTRATION can carry
CSRF middleware; an HTTP CLIENT call cannot. `axios.post('/api/orders', cart)`
matches the same method name and is not a route at all.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
