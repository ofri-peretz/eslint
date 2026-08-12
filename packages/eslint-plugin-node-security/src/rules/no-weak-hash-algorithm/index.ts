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
  /**
   * Names that mark a hash as an identifier rather than a security control.
   * Default: `['sha', 'etag', 'cachekey', 'cachebuster']`, matched
   * case-insensitively with `_` and `-` stripped.
   */
  nonCryptographicNames?: string[];
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
 * Names whose value is a content identifier, not a security control.
 *
 * `redis/ioredis` `lib/Script.ts:15` is the archetype:
 *
 * ```ts
 * this.sha = createHash("sha1").update(lua).digest("hex");
 * ```
 *
 * SHA-1 *is* used, so the detection is correct — but this is the EVALSHA
 * script identifier the Redis wire protocol mandates. The algorithm is not the
 * maintainer's choice, and no attack on SHA-1's collision resistance buys
 * anything: the value indexes a script the server already holds. A maintainer
 * reading `CWE-327 | CRITICAL` here correctly concludes the tool does not
 * understand their code.
 *
 * The same shape covers HTTP ETags, content-addressed caches, and cache
 * busting. Matched case-insensitively with `_` and `-` stripped, so `cache_key`
 * and `cacheKey` are the same name.
 */
const DEFAULT_NON_CRYPTOGRAPHIC_NAMES = ['sha', 'etag', 'cachekey', 'cachebuster'];

/** Strip separators and case so `cache_key`, `cache-key` and `cacheKey` unify. */
function normalizeName(name: string): string {
  return name.replaceAll(/[_-]/g, '').toLowerCase();
}

/**
 * Where does this hash end up?
 *
 * `createHash('sha1').update(lua).digest('hex')` buries the `createHash` call
 * at the bottom of a member/call chain, so the assignment target is several
 * parents up. Walk out through that chain — and only that chain — then read the
 * name being assigned to.
 *
 * Deliberately conservative: it stops at the first node that is not part of the
 * chain, so a hash passed to a function, returned, or compared is never exempt.
 * Only a hash that is *stored under a non-cryptographic name* qualifies.
 */
function assignedName(node: TSESTree.Node): string | null {
  let current: TSESTree.Node = node;
  let parent = current.parent;

  // Climb the `.update(…).digest(…)` chain: each step must have `current` as
  // the *receiver*, never as an argument.
  while (parent) {
    if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === current) {
      current = parent;
      parent = current.parent;
      continue;
    }
    if (parent.type === AST_NODE_TYPES.CallExpression && parent.callee === current) {
      current = parent;
      parent = current.parent;
      continue;
    }
    break;
  }

  if (!parent) return null;

  if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.init === current) {
    return parent.id.type === AST_NODE_TYPES.Identifier ? parent.id.name : null;
  }
  if (parent.type === AST_NODE_TYPES.AssignmentExpression && parent.right === current) {
    const target = parent.left;
    if (target.type === AST_NODE_TYPES.Identifier) return target.name;
    if (
      target.type === AST_NODE_TYPES.MemberExpression &&
      !target.computed &&
      target.property.type === AST_NODE_TYPES.Identifier
    ) {
      return target.property.name;
    }
    return null;
  }
  if (parent.type === AST_NODE_TYPES.Property && parent.value === current) {
    // A computed key is a variable, so its text is not the property name.
    if (parent.computed) return null;
    if (parent.key.type === AST_NODE_TYPES.Identifier) return parent.key.name;
    // `{ 'cache-key': … }` names the same property as `{ cache_key: … }`.
    // Reading only Identifier keys made the exemption depend on quoting.
    if (parent.key.type === AST_NODE_TYPES.Literal && typeof parent.key.value === 'string') {
      return parent.key.value;
    }
    return null;
  }

  return null;
}

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-weak-hash-algorithm.md',
      description: 'Disallow weak hash algorithms (MD5, SHA1, MD4)',
      cwe: 'CWE-327',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      weakHashAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak hash algorithm',
        cwe: 'CWE-327',
        description: 'Use of weak hash algorithm: {{algorithm}}. {{algorithm}} is cryptographically broken and unsuitable for security purposes.',
        severity: 'CRITICAL',
        fix: 'Replace with {{replacement}}: crypto.createHash("{{replacement}}").update(data). If this hash is an identifier rather than a security control — an EVALSHA key, an ETag, a cache key — store it under one of the nonCryptographicNames instead.',
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
          nonCryptographicNames: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_NON_CRYPTOGRAPHIC_NAMES,
            description:
              'Assignment target names that mark a hash as an identifier rather than a security control',
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
      nonCryptographicNames: DEFAULT_NON_CRYPTOGRAPHIC_NAMES,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      additionalWeakAlgorithms = [],
      allowInTests = false,
      nonCryptographicNames = DEFAULT_NON_CRYPTOGRAPHIC_NAMES,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const nonCryptoNames = new Set(nonCryptographicNames.map(normalizeName));

    /** Is this hash stored under a name that marks it as an identifier? */
    function isNonCryptographicUse(node: TSESTree.Node): boolean {
      const name = assignedName(node);
      return name !== null && nonCryptoNames.has(normalizeName(name));
    }

    /**
     * Check if a call expression uses a weak hash
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;
      if (isNonCryptographicUse(node)) return;

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
          // funcName is one of sha1/md5/md4, each of which always matches a
          // WEAK_HASH_PATTERNS entry, so findWeakHash cannot return null here.
          const weakPattern = findWeakHash(
            funcName,
            additionalWeakAlgorithms
          ) as WeakHashPattern;
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
