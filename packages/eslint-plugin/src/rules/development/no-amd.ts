/**
 * ESLint Rule: no-amd
 * Prevents AMD require/define calls (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferES6';

export interface Options {
  /** Allow AMD in certain contexts (e.g., legacy code) */
  allow?: string[];
  /** Suggest ES6 imports instead */
  suggestES6?: boolean;
}

type RuleOptions = [Options?];

export const noAmd = createRule<RuleOptions, MessageIds>({
  name: 'no-amd',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents AMD require/define calls',
    },
    hasSuggestions: false,
    messages: {
      preferES6: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'AMD Module',
        description: 'AMD module detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 import/export syntax instead of AMD',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-amd.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'AMD patterns to allow.',
          },
          suggestES6: {
            type: 'boolean',
            default: true,
            description: 'Suggest ES6 imports instead.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allow: [],
    suggestES6: true
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allow = [],
      // suggestES6 = true // Reserved for future use when hasSuggestions is enabled
    } = options || {};

    const filename = context.getFilename();

    function shouldAllow(): boolean {
      // Check if the call is in an allowed pattern
      return allow.some((pattern: string) => {
        /* v8 ignore next -- defensive check, filename always provided by ESLint */
        if (!filename) return false;

        // Support glob patterns like **/legacy/**
        if (pattern.includes('**')) {
          // Simple glob matching: ** matches any path segment, * matches any name segment
          const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(filename);
        }

        // Simple string matching for non-glob patterns
        return filename.includes(pattern);
      });
    }

    // Note: ES6 suggestion generation could be added here when hasSuggestions is enabled

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (shouldAllow()) {
          return;
        }

        // Check for define() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'define'
        ) {
          context.report({
            node: node.callee,
            messageId: 'preferES6',
            data: {
              functionName: 'define',
              currentFile: filename,
              suggestion: 'Use ES6 export default or export {} syntax',
            },
          });
        }

        // Check for AMD-style require() calls (not CommonJS)
        else if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];

          // AMD require typically has a callback function as second argument
          // or is part of a define() call
          const hasCallback = node.arguments.length > 1 &&
            node.arguments[1]?.type === 'FunctionExpression';

          // Check if this looks like AMD require (array of deps + callback)
          if (firstArg.type === 'ArrayExpression' && hasCallback) {
            context.report({
              node: node.callee,
              messageId: 'preferES6',
              data: {
                functionName: 'require',
                currentFile: filename,
                suggestion: 'Use ES6 import statements at the top of the file',
              },
            });
          }
        }
      },
    };
  },
});
