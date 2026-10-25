---
'eslint-plugin-node-security': minor
---

`detect-non-literal-fs-filename`: new opt-in option `reportWholeProcessValues` (default `false`). Set to `true`, the rule reports a `process.argv` / `process.env` value used as the whole path, e.g. `fs.readFileSync(process.argv[2])`. That matches `eslint-plugin-security`'s rule of the same name, so a drop-in for it loses no finding. The default is unchanged: whoever sets argv or the environment already chooses which files the process opens.
