---
'eslint-plugin-reliability': patch
---

`no-unhandled-promise`: a promise passed as the sole argument to the first parameter of an enclosing `new Promise((resolve) => …)` executor is not reported. `resolve(p)` adopts `p`, so its rejection settles the outer promise, whose handling is that site's report. `reject(p)`, any other call, a second-parameter or shadowed `resolve`, `resolve` outside an executor and a non-`Promise` constructor still report.
