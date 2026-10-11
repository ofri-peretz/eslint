/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require Zod schema validation for tool parameters
 * @description Ensures all tools have proper inputSchema defined with Zod
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @see OWASP ASI02: Tool Misuse & Exploitation
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath, objectKeyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { declaresOption, optionValue, sdkCallName } from '../../utils/sdk';

type MessageIds = 'missingInputSchema' | 'emptyToolsObject';

export interface Options {
  /** Allow tools without inputSchema in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireToolSchema = createRule<RuleOptions, MessageIds>({
  name: 'require-tool-schema',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-tool-schema.md',
      description: 'Require inputSchema (Zod schema) for all AI SDK tools',
      cwe: 'CWE-20',
      cvss: 7.5,
    },
    messages: {
      missingInputSchema: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Tool Missing Input Schema',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'Tool "{{toolName}}" is missing inputSchema. Unvalidated tool parameters can lead to injection attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Add inputSchema using Zod: tool({ inputSchema: z.object({ ... }), execute: ... })',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
      emptyToolsObject: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Empty Tools Object',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        description: 'Tools object is empty or has no tool definitions',
        severity: 'LOW',
        fix: 'Define tools with proper schemas or remove tools property',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            description: 'Allow tools without inputSchema in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { allowInTests } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    // Skip test files if allowed
    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    /** The key a tool sits under in a `tools: { … }` object, if any. */
    function toolKey(node: TSESTree.Node): string | null {
      const parent = node.parent;
      return parent?.type === AST_NODE_TYPES.Property ? objectKeyName(parent) : null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        const isToolHelper = callee === 'tool' || callee.endsWith('.tool');

        if (isToolHelper) {
          // inputSchema (v5+) or parameters (v4); a spread may supply either.
          const toolArg = node.arguments[0];
          if (toolArg?.type === AST_NODE_TYPES.ObjectExpression && !declaresOption(toolArg, SCHEMA_KEYS)) {
            context.report({
              node: toolArg,
              messageId: 'missingInputSchema',
              data: { toolName: toolKey(node) ?? 'unnamed tool' },
            });
          }
          return;
        }

        if (!sdkCallName(node)) return;

        const optionsArg = node.arguments[0];
        if (optionsArg?.type !== AST_NODE_TYPES.ObjectExpression) return;

        const tools = optionValue(optionsArg, 'tools');
        if (tools?.type !== AST_NODE_TYPES.ObjectExpression) return;

        // Object-literal tools here; tool(...) values are checked by the branch above.
        for (const toolDef of tools.properties) {
          if (toolDef.type !== AST_NODE_TYPES.Property) continue;
          if (toolDef.value.type !== AST_NODE_TYPES.ObjectExpression) continue;
          if (!declaresOption(toolDef.value, SCHEMA_KEYS)) {
            context.report({
              node: toolDef.value,
              messageId: 'missingInputSchema',
              data: { toolName: objectKeyName(toolDef) ?? 'unknown' },
            });
          }
        }
      },
    };
  },
});

const SCHEMA_KEYS = ['inputSchema', 'parameters'];
