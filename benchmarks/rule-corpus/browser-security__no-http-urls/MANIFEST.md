# Rule corpus — `browser-security/no-http-urls` (CWE-319)

Written from CWE-319 semantics and real front-end configuration idiom — an env
module, a Next.js rewrite table, a feature-flag map, an anchor in a footer —
**not** from the rule's own test file. A corpus derived from the tests can only
re-derive what the author already thought of.

This rule is the family's **residual owner**: it takes every hardcoded `http://`
URL that no more-specific sibling has claimed. Two shapes ARE claimed —
`fetch`/`axios` URL arguments (`require-https-only`) and subresource positions
(`detect-mixed-content`) — so those appear in `safe/`. They are not "safe code";
they are "not this rule's finding", which is the only honest way to measure a
partitioned family.

The distinction that carries the most weight here is `<a href>` versus
`<link rel="stylesheet" href>`. Same attribute name, opposite answer: an anchor
is a navigation nothing blocks and stays HERE, a stylesheet is a subresource the
browser refuses and belongs next door.

Each fixture is one file, one shape, with the rationale in a header comment.
