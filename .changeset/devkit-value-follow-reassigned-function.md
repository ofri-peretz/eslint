---
'@interlace/eslint-devkit': patch
---

fix: value-follow stops at a function or class name that is reassigned

`follow` resolved `isDev` to its `function isDev()` declaration even after `isDev = () => true`, so a rule judged the declaration rather than the value the name holds. It now stops at the name, as it already did for a variable written more than once. In express-security, `no-exposed-debug-endpoints` reports a debug route guarded by a reassigned helper.
