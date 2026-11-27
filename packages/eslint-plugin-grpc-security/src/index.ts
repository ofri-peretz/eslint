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
 * Scope promise: every rule here gates on gRPC structure, never on a method
 * name alone. `no-unguarded-reflection` resolves the call to a reflection
 * package's export. `no-identity-from-metadata` needs a handler registered
 * with `.addService(service, implementation)` reading its call's `metadata`;
 * servers often load `@grpc/grpc-js` through a wrapper, so the import itself
 * is not required.
 *
 * @see https://grpc.io/docs/guides/auth/
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

import { noErrorDetailLeak } from './rules/no-error-detail-leak';
import { noIdentityFromMetadata } from './rules/no-identity-from-metadata';
import { noInsecureChannelCredentials } from './rules/no-insecure-channel-credentials';
import { noInsecureServerCredentials } from './rules/no-insecure-server-credentials';
import { noUnboundedMessageSize } from './rules/no-unbounded-message-size';
import { noUnguardedReflection } from './rules/no-unguarded-reflection';

export { noErrorDetailLeak } from './rules/no-error-detail-leak';
export { noIdentityFromMetadata } from './rules/no-identity-from-metadata';
export { noInsecureChannelCredentials } from './rules/no-insecure-channel-credentials';
export { noInsecureServerCredentials } from './rules/no-insecure-server-credentials';
export { noUnboundedMessageSize } from './rules/no-unbounded-message-size';
export { noUnguardedReflection } from './rules/no-unguarded-reflection';

/**
 * gRPC security rules.
 *
 * 0.1.x scope: server reflection registered with no guard, which hands any
 * client the full list of services on the listener, internal ones included;
 * a caller identity read from client-settable metadata and authorized on; an
 * unbounded message size; a caught error's text sent to the client; and
 * plaintext transport where the file proves exposure or a secret on the wire.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // CWE-209: Generation of Error Message Containing Sensitive Information
  'no-error-detail-leak': noErrorDetailLeak,
  // CWE-290: Authentication Bypass by Spoofing
  'no-identity-from-metadata': noIdentityFromMetadata,
  // CWE-319: Cleartext Transmission of Sensitive Information
  'no-insecure-channel-credentials': noInsecureChannelCredentials,
  'no-insecure-server-credentials': noInsecureServerCredentials,
  // CWE-306: Missing Authentication for Critical Function
  'no-unguarded-reflection': noUnguardedReflection,
  // CWE-770: Allocation of Resources Without Limits or Throttling
  'no-unbounded-message-size': noUnboundedMessageSize,
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
    version: '0.4.0',
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
    'grpc-security/no-identity-from-metadata': 'error',
    'grpc-security/no-unbounded-message-size': 'error',
    'grpc-security/no-error-detail-leak': 'error',
    'grpc-security/no-insecure-server-credentials': 'error',
    'grpc-security/no-insecure-channel-credentials': 'error',
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
