/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-mcp-sdk-security
 *
 * Security rules for servers and clients built on `@modelcontextprotocol/sdk`.
 *
 * Scope promise: every rule here gates on the MCP SDK being imported. This
 * plugin lints the SDK's API shapes — `registerTool`, transports, handler
 * signatures — not the MCP wire protocol, which is not visible from source.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

import type { TSESLint } from '@interlace/eslint-devkit';

import { noCommandInjectionInTool } from './rules/no-command-injection-in-tool';
import { noToolDescriptionInjection } from './rules/no-tool-description-injection';
import { noUnvalidatedToolArgs } from './rules/no-unvalidated-tool-args';
import { requireToolInputSchema } from './rules/require-tool-input-schema';

export { noCommandInjectionInTool } from './rules/no-command-injection-in-tool';
export { noToolDescriptionInjection } from './rules/no-tool-description-injection';
export { noUnvalidatedToolArgs } from './rules/no-unvalidated-tool-args';
export { requireToolInputSchema } from './rules/require-tool-input-schema';

/**
 * MCP SDK security rules.
 *
 * 0.1.x scope — the tool-registration surface. A tool registered without an
 * input schema hands its handler unvalidated client-supplied arguments, which
 * is the entry point for the tool-poisoning and argument-injection classes.
 * Transport auth, resource path traversal and tool-output handling follow.
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // CWE-78: OS Command Injection
  'no-command-injection-in-tool': noCommandInjectionInTool,
  // CWE-1427: Improper Neutralization of Input Used for LLM Prompting
  'no-tool-description-injection': noToolDescriptionInjection,
  // CWE-20: Improper Input Validation — the handler side of the schema contract
  'no-unvalidated-tool-args': noUnvalidatedToolArgs,
  // CWE-20: Improper Input Validation
  'require-tool-input-schema': requireToolInputSchema,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-mcp-sdk-security',
    version: '0.3.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/** Minimal configuration — for gradual adoption. */
const minimalConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'mcp-sdk-security': plugin,
  },
  rules: {
    'mcp-sdk-security/require-tool-input-schema': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/** Recommended configuration — the balanced default. */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'mcp-sdk-security': plugin,
  },
  rules: {
    'mcp-sdk-security/require-tool-input-schema': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Strict configuration — everything on.
 *
 * Derived from `rules` rather than hand-listed, so a new rule cannot be added
 * to the plugin and silently left out of the preset it is supposed to join.
 * Promotion to `minimal` / `recommended` stays manual and waits on a measured
 * false-positive profile.
 */
const strictConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'mcp-sdk-security': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(rules).map((ruleName) => [`mcp-sdk-security/${ruleName}`, 'error']),
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
