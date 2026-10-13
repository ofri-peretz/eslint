/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The one Stryker config every plugin shares. Do not copy it into a package —
 * run it through `npm run mutation -- --plugin <name>` (scripts/mutation.mts),
 * which sets the cwd to the plugin, picks the files to mutate, and grades the
 * result against .agent/mutation-baseline.json.
 *
 * What it mutates: rule sources only (`src/rules/**`), never tests, never the
 * shared utils. A survivor here means "a rule's code changed and no fixture
 * noticed" — see docs/MUTATION_TESTING.md for how to read one as a missing
 * valid case (FP risk) or a missing invalid case (FN risk).
 *
 * Why there is a separate vitest config: Stryker copies the plugin into
 * `<plugin>/.stryker-tmp/sandbox-*`, two levels deeper than the real package,
 * and every plugin's vitest config resolves `../eslint-devkit` and
 * `../../vitest.global-setup.ts` relative to itself. Those paths do not exist
 * from inside the sandbox. scripts/mutation/vitest.config.mts re-roots the
 * plugin's own config on the sandbox instead of rewriting 20 package configs.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const plugin = process.env.MUTATION_PLUGIN ?? 'unknown';
const reportDir = path.join(ROOT, 'benchmark-results', 'stryker', plugin);

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner',
    path.join(HERE, 'ignore-rule-meta.mjs'),
  ],
  ignorers: ['rule-meta'],
  vitest: {
    configFile: path.join(HERE, 'vitest.config.mts'),
    // `related` asks vitest for the tests that import a mutated file. Rule
    // tests import the plugin barrel as often as the rule itself, so the
    // import graph is the right filter — and perTest coverage narrows it to
    // the cases that actually executed the mutated line.
    related: true,
  },
  coverageAnalysis: 'perTest',

  // Overridden per run by scripts/mutation.mts (`--since` narrows it).
  mutate: [
    'src/rules/**/*.ts',
    '!src/rules/**/*.{test,spec}.ts',
    '!src/rules/**/__tests__/**',
  ],
  // Keep the sandbox small: the plugin's docs, specs and build output are not
  // inputs to its tests.
  ignorePatterns: [
    'dist',
    'coverage',
    'test-results',
    'docs',
    'benchmark',
    'reports',
  ],

  mutator: {
    excludedMutations: [
      // Mutating a messageId / meta string only proves RuleTester compares
      // messageIds, which it always does. Detection logic that compares
      // strings (`node.name === 'query'`) is still mutated via the
      // EqualityOperator / ConditionalExpression mutators.
      'StringLiteral',
    ],
  },

  // Conservative by default: endpoint security on dev machines saturates CPU
  // well before Stryker's default (cores - 1). CI overrides with --concurrency.
  concurrency: 2,
  timeoutMS: 30_000,
  timeoutFactor: 2,
  disableTypeChecks: 'src/**/*.ts',

  incremental: true,
  incrementalFile: path.join(
    ROOT,
    '.cache',
    'mutation',
    `${plugin}.incremental.json`,
  ),
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',

  reporters: ['progress', 'clear-text', 'json', 'html'],
  clearTextReporter: {
    allowEmojis: false,
    logTests: false,
    reportScoreTable: true,
    reportMutants: false,
  },
  htmlReporter: { fileName: path.join(reportDir, 'index.html') },
  jsonReporter: { fileName: path.join(reportDir, 'mutation.json') },

  // The ratchet is per rule, in scripts/mutation.mts. Stryker's own `break`
  // is a single plugin-wide number and would hide one rule's drop behind
  // another's gain, so it is off.
  thresholds: { high: 80, low: 60, break: null },
};
