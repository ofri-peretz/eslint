---
'eslint-plugin-node-security': patch
---

fix(node-security): `detect-child-process` no longer treats `process.execPath` or `process.pid` as attacker input.

`process` is a taint root because of `process.argv` and `process.env`, but the
shared taint reader followed every `process.<property>` back to that root. So
`spawnSync(process.execPath, ['-e', CONSTANT])` and ``execSync(`kill -0 ${process.pid}`)``
were reported as CWE-78 command injection, while the same call spelled with
`'node'` was silent. Values the runtime fixes (`execPath`, `pid`, `ppid`,
`platform`, `arch`, `version`, `versions`, `release`, `config`, `features`) are
no longer taint. Every other property, including `argv`, `env`, `execArgv` and
`title`, still is.
