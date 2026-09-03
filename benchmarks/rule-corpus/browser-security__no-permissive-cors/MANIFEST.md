# Rule corpus — `browser-security/no-permissive-cors` (CWE-942)

Written from CWE-942 semantics — a response that tells the browser any origin
may read it — and from the ways CORS is actually configured: the `cors`
package, a hand-written `setHeader`, a Next.js config block, an edge
`Response`. **Not** from the rule's own test file.

The distinction the corpus is built around: `'*'` and a REFLECTED origin are
not equivalent, and the reflected one is worse. A browser refuses to send
credentials to a literal `*`; it sends them happily to an origin the server
echoed back. `origin: true` in the `cors` package means reflect.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
