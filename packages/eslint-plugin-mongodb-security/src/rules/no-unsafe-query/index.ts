/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-query
 * Detects potential NoSQL injection via string concatenation in MongoDB queries.
 * CWE-943: Improper Neutralization of Special Elements in Data Query Logic
 *
 * @see https://cwe.mitre.org/data/definitions/943.html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeQuery' | 'suggestionUseEq';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Additional method names to check. Default: [] */
  additionalMethods?: string[];
}

type RuleOptions = [Options?];

// MongoDB/Mongoose query methods
const QUERY_METHODS = [
  'find',
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'countDocuments',
  'aggregate',
];

// Patterns that indicate user input
const USER_INPUT_PATTERNS = [
  'req.body',
  'req.query',
  'req.params',
  'request.body',
  'request.query',
  'request.params',
  'ctx.request.body',
  'ctx.query',
  'ctx.params',
];

/**
 * Check if an expression contains potential user input
 */
function containsUserInput(node: TSESTree.Node): boolean {
  const code = getNodeSource(node);
  return USER_INPUT_PATTERNS.some((pattern) => code.includes(pattern));
}

/**
 * Get source code representation of a node (simplified)
 */
function getNodeSource(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const obj = getNodeSource(node.object);
    const prop =
      node.property.type === AST_NODE_TYPES.Identifier
        ? node.property.name
        : '[computed]';
    return `${obj}.${prop}`;
  }
  if (node.type === AST_NODE_TYPES.Literal) {
    return String(node.value);
  }
  return '[expression]';
}

/**
 * Check if a property value is potentially unsafe
 */
function isUnsafePropertyValue(node: TSESTree.Node): boolean {
  // Direct identifier (variable) - potentially unsafe if from user input
  if (node.type === AST_NODE_TYPES.Identifier) {
    return true;
  }

  // Member expression like req.body.username
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return containsUserInput(node);
  }

  // Template literal - always unsafe for queries
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length > 0;
  }

  // Binary expression (string concatenation)
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return true;
  }

  return false;
}

export const noUnsafeQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-query',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent NoSQL injection via direct use of user input in MongoDB queries',
    },
    hasSuggestions: true,
    messages: {
      unsafeQuery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'NoSQL Injection via Unsafe Query',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'User input "{{input}}" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication.',
        severity: 'CRITICAL',
        fix: 'Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } }',
        documentationLink:
          'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection',
      }),
      suggestionUseEq: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use $eq Operator',
        description: 'Wrap the value with { $eq: value } to prevent operator injection',
        severity: 'LOW',
        fix: 'Replace direct value with { $eq: sanitizedValue }',
        documentationLink:
          'https://www.mongodb.com/docs/manual/reference/operator/query/eq/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, additionalMethods: [] }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowInTests = true, additionalMethods = [] } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const allMethods = [...QUERY_METHODS, ...additionalMethods];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is a MongoDB query method call
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName =
          node.callee.property.type === AST_NODE_TYPES.Identifier
            ? node.callee.property.name
            : null;

        if (!methodName || !allMethods.includes(methodName)) {
          return;
        }

        // Check first argument (the query object)
        const queryArg = node.arguments[0];
        if (!queryArg || queryArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        // Check each property in the query object
        for (const prop of queryArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) {
            continue;
          }

          const value = prop.value;

          // Check if the value is potentially unsafe
          if (isUnsafePropertyValue(value)) {
            const inputSource = getNodeSource(value);

            // Only report if it looks like user input or is a potentially tainted variable
            if (containsUserInput(value) || value.type === AST_NODE_TYPES.Identifier) {
              context.report({
                node: prop,
                messageId: 'unsafeQuery',
                data: {
                  input: inputSource,
                },
                suggest: [
                  {
                    messageId: 'suggestionUseEq',
                    fix(fixer: TSESLint.RuleFixer) {
                      const sourceCode = context.sourceCode || context.getSourceCode();
                      const valueText = sourceCode.getText(value);
                      return fixer.replaceText(value, `{ $eq: ${valueText} }`);
                    },
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});

export default noUnsafeQuery;
