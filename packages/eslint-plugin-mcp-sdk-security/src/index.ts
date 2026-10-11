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
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

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
 * Scope — the tool-registration surface: tool arguments reaching a process,
 * handlers reading arguments no schema declares, and model-facing
 * descriptions built at runtime. Transport auth, resource path traversal and
 * tool-output handling follow.
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

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-mcp-sdk-security', rules);


export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-mcp-sdk-security',
    version: '0.4.3',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset membership — decided by measured false-positive profile, not by
 * "every rule on".
 *
 *   - `minimal`: the two rules whose every finding is a defect by
 *     construction — a tool argument naming the process that runs, and a
 *     schema-less handler reading arguments the SDK never passes it.
 *   - `recommended`: adds `no-unvalidated-tool-args` — a destructured key the
 *     schema does not declare is stripped (or, on a loose schema, passed
 *     through unvalidated) — and `no-tool-description-injection`, which
 *     resolves consts and relative imports and reports only description text
 *     it can show is dynamic. No false positive was found for either in the
 *     2026-10 FP/FN review.
 *   - `strict`: everything. Today that equals `recommended`; it is where a
 *     rule lands before its false-positive profile is measured.
 *
 * README.md's preset table and rules-table 💼 column are locked to these lists
 * by `src/index.test.ts`.
 */
const minimalRules: TSESLint.FlatConfig.Rules = {
  'mcp-sdk-security/no-command-injection-in-tool': 'error',
  'mcp-sdk-security/require-tool-input-schema': 'error',
};

const recommendedRules: TSESLint.FlatConfig.Rules = {
  'mcp-sdk-security/no-command-injection-in-tool': 'error',
  'mcp-sdk-security/no-tool-description-injection': 'error',
  'mcp-sdk-security/no-unvalidated-tool-args': 'error',
  'mcp-sdk-security/require-tool-input-schema': 'error',
};

/**
 * Strict is derived from `rules` rather than hand-listed, so a new rule cannot
 * be added to the plugin and silently left out of the preset it is supposed to
 * join. Promotion to `minimal` / `recommended` stays manual and waits on a
 * measured false-positive profile.
 */
const strictRules: TSESLint.FlatConfig.Rules = Object.fromEntries(
  Object.keys(rules).map((ruleName) => [`mcp-sdk-security/${ruleName}`, 'error']),
);

// Written as inline objects so scripts/sync-readme-rules.ts can read
// `recommended: { … rules: recommendedRules }` to fill the README's 💼 column.
export const configs: Record<
  'minimal' | 'recommended' | 'strict',
  TSESLint.FlatConfig.Config
> = {
  minimal: {
    plugins: { 'mcp-sdk-security': plugin },
    rules: minimalRules,
  },
  recommended: {
    plugins: { 'mcp-sdk-security': plugin },
    rules: recommendedRules,
  },
  strict: {
    plugins: { 'mcp-sdk-security': plugin },
    rules: strictRules,
  },
};

export default {
  ...plugin,
  configs,
};
