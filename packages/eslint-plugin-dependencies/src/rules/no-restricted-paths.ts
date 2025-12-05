/**
 * ESLint Rule: no-restricted-paths
 * Enforce which files can be imported in a given folder (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'restrictedPath' | 'pathViolation' | 'zoneViolation';

export interface Options {
  /** Array of restricted path patterns */
  restricted: string[];
}

type RuleOptions = [Options?];

export const noRestrictedPaths = createRule<RuleOptions, MessageIds>({
  name: 'no-restricted-paths',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce which files can be imported in a given folder',
    },
    hasSuggestions: false,
    messages: {
      restrictedPath: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Restricted Import Path',
        description: 'Import violates architectural boundary rules',
        severity: 'HIGH',
        fix: 'Restructure code to respect architectural boundaries',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      pathViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Architecture Violation',
        description: 'Import crosses forbidden architectural boundary',
        severity: 'HIGH',
        fix: 'Move code or adjust import to comply with architecture rules',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      zoneViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Zone Boundary Violation',
        description: 'Import violates defined architectural zones',
        severity: 'MEDIUM',
        fix: 'Restructure imports to respect zone boundaries',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          restricted: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of restricted path patterns',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ restricted: [] }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { restricted = [] } = options || {};

    function checkImport(importPath: string, node: TSESTree.Node) {
      for (const pattern of restricted) {
        if (importPath.includes(pattern)) {
          context.report({
            node,
            messageId: 'pathViolation',
          });
          return;
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath === 'string') {
          checkImport(importPath, node.source);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkImport(arg.value, arg);
          }
        }
      },
    };
  },
});
