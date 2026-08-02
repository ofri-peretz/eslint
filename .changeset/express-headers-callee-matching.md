---
'eslint-plugin-express-security': patch
---

**`express-security/no-missing-security-headers` — `.set()` on a non-response receiver is not a header call.** The rule matched `setHeader` / `header` / `set` on the method name alone, so `url.searchParams.set('page', '2')` and `app.set('view engine', 'ejs')` were reported as CVSS 7.5 missing-security-header findings — a false positive on two of the most common calls in an Express codebase. The receiver must now be an HTTP response (`res` / `resp` / `response` / `reply`, including `ctx.res.set(…)` and `this.response.header(…)`). The same predicate gates header *collection*, so a `Content-Security-Policy` string passed to an unrelated `.set()` no longer satisfies the requirement for a real response in the same scope.
