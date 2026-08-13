---
'eslint-plugin-express-security': minor
---

`require-rate-limiting` moves from `warn` to `error` in `recommended`.

Its findings concentrate in single-purpose demo apps — `express/examples/*` —
where rate limiting genuinely is not wanted. Those are correct detections, not
false positives, and the reporting posture is now written down: we report, and
the consumer scopes. Someone who does not want this in a demo directory disables
it there, explicitly, where the decision is visible in their config. A path
exclusion shipped in the preset would be a decision made silently on behalf of
every consumer, including the ones whose `examples/` directory is production
code.

This resolves an inconsistency `.agent/wild-ground-truth.json` had already
flagged as "the actionable part": `require-helmet`, the same shape with the same
finding profile, has always been `error` while this sat at `warn`.

If you were relying on this being a warning, set it back in your config:

```js
rules: { 'express-security/require-rate-limiting': 'warn' }
```
