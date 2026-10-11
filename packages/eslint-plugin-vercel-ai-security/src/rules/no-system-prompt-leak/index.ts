/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent system prompt leakage to clients
 * @description Detects when system prompts are exposed in API responses
 * @see OWASP LLM07: System Prompt Leakage
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, memberPath, nameHasWord, objectKeyName, propertyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { isSystemPromptProp } from '../../utils/prompt-props';
import { optionValue } from '../../utils/sdk';

type MessageIds = 'systemPromptLeak';

export interface Options {
  /** Patterns that suggest system prompt variables */
  systemPromptPatterns?: string[];
}

type RuleOptions = [Options?];

export const noSystemPromptLeak = createRule<RuleOptions, MessageIds>({
  name: 'no-system-prompt-leak',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-system-prompt-leak.md',
      description: 'Prevent system prompts from being exposed in API responses or client code',
      cwe: 'CWE-200',
      cvss: 7.5,
    },
    messages: {
      systemPromptLeak: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'System Prompt Leakage',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 7.5,
        description: 'System prompt "{{variable}}" is exposed in return statement. This reveals AI behavior instructions to users.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Remove system prompt from API response. Only return the AI-generated content.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          systemPromptPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest system prompts',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      systemPromptPatterns: [
        'systemPrompt', 'system_prompt', 'SYSTEM_PROMPT',
        'systemMessage', 'system_message', 'SYSTEM_MESSAGE',
        'instructions', 'INSTRUCTIONS', 'aiInstructions',
        'agentPrompt', 'basePrompt', 'contextPrompt',
      ],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { systemPromptPatterns } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    /** Whole words: `SYSTEM_PROMPT`, `config.systemPrompt`, `AI_INSTRUCTIONS`. */
    function isSystemPromptVariable(name: string): boolean {
      return systemPromptPatterns.some((pattern: string) => nameHasWord(name, pattern));
    }

    function findSystemPromptVar(node: TSESTree.Node): string | null {
      if (node.type === 'Identifier' && isSystemPromptVariable(node.name)) {
        return node.name;
      }
      if (node.type === 'MemberExpression') {
        const name = propertyName(node);
        if (name !== null && isSystemPromptVariable(name)) return sourceCode.getText(node);
      }
      return null;
    }

    /**
     * Report properties that carry a system prompt. In a response payload the
     * KEY is evidence too (`{ system: persona }` leaks whatever `persona` is
     * called), and nested objects are part of the payload.
     */
    function checkObjectForLeaks(node: TSESTree.ObjectExpression, inResponse: boolean): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = objectKeyName(prop);
        const leaked =
          findSystemPromptVar(prop.value) ??
          (inResponse && key !== null && (isSystemPromptProp(key) || isSystemPromptVariable(key))
            ? key
            : null);
        if (leaked) {
          context.report({
            node: prop,
            messageId: 'systemPromptLeak',
            data: { variable: leaked },
          });
        } else if (inResponse && prop.value.type === 'ObjectExpression') {
          checkObjectForLeaks(prop.value, true);
        }
      }
    }

    return {
      // Check return statements in functions
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!node.argument) return;

        // An object with a `model` is AI SDK call options handed to
        // generateText/streamText on the server — not a response.
        if (node.argument.type === 'ObjectExpression') {
          if (optionValue(node.argument, 'model')) return;
          checkObjectForLeaks(node.argument, false);
        }

        // Check if returning system prompt directly
        const leakedVar = findSystemPromptVar(node.argument);
        if (leakedVar) {
          context.report({
            node,
            messageId: 'systemPromptLeak',
            data: { variable: leakedVar },
          });
        }
      },

      // Response.json / NextResponse.json / res.json / res.send
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        if (!callee.match(/\.(json|send)\s*$/)) return;

        const arg = node.arguments[0];
        if (arg && arg.type === 'ObjectExpression') {
          checkObjectForLeaks(arg, true);
        }
      },

      // new Response(JSON.stringify({ ... }))
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== 'Response') return;
        const body = node.arguments[0];
        if (body?.type !== AST_NODE_TYPES.CallExpression) return;
        if (memberPath(body.callee)?.join('.') !== 'JSON.stringify') return;
        const payload = body.arguments[0];
        if (payload?.type === AST_NODE_TYPES.ObjectExpression) {
          checkObjectForLeaks(payload, true);
        }
      },
    };
  },
});
