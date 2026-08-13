---
'eslint-plugin-express-security': minor
'@interlace/ui': patch
---

`require-rate-limiting` moves from `warn` to `error` in `recommended`, and the
dark-mode `--destructive` token becomes legible.

**`require-rate-limiting`: warn → error.** Its findings concentrate in
single-purpose demo apps — `express/examples/*` — where rate limiting genuinely
is not wanted. Those are correct detections, not false positives, and the
reporting posture is now written down: we report, and the consumer scopes.
Someone who does not want this in a demo directory disables it there,
explicitly, where the decision is visible in their config. A path exclusion we
shipped instead would be a decision made silently on behalf of every consumer,
including the ones whose `examples/` directory is production code.

This resolves an inconsistency `.agent/wild-ground-truth.json` had already
flagged as "the actionable part": `require-helmet`, the same shape with the same
finding profile, has always been `error` while this sat at `warn`.

If you were relying on this being a warning, set it back in your config:

```js
rules: { 'express-security/require-rate-limiting': 'warn' }
```

**`--destructive` in dark mode.** The token had a single literal value defined
in `:root` — a red chosen to pass on white — and no `.dark` counterpart, so dark
mode painted it on a near-black surface at **2.36:1** against the 4.5:1 WCAG AA
requires. It is now `hsl(0, 91%, 71%)` in `.dark`, measured at **6.40:1** on the
same surface.

`--destructive-foreground` is deliberately unchanged: the solid variants already
carry `dark:bg-destructive/60`, which composites the new red to `rgb(159,78,78)`
— 5.7:1 under white text.
