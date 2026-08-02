---
'eslint-plugin-express-security': minor
---

Seven new rules closing benchmark-corpus coverage gaps (A-lite research wave):

- `no-host-header-in-links` (CWE-640) — Host-header poisoning in password-reset/email link construction
- `no-error-details-in-response` (CWE-209) — stack traces / raw error objects sent to clients
- `no-sensitive-data-in-query` (CWE-598) — passwords/tokens read from GET query strings
- `no-user-controlled-render-locals` (CWE-73) — `res.render(view, req.body)` template object injection
- `no-static-root-exposure` (CWE-548) — `express.static(__dirname)` / `serve-index` directory exposure
- `require-case-insensitive-path-guard` (CWE-178) — case-sensitive path guards bypassed by `/ADMIN`
- `require-query-type-guard` (CWE-843) — string methods on `req.query` members without type guards

In the recommended preset four ship as `error` (`no-host-header-in-links`,
`no-error-details-in-response`, `no-user-controlled-render-locals`,
`no-static-root-exposure`) and three as `warn` — the two `require-*` guard
heuristics plus `no-sensitive-data-in-query`, which matches on parameter names
and so never gets enforcement severity.
