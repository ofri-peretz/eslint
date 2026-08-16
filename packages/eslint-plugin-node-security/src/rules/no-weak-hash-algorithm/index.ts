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
import { makeNameTest } from '../../utils/names';
import { resolveConstantString } from '../../utils/const-value';

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

  /**
   * Names that mark a hash as a security control, matched as whole words of
   * the identifier. Default: see DEFAULT_SECURITY_USE_NAMES.
   */
  securityUseNames?: string[];

  /**
   * Report a weak hash whose purpose cannot be determined from the surrounding
   * names. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour: every MD5/SHA-1 call is a
   * CRITICAL CWE-327. Measured on an 8-repo corpus that produced 6 findings,
   * all of them content digests.
   */
  reportUnclassifiedHashes?: boolean;
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

/**
 * Words that make a hash a SECURITY control rather than an identifier.
 *
 * The deny-list above could only ever chase names one at a time, and the corpus
 * showed why that loses: the six remaining findings were `fileHash(buff)`,
 * `hashString(str)`, `nonRandomUUID(subject)` and three `md5(content)` calls
 * inside `calculateChecksum` — content digests, every one. None is named
 * `etag` or `cacheKey`, and no list of "not a security use" names would have
 * caught them, because there is no bound on the ways to spell "checksum".
 *
 * So the question is asked the other way round. MD5 over a file to detect a
 * change is not CWE-327; MD5 over a password, a signature or a token is. The
 * rule now reports when it can SEE the security use, and
 * `reportUnclassifiedHashes` restores the sweep for projects that want every
 * weak-hash call listed.
 */
const DEFAULT_SECURITY_USE_NAMES = [
  'password', 'passwd', 'secret', 'secrets', 'token', 'tokens', 'signature',
  'signing', 'signed', 'sign', 'hmac', 'credential', 'credentials',
  'certificate', 'cert', 'certs', 'apikey', 'privatekey', 'secretkey',
  'signingkey', 'encryptionkey', 'session', 'csrf', 'salt', 'jwt', 'nonce',
  'integrity', 'auth', 'authorization', 'authenticate',
];

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

/** The readable name of an expression, for name-based judgements. */
function expressionName(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    return node.property.name;
  }
  return null;
}

/**
 * Every name fed into this hash: the call's own arguments plus the arguments of
 * every `.update(…)` in the chain hanging off it.
 *
 * `createHash('md5').update(password).digest()` puts the interesting value two
 * calls away from the node being judged, so a check that only read the direct
 * arguments would see `'md5'` and nothing else.
 */
function hashInputNames(node: TSESTree.CallExpression): string[] {
  const names: string[] = [];
  for (const argument of node.arguments) {
    const name = expressionName(argument);
    if (name !== null) names.push(name);
  }

  let current: TSESTree.Node = node;
  let parent = current.parent;
  while (parent) {
    if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === current) {
      current = parent;
      parent = current.parent;
      continue;
    }
    if (parent.type === AST_NODE_TYPES.CallExpression && parent.callee === current) {
      for (const argument of parent.arguments) {
        const name = expressionName(argument);
        if (name !== null) names.push(name);
      }
      current = parent;
      parent = current.parent;
      continue;
    }
    break;
  }
  return names;
}

/** The name of the nearest enclosing function, however it was declared. */
function enclosingFunctionName(node: TSESTree.Node): string | null {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.FunctionDeclaration ||
      current.type === AST_NODE_TYPES.FunctionExpression ||
      current.type === AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      if (current.type !== AST_NODE_TYPES.ArrowFunctionExpression && current.id) {
        return current.id.name;
      }
      // `const signRequest = () => …`, `{ signRequest() {} }`, `class … { sign() {} }`
      const owner = current.parent;
      if (owner?.type === AST_NODE_TYPES.VariableDeclarator) {
        return owner.id.type === AST_NODE_TYPES.Identifier ? owner.id.name : null;
      }
      if (
        (owner?.type === AST_NODE_TYPES.Property ||
          owner?.type === AST_NODE_TYPES.MethodDefinition) &&
        !owner.computed
      ) {
        return expressionName(owner.key);
      }
      return null;
    }
    current = current.parent;
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
          securityUseNames: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SECURITY_USE_NAMES,
            description:
              'Names that mark a hash as a security control (whole-word matched)',
          },
          reportUnclassifiedHashes: {
            type: 'boolean',
            default: false,
            description:
              'Report weak hashes whose purpose cannot be determined. Restores the pre-inversion behaviour.',
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
      securityUseNames = DEFAULT_SECURITY_USE_NAMES,
      reportUnclassifiedHashes = false,
    } = options as Options;
    const isSecurityUse = makeNameTest(securityUseNames);

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const nonCryptoNames = new Set(nonCryptographicNames.map(normalizeName));

    /** Is this hash stored under a name that marks it as an identifier? */
    function isNonCryptographicUse(node: TSESTree.Node): boolean {
      const name = assignedName(node);
      return name !== null && nonCryptoNames.has(normalizeName(name));
    }

    /**
     * Can this call be SEEN to feed a security decision?
     *
     * Three places carry the evidence, and any one of them is enough:
     *
     *   1. what the digest is stored as — `const signature = md5(body)`;
     *   2. what is being hashed — `createHash('md5').update(password)`, read
     *      off every `.update(…)` in the chain as well as the call's own
     *      arguments, so both the `md5(x)` and `createHash(…)` spellings work;
     *   3. what function it lives in — `function signRequest() { … }`.
     */
    function hasSecurityUse(node: TSESTree.CallExpression): boolean {
      const stored = assignedName(node);
      if (stored !== null && isSecurityUse(stored)) return true;

      for (const argument of hashInputNames(node)) {
        if (isSecurityUse(argument)) return true;
      }

      const enclosing = enclosingFunctionName(node);
      return enclosing !== null && isSecurityUse(enclosing);
    }

    /**
     * Check if a call expression uses a weak hash
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;
      if (isNonCryptographicUse(node)) return;
      // Report on a visible security use, not on the algorithm alone.
      if (!reportUnclassifiedHashes && !hasSecurityUse(node)) return;

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
        // `const ALGO = 'md5'; createHash(ALGO)` runs MD5 exactly as the inline
        // spelling does. Reading only `arg.type === 'Literal'` made hoisting the
        // algorithm to a module constant a silencer — see `utils/const-value`.
        const resolved = resolveConstantString(context.sourceCode, arg);
        if (resolved === null) continue;
        const weakPattern = findWeakHash(resolved.value, additionalWeakAlgorithms);
        if (!weakPattern) continue;

        // Report at the call site the reader is looking at; fix at the
        // declaration that decides the value.
        const target = resolved.source;
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
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(target, `"sha256"`),
            },
            {
              messageId: 'useSha512',
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(target, `"sha512"`),
            },
            {
              messageId: 'useSha3',
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(target, `"sha3-256"`),
            },
          ],
        });
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoWeakHashAlgorithmOptions };
