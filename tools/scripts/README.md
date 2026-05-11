# `tools/scripts/` — Tools-Scoped Automation

Scripts scoped specifically to the **changelog and per-package README workflow** of the `tools/` and `packages/` directories. Distinct from [`../../scripts/`](../../scripts/), which holds repo-wide automation.

> **Boundary:** if it touches changelogs, per-package READMEs, or `tools/`-internal layout, it belongs here. If it's invoked from `npm run` or a CI workflow, it likely belongs in [`../../scripts/`](../../scripts/) instead.

## Scripts

| Script | Purpose |
| :--- | :--- |
| [`check-readme-structure.ts`](./check-readme-structure.ts) | Audit per-package README structure for consistency |
| [`fix-changelog-format.js`](./fix-changelog-format.js) | Patch CHANGELOG entries to the standard format |
| [`fix-changelog-order.js`](./fix-changelog-order.js) | Re-order CHANGELOG entries chronologically |
| [`fix-readmes.ts`](./fix-readmes.ts) | Bulk patches for per-package READMEs |
| [`update-changelogs.js`](./update-changelogs.js) | Refresh CHANGELOGs from conventional-commits |
| [`revert-changelogs.js`](./revert-changelogs.js) | Revert a CHANGELOG batch (rollback for `update-changelogs.js`) |

These are invoked manually as needed when a structural drift is detected. The repo-wide rule-meta and link checks live in [`../../scripts/`](../../scripts/).
