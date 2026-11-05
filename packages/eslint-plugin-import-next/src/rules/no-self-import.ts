/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-self-import
 * Forbid a module from importing itself (eslint-plugin-import inspired)
 */
import * as path from 'node:path';
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  isGlobalReference,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'selfImport';

/**
 * The extensions a JS/TS module resolver will add on its own.
 *
 * A closed list, so `.css`, `.json`, `.graphql` and a dotted name segment like
 * `.constants` are all treated as naming a different file — which they do.
 */
const MODULE_EXTENSION = /\.[cm]?[jt]sx?$/;

/** The TypeScript sources an output extension in a specifier stands for. */
const OUTPUT_TO_SOURCE: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

export interface Options {
  /** Allow self-import in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

function isImportingSelf(
  context: TSESLint.RuleContext<MessageIds, RuleOptions>,
  node: TSESTree.Node,
  importPath: string,
): boolean {
  const filename = context.filename;

  // If the input is from stdin, this test can't fail
  if (filename === '<text>') {
    return false;
  }

  // Skip test files if allowed.
  //
  // `filename.includes('__tests__')` matched any path containing those
  // characters anywhere — `~/my__tests__project/src/a.ts` included — which is
  // the substring-on-a-name defect CLAUDE.md puts first. It suppresses rather
  // than reports, so it cost recall rather than trust, but the devkit already
  // has the predicate: basename for `*.test.*`, exact path SEGMENT equality for
  // the directory case.
  const [options] = context.options;
  const { allowInTests = false } = options || {};
  if (allowInTests && isTestFilePath(filename)) {
    return false;
  }

  // Resolve the import path. ESLint passes an absolute filename; a relative
  // one (the Linter API) is resolved the same way the specifier is, so the
  // two sides compare.
  const file = path.resolve(filename);
  let resolvedPath: string;
  if (
    importPath === '.' ||
    importPath === '..' ||
    importPath.startsWith('./') ||
    importPath.startsWith('../')
  ) {
    resolvedPath = path.resolve(path.dirname(file), importPath);
  } else if (importPath.startsWith('/')) {
    resolvedPath = importPath;
  } else {
    // Module import (like 'lodash') - not a self-import
    return false;
  }

  // A self-import means the specifier resolves to THIS file. A specifier
  // whose last segment carries a dotted suffix that is not a module
  // extension names a different file (`./main.css`,
  // `./styleUtils.test.constants`: both were the only findings this rule
  // produced on the pinned corpus when it stripped "the last extension").
  const fileExt = MODULE_EXTENSION.exec(file)?.[0] ?? '';
  const fileStem = file.slice(0, file.length - fileExt.length);
  const specExt = MODULE_EXTENSION.exec(resolvedPath)?.[0];
  if (specExt) {
    // An explicit extension names this file when it is this file's own, or
    // the OUTPUT extension TypeScript maps to it (`./app.js` for app.ts).
    // `./app.tsx` from app.ts is another file.
    return (
      resolvedPath.slice(0, -specExt.length) === fileStem &&
      (specExt === fileExt ||
        (OUTPUT_TO_SOURCE[specExt] ?? []).includes(fileExt))
    );
  }
  // No module extension: the file itself ('./app.test' from app.test.ts),
  // or - for an index file - its directory ('.', './', '../lib' from
  // lib/index.ts). Any other dotted suffix names another file.
  if (resolvedPath === fileStem) return true;
  if (/\.[^/.]+$/.test(importPath)) return false;
  return (
    path.basename(fileStem) === 'index' && resolvedPath === path.dirname(file)
  );
}

export const noSelfImport = createRule<RuleOptions, MessageIds>({
  name: 'no-self-import',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-self-import',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-self-import.md',
      description: 'Forbid a module from importing itself',
    },
    messages: {
      selfImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Self Import',
        description: 'Module imports itself',
        severity: 'HIGH',
        fix: 'Remove the self-import statement',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-self-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow self-imports in test files.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: false }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Visit all module imports and requires
    function visitModule(source: TSESTree.Literal, node: TSESTree.Node) {
      const importPath = source.value;

      if (
        typeof importPath === 'string' &&
        isImportingSelf(context, node, importPath)
      ) {
        context.report({
          node: source,
          messageId: 'selfImport',
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // A type-only import is erased, and so is one whose every specifier
        // is an inline `type`: neither loads the module at runtime.
        if (node.importKind === 'type') {
          return;
        }
        if (
          node.specifiers.length > 0 &&
          node.specifiers.every(
            (s) => s.type === 'ImportSpecifier' && s.importKind === 'type',
          )
        ) {
          return;
        }
        visitModule(node.source, node);
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        // `import x = require('./self')` loads the module like require().
        if (
          node.importKind !== 'type' &&
          node.moduleReference.type === 'TSExternalModuleReference'
        ) {
          visitModule(node.moduleReference.expression, node);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Handle require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          // A `require` the file declares itself is not Node's loader.
          isGlobalReference(node.callee, context.sourceCode)
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal') {
            visitModule(arg, node);
          }
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        // Handle dynamic imports - only check if source is a literal
        if (node.source.type === 'Literal') {
          visitModule(node.source, node);
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Handle re-exports; `export type { T } from` is erased.
        if (node.source && node.exportKind !== 'type') {
          visitModule(node.source, node);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // Handle re-exports; `export type * from` is erased.
        if (node.exportKind !== 'type') {
          visitModule(node.source, node);
        }
      },
    };
  },
});
