---
'eslint-plugin-node-security': patch
---

fix: `no-shell-injection` now reports `spawn`/`spawnSync`/`execFile`/`execFileSync` when a truthy `shell` option routes an interpolated command string through `/bin/sh`. The rule matched only `exec`/`execSync`, so the shape its own docs print as incorrect — ``spawn(`tar -xzf ${archivePath}`, { shell: true })`` — went unreported by every rule in the plugin. Without a `shell` option these functions stay silent, since an interpolated program name is CWE-114 and belongs to `detect-child-process`.
