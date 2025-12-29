/**
 * ESLint Rule: no-algorithm-confusion
 *
 * Detects algorithm confusion attacks where symmetric algorithms (HS256/384/512)
 * are used with asymmetric keys (public keys). This allows attackers to sign
 * tokens using the public key as an HMAC secret.
 *
 * CWE-347: Improper Verification of Cryptographic Signature
 *
 * @see https://portswigger.net/web-security/jwt/algorithm-confusion
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isVerifyOperation,
  getOptionsArgument,
  extractAlgorithms,
} from '../../utils';
import type { NoAlgorithmConfusionOptions } from '../../types';

type MessageIds =
  | 'algorithmConfusion'
  | 'symmetricWithPublicKey'
  | 'useAsymmetricAlgorithm';

type RuleOptions = [NoAlgorithmConfusionOptions?];

// Patterns that indicate a public key
const PUBLIC_KEY_PATTERNS = [
  /public/i,
  /\.pub$/,
  /\.pem$/,
  /-----BEGIN PUBLIC KEY-----/,
  /-----BEGIN RSA PUBLIC KEY-----/,
  /-----BEGIN EC PUBLIC KEY-----/,
  /getPublicKey/i,
  /publicKey/i,
  /jwks/i,
];

export const noAlgorithmConfusion = createRule<RuleOptions, MessageIds>({
  name: 'no-algorithm-confusion',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent algorithm confusion attacks using symmetric algorithms with asymmetric keys',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      algorithmConfusion: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT Algorithm Confusion Attack',
        cwe: 'CWE-347',
        description:
          'Symmetric algorithm (HS*) used with public key allows token forgery',
        severity: 'CRITICAL',
        fix: 'Use asymmetric algorithms (RS256, ES256) with public keys',
        documentationLink:
          'https://portswigger.net/web-security/jwt/algorithm-confusion',
      }),
      symmetricWithPublicKey: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Symmetric Algorithm with Public Key',
        cwe: 'CWE-347',
        description:
          'HS256/384/512 should only be used with shared secrets, not public keys',
        severity: 'CRITICAL',
        fix: 'Switch to RS256 or ES256 for asymmetric key verification',
        documentationLink:
          'https://portswigger.net/web-security/jwt/algorithm-confusion',
      }),
      useAsymmetricAlgorithm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Asymmetric Algorithm',
        description: 'Replace HS* with RS* or ES* algorithm',
        severity: 'LOW',
        fix: 'Use RS256 or ES256 with public key verification',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          symmetricAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: ['HS256', 'HS384', 'HS512'],
            description: 'Algorithms to flag when used with public keys',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      symmetricAlgorithms: ['HS256', 'HS384', 'HS512'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const symmetricAlgSet = new Set(
      options.symmetricAlgorithms ?? ['HS256', 'HS384', 'HS512']
    );
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    /**
     * Check if a node looks like a public key reference
     */
    const looksLikePublicKey = (node: TSESTree.Node): boolean => {
      const text = sourceCode.getText(node);
      return PUBLIC_KEY_PATTERNS.some((pattern) => pattern.test(text));
    };

    /**
     * Check if algorithms include symmetric algorithms
     */
    const hasSymmetricAlgorithm = (algorithms: string[]): string | null => {
      for (const alg of algorithms) {
        if (symmetricAlgSet.has(alg)) {
          return alg;
        }
      }
      return null;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Only check verify operations
        if (!isVerifyOperation(node)) {
          return;
        }

        // Need at least 2 arguments: token, key
        if (node.arguments.length < 2) {
          return;
        }

        const keyArg = node.arguments[1];
        const optionsArg = getOptionsArgument(node, 2);

        // Check if key looks like a public key
        if (!looksLikePublicKey(keyArg)) {
          return;
        }

        // If there are options, check the algorithms
        if (optionsArg) {
          const algorithms = extractAlgorithms(optionsArg);
          const symmetricAlg = hasSymmetricAlgorithm(algorithms);

          if (symmetricAlg) {
            // Find the algorithm node for precise error location
            for (const prop of optionsArg.properties) {
              if (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                ['algorithms', 'algorithm', 'alg'].includes(prop.key.name)
              ) {
                context.report({
                  node: prop.value,
                  messageId: 'algorithmConfusion',
                  data: { algorithm: symmetricAlg },
                });
                return;
              }
            }
          }
        }

        // If no options specified but key looks like public key,
        // and we're in verify, flag as potential issue
        // (verification without explicit algorithm with public key is risky)
      },
    };
  },
});

export default noAlgorithmConfusion;
