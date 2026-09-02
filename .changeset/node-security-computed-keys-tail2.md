---
'eslint-plugin-node-security': patch
---

fix: `zlib['gunzip'](body, cb)` is the same uncapped decompression

`no-unbounded-decompression` resolved the zlib method off `property.name`, so
the subscripted spelling buffered the same unbounded output unreported.
