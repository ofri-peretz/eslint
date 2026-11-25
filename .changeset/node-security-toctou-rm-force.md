---
'eslint-plugin-node-security': patch
---

`no-toctou-vulnerability`: `if (existsSync(p)) rmSync(p, { force: true })` is no longer reported. With a static `force: true` option, `rm`/`rmSync` (including `fs.promises.rm`) swallows ENOENT, so the check is redundant rather than racy. `rm` with `force: false`, without `force`, with spread options, and every other mutation (`unlinkSync`, `writeFileSync`, ...) still report.
