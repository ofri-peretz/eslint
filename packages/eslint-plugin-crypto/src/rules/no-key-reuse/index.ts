/**
 * ESLint Rule: no-key-reuse
 * Detects same key variable used for multiple cipher operations
 * CWE-323: Reusing a Nonce, Key Pair in Encryption
 *
 * @see https://cwe.mitre.org/data/definitions/323.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'keyReuse'
  | 'useUniqueKeys';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noKeyReuse = createRule<RuleOptions, MessageIds>({
  name: 'no-key-reuse',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when same key is used for multiple cipher operations',
    },
    hasSuggestions: true,
    messages: {
      keyReuse: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Key reuse detected',
        cwe: 'CWE-323',
        description: 'Key "{{keyName}}" is used in multiple cipher operations. Key reuse with the same IV enables cryptanalysis. Use different keys for different purposes.',
        severity: 'MEDIUM',
        fix: 'Derive separate keys for each operation using HKDF',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html#key-usage',
      }),
      useUniqueKeys: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use unique keys',
        description: 'Derive purpose-specific keys using HKDF or similar KDF',
        severity: 'LOW',
        fix: 'crypto.hkdf("sha256", masterKey, salt, info, keylen, callback)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptohkdfdigest-ikm-salt-info-keylen-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    // Track key usage: keyName -> call nodes
    const keyUsage = new Map<string, TSESTree.CallExpression[]>();

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      const cipherMethods = new Set(['createCipheriv', 'createDecipheriv']);

      const isCipherCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.name));

      if (isCipherCall && node.arguments.length >= 2) {
        const keyArg = node.arguments[1];

        // Track identifier usage
        if (keyArg.type === AST_NODE_TYPES.Identifier) {
          const keyName = keyArg.name;
          const existing = keyUsage.get(keyName) || [];
          existing.push(node);
          keyUsage.set(keyName, existing);
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      'Program:exit'() {
        // Report keys used more than once
        for (const [keyName, usages] of keyUsage) {
          if (usages.length > 1) {
            // Report on all usages after the first
            for (let i = 1; i < usages.length; i++) {
              const node = usages[i];
              const keyArg = node.arguments[1];
              /* c8 ignore next 11 -- suggestions with fix: () => null cannot be tested with RuleTester */
              context.report({
                node: keyArg,
                messageId: 'keyReuse',
                data: { keyName },
                suggest: [
                  {
                    messageId: 'useUniqueKeys',
                    fix: () => null, // Complex refactoring
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});

export type { Options as NoKeyReuseOptions };
