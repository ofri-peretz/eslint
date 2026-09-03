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
import { createRule, isTestFilePath } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'selfImport';

/**
 * The extensions a JS/TS module resolver will add on its own.
 *
 * A closed list, so `.css`, `.json`, `.graphql` and a dotted name segment like
 * `.constants` are all treated as naming a different file — which they do.
 */
const MODULE_EXTENSION = /\.[cm]?[jt]sx?$/;

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

  // Resolve the import path
  let resolvedPath: string;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // Relative import - resolve relative to current file
    const currentDir = path.dirname(filename);
    resolvedPath = path.resolve(currentDir, importPath);
  } else if (importPath.startsWith('/')) {
    // Absolute import
    resolvedPath = importPath;
  } else {
    // Module import (like 'lodash') - not a self-import
    return false;
  }

  // A self-import means the specifier resolves to THIS file. Stripping "the
  // last extension" from both sides was a crude stand-in for that and got two
  // classes wrong on the pinned corpus, both of them the only two findings this
  // rule produced there:
  //
  //   main.jsx        importing './main.css'                 -> both became `main`
  //   styleUtils.test.js importing './styleUtils.test.constants'
  //                                                          -> both became `styleUtils.test`
  //
  // A stylesheet is not this module, and `.constants` is not an extension at
  // all — it is part of the module's NAME, and `\.[^/.]+$` cannot tell the
  // difference.
  //
  // So: a specifier whose last segment carries a dotted suffix that is not a
  // module extension names a different file, full stop. Otherwise strip only
  // real module extensions from each side before comparing.
  const trailingSuffix = /\.[^/.]+$/.exec(importPath);
  if (trailingSuffix && !MODULE_EXTENSION.test(importPath)) {
    return false;
  }

  const normalizedCurrent = filename.replace(MODULE_EXTENSION, '');
  const normalizedImport = resolvedPath.replace(MODULE_EXTENSION, '');

  return normalizedCurrent === normalizedImport;
}

export const noSelfImport = createRule<RuleOptions, MessageIds>({
  name: 'no-self-import',
  meta: {
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

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
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
        // Allow type imports in TypeScript
        if (node.importKind === 'type') {
          return;
        }
        visitModule(node.source, node);
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Handle require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
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
        // Handle re-exports
        if (node.source) {
          visitModule(node.source, node);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // Handle re-exports
        visitModule(node.source, node);
      },
    };
  },
});
