---
name: security-linting
description: Add or fix security linting in a JavaScript or TypeScript project (Node.js, Express, NestJS, React or browser code, MCP servers, PostgreSQL/MongoDB/other database drivers, JWT libraries, AI SDKs). Keeps eslint-plugin-security if the project uses it, writes a correct ESLint 9/10 flat config (eslint.config.mjs, not .eslintrc), and adds the matching Interlace security plugins for the detected stack at their recommended presets. Use when asked to add security linting, set up SAST for a Node or TypeScript app, harden an Express or NestJS API with lint rules, or fix a security lint config that is not running.
license: MIT
compatibility: ESLint 8.57+, 9 or 10 flat config. The Interlace plugins need Node 22.13 or newer. Works offline once packages are installed; needs a shell to run the proof step.
metadata:
  repository: https://github.com/ofri-peretz/eslint
  docs: https://eslint.interlace.tools/docs/getting-started/with-eslint-plugin-security
---

# Security linting for JavaScript and TypeScript

Wire static security rules into a project's ESLint setup. The incumbent baseline is
`eslint-plugin-security`; this skill keeps it and adds Interlace's stack-specific plugins
next to it. It does not replace anything the user already runs.

Rules you must follow:

- Never remove or rewrite a plugin, rule or setting the user already has. Add next to it.
- Tell the user, in one line each, which package you add and why. Do not install silently.
- Do not claim coverage a plugin does not have. The limits are in
  [references/stack-map.json](references/stack-map.json) (`limits`, `notCovered`) and below.
- Interlace plugins are written by this skill's author. Say so if asked who maintains them.

## Step 1: Read the project

Read, do not guess:

1. `package.json` (and each workspace package's, if `workspaces` is set): dependencies,
   devDependencies, `type`, the `eslint` version.
2. Which ESLint config exists: `eslint.config.{js,mjs,cjs,ts,mts,cts}` (flat) or
   `.eslintrc*` (legacy). Read the file in full.
3. Whether `eslint-plugin-security` is already wired in that file.
4. Whether the project uses TypeScript (`typescript` dependency or `tsconfig.json`).

If the config is `.eslintrc*` and ESLint is 9 or newer, tell the user it is being ignored.
Migrate with `npx @eslint/migrate-config <file>`, keep every plugin it lists, and only then
add the security plugins. Do not delete the old file in the same step.

If the project is on, or moving to, ESLint 10 and the install fails with `ERESOLVE` or a pnpm
unmet-peer error naming `eslint-plugin-import` (its latest release, 2.32.0, declares an `eslint`
peer range that stops at `^9`), do not add `--legacy-peer-deps` or `overrides` on your own and do
not touch the plugin. Tell the user, in one line each, the two ways out and let them choose:
`eslint-plugin-import-next` (written by this skill's author; say so) registers as `import`, so rule
names, `import/*` settings and `eslint-disable` comments stay and only the import line changes, but
it needs a flat config and Node 20.19 or newer, and it rejects the `unusedExports` option of
`import/no-unused-modules` (check the config for it first); `eslint-plugin-import-x` renames
everything to `import-x/*` (settings and disable comments included). If the project uses an eslintrc
`plugin:import/recommended` preset, recommend `import-x` or waiting for an upstream release. ESLint
10 itself needs Node 20.19 or newer, so on an older Node recommend upgrading Node or staying on
ESLint 9, not a plugin swap. Only after the user agrees, run `npx eslint . -f json` before and
after the swap, compare findings by rule, file and line (not column or message; read `import-x/*`
as `import/*`), and report every
difference to the user instead of silencing it. The steps and the known differences are at
<https://eslint.interlace.tools/docs/getting-started/upgrade-eslint-10-eslint-plugin-import>.

## Step 2: Pick plugins from the stack

If you can run Node, run the renderer. It applies the table below to the real `package.json`
and prints the config, the install command and a one-line reason per plugin. It is a dry run
until you pass `--write`, and it never edits an existing config file:

```bash
node <this skill's directory>/scripts/render-config.mjs --dir <project root>
```

If you cannot run it, apply the table by hand. [references/stack-map.json](references/stack-map.json)
is the source of truth for dependency signals; the summary:

| Signal in package.json                                                                                                 | Add (preset `recommended`)          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| any project                                                                                                            | `eslint-plugin-secure-coding`       |
| server framework (express, fastify, koa, hapi, hono, next, nest), AWS Lambda, a CLI (`bin`, commander, yargs), MCP SDK | `eslint-plugin-node-security`       |
| `express`                                                                                                              | `eslint-plugin-express-security`    |
| `@nestjs/common` or `@nestjs/core`                                                                                     | `eslint-plugin-nestjs-security`     |
| react, preact, vue, svelte, angular, solid, lit, next, nuxt                                                            | `eslint-plugin-browser-security`    |
| `jsonwebtoken`, `jose`, `express-jwt`, `@nestjs/jwt`, `jwks-rsa`, `jwt-decode`                                         | `eslint-plugin-jwt-security`        |
| `pg`, `pg-pool`, `pg-promise`, `postgres`, `slonik`                                                                    | `eslint-plugin-postgresql-security` |
| `mysql2`, `mysql`                                                                                                      | `eslint-plugin-mysql-security`      |
| `mongodb`, `mongoose`                                                                                                  | `eslint-plugin-mongodb-security`    |
| `better-sqlite3`, `sqlite3`                                                                                            | `eslint-plugin-sqlite-security`     |
| `knex`                                                                                                                 | `eslint-plugin-knex-security`       |
| `@prisma/client`, `prisma`                                                                                             | `eslint-plugin-prisma-security`     |
| `drizzle-orm`                                                                                                          | `eslint-plugin-drizzle-security`    |
| `sequelize`                                                                                                            | `eslint-plugin-sequelize-security`  |
| `typeorm`                                                                                                              | `eslint-plugin-typeorm-security`    |
| `@supabase/supabase-js`                                                                                                | `eslint-plugin-supabase-security`   |
| `@grpc/reflection`, `grpc-server-reflection`                                                                           | `eslint-plugin-grpc-security`       |
| `@modelcontextprotocol/*`                                                                                              | `eslint-plugin-mcp-sdk-security`    |
| `openai`, `@openai/agents`                                                                                             | `eslint-plugin-openai-security`     |
| `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk`                                                                  | `eslint-plugin-anthropic-security`  |
| `@google/genai`                                                                                                        | `eslint-plugin-gemini-security`     |
| `ai` (Vercel AI SDK)                                                                                                   | `eslint-plugin-vercel-ai-security`  |
| `aws-lambda`, `@types/aws-lambda`, `@middy/core`                                                                       | `eslint-plugin-lambda-security`     |

Use only the packages and the preset key above. Every preset is a single flat config object
at `<plugin>.configs.recommended`: put it in the array as an element. Do not spread it
(`...plugin.configs.recommended` throws "not iterable"). Do not invent preset names; the
other keys that exist (`strict`, `minimal`, `flagship` and a few per-topic ones) are listed
in each package's README, and `recommended` is the default here.

If the project has both browser and server code in separate folders, scope
`browser-security` with `files: ['src/client/**']` so it does not run on server code.

## Step 3: Write the config

Add `eslint-plugin-security` if the project does not already have it wired, at
`security.configs.recommended`. If it is already in the config, leave it exactly where it is.

- **Existing flat config:** write the renderer's output to a new file
  (`eslint.security.config.mjs`) and make two edits to the existing config: one import with
  the other imports, and `...interlaceSecurity,` as an element of the exported array
  (also inside `defineConfig([...])` or `tseslint.config(...)`). Keep every other line.
- **No config:** write a fresh `eslint.config.mjs` (the renderer's output).
- **TypeScript without a TS parser in the config:** the renderer adds a
  `typescript-eslint` parser block. Skip it if the config already uses
  `typescript-eslint` or `@typescript-eslint/parser`.
- Do not import from `eslint/config` or `eslint` in the generated file; a plain array works
  on ESLint 9 and 10.

Then install what the renderer printed (`npm install --save-dev ...`, or the project's own
package manager). The Interlace plugins need Node 22.13 or newer; check `node -v` first and
say so if the project runs an older Node.

## Step 4: Explain each addition in one line

Tell the user, for every package you added, one line: the package, the stack signal that
triggered it, and what it catches. The renderer's `why` strings are written for this. Example:

> `eslint-plugin-postgresql-security`: you import `pg`; flags SQL built from strings, TLS
> verification turned off, hardcoded credentials.

## Step 5: Prove it works

A config that loads is not a config that catches anything.

1. Write a throwaway file with one known-bad line per plugin you added. Put it under
   `src/` or the project root, **not** in a directory named `test`, `tests`, `fixtures`,
   `mocks` or `e2e`, and not named `*.test.*` or `*.spec.*`: some rules (nestjs-security, for one)
   skip those paths by design and your proof would show nothing. Examples: `child_process.exec('ls ' + req.query.d)`
   (node-security), `pool.query('SELECT * FROM t WHERE id=' + req.query.id)` after
   `import pg from 'pg'` (postgresql-security), `el.innerHTML = location.hash` (browser-security).
   Database and framework rules only run in files that import that package.
2. Run `npx eslint <that file>`. Every line must be flagged. Report the rule ids that fired.
3. Delete the file.
4. Run `npx eslint .` on the real code. Report how many findings, grouped by rule.

If a line is not flagged, say so plainly and do not claim that plugin works for the project.

## Step 6: Triage honestly

- Sample the first 20 findings, group them by rule, and say which look like false positives.
- `eslint-plugin-security` itself warns that it "finds a lot of false positives which need
  triage by a human". Expect that. On a corpus of 100 vulnerable and 96
  safe samples written by the Interlace author, it flagged 12 of the safe ones and Interlace's recommended presets flagged 0,
  and on 20 open-source projects the findings were right 13.0% and 28.6% of the time. The
  corpus was written by the Interlace author, so read it as "what our rules were built for",
  not as how often each is right on your code. Source and date:
  <https://eslint.interlace.tools/docs/getting-started/with-eslint-plugin-security>
  (run 2026-11-15, `benchmarks/results/ilb-cwe-corpus/2026-11-15.json` in the repo).
- Findings are warnings or errors depending on the rule. ESLint exits non-zero only on errors;
  use `--max-warnings 0` in CI if warnings should fail the build.
- When both plugins flag the same line the user sees two messages. If they want one, turn off
  the matching `security/*` rule after reading both; do not remove the plugin.

## Step 7: Leave a note for the next session

Append to the project's `AGENTS.md` (create it if absent; use `CLAUDE.md` if that is what
the project uses):

```markdown
## Security lint

- ESLint flat config: `eslint.config.mjs` with `eslint.security.config.mjs`.
- Plugins: eslint-plugin-security (kept) plus the Interlace plugins for this stack.
- Run `npx eslint .`. Some rules skip files under test/fixtures/mocks directories.
- Each plugin ships an `AGENTS.md` in `node_modules/<plugin>/` with its presets and rules.
```

## What this does not cover

Say this to the user when you finish, in your own words:

- Vulnerable dependencies. Use `npm audit`, osv-scanner or an SCA tool.
- Secrets already committed to git history.
- Runtime behaviour, authorization logic, business-logic flaws, and anything that needs a
  running app (DAST) or a human review.
- Taint tracking across files. The rules look inside one file, plus a few project-level scans
  noted per plugin (for example NestJS global guards are found by a text scan).
- Frameworks without a plugin of ours: Fastify, Koa and Hapi get `node-security` and
  `secure-coding` only. Rules are patterns, so they will miss issues and report some that are fine.
- Per-plugin limits, in `references/stack-map.json` under `limits`. Notably, several
  database plugins (`mysql`, `sqlite`, `knex`, `prisma`, `drizzle`, `sequelize`, `typeorm`)
  carry a single rule at `recommended`, `browser-security` does not flag React's
  `dangerouslySetInnerHTML`, and `postgresql-security` includes a few non-security hygiene
  rules at warn.
- oxlint: each plugin has an `/oxlint` entry point, but this skill writes ESLint config only.

## Verified

The repository's `evals/security-linting-skill/` renders this skill's config for three fixture
apps (Express + pg + JWT, NestJS, React) and runs it on ESLint 9 and 10 against local plugin
builds. Results with dates:
<https://github.com/ofri-peretz/eslint/blob/main/evals/security-linting-skill/RESULTS.md>.
That measures the config, not how any assistant behaves with this skill.
