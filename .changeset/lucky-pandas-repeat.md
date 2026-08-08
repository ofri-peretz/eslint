---
---

Tooling-only change: add a `hookTimeout` floor alongside the existing
`testTimeout` in every vitest config, and stop the pre-push hook from running
two concurrent `turbo run` processes over the same `dist` outputs. No package
source changes, so no release is needed.
