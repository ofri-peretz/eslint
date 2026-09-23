---
'eslint-plugin-browser-security': patch
---

test: `no-clickjacking` pins three more shapes where the header NAME is not frame protection

The fix itself shipped earlier (a declared protection counts only when its VALUE protects). This adds regression cases for a `<meta httpEquiv="X-Frame-Options" content="ALLOWALL">`, the obsolete `ALLOW-FROM`, and prose that merely mentions `x-frame-options`, each of which must still report. No behaviour change.
