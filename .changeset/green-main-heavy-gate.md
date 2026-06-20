---
---

Test-only / tooling-only: sync three stale checks that were left red on `main` by
recently-merged work (no rule behavior or public API change, so no release).

- secure-coding `should export all rules` snapshot: add `no-template-injection`
  (shipped in #185) and bump the count 27 → 28.
- detect-object-injection `obj[key1][key2]` test: expect 1, matching the
  deliberate chained-access dedup added in #183 (the rule reports the outermost
  computed access once; the vulnerability is still flagged).
- `scripts/ilb-plugin-scope-audit.ts` typecheck: add `deprecated?: boolean` to
  the manifest-entry type and drop the dead `f.pluginDir` fallback (`Finding`
  only has `plugin`).
