/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-predictable-salt
 * Detects empty, short, or hardcoded salts in key derivation
 * CWE-331: Insufficient Entropy
 *
 * @see https://cwe.mitre.org/data/definitions/331.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'predictableSalt'
  | 'useRandomSalt';

export interface Options {
  /** Minimum salt length in bytes. Default: 16 */
  minSaltLength?: number;
}

type RuleOptions = [Options?];

const DEFAULT_MIN_SALT_LENGTH = 16;

export const noPredictableSalt = createRule<RuleOptions, MessageIds>({
  name: 'no-predictable-salt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow predictable, empty, or short salts in key derivation',
    },
    hasSuggestions: true,
    messages: {
      predictableSalt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Predictable salt',
        cwe: 'CWE-331',
        description: 'Salt is {{issue}}. Salts must be unique, random, and at least 16 bytes to prevent rainbow table attacks.',
        severity: 'HIGH',
        fix: 'Generate salt using crypto.randomBytes(16)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#salting',
      }),
      useRandomSalt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use random salt',
        description: 'Generate a unique random salt for each password',
        severity: 'LOW',
        fix: 'const salt = crypto.randomBytes(16)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minSaltLength: {
            type: 'number',
            default: DEFAULT_MIN_SALT_LENGTH,
            description: 'Minimum salt length in bytes',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minSaltLength: DEFAULT_MIN_SALT_LENGTH,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { minSaltLength = DEFAULT_MIN_SALT_LENGTH } = options as Options;

    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for pbkdf2, scrypt, and similar key derivation functions
      const keyDerivationFuncs = new Set(['pbkdf2', 'pbkdf2Sync', 'scrypt', 'scryptSync']);

      const isKeyDerivationCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          keyDerivationFuncs.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          keyDerivationFuncs.has(node.callee.name));

      if (isKeyDerivationCall && node.arguments.length >= 2) {
        // pbkdf2(password, salt, ...) - salt is 2nd argument
        // scrypt(password, salt, keylen, ...) - salt is 2nd argument
        const saltArg = node.arguments[1];
        checkSaltArgument(saltArg);
      }
    }

    function checkSaltArgument(saltArg: TSESTree.CallExpressionArgument) {
      // Check for empty string salt
      if (saltArg.type === AST_NODE_TYPES.Literal) {
        if (saltArg.value === '' || saltArg.value === null) {
          reportPredictableSalt(saltArg, 'empty');
          return;
        }
        if (typeof saltArg.value === 'string' && saltArg.value.length < minSaltLength) {
          reportPredictableSalt(saltArg, `too short (${saltArg.value.length} chars, need ${minSaltLength})`);
          return;
        }
        // Hardcoded string salt
        if (typeof saltArg.value === 'string') {
          reportPredictableSalt(saltArg, 'hardcoded');
          return;
        }
      }

      // Check for Buffer.from('static')
      if (
        saltArg.type === AST_NODE_TYPES.CallExpression &&
        saltArg.callee.type === AST_NODE_TYPES.MemberExpression &&
        saltArg.callee.object.type === AST_NODE_TYPES.Identifier &&
        saltArg.callee.object.name === 'Buffer' &&
        saltArg.callee.property.type === AST_NODE_TYPES.Identifier &&
        saltArg.callee.property.name === 'from'
      ) {
        const firstArg = saltArg.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
          reportPredictableSalt(saltArg, 'hardcoded via Buffer.from()');
        }
      }

      // Check for Buffer.alloc(0) or very small allocation
      if (
        saltArg.type === AST_NODE_TYPES.CallExpression &&
        saltArg.callee.type === AST_NODE_TYPES.MemberExpression &&
        saltArg.callee.object.type === AST_NODE_TYPES.Identifier &&
        saltArg.callee.object.name === 'Buffer' &&
        saltArg.callee.property.type === AST_NODE_TYPES.Identifier &&
        saltArg.callee.property.name === 'alloc'
      ) {
        const sizeArg = saltArg.arguments[0];
        if (sizeArg?.type === AST_NODE_TYPES.Literal && typeof sizeArg.value === 'number') {
          if (sizeArg.value === 0) {
            reportPredictableSalt(saltArg, 'empty (Buffer.alloc(0))');
          } else if (sizeArg.value < minSaltLength) {
            reportPredictableSalt(saltArg, `too short (${sizeArg.value} bytes, need ${minSaltLength})`);
          }
        }
      }
    }

    function reportPredictableSalt(node: TSESTree.Node, issue: string) {
      context.report({
        node,
        messageId: 'predictableSalt',
        data: { issue },
        suggest: [
          {
            messageId: 'useRandomSalt',
            fix: () => null, // Complex refactoring
          },
        ],
      });
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoPredictableSaltOptions };
