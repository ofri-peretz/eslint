# Rule corpus — `browser-security/no-clickjacking` (CWE-1021)

Written from CWE-1021 semantics — a page an attacker can put inside their own
frame, or an overlay that swallows a click meant for something underneath —
and from real front-end idiom: a Next.js `_document` / `layout`, an embedded
third-party iframe, a styled overlay, a frame-busting guard. **Not** from the
rule's own test file.

The rule has four distinct verdicts and they are not interchangeable:

| messageId | the defect |
|---|---|
| `missingFrameBusting` | this file builds the DOCUMENT and nothing stops it being framed |
| `unsafeIframeUsage` | this page frames an untrusted origin |
| `transparentFrameOverlay` | an invisible element is parked over clickable content |
| `frameManipulation` | the page writes to a parent frame's location |

`safe/` therefore includes both remediations that clear a verdict — a
`frame-ancestors` policy, an `X-Frame-Options` header, a frame-busting guard —
and the shapes that merely resemble one.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
