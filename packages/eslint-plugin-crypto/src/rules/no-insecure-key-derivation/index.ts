/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-key-derivation
 * Detects PBKDF2 with insufficient iterations
 * CWE-916: Use of Password Hash With Insufficient Computational Effort
 *
 * OWASP 2023 recommends minimum 600,000 iterations for PBKDF2-SHA256
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'insufficientIterations'
  | 'useMinIterations'
  | 'useScrypt'
  | 'useArgon2';

export interface Options {
  /** Minimum PBKDF2 iterations. Default: 100000 */
  minIterations?: number;
}

type RuleOptions = [Options?];

// OWASP 2023 recommendations
const DEFAULT_MIN_ITERATIONS = 100000;

export const noInsecureKeyDerivation = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-key-derivation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow PBKDF2 with insufficient iterations (< 100,000)',
    },
    hasSuggestions: true,
    messages: {
      insufficientIterations: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient PBKDF2 iterations',
        cwe: 'CWE-916',
        description: 'PBKDF2 with {{actual}} iterations is too low. Minimum recommended: {{minimum}} iterations (OWASP 2023).',
        severity: 'HIGH',
        fix: 'Increase iterations to at least {{minimum}}, or use scrypt/Argon2',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
      }),
      useMinIterations: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use minimum iterations',
        description: 'Use at least {{minimum}} iterations for PBKDF2',
        severity: 'LOW',
        fix: 'crypto.pbkdf2(password, salt, {{minimum}}, keylen, digest)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback',
      }),
      useScrypt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use scrypt',
        description: 'scrypt is memory-hard and resistant to GPU/ASIC attacks',
        severity: 'LOW',
        fix: 'crypto.scrypt(password, salt, keylen)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback',
      }),
      useArgon2: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Argon2',
        description: 'Argon2id is the winner of the Password Hashing Competition',
        severity: 'LOW',
        fix: 'argon2.hash(password, { type: argon2.argon2id })',
        documentationLink: 'https://github.com/ranisalt/node-argon2',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minIterations: {
            type: 'number',
            default: DEFAULT_MIN_ITERATIONS,
            description: 'Minimum required PBKDF2 iterations',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minIterations: DEFAULT_MIN_ITERATIONS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { minIterations = DEFAULT_MIN_ITERATIONS } = options as Options;

    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for crypto.pbkdf2() or crypto.pbkdf2Sync()
      const isPbkdf2Call =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'pbkdf2' || node.callee.property.name === 'pbkdf2Sync')) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          (node.callee.name === 'pbkdf2' || node.callee.name === 'pbkdf2Sync'));

      if (isPbkdf2Call) {
        // pbkdf2(password, salt, iterations, keylen, digest, callback)
        // iterations is the 3rd argument (index 2)
        const iterationsArg = node.arguments[2];
        
        if (iterationsArg?.type === AST_NODE_TYPES.Literal && typeof iterationsArg.value === 'number') {
          const iterations = iterationsArg.value;
          
          if (iterations < minIterations) {
            context.report({
              node: iterationsArg,
              messageId: 'insufficientIterations',
              data: {
                actual: String(iterations),
                minimum: String(minIterations),
              },
              suggest: [
                {
                  messageId: 'useMinIterations',
                  data: { minimum: String(minIterations) },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(iterationsArg, String(minIterations));
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

export type { Options as NoInsecureKeyDerivationOptions };
