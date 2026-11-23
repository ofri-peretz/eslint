/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-test-integrity
 *
 * Lint rules for the ways a test suite is made to pass without the code
 * passing: a focused test, an unexplained skip, a fixed sleep, a retry.
 * "May not skip flaky tests, add sleeps, or retry until they pass" is a rule
 * every agent is told in prose; here it is a lint rule instead.
 *
 * | rule                  | catches                                          |
 * | :-------------------- | :----------------------------------------------- |
 * | `no-focused-test`     | `.only`, `fit`, `fdescribe`                      |
 * | `no-unexplained-skip` | `.skip`, `.todo`, `xit`, constant `skipIf`       |
 * | `no-fixed-sleep`      | `setTimeout` promises, `sleep(n)`, `waitForTimeout` |
 * | `no-test-retry`       | `retry` / `retries` in tests and runner configs  |
 *
 * The changed-lines checks a rule cannot see (a weakened assertion, a snapshot
 * rewritten with no reason) ship as the `test-integrity-diff` bin.
 *
 * Scope promise: a call counts as a test only when its root is a test-runner
 * name that is an unbound global or imported from a test-runner module.
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noFixedSleep } from './rules/no-fixed-sleep';
import { noFocusedTest } from './rules/no-focused-test';
import { noTestRetry } from './rules/no-test-retry';
import { noUnexplainedSkip } from './rules/no-unexplained-skip';

export { noFixedSleep } from './rules/no-fixed-sleep';
export { noFocusedTest } from './rules/no-focused-test';
export { noTestRetry } from './rules/no-test-retry';
export { noUnexplainedSkip } from './rules/no-unexplained-skip';

/**
 * Test-integrity rules.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  'no-fixed-sleep': noFixedSleep,
  'no-focused-test': noFocusedTest,
  'no-test-retry': noTestRetry,
  'no-unexplained-skip': noUnexplainedSkip,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules.
 */
withCanonicalDocsUrls('plugin-test-integrity', rules);

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-test-integrity',
    version: '0.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Every rule, as errors. Derived from `rules` rather than hand-listed, so a
 * new rule cannot be added to the plugin and silently left out of the preset.
 */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'test-integrity': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `test-integrity/${ruleName}`,
      'error',
    ]),
  ),
} satisfies TSESLint.FlatConfig.Config;

/**
 * Every rule, as warnings — the adoption preset. The intent ships the rules at
 * `warn` in consumers and moves them to `error` by decision once they have run
 * clean on real code.
 */
const adoptionConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'test-integrity': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `test-integrity/${ruleName}`,
      'warn',
    ]),
  ),
} satisfies TSESLint.FlatConfig.Config;

export const configs = {
  recommended: recommendedConfig,
  adoption: adoptionConfig,
};

export default {
  ...plugin,
  configs,
};
