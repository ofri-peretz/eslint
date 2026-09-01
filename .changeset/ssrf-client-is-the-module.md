---
'eslint-plugin-node-security': minor
---

**🐛 Fix** — `no-ssrf` identifies an HTTP client by its module, not its variable name

The rule matched the local binding against a set of names — `axios`, `got`,
`http`, `request`, `superagent`, `undici`, `needle`. Those are package names,
which makes them look like a published contract. They are not: the thing being
matched was the name **you** chose for the import.

Wrong in both directions:

- `import axiosClient from 'axios'` matched nothing, so the rule was **silent**
  on an ordinary aliased import.
- A local `const request = { … }` matched, and any call on it was reported as
  an outbound HTTP request.

It now resolves the import — `axios.get()` and `axiosClient.get()` are both
recognised, and a local variable borrowing the name is not. Both directions are
pinned by sealed cases.

**You may see new findings** where a client is imported under an alias, and
**fewer** where a local binding shares a package's name.

What stays hardcoded, and now says why: `fetch` is WHATWG's, the method names
are HTTP's (RFC 9110), and `URL` / `hostname` / `host` are the WHATWG URL
interface — all under a `@vocabulary` citation.
