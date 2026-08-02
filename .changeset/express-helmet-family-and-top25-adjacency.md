---
'eslint-plugin-express-security': minor
'eslint-plugin-node-security': minor
---

Eight new rules closing the two fixable gaps found by the F#24/F#26 coverage
benchmark (CWE Top 25 map + framework-depth matrix).

**Express — the helmet header family** (the depth gap where SonarJS led 17 rules
to our 14; `require-helmet` only proved the middleware was mounted, never that
its protections were still on):

- `no-disabled-helmet-protections` (CWE-693) — `helmet({ contentSecurityPolicy: false })` and the rest of the disabled-default family, helmet 6 and 7 spellings
- `require-strict-transport-security` (CWE-319) — HSTS disabled, `max-age` below the 180-day preload floor, or `includeSubDomains: false`
- `no-unsafe-csp-directives` (CWE-79 / 1021 / 311) — `'unsafe-inline'`, `'unsafe-eval'`, wildcard sources, `frame-ancestors '*'`, missing `frame-ancestors` under `useDefaults: false`, and `upgradeInsecureRequests: null`
- `no-permissive-trust-proxy` (CWE-348) — `app.set('trust proxy', true)`, which makes `req.ip` client-controlled and every rate-limit bucket forgeable

**Express — CWE Top 25 (2025) access-control adjacency** (three of the four
JS-applicable entries we did not cover):

- `require-route-authentication` (CWE-306) — critical-function routes with no auth middleware and no principal read in the handler
- `no-client-controlled-authorization` (CWE-863) — `if (req.body.role === 'admin')`: the check runs, and passes for anyone who sets the field
- `no-idor-resource-access` (CWE-639) — `Invoice.findById(req.params.id)` in a handler that never mentions the caller

**Node — the fourth adjacency** (CWE-77, generic command injection, previously
covered only as CWE-78):

- `no-dynamic-command-string` (CWE-77) — an assembled command string handed to a shell flag (`spawn('bash', ['-c', …])`) or to a command-runner that does not escape (`execaCommand`, `$.raw`)

In `recommended`, the five structural rules ship as `error`; the three
access-control rules ship as `warn` — their critical-path / authorization-attribute
/ lookup-method vocabularies are name-based, and naming heuristics never carry
enforcement severity (plugin scope-audit invariant I3).
