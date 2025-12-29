/**
 * ESLint Rule: no-ecb-mode
 * Detects use of ECB encryption mode which leaks data patterns
 * CWE-327: ECB mode encrypts identical blocks identically
 *
 * @see https://blog.cloudflare.com/why-are-some-images-more-secure-than-others/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'ecbMode'
  | 'useGcm'
  | 'useCbc';

export interface Options {
  /** Allow ECB in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noEcbMode = createRule<RuleOptions, MessageIds>({
  name: 'no-ecb-mode',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow ECB encryption mode (use GCM or CBC instead)',
    },
    hasSuggestions: true,
    messages: {
      ecbMode: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ECB mode detected',
        cwe: 'CWE-327',
        description: 'ECB mode encrypts identical plaintext blocks to identical ciphertext, leaking data patterns. Famous example: the "ECB penguin".',
        severity: 'HIGH',
        fix: 'Use GCM mode for authenticated encryption: crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://blog.cloudflare.com/why-are-some-images-more-secure-than-others/',
      }),
      useGcm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use GCM mode',
        description: 'GCM provides authenticated encryption (confidentiality + integrity)',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      useCbc: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use CBC mode',
        description: 'CBC with HMAC provides confidentiality (add separate MAC for integrity)',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-cbc", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow ECB mode in test files',
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

      const cipherMethods = new Set(['createCipher', 'createCipheriv', 'createDecipher', 'createDecipheriv']);

      // Check for crypto.createCipher*() pattern
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
          if (algorithm.includes('-ecb') || algorithm.endsWith('ecb')) {
            const gcmReplacement = algorithm.replace(/-?ecb$/, '-gcm');
            
            /* c8 ignore next 18 -- suggestions require output assertions which are impractical for dynamic fixes */
            context.report({
              node: algorithmArg,
              messageId: 'ecbMode',
              suggest: [
                {
                  messageId: 'useGcm',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(algorithmArg, `"${gcmReplacement}"`);
                  },
                },
                {
                  messageId: 'useCbc',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    const cbcReplacement = algorithm.replace(/-?ecb$/, '-cbc');
                    return fixer.replaceText(algorithmArg, `"${cbcReplacement}"`);
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

export type { Options as NoEcbModeOptions };
