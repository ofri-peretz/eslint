/**
 * ESLint Rule: no-web-crypto-export
 * Detects crypto.subtle.exportKey() which may leak keys
 * CWE-321: Use of Hard-coded Cryptographic Key
 *
 * Exporting cryptographic keys increases attack surface and
 * risk of key leakage. Keys should generally remain non-extractable.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/exportKey
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'keyExport'
  | 'keepNonExtractable';

export interface Options {
  /** Allow key export in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noWebCryptoExport = createRule<RuleOptions, MessageIds>({
  name: 'no-web-crypto-export',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn on crypto.subtle.exportKey() usage',
    },
    hasSuggestions: true,
    messages: {
      keyExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Key export detected',
        cwe: 'CWE-321',
        description: 'Exporting cryptographic keys increases risk of key leakage. Consider keeping keys non-extractable if possible.',
        severity: 'MEDIUM',
        fix: 'Generate keys with extractable: false, or ensure exported keys are properly secured',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey#extractable',
      }),
      keepNonExtractable: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Keep keys non-extractable',
        description: 'Generate keys with extractable: false to prevent export',
        severity: 'LOW',
        fix: 'crypto.subtle.generateKey(algorithm, false, keyUsages)',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow key export in test files',
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

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      // Check for crypto.subtle.exportKey() or subtle.exportKey()
      if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        const callee = node.callee;

        if (
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'exportKey'
        ) {
          // Check if it's on subtle
          if (callee.object.type === AST_NODE_TYPES.MemberExpression) {
            const innerObj = callee.object;
            if (
              innerObj.property.type === AST_NODE_TYPES.Identifier &&
              innerObj.property.name === 'subtle'
            ) {
              reportKeyExport(node);
              return;
            }
          }

          // Check for direct subtle.exportKey()
          /* c8 ignore next 6 -- direct subtle.exportKey() requires specific destructured import */
          if (
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === 'subtle'
          ) {
            reportKeyExport(node);
            return;
          }
        }

        // Also check for wrapKey which can be used to export keys
        if (
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'wrapKey'
        ) {
          if (callee.object.type === AST_NODE_TYPES.MemberExpression) {
            const innerObj = callee.object;
            if (
              innerObj.property.type === AST_NODE_TYPES.Identifier &&
              innerObj.property.name === 'subtle'
            ) {
              reportKeyExport(node);
            }
          }
        }
      }
    }

    function reportKeyExport(node: TSESTree.CallExpression) {
      context.report({
        node,
        messageId: 'keyExport',
        suggest: [
          {
            messageId: 'keepNonExtractable',
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

export type { Options as NoWebCryptoExportOptions };
