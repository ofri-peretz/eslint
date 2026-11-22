---
'eslint-plugin-reliability': patch
---

fix: stop reporting re-thrown errors, destructured await loops and test-file fetches

`no-missing-error-context` accepts `throw res.error` / `throw this.reason`. `no-await-in-loop` follows a destructured awaited result into the loop exit (`const { done } = await reader.read(); if (done) break`). `require-network-timeout` skips `*.test.*` / `*.spec.*` files.
