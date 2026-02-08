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
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'mathRandomCrypto'
  | 'useRandomBytes'
  | 'useRandomUUID';

export interface Options {
  /** Allow Math.random() in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Variable names that suggest cryptographic usage
const CRYPTO_VARIABLE_PATTERNS = [
  /token/i, /key/i, /secret/i, /password/i, /salt/i, /iv/i, /nonce/i,
  /random/i, /seed/i, /hash/i, /cipher/i, /encrypt/i, /auth/i,
  /session/i, /csrf/i, /otp/i, /pin/i, /code/i, /verify/i,
];

// Function names that suggest cryptographic usage
const CRYPTO_FUNCTION_PATTERNS = [
  /generate.*token/i, /generate.*key/i, /generate.*id/i,
  /create.*secret/i, /create.*token/i, /random.*string/i,
  /get.*random/i, /make.*salt/i, /gen.*password/i,
];

export const noMathRandomCrypto = createRule<RuleOptions, MessageIds>({
  name: 'no-math-random-crypto',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Math.random() for cryptographic purposes',
    },
    hasSuggestions: true,
    messages: {
      mathRandomCrypto: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Math.random() used for crypto',
        cwe: 'CWE-338',
        description: 'Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values.',
        severity: 'CRITICAL',
        fix: 'Use crypto.randomBytes() or crypto.randomUUID() instead',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#secure-random-number-generation',
      }),
      useRandomBytes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomBytes',
        description: 'Use crypto.randomBytes() for cryptographically secure random values',
        severity: 'LOW',
        fix: 'crypto.randomBytes(32).toString("hex")',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
      useRandomUUID: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomUUID',
        description: 'Use crypto.randomUUID() for UUID generation',
        severity: 'LOW',
        fix: 'crypto.randomUUID()',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandomuuidoptions',
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
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    function isCryptoContext(node: TSESTree.Node): boolean {
      // Check variable declaration context
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        // Check variable names
        if (current.type === AST_NODE_TYPES.VariableDeclarator) {
          if (current.id.type === AST_NODE_TYPES.Identifier) {
            const varName = current.id.name;
            if (CRYPTO_VARIABLE_PATTERNS.some(p => p.test(varName))) {
              return true;
            }
          }
        }

        // Check function names
        /* c8 ignore next 6 -- FunctionDeclaration with id.name matching pattern requires specific context */
        if (current.type === AST_NODE_TYPES.FunctionDeclaration && current.id) {
          const funcName = current.id.name;
          if (CRYPTO_FUNCTION_PATTERNS.some(p => p.test(funcName))) {
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
            if (CRYPTO_VARIABLE_PATTERNS.some(p => p.test(propName))) {
              return true;
            }
          }
        }

        // Check object property
        if (current.type === AST_NODE_TYPES.Property) {
          if (current.key.type === AST_NODE_TYPES.Identifier) {
            const propName = current.key.name;
            if (CRYPTO_VARIABLE_PATTERNS.some(p => p.test(propName))) {
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
              if (CRYPTO_FUNCTION_PATTERNS.some(p => p.test(funcName)) ||
                  CRYPTO_VARIABLE_PATTERNS.some(p => p.test(funcName))) {
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
      /* c8 ignore next -- unreachable when called from valid AST context */
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
