---
'eslint-plugin-browser-security': patch
---

fix(browser-security): require-postmessage-origin-check false positive on worker.js

A worker entry file named exactly `worker.<ext>`, with no
`<name>.worker.<ext>` prefix, was not recognized as a worker.
