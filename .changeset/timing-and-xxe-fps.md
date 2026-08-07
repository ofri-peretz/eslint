---
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Two more false-positive classes from the whole-ruleset sweep.

**`no-timing-unsafe-compare`: 108 → 12 findings.** Two causes.

An *existence check* is not a secret comparison — `if (token !== undefined)`,
`hash === null`, `signature.length === 0`. A timing attack needs an
attacker-supplied operand on the other side; a sentinel leaks nothing.

And `key` was in the default secret patterns, substring-matched. It hit `key`,
`firstKey`, `keys`, and every AST walker's `key === 'text'` — 88 findings on this
repo, none of them secrets. The names that actually denote a secret (`apiKey`,
`privateKey`, `encryptionKey`, `accessToken`, …) are listed in full and still
fire; a project that really does compare a bare `key` can add it back via
`secretPatterns`.

Word-boundary matching was tried first and dropped: it fixed `firstKey` but
stopped matching `req.headers.authorization`, trading one false positive for a
worse false negative.

**`no-xxe-injection`: 76 → 1 finding.** `parse` was treated as an XML method
name, so `JSON.parse(fs.readFileSync(file, 'utf-8'))` reported CWE-611. The
XML-specific names (`parseFromString`, `parseXmlString`, `parseXML`,
`parseString`) still match on the name alone; a bare `parse` now has to be
positively identified as XML by its receiver, which drops `JSON.parse`,
`Date.parse`, `path.parse` and `url.parse`. Allowlist rather than denylist, so a
future `csv.parse` is silent by default.

Every class is locked as `valid` cases and verified by reverting the guard.
