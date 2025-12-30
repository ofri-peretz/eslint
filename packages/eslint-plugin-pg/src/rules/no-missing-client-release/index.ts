import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoMissingClientReleaseOptions } from '../../types';

export const noMissingClientRelease: TSESLint.RuleModule<
  'missingClientRelease',
  NoMissingClientReleaseOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure pg client is released after use to prevent pool exhaustion.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-missing-client-release.md',
    },
    messages: {
      missingClientRelease: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Missing Client Release',
        description: 'PG client acquired but not released.',
        severity: 'HIGH',
        cwe: 'CWE-404',
        owasp: 'A05:2025',
        effort: 'low',
        fix: 'Ensure "client.release()" is called in a finally block to return the client to the pool.',
        documentationLink: 'https://node-postgres.com/features/pooling#checkout-use-and-return',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // Detect: const client = await pool.connect() or pool.connect().then(client => ...)
        // For simplicity, we focus on await usage in async functions, which is the modern pattern.
        
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'connect'
        ) {
          return;
        }

        // We assume valid code would assign the result: const client = await pool.connect()
        // Parent of CallExpression is AwaitExpression (usually)
        // Parent of AwaitExpression is VariableDeclarator
        
        // Check ancestry up to VariableDeclarator
        let currentNode: TSESTree.Node = node;
        if (node.parent?.type === AST_NODE_TYPES.AwaitExpression) {
          currentNode = node.parent;
        }
        
        if (currentNode.parent?.type !== AST_NODE_TYPES.VariableDeclarator) {
           return; 
        }

        const declarator = currentNode.parent;
        if (declarator.id.type !== AST_NODE_TYPES.Identifier) {
          // Destructuring not supported for basic check yet
          return;
        }

        // Variable name is available as declarator.id.name if needed for debugging
        
        // Find the scope of the variable
        const variable = context.sourceCode.getDeclaredVariables(declarator)[0];
        if (!variable) return;

        // Check references to this variable
        // We look for client.release() call
        const references = variable.references;
        const hasReleaseCall = references.some(ref => {
          const id = ref.identifier;
          // Check if identifier is part of member expression 'client.release()' calls
          return (
             id.parent?.type === AST_NODE_TYPES.MemberExpression &&
             id.parent.object === id &&
             id.parent.property.type === AST_NODE_TYPES.Identifier &&
             id.parent.property.name === 'release' &&
             id.parent.parent?.type === AST_NODE_TYPES.CallExpression
          );
        });

        if (!hasReleaseCall) {
          context.report({
            node: declarator,
            messageId: 'missingClientRelease',
          });
        }
      },
    };
  },
};
