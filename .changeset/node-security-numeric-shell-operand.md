---
'eslint-plugin-node-security': patch
---

fix: no-shell-injection lets a number-typed part into a command

`execSync('taskkill /pid ' + pid + ' /T /F')` with `pid: number` (nestjs/nest-cli tree-kill.ts) has no injectable part: a number interpolates as digits. A part declared `: number`, coerced with `Number()`/`parseInt()`/`parseFloat()`/unary `+`/`-`, or a numeric literal no longer reports. A `number | string` union, an unannotated parameter, or a local function named `Number` still does.
