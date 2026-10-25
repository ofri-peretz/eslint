---
'oxlint-plugin-security': minor
---

feat: oxlint-plugin-security, a drop-in for eslint-plugin-security on oxlint and Vite+ (private until its gate is green)

Answers to eslint-plugin-security@4.2.0's fifteen `security/<rule>` IDs, each
backed by an Interlace rule named in `mapping.json`, with two IDs retired as
deprecated no-ops where the defect cannot occur on a supported runtime. It
stays `private` until `benchmarks/suites/ilb-competitor-parity/drop-in.mjs`,
the ship gate, is green on both engines; a lock refuses a public flip while the
gate is red. See docs/intents/oxlint-plugin-security-drop-in and ADR-0008.
