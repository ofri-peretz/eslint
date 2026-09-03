# Rule corpus — `browser-security/require-csp-headers` (CWE-1021)

Written from the semantics of the defect — a document reaches a browser with
no Content-Security-Policy governing it — and from the ways a document is
actually emitted: `res.send`, `res.render`, `res.end`, a chunked `res.write`,
an SSR string. **Not** from the rule's own test file.

## Rule partition

`Content-Security-Policy` is demanded by TWO rules in this package, and on one
realistic Express handler they both fired for the same reason. The partition:

- **`no-missing-security-headers`** owns any scope that explicitly SETS
  response headers and omits a required one. CSP is one of the three it
  demands, so it already answers the question there.
- **this rule** owns a document emitted where NO response header is set at all
  — the case the other rule structurally cannot see, because it has no call to
  trigger on.

`safe/09` pins the deferral: a handler that sets `X-Frame-Options` and sends
HTML is the other rule's finding alone, and must be silent here.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
