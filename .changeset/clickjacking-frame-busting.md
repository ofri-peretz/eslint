---
'eslint-plugin-browser-security': patch
---

`no-clickjacking` no longer reports frame-busting as frame manipulation.

The rule flagged its own recommended remediation. `requireFrameBusting` asks you
to write a frame-buster; writing one then reported `frameManipulation`:

```js
if (top != self) {
  top.location = self.location;   // ← reported as clickjacking
}
```

The assignment is detected as manipulation with no check for the guard that
encloses it. It now walks the AST for an enclosing `if` whose test compares two
frame references (`top`, `self`, `parent`, `window.top`, `window.self`) and
treats the assignment inside as the remediation it is.

The old frame-busting detector matched printed source against fixed strings like
`'top != self'`, so `top !=  self` and `top!==self` — the same program — did not
match, and a comment containing the phrase did. That check is now structural;
see the ratchet in `scripts/audit-gettext-classification.ts`.

Naked redirects still report: `top.location = 'https://evil.test'`, and the same
assignment gated on an unrelated flag or a call result rather than a frame
comparison.
