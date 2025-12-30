import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoUnsafeCopyFromOptions } from '../../types';

// Pre-compiled regex patterns for performance
const COPY_FROM_REGEX = /\bCOPY\b.*\bFROM\b/i;
const STDIN_REGEX = /\bFROM\s+STDIN\b/i;

// Helper to check for COPY FROM (but not COPY FROM STDIN)
const hasCopyFrom = (str: string) => COPY_FROM_REGEX.test(str) && !STDIN_REGEX.test(str);

export const noUnsafeCopyFrom: TSESLint.RuleModule<
  'noUnsafeCopyFrom',
  NoUnsafeCopyFromOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unsafe COPY FROM usage with dynamic file paths, which can lead to arbitrary file read/RCE.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-copy-from.md',
    },
    messages: {
      noUnsafeCopyFrom: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe COPY FROM',
        description: 'Unsafe "COPY ... FROM" usage detected.',
        severity: 'CRITICAL',
        cwe: 'CWE-73',
        owasp: 'A03:2021',
        compliance: ['SOC2', 'PCI-DSS'],
        effort: 'low',
        fix: 'Do not use dynamic file paths in COPY FROM. Use COPY FROM STDIN for user data.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
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

        // If literal string
        if (queryArg.type === AST_NODE_TYPES.Literal && typeof queryArg.value === 'string') {
          if (hasCopyFrom(queryArg.value)) {
             // If it's a fixed string like "COPY users FROM '/tmp/data.csv'", it might be "safe" from injection, 
             // but still risky if the developer didn't mean to allow server-side read. 
             // However, hardcoded usually implies intentional admin action.
             // We are mostly concerned with *dynamic* COPY FROM.
             // But CVE-2019-9193 is about admin usage.
             // Let's flag any usage of COPY FROM (server side) because COPY FROM STDIN is the modern/safe way for apps.
             context.report({
                node: queryArg,
                messageId: 'noUnsafeCopyFrom',
             });
          }
          return;
        }
        
        // If template literal or binary expression (dynamic)
        // We do basic string check on parts we can see
        let textToCheck = '';
        
        if (queryArg.type === AST_NODE_TYPES.TemplateLiteral) {
           textToCheck = queryArg.quasis.map(q => q.value.raw).join(' ');
        } else if (queryArg.type === AST_NODE_TYPES.BinaryExpression) {
            // Simplified check: if any literal part has "COPY" and "FROM"
             const parts: string[] = [];
              const stack: TSESTree.Node[] = [queryArg];
             for (let curr = stack.pop(); curr !== undefined; curr = stack.pop()) {
               if (curr.type === AST_NODE_TYPES.BinaryExpression && curr.operator === '+') {
                 stack.push(curr.right);
                 stack.push(curr.left);
               } else if (curr.type === AST_NODE_TYPES.Literal && typeof curr.value === 'string') {
                 parts.push(curr.value);
               }
             }
             textToCheck = parts.join(' ');
        }
        
        if (hasCopyFrom(textToCheck)) {
            context.report({
                node: queryArg,
                messageId: 'noUnsafeCopyFrom',
            });
        }
      },
    };
  },
};
