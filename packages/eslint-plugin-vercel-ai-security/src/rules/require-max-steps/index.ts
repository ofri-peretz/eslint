/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require step limits for multi-step AI tool calls
 * @description Ensures multi-step tool calling has maxSteps to prevent infinite loops
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @see OWASP LLM10: Unbounded Consumption
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingMaxSteps';

export interface Options {
  /** Default max steps to suggest */
  suggestedMaxSteps?: number;
}

type RuleOptions = [Options?];

export const requireMaxSteps = createRule<RuleOptions, MessageIds>({
  name: 'require-max-steps',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require maxSteps limit for multi-step tool calling to prevent infinite loops',
    },
    messages: {
      missingMaxSteps: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Step Limit in Multi-Step Tool Calling',
        cwe: 'CWE-834',
        owasp: 'A05:2021',
        cvss: 6.5,
        description: '{{function}} with tools is missing maxSteps. Without a limit, tool calls can loop indefinitely.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Add maxSteps option: {{function}}({ ..., maxSteps: 5 })',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls-using-stopwhen',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          suggestedMaxSteps: {
            type: 'number',
            description: 'Default max steps limit to suggest',
            default: 5,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      suggestedMaxSteps: 5,
    },
  ],
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    // Vercel AI SDK functions that support tools
    const functionsWithTools = ['generateText', 'streamText'];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a target AI function
        const matchedFunction = functionsWithTools.find(fn => callee.includes(fn));
        if (!matchedFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Check if tools property exists
        const hasTools = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          return keyName === 'tools';
        });

        // Only check for maxSteps if tools are present
        if (!hasTools) return;

        // Check if maxSteps is present
        const hasMaxSteps = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' 
            ? prop.key.name 
            : prop.key.type === 'Literal' 
              ? String(prop.key.value)
              : null;
          return keyName === 'maxSteps' || keyName === 'max_steps';
        });

        if (!hasMaxSteps) {
          context.report({
            node,
            messageId: 'missingMaxSteps',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});
