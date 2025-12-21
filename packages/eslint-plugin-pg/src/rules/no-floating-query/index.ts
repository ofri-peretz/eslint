import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoFloatingQueryOptions } from '../../types';

export const noFloatingQuery: TSESLint.RuleModule<
  'noFloatingQuery',
  NoFloatingQueryOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all queries are awaited or returned to prevent unhandled promise rejections.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-floating-query.md',
    },
    messages: {
      noFloatingQuery: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Floating Query',
        description: 'Promise-returning query is neither awaited nor returned.',
        severity: 'HIGH',
        cwe: 'CWE-391',
        effort: 'low',
        fix: 'Add "await" or "return" to handle the query promise.',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
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

        // Check parent node to see if the promise is handled
        const parent = node.parent;
        
        // Allowed parents:
        // 1. AwaitExpression: await client.query(...)
        if (parent?.type === AST_NODE_TYPES.AwaitExpression) return;
        
        // 2. ReturnStatement: return client.query(...)
        if (parent?.type === AST_NODE_TYPES.ReturnStatement) return;
        
        // 3. ArrowFunctionExpression (implicit return): () => client.query(...)
        if (parent?.type === AST_NODE_TYPES.ArrowFunctionExpression) return;
        
        // 4. VariableDeclarator: const p = client.query(...) -> Assumed handled if assigned
        if (parent?.type === AST_NODE_TYPES.VariableDeclarator) return;
        
        // 5. MemberExpression: client.query(...).then(...) or .catch(...)
        if (parent?.type === AST_NODE_TYPES.MemberExpression) return; // check chains? 

        // 6. AssignmentExpression: p = client.query(...)
        if (parent?.type === AST_NODE_TYPES.AssignmentExpression) return;

        // If specific to typical void usage:
        // ExpressionStatement: client.query(...); -> This is bad!
        if (parent?.type === AST_NODE_TYPES.ExpressionStatement) {
           context.report({
            node,
            messageId: 'noFloatingQuery',
          });
        }
      },
    };
  },
};
