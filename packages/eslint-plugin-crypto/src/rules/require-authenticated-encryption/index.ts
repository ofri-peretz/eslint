/**
 * ESLint Rule: require-authenticated-encryption
 * Flags CBC/CTR modes without explicit MAC
 * CWE-327: Use of Broken or Risky Cryptographic Algorithm
 *
 * CBC and CTR modes provide confidentiality but not integrity.
 * Without a MAC, ciphertext can be tampered with undetected.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#authenticated-encryption
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'unauthenticatedEncryption'
  | 'useGcm'
  | 'addHmac';

export interface Options {
  /** Allow unauthenticated modes in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Modes that don't provide authentication
const UNAUTHENTICATED_MODES = [
  /cbc$/i,
  /ctr$/i,
  /cfb$/i,
  /ofb$/i,
];

// Modes that provide authenticated encryption (AEAD)
const AUTHENTICATED_MODES = [
  /gcm$/i,
  /ccm$/i,
  /ocb$/i,
  /chacha20-poly1305$/i,
];

export const requireAuthenticatedEncryption = createRule<RuleOptions, MessageIds>({
  name: 'require-authenticated-encryption',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require authenticated encryption (GCM) instead of unauthenticated modes (CBC)',
    },
    hasSuggestions: true,
    messages: {
      unauthenticatedEncryption: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unauthenticated encryption',
        cwe: 'CWE-327',
        description: '{{mode}} mode does not provide authentication. Attackers can modify ciphertext without detection. This enables padding oracle attacks and other tampering.',
        severity: 'MEDIUM',
        fix: 'Use GCM mode for authenticated encryption, or add a separate HMAC',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#authenticated-encryption',
      }),
      useGcm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use GCM mode',
        description: 'GCM provides authenticated encryption (confidentiality + integrity)',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      addHmac: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add HMAC',
        description: 'If CBC is required, add HMAC-SHA256 over the ciphertext (Encrypt-then-MAC)',
        severity: 'LOW',
        fix: 'const mac = crypto.createHmac("sha256", macKey).update(ciphertext).digest()',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#encrypt-and-mac-methods',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unauthenticated encryption in test files',
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

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      const cipherMethods = new Set(['createCipheriv', 'createDecipheriv']);

      const isCipherCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.name));

      if (isCipherCall && node.arguments.length >= 1) {
        const algorithmArg = node.arguments[0];

        if (algorithmArg.type === AST_NODE_TYPES.Literal && typeof algorithmArg.value === 'string') {
          const algorithm = algorithmArg.value.toLowerCase();

          // Check if it's an unauthenticated mode
          const isUnauthenticated = UNAUTHENTICATED_MODES.some(p => p.test(algorithm));
          const isAuthenticated = AUTHENTICATED_MODES.some(p => p.test(algorithm));

          if (isUnauthenticated && !isAuthenticated) {
            // Extract mode name for display
            const modeParts = algorithm.split('-');
            const modeName = modeParts[modeParts.length - 1].toUpperCase();

            context.report({
              node: algorithmArg,
              messageId: 'unauthenticatedEncryption',
              data: {
                mode: modeName,
              },
              suggest: [
                {
                  messageId: 'useGcm',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    const gcmAlgorithm = algorithm.replace(/-(cbc|ctr|cfb|ofb)$/i, '-gcm');
                    return fixer.replaceText(algorithmArg, `"${gcmAlgorithm}"`);
                  },
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

export type { Options as RequireAuthenticatedEncryptionOptions };
