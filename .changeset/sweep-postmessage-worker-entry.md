---
'eslint-plugin-browser-security': patch
---

Fix `require-postmessage-origin-check` false positive on a worker entry file named exactly `worker.<ext>`, with no `<name>.worker.<ext>` prefix.
