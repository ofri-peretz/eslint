/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-grpc-security
 *
 * Security rules for Node gRPC servers (`@grpc/grpc-js` and its ecosystem).
 *
 * Scope promise: every rule here gates on a gRPC package being imported in the
 * file and on the binding a call resolves to, never on a method name alone.
 * `addToServer` is an ordinary method name.
 *
 * @see https://grpc.io/docs/guides/auth/
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noUnguardedReflection } from './rules/no-unguarded-reflection';

export { noUnguardedReflection } from './rules/no-unguarded-reflection';

/**
 * gRPC security rules.
 *
 * 0.1.x scope: server reflection registered with no guard, which hands any
 * client the full list of services on the listener, internal ones included.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // CWE-306: Missing Authentication for Critical Function
  'no-unguarded-reflection': noUnguardedReflection,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above. A statement rather
 * than a wrapping call: the docs stats generator locates the rule map with
 * `export const rules ... = {`.
 */
withCanonicalDocsUrls('plugin-grpc-security', rules);

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-grpc-security',
    version: '0.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/** Minimal configuration: the one rule nobody should ship without. */
const minimalConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'grpc-security': plugin,
  },
  rules: {
    'grpc-security/no-unguarded-reflection': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/** Recommended configuration: the balanced default. */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'grpc-security': plugin,
  },
  rules: {
    'grpc-security/no-unguarded-reflection': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/** Strict configuration: everything on, derived from `rules`. */
const strictConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'grpc-security': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `grpc-security/${ruleName}`,
      'error',
    ]),
  ),
} satisfies TSESLint.FlatConfig.Config;

export const configs = {
  minimal: minimalConfig,
  recommended: recommendedConfig,
  strict: strictConfig,
};

export default {
  ...plugin,
  configs,
};
