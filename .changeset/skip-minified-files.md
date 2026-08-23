---
'eslint-plugin-conventions': minor
'@interlace/eslint-devkit': minor
---

`no-magic-numbers` stops reading machine-packed output.

8 minified bundles carried **2,446 of this rule's 10,129 findings** on the
pinned corpus, and one of them — `assets/speedscope/import.bcbb2033.js` — was
1,973 by itself. "Name this constant" is advice to whoever edits the file, and
nobody edits a bundle.

Corpus: **10,129 → 7,532.**

`@interlace/eslint-devkit` gains `isMinifiedFile` and a `skipMinifiedFiles`
flag on `createRule`, joining `skipTestFiles` and `skipGeneratedFiles`.

**Decided from the file's own shape, never its path.** `dist/`, `.min.js` and
`vendor/` are conventions a stranger's repository is free to ignore, and the
largest offender announces nothing in its name.

**Average line length, not maximum** — and that distinction is the whole
predicate. 13 corpus files had a line over 1,000 characters and only 8 were
minified; the rest were ordinary source with one long line, including SVG icon
components whose `d` attribute is a single 1,600-character path. Skipping those
would have been silent recall loss in application code.

| | average line |
|---|---:|
| minified bundles | 712 – 203,807 |
| hand-written source | 32 – 58 |

A 2 KB floor sits under the average, because a short file can exceed it without
being packed — a one-line barrel re-export is not a bundle.

Security rules must not set this: a bundle ships and runs, and a minified
bundle is exactly where a supply-chain problem would hide.
