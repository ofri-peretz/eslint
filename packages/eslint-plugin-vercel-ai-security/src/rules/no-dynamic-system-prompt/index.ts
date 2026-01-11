/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent dynamic content in system prompts
 * @description Detects when system prompts contain dynamic/user-controlled content
 * @see OWASP ASI01: Agent Confusion
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'dynamicSystemPrompt';

export interface Options {
  /** Allow template literals with only static parts */
  allowStaticTemplates?: boolean;
}

type RuleOptions = [Options?];

export const noDynamicSystemPrompt = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-system-prompt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent dynamic content in system prompts to avoid agent confusion attacks',
    },
    messages: {
      dynamicSystemPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic System Prompt',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 8.0,
        description: 'System prompt contains dynamic content. This can lead to agent confusion attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use a static system prompt defined as a constant. Avoid template literals or concatenation.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowStaticTemplates: {
            type: 'boolean',
            description: 'Allow template literals without expressions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowStaticTemplates: true,
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const allowStaticTemplates = options.allowStaticTemplates ?? true;

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Vercel AI SDK functions
    const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    /**
     * Check if a node represents dynamic content
     */
    function isDynamicContent(node: TSESTree.Node): boolean {
      // Template literal with expressions
      if (node.type === 'TemplateLiteral') {
        if (node.expressions.length > 0) {
          return true;
        }
        return !allowStaticTemplates;
      }
      
      // Binary expression (concatenation)
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return true;
      }
      
      // Call expression (function result)
      if (node.type === 'CallExpression') {
        return true;
      }
      
      // Await expression
      if (node.type === 'AwaitExpression') {
        return true;
      }
      
      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const isAIFunction = aiSDKFunctions.some(fn => callee.includes(fn));
        if (!isAIFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Find system property
        for (const prop of optionsArg.properties) {
          if (prop.type !== 'Property') continue;
          
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          if (keyName !== 'system') continue;

          // Check if system prompt is dynamic
          if (isDynamicContent(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'dynamicSystemPrompt',
            });
          }
        }
      },
    };
  },
});
