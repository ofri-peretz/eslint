---
'eslint-plugin-react-features': patch
---

fix(react-features): `hooks-exhaustive-deps` reports the same thing whatever order files are linted in

The rule walked callback bodies through a per-node-type table of child keys that it built from the first node of each type it met, keeping a key only when that node had an object under it. The first `if` without an `else` dropped `alternate` for the rest of the run, so a dependency used only inside an `else` branch was never reported, and the count on one commit changed between runs (Shopify/cli: 12, 14, 12). It now walks the parser's visitor keys. Expect a few findings to appear (an `else` branch is now read) and a few to disappear (a stale table also hid the reads that made a listed dependency necessary).
