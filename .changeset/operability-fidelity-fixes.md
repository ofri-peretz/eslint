---
'eslint-plugin-operability': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `no-process-exit`: Node's `process` is recognised by binding, not by name. A local or parameter `process` is not reported; `globalThis.process.exit()`, a default or named import from `process` / `node:process` (renamed too), `require('process').exit()` `const { exit } = process` and a `const` alias of `process.exit` are.
- `no-console-log` and `no-debug-code-in-production`: `console` is the global console by binding; a parameter or local named `console` (an injected logger) is not reported; an import of `node:console` is the console.
- `no-verbose-error-messages`: a response leaks a stack when an error's `.stack` flows into it - under any key, nested, through a `const`, destructured from the error, in a template literal, a `+` join, a `??` / `||` / ternary result, an array, a spread of a `const` object, a computed key or a getter's return value. A key named `stack` whose value is not a stack (`stack: 'hidden'`) is no longer reported, and neither is a destructured `stack` that is reassigned before it is sent.
- `require-code-minification`: a quoted or computed key, a `const` bound to `false`, and a member assignment (`config.build.minify = false`) are reported.
- `require-data-minimization`: a spread no longer counts as a property toward `maxProperties`.
