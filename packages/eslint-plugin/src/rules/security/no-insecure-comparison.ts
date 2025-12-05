/**
 * ESLint Rule: no-insecure-comparison
 * Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities
 * CWE-697: Incorrect Comparison
 * 
 * @see https://cwe.mitre.org/data/definitions/697.html
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'insecureComparison' | 'useStrictEquality';

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

