#!/usr/bin/env -S npx tsx

/**
 * verify-oxlint-aliases.mts — load every `oxlint-plugin-<name>` the way a
 * Vite+ or oxlint user does, through the installed oxlint's `jsPlugins`, and
 * prove it carries exactly the rule IDs of `eslint-plugin-<name>`.
 *
 * Per alias, two oxlint runs against one empty file:
 *
 *   1. every `<name>/<rule>` from the plugin's own rule map → must load clean.
 *   2. the `.oxlintrc` example in the alias README, verbatim → must load clean,
 *      so the config a user copies is one oxlint accepts.
 *   3. one `<name>/__no_such_rule__` → must fail with oxlint's
 *      "Rule '__no_such_rule__' not found in plugin '<name>'".
 *
 * Run 3 is what makes runs 1 and 2 mean something: it proves oxlint rejects an ID it
 * does not know, and it names the namespace oxlint actually registered. That
 * namespace comes from the plugin's `meta.name`, not the package name, so this
 * also catches a `meta.name` edit that would silently rename every rule for
 * oxlint users.
 *
 * Needs built `dist/` (oxlint loads real JS), so it runs after the build:
 * pre-push `build-and-test`, and the oxlint-parity workflow. A missing build
 * is a failure, never a skip.
 *
 * See docs/intents/oxlint-native-plugin-names/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const require = createRequire(path.join(ROOT, 'package.json'));
const OXLINT = path.join(ROOT, 'node_modules', '.bin', 'oxlint');
const SENTINEL = '__no_such_rule__';

// oxlint resolves `jsPlugins` from the config file's directory, so the scratch
// configs must live inside the repo for `node_modules/` to be found.
//
// `node_modules/.cache` is not guaranteed to exist: it is created on demand by
// whichever tool happens to use it first (vitest, turbo, ...), and a fresh
// `npm ci` never creates it. `mkdtempSync` requires its parent to already
// exist, so a cache-miss install with no other tool having run yet hit
// ENOENT here on every scheduled oxlint-parity run (#1327).
export function createOxlintAliasesWorkDir(root: string): string {
  const cacheDir = path.join(root, 'node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  return fs.mkdtempSync(path.join(cacheDir, 'oxlint-aliases-'));
}

// Needs built `dist/` and a real oxlint binary, so the work below runs only
// when this file is executed directly — importing it (e.g. to unit-test
// `createOxlintAliasesWorkDir` above) must not also run the full, build-
// dependent verification as a side effect.
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const WORK = createOxlintAliasesWorkDir(ROOT);
  fs.writeFileSync(path.join(WORK, 'empty.js'), '');

  const oxlintWith = (configObject: unknown, alias: string) => {
    const config = path.join(WORK, `${alias}.oxlintrc.json`);
    fs.writeFileSync(config, JSON.stringify(configObject));
    const run = spawnSync(OXLINT, ['-c', config, path.join(WORK, 'empty.js')], {
      encoding: 'utf8',
    });
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  };
  const oxlint = (rules: Record<string, string>, alias: string) =>
    oxlintWith({ jsPlugins: [alias], rules }, alias);

  const aliases = fs
    .readdirSync(PACKAGES_DIR)
    .filter((dir) => dir.startsWith('oxlint-plugin-'))
    // A directory with only ignored build output (dist/, .turbo/) left behind by a
    // removed alias is not a package; skip it rather than fail on a missing module.
    .filter((dir) =>
      fs.existsSync(path.join(PACKAGES_DIR, dir, 'package.json')),
    )
    // The drop-in façade maps another plugin's IDs; it is verified below.
    .filter((dir) => dir !== 'oxlint-plugin-security')
    .sort();

  const failures: string[] = [];
  for (const alias of aliases) {
    const short = alias.slice('oxlint-plugin-'.length);
    const plugin = `eslint-plugin-${short}`;
    try {
      const expected = Object.keys(require(plugin).rules).sort();
      const exposed = Object.keys(require(alias).rules).sort();
      if (JSON.stringify(expected) !== JSON.stringify(exposed)) {
        failures.push(`${alias}: rule set differs from ${plugin}`);
        continue;
      }

      const all = oxlint(
        Object.fromEntries(expected.map((rule) => [`${short}/${rule}`, 'off'])),
        alias,
      );
      if (all.status !== 0) {
        failures.push(
          `${alias}: oxlint rejected its own rule IDs\n${all.output}`,
        );
        continue;
      }

      const readme = fs.readFileSync(
        path.join(PACKAGES_DIR, alias, 'README.md'),
        'utf8',
      );
      const example = /```json\n(\{\n  "jsPlugins"[\s\S]*?)\n```/.exec(
        readme,
      )?.[1];
      if (!example) {
        failures.push(`${alias}: README has no .oxlintrc JSON example`);
        continue;
      }
      const documented = oxlintWith(JSON.parse(example), alias);
      if (documented.status !== 0) {
        failures.push(
          `${alias}: the README's oxlint config does not load\n${documented.output}`,
        );
        continue;
      }

      const bogus = oxlint({ [`${short}/${SENTINEL}`]: 'error' }, alias);
      const want = `Rule '${SENTINEL}' not found in plugin '${short}'`;
      if (!bogus.output.includes(want)) {
        failures.push(`${alias}: expected "${want}", got\n${bogus.output}`);
        continue;
      }
      console.log(`  ✓ ${alias}: ${expected.length} rules as ${short}/*`);
    } catch (error) {
      failures.push(`${alias}: ${(error as Error).message}`);
    }
  }

  // oxlint-plugin-security (docs/intents/oxlint-plugin-security-drop-in, R5): every
  // incumbent `security/<id>` from its mapping loads through jsPlugins, and an ID it
  // does not define is rejected under the `security` namespace.
  {
    const facade = 'oxlint-plugin-security';
    try {
      const mapping = JSON.parse(
        fs.readFileSync(
          path.join(PACKAGES_DIR, facade, 'mapping.json'),
          'utf8',
        ),
      ) as { rules: Record<string, unknown> };
      const all = oxlint(
        Object.fromEntries(
          Object.keys(mapping.rules).map((id) => [`security/${id}`, 'off']),
        ),
        facade,
      );
      const bogus = oxlint({ [`security/${SENTINEL}`]: 'error' }, facade);
      const want = `Rule '${SENTINEL}' not found in plugin 'security'`;
      if (all.status !== 0)
        failures.push(`${facade}: oxlint rejected its IDs\n${all.output}`);
      else if (!bogus.output.includes(want))
        failures.push(`${facade}: expected "${want}", got\n${bogus.output}`);
      else
        console.log(
          `  ✓ ${facade}: ${Object.keys(mapping.rules).length} incumbent IDs as security/*`,
        );
    } catch (error) {
      failures.push(`${facade}: ${(error as Error).message}`);
    }
  }

  fs.rmSync(WORK, { recursive: true, force: true });

  if (aliases.length === 0) failures.push('no oxlint-plugin-* packages found');
  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} alias(es) failed:\n`);
    for (const failure of failures) console.error(`  ${failure}\n`);
    console.error('A missing dist/? Run `npx turbo run build` first.');
    process.exit(1);
  }
  console.log(
    `\n✅ ${aliases.length} oxlint-plugin-* aliases load with their plugin's rule IDs.`,
  );
}
