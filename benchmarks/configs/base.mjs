/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * The shared half of every per-rule lint setup.
 *
 * Each rule gets its own config file next to this one, three lines long, so any
 * number we publish can be reproduced with a single command by someone who does
 * not trust us:
 *
 *   npx eslint --config benchmarks/configs/<plugin>__<rule>.config.mjs \
 *              --no-config-lookup <path>
 *
 * The file set lives here rather than in each config because three instruments
 * in this repo measured the same rule against three different file lists before
 * it was centralised — and a comparison between tools that saw different files
 * is not a comparison.
 *
 * `configs` is a NAMED export on these builds while `rules` sits on the default,
 * so the usual `import plugin from …` shorthand silently yields an object with
 * no configs. Each generated file imports the namespace and takes `rules`
 * explicitly.
 */
import tsParser from '@typescript-eslint/parser';

/** Extensions a JavaScript/TypeScript rule can meaningfully see. */
export const FILES = [
  '**/*.js',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
  '**/*.ts',
  '**/*.tsx',
  '**/*.mts',
  '**/*.cts',
];

/**
 * What every measurement excludes, and why.
 *
 * Anchored one level inside a repository directory. A bare `'**​/benchmarks/**'`
 * also matches the corpus's own location under `benchmarks/.real-source-cache`
 * and silently excludes every file — which produced a run reporting 0 findings
 * for five rules, and read exactly like five perfect rules.
 */
export const IGNORES = [
  '**/node_modules/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.chunk.js',
  '**/*.test.*',
  '**/*.spec.*',
  '*/*/dist/**',
  '*/*/build/**',
  '*/*/coverage/**',
  '*/*/vendor/**',
  '*/*/test/**',
  '*/*/tests/**',
  '*/*/__tests__/**',
  '*/*/fixtures/**',
  '*/*/docs/**',
  '*/*/examples/**',
  '*/*/benchmarks/**',
  '*/*/.yarn/**',
];

export const LANGUAGE_OPTIONS = {
  parser: tsParser,
  ecmaVersion: 2022,
  sourceType: 'module',
};

/**
 * One rule, at `error`, and nothing else — so a finding can only have come from
 * the rule named in the filename.
 */
export function forRule(prefix, ruleName, rules) {
  return [
    {
      files: FILES,
      ignores: IGNORES,
      languageOptions: LANGUAGE_OPTIONS,
      plugins: { [prefix]: { rules } },
      rules: { [`${prefix}/${ruleName}`]: 'error' },
    },
  ];
}
