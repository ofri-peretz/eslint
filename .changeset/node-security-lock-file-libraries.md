---
'eslint-plugin-node-security': patch
---

`lock-file`: no longer reports a package published as a library (a `package.json` that is not `"private": true` and declares `main`, `exports` or `files`). npm never installs from a dependency's lock file, so libraries such as `express`, `body-parser` and `cors` ship without one on purpose. Apps, private packages and unparseable manifests still report.

`require-secure-deletion`: no longer reports a `delete` (or `Reflect.deleteProperty`) on a local binding that holds a fresh shallow copy made with `{ ...source }` or `Object.assign({}, source)` and is never reassigned, the way code strips keys before passing options on. Deletes on the original object, a parameter, an alias or a reassigned binding still report.
