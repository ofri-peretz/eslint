/**
 * ESLint Rule: no-hardcoded-crypto-key
 * Detects hardcoded encryption keys in createCipheriv/createDecipheriv calls
 * CWE-321: Use of Hard-coded Cryptographic Key
 *
 * @see https://cwe.mitre.org/data/definitions/321.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'hardcodedKey'
  | 'useEnvVariable'
  | 'useKeyManagement';

export interface Options {
  /** Allow hardcoded keys in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noHardcodedCryptoKey = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-crypto-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded encryption keys',
    },
    hasSuggestions: true,
    messages: {
      hardcodedKey: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded encryption key',
        cwe: 'CWE-321',
        description: 'Encryption key is hardcoded. Anyone with access to the source code can decrypt the data.',
        severity: 'CRITICAL',
        fix: 'Load key from environment variable or key management service',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html',
      }),
      useEnvVariable: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use environment variable',
        description: 'Load encryption key from environment variable',
        severity: 'LOW',
        fix: 'const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex")',
        documentationLink: 'https://12factor.net/config',
      }),
      useKeyManagement: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use key management service',
        description: 'Use AWS KMS, Azure Key Vault, or HashiCorp Vault',
        severity: 'LOW',
        fix: 'const key = await kms.decrypt(encryptedKey)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow hardcoded keys in test files',
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

      const cipherMethods = new Set(['createCipheriv', 'createDecipheriv']);

      // Check for crypto.createCipheriv(algorithm, key, iv)
      const isCipherivCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.name));

      if (isCipherivCall && node.arguments.length >= 2) {
        const keyArg = node.arguments[1];
        checkKeyArgument(keyArg);
      }
    }

    function checkKeyArgument(keyArg: TSESTree.CallExpressionArgument) {
      // Check for string literal key
      if (keyArg.type === AST_NODE_TYPES.Literal && typeof keyArg.value === 'string') {
        reportHardcodedKey(keyArg);
        return;
      }

      // Check for Buffer.from('hardcoded')
      if (
        keyArg.type === AST_NODE_TYPES.CallExpression &&
        keyArg.callee.type === AST_NODE_TYPES.MemberExpression &&
        keyArg.callee.object.type === AST_NODE_TYPES.Identifier &&
        keyArg.callee.object.name === 'Buffer' &&
        keyArg.callee.property.type === AST_NODE_TYPES.Identifier &&
        keyArg.callee.property.name === 'from'
      ) {
        const firstArg = keyArg.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
          // Check if it's process.env access - that's OK
          reportHardcodedKey(keyArg);
        }
        // Check for hardcoded array of bytes
        if (firstArg?.type === AST_NODE_TYPES.ArrayExpression) {
          const allLiterals = firstArg.elements.every(
            (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => el?.type === AST_NODE_TYPES.Literal && typeof el.value === 'number'
          );
          if (allLiterals) {
            reportHardcodedKey(keyArg);
          }
        }
      }

      // Check for new Uint8Array([...])
      if (
        keyArg.type === AST_NODE_TYPES.NewExpression &&
        keyArg.callee.type === AST_NODE_TYPES.Identifier &&
        keyArg.callee.name === 'Uint8Array'
      ) {
        const firstArg = keyArg.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.ArrayExpression) {
          const allLiterals = firstArg.elements.every(
            (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => el?.type === AST_NODE_TYPES.Literal && typeof el.value === 'number'
          );
          if (allLiterals) {
            reportHardcodedKey(keyArg);
          }
        }
      }
    }

    function reportHardcodedKey(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'hardcodedKey',
        suggest: [
          {
            messageId: 'useEnvVariable',
            fix: () => null, // Complex refactoring
          },
          {
            messageId: 'useKeyManagement',
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

export type { Options as NoHardcodedCryptoKeyOptions };
