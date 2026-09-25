/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-cli-floor
 *
 * The lint half of burgee's CLI floor: the requirements whose stated behaviour
 * is a property of a program's *source*, which a runtime cannot hold for a
 * program that never adopted it.
 *
 * | burgee requirement | rule                          |
 * | :----------------- | :---------------------------- |
 * | F3 (description)   | `require-command-description` |
 * | F3, H2 (examples)  | `require-command-example`     |
 * | O3                 | `no-console-in-command`       |
 * | P1                 | `no-prompt-without-flag`      |
 *
 * Scope promise: every rule gates on the file importing a CLI host (commander,
 * yargs, burgee, or a drop-in of one) and then on the specific receiver
 * resolving to that host's export. `.action()`, `.command()` and
 * `.description()` are ordinary method names; a rule that matched them without
 * provenance would report on every router and ORM that owns one.
 *
 * @see https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noConsoleInCommand } from './rules/no-console-in-command';
import { noPromptWithoutFlag } from './rules/no-prompt-without-flag';
import { requireCommandDescription } from './rules/require-command-description';
import { requireCommandExample } from './rules/require-command-example';

export { noConsoleInCommand } from './rules/no-console-in-command';
export { noPromptWithoutFlag } from './rules/no-prompt-without-flag';
export { requireCommandDescription } from './rules/require-command-description';
export { requireCommandExample } from './rules/require-command-example';

/**
 * CLI floor rules.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // burgee O3 — command code writes through the output layer
  'no-console-in-command': noConsoleInCommand,
  // burgee P1 — every prompt is backed by a flag
  'no-prompt-without-flag': noPromptWithoutFlag,
  // burgee F3 — every command declares a description
  'require-command-description': requireCommandDescription,
  // burgee F3, H2 — every runnable command declares a single-line example
  'require-command-example': requireCommandExample,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules.
 */
withCanonicalDocsUrls('plugin-cli-floor', rules);

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-cli-floor',
    version: '0.1.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended configuration — the three rules whose evidence is a declaration.
 *
 * `no-prompt-without-flag` waits for `strict`: whether a prompt is skippable is
 * read from control flow, and burgee's intent holds it out of the default
 * until a precision study on real CLIs shows fewer than one false positive per
 * hundred prompt calls.
 */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'cli-floor': plugin,
  },
  rules: {
    'cli-floor/no-console-in-command': 'error',
    'cli-floor/require-command-description': 'error',
    'cli-floor/require-command-example': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Strict configuration — everything on.
 *
 * Derived from `rules` rather than hand-listed, so a new rule cannot be added to
 * the plugin and silently left out of the preset it is supposed to join.
 */
const strictConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'cli-floor': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [`cli-floor/${ruleName}`, 'error']),
  ),
} satisfies TSESLint.FlatConfig.Config;

export const configs = {
  recommended: recommendedConfig,
  strict: strictConfig,
};

export default {
  ...plugin,
  configs,
};
