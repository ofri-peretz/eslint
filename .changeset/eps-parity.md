---
'eslint-plugin-node-security': patch
'eslint-plugin-jwt-security': patch
---

Two detections eslint-plugin-security has and we did not, plus three
false-positive fixes found on the same repository.

`crypto.pseudoRandomBytes()` is now reported by `no-math-random-crypto`
(CWE-338). Unconditional, unlike the `Math.random()` path in the same rule:
Math.random has legitimate non-security uses — jitter, sampling, a DOM id — so
that path gates on surrounding names, whereas `pseudoRandomBytes` has exactly
one meaning and was deprecated in Node 4 for being mistaken for the secure one.

The deprecated `noAssert` argument is now reported by `no-buffer-overread`
(CWE-125). Distinct from that rule's existing CWE-126 work: the offset may be
perfectly ordinary and the caller has switched off the check that would catch it
being wrong. Covers `readX(offset, true)`, `readUIntBE(offset, len, true)` and
the `writeX` forms.

`no-decode-without-verify`, `require-expiration` and `no-shell-injection` now
skip test files. On alphagov/govuk-mobile-backend they reported a fixture named
`fakeJwt` signed with `'fake-signing-key'`, and a test invoking its own build
script through `execSync`.
