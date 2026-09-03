---
'eslint-plugin-node-security': patch
---

docs: detect-non-literal-fs-filename records why its own `safePattern` looks like a false positive

`path.resolve(SAFE_DIR, path.basename(userInput))` — the remediation this rule
prints — reports when it is probed as a fragment with `SAFE_DIR` declared
nowhere. That reads as the rule rejecting its own advice, and the fix it
suggests (weakening the `path.basename` sanitiser) is one the rule's header
already documents as an edit that looks correct and is not.

Measured: the report is `containsFreeVariable` firing on the undeclared name,
not taint surviving the `resolve` wrapper. The discriminator is a snippet with
no taint at all —

```js
fs.readFileSync(path.resolve(SAFE_DIR, 'notes.txt')); // undeclared SAFE_DIR — still reports
```

Declare or import `SAFE_DIR` and the remediation is accepted verbatim.

No behaviour change. The header block gains the entry, and `path-guards.test.ts`
pins both directions — two valid cases for the remediation (declared base and
imported base) and the literal-second-argument CONTROL above — each
mutation-verified to fail when the mechanism it covers is reverted.
