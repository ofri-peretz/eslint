/**
 * Stryker mutation testing config (Gap A scaffold).
 *
 * **Purpose:** for every rule under src/rules/, mutate the AST checks
 * (e.g. flip `===` to `!==`, drop guard clauses, replace `Identifier`
 * with `Literal`) and verify our test suite catches the mutation.
 *
 * If a mutation survives, our tests have a blind spot — the rule could
 * have a dead or weakened branch and we wouldn't notice. Mutation score
 * is the strongest "are the tests actually testing the rule?" signal.
 *
 * Run:
 *   cd packages/eslint-plugin-secure-coding
 *   npx stryker run
 *
 * SLO (per benchmarks/README.md §1 principle #4):
 *   - Mutation score ≥ 80% per rule
 *   - 100% on rules in `recommended` config
 *
 * Status: SCAFFOLD. Stryker is not yet installed in the dev deps. To
 * activate:
 *   npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
 *
 * This config is the contract for that activation; reviewing it does not
 * require Stryker to be present.
 *
 * @see https://stryker-mutator.io/docs/stryker-js/configuration/
 */

export default {
  // Use Jest as the test runner — already configured for this plugin.
  testRunner: 'jest',
  jest: {
    config: {
      preset: 'ts-jest',
      testEnvironment: 'node',
      // Run only the rule tests during mutation; skip the integration suite
      // to keep cycle time per mutant under 30 s.
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      testRegex: 'src/rules/.*\\.test\\.ts$',
    },
  },

  // Mutate only the rule sources — not the test files, not the helpers.
  mutate: ['src/rules/**/*.ts', '!src/rules/**/*.test.ts', '!src/rules/**/__tests__/**'],

  // Standard Stryker mutators; arithmetic + boolean + conditional are the
  // most informative for AST-rule code (we mostly compare node types and
  // identifiers).
  mutator: {
    plugins: null,
    excludedMutations: [
      // String literals get noisy and rarely meaningful in lint rules.
      'StringLiteral',
    ],
  },

  // Fail the build if mutation score drops too far. SLO from README §1.
  thresholds: {
    high: 90,
    low: 75,
    break: 70,
  },

  // Concurrency tuned for a typical 8-core dev box; CI overrides via env.
  concurrency: 4,
  timeoutMS: 30_000,

  reporters: ['progress', 'clear-text', 'json', 'html'],
  htmlReporter: { fileName: '../../benchmark-results/stryker/secure-coding.html' },
  jsonReporter: { fileName: '../../benchmark-results/stryker/secure-coding.json' },

  // Coverage analysis tells Stryker which mutations to skip when a test
  // doesn't even cover that line — saves 50%+ of mutant runs.
  coverageAnalysis: 'perTest',
};
