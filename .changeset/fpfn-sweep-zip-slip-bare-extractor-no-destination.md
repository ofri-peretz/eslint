---
'eslint-plugin-node-security': patch
---

fix: `no-zip-slip` no longer reports a bare ambiguous extractor that extracts nowhere

`no-zip-slip` applied its `AMBIGUOUS_EXTRACTORS` disambiguation only to method
callees. A bare identifier — which carries strictly LESS evidence, having no
receiver to name an archive at all — skipped the check entirely and reported
unconditionally, at CWE-22 / CVSS 7.5 / HIGH. So `const out = untar(buf)`, a
pure in-memory call that takes no destination, imports no `fs` and writes
nothing, was a HIGH severity path-traversal finding, while the same call
renamed `extract(buf)` stayed silent because a hardcoded safe-library list
happens to contain `extract`. The asymmetry was accidental and nothing in the
docs predicted it.

The documented harm requires a place to write: Zip Slip "allows an attacker to
create files outside of the intended extraction directory". A call naming no
directory creates nothing. An ambiguous bare extractor now needs a destination
argument before it reports; unambiguous names (`extractAllTo`,
`extractArchive`) are unaffected, and `unzip(file, dest)` still reports.

Found by the burgee FP/FN sweep at `packages/compat-oracle/src/tar.ts:103`,
where burgee had already written an `eslint-disable` for it — the sweep now
reports that directive as unused.
