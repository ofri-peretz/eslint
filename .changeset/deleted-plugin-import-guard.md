---
---

Test/tooling only — extends the `no-deprecated-plugin-references` guard to catch
broken `import`/`require` of a deleted plugin in code/config files (not just
docs), and removes a stale `eslint-plugin-crypto` import the new layer found in
`benchmarks/suites/ilb-arena/configs/interlace.config.js`. No published API
change → no release.
