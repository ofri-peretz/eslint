/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-supabase-security
 *
 * Security rules for applications built on Supabase.
 *
 * Scope promise: every rule here gates on a `@supabase/*` package being imported
 * in the file. `.from()`, `.rpc()` and `.auth` are ordinary member names, and a
 * plugin that reported on them without evidence would fire on any codebase that
 * happens to own them.
 *
 * What this plugin does not do: infer whether a table has Row Level Security
 * enabled, or whether a policy covers a given query. That lives in the database,
 * not in the source, and a rule that guessed at it would be a rule about naming
 * conventions. Every rule below keys on a call shape or on an environment
 * variable's name — things that are actually in the file.
 *
 * @see https://supabase.com/docs/guides/api/api-keys
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noDynamicRpcName } from './rules/no-dynamic-rpc-name';
import { noPublicStorageBucket } from './rules/no-public-storage-bucket';
import { noServiceRoleKeyInClient } from './rules/no-service-role-key-in-client';
import { requireAuthErrorCheck } from './rules/require-auth-error-check';

export { noDynamicRpcName } from './rules/no-dynamic-rpc-name';
export { noPublicStorageBucket } from './rules/no-public-storage-bucket';
export { noServiceRoleKeyInClient } from './rules/no-service-role-key-in-client';
export { requireAuthErrorCheck } from './rules/require-auth-error-check';

/**
 * Supabase security rules.
 *
 * 0.1.x scope — the four mistakes that are visible from a single file and cost
 * the whole database when made. `no-service-role-key-in-client` is the reason
 * the package exists: `service_role` bypasses Row Level Security completely, and
 * the line that leaks it is indistinguishable from every other `createClient`
 * call. Realtime channel authorisation and Edge Function secrets follow.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // CWE-913: Improper Control of Dynamically-Managed Code Resources
  'no-dynamic-rpc-name': noDynamicRpcName,
  // CWE-732: Incorrect Permission Assignment for Critical Resource
  'no-public-storage-bucket': noPublicStorageBucket,
  // CWE-798: Use of Hard-coded Credentials — the total RLS bypass
  'no-service-role-key-in-client': noServiceRoleKeyInClient,
  // CWE-287: Improper Authentication
  'require-auth-error-check': requireAuthErrorCheck,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-supabase-security', rules);

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-supabase-security',
    version: '0.1.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Minimal configuration — the one rule nobody should ship without.
 *
 * A service_role key in the browser bundle is not a code-quality finding; it is
 * unrestricted read and write on the whole database for anyone who opens
 * devtools. It is on its own here so that adopting this plugin costs one rule.
 */
const minimalConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'supabase-security': plugin,
  },
  rules: {
    'supabase-security/no-service-role-key-in-client': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Recommended configuration — the balanced default.
 *
 * The three rules whose false-positive profile is structural: each abstains when
 * the node cannot be read (a spread, a computed key, a missing import) rather
 * than guessing. `no-public-storage-bucket` waits for `strict` because a public
 * bucket is sometimes exactly what a project wants.
 */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'supabase-security': plugin,
  },
  rules: {
    'supabase-security/no-service-role-key-in-client': 'error',
    'supabase-security/no-dynamic-rpc-name': 'error',
    'supabase-security/require-auth-error-check': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Strict configuration — everything on.
 *
 * Derived from `rules` rather than hand-listed, so a new rule cannot be added to
 * the plugin and silently left out of the preset it is supposed to join.
 * Promotion into `minimal` / `recommended` stays manual and waits on a measured
 * false-positive profile.
 */
const strictConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'supabase-security': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `supabase-security/${ruleName}`,
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
