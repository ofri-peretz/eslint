---
'eslint-plugin-modularity': patch
---

`no-external-api-calls-in-utils` no longer fires on `Map`, `Set`, `Headers`,
`URLSearchParams` or `Cache` lookups.

The rule matched on the method NAME alone, so `store.get(key)` in a utils file
read exactly like `axios.get(url)`. A dogfooding sweep over 123 files produced
45 findings across 17 files, and every sampled one was a cache lookup.

A call is now reported only when its callee resolves to an HTTP client:

- `fetch` / `window.fetch`
- a binding imported or required from a module in the new `httpModules` option
  (axios, got, ky, node-fetch, undici, superagent, `node:http(s)`, …)
- an alias of one — `const api = axios.create()` — resolved on `Program:exit`,
  so the client may be declared after its use
- an explicit `object.method` pair in `networkMethods`, the escape hatch for
  in-house clients the import tracking can't see

Bare module names still seed the client set, so `axios.get(...)` is caught
without a visible import — except `request` and `got`, which collide with
Express's `request` object and ordinary English.

Measured over 49 real `utils`/`lib`/`helpers` files: 47 findings → 13, every
survivor a real `fetch(...)`, every dropped one a collection lookup.
