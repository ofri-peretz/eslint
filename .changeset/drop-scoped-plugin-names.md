---
'@interlace/eslint-devkit': patch
---

README: call the plugin family "the Interlace eslint-plugins" instead of
`@interlace/eslint-plugin-*`.

The plugins publish unscoped — `eslint-plugin-jwt`, not
`@interlace/eslint-plugin-jwt` — so the scoped form named packages that do not
exist on npm. This is a docs-only change; no runtime behaviour is affected. It
ships as a patch so the corrected text reaches the package page on npm.
