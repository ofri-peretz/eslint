# Rule corpus — `browser-security/no-missing-security-headers` (CWE-693)

Written from CWE-693 semantics — a response that establishes a protection
mechanism partially, or not at all — and from the way header blocks are
actually written: Node's `setHeader`, Express's `set`/`header`, a headers
object handed to `new Response`, a Next.js `headers()` config block. **Not**
from the rule's own test file: a corpus derived from the tests can only
re-derive what the author already thought of.

HTTP header names are case-insensitive (RFC 9110 §5.1) and HTTP/2 requires
them lowercase, so half of these fixtures write them the way the wire does
rather than the way a README does. A rule that only recognises Title-Case
reports its own remediation.

## Rule partition

`Content-Security-Policy` is demanded by TWO rules in this package. The
partition, and the fixtures that pin it, are in
`src/rules/require-csp-headers/index.ts`:

- **this rule** owns any scope that explicitly SETS response headers and omits
  a required one.
- **`require-csp-headers`** owns a document emitted where no response header is
  set at all — the case this rule structurally cannot see, because it has no
  call to trigger on.

So a handler that sets `X-Frame-Options` and sends HTML is this rule's finding
alone, and appears here rather than in that rule's corpus.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
