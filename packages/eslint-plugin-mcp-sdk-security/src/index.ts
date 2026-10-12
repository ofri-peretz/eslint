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

import { noCodeInjectionInTool } from './rules/no-code-injection-in-tool';
import { noCommandInjectionInTool } from './rules/no-command-injection-in-tool';
import { noCredentialLeakInTool } from './rules/no-credential-leak-in-tool';
import { noDuplicateToolName } from './rules/no-duplicate-tool-name';
import { noPathTraversalInTool } from './rules/no-path-traversal-in-tool';
import { noPredictableSessionId } from './rules/no-predictable-session-id';
import { noSharedStatelessTransport } from './rules/no-shared-stateless-transport';
import { noSqlInjectionInTool } from './rules/no-sql-injection-in-tool';
import { noSsrfInTool } from './rules/no-ssrf-in-tool';
import { noToolDescriptionInjection } from './rules/no-tool-description-injection';
import { noUntrustedStdioCommand } from './rules/no-untrusted-stdio-command';
import { noUntrustedToolMetadataInPrompt } from './rules/no-untrusted-tool-metadata-in-prompt';
import { noUnvalidatedToolArgs } from './rules/no-unvalidated-tool-args';
import { requireHttpTransportHardening } from './rules/require-http-transport-hardening';
import { requireToolInputSchema } from './rules/require-tool-input-schema';

export { noCodeInjectionInTool } from './rules/no-code-injection-in-tool';
export { noCommandInjectionInTool } from './rules/no-command-injection-in-tool';
export { noCredentialLeakInTool } from './rules/no-credential-leak-in-tool';
export { noDuplicateToolName } from './rules/no-duplicate-tool-name';
export { noPathTraversalInTool } from './rules/no-path-traversal-in-tool';
export { noPredictableSessionId } from './rules/no-predictable-session-id';
export { noSharedStatelessTransport } from './rules/no-shared-stateless-transport';
export { noSqlInjectionInTool } from './rules/no-sql-injection-in-tool';
export { noSsrfInTool } from './rules/no-ssrf-in-tool';
export { noToolDescriptionInjection } from './rules/no-tool-description-injection';
export { noUntrustedStdioCommand } from './rules/no-untrusted-stdio-command';
export { noUntrustedToolMetadataInPrompt } from './rules/no-untrusted-tool-metadata-in-prompt';
export { noUnvalidatedToolArgs } from './rules/no-unvalidated-tool-args';
export { requireHttpTransportHardening } from './rules/require-http-transport-hardening';
export { requireToolInputSchema } from './rules/require-tool-input-schema';

/**
 * MCP SDK security rules.
 *
 * Scope — the SDK's surfaces:
 *   - tool handlers (and resource-template callbacks): client-chosen values
 *     reaching a process, a path, a URL, SQL text or `eval`; credentials in a
 *     result; the schema/handler contract; duplicate tool names;
 *   - model-facing text: descriptions built from client, remote or file text;
 *   - HTTP transports: DNS-rebinding protection, authentication, stateless
 *     sharing and session IDs;
 *   - clients: server metadata written into a prompt, and the command a stdio
 *     transport spawns.
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // CWE-95: Eval Injection
  'no-code-injection-in-tool': noCodeInjectionInTool,
  // CWE-78: OS Command Injection
  'no-command-injection-in-tool': noCommandInjectionInTool,
  // CWE-200: Exposure of Sensitive Information (environment, bearer token, token passthrough)
  'no-credential-leak-in-tool': noCredentialLeakInTool,
  // CWE-694: Use of Multiple Resources with Duplicate Identifier
  'no-duplicate-tool-name': noDuplicateToolName,
  // CWE-22: Path Traversal
  'no-path-traversal-in-tool': noPathTraversalInTool,
  // CWE-330: Use of Insufficiently Random Values
  'no-predictable-session-id': noPredictableSessionId,
  // CWE-488: Exposure of Data Element to Wrong Session (CVE-2026-25536)
  'no-shared-stateless-transport': noSharedStatelessTransport,
  // CWE-89: SQL Injection
  'no-sql-injection-in-tool': noSqlInjectionInTool,
  // CWE-918: Server-Side Request Forgery
  'no-ssrf-in-tool': noSsrfInTool,
  // CWE-1427: Improper Neutralization of Input Used for LLM Prompting
  'no-tool-description-injection': noToolDescriptionInjection,
  // CWE-78: OS Command Injection — the client spawning a server
  'no-untrusted-stdio-command': noUntrustedStdioCommand,
  // CWE-1427: tool poisoning — server metadata in a client prompt
  'no-untrusted-tool-metadata-in-prompt': noUntrustedToolMetadataInPrompt,
  // CWE-20: Improper Input Validation — the handler side of the schema contract
  'no-unvalidated-tool-args': noUnvalidatedToolArgs,
  // CWE-346: Origin Validation Error (DNS rebinding) and CWE-306
  'require-http-transport-hardening': requireHttpTransportHardening,
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
    version: '0.5.0',
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
 *   - `recommended`: adds `no-unvalidated-tool-args`,
 *     `no-tool-description-injection`, and the eleven rules from the 2026-10
 *     missing-detections pass. Each of those resolves its sinks and SDK
 *     classes through the module that defines them, follows only values it
 *     can prove came from the client (or a server's self-description), and
 *     was run over the pinned real-world corpus before it landed here. Rules
 *     at CVSS 7.0 and above are `error`; `no-duplicate-tool-name` (5.3) is
 *     `warn`.
 *   - `strict`: every rule, at its `recommended` level where it has one.
 *
 * README.md's preset table and rules-table 💼 column are locked to these lists
 * by `src/index.test.ts`.
 */
const minimalRules: TSESLint.FlatConfig.Rules = {
  'mcp-sdk-security/no-command-injection-in-tool': 'error',
  'mcp-sdk-security/require-tool-input-schema': 'error',
};

const recommendedRules: TSESLint.FlatConfig.Rules = {
  'mcp-sdk-security/no-code-injection-in-tool': 'error',
  'mcp-sdk-security/no-command-injection-in-tool': 'error',
  'mcp-sdk-security/no-credential-leak-in-tool': 'error',
  'mcp-sdk-security/no-duplicate-tool-name': 'warn',
  'mcp-sdk-security/no-path-traversal-in-tool': 'error',
  'mcp-sdk-security/no-predictable-session-id': 'error',
  'mcp-sdk-security/no-shared-stateless-transport': 'error',
  'mcp-sdk-security/no-sql-injection-in-tool': 'error',
  'mcp-sdk-security/no-ssrf-in-tool': 'error',
  'mcp-sdk-security/no-tool-description-injection': 'error',
  'mcp-sdk-security/no-untrusted-stdio-command': 'error',
  'mcp-sdk-security/no-untrusted-tool-metadata-in-prompt': 'error',
  'mcp-sdk-security/no-unvalidated-tool-args': 'error',
  'mcp-sdk-security/require-http-transport-hardening': 'error',
  'mcp-sdk-security/require-tool-input-schema': 'error',
};

/**
 * Strict is derived from `rules` rather than hand-listed, so a new rule cannot
 * be added to the plugin and silently left out of the preset it is supposed to
 * join. A rule keeps its `recommended` level (a CVSS-below-7 rule stays
 * `warn`); one not in `recommended` is `error`. Promotion to `minimal` /
 * `recommended` stays manual and waits on a measured false-positive profile.
 */
const strictRules: TSESLint.FlatConfig.Rules = {
  ...Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `mcp-sdk-security/${ruleName}`,
      'error',
    ]),
  ),
  ...recommendedRules,
};

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
