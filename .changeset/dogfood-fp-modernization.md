---
'eslint-plugin-modernization': patch
---

fix: `prefer-event-target` skips ambient declarations and test files

A `.d.ts` file describes an upstream API that the author cannot change, and a spec file builds doubles of Node streams. Both are skipped, and a `import type` / inline `type` specifier of `EventEmitter` no longer counts. A runtime `new EventEmitter()` or `extends EventEmitter` in source still reports.
