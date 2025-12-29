/**
 * ESLint Rule: no-deprecated-cipher-method
 * Detects use of deprecated crypto.createCipher/createDecipher methods
 * CWE-327: These methods don't use IV, making encryption deterministic
 *
 * @see https://nodejs.org/api/crypto.html#cryptocreatecipheralgorithm-password-options
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'deprecatedCipherMethod'
  | 'useCipheriv';

export interface Options {
  /** Allow deprecated methods in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

const DEPRECATED_METHODS = new Set(['createCipher', 'createDecipher']);

export const noDeprecatedCipherMethod = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated-cipher-method',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow deprecated crypto.createCipher/createDecipher methods (use createCipheriv/createDecipheriv instead)',
    },
    hasSuggestions: true,
    messages: {
      deprecatedCipherMethod: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Deprecated cipher method',
        cwe: 'CWE-327',
        description: 'crypto.{{method}}() is deprecated. It derives key from password without salt and uses no IV, making encryption deterministic and vulnerable.',
        severity: 'HIGH',
        fix: 'Use crypto.{{replacement}}() with explicit key and random IV',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      useCipheriv: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use createCipheriv',
        description: 'Use createCipheriv with explicit key derivation and random IV',
        severity: 'LOW',
        fix: 'const key = crypto.scryptSync(password, salt, 32);\nconst iv = crypto.randomBytes(16);\nconst cipher = crypto.createCipheriv(algorithm, key, iv);',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow deprecated methods in test files',
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

      // Check for crypto.createCipher() or crypto.createDecipher()
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        DEPRECATED_METHODS.has(node.callee.property.name)
      ) {
        const methodName = node.callee.property.name;
        const replacementName = methodName === 'createCipher' ? 'createCipheriv' : 'createDecipheriv';

        context.report({
          node: node.callee.property,
          messageId: 'deprecatedCipherMethod',
          data: {
            method: methodName,
            replacement: replacementName,
          },
          suggest: [
            {
              messageId: 'useCipheriv',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node.callee.property as TSESTree.Identifier, replacementName);
              },
            },
          ],
        });
      }

      // Check for standalone createCipher() / createDecipher()
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        DEPRECATED_METHODS.has(node.callee.name)
      ) {
        const methodName = node.callee.name;
        const replacementName = methodName === 'createCipher' ? 'createCipheriv' : 'createDecipheriv';

        context.report({
          node: node.callee,
          messageId: 'deprecatedCipherMethod',
          data: {
            method: methodName,
            replacement: replacementName,
          },
          suggest: [
            {
              messageId: 'useCipheriv',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node.callee, replacementName);
              },
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

export type { Options as NoDeprecatedCipherMethodOptions };
