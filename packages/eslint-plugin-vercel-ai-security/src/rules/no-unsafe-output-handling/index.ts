/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent using AI output directly in dangerous operations
 * @description Detects when AI-generated content is used in eval, exec, or SQL
 * @see OWASP LLM05: Improper Output Handling
 * @see OWASP ASI05: Unexpected Code Execution
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafeOutputExecution' | 'unsafeOutputInSQL' | 'unsafeOutputInHTML';

export interface Options {
  /** Variable patterns that suggest AI output */
  aiOutputPatterns?: string[];
}

type RuleOptions = [Options?];

export const noUnsafeOutputHandling = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-output-handling',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using AI output directly in dangerous operations (eval, SQL, HTML)',
    },
    messages: {
      unsafeOutputExecution: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output Used in Code Execution',
        cwe: 'CWE-94',
        owasp: 'A03:2021',
        cvss: 9.8,
        description: 'AI-generated content "{{variable}}" passed to {{function}}. This can lead to Remote Code Execution.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Never execute AI-generated code directly. Use sandboxed execution with validation.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      unsafeOutputInSQL: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in SQL Query',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.0,
        description: 'AI-generated content used in SQL query. Use parameterized queries instead.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [aiOutput])',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      }),
      unsafeOutputInHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in innerHTML',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'AI-generated content assigned to innerHTML. This can lead to XSS attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use textContent or sanitize HTML: element.textContent = aiOutput',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          aiOutputPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest AI output',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      aiOutputPatterns: [
        'result.text',
        'response.text',
        'completion',
        'generated',
        'aiOutput',
        'aiResponse',
        'llmOutput',
        'llmResponse',
        'modelOutput',
        'textContent',
        '.text',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const aiOutputPatterns = options.aiOutputPatterns ?? [
      'result.text', 'response.text', 'completion', 'generated',
      'aiOutput', 'aiResponse', 'llmOutput', '.text',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Dangerous execution functions
    const dangerousFunctions = ['eval', 'Function', 'execSync', 'exec', 'spawn', 'execFile'];
    
    // SQL execution patterns
    const sqlPatterns = ['query', 'execute', 'run', 'raw'];
    
    /**
     * Check if a node likely contains AI output
     */
    function isLikelyAIOutput(node: TSESTree.Node): boolean {
      const text = sourceCode.getText(node);
      return aiOutputPatterns.some((pattern: string) => text.includes(pattern));
    }

    return {
      // Check for eval() and similar with AI output
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check dangerous execution functions
        const isDangerous = dangerousFunctions.some(fn => callee.includes(fn));
        if (isDangerous) {
          for (const arg of node.arguments) {
            if (isLikelyAIOutput(arg)) {
              context.report({
                node: arg,
                messageId: 'unsafeOutputExecution',
                data: { 
                  variable: sourceCode.getText(arg),
                  function: callee,
                },
              });
            }
          }
        }

        // Check SQL query functions
        const isSQLFunction = sqlPatterns.some(fn => callee.includes(fn));
        if (isSQLFunction) {
          for (const arg of node.arguments) {
            if (arg.type === 'TemplateLiteral' || arg.type === 'BinaryExpression') {
              // Check if template/concatenation includes AI output
              if (isLikelyAIOutput(arg)) {
                context.report({
                  node: arg,
                  messageId: 'unsafeOutputInSQL',
                });
              }
            }
          }
        }
      },

      // Check for innerHTML assignment
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'MemberExpression') {
          const prop = node.left.property;
          if (prop.type === 'Identifier' && prop.name === 'innerHTML') {
            if (isLikelyAIOutput(node.right)) {
              context.report({
                node: node.right,
                messageId: 'unsafeOutputInHTML',
              });
            }
          }
        }
      },
    };
  },
});
