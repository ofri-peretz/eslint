# Rule corpus — `browser-security/require-url-validation` (CWE-601)

Written from CWE-601 semantics and real front-end idiom — a Next.js page with
`useRouter`, a React Router search-param read, a vanilla `window.open` popup —
**not** from the rule's own test file.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## Partition

This rule owns the navigations that do NOT write the current document's
`Location`: `window.open(x)`, and `router.push/replace(x)` where the router
RESOLVES to a routing package's `useRouter()`. Location writes and
`location.assign/replace` belong to `no-insecure-redirects`; `Linking.openURL`
to `no-unvalidated-deeplinks`. See `url-navigation-partition.matrix.test.ts`.

`push` and `replace` are `Array` and `String` methods, so a `router` that
cannot be resolved to a routing import is a deliberate false negative —
`safe/09` pins that, because the alternative is reporting every job queue in
every codebase.
