/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-math-random-crypto
 * Detects Math.random() used in cryptographic contexts
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * Math.random() is not cryptographically secure and should never be used
 * for tokens, keys, IVs, salts, or any security-sensitive random values.
 *
 * @see https://cwe.mitre.org/data/definitions/338.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { makeNameTest } from '../../utils/names';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
} from '@interlace/eslint-devkit';

type MessageIds = 'mathRandomCrypto' | 'useRandomBytes' | 'useRandomUUID';

export interface Options {
  /** Allow Math.random() in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Words that name a security value. Matched as whole words — see
 * {@link makeNameTest}.
 *
 * `random` is NOT here, and that omission is the measured fix. On the 8-repo
 * corpus `/random/i` alone produced four of six findings — `const random =
 * Math.floor(Math.random() * totalWeight)` picking a DNS SRV record by weight
 * (`redis/ioredis` `lib/cluster/util.ts:139`), `takeRandomFromArray`,
 * `getRandomDelay`, `generate_random_char` building a DOM id. Naming a variable
 * after the function that produced it says nothing about what it is FOR, which
 * is the only question CWE-338 asks.
 */
const CRYPTO_WORDS: readonly string[] = [
  'token', 'tokens', 'key', 'keys', 'secret', 'secrets', 'password', 'passwd',
  'salt', 'iv', 'nonce', 'seed', 'hash', 'cipher', 'auth', 'session', 'csrf',
  'otp', 'pin', 'code', 'codes', 'verify', 'signature', 'credential', 'jwt',
  'encryption', 'apikey',
];

/** Does this name suggest the value is a security value? */
const nameSuggestsCrypto = makeNameTest(CRYPTO_WORDS);

// Function names that suggest cryptographic usage
const CRYPTO_FUNCTION_PATTERNS = [
  /generate.*token/i,
  /generate.*key/i,
  /generate.*id/i,
  /create.*secret/i,
  /create.*token/i,
  // A general-purpose random STRING builder is the shape CWE-338 is about:
  // `okta/okta-auth-js` `lib/util/misc.ts:21` defines `genRandomString`, and
  // `lib/oidc/util/oauth.ts:18` calls it for the OAuth `state` and `nonce`.
  // Preserved deliberately — this is a true positive, and narrowing the rule
  // must not reach it.
  /random.*string/i,
  // `get.*random` used to match `getRandomDelay` — a retry jitter, which is
  // exactly the "not a security decision" case. The suffix is what makes the
  // value a credential rather than a coin flip.
  /get.*random.*(string|bytes|token|key|secret|value|id)/i,
  /make.*salt/i,
  /gen.*password/i,
];

export const noMathRandomCrypto = createRule<RuleOptions, MessageIds>({
  name: 'no-math-random-crypto',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-math-random-crypto.md',
      description: 'Disallow Math.random() for cryptographic purposes',
      cwe: 'CWE-338',
      cvss: 5.3,
      confidence: 'medium',
    },
    hasSuggestions: true,
    messages: {
      mathRandomCrypto: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Math.random() used for crypto',
        cwe: 'CWE-338',
        description:
          'Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values.',
        severity: 'CRITICAL',
        fix: 'Use crypto.randomBytes() or crypto.randomUUID() instead',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#secure-random-number-generation',
      }),
      useRandomBytes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomBytes',
        description:
          'Use crypto.randomBytes() for cryptographically secure random values',
        severity: 'LOW',
        fix: 'crypto.randomBytes(32).toString("hex")',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
      useRandomUUID: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomUUID',
        description: 'Use crypto.randomUUID() for UUID generation',
        severity: 'LOW',
        fix: 'crypto.randomUUID()',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptorandomuuidoptions',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow Math.random() in test files',
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
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    function isCryptoContext(node: TSESTree.Node): boolean {
      // Check variable declaration context
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        // Check variable names
        if (current.type === AST_NODE_TYPES.VariableDeclarator) {
          if (current.id.type === AST_NODE_TYPES.Identifier) {
            const varName = current.id.name;
            if (nameSuggestsCrypto(varName)) {
              return true;
            }
          }
        }

        // Check function names
        if (current.type === AST_NODE_TYPES.FunctionDeclaration && current.id) {
          const funcName = current.id.name;
          if (CRYPTO_FUNCTION_PATTERNS.some((p) => p.test(funcName))) {
            return true;
          }
        }

        // Check assignment to crypto-named property
        if (current.type === AST_NODE_TYPES.AssignmentExpression) {
          if (
            current.left.type === AST_NODE_TYPES.MemberExpression &&
            current.left.property.type === AST_NODE_TYPES.Identifier
          ) {
            const propName = current.left.property.name;
            if (nameSuggestsCrypto(propName)) {
              return true;
            }
          }
        }

        // Check object property
        if (current.type === AST_NODE_TYPES.Property) {
          if (current.key.type === AST_NODE_TYPES.Identifier) {
            const propName = current.key.name;
            if (nameSuggestsCrypto(propName)) {
              return true;
            }
          }
        }

        // Check return in crypto-named function
        if (current.type === AST_NODE_TYPES.ReturnStatement) {
          const func = findContainingFunction(current);
          if (func) {
            if (
              (func.type === AST_NODE_TYPES.FunctionDeclaration ||
                func.type === AST_NODE_TYPES.FunctionExpression) &&
              func.id?.name
            ) {
              const funcName = func.id.name;
              if (
                CRYPTO_FUNCTION_PATTERNS.some((p) => p.test(funcName)) ||
                nameSuggestsCrypto(funcName)
              ) {
                return true;
              }
            }
          }
        }

        current = current.parent;
      }

      return false;
    }

    function findContainingFunction(node: TSESTree.Node): TSESTree.Node | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;

        // Check for Math.random()
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'Math' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'random'
        ) {
          // Check if used in cryptographic context
          if (isCryptoContext(node)) {
            context.report({
              node,
              messageId: 'mathRandomCrypto',
              suggest: [
                {
                  messageId: 'useRandomBytes',
                  fix: () => null, // Complex refactoring
                },
                {
                  messageId: 'useRandomUUID',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },
    };
  },
});

export type { Options as NoMathRandomCryptoOptions };
