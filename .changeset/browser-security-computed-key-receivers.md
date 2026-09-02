---
'eslint-plugin-browser-security': patch
---

fix: cache, IndexedDB and XHR receivers resolve a subscripted member

`caches['open']('v1')` hands back the same Cache and `tx['objectStore']('vault')`
the same IDBObjectStore. These are RECEIVER resolvers rather than method-name
gates: `no-sensitive-data-in-cache` and `no-sensitive-indexeddb` already read
`c['put'](…)` correctly and lost the finding on the handle instead.

Also `xhr['open'](m, url)` and the `addEventListener` arm of the
untrusted-text walk behind `no-unescaped-url-parameter`.
