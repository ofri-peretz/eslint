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

const QUERY_METHODS = new Set(['find', 'findOne', 'findById']);

export const noSelectSensitiveFields = createRule<RuleOptions, MessageIds>({
  name: 'no-select-sensitive-fields',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-select-sensitive-fields.md', description: 'Prevent returning sensitive fields like password in queries',
      cwe: 'CWE-200',
      cvss: 5.3,
    },
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
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Native MongoDB driver accepts projection as the 2nd argument:
     *   collection.find(filter, { projection: { _id: 1, name: 1 } })
     * If the projection is an explicit inclusion list (1-valued keys) and
     * does not name any sensitive field, the query is safe.
     */
    function projectionIsSafe(node: TSESTree.CallExpression): boolean {
      const arg = node.arguments[1];
      if (!arg || arg.type !== AST_NODE_TYPES.ObjectExpression) return false;
      const projProp = arg.properties.find(
        (p): p is TSESTree.Property =>
          p.type === AST_NODE_TYPES.Property &&
          p.key.type === AST_NODE_TYPES.Identifier &&
          p.key.name === 'projection',
      );
      if (!projProp || projProp.value.type !== AST_NODE_TYPES.ObjectExpression) return false;
      const proj = projProp.value;
      const fields = (sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS);
      let hasInclusion = false;
      for (const p of proj.properties) {
        if (p.type !== AST_NODE_TYPES.Property) continue;
        const keyName =
          p.key.type === AST_NODE_TYPES.Identifier ? p.key.name :
          p.key.type === AST_NODE_TYPES.Literal && typeof p.key.value === 'string' ? p.key.value :
          null;
        if (!keyName) continue;
        if (fields.includes(keyName)) {
          // Sensitive field is named — only safe if explicitly excluded (value 0 / false)
          if (
            p.value.type === AST_NODE_TYPES.Literal &&
            (p.value.value === 0 || p.value.value === false)
          ) continue;
          return false;
        }
        if (
          p.value.type === AST_NODE_TYPES.Literal &&
          (p.value.value === 1 || p.value.value === true)
        ) hasInclusion = true;
      }
      // Inclusion projection that doesn't name sensitive fields → safe.
      return hasInclusion;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName = node.callee.property.type === AST_NODE_TYPES.Identifier
          ? node.callee.property.name
          : null;

        if (!methodName || !QUERY_METHODS.has(methodName)) {
          return;
        }

        // Native MongoDB driver: { projection: { ... } } as 2nd arg.
        if (projectionIsSafe(node)) return;

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
