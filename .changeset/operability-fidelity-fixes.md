---
'eslint-plugin-operability': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `no-process-exit`: Node's `process` is recognised by binding, not by name. A local or parameter `process` is not reported; `globalThis.process.exit()`, a default or named import from `process` / `node:process` (renamed too), `require('process').exit()` and `const { exit } = process` are.
- `no-console-log` and `no-debug-code-in-production`: `console` is the global console by binding; a parameter or local named `console` (an injected logger) is not reported.
- `no-verbose-error-messages`: a response leaks a stack when an error's `.stack` flows into it - under any key, nested, through a `const`, destructured from the error, in a template literal or a `+` join. A key named `stack` whose value is not a stack (`stack: 'hidden'`) is no longer reported.
- `require-code-minification`: a quoted or computed key, a `const` bound to `false`, and a member assignment (`config.build.minify = false`) are reported.
- `require-data-minimization`: a spread no longer counts as a property toward `maxProperties`.
