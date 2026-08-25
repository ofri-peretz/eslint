---
'eslint-plugin-react-features': patch
---

fix: `no-unknown-property` reported `loading`, `decoding`, and `fetchPriority` —
three standard React DOM props for `<img>` (and `<iframe>`/`<link>`/`<script>`
where applicable). `loading` and `decoding` have been valid React props for
years; `fetchPriority` is the React 19 camelCase form. All three are in
upstream eslint-plugin-react's known-property list; ours was missing them, so
every lazy-loaded image in a consumer codebase produced three false positives.

The lowercase HTML form `fetchpriority` still reports (positive-control test
locks both directions).
