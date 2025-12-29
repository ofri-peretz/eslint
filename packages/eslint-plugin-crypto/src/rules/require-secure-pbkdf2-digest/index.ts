/**
 * ESLint Rule: require-secure-pbkdf2-digest
 * Detects PBKDF2 using weak hash algorithms (SHA1)
 * CWE-328: Use of Weak Hash
 * CVE-2023-46233: crypto-js uses SHA1 as default for PBKDF2
 *
 * @see https://cwe.mitre.org/data/definitions/328.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakPbkdf2Digest'
  | 'useSha256'
  | 'useSha512';

export interface Options {
  /** Allowed digest algorithms. Default: ['sha256', 'sha384', 'sha512'] */
  allowedDigests?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_ALLOWED_DIGESTS = ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-384', 'sha3-512'];
const WEAK_DIGESTS = new Set(['sha1', 'md5', 'md4', 'ripemd160', 'sha']);

export const requireSecurePbkdf2Digest = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-pbkdf2-digest',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require secure digest algorithm for PBKDF2 (not SHA1)',
    },
    hasSuggestions: true,
    messages: {
      weakPbkdf2Digest: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak PBKDF2 digest',
        cwe: 'CWE-328',
        description: 'PBKDF2 using {{algorithm}} is weak. SHA1 has known vulnerabilities and should not be used for password hashing.',
        severity: 'HIGH',
        fix: 'Use SHA-256 or SHA-512 as the digest algorithm',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
      }),
      useSha256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-256',
        description: 'Use SHA-256 as the PBKDF2 digest algorithm',
        severity: 'LOW',
        fix: 'crypto.pbkdf2(password, salt, iterations, keylen, "sha256", callback)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback',
      }),
      useSha512: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-512',
        description: 'Use SHA-512 as the PBKDF2 digest algorithm',
        severity: 'LOW',
        fix: 'crypto.pbkdf2(password, salt, iterations, keylen, "sha512", callback)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedDigests: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ALLOWED_DIGESTS,
            description: 'Allowed digest algorithms',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedDigests: DEFAULT_ALLOWED_DIGESTS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowedDigests = DEFAULT_ALLOWED_DIGESTS } = options as Options;
    const allowedSet = new Set(allowedDigests.map(d => d.toLowerCase()));

    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for crypto.pbkdf2() or crypto.pbkdf2Sync()
      const isPbkdf2Call =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'pbkdf2' || node.callee.property.name === 'pbkdf2Sync')) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          (node.callee.name === 'pbkdf2' || node.callee.name === 'pbkdf2Sync'));

      if (isPbkdf2Call) {
        // pbkdf2(password, salt, iterations, keylen, digest, callback)
        // digest is the 5th argument (index 4)
        const digestArg = node.arguments[4];

        if (digestArg?.type === AST_NODE_TYPES.Literal && typeof digestArg.value === 'string') {
          const digest = digestArg.value.toLowerCase();

          if (WEAK_DIGESTS.has(digest) || !allowedSet.has(digest)) {
            context.report({
              node: digestArg,
              messageId: 'weakPbkdf2Digest',
              data: {
                algorithm: digestArg.value.toUpperCase(),
              },
              suggest: [
                {
                  messageId: 'useSha256',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(digestArg, '"sha256"');
                  },
                },
                {
                  messageId: 'useSha512',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(digestArg, '"sha512"');
                  },
                },
              ],
            });
          }
        }
      }

      // Check for scrypt with weak options (N parameter too low)
      // Also check for CryptoJS.PBKDF2 which defaults to SHA1
      const isCryptoJsPbkdf2 =
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'PBKDF2';

      if (isCryptoJsPbkdf2) {
        // Check if options specify a secure hasher
        const optionsArg = node.arguments[2];
        if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) {
          // No options = using defaults = SHA1
          /* c8 ignore next 12 -- CryptoJS pattern with fix: () => null cannot be tested with RuleTester */
          context.report({
            node,
            messageId: 'weakPbkdf2Digest',
            data: {
              algorithm: 'SHA1 (default)',
            },
            suggest: [
              {
                messageId: 'useSha256',
                fix: () => null, // Complex migration
              },
            ],
          });
        } else {
          // Check if hasher is specified and is not SHA1
          let hasSecureHasher = false;
          for (const prop of optionsArg.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'hasher'
            ) {
              hasSecureHasher = true;
              // Could further check if hasher is SHA256/512
            }
          }
          if (!hasSecureHasher) {
            /* c8 ignore next 12 -- CryptoJS pattern with fix: () => null cannot be tested with RuleTester */
            context.report({
              node,
              messageId: 'weakPbkdf2Digest',
              data: {
                algorithm: 'SHA1 (default)',
              },
              suggest: [
                {
                  messageId: 'useSha256',
                  fix: () => null,
                },
              ],
            });
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as RequireSecurePbkdf2DigestOptions };
