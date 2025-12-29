/**
 * ESLint Rule: no-cryptojs-weak-random
 * Detects crypto-js WordArray.random() which was insecure pre-3.2.1
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * CVE-2020-36732: crypto-js < 3.2.1 used Math.random() for crypto operations
 * @see https://nvd.nist.gov/vuln/detail/CVE-2020-36732
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakRandom'
  | 'useNativeRandom';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noCryptojsWeakRandom = createRule<RuleOptions, MessageIds>({
  name: 'no-cryptojs-weak-random',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow crypto-js WordArray.random() (CVE-2020-36732)',
    },
    hasSuggestions: true,
    messages: {
      weakRandom: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak random in crypto-js',
        cwe: 'CWE-338',
        description: 'CryptoJS.lib.WordArray.random() was insecure in versions < 3.2.1 (CVE-2020-36732). Used Math.random() instead of CSPRNG.',
        severity: 'CRITICAL',
        fix: 'Use crypto.randomBytes() from Node.js or crypto.getRandomValues() in browsers',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2020-36732',
      }),
      useNativeRandom: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use native randomBytes',
        description: 'Use cryptographically secure random from native crypto',
        severity: 'LOW',
        fix: 'crypto.randomBytes(32)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
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

      // Check for CryptoJS.lib.WordArray.random()
      // or WordArray.random()
      if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        const callee = node.callee;
        
        // Check for .random() method
        if (
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'random'
        ) {
          // Check if it's on WordArray
          if (callee.object.type === AST_NODE_TYPES.Identifier && callee.object.name === 'WordArray') {
            reportWeakRandom(node);
            return;
          }

          // Check for CryptoJS.lib.WordArray.random()
          if (callee.object.type === AST_NODE_TYPES.MemberExpression) {
            const innerObj = callee.object;
            if (
              innerObj.property.type === AST_NODE_TYPES.Identifier &&
              innerObj.property.name === 'WordArray'
            ) {
              reportWeakRandom(node);
              return;
            }
          }
        }
      }

      // Check for CryptoJS.random or similar patterns
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'CryptoJS' &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'random'
      ) {
        reportWeakRandom(node);
      }
    }

    function reportWeakRandom(node: TSESTree.CallExpression) {
      context.report({
        node,
        messageId: 'weakRandom',
        suggest: [
          {
            messageId: 'useNativeRandom',
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

export type { Options as NoCryptojsWeakRandomOptions };
