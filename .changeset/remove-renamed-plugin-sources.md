---
'eslint-plugin-postgresql-security': patch
'eslint-plugin-jwt-security': patch
---

Remove the superseded `eslint-plugin-pg` and `eslint-plugin-jwt` sources from
the monorepo.

Both were renamed to their `-security` names and every published version on npm
is deprecated. The sources stayed in `packages/`, and because
`.changeset/config.json` has `ignore: []`, **every release versioned and
republished them** — `eslint-plugin-pg@1.4.13` and `eslint-plugin-jwt@2.2.13`
went out on 2026-08-05. A newly published version carries no deprecation flag,
so each release silently un-deprecated the packages until someone re-ran
`npm deprecate`.

Deleting the sources is what stops that loop; re-deprecating alone gets undone
by the next release.

No published rule is lost. The `-security` packages carry identical rule sets
(13 each, verified by comparing the rule directories) and keep the original
`pg/` and `jwt/` rule namespaces, so no consumer config changes. The published
catalogue is unchanged at 465 rules across 30 plugins — the removed entries were
already marked unpublished, which is why the totals only drop for the
including-unpublished count (491 → 465).

Also fixes a user-facing consequence the removal surfaced: the playground's
copy-config button derived package names as `eslint-plugin-<prefix>`, so `jwt/`
and `pg/` findings emitted install lines for the **deprecated** packages. Those
two prefixes are now mapped explicitly, with a lock.
