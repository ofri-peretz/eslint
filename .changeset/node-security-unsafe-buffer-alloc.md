---
'eslint-plugin-node-security': minor
---

New rule `no-unsafe-buffer-alloc` (CWE-908, Use of Uninitialized Resource) —
closes a measured coverage gap against `security-node/detect-buffer-unsafe-allocation`
and `@microsoft/eslint-plugin-sdl/no-unsafe-alloc`.

It reports `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, both of which
return memory that was never zeroed, with a suggestion to swap in
`Buffer.alloc()`. Neither the existing `no-deprecated-buffer` (deprecated
`Buffer()` constructor, CWE-676) nor `no-buffer-overread` (read-side CWE-126)
flagged the allocation itself.

**The rule is unconditional and does no dataflow** — it does not try to prove
the buffer is fully overwritten before it is read, so a correct
`allocUnsafe` + `copy` pair is still reported. The one structural exemption is
`Buffer.allocUnsafe(n).fill(0)`, a parent-node check rather than variable
tracking. Because of that false-positive profile it ships as `warn` in
`recommended` rather than `error` (upstream `security-node` ships its
equivalent off by default).
