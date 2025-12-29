/**
 * ESLint Rule: require-random-iv
 * Ensures IV is generated from cryptographically secure source
 * CWE-329: Not Using an Unpredictable IV
 *
 * @see https://cwe.mitre.org/data/definitions/329.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'nonRandomIv'
  | 'useRandomBytes';

export interface Options {
  /** Allowed randomness sources. Default: ['randomBytes', 'getRandomValues'] */
  allowedSources?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_ALLOWED_SOURCES = ['randomBytes', 'getRandomValues', 'randomFillSync', 'randomFill'];

export const requireRandomIv = createRule<RuleOptions, MessageIds>({
  name: 'require-random-iv',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require IV to be generated from cryptographically secure random source',
    },
    hasSuggestions: true,
    messages: {
      nonRandomIv: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Non-random IV',
        cwe: 'CWE-329',
        description: 'IV should be generated using crypto.randomBytes() or similar CSPRNG. Non-random IVs can lead to predictable ciphertext.',
        severity: 'HIGH',
        fix: 'Generate IV with: const iv = crypto.randomBytes(16)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#initialization-vectors',
      }),
      useRandomBytes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomBytes',
        description: 'Generate IV using cryptographically secure random bytes',
        severity: 'LOW',
        fix: 'const iv = crypto.randomBytes(16)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ALLOWED_SOURCES,
            description: 'Allowed randomness sources for IV generation',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedSources: DEFAULT_ALLOWED_SOURCES,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowedSources = DEFAULT_ALLOWED_SOURCES } = options as Options;
    const allowedSourcesSet = new Set(allowedSources);

    // Track variables that are assigned from random sources
    const randomVariables = new Set<string>();

    function checkVariableDeclarator(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== AST_NODE_TYPES.Identifier || !node.init) return;

      // Track: const iv = crypto.randomBytes(16)
      if (isRandomCall(node.init)) {
        randomVariables.add(node.id.name);
      }

      // Track: const iv = await crypto.randomBytes(16)
      if (
        node.init.type === AST_NODE_TYPES.AwaitExpression &&
        isRandomCall(node.init.argument)
      ) {
        randomVariables.add(node.id.name);
      }
    }

    function isRandomCall(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;

      // Check: crypto.randomBytes()
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        allowedSourcesSet.has(node.callee.property.name)
      ) {
        return true;
      }

      // Check: randomBytes()
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        allowedSourcesSet.has(node.callee.name)
      ) {
        return true;
      }

      return false;
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      const cipherMethods = new Set(['createCipheriv', 'createDecipheriv']);

      // Check for createCipheriv/createDecipheriv calls
      const isCipherivCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.property.name)) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          cipherMethods.has(node.callee.name));

      if (isCipherivCall && node.arguments.length >= 3) {
        const ivArg = node.arguments[2];
        
        // Allow if IV is a known random variable
        if (ivArg.type === AST_NODE_TYPES.Identifier && randomVariables.has(ivArg.name)) {
          return;
        }

        // Allow if IV is a direct randomBytes call
        if (ivArg.type === AST_NODE_TYPES.CallExpression && isRandomCall(ivArg)) {
          return;
        }

        // Allow await expressions
        if (
          ivArg.type === AST_NODE_TYPES.AwaitExpression &&
          isRandomCall(ivArg.argument)
        ) {
          return;
        }

        // Check for clearly non-random patterns
        if (isNonRandomPattern(ivArg)) {
          context.report({
            node: ivArg,
            messageId: 'nonRandomIv',
            suggest: [
              {
                messageId: 'useRandomBytes',
                fix: () => null, // Complex refactoring
              },
            ],
          });
        }
      }
    }

    function isNonRandomPattern(node: TSESTree.Node): boolean {
      // String literals
      if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
        return true;
      }

      // Buffer.from('static')
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'Buffer'
      ) {
        const firstArg = node.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.Literal) {
          return true;
        }
        if (firstArg?.type === AST_NODE_TYPES.ArrayExpression) {
          return firstArg.elements.every(
            (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => el?.type === AST_NODE_TYPES.Literal
          );
        }
      }

      // Buffer.alloc(16) without random fill
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'Buffer' &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'alloc'
      ) {
        // Buffer.alloc(16) creates zero-filled buffer - not random!
        return true;
      }

      return false;
    }

    return {
      VariableDeclarator: checkVariableDeclarator,
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as RequireRandomIvOptions };
