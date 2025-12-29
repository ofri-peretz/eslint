/**
 * ESLint Rule: no-weak-cipher-algorithm
 * Detects use of weak cipher algorithms (DES, 3DES, RC4, Blowfish)
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 *
 * @see https://cwe.mitre.org/data/definitions/327.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakCipherAlgorithm'
  | 'useAes256Gcm'
  | 'useChaCha20';

export interface Options {
  /** Additional weak ciphers to detect. Default: [] */
  additionalWeakCiphers?: string[];
  /** Allow weak ciphers in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Weak cipher patterns and their safe alternatives
 */
interface WeakCipherPattern {
  /** Regex pattern to match (case-insensitive) */
  pattern: RegExp;
  /** Algorithm name for display */
  name: string;
  /** Safe alternatives */
  alternatives: string[];
  /** Replacement algorithm */
  replacement: string;
}

const WEAK_CIPHER_PATTERNS: WeakCipherPattern[] = [
  {
    pattern: /\bdes\b(?!-ede)/i,
    name: 'DES',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
  {
    pattern: /\bdes-ede3?\b|\b3des\b|\btripledes\b/i,
    name: '3DES',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
  {
    pattern: /\brc4\b|\barc4\b/i,
    name: 'RC4',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
  {
    pattern: /\bblowfish\b|\bbf\b/i,
    name: 'Blowfish',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
  {
    pattern: /\brc2\b/i,
    name: 'RC2',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
  {
    pattern: /\bidea\b/i,
    name: 'IDEA',
    alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
    replacement: 'aes-256-gcm',
  },
];

/**
 * Check if a string contains a weak cipher algorithm
 */
function findWeakCipher(
  value: string,
  additionalPatterns: string[]
): WeakCipherPattern | null {
  // Check standard patterns
  for (const pattern of WEAK_CIPHER_PATTERNS) {
    if (pattern.pattern.test(value)) {
      return pattern;
    }
  }

  // Check additional patterns
  for (const additionalPattern of additionalPatterns) {
    const regex = new RegExp(`\\b${additionalPattern}\\b`, 'i');
    if (regex.test(value)) {
      return {
        pattern: regex,
        name: additionalPattern.toUpperCase(),
        alternatives: ['AES-256-GCM', 'ChaCha20-Poly1305'],
        replacement: 'aes-256-gcm',
      };
    }
  }

  return null;
}

export const noWeakCipherAlgorithm = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-cipher-algorithm',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow weak cipher algorithms (DES, 3DES, RC4, Blowfish)',
    },
    hasSuggestions: true,
    messages: {
      weakCipherAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak cipher algorithm',
        cwe: 'CWE-327',
        description: 'Use of weak cipher algorithm: {{algorithm}}. {{algorithm}} has known vulnerabilities and should not be used.',
        severity: 'CRITICAL',
        fix: 'Replace with {{replacement}}: crypto.createCipheriv("{{replacement}}", key, iv)',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      useAes256Gcm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use AES-256-GCM',
        description: 'Replace with AES-256-GCM for authenticated encryption',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      useChaCha20: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use ChaCha20-Poly1305',
        description: 'Replace with ChaCha20-Poly1305 for modern encryption',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("chacha20-poly1305", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalWeakCiphers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional weak ciphers to detect',
          },
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow weak ciphers in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      additionalWeakCiphers: [],
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      additionalWeakCiphers = [],
      allowInTests = false,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    /**
     * Check if a call expression uses a weak cipher
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      const cipherMethods = new Set(['createCipher', 'createCipheriv', 'createDecipher', 'createDecipheriv']);

      // Check for crypto.createCipher*() pattern
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        cipherMethods.has(node.callee.property.name)
      ) {
        checkCipherArgument(node);
      }

      // Check for standalone createCipher*() pattern
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        cipherMethods.has(node.callee.name)
      ) {
        checkCipherArgument(node);
      }
    }

    /**
     * Check the algorithm argument passed to createCipher*
     */
    function checkCipherArgument(node: TSESTree.CallExpression) {
      const firstArg = node.arguments[0];
      if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
        const weakPattern = findWeakCipher(firstArg.value, additionalWeakCiphers);

        if (weakPattern) {
          context.report({
            node: firstArg,
            messageId: 'weakCipherAlgorithm',
            data: {
              algorithm: weakPattern.name,
              replacement: weakPattern.replacement,
            },
            suggest: [
              {
                messageId: 'useAes256Gcm',
                fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(firstArg, `"aes-256-gcm"`),
              },
              {
                messageId: 'useChaCha20',
                fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(firstArg, `"chacha20-poly1305"`),
              },
            ],
          });
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoWeakCipherAlgorithmOptions };
