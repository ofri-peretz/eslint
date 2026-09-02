---
'eslint-plugin-node-security': patch
---

fix: `child_process['exec'](cmd)` spawns the same shell

`no-shell-injection` took the function name off `property.name`, so a
subscripted `exec`/`execSync` on a required `child_process` never matched the
shell-sink list.
