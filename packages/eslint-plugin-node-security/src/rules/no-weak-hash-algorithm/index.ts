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
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES, isTestFilePath } from '@interlace/eslint-devkit';
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
const DEFAULT_NON_CRYPTOGRAPHIC_NAMES = [
  'sha', 'etag', 'cachekey', 'cachebuster',
  // A certificate THUMBPRINT is a protocol identifier, and SHA-1 is what the
  // protocol says. Azure AD / MSAL client-certificate auth sends the SHA-1
  // thumbprint as the JWS `x5t` header (RFC 7515 §4.1.7); picking SHA-256
  // there does not harden anything, it just fails to authenticate.
  // ahaenggli/AzureAD-LDAP-wrapper `src/graph.auth.js:43` is the measured
  // case — `const thumbprint = createHash('sha1').update(certBuffer)…`, where
  // the input name `certBuffer` is what promoted it to a security use.
  //
  // `thumbprint` and `x5t` only. NOT `fingerprint`, which is the broader word
  // — a PGP key fingerprint, a TLS/JA3 fingerprint and a device fingerprint
  // are all spelled that way and none of them is protocol-pinned to SHA-1.
  // `certFingerprint` stays a finding, and has its own lock.
  'thumbprint', 'x5t',
];

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
  // Added 2026-08-23 after an adversarial wave hashed 17 common credential
  // spellings with MD5 and found 12 of them silent. Every one is CWE-327.
  //
  // Chosen against `makeNameTest`'s mechanics rather than by feel: an entry
  // under 6 characters matches WHOLE WORDS only, and entries of 6 or more also
  // match as a substring of the joined identifier — which is why the compound
  // spellings are listed whole, `pincode` rather than `pin`.
  'otp', 'mfa', 'totp',
  'passphrase', 'pincode', 'mnemonic', 'seedphrase', 'masterkey',
  'securityanswer', 'recoverycode', 'backupcode',
];

/**
 * Deliberately NOT here: `pwd`, `pass` and `pin`.
 *
 * `pwd` was added and then removed the same day. It is the commonest short
 * spelling of "password" and it looked like the most valuable entry — but in
 * Node it is also `pwd` the working directory, and a wider FP control caught
 * `pwdDirectory`, `pwdPath` and `currentPwd` all reporting CWE-327 over
 * ordinary filesystem code. `password` has no second meaning; `pwd` does, in
 * exactly the ecosystem this plugin targets.
 *
 * Both are under six characters, so they would match whole words — and both
 * are ordinary words in code that has nothing to do with credentials. A test
 * `pass`, a loop `pass`, a `pin` on a map or a pinned tab. The compound forms
 * that DO mean a credential are covered above by their full spelling, which is
 * the same trade the list already makes for `cert` versus `certificate`.
 */

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
    // Whole-word, exactly as the security list is matched. A superset of the
    // old exact-membership test — `cacheKey` still normalizes to `cachekey` —
    // that additionally reads the compound spellings the corpus produced:
    // `certThumbprint`, `calculateThumbprint`.
    const isNonCryptographicName = makeNameTest(
      nonCryptographicNames.map(normalizeName),
    );

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    /** Is this hash stored under a name that marks it as an identifier? */
    function isNonCryptographicUse(node: TSESTree.Node): boolean {
      const stored = assignedName(node);
      if (stored !== null && isNonCryptographicName(stored)) return true;
      // `function calculateThumbprint(cert) { return createHash('sha1')… }`
      // stores nothing, so the name that says what this digest IS lives on the
      // function.
      const enclosing = enclosingFunctionName(node);
      return enclosing !== null && isNonCryptographicName(enclosing);
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

      // The enclosing function's name is the WEAKEST of the three, and it only
      // speaks for a digest whose destination is otherwise invisible. When the
      // digest IS stored somewhere, that name has already been read above and
      // said "not a security control" — the function name then describes the
      // function, not this value.
      //
      // shardeum/json-rpc-server `src/api.ts:1494` is the measured case:
      //
      //   eth_signTransaction: async function (args, callback) {
      //     const ticket = crypto.createHash('sha1')
      //       .update(api_name + Math.random() + Date.now()).digest('hex')
      //     logEventEmitter.emit('fn_start', ticket, api_name, …)
      //
      // `ticket` is a log-correlation id. The only thing that made it a
      // CRITICAL CWE-327 was the word `sign` inside the RPC method's name.
      if (stored !== null) return false;

      const enclosing = enclosingFunctionName(node);
      return enclosing !== null && isSecurityUse(enclosing);
    }

    /**
     * Check if a call expression uses a weak hash
     */
    /**
     * Is this `sha1(...)` call a local wrapper whose body is visible here?
     *
     * The bare-identifier branch exists for `crypto-hash`-style packages that
     * export a digest function under the algorithm's own name. It has no way
     * to tell those apart from a helper the file defines itself — and a
     * locally-defined helper is a name, not an algorithm:
     *
     *   function sha1(data, secret) {
     *     return crypto.createHmac("sha1", secret).update(data).digest("hex");
     *   }
     *
     * That is vercel/example-marketplace-integration's webhook verifier. It
     * computes an HMAC, and HMAC-SHA1 carries none of SHA-1's collision
     * weakness — the CRITICAL CWE-327 report was wrong on the substance, and
     * its suggestion rewrote the call to `sha256(...)`, renaming a function
     * that does not exist under that name and changing no algorithm at all.
     *
     * Skipping the call site loses nothing: whatever the body really uses is
     * reported where it is written, by the `createHash` branch above. An
     * identifier that resolves to nothing local — an import, a global, a
     * `crypto-hash` binding — still reports, so the branch keeps its job.
     */
    function isLocallyDefinedHelper(callee: TSESTree.Identifier): boolean {
      const scope = context.sourceCode.getScope(callee);
      for (
        let current: TSESLint.Scope.Scope | null = scope;
        current;
        current = current.upper
      ) {
        const variable = current.variables.find((v) => v.name === callee.name);
        if (!variable) continue;
        return variable.defs.some(
          (def) =>
            def.type === 'FunctionName' ||
            (def.type === 'Variable' &&
              (def.node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                def.node.init?.type === AST_NODE_TYPES.FunctionExpression)),
        );
      }
      return false;
    }

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
      //
      // Gated on the identifier actually resolving to one of those packages.
      // The name alone is not evidence: a local `function sha1(data, secret)`
      // that wraps `createHmac('sha1', secret)` is an HMAC, not a bare digest,
      // and HMAC-SHA1 carries none of SHA-1's collision weakness. Reported by
      // name, the suggestion also rewrote the call to `sha256(...)` — renaming
      // a local helper that does not exist under that name, changing no
      // algorithm and breaking the build.
      if (node.callee.type === AST_NODE_TYPES.Identifier) {
        const funcName = node.callee.name.toLowerCase();
        if (
          (funcName === 'sha1' || funcName === 'md5' || funcName === 'md4') &&
          !isLocallyDefinedHelper(node.callee)
        ) {
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
