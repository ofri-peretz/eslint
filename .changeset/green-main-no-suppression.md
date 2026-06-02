---
"eslint-plugin-react-features": patch
"eslint-plugin-node-security": patch
"eslint-plugin-import-next": patch
---

Consolidation cleanup — no rule behavior change:

- **react-features**: the README rules table now lists the 8 `componentApi`
  preset rules. The README generator (`sync-readme-rules.ts`) and the
  `plugin-rule-source-drift` validator now recurse into nested
  `docs/rules/<category>/` subfolders, so every documented rule is advertised
  consistently (previously the nested componentApi docs were silently dropped,
  which an earlier `readme` exception had papered over — that exception is now
  removed in favour of the real fix).
- **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
  was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
  the dead source was still compiling into `dist`.
- **import-next**: restore the `no-cycle` unit test after #180's SCC refactor
  (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
keys (`'recommended-strict': {`) as rules.
