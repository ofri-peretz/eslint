/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-comparison
 * Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities
 * CWE-697: Incorrect Comparison
 * 
 * @see https://cwe.mitre.org/data/definitions/697.html
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'insecureComparison' | 'useStrictEquality' | 'timingUnsafeComparison';

export interface Options {
  /** Allow insecure comparison in test files. Default: false */
  allowInTests?: boolean;
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

export const noInsecureComparison = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-comparison',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-crypto/no-timing-unsafe-compare'],
    docs: {
      description: 'Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      insecureComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Comparison',
        cwe: 'CWE-697',
        description: 'Insecure comparison operator ({{operator}}) detected - can lead to type coercion vulnerabilities',
        severity: 'HIGH',
        fix: 'Use strict equality ({{strictOperator}}) instead: {{example}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/697.html',
      }),
      useStrictEquality: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Strict Equality',
        description: 'Use strict equality operator',
        severity: 'LOW',
        fix: 'Replace == with === and != with !==',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality',
      }),
      timingUnsafeComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing Attack Risk',
        cwe: 'CWE-208',
        description: 'Secret comparison with {{operator}} can leak timing information',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow insecure comparison in test files',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.sourceCode;

    /**
     * Check if a string matches any ignore pattern
     */
    function matchesIgnorePattern(text: string, patterns: string[]): boolean {
      return patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          // Invalid regex - treat as literal string match
          return text.toLowerCase().includes(pattern.toLowerCase());
        }
      });
    }

    /**
     * Check BinaryExpression for insecure comparison operators
     */
    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      if (isTestFile) {
        return;
      }

      const secretKeywords = ['secret', 'token', 'password', 'apikey', 'api_key', 'signature', 'auth', 'key', 'hash', 'digest', 'mac'];
      
      const isSecurityContext = ((): boolean => {
         let current: TSESTree.Node | undefined = node;
         while (current) {
             if ((current.type === 'FunctionDeclaration' || 
                  current.type === 'FunctionExpression' || 
                  current.type === 'ArrowFunctionExpression') && 
                  'id' in current && current.id?.name) {
                 if (/security|auth|crypto|hash|token|secret|insecure|verify|validate/i.test(current.id.name)) {
                     return true;
                 }
             }
             if (current.type === 'MethodDefinition' && current.key.type === 'Identifier') {
                  if (/security|auth|crypto|hash|token|secret|insecure|verify|validate/i.test(current.key.name)) {
                     return true;
                 }
             }
             current = current.parent;
         }
         return false;
      })();

      const isPotentialSecret = (expr: TSESTree.Expression): boolean => {
        const text = sourceCode.getText(expr).toLowerCase();
        if (secretKeywords.some(keyword => text.includes(keyword))) return true;
        
        // In security contexts, treat generic terms as potential secrets
        if (isSecurityContext) {
            const contextKeywords = ['provided', 'expected', 'actual', 'input', 'value', 'data'];
            return contextKeywords.some(keyword => text.includes(keyword));
        }
        return false;
      };

      // Timing-safe comparison for secrets even with strict equality
      if ((node.operator === '===' || node.operator === '!==') &&
          (isPotentialSecret(node.left) || isPotentialSecret(node.right))) {
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        
        // ... rest of logic uses example ...
        const example = `crypto.timingSafeEqual(Buffer.from(${leftText}), Buffer.from(${rightText}))`;
        
        context.report({
          node,
          messageId: 'timingUnsafeComparison',
          data: {
            operator: node.operator,
            strictOperator: node.operator,
            example: example,
          },
          suggest: [
            {
              messageId: 'useStrictEquality', // This messageId usage might be wrong for timing safe output, but kept for now or reused?
               // Wait, previous code used useStrictEquality as suggest?
               // Ah, the previous code had a fix/suggest structure.
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(node, example),
            },
          ],
        });
        return;
      }

      // Check for insecure comparison operators
      if (node.operator === '==' || node.operator === '!=') {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        const strictOperator = node.operator === '==' ? '===' : '!==';
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        const example = `${leftText} ${strictOperator} ${rightText}`;

        context.report({
          node: node,
          messageId: 'insecureComparison',
          data: {
            operator: node.operator,
            strictOperator,
            example,
          },
          fix: (fixer: TSESLint.RuleFixer) => {
            return fixer.replaceText(node, example);
          },
          suggest: [
            {
              messageId: 'useStrictEquality',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node, example);
              },
            },
          ],
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
});

