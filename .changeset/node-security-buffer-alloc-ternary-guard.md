---
'eslint-plugin-node-security': patch
---

fix: no-unsafe-buffer-alloc accepts a ternary cap on a wire size

`n <= MAX ? Buffer.alloc(n) : null` caps the size exactly as `if (n <= MAX) return Buffer.alloc(n)` does, and only the `if` spelling was recognised. The arm a ternary's test caps no longer reports `unboundedAllocation`; the other arm still does.
