/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
  /** Accepted for configuration compatibility: an import inside one package is never reported. */
  allowSamePackage?: boolean;
}

type RuleOptions = [Options?];

/** A package: a directory whose package.json declares a `name`. */
interface PackageRoot {
  dir: string;
  name: string;
}

// Cache for package lookups, by start directory
const packageCache = new Map<string, PackageRoot | null>();

function packageName(pkgPath: string): string | null {
  try {
    const name = (
      JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: unknown;
      }
    ).name;
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

/**
 * The nearest package at or above `startDir`. A package.json without a
 * `name` (a `{"type":"module"}` scope marker, a private tool folder) is not a
 * package anyone imports by name, so the walk goes past it.
 */
function findPackage(startDir: string): PackageRoot | null {
  const cached = packageCache.get(startDir);
  if (cached !== undefined) return cached;

  let found: PackageRoot | null = null;
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const pkgPath = path.join(currentDir, 'package.json');
    const name = fs.existsSync(pkgPath) ? packageName(pkgPath) : null;
    if (name) {
      found = { dir: currentDir, name };
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  packageCache.set(startDir, found);
  return found;
}

export const noRelativePackages = createRule<RuleOptions, MessageIds>({
  name: 'no-relative-packages',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-relative-packages.md',
      description: 'Forbid importing packages through relative paths',
      cwe: 'CWE-1047',
      cvss: 5,
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let currentDir: string;
    let currentPackage: PackageRoot | null;

    function checkImport(source: TSESTree.Literal) {
      const importPath = source.value;
      if (typeof importPath !== 'string') return;

      // Only check relative imports
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return;
      }

      // The walk starts AT the resolved path: `../../other` names the package
      // directory itself, whose own package.json is the boundary.
      const resolvedPath = path.resolve(currentDir, importPath);
      const importPackage = findPackage(resolvedPath);

      // Only a crossing from one package into another is a finding. Inside
      // one package nothing is reported, whatever `allowSamePackage` says.
      // A package that CONTAINS the importing one (a workspace root reached
      // past a nameless folder) is not another package to import by name.
      if (
        !currentPackage ||
        !importPackage ||
        currentPackage.dir === importPackage.dir ||
        currentPackage.dir.startsWith(importPackage.dir + path.sep)
      ) {
        return;
      }

      const subPath = path
        .relative(importPackage.dir, resolvedPath)
        .split(path.sep)
        .join('/');
      const newImport = subPath
        ? `${importPackage.name}/${subPath.replace(/\.[^/.]+$/, '')}`
        : importPackage.name;

      context.report({
        node: source,
        messageId: 'relativePackage',
        data: {
          importPath,
          packageName: importPackage.name,
        },
        fix(fixer: TSESLint.RuleFixer) {
          return fixer.replaceText(source, `'${newImport}'`);
        },
      });
    }

    return {
      before() {
        // `allowSamePackage` is accepted for configuration compatibility; an
        // import inside one package is never reported either way.
        const filename = context.filename;
        currentDir = path.dirname(filename);
        currentPackage = findPackage(currentDir);
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkImport(node.source);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) checkImport(node.source);
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkImport(node.source);
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        const ref = node.moduleReference;
        // The parser only accepts a string literal inside `require(...)` here.
        if (ref.type === AST_NODE_TYPES.TSExternalModuleReference) {
          checkImport(ref.expression as TSESTree.Literal);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          checkImport(node.source as TSESTree.Literal);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
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
