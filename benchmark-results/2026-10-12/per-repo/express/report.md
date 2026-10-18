# ILB-Wild — express

> Pinned: `a3714473feb3d2908add734d340e7755fd85e0a3` · 69K ⭐ · Backend Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 50 |
| Lines of code | 4,910 |
| Total findings | 24 (20 errors, 4 warnings) |
| Findings density | **4.89 / kLoC** |
| Files with findings | 11 (22.0%) |
| Wall-clock (median, 3 runs) | **1464 ms** (±66, CV 4.6%) |
| Per-file lint cost | 29.28 ms/file |
| Peak RSS | 326 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| express-security | 5 / 28 | 17.9% |
| node-security | 0 / 43 | 0% |
| secure-coding | 1 / 34 | 2.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-improper-sanitization` | 14 | 2.62 ms |
| `express-security/require-helmet` | 5 | 10.31 ms |
| `express-security/require-route-authentication` | 2 | 4.11 ms |
| `express-security/no-sensitive-data-in-query` | 1 | 0.71 ms |
| `express-security/require-csrf-protection` | 1 | 4.52 ms |
| `express-security/require-rate-limiting` | 1 | 1.02 ms |
| `secure-coding/no-privilege-escalation` | 0 | 9.65 ms |
| `secure-coding/no-ldap-injection` | 0 | 6.51 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 5.34 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 4.22 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `express-security/require-helmet` | 10.31 ms | 5 |
| `secure-coding/no-privilege-escalation` | 9.65 ms | 0 |
| `secure-coding/no-ldap-injection` | 6.51 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 5.34 ms | 0 |
| `express-security/require-csrf-protection` | 4.52 ms | 1 |
| `secure-coding/no-sensitive-data-exposure` | 4.22 ms | 0 |
| `express-security/require-route-authentication` | 4.11 ms | 2 |
| `node-security/no-weak-hash-algorithm` | 4.06 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 3.6 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 3.49 ms | 0 |

## Sample findings (first 15)

- `express-security/no-sensitive-data-in-query` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/web-service/index.js:31 — 🔒 CWE-598 \| Query parameter 'api-key' is sensitive. Query strings are stored in access logs, proxy logs, browser history and leak via the Referer header. \| MEDIUM Fix: Move the value to the POST request body (req.body) or an Authorizati
- `express-security/require-route-authentication` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/web-service/index.js:75 — 🔒 CWE-306 OWASP:A07-Authentication CVSS:8.2 \| get /api/users exposes a critical function but its chain has no authentication middleware and the handler never reads an authenticated principal. Anyone who can reach the port can call it. \| HI
- `express-security/require-route-authentication` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/web-service/index.js:85 — 🔒 CWE-306 OWASP:A07-Authentication CVSS:8.2 \| get /api/user/:name/repos exposes a critical function but its chain has no authentication middleware and the handler never reads an authenticated principal. Anyone who can reach the port can ca
- `express-security/require-helmet` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/view-locals/index.js:10 — 🔒 CWE-693 OWASP:A05-Injection CVSS:7.5 \| This Express app renders documents to a browser but never mounts helmet. Without it the responses carry no Content-Security-Policy, X-Frame-Options or referrer policy, so any rendered page is framab
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/session/redis.js:35 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/session/redis.js:35 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/session/index.js:30 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/session/index.js:30 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `express-security/require-helmet` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/search/index.js:19 — 🔒 CWE-693 OWASP:A05-Injection CVSS:7.5 \| This Express app renders documents to a browser but never mounts helmet. Without it the responses carry no Content-Security-Policy, X-Frame-Options or referrer policy, so any rendered page is framab
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/online/index.js:53 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/online/index.js:53 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `express-security/require-helmet` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/mvc/index.js:13 — 🔒 CWE-693 OWASP:A05-Injection CVSS:7.5 \| This Express app renders documents to a browser but never mounts helmet. Without it the responses carry no Content-Security-Policy, X-Frame-Options or referrer policy, so any rendered page is framab
- `express-security/require-helmet` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/error-pages/index.js:9 — 🔒 CWE-693 OWASP:A05-Injection CVSS:7.5 \| This Express app renders documents to a browser but never mounts helmet. Without it the responses carry no Content-Security-Policy, X-Frame-Options or referrer policy, so any rendered page is framab
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/content-negotiation/users.js:6 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/express/examples/content-negotiation/users.js:7 — 🔒 CWE-116 \| A string reaching this sink carries unescaped markup \| MEDIUM Fix: Escape the value before it reaches the sink, or send it as text rather than markup \| https://cwe.mitre.org/data/definitions/116.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `{index.js,lib/**/*.js,examples/**/*.js}`
