/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The one oxmutate config every plugin shares. Do not copy it into a package —
 * run it through `npm run mutation -- --plugin <name>` (scripts/mutation.mts),
 * which sets the cwd to the plugin, picks the files to mutate (MUTATION_MUTATE),
 * and grades the result against .agent/mutation-baseline.json.
 *
 * What it mutates: rule sources only (`src/rules/**`), never tests, plus the
 * shared utils the rules import. A survivor here means "a rule's code changed
 * and no fixture noticed" — see docs/MUTATION_TESTING.md for how to read one
 * as a missing valid case (FP risk) or a missing invalid case (FN risk).
 *
 * oxmutate runs in place inside the plugin's own vitest config, so there is no
 * sandbox and no re-rooted config. A rule's `meta` block is mutated but not
 * graded: scripts/mutation/ignore-rule-meta.ts marks those mutants Ignored.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const plugin = process.env.MUTATION_PLUGIN ?? 'unknown';
const reportDir = path.join(ROOT, 'benchmark-results', 'mutation', plugin);

export default {
  vitest: { configFile: 'vitest.config.mts' },

  // MUTATION_MUTATE (newline-separated) narrows it per run: --rules, --since.
  mutate: process.env.MUTATION_MUTATE?.split('\n') ?? [
    'src/rules/**/*.ts',
    '!src/rules/**/*.{test,spec}.ts',
    '!src/rules/**/__tests__/**',
    // Shared helpers the rules import, graded as `utils/<file>`.
    'src/utils/*.ts',
    '!src/utils/*.{test,spec}.ts',
  ],

  // Stryker 10's mutant set exactly, so scores banked under Stryker still
  // compare: no mutants inside `as` casts or enums.
  strykerCompat: true,
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
  // well before cores - 1. CI overrides with --concurrency.
  concurrency: 2,
  // Stryker's slack: rule tests parse real files and the first case per
  // worker pays the parser's warm-up.
  timeoutMS: 5_000,
  timeoutFactor: 2,

  incremental: process.env.MUTATION_FORCE !== '1',
  incrementalFile: path.join(
    ROOT,
    '.cache',
    'mutation',
    `${plugin}.incremental.json`,
  ),

  reporters: ['clear-text', 'json', 'html'],
  htmlReporter: { fileName: path.join(reportDir, 'index.html') },
  jsonReporter: { fileName: path.join(reportDir, 'mutation.json') },

  // The ratchet is per rule, in scripts/mutation.mts. A single plugin-wide
  // `break` would hide one rule's drop behind another's gain, so it is off.
  thresholds: { high: 80, low: 60, break: null },
};
