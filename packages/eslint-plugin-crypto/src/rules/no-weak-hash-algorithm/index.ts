/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-weak-hash-algorithm
 * Detects use of weak hash algorithms (MD5, SHA1, MD4)
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 *
 * @see https://cwe.mitre.org/data/definitions/327.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakHashAlgorithm'
  | 'useSha256'
  | 'useSha512'
  | 'useSha3';

export interface Options {
  /** Additional weak algorithms to detect. Default: [] */
  additionalWeakAlgorithms?: string[];
  /** Allow weak hashes in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Weak hash patterns and their safe alternatives
 */
interface WeakHashPattern {
  /** Regex pattern to match (case-insensitive) */
  pattern: RegExp;
  /** Algorithm name for display */
  name: string;
  /** Safe alternatives */
  alternatives: string[];
  /** Replacement algorithm */
  replacement: string;
}

const WEAK_HASH_PATTERNS: WeakHashPattern[] = [
  {
    pattern: /\bmd5\b/i,
    name: 'MD5',
    alternatives: ['SHA-256', 'SHA-512', 'SHA-3'],
    replacement: 'sha256',
  },
  {
    pattern: /\bmd4\b/i,
    name: 'MD4',
    alternatives: ['SHA-256', 'SHA-512', 'SHA-3'],
    replacement: 'sha256',
  },
  {
    pattern: /\bsha1\b/i,
    name: 'SHA-1',
    alternatives: ['SHA-256', 'SHA-512', 'SHA-3'],
    replacement: 'sha256',
  },
  {
    pattern: /\bripemd\b/i,
    name: 'RIPEMD',
    alternatives: ['SHA-256', 'SHA-512'],
    replacement: 'sha256',
  },
];

/**
 * Check if a string contains a weak hash algorithm
 */
function findWeakHash(
  value: string,
  additionalPatterns: string[]
): WeakHashPattern | null {
  // Check standard patterns
  for (const pattern of WEAK_HASH_PATTERNS) {
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
        alternatives: ['SHA-256', 'SHA-512'],
        replacement: 'sha256',
      };
    }
  }

  return null;
}

export const noWeakHashAlgorithm = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-hash-algorithm',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow weak hash algorithms (MD5, SHA1, MD4)',
    },
    hasSuggestions: true,
    messages: {
      weakHashAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak hash algorithm',
        cwe: 'CWE-327',
        description: 'Use of weak hash algorithm: {{algorithm}}. {{algorithm}} is cryptographically broken and unsuitable for security purposes.',
        severity: 'CRITICAL',
        fix: 'Replace with {{replacement}}: crypto.createHash("{{replacement}}").update(data)',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      useSha256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-256',
        description: 'Replace with SHA-256 for secure hashing',
        severity: 'LOW',
        fix: 'crypto.createHash("sha256").update(data)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatehashmethod-options',
      }),
      useSha512: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-512',
        description: 'Replace with SHA-512 for stronger hashing',
        severity: 'LOW',
        fix: 'crypto.createHash("sha512").update(data)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatehashmethod-options',
      }),
      useSha3: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-3',
        description: 'Replace with SHA-3 for latest standard',
        severity: 'LOW',
        fix: 'crypto.createHash("sha3-256").update(data)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatehashmethod-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalWeakAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional weak algorithms to detect',
          },
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow weak hashes in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      additionalWeakAlgorithms: [],
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      additionalWeakAlgorithms = [],
      allowInTests = false,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    /**
     * Check if a call expression uses a weak hash
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      // Check for crypto.createHash() pattern
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'createHash'
      ) {
        checkHashArgument(node);
      }

      // Check for standalone createHash() pattern
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'createHash'
      ) {
        checkHashArgument(node);
      }

      // Check for crypto-hash package: sha1(), md5()
      if (node.callee.type === AST_NODE_TYPES.Identifier) {
        const funcName = node.callee.name.toLowerCase();
        if (funcName === 'sha1' || funcName === 'md5' || funcName === 'md4') {
          const weakPattern = findWeakHash(funcName, additionalWeakAlgorithms);
          if (weakPattern) {
            context.report({
              node,
              messageId: 'weakHashAlgorithm',
              data: {
                algorithm: weakPattern.name,
                replacement: weakPattern.replacement,
              },
              suggest: [
                {
                  messageId: 'useSha256',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    if (node.callee.type === AST_NODE_TYPES.Identifier) {
                      return fixer.replaceText(node.callee, 'sha256');
                    }
                    return null;
                  },
                },
              ],
            });
          }
        }
      }
    }

    /**
     * Check the algorithm argument passed to createHash
     */
    function checkHashArgument(node: TSESTree.CallExpression) {
      for (const arg of node.arguments) {
        if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
          const weakPattern = findWeakHash(arg.value, additionalWeakAlgorithms);

          if (weakPattern) {
            context.report({
              node: arg,
              messageId: 'weakHashAlgorithm',
              data: {
                algorithm: weakPattern.name,
                replacement: weakPattern.replacement,
              },
              suggest: [
                {
                  messageId: 'useSha256',
                  fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(arg, `"sha256"`),
                },
                {
                  messageId: 'useSha512',
                  fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(arg, `"sha512"`),
                },
                {
                  messageId: 'useSha3',
                  fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(arg, `"sha3-256"`),
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

export type { Options as NoWeakHashAlgorithmOptions };
