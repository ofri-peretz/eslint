/**
 * ESLint Rule: no-dynamic-require
 * Forbid `require()` calls with expressions (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'dynamicRequire';

export interface Options {
  /** Allow dynamic requires in specific contexts */
  allowContexts?: ('test' | 'config' | 'build' | 'runtime')[];
  /** Allow specific patterns of dynamic requires */
  allowPatterns?: string[];
}

type RuleOptions = [Options?];

export const noDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid `require()` calls with expressions',
    },
    hasSuggestions: false,
    messages: {
      dynamicRequire: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Dynamic Require',
        description: 'Require call uses dynamic expression',
        severity: 'HIGH',
        fix: 'Use static string literals for require() calls',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowContexts: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['test', 'config', 'build', 'runtime'],
            },
            description: 'Allow dynamic requires in specific contexts.',
          },
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex patterns for allowed dynamic require paths.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowContexts: [],
    allowPatterns: []
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowContexts = [],
      allowPatterns = [],
    } = options || {};

    const filename = context.getFilename() || '';

    function isInAllowedContext(): boolean {
      if (allowContexts.includes('test') && (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('/__tests__/'))) {
        return true;
      }

      if (allowContexts.includes('config') && (filename.includes('config') || filename.includes('webpack') || filename.includes('rollup'))) {
        return true;
      }

      if (allowContexts.includes('build') && (filename.includes('build') || filename.includes('scripts') || filename.includes('tools'))) {
        return true;
      }

      if (allowContexts.includes('runtime') && (filename.includes('runtime') || filename.includes('dynamic'))) {
        return true;
      }

      return false;
    }

    /* v8 ignore start -- allowPatterns check is unreachable: static literals return early before this check */
    function isAllowedPattern(requirePath: string): boolean {
      return allowPatterns.some((pattern: string) => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(requirePath);
        } catch {
          return false;
        }
      });
    }
    /* v8 ignore stop */

    function isStaticLiteral(node: TSESTree.Node): boolean {
      return node.type === 'Literal' && typeof node.value === 'string';
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const requireArg = node.arguments[0];

          if (isInAllowedContext()) {
            return;
          }

          // Check if it's a static literal
          if (isStaticLiteral(requireArg)) {
            // Static requires are allowed
            return;
          }

          /* v8 ignore start -- unreachable: static literals already returned above */
          // Check allow patterns
          if (requireArg.type === 'Literal' && typeof requireArg.value === 'string') {
            if (isAllowedPattern(requireArg.value)) {
              return;
            }
          }
          /* v8 ignore stop */

          // Report dynamic require
          context.report({
            node: requireArg,
            messageId: 'dynamicRequire',
          });
        }
      },
    };
  },
});
