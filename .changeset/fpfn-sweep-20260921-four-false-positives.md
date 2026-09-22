---
'eslint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-react-features': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-conventions': patch
---

fix: four false positives found by sweeping the plugins over a real corpus

Each was minimized to a standalone snippet, reproduced under `RuleTester`, and
then argued against by an independent reviewer before any code changed. Three
further candidates were rejected at that gate and are not in this release.

**`no-missing-error-context` (reliability + maintainability)** — a message bound
to a `const` one line above the `throw` reported "Thrown error missing message",
which is false about the node:

```ts
const message = 'The importMeta option is required.';
throw new TypeError(message); // REPORTED
```

`isProvablyString` already walks through `??`, `||`, `?:` and `+`; it now also
resolves a single `const` definition. `const m = someVar`, a reassigned `let`,
and `const m = ''` still report.

**`require-render-return` (react-features)** — detection was the method name and
nothing else, so any class with a `render` method — a terminal painter, a canvas,
a template engine — drew a CRITICAL "must return a value" for a method whose
contract is to return nothing. Now gated on the React superclass check the
sibling rules already use.

**`detect-object-injection` (secure-coding)** — `xs.forEach((v, i) => { dst[i] = v })`
drew CVSS 9.8 on a key ECMA-262 guarantees is a Number, while the identical
`for` counter was silent. The exemption is gated on the receiver being provably
an Array: `Map`, `Set`, `Headers`, `FormData` and `URLSearchParams` pass a string
KEY in that slot and still report.

**`no-console-spaces` (conventions)** — the fixer deleted newlines from program
output. `console.log('code=%j\n', code)` was rewritten to drop the `\n`, which
reaches stdout; `util.format` appends the inter-argument space _after_ a trailing
newline rather than absorbing it. The predicate and the fixer are both narrowed
to the literal space that separator actually inserts.
