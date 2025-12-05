/**
 * ESLint Rule: no-improper-type-validation
 * Detects improper type validation in user input handling (CWE-1287)
 *
 * Improper type validation can lead to security vulnerabilities when
 * user input is not properly validated, allowing attackers to bypass
 * security checks or cause unexpected behavior.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe type checking patterns
 * - TypeScript type guards
 * - Proper validation functions
 * - JSDoc annotations (@validated, @type-checked)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'improperTypeValidation'
  | 'unsafeTypeofCheck'
  | 'unsafeInstanceofUsage'
  | 'looseEqualityTypeCheck'
  | 'missingNullCheck'
  | 'unreliableConstructorCheck'
  | 'incompleteTypeValidation'
  | 'useTypeofCorrectly'
  | 'useProperTypeGuards'
  | 'validateUserInput'
  | 'strategyTypeGuards'
  | 'strategySchemaValidation'
  | 'strategyDefensiveProgramming';

export interface Options extends SecurityRuleOptions {
  /** Variables that contain user input and should be validated */
  userInputVariables?: string[];

  /** Safe type checking functions */
  safeTypeCheckFunctions?: string[];

  /** Whether to allow instanceof in same-realm contexts */
  allowInstanceofSameRealm?: boolean;
}

type RuleOptions = [Options?];

export const noImproperTypeValidation = createRule<RuleOptions, MessageIds>({
  name: 'no-improper-type-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects improper type validation in user input handling',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      improperTypeValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Improper Type Validation',
        cwe: 'CWE-1287',
        description: 'Type validation may be bypassed or incomplete',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1287.html',
      }),
      unsafeTypeofCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe typeof Check',
        cwe: 'CWE-1287',
        description: 'typeof check misses null values',
        severity: 'MEDIUM',
        fix: 'Use value != null && typeof value === "object"',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof',
      }),
      unsafeInstanceofUsage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe instanceof Usage',
        cwe: 'CWE-1287',
        description: 'instanceof may fail across contexts',
        severity: 'LOW',
        fix: 'Use Array.isArray() or typeof checks',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof',
      }),
      looseEqualityTypeCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Loose Equality Type Check',
        cwe: 'CWE-1287',
        description: 'Loose equality may cause type confusion',
        severity: 'LOW',
        fix: 'Use strict equality (===) for type checking',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality',
      }),
      missingNullCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Null Check',
        cwe: 'CWE-1287',
        description: 'Type check doesn\'t handle null values',
        severity: 'MEDIUM',
        fix: 'Check for both null and undefined',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof',
      }),
      unreliableConstructorCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unreliable Constructor Check',
        cwe: 'CWE-1287',
        description: 'constructor.name can be spoofed',
        severity: 'MEDIUM',
        fix: 'Use Object.prototype.toString.call() or duck typing',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor',
      }),
      incompleteTypeValidation: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Incomplete Type Validation',
        cwe: 'CWE-1287',
        description: 'Type validation is incomplete',
        severity: 'LOW',
        fix: 'Use comprehensive type checking',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1287.html',
      }),
      useTypeofCorrectly: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use typeof Correctly',
        description: 'Use typeof with null checks for objects',
        severity: 'LOW',
        fix: 'if (value != null && typeof value === "object")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof',
      }),
      useProperTypeGuards: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Proper Type Guards',
        description: 'Use proper type guard functions',
        severity: 'LOW',
        fix: 'Array.isArray(), Number.isNaN(), etc.',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types',
      }),
      validateUserInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate User Input',
        description: 'Validate user input before processing',
        severity: 'LOW',
        fix: 'Use schema validation libraries',
        documentationLink: 'https://joi.dev/',
      }),
      strategyTypeGuards: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Type Guards Strategy',
        description: 'Use type guards for runtime type checking',
        severity: 'LOW',
        fix: 'Implement custom type guard functions',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types',
      }),
      strategySchemaValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Schema Validation Strategy',
        description: 'Use schema validation for complex inputs',
        severity: 'LOW',
        fix: 'Use Joi, Yup, or Zod for input validation',
        documentationLink: 'https://joi.dev/',
      }),
      strategyDefensiveProgramming: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Defensive Programming Strategy',
        description: 'Use defensive programming techniques',
        severity: 'LOW',
        fix: 'Check types and handle edge cases explicitly',
        documentationLink: 'https://en.wikipedia.org/wiki/Defensive_programming',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
          },
          safeTypeCheckFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['isArray', 'isString', 'isNumber', 'isObject', 'validateType', 'checkType'],
          },
          allowInstanceofSameRealm: {
            type: 'boolean',
            default: true,
            description: 'Allow instanceof for same-realm objects'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as type validators',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      safeTypeCheckFunctions: ['isArray', 'isString', 'isNumber', 'isObject', 'validateType', 'checkType'],
      allowInstanceofSameRealm: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      allowInstanceofSameRealm = true,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if a variable is user input
     */
    const isUserInput = (varName: string): boolean => {
      return userInputVariables.some(input => varName.includes(input));
    };

    /**
     * Check if a typeof check is unsafe
     */
    const isUnsafeTypeof = (node: TSESTree.BinaryExpression): boolean => {
      if (node.operator !== '===' && node.operator !== '!==') {
        return false;
      }

      const left = node.left;
      const right = node.right;

      // Check for typeof x === 'object' (misses null)
      if (left.type === 'UnaryExpression' &&
          left.operator === 'typeof' &&
          right.type === 'Literal' &&
          right.value === 'object') {
        return true;
      }

      return false;
    };

    /**
     * Check if instanceof usage is unsafe
     */
    const isUnsafeInstanceof = (node: TSESTree.BinaryExpression): boolean => {
      if (node.operator !== 'instanceof') {
        return false;
      }

      if (!allowInstanceofSameRealm) {
        return true;
      }

      // instanceof is generally safe within the same realm
      // but can be problematic across different contexts/windows
      return false;
    };

    /**
     * Check if equality is loose and used for type checking
     */
    const isLooseEqualityTypeCheck = (node: TSESTree.BinaryExpression): boolean => {
      if (node.operator !== '==' && node.operator !== '!=') {
        return false;
      }

      const leftText = sourceCode.getText(node.left).toLowerCase();
      const rightText = sourceCode.getText(node.right).toLowerCase();

      // Check if comparing against null/undefined with loose equality
      return (leftText.includes('null') || rightText.includes('null') ||
              leftText.includes('undefined') || rightText.includes('undefined'));
    };

    /**
     * Check for unreliable constructor checks
     */
    const isUnreliableConstructorCheck = (node: TSESTree.MemberExpression): boolean => {
      return node.property.type === 'Identifier' &&
             node.property.name === 'name' &&
             node.object.type === 'MemberExpression' &&
             node.object.property.type === 'Identifier' &&
             node.object.property.name === 'constructor';
    };

    return {
      // Check binary expressions for type validation issues
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Check for unsafe typeof usage
        if (isUnsafeTypeof(node)) {
          // Check if this involves user input
          const left = node.left as TSESTree.UnaryExpression;
          if (left.argument.type === 'Identifier' && isUserInput(left.argument.name)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'unsafeTypeofCheck',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'useTypeofCorrectly',
                  fix: () => null // Would need complex AST manipulation
                },
              ],
            });
          }
        }

        // Check for unsafe instanceof usage
        if (isUnsafeInstanceof(node)) {
          const left = node.left;
          if (left.type === 'Identifier' && isUserInput(left.name)) {
            context.report({
              node,
              messageId: 'unsafeInstanceofUsage',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }

        // Check for loose equality in type checks
        if (isLooseEqualityTypeCheck(node)) {
          const left = node.left;
          const right = node.right;

          // Check if this involves user input variables
          const leftText = sourceCode.getText(left);
          const rightText = sourceCode.getText(right);

          if ((left.type === 'Identifier' && isUserInput(left.name)) ||
              (right.type === 'Identifier' && isUserInput(right.name)) ||
              leftText.includes('null') || rightText.includes('null')) {

            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'looseEqualityTypeCheck',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check member expressions for constructor.name usage
      MemberExpression(node: TSESTree.MemberExpression) {
        if (isUnreliableConstructorCheck(node)) {
          // Check if this involves user input
          let current: TSESTree.Node = node;
          let involvesUserInput = false;

          // Walk up to find if this is used with user input
          while (current.parent) {
            current = current.parent;
            if (current.type === 'VariableDeclarator' &&
                current.init === node) {
              // This is assignment - check if assigned to user input
              involvesUserInput = true;
              break;
            }
            if (current.type === 'BinaryExpression' &&
                (current.left === node || current.right === node)) {
              // Used in comparison - likely type checking
              involvesUserInput = true;
              break;
            }
          }

          if (involvesUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'unreliableConstructorCheck',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check call expressions for type checking functions
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for safe type checking functions
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier') {

          const methodName = callee.property.name;
          const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';

          // Check for proper type guards
          if (['isArray', 'isString', 'isNumber', 'isObject'].includes(methodName) &&
              objectName && ['Array', 'Number', 'String', 'Object'].includes(objectName)) {
            // This is good - using proper type guards
            return;
          }
        }

        // Check for typeof usage in function calls
        if (callee.type === 'Identifier' && callee.name === 'typeof') {
          // This is unusual - typeof is normally a unary operator
          // But if used as a function call, it's likely wrong
          context.report({
            node,
            messageId: 'improperTypeValidation',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'LOW',
              safeAlternative: 'Use typeof as unary operator: typeof value',
            },
          });
        }
      },

      // Check if statements for incomplete type validation
      IfStatement(node: TSESTree.IfStatement) {
        const test = node.test;

        // Look for if statements that only check one aspect of type
        if (test.type === 'BinaryExpression') {
          const testText = sourceCode.getText(test).toLowerCase();

          // Check for incomplete null checks
          if ((testText.includes('!= null') || testText.includes('== null')) &&
              !testText.includes('!== undefined') && !testText.includes('=== undefined')) {

            // Check if this involves user input
            if ((test.left.type === 'Identifier' && isUserInput(test.left.name)) ||
                (test.right.type === 'Identifier' && isUserInput(test.right.name))) {

              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: test,
                messageId: 'missingNullCheck',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      }
    };
  },
});
