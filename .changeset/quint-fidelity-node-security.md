---
'eslint-plugin-node-security': patch
---

fix(node-security): sinks are found by resolving the import, not by name

Checked against a Quint model of each rule's documented contract (`npm run fidelity`) and by Stryker mutation testing. Rules now resolve `crypto`, `fs`, `child_process` and friends through their import. So a renamed or destructured import (`import { createCipheriv as x }`, `const { exec: run } = require('node:child_process')`) is reported, and a local object that merely shares the name (`const fs = {...}`) is not. Lines that a rule's doc lists as "Not a finding" are no longer reported. `lock-file` reports a missing lock file on every lint run in a long-lived process, not once per process.
