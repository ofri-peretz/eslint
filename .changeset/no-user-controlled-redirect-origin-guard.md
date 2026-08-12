---
'eslint-plugin-express-security': patch
---

`no-user-controlled-redirect` no longer flags the documented safe redirect

The rule reported `res.redirect(req.query.url)` on sight, with no analysis of
whether the value had been validated. That meant it fired on the exact pattern
Express publishes on its "Production Best Practices: Security" page, and that
the OWASP Unvalidated Redirects cheat sheet recommends:

```js
app.use((req, res) => {
  try {
    if (new URL(req.query.url).host !== 'example.com') {
      return res.status(400).end('Unsupported redirect');
    }
  } catch (e) {
    return res.status(400).end('Invalid url');
  }
  res.redirect(req.query.url);   // ← was reported as CWE-601
});
```

Telling a reader that their documented mitigation is the vulnerability is worse
than saying nothing: the natural response is to delete the check.

The rule now recognises an origin allowlist applied to the same user source —
`new URL(<source>).host` / `.hostname` / `.origin` inside an `if` whose
consequent returns or throws — and stays quiet. Unguarded redirects still
report, a guard on a *different* source still reports, and an origin check that
does not bail out is still not treated as a guard.

Guard detection is structural (node-by-node member-path comparison), not text
comparison of printed source.
