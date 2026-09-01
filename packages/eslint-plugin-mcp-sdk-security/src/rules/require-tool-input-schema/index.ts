/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require an input schema when registering an MCP tool
 * @description A tool registered without an input schema receives whatever
 * arguments the client sends. The handler then operates on unvalidated,
 * attacker-influenced input — the entry point for the MCP tool-poisoning and
 * argument-injection classes.
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';

type MessageIds = 'missingInputSchema';

const REGISTER_TOOL = 'registerTool';
const LEGACY_TOOL = 'tool';

/** Node types that stand in for a tool handler in the legacy `tool()` arity. */
const HANDLER_NODE_TYPES = new Set<string>([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'Identifier',
]);

type SchemaVerdict = 'declared' | 'missing' | 'unreadable';

/**
 * Whether the config object literal declares `inputSchema`.
 *
 * Returns `unreadable` for a spread: the schema may well be in the spread
 * source, which is not visible from this node. Reporting there would flag
 * correct code, so the rule stays silent instead.
 */
function readInputSchema(config: TSESTree.ObjectExpression): SchemaVerdict {
  for (const prop of config.properties) {
    if (prop.type === 'SpreadElement') return 'unreadable';
    if (prop.computed) continue;
    if (prop.key.type === 'Identifier' && prop.key.name === 'inputSchema')
      return 'declared';
    if (prop.key.type === 'Literal' && prop.key.value === 'inputSchema')
      return 'declared';
  }
  return 'missing';
}

export const requireToolInputSchema = createRule<[], MessageIds>({
  name: 'require-tool-input-schema',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/require-tool-input-schema.md',
      description: 'Require an input schema when registering an MCP tool',
      cwe: 'CWE-20',
      cvss: 7.5,
    },
    messages: {
      missingInputSchema: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Registered Without an Input Schema',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'Tool "{{tool}}" is registered without an input schema, so its handler receives unvalidated client-supplied arguments',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Declare the accepted shape: registerTool("{{tool}}", { inputSchema: { path: z.string() } }, handler)',
        documentationLink:
          'https://modelcontextprotocol.io/docs/concepts/tools',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Asked once, up front, over the whole AST. The two-visitor gate this
    // replaces saw ESM and `require()` only, so import-equals and dynamic
    // `import()` files ran no rule at all.
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    // Registrations are collected and judged at Program:exit so the rule does
    // not depend on the import appearing above them.
    const candidates: Array<{ node: TSESTree.CallExpression; tool: string }> =
      [];

    function toolNameOf(node: TSESTree.CallExpression): string {
      const first = node.arguments[0];
      if (first?.type === 'Literal' && typeof first.value === 'string')
        return first.value;
      return 'unknown';
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression' || node.callee.computed)
          return;
        if (node.callee.property.type !== 'Identifier') return;

        const method = node.callee.property.name;

        if (method === REGISTER_TOOL) {
          const config = node.arguments[1];
          // A config passed by reference could carry the schema — not readable
          // here, so not reported.
          if (config?.type !== 'ObjectExpression') return;
          if (readInputSchema(config) === 'missing') {
            candidates.push({ node, tool: toolNameOf(node) });
          }
          return;
        }

        if (method === LEGACY_TOOL && node.arguments.length === 2) {
          // tool(name, handler) is the only legacy arity with no schema slot
          // between the name and the callback. The length check above is what
          // keeps `tool(name, schemaVariable, handler)` from being flagged.
          const handler = node.arguments[1] as TSESTree.CallExpressionArgument;
          if (HANDLER_NODE_TYPES.has(handler.type)) {
            candidates.push({ node, tool: toolNameOf(node) });
          }
        }
      },

      'Program:exit'() {
        for (const { node, tool } of candidates) {
          context.report({
            node,
            messageId: 'missingInputSchema',
            data: { tool },
          });
        }
      },
    };
  },
});
