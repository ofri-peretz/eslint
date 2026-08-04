---
---

Test-only change: the `@interlace/eslint-devkit` deep-import-chain SCC test now
seeds its 6,000-node fixture through `cache.dependencies` instead of writing
6,000 files to a temp dir. No runtime behavior changes, so no release is needed.
