---
'eslint-plugin-operability': minor
---

**✨ Feature** — `require-code-minification` gains `minificationKeys`

The rule carried a hardcoded list of the config keys a bundler uses to signal
minification. A project whose build is configured under different keys got
nothing from the rule and had no way to ask for it.

`minificationKeys` REPLACES the default, so a consumer who states their own
keys is not still measured against ours. Default unchanged.
