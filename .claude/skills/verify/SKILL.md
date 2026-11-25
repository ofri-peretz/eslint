---
name: verify
description: Build the plugin or docs page you changed and run it as a user would, eslint on real code or the site at 390px, then read back what it reports. Use before committing a behaviour change.
---

# Verify a change by running it

Tests say the rule's cases pass; this says a user running ESLint, or reading the docs site, gets
the right answer. Paste the command and what it printed into the commit's `Verified-by:` receipt.

## Boot

A plugin: build it and lint a scratch file with its flat config, outside the repo's own config.

```sh
npx turbo run build --filter=eslint-plugin-<name>
mkdir -p "$TMPDIR/v" && cd "$TMPDIR/v"
printf "import { configs } from '%s/packages/eslint-plugin-<name>/dist/src/index.js';\nexport default [configs.recommended];\n" "$OLDPWD" > eslint.config.mjs
```

The docs site: `npm run dev:docs` serves <http://localhost:3000>; ready when it answers 200.

## Drive and inspect

A rule: write the smallest file that should fire it and one that should not, run
`npx eslint bad.js good.js` from that folder, and read the rule id, line,
message and exit code (1 with findings). A fix runs `--fix-dry-run` too. A docs change opens the
page in a browser tool at 390px and at desktop width and reads the page text; the deploy smoke is
`npx playwright test -c apps/docs/playwright.smoke.config.ts`.

## Feature map

| Feature | Reach it by | Working means |
| --- | --- | --- |
| A security rule | `npx eslint` on a bad and a good file, as above | bad reports the rule id and line; good is clean |
| `recommended` / `strict` | `configs.recommended`, `configs.strict` in the scratch config | loads with no config error |
| oxlint shims | `npm run oxlint:shims:verify` | exit 0 |
| Published install | `npm run verify:published-install` | exit 0 |
| Docs home and rule pages | <http://localhost:3000>, `/docs/<plugin>/<rule>` | sections render, ESLint tab shown, no layout break at 390px |
| Docs deploy smoke | `npx playwright test -c apps/docs/playwright.smoke.config.ts` | every test passes |

## When it fails

Fix the code, not this skill. A row that no longer runs is fixed in its own commit. After three
failed rounds, stop and show the person the output.
