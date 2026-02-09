/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-regex-query
 * Detects ReDoS and injection via $regex operator
 * CWE-400: Resource Exhaustion
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafeRegex';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const USER_INPUT_PATTERNS = [
  'req.body', 'req.query', 'req.params',
  'request.body', 'request.query', 'request.params',
  'ctx.request.body', 'ctx.query', 'ctx.params',
];

function getNodeSource(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const obj = getNodeSource(node.object);
    const prop = node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : '[computed]';
    return `${obj}.${prop}`;
  }
  return '';
}

function containsUserInput(node: TSESTree.Node): boolean {
  const source = getNodeSource(node);
  return USER_INPUT_PATTERNS.some((pattern) => source.includes(pattern));
}

const QUERY_METHODS = [
  'find', 'findOne', 'findById',
  'findOneAndUpdate', 'findOneAndDelete',
  'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
  'countDocuments',
];

export const noUnsafeRegexQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-regex-query',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent ReDoS attacks via $regex with user input' },
    hasSuggestions: true,
    messages: {
      unsafeRegex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS via $regex',
        cwe: 'CWE-400',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'User input in $regex can cause ReDoS or information disclosure',
        severity: 'HIGH',
        fix: 'Escape special regex characters and anchor patterns',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !QUERY_METHODS.includes(methodName)) {
          return;
        }

        // Check first argument (the query object)
        const queryArg = node.arguments[0];
        if (!queryArg || queryArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        // Look for $regex with user input within query properties
        for (const prop of queryArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          checkForUnsafeRegex(prop.value, node, context);
        }
      },
    };

    function checkForUnsafeRegex(
      node: TSESTree.Node,
      reportNode: TSESTree.CallExpression,
      ctx: TSESLint.RuleContext<MessageIds, RuleOptions>,
    ) {
      // Check for { $regex: userInput }
      if (node.type === AST_NODE_TYPES.ObjectExpression) {
        for (const prop of node.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const keyName = prop.key.type === AST_NODE_TYPES.Identifier
            ? prop.key.name
            : prop.key.type === AST_NODE_TYPES.Literal
              ? String(prop.key.value)
              : null;

          if (keyName === '$regex') {
            // Check if the regex value contains user input
            if (
              prop.value.type === AST_NODE_TYPES.MemberExpression && containsUserInput(prop.value)
            ) {
              ctx.report({ node: reportNode, messageId: 'unsafeRegex' });
            }
            // Template literal with expressions
            if (
              prop.value.type === AST_NODE_TYPES.TemplateLiteral &&
              prop.value.expressions.length > 0
            ) {
              ctx.report({ node: reportNode, messageId: 'unsafeRegex' });
            }
            // New RegExp with user input
            if (
              prop.value.type === AST_NODE_TYPES.NewExpression &&
              prop.value.callee.type === AST_NODE_TYPES.Identifier &&
              prop.value.callee.name === 'RegExp' &&
              prop.value.arguments.length > 0
            ) {
              const regexArg = prop.value.arguments[0];
              if (regexArg.type === AST_NODE_TYPES.MemberExpression && containsUserInput(regexArg)) {
                ctx.report({ node: reportNode, messageId: 'unsafeRegex' });
              }
            }
          }
        }
      }
    }
  },
});

export default noUnsafeRegexQuery;
