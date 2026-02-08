/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoUnsafeQueryOptions } from '../../types';

/**
 * Check if a node contains unsafe string construction (concatenation or interpolation)
 */
function isUnsafeStringConstruction(node: TSESTree.Node): 'concat' | 'template' | false {
  // Direct concatenation: "SELECT..." + var
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return 'concat';
  }
  // Template literal with expressions: `SELECT...${var}`
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length > 0) {
    return 'template';
  }
  return false;
}

export const noUnsafeQuery: TSESLint.RuleModule<
  'noUnsafeQuery' | 'unsafeTemplateLiteral',
  NoUnsafeQueryOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent SQL injection by disallowing string concatenation or unsafe template literals in queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-query.md',
    },
    messages: {
      noUnsafeQuery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        description: 'Unsafe SQL query detected. Variable interpolation found.',
        severity: 'CRITICAL',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
        effort: 'high',
        fix: 'Use parameterized queries ($1, $2) instead of string concatenation.',
        documentationLink: 'https://node-postgres.com/features/queries#parameterized-queries',
      }),
      unsafeTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        description: 'Unsafe SQL query construction detected (template literal).',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries ($1, $2) instead of interpolating values.',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track variables tainted by unsafe string construction
    const taintedVariables = new Map<string, 'concat' | 'template'>();

    return {
      // Track variable declarations with unsafe init:
      // const query = "SELECT..." + userId;
      // const query = `SELECT...${email}`;
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init
        ) {
          const unsafe = isUnsafeStringConstruction(node.init);
          if (unsafe) {
            taintedVariables.set(node.id.name, unsafe);
          }
        }
      },

      // Track augmented assignment: query += " AND ..." + var
      // or: query += `...${var}`
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.operator === '+=' &&
          node.left.type === AST_NODE_TYPES.Identifier
        ) {
          const unsafe = isUnsafeStringConstruction(node.right);
          if (unsafe) {
            taintedVariables.set(node.left.name, unsafe);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check if the method being called is 'query'
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) return;

        const queryArg = args[0];

        // 1. Check for String Concatenation: query('SELECT * FROM users WHERE id = ' + id)
        if (queryArg.type === AST_NODE_TYPES.BinaryExpression && queryArg.operator === '+') {
          context.report({
            node: queryArg,
            messageId: 'noUnsafeQuery',
          });
          return;
        }

        // 2. Check for Template Literals with Expressions: query(`SELECT * FROM users WHERE id = ${id}`)
        if (queryArg.type === AST_NODE_TYPES.TemplateLiteral && queryArg.expressions.length > 0) {
          context.report({
            node: queryArg,
            messageId: 'unsafeTemplateLiteral',
          });
          return;
        }

        // 3. Check for tainted variables: const q = "..." + var; db.query(q)
        if (queryArg.type === AST_NODE_TYPES.Identifier) {
          const taint = taintedVariables.get(queryArg.name);
          if (taint) {
            context.report({
              node: queryArg,
              messageId: taint === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
            });
          }
        }
      },
    };
  },
};
