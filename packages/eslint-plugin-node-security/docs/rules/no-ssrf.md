---
title: no-ssrf
description: Detect HTTP requests with user-controlled URLs (server-side request forgery).
tags: ['security', 'node-security', 'ssrf', 'owasp']
category: security
cwe: CWE-918
owasp: A10:2021
autofix: suggestions
---

> **Keywords:** no-ssrf, SSRF, server-side request forgery, CWE-918, OWASP A10:2021, fetch, axios, http.request, internal services, ESLint rule
> **CWE:** [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
> **OWASP:** [A10:2021 — Server-Side Request Forgery](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)

<!-- @rule-summary -->

Detect outbound HTTP requests whose URL is derived from user-controlled input. An attacker can pivot the request at internal services (metadata endpoints, admin panels, databases) to bypass perimeter controls.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security).

## Quick Summary

| Aspect       | Details                                                             |
| ------------ | ------------------------------------------------------------------- |
| **Severity** | Critical (Security — perimeter bypass)                              |
| **Auto-Fix** | 💡 Suggestions (URL allowlist scaffold)                             |
| **Category** | Node Security                                                       |
| **CWE**      | [CWE-918](https://cwe.mitre.org/data/definitions/918.html)          |
| **OWASP**    | A10:2021                                                            |
| **Best For** | Any service that makes outbound HTTP and accepts user-provided URLs |

## Why SSRF matters

A server inside a cloud VPC can typically reach:

- The cloud metadata service (`169.254.169.254`) — AWS IMDS, GCP, Azure — where credentials live.
- Other internal services (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- The loopback (`127.0.0.1`) and Unix sockets.

If your server accepts a URL from a user request and fetches it, the user can borrow your server's identity to reach those targets. The 2019 Capital One breach was a textbook SSRF chain that exfiltrated 100M records via IMDS.

## Examples

### ❌ Incorrect

```js
app.get('/preview', async (req, res) => {
  const r = await fetch(req.query.url); // attacker controls target
  res.send(await r.text());
});

app.post('/import', async (req, res) => {
  const r = await axios.get(req.body.feedUrl); // same exposure via axios
  res.json(r.data);
});

const r = await fetch(`${API_BASE}${userPath}`); // path traversal lets attacker swap host
```

### ✅ Correct

```js
import { URL } from 'node:url';

const ALLOWED_HOSTS = new Set(['api.partner.example', 'cdn.partner.example']);
const BLOCKED_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
];

function safeFetch(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new Error('https only');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('host not allowed');
  // Resolve DNS before request; reject if the resolved IP sits in BLOCKED_CIDRS.
  return fetch(url, { redirect: 'error' }); // refuse redirects to avoid TOCTOU
}
```

### ✅ Also correct — no evidence of user flow

The rule reports on evidence, not on the mere presence of a dynamic argument.
A Node options object whose fields are plain locals is internal plumbing, not
a user-controlled URL:

```js
function fetchProfile(host, path, cb) {
  // host/path are this helper's own parameters — not flagged
  return https.request({ host, path, method: 'GET' }, cb);
}

const r = await fetch(`https://api.internal/items/${id}`); // id is a local
```

Two shapes count as evidence, wherever they sit in the argument — the URL
itself, or any field of a Node options object:

1. Any part of the expression reads off a request object (`req`, `request`,
   `ctx`, `event`) — `https.request({ host: req.query.host })` — directly or
   through a local bound to it (`const { feedUrl } = req.body`).
2. A template literal or concatenation interpolating the above —
   `` https.request({ host: `${API_BASE}${req.params.path}` }) ``.

With `reportUnresolvedUrls: true`, a user-input-named identifier with no
traceable source counts too — `fetch(userUrl)`, `https.request({ host: userUrl })`.

The client is recognised by what its receiver resolves to, not by its local
name: `import got from 'got'`, `const client = require('axios')` and an inline
`require('https').get(url)` are all HTTP calls.

### What counts as a guard

A call is not reported when, within the **10 statements** before it in the same
block (or in the condition of an enclosing `if` or ternary), the code parses the
URL (`new URL(x)`), calls a validator (`validateUrl`, `isValidUrl`, `isSafeUrl`,
`isAllowed`, `checkUrl`, `sanitizeUrl`, …), checks an allowlist
(`.includes`, `.has`, `.startsWith`, `.test`, `.some`), compares
`hostname`/`host` with `===`/`==`, or throws. A `hostname !== 'localhost'`
comparison is a denylist, not a guard. The guard is not tied to the variable
it checks — this is a review prompt, not a proof.

## Error Message Format

```text
🔒 NODE-SECURITY CWE-918 OWASP:A10 | SSRF: user-controlled URL passed to outbound request | CRITICAL
   Fix: Validate the URL against an allowlist of trusted hosts, refuse redirects, and resolve DNS to block internal IPs (RFC 1918, link-local, loopback).
```

## Known False Negatives

- Any of the guards above silences the call even when it checks a different value, and a guard more than 10 statements above the call is not seen.
- A provenance chain longer than six hops (aliases, members, wrappers) is not followed.
- URL fragments derived from a chain of variables (more than one assignment hop) are not always traced.
- Constructed `URL` objects passed to `request.get(urlObject)` are detected when the constructor receives user input directly, not when input enters via setter methods.
- Allowlists declared in environment variables (consumed at runtime) cannot be validated statically — the rule still fires; suppress with an `eslint-disable-next-line` comment that names the validating function.

## ⚙️ Options

| Option                 | Type      | Default | Description                                                                                                                                |
| ---------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `allowInTests`         | `boolean` | `true`  | Skip this rule in `*.test.*` / `*.spec.*` files                                                                                            |
| `reportUnresolvedUrls` | `boolean` | `false` | Report a URL argument that is a user-input-named identifier with no traceable request source. Restores the pre-inversion naming heuristic. |
