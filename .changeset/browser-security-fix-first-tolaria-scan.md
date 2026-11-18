---
'eslint-plugin-browser-security': minor
'oxlint-plugin-browser-security': minor
---

fix(browser-security): worker globals, style-src and a named parameter in three rules

- `require-postmessage-origin-check`: a worker's global scope has no
  cross-origin sender. `self.onmessage` / `self.addEventListener('message')` is
  not reported in a `*.worker.*` entry file, nor on a receiver that also listens
  for a service-worker lifecycle event (`install`, `activate`, `fetch`, …).
  `window` is never treated as a worker.
- `no-unsafe-inline-csp`: `'unsafe-inline'` is judged by its directive. It is
  reported under `script-src*`, under `default-src` when no `script-src`
  overrides it, and in a bare source list at a CSP header. `style-src
'unsafe-inline'` (inline CSS, not script execution) is reported only with the
  new `checkStyleSrc: true` option, under its own MEDIUM message; `img-src` and
  similar are not reported.
- `no-credentials-in-query-params`: the message names the matched parameter
  (``Credentials detected in URL query parameter `client_secret` ``), so a
  finding on a 1 MB generated literal can be found.
