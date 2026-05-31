---
"eslint-plugin-express-security": minor
---

feat: add `no-user-controlled-redirect` rule — structural CWE-601 open redirect detection

Fires on `res.redirect(req.query.*)`, `res.redirect(req.body.*)`, and `res.redirect(req.params.*)` — an AST-structural check that passes the naming-heuristic litmus test (rename `res`/`req` to any identifier and the rule still fires, because detection is on the member-access chain, not on variable names). Severity: `error` in flagship config.
