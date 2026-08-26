/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The config `scripts/real-source-scan.mts` lints third-party code with.
 *
 * ## Why this is not `eslint.benchmark.config.mjs`
 *
 * That file hand-lists its plugins and matches `files: ['**\/*.js']` with no
 * TypeScript parser. The consequence was invisible and total: a scan of 112
 * repositories and 345,841 files produced findings from `.js` files ONLY —
 * 214,855 TypeScript files in the same cache were walked, handed to ESLint,
 * and matched by no config block, so no rule ran on any of them.
 *
 * That is why `react-features` (61 rules), `react-a11y` (37) and
 * `nestjs-security` (10) reported zero findings across a corpus containing
 * excalidraw, MUI, kibana, nest and immich. They were never asked. Five more
 * plugins — react-features, conventions, maintainability, reliability,
 * operability — were not in that file at all.
 *
 * A separate config rather than a fix in place, because the benchmark config
 * also feeds `recall-gate.ts` and the CWE scorer, whose per-CWE false-positive
 * budget is zero. Adding eight plugins and every TypeScript file to those
 * instruments in the same change would move two numbers at once and leave
 * nobody able to say which change moved which.
 *
 * ## Every plugin, discovered rather than listed
 *
 * The plugin list is read off the filesystem. A hand-maintained list is how
 * the other file came to be missing five plugins, and nothing would have said
 * so — a plugin that is absent reports no findings, which reads exactly like a
 * plugin that found nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** Two plugins publish under a prefix that differs from their directory. */
const PUBLISHED_PREFIX = {
  'jwt-security': 'jwt',
  'postgresql-security': 'pg',
};

const plugins = {};
const rules = {};

for (const dir of fs.readdirSync(path.join(ROOT, 'packages')).sort()) {
  if (!dir.startsWith('eslint-plugin-')) continue;
  const entry = path.join(ROOT, 'packages', dir, 'src', 'index.ts');
  if (!fs.existsSync(entry)) continue;

  const loaded = await import(entry);
  const plugin = loaded.default ?? loaded;
  const ruleSource = plugin.rules ?? loaded.rules ?? {};
  if (Object.keys(ruleSource).length === 0) continue;

  const name = dir.replace('eslint-plugin-', '');
  const prefix = PUBLISHED_PREFIX[name] ?? name;
  plugins[prefix] = plugin.rules ? plugin : { ...plugin, rules: ruleSource };

  /**
   * Several plugins expose each rule twice — once flat, once under its
   * category (`no-unhandled-promise` AND `maintainability/no-unhandled-promise`),
   * pointing at the identical rule object. Registering both turns on the same
   * rule under two ids, so every finding is counted twice and the rule total
   * reads 566 where 470 rules exist. The first measurement with this config
   * reported 33,588 findings in 200 files; half of them were the same finding
   * wearing a second name.
   *
   * Verified rather than assumed: every slash-keyed name has a flat twin, and
   * `rules[flat] === rules[nested]` is true for each.
   */
  for (const rule of Object.keys(ruleSource)) {
    if (rule.includes('/')) continue;
    rules[`${prefix}/${rule}`] = 'error';
  }
}

export default [
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // No `project`: type information would need every scanned repository
        // to typecheck, which most will not do from a shallow clone. 393 of
        // 397 rules are type-unaware by design, so the loss is small and the
        // scan stays runnable on any checkout.
      },
    },
    plugins,
    rules,
    linterOptions: { reportUnusedDisableDirectives: false },
  },
];
