import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoBatchInsertLoopOptions } from '../../types';

export const noBatchInsertLoop: TSESLint.RuleModule<
  'noBatchInsertLoop',
  NoBatchInsertLoopOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent executing database queries within loops (N+1 problem).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-batch-insert-loop.md',
    },
    messages: {
      noBatchInsertLoop: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'N+1 Query Detection',
        description: 'Database query loop detected.',
        severity: 'HIGH',
        cwe: 'CWE-1049',
        effort: 'medium',
        fix: 'Batch queries using arrays and "UNNEST" or a single batched INSERT.',
        documentationLink: 'https://use-the-index-luke.com/sql/joins/nested-loops-join-n1-problem',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length > 0 && args[0].type === AST_NODE_TYPES.Literal && typeof args[0].value === 'string') {
           const query = args[0].value.toUpperCase();
           if (!query.includes('INSERT') && !query.includes('UPDATE')) {
             return; // Only care about mutations usually, SELECT N+1 is also bad but maybe 'no-loop-query' is separate
           }
        }
        
        let ancestor = node.parent;
        while (ancestor) {
          if (
            ancestor.type === AST_NODE_TYPES.ForStatement ||
            ancestor.type === AST_NODE_TYPES.ForOfStatement ||
            ancestor.type === AST_NODE_TYPES.ForInStatement ||
            ancestor.type === AST_NODE_TYPES.WhileStatement ||
            ancestor.type === AST_NODE_TYPES.DoWhileStatement
          ) {
            context.report({
              node,
              messageId: 'noBatchInsertLoop',
            });
            break;
          }
          
          // Check for function expressions that are callbacks to array methods
          if (
             (ancestor.type === AST_NODE_TYPES.FunctionExpression || ancestor.type === AST_NODE_TYPES.ArrowFunctionExpression)
          ) {
             if (ancestor.parent?.type === AST_NODE_TYPES.CallExpression &&
                 ancestor.parent.callee.type === AST_NODE_TYPES.MemberExpression &&
                 ancestor.parent.callee.property.type === AST_NODE_TYPES.Identifier &&
                 ['map', 'forEach', 'reduce', 'filter'].includes(ancestor.parent.callee.property.name)
                ) {
                   context.report({
                    node,
                    messageId: 'noBatchInsertLoop',
                  });
                  break;
                }
             // Stop traversal at function boundary unless it's an IIFE?
             // Actually if we are in a function, we stop unless that function IS the loop body callback.
             // If we are in `function foo() { while(...) { query } }` -> we hit WhileStatement first.
             // If we are in `users.map(u => query(u))` -> query -> ArrowFunc -> CallExpression(map).
             
             // So if we hit a function, we must check if it's the specific loop callback.
             // If not, we stop (don't flag loop outside of function definition, that's weird).
             if (ancestor.parent?.type !== AST_NODE_TYPES.CallExpression) {
               // It's a regular function definition, stop going up (don't blame caller's loop).
               break; 
             }
          }

          ancestor = ancestor.parent;
        }
      },
    };
  },
};
