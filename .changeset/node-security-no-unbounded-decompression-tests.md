---
'eslint-plugin-node-security': patch
'oxlint-plugin-node-security': patch
---

fix(no-unbounded-decompression): skip test and spec files by default

`no-unbounded-decompression` now skips test and spec files by default, matching `no-math-random-crypto`, `no-toctou-vulnerability` and `require-stream-error-handler`: its `allowInTests` option defaults to `true`, and `allowInTests: false` restores linting them.
