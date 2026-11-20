---
'eslint-plugin-secure-coding': minor
---

feat(secure-coding): `no-improper-sanitization` reports Angular's `DomSanitizer.bypassSecurityTrust*` on non-constant input

`bypassSecurityTrustHtml`, `Script`, `Style`, `Url` and `ResourceUrl` turn Angular's sanitizer off for one value (CWE-79, message `angularSanitizerBypass`). They are reported unless the argument is a literal, a template literal with no substitutions, a concatenation of literals, a `const` bound to one of those, or the output of a sanitizer (`DOMPurify.sanitize`, `sanitizer.sanitize(...)`, `escapeHtml`). Expect new findings in Angular front ends.
