import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoUnsafeCopyFromOptions } from '../../types';

// Pre-compiled regex patterns for performance
const COPY_FROM_REGEX = /\bCOPY\b.*\bFROM\b/i;
const STDIN_REGEX = /\bFROM\s+STDIN\b/i;
// Extract file path from COPY FROM 'path' pattern
const FILE_PATH_REGEX = /FROM\s+['"]([^'"]+)['"]/i;

// Helper to check for COPY FROM (but not COPY FROM STDIN)
const hasCopyFrom = (str: string) => COPY_FROM_REGEX.test(str) && !STDIN_REGEX.test(str);

// Extract file path from COPY statement
const extractFilePath = (str: string): string | null => {
  const match = FILE_PATH_REGEX.exec(str);
  return match ? match[1] : null;
};

type MessageIds = 'dynamicPath' | 'hardcodedPath' | 'unverifiablePath';

export const noUnsafeCopyFrom: TSESLint.RuleModule<
  MessageIds,
  NoUnsafeCopyFromOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unsafe COPY FROM usage with dynamic file paths, which can lead to arbitrary file read/RCE.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-copy-from.md',
    },
    messages: {
      dynamicPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'COPY FROM Injection',
        description: 'Dynamic file path in COPY FROM detected - potential arbitrary file read.',
        severity: 'CRITICAL',
        cwe: 'CWE-73',
        owasp: 'A03:2021',
        compliance: ['SOC2', 'PCI-DSS'],
        effort: 'low',
        fix: 'Never use user input in COPY FROM paths. Use COPY FROM STDIN for user data.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
      hardcodedPath: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Server-side COPY FROM',
        description: 'Hardcoded file path in COPY FROM - server-side file access.',
        severity: 'MEDIUM',
        cwe: 'CWE-73',
        effort: 'low',
        fix: 'Prefer COPY FROM STDIN for application code. Use allowHardcodedPaths option if this is an admin script.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
      unverifiablePath: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unverifiable COPY FROM',
        description: 'Cannot statically verify COPY FROM source - potential injection risk.',
        severity: 'MEDIUM',
        cwe: 'CWE-73',
        effort: 'medium',
        fix: 'Ensure the query source does not contain user input, or refactor to use COPY FROM STDIN.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowHardcodedPaths: {
            type: 'boolean',
            description: 'Allow hardcoded file paths (for admin/migration scripts)',
          },
          allowedPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of allowed file path patterns (regex strings)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] ?? {};
    const allowHardcodedPaths = options.allowHardcodedPaths ?? false;
    const allowedPaths = (options.allowedPaths ?? []).map((p: string) => new RegExp(p));

    // Check if a file path matches any allowed pattern
    const isPathAllowed = (filePath: string): boolean => {
      return allowedPaths.some((pattern: RegExp) => pattern.test(filePath));
    };

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

        // Case 1: Literal string - can fully analyze
        if (queryArg.type === AST_NODE_TYPES.Literal && typeof queryArg.value === 'string') {
          if (hasCopyFrom(queryArg.value)) {
            const filePath = extractFilePath(queryArg.value);
            
            // Check if path is in allowlist
            if (filePath && isPathAllowed(filePath)) {
              return; // Explicitly allowed
            }
            
            // Hardcoded path - report as medium severity (or skip if allowed)
            if (allowHardcodedPaths) {
              return; // User opted to allow hardcoded paths
            }
            
            context.report({
              node: queryArg,
              messageId: 'hardcodedPath',
            });
          }
          return;
        }
        
        // Case 2: Template literal - check for dynamic expressions
        if (queryArg.type === AST_NODE_TYPES.TemplateLiteral) {
          const staticText = queryArg.quasis.map(q => q.value.raw).join(' ');
          
          if (hasCopyFrom(staticText)) {
            // Has expressions = dynamic = CRITICAL
            if (queryArg.expressions.length > 0) {
              context.report({
                node: queryArg,
                messageId: 'dynamicPath',
              });
            } else {
              // No expressions = effectively a static string
              const filePath = extractFilePath(staticText);
              if (filePath && isPathAllowed(filePath)) {
                return;
              }
              if (!allowHardcodedPaths) {
                context.report({
                  node: queryArg,
                  messageId: 'hardcodedPath',
                });
              }
            }
          }
          return;
        }
        
        // Case 3: Binary expression (string concatenation)
        if (queryArg.type === AST_NODE_TYPES.BinaryExpression) {
          const parts: string[] = [];
          let hasDynamicPart = false;
          
          const stack: TSESTree.Node[] = [queryArg];
          for (let curr = stack.pop(); curr !== undefined; curr = stack.pop()) {
            if (curr.type === AST_NODE_TYPES.BinaryExpression && curr.operator === '+') {
              stack.push(curr.right);
              stack.push(curr.left);
            } else if (curr.type === AST_NODE_TYPES.Literal && typeof curr.value === 'string') {
              parts.push(curr.value);
            } else {
              // Non-literal part = dynamic
              hasDynamicPart = true;
            }
          }
          
          const staticText = parts.join(' ');
          if (hasCopyFrom(staticText)) {
            if (hasDynamicPart) {
              context.report({
                node: queryArg,
                messageId: 'dynamicPath',
              });
            } else {
              // All literals - treat as hardcoded
              const filePath = extractFilePath(staticText);
              if (filePath && isPathAllowed(filePath)) {
                return;
              }
              if (!allowHardcodedPaths) {
                context.report({
                  node: queryArg,
                  messageId: 'hardcodedPath',
                });
              }
            }
          }
          return;
        }
        
        // Case 4: Identifier or CallExpression - cannot verify statically
        if (
          queryArg.type === AST_NODE_TYPES.Identifier ||
          queryArg.type === AST_NODE_TYPES.CallExpression
        ) {
          // We can't see what's in the variable/function - flag as unverifiable
          // This catches: client.query(sqlQuery) or client.query(buildQuery())
          // We report as medium severity since we can't confirm it's COPY FROM
          // Actually, we can't even confirm it's COPY FROM, so let's not report
          // unless we want to be very aggressive. For now, skip these.
          // The user would need to ensure the source is safe.
          return;
        }
      },
    };
  },
};
