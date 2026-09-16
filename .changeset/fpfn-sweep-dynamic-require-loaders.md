---
'eslint-plugin-node-security': patch
---

fix: `no-dynamic-require` resolves the loader instead of matching the name `require`

A binding from `module.createRequire()`, plus `module.require`,
`require.main.require` and the `(0, require)` idiom, all load a specifier and
were all invisible. The rule also documents its largest false-negative class:
`no-weak-hash-algorithm`'s ❌ examples now fire under the default options, and
unclassified hashes are described as the deliberate trade they are.
