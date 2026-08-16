/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * One plugin set, one config builder, shared by every script in this suite.
 *
 * These scripts used to each carry their own copy, and the copies drifted:
 * `fp-audit` was measuring 3 plugins while `det-all` measured 8, so a "0/67
 * false positives" number was being read next to a detection number produced
 * by a different — and much larger — rule set. Widening the FP audit to match
 * immediately surfaced a finding the narrower config could never have seen.
 *
 * BENCHMARK-METHODOLOGY.md §2: a number quoted from one suite must name the
 * rule set it came from. Hence two presets rather than one:
 *
 *   recommended — what a consumer gets from `configs.recommended`. This is the
 *                 number that describes the shipped product.
 *   all         — every rule in every loaded plugin at `error`. The maximal
 *                 configuration; nobody runs this, and quoting it as if it
 *                 were the default overstates both detection and noise.
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS = path.resolve(HERE, '../../corpus');
const PKGS = path.resolve(HERE, '../../../packages');

/**
 * The plugins that own the corpus's CWE categories. Adding one here changes
 * every number this suite produces — detection and false positives alike —
 * which is the point: they must move together.
 */
const PLUGINS = [
  ['secure-coding', 'eslint-plugin-secure-coding'],
  ['browser-security', 'eslint-plugin-browser-security'],
  ['node-security', 'eslint-plugin-node-security'],
  ['jwt-security', 'eslint-plugin-jwt-security'],
  ['mongodb-security', 'eslint-plugin-mongodb-security'],
  ['react-a11y', 'eslint-plugin-react-a11y'],
  ['express-security', 'eslint-plugin-express-security'],
  // Owns hooks-exhaustive-deps and the react/* family.
  ['react-features', 'eslint-plugin-react-features'],
];

const loaded = await Promise.all(
  PLUGINS.map(async ([prefix, pkg]) => {
    const dist = `${PKGS}/${pkg}/dist/src/index.js`;
    if (!fs.existsSync(dist)) {
      throw new Error(`${pkg} is not built — run \`npx turbo run build\` first.\n  missing: ${dist}`);
    }
    return [prefix, (await import(dist)).default];
  }),
);

const tsParser = (await import('@typescript-eslint/parser')).default;

/**
 * Rules for one plugin under the requested preset.
 *
 * Some plugins export each rule twice — flat (`display-name`) and namespaced
 * (`react/display-name`) — so an unfiltered `Object.keys` double-counts every
 * finding. When both forms are present, only the namespaced one is enabled.
 */
function rulesFor(prefix, plugin, preset) {
  if (preset === 'recommended') {
    const rules = plugin.configs?.recommended?.rules ?? {};
    // Recommended configs are already namespaced by the plugin's own prefix,
    // which may not be the prefix we register it under here.
    return Object.fromEntries(
      Object.entries(rules).map(([id, level]) => [`${prefix}/${id.split('/').slice(1).join('/')}`, level]),
    );
  }

  const names = Object.keys(plugin.rules);
  const namespaced = names.filter((r) => r.includes('/'));
  const chosen = namespaced.length > 0 ? namespaced : names;
  return Object.fromEntries(chosen.map((r) => [`${prefix}/${r}`, 'error']));
}

/** @param {'recommended' | 'all'} preset */
export function makeEslint(preset) {
  const plugins = Object.fromEntries(loaded);
  const rules = Object.assign(
    {},
    ...loaded.map(([prefix, plugin]) => rulesFor(prefix, plugin, preset)),
  );

  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins,
        rules,
      },
      { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser } },
    ],
  });
}

export function ruleCount(preset) {
  return loaded.reduce((n, [prefix, p]) => n + Object.keys(rulesFor(prefix, p, preset)).length, 0);
}

/**
 * Every fixture of one kind, as `{ dir, file, absolute }`.
 * @param {'safe' | 'vulnerable'} kind
 */
export function fixtures(kind) {
  const out = [];
  for (const dir of fs.readdirSync(CORPUS).sort()) {
    const d = path.join(CORPUS, dir, kind);
    if (!fs.existsSync(d)) continue;
    for (const file of fs.readdirSync(d).filter((x) => /\.[jt]sx?$/.test(x))) {
      out.push({ dir, file, absolute: path.join(d, file) });
    }
  }
  return out;
}

/** Lint one fixture, returning only messages that carry a rule id. */
export async function lint(eslint, fixture) {
  const res = await eslint.lintText(fs.readFileSync(fixture.absolute, 'utf8'), {
    filePath: `case${path.extname(fixture.file)}`,
  });
  return (res[0]?.messages ?? []).filter((m) => m.ruleId);
}
