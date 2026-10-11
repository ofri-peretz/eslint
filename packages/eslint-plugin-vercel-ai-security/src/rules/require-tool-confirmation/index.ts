/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require human confirmation for destructive tool operations
 * @description Ensures tools that perform destructive actions have confirmation
 * @see OWASP ASI09: Human-Agent Trust Exploitation
 * @see OWASP LLM06: Excessive Agency
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, objectKeyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeName, optionValue } from '../../utils/sdk';

type MessageIds = 'missingConfirmation';

export interface Options {
  /** Patterns that suggest destructive operations */
  destructivePatterns?: string[];
}

type RuleOptions = [Options?];

export const requireToolConfirmation = createRule<RuleOptions, MessageIds>({
  name: 'require-tool-confirmation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-tool-confirmation.md',
      description: 'Require human confirmation for destructive tool operations (delete, transfer, execute)',
      cwe: 'CWE-862',
      cvss: 7,
    },
    messages: {
      missingConfirmation: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Destructive Tool Without Confirmation',
        cwe: 'CWE-862',
        owasp: 'A01:2021',
        cvss: 7.0,
        description: 'Tool "{{toolName}}" performs destructive operation "{{operation}}" without requiring confirmation.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Add needsApproval: true to the tool (or toolApproval on the call), or omit execute so the client confirms',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          destructivePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns that suggest destructive operations',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      // Whole words of the tool name. `create`, `post`, `change` and `run` were
      // dropped: `createChart`, `runReport` and `changeTheme` are not
      // destructive, and with the defaults finally applied (they never were —
      // see the audit) they would have fired on ordinary read/render tools.
      destructivePatterns: [
        'delete', 'remove', 'drop', 'truncate', 'destroy',
        'transfer', 'send', 'pay', 'withdraw', 'purchase',
        'execute', 'exec', 'eval', 'spawn', 'shell',
        'update', 'modify', 'alter', 'insert', 'write',
      ],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // `defaultOptions` is merged in before `create` runs. Reading
    // `context.options` instead (as this rule did) silently replaced the
    // documented defaults with a shorter hard-coded list.
    const { destructivePatterns } = options as Required<Options>;

    /** The tool's definition object: `{ ... }` or the argument of `tool({ ... })`. */
    function toolDefinition(value: TSESTree.Node): TSESTree.ObjectExpression | null {
      if (value.type === AST_NODE_TYPES.ObjectExpression) return value;
      if (
        value.type === AST_NODE_TYPES.CallExpression &&
        TOOL_FACTORIES.has(calleeName(value.callee) as string) &&
        value.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression
      ) {
        return value.arguments[0];
      }
      return null;
    }

    /**
     * Confirmed when the tool carries an approval flag, when a spread may
     * carry one, or when it has no `execute` at all — the SDK then forwards
     * the call to the client, which is its documented human-in-the-loop path.
     */
    function isConfirmed(def: TSESTree.ObjectExpression): boolean {
      let hasExecute = false;
      for (const prop of def.properties) {
        if (prop.type === AST_NODE_TYPES.SpreadElement) return true;
        const key = objectKeyName(prop) as string;
        if (CONFIRMATION_PROPS.has(key)) return true;
        if (key === 'execute') hasExecute = true;
      }
      return !hasExecute;
    }

    return {
      Property(node: TSESTree.Property) {
        const toolName = objectKeyName(node);
        if (toolName === null) return;

        const def = toolDefinition(node.value);
        if (!def) return;

        const operation = destructivePatterns.find((pattern) => nameHasWord(toolName, pattern));
        if (!operation) return;

        // The tool must sit directly in a `tools: { ... }` object.
        const tools = node.parent;
        if (tools?.type !== AST_NODE_TYPES.ObjectExpression) return;
        const toolsProp = tools.parent;
        if (toolsProp?.type !== AST_NODE_TYPES.Property || objectKeyName(toolsProp) !== 'tools') return;

        // A call-level `toolApproval` (AI SDK 6+) gates every tool in the call.
        // A Property holding an object literal always lives in an ObjectExpression.
        if (optionValue(toolsProp.parent as TSESTree.ObjectExpression, 'toolApproval')) return;

        if (isConfirmed(def)) return;

        context.report({
          node,
          messageId: 'missingConfirmation',
          data: { toolName, operation },
        });
      },
    };
  },
});

/** Factories that wrap a tool definition object. */
const TOOL_FACTORIES = new Set(['tool', 'dynamicTool']);

/** Keys that mark a tool as gated on a human. `needsApproval` is the SDK's own. */
const CONFIRMATION_PROPS = new Set([
  'needsApproval',
  'requiresConfirmation', 'requireConfirmation', 'confirmation',
  'requiresApproval', 'requireApproval', 'approval',
]);
