import { TSESLint, AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoTransactionOnPoolOptions } from '../../types';

// Pre-defined set of transaction keywords for fast lookup
const TRANSACTION_KEYWORDS = new Set(['BEGIN', 'COMMIT', 'ROLLBACK']);

export const noTransactionOnPool: TSESLint.RuleModule<
  'noTransactionOnPool',
  NoTransactionOnPoolOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent starting transactions directly on the Pool, which is unsafe due to lack of client affinity.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-transaction-on-pool.md',
    },
    messages: {
      noTransactionOnPool: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Transaction on Pool',
        description: 'Transactions should not be started on the Pool directly.',
        severity: 'HIGH',
        effort: 'low',
        fix: 'Use "await pool.connect()" to get a client, then start the transaction on the client.',
        documentationLink: 'https://node-postgres.com/features/transactions',
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
        if (args.length === 0) return;

        const queryArg = args[0];
        
        // Only check literals
        if (queryArg.type !== AST_NODE_TYPES.Literal || typeof queryArg.value !== 'string') {
          return;
        }

        const queryText = queryArg.value.toUpperCase().trim();
        
        // Extract first word (handles "BEGIN", "BEGIN;", "BEGIN TRANSACTION", etc.)
        const firstWord = queryText.split(/[;\s]/)[0];
        
        if (TRANSACTION_KEYWORDS.has(firstWord)) {
           // Heuristic: If the variable name is 'pool' or ends with 'Pool', stronger signal.
           // However, for safety, if we see pool.query('BEGIN'), it's almost always wrong unless it's a test mock.
           // Let's rely on variable name hint for false positive reduction, or just flag it generally.
           // The most common error is `pool.query('BEGIN')`.
           
           if (
             node.callee.object.type === AST_NODE_TYPES.Identifier &&
             (node.callee.object.name === 'pool' || node.callee.object.name.toLowerCase().includes('pool'))
           ) {
              context.report({
                node: queryArg,
                messageId: 'noTransactionOnPool',
              });
           }
        }
      },
    };
  },
};
