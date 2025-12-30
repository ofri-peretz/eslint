/**
 * ESLint Rule: no-useless-path-segments
 * Forbid unnecessary path segments in import and require statements
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-useless-path-segments.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import * as path from 'node:path';

type MessageIds = 'uselessPathSegments';

export interface Options {
  /** Don't report on direct parent: imports (../) */
  noUselessIndex?: boolean;
  /** Check CommonJS require(). Default: true */
  commonjs?: boolean;
}

type RuleOptions = [Options?];

export const noUselessPathSegments = createRule<RuleOptions, MessageIds>({
  name: 'no-useless-path-segments',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid unnecessary path segments in import and require statements',
    },
    fixable: 'code',
    messages: {
      uselessPathSegments: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Useless Path Segments',
        cwe: 'CWE-1078',
        description: 'Useless path segments in import: {{importPath}}',
        severity: 'LOW',
        fix: 'Simplify to: {{simplifiedPath}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-useless-path-segments.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          noUselessIndex: { type: 'boolean', default: false },
          commonjs: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ noUselessIndex: false, commonjs: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { noUselessIndex = false, commonjs = true } = options;

    function simplifyPath(importPath: string): string | null {
      // Only process relative paths
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return null;
      }

      const normalized = path.posix.normalize(importPath);

      // Check for useless ./
      // ./foo -> foo (but we keep it as relative)
      // ./a/../b -> ./b
      // ./a/./b -> ./a/b

      // Normalize the path
      let simplified = normalized;

      // Remove trailing /index if noUselessIndex is enabled
      if (noUselessIndex) {
        simplified = simplified.replace(/\/index$/, '');
        // Handle ./index -> .
        if (simplified === './index' || simplified === 'index') {
          simplified = '.';
        }
      }

      // Ensure relative paths start with ./
      if (
        !simplified.startsWith('./') &&
        !simplified.startsWith('../') &&
        !simplified.startsWith('.')
      ) {
        simplified = './' + simplified;
      }

      // If nothing changed, return null
      if (simplified === importPath) {
        return null;
      }

      return simplified;
    }

    function checkImport(source: TSESTree.Literal) {
      const importPath = source.value;
      if (typeof importPath !== 'string') return;

      const simplified = simplifyPath(importPath);
      if (simplified) {
        context.report({
          node: source,
          messageId: 'uselessPathSegments',
          data: {
            importPath,
            simplifiedPath: simplified,
          },
          fix(fixer) {
            const quote = source.raw?.charAt(0) || "'";
            return fixer.replaceText(source, `${quote}${simplified}${quote}`);
          },
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkImport(node.source);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          checkImport(node.source as TSESTree.Literal);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!commonjs) return;

        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          checkImport(node.arguments[0] as TSESTree.Literal);
        }
      },
    };
  },
});
