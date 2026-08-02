---
'@interlace/eslint-devkit': patch
---

Add the Interlace OG banner to the README, so the npm page matches every
published plugin in the ecosystem. devkit was the only published package
carrying the closing Interlace mark but no banner. README-only change — no
runtime, API, or type surface is affected; the release exists to get the
updated README onto npm, where it is baked in at publish time.
