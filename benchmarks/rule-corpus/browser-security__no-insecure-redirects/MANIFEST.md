# Rule corpus — `browser-security/no-insecure-redirects` (CWE-601)

Written from CWE-601 semantics and real front-end idiom — an OAuth callback, a
hash router, a framebuster, an Express handler — **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What "vulnerable" means here

The attacker chooses the **origin** the browser lands on. Appending to a fixed
origin (`'https://app.acme.io/go?next=' + location.search`) is not that, and
echoing `location.origin` back cannot send anyone anywhere new — both are in
`safe/` because a rule that reports them has no idea what an open redirect is.

## Partition

This rule owns every navigation of the CURRENT document: a write to a
`Location` or its `.href` in any spelling of the holder, `location.assign` /
`location.replace`, and `.redirect(…)`. `window.open` and framework routers
belong to `require-url-validation`; `Linking.openURL` to
`no-unvalidated-deeplinks`. See `url-navigation-partition.matrix.test.ts`.
