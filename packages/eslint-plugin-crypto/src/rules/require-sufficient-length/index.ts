/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-sufficient-length
 * Ensures crypto-random-string generates tokens of sufficient length
 * CWE-330: Use of Insufficiently Random Values
 *
 * Token length directly impacts entropy and security
 * @see https://www.npmjs.com/package/crypto-random-string
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'insufficientLength'
  | 'useMinLength';

export interface Options {
  /** Minimum token length. Default: 32 */
  minLength?: number;
}

type RuleOptions = [Options?];

const DEFAULT_MIN_LENGTH = 32;

export const requireSufficientLength = createRule<RuleOptions, MessageIds>({
  name: 'require-sufficient-length',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require crypto-random-string to use sufficient token length',
    },
    hasSuggestions: true,
    messages: {
      insufficientLength: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient token length',
        cwe: 'CWE-330',
        description: 'Token length {{actual}} is too short. Minimum recommended: {{minimum}} characters for security tokens.',
        severity: 'MEDIUM',
        fix: 'Increase length to at least {{minimum}} characters',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-id-entropy',
      }),
      useMinLength: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use minimum length',
        description: 'Use at least {{minimum}} characters for secure tokens',
        severity: 'LOW',
        fix: 'cryptoRandomString({ length: {{minimum}} })',
        documentationLink: 'https://www.npmjs.com/package/crypto-random-string',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minLength: {
            type: 'number',
            default: DEFAULT_MIN_LENGTH,
            description: 'Minimum required token length',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minLength: DEFAULT_MIN_LENGTH,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { minLength = DEFAULT_MIN_LENGTH } = options as Options;

    // Track if cryptoRandomString was imported
    let cryptoRandomStringImported = false;
    let importedName = 'cryptoRandomString';

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (
          typeof node.source.value === 'string' &&
          node.source.value === 'crypto-random-string'
        ) {
          cryptoRandomStringImported = true;
          // Track the imported name (could be renamed)
          for (const specifier of node.specifiers) {
            if (specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
              importedName = specifier.local.name;
            }
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!cryptoRandomStringImported) return;

        // Check for cryptoRandomString() or cryptoRandomString.sync()
        let isCryptoRandomStringCall = false;
        
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === importedName
        ) {
          isCryptoRandomStringCall = true;
        }

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === importedName
        ) {
          isCryptoRandomStringCall = true;
        }

        if (isCryptoRandomStringCall && node.arguments.length >= 1) {
          const optionsArg = node.arguments[0];
          
          if (optionsArg.type === AST_NODE_TYPES.ObjectExpression) {
            // Find the length property
            for (const prop of optionsArg.properties) {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier &&
                prop.key.name === 'length' &&
                prop.value.type === AST_NODE_TYPES.Literal &&
                typeof prop.value.value === 'number'
              ) {
                const length = prop.value.value;
                
                if (length < minLength) {
                  context.report({
                    node: prop.value,
                    messageId: 'insufficientLength',
                    data: {
                      actual: String(length),
                      minimum: String(minLength),
                    },
                    suggest: [
                      {
                        messageId: 'useMinLength',
                        data: { minimum: String(minLength) },
                        fix: (fixer: TSESLint.RuleFixer) => {
                          return fixer.replaceText(prop.value, String(minLength));
                        },
                      },
                    ],
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});

export type { Options as RequireSufficientLengthOptions };
