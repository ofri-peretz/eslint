---
'eslint-plugin-node-security': patch
---

fix: `fs['writeFileSync'](p, data)` writes the same file as `fs.writeFileSync`

`no-data-in-temp-storage` read the fs method name off `property.name`, so a
subscripted write into a temp path went unreported.
