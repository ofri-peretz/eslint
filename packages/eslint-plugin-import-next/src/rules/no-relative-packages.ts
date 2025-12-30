/**
 * ESLint Rule: no-relative-packages
 * Forbid importing packages through relative paths
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-packages.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import * as path from 'node:path';
import * as fs from 'node:fs';

type MessageIds = 'relativePackage';

export interface Options {
  /** Allow relative imports within the same package. Default: true */
  allowSamePackage?: boolean;
}

type RuleOptions = [Options?];

// Cache for package.json lookups
const packageJsonCache = new Map<string, string | null>();

function findPackageJson(startDir: string): string | null {
  if (packageJsonCache.has(startDir)) {
    return packageJsonCache.get(startDir)!;
  }

  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      packageJsonCache.set(startDir, currentDir);
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  packageJsonCache.set(startDir, null);
  return null;
}

export const noRelativePackages = createRule<RuleOptions, MessageIds>({
  name: 'no-relative-packages',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid importing packages through relative paths',
    },
    fixable: 'code',
    messages: {
      relativePackage: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Relative Package Import',
        cwe: 'CWE-1047',
        description:
          'Relative import from another package: {{importPath}}. Use package name instead: {{packageName}}',
        severity: 'MEDIUM',
        fix: 'Import using the package name: {{packageName}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-packages.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowSamePackage: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowSamePackage: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowSamePackage = true } = options;
    const filename = context.getFilename();
    const currentDir = path.dirname(filename);
    const currentPackageRoot = findPackageJson(currentDir);

    function checkImport(node: TSESTree.Node, source: TSESTree.Literal) {
      const importPath = source.value;
      if (typeof importPath !== 'string') return;

      // Only check relative imports
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return;
      }

      // Resolve the import path
      const resolvedPath = path.resolve(currentDir, importPath);
      const importPackageRoot = findPackageJson(path.dirname(resolvedPath));

      // Skip if we're in the same package
      if (allowSamePackage && currentPackageRoot === importPackageRoot) {
        return;
      }

      // Skip if either path doesn't have a package.json
      if (!currentPackageRoot || !importPackageRoot) {
        return;
      }

      // Different packages - report error
      if (currentPackageRoot !== importPackageRoot) {
        try {
          const pkgJsonPath = path.join(importPackageRoot, 'package.json');
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
          const packageName = pkgJson.name || path.basename(importPackageRoot);

          context.report({
            node: source,
            messageId: 'relativePackage',
            data: {
              importPath,
              packageName,
            },
            fix(fixer: TSESLint.RuleFixer) {
              // Calculate the subpath within the package
              const subPath = path.relative(importPackageRoot, resolvedPath);
              const newImport =
                subPath && subPath !== '.'
                  ? `${packageName}/${subPath.replace(/\.[^/.]+$/, '')}`
                  : packageName;
              return fixer.replaceText(source, `'${newImport}'`);
            },
          });
        } catch {
          // If we can't read package.json, just report without fix
          context.report({
            node: source,
            messageId: 'relativePackage',
            data: {
              importPath,
              packageName: path.basename(importPackageRoot),
            },
          });
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkImport(node, node.source);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          checkImport(node, node.source as TSESTree.Literal);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          checkImport(node, node.arguments[0] as TSESTree.Literal);
        }
      },
    };
  },
});
