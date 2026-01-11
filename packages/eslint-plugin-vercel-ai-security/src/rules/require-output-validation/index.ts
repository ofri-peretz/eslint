/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of AI output before display
 * @description Detects when AI output is displayed without validation
 * @see OWASP LLM09: Misinformation
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unvalidatedOutput';

export interface Options {
  /** Patterns suggesting display operations */
  displayPatterns?: string[];
  /** Functions that validate output */
  validatorFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireOutputValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-output-validation',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require validation of AI output before displaying to users',
    },
    messages: {
      unvalidatedOutput: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unvalidated AI Output',
        cwe: 'CWE-707',
        owasp: 'A03:2021',
        cvss: 5.0,
        description: 'AI output displayed via "{{method}}" without validation. This can propagate misinformation.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Validate AI output before display: display(validateOutput(result.text))',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          displayPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting display operations',
          },
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that validate output',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      displayPatterns: [
        'render', 'display', 'show', 'print', 'send', 'respond',
        'setContent', 'setText', 'setMessage', 'Response.json',
      ],
      validatorFunctions: [
        'validate', 'verify', 'check', 'sanitize', 'filter',
        'validateOutput', 'factCheck', 'verifyFacts',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const displayPatterns = options.displayPatterns ?? [
      'render', 'display', 'show', 'send', 'respond',
    ];
    const validatorFunctions = options.validatorFunctions ?? [
      'validate', 'verify', 'check', 'sanitize',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // AI output property patterns
    const aiOutputPatterns = ['.text', '.content', '.message', '.response', '.output'];

    // Track variables that hold AI results
    const aiResultVariables = new Set<string>();

    /**
     * Check if expression is validated
     */
    function isValidated(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.callee);
      return validatorFunctions.some((fn: string) => 
        callee.toLowerCase().includes(fn.toLowerCase())
      );
    }

    /**
     * Check if expression accesses AI output
     */
    function isAIOutput(node: TSESTree.Node): boolean {
      if (node.type === 'MemberExpression') {
        const text = sourceCode.getText(node);
        return aiOutputPatterns.some(pattern => text.includes(pattern));
      }
      if (node.type === 'Identifier' && aiResultVariables.has(node.name)) {
        return true;
      }
      return false;
    }

    return {
      // Track AI result assignments
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        if (!node.init) return;
        
        // Check if init is AI result access
        if (node.init.type === 'MemberExpression') {
          const text = sourceCode.getText(node.init);
          if (aiOutputPatterns.some(pattern => text.includes(pattern))) {
            aiResultVariables.add(node.id.name);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a display operation
        const isDisplay = displayPatterns.some(pattern => 
          callee.toLowerCase().includes(pattern.toLowerCase())
        );
        if (!isDisplay) return;

        // Check arguments for unvalidated AI output
        for (const arg of node.arguments) {
          if (isAIOutput(arg) && !isValidated(arg)) {
            context.report({
              node: arg,
              messageId: 'unvalidatedOutput',
              data: { method: callee },
            });
          }

          // Check if argument is an object with AI output
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.type !== 'Property') continue;
              if (isAIOutput(prop.value) && !isValidated(prop.value)) {
                context.report({
                  node: prop.value,
                  messageId: 'unvalidatedOutput',
                  data: { method: callee },
                });
              }
            }
          }
        }
      },
    };
  },
});
