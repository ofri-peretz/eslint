---
'eslint-plugin-react-features': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-conventions': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-reliability': patch
'eslint-plugin-vercel-ai-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-operability': patch
'eslint-plugin-jwt': patch
'eslint-plugin-modularity': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-modernization': patch
---

Re-publish so every plugin ships the optimised tarball

These 20 packages were last published before the build pipeline changed, so
their tarballs still contain what `scripts/build-package.ts` now excludes:
`AGENTS.md`, `CHANGELOG.md`, JSDoc in the emitted `.js`, and the full
generated `.d.ts` tree. No source changed — this is a no-op patch whose
entire purpose is to ship the artifact the current build already produces.

Also new here: `scripts` and `devDependencies` are stripped from every
published manifest. Neither can do anything in a consumer’s node_modules —
npm never runs one and never installs the other — but they shipped in all 27
manifests, cluttered the npm page, and were read by SCA tools scanning
installed manifests. No package declares a lifecycle hook, so nothing
observable changes.

| package                            | published | rebuilt | saving  |
| ---------------------------------- | --------- | ------- | ------- |
| `eslint-plugin-react-features`     | 547 kB    | 320 kB  | −227 kB |
| `eslint-plugin-secure-coding`      | 653 kB    | 477 kB  | −176 kB |
| `eslint-plugin-conventions`        | 241 kB    | 116 kB  | −125 kB |
| `eslint-plugin-browser-security`   | 380 kB    | 291 kB  | −89 kB  |
| `eslint-plugin-maintainability`    | 178 kB    | 116 kB  | −62 kB  |
| `eslint-plugin-react-a11y`         | 232 kB    | 173 kB  | −59 kB  |
| `eslint-plugin-reliability`        | 148 kB    | 90 kB   | −58 kB  |
| `eslint-plugin-vercel-ai-security` | 187 kB    | 130 kB  | −57 kB  |
| `eslint-plugin-nestjs-security`    | 122 kB    | 72 kB   | −49 kB  |
| `eslint-plugin-operability`        | 90 kB     | 43 kB   | −47 kB  |
| `eslint-plugin-jwt`                | 140 kB    | 95 kB   | −45 kB  |
| `eslint-plugin-modularity`         | 98 kB     | 58 kB   | −40 kB  |
| `eslint-plugin-sqlite-security`    | 54 kB     | 20 kB   | −34 kB  |
| `eslint-plugin-sequelize-security` | 54 kB     | 21 kB   | −34 kB  |
| `eslint-plugin-prisma-security`    | 52 kB     | 19 kB   | −33 kB  |
| `eslint-plugin-mysql-security`     | 52 kB     | 19 kB   | −33 kB  |
| `eslint-plugin-typeorm-security`   | 52 kB     | 19 kB   | −33 kB  |
| `eslint-plugin-drizzle-security`   | 52 kB     | 19 kB   | −33 kB  |
| `eslint-plugin-knex-security`      | 51 kB     | 19 kB   | −32 kB  |
| `eslint-plugin-modernization`      | 45 kB     | 38 kB   | −7 kB   |

Total: 1273 kB, a further −23% across the ecosystem.

Consumers were already getting the slim `@interlace/eslint-devkit@1.6.0` —
every plugin pins it with a caret that 1.6.0 satisfies, verified by a clean
install of an unchanged plugin resolving devkit 1.6.0 with zero dependencies
and no `typescript` in the tree. What stayed fat was each plugin’s own
tarball, which only a re-publish fixes.
