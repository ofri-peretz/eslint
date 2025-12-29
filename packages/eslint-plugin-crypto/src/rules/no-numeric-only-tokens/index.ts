/**
 * ESLint Rule: no-numeric-only-tokens
 * Warns against using type: 'numeric' for security tokens
 * CWE-330: Use of Insufficiently Random Values
 *
 * Numeric-only tokens have lower entropy (10 chars vs 62+ chars per position)
 * @see https://www.npmjs.com/package/crypto-random-string
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'numericOnlyToken'
  | 'useAlphanumeric'
  | 'useUrlSafe';

export interface Options {
  /** Allow numeric tokens for specific contexts. Default: [] */
  allowedContexts?: string[];
}

type RuleOptions = [Options?];

export const noNumericOnlyTokens = createRule<RuleOptions, MessageIds>({
  name: 'no-numeric-only-tokens',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn against using numeric-only tokens for security purposes',
    },
    hasSuggestions: true,
    messages: {
      numericOnlyToken: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Numeric-only token',
        cwe: 'CWE-330',
        description: "Numeric-only tokens have lower entropy (10 possible characters per position vs 62+ for alphanumeric). A 32-digit numeric token = ~106 bits entropy, while 32-char alphanumeric = ~190 bits.",
        severity: 'MEDIUM',
        fix: "Use type: 'alphanumeric' or 'url-safe' for better entropy",
        documentationLink: 'https://www.npmjs.com/package/crypto-random-string#type',
      }),
      useAlphanumeric: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use alphanumeric',
        description: 'Alphanumeric provides 62 characters per position (a-z, A-Z, 0-9)',
        severity: 'LOW',
        fix: "type: 'alphanumeric'",
        documentationLink: 'https://www.npmjs.com/package/crypto-random-string#type',
      }),
      useUrlSafe: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use url-safe',
        description: 'URL-safe uses base64url encoding (64 chars per position)',
        severity: 'LOW',
        fix: "type: 'url-safe'",
        documentationLink: 'https://www.npmjs.com/package/crypto-random-string#type',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedContexts: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Contexts where numeric tokens are allowed (e.g., OTP, PIN)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedContexts: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
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
            // Find the type property
            for (const prop of optionsArg.properties) {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier &&
                prop.key.name === 'type' &&
                prop.value.type === AST_NODE_TYPES.Literal &&
                prop.value.value === 'numeric'
              ) {
                context.report({
                  node: prop.value,
                  messageId: 'numericOnlyToken',
                  suggest: [
                    {
                      messageId: 'useAlphanumeric',
                      fix: (fixer: TSESLint.RuleFixer) => {
                        return fixer.replaceText(prop.value, "'alphanumeric'");
                      },
                    },
                    {
                      messageId: 'useUrlSafe',
                      fix: (fixer: TSESLint.RuleFixer) => {
                        return fixer.replaceText(prop.value, "'url-safe'");
                      },
                    },
                  ],
                });
              }
            }
          }
        }
      },
    };
  },
});

export type { Options as NoNumericOnlyTokensOptions };
