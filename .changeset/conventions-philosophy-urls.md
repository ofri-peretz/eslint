---
'eslint-plugin-conventions': patch
---

Point `meta.docs.url` at the philosophies' new home

`utm-taxonomy`, `no-raw-cross-property-href`, and `analytics-event-naming`
shipped `meta.docs.url` values pointing at `UTM_PHILOSOPHY.md` and
`ANALYTICS_PHILOSOPHY.md` at the root of this repo. Those documents moved to
[ofri-peretz/interlace `docs/philosophies/`](https://github.com/ofri-peretz/interlace/tree/main/docs/philosophies),
so the published URLs now 404 — the "read more" link on every one of these
diagnostics is dead in `4.2.8`.

Nothing in CI caught it: `check-links.ts` only scans external URLs in MDX, so
a `meta.docs.url` string in a rule's `.ts` is invisible to it. Worth a
follow-up lock that resolves every rule's `meta.docs.url`.

No rule behaviour changes — five string literals.
