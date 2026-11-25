---
'eslint-plugin-express-security': patch
---

fix: no-exposed-debug-endpoints skips routes registered only outside production

A debug route inside `if (process.env.NODE_ENV === 'development')`, `!== 'production'`, either half of an `&&`, or a call to a helper (same file or relative import) that returns one of those is never registered in production. Uptime Kuma mounts its webhook echo routes under `if (isDevEnv())`, and both were reported. The `else` branch, `||`, and helpers whose return the rule cannot read still report. So do an `async` or generator helper, whose Promise or iterator is always truthy, and a `process` that is a local object rather than the Node global.
