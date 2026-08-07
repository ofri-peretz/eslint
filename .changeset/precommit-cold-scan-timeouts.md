---
'eslint-plugin-express-security': patch
'eslint-plugin-jwt-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-postgresql-security': patch
'eslint-plugin-vercel-ai-security': patch
---

Test infrastructure only — no rule, config, or API behavior changes. These
packages ship `src/` in their npm tarball, so the moved SDK compatibility specs
technically alter the published files, hence the patch bump.

The `src/__compatibility__/` suites no longer run as part of each package's
default `vitest` run. They assert the export surface of the third-party SDK
(express, jose, @middy/core, mongodb, @nestjs/common, pg, ai), not our rules, and
`sdk-compatibility.yml` already exercises them against each SDK's `@latest` —
the only run that produces new signal. Loading those SDK graphs on a cold module
cache was measured at 82s (express) and 209s (`@nestjs/common`), which blew every
per-file hook timeout and blocked unrelated local commits via the lefthook
`tests-affected` pre-commit hook. The ceiling now lives once in
`vitest.compat.config.mts`, sized off those cold numbers.
