---
'eslint-plugin-browser-security': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-node-security': patch
---

fix: cache, IndexedDB, XHR and fs receivers resolve a subscripted member

`caches['open']('v1')` hands back the same Cache, `tx['objectStore']('vault')`
the same IDBObjectStore, and `fs['writeFileSync'](p, data)` writes the same
file. These are RECEIVER resolvers rather than method-name gates:
`no-sensitive-data-in-cache` and `no-sensitive-indexeddb` already resolved the
method correctly and lost the finding on the handle instead.

Also `xhr['open'](m, url)`, `el['addEventListener'](…)` in the untrusted-text
walk, and the AngularJS `$compile` surface in `no-directive-injection`.
