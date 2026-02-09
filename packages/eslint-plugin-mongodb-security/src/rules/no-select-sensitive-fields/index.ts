/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-select-sensitive-fields
 * Prevents returning sensitive fields like password
 * CWE-200: Information Exposure
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'selectSensitiveFields';
export interface Options { allowInTests?: boolean; sensitiveFields?: string[]; }
type RuleOptions = [Options?];

const DEFAULT_SENSITIVE_FIELDS = ['password', 'refreshToken', 'apiKey', 'secret'];

const QUERY_METHODS = ['find', 'findOne', 'findById'];

export const noSelectSensitiveFields = createRule<RuleOptions, MessageIds>({
  name: 'no-select-sensitive-fields',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent returning sensitive fields like password in queries' },
    hasSuggestions: true,
    messages: {
      selectSensitiveFields: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Field Exposure',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'Query may return sensitive fields like password or token',
        severity: 'MEDIUM',
        fix: 'Add .select("-password -refreshToken") to exclude sensitive fields',
        documentationLink: 'https://mongoosejs.com/docs/api/query.html#Query.prototype.select()',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true }, sensitiveFields: { type: 'array', items: { type: 'string' } } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true, sensitiveFields: DEFAULT_SENSITIVE_FIELDS }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true, sensitiveFields = DEFAULT_SENSITIVE_FIELDS } = options as Options;
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

        // Check if the query chain includes .select()
        const parent = node.parent;
        if (
          parent &&
          parent.type === AST_NODE_TYPES.MemberExpression &&
          parent.property.type === AST_NODE_TYPES.Identifier &&
          parent.property.name === 'select'
        ) {
          // Has .select() — check if it explicitly includes sensitive fields
          const selectCall = parent.parent;
          if (
            selectCall &&
            selectCall.type === AST_NODE_TYPES.CallExpression &&
            selectCall.arguments.length > 0
          ) {
            const arg = selectCall.arguments[0];
            if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
              const selectStr = arg.value;
              // If field is in select without exclusion prefix, it's included
              for (const field of (sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS)) {
                if (selectStr.includes(field) && !selectStr.includes(`-${field}`)) {
                  context.report({ node: selectCall, messageId: 'selectSensitiveFields' });
                  return;
                }
              }
            }
          }
          return;
        }

        // No .select() at all — report
        context.report({
          node,
          messageId: 'selectSensitiveFields',
        });
      },
    };
  },
});

export default noSelectSensitiveFields;
