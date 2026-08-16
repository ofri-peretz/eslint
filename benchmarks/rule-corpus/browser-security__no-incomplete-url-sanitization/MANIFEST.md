# Rule corpus — `browser-security/no-incomplete-url-sanitization` (CWE-20 / CWE-601)

Two defects, written from the semantics rather than from the rule's tests:

1. a **substring test standing in for a host check** — `url.includes('trusted.com')`
   is true for `https://evil.io/?r=trusted.com` and for `https://trusted.com.evil.io/`;
2. a **scheme denylist that stops at `javascript:`** — and hands `data:text/html`
   to the sink.

This corpus exists because the rule consumes `utils/url-taint.ts` for one of its
two taint branches, and that file was widened to see URL containers
(`new URLSearchParams(location.search).get(…)`). Widening taint manufactures
false positives, so the effect had to be measurable rather than argued: the
`safe/` half is written specifically around containers whose CONTENT is the
module's own, which is the only thing separating them from the vulnerable half.

Each fixture is one file, one shape, with the rationale in a header comment.
