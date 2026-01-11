/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { TSESLint, AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { PreferPoolQueryOptions } from '../../types';

export const preferPoolQuery: TSESLint.RuleModule<
  'preferPoolQuery',
  PreferPoolQueryOptions
> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer pool.query() over client.query() for single-shot queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/prefer-pool-query.md',
    },
    messages: {
      preferPoolQuery: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Prefer Pool Query',
        description: 'Single-shot queries should use pool.query() directly.',
        severity: 'MEDIUM',
        cwe: 'CWE-400',
        effort: 'low',
        fix: 'Use pool.query(...) instead of manual client checkout/release for simple queries.',
        documentationLink: 'https://node-postgres.com/features/pooling',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        // Look for: const client = await pool.connect()
        // And ensure it is used for exactly one query, then released.
        // This is complex for a perfect check, but we can look for basic patterns.
        
        if (
          !node.init ||
          node.init.type !== AST_NODE_TYPES.AwaitExpression ||
          node.init.argument.type !== AST_NODE_TYPES.CallExpression ||
          node.init.argument.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.init.argument.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.init.argument.callee.property.name !== 'connect'
        ) {
          return;
        }

        const variable = context.sourceCode.getDeclaredVariables(node)[0];
        if (!variable) return;

        const references = variable.references;
        
        // Count meaningful usages
        // 1. Definition (init)
        // 2. usage in query
        // 3. usage in release
        // roughly 3 refs total? (maybe 2 if release is forgot, but that is handled by other rule)
        
        // If we have just: connect, query, release.
        // And NO transactions (BEGIN/COMMIT).
        
        let queryCallCount = 0;
        let releaseCallCount = 0;
        let otherUsageCount = 0;

        for (const ref of references) {
          if (ref.isWrite()) continue; // definition

          const id = ref.identifier;
          
          // Check for member access
          if (
            id.parent?.type === AST_NODE_TYPES.MemberExpression &&
            id.parent.object === id &&
            id.parent.property.type === AST_NODE_TYPES.Identifier
          ) {
             const method = id.parent.property.name;
             
             if (method === 'query') {
               queryCallCount++;
               
               // Check if it is a transaction command
               if (id.parent.parent?.type === AST_NODE_TYPES.CallExpression) {
                 const call = id.parent.parent;
                 if (call.arguments.length > 0 && 
                     call.arguments[0].type === AST_NODE_TYPES.Literal && 
                     typeof call.arguments[0].value === 'string') {
                    const q = call.arguments[0].value.toUpperCase().trim();
                    if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) {
                      return; // It's a transaction, keep manual control
                    }
                 }
               }
             } else if (method === 'release') {
               releaseCallCount++;
             } else {
               otherUsageCount++;
             }
          } else {
            otherUsageCount++; // usage as value (passing to func?)
          }
        }

        if (queryCallCount === 1 && releaseCallCount === 1 && otherUsageCount === 0) {
           context.report({
            node,
            messageId: 'preferPoolQuery',
          });
        }
      },
    };
  },
};
