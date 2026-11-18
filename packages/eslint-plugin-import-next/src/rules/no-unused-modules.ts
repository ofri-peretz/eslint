/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unused-modules
 * Forbid modules without exports
 */
import path from 'node:path';
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  isGlobalReference,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingExports';

/** `Object` methods that write their first argument's properties. */
const EXPORT_WRITERS = new Set([
  'defineProperty',
  'defineProperties',
  'assign',
]);

export interface Options {
  /** Allow modules that only contain imports */
  allowImportOnly?: boolean;
  /**
   * eslint-plugin-import: `true` reports a module with no exports (this
   * rule's check), `false` turns it off. Absent: on.
   */
  missingExports?: boolean;
  /**
   * eslint-plugin-import: globs for its `unusedExports` check, which this rule
   * does not implement. Upstream does not apply it to `missingExports`, so
   * it is accepted and has no effect here.
   */
  src?: string[];
  /** eslint-plugin-import: globs; files matching one are not checked. */
  ignoreExports?: string[];
}

type RuleOptions = [Options?];

export const noUnusedModules = createRule<RuleOptions, MessageIds>({
  name: 'no-unused-modules',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-unused-modules.md',
      description: 'Forbid modules without exports',
    },
    hasSuggestions: false,
    messages: {
      missingExports: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Exports',
        description: 'Module has no exports',
        severity: 'LOW',
        fix: 'Add exports or remove if module is unused',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unused-modules.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowImportOnly: {
            type: 'boolean',
            default: false,
            description: 'Allow modules that only contain imports.',
          },
          missingExports: {
            type: 'boolean',
            description:
              'eslint-plugin-import: true reports a module with no exports, false turns the check off. Absent: on. Its `unusedExports` (cross-file usage) is not implemented and is rejected rather than ignored.',
          },
          src: {
            type: 'array',
            items: { type: 'string' },
            description:
              'eslint-plugin-import: globs for its unusedExports check; like there, it does not narrow the missing-exports check',
          },
          ignoreExports: {
            type: 'array',
            items: { type: 'string' },
            description:
              'eslint-plugin-import: globs, relative to the cwd; files matching one are not checked',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowImportOnly: false,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowImportOnly: boolean;
    /** eslint-plugin-import's `missingExports`, `src` and `ignoreExports` exclude this file. */
    let skipped: boolean;
    let hasExports: boolean;
    let hasImports: boolean;

    /** The real `exports` object, or the real `module.exports`. */
    function isExportsObject(node: TSESTree.Node): boolean {
      if (node.type === 'Identifier') {
        return (
          node.name === 'exports' && isGlobalReference(node, context.sourceCode)
        );
      }
      return (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'module' &&
        propertyName(node) === 'exports' &&
        isGlobalReference(node.object, context.sourceCode)
      );
    }

    return {
      before() {
        const [options] = context.options;
        let missingExports: boolean;
        let ignoreExports: string[];
        // `src` scopes eslint-plugin-import's `unusedExports` only, not this
        // check (its `checkExportPresence` never reads it).
        ({
          allowImportOnly = false,
          missingExports = true,
          ignoreExports = [],
        } = options || {});
        const matches = (globs: string[]) =>
          globs.some((glob) =>
            path.matchesGlob(context.filename, path.resolve(context.cwd, glob)),
          );
        skipped = !missingExports || matches(ignoreExports);

        hasExports = false;
        hasImports = false;
      },
      ImportDeclaration() {
        hasImports = true;
      },
      ExportNamedDeclaration() {
        hasExports = true;
      },
      ExportDefaultDeclaration() {
        hasExports = true;
      },
      ExportAllDeclaration() {
        hasExports = true;
      },
      // TypeScript `export = x` compiles to `module.exports = x`
      TSExportAssignment() {
        hasExports = true;
      },
      // `const x = require('m')` and TS `import x = require('m')` import too.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          hasImports = true;
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          isGlobalReference(node.callee, context.sourceCode)
        ) {
          hasImports = true;
          return;
        }
        // Object.defineProperty(exports, 'a', ...) / Object.assign(module.exports, ...)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Object' &&
          isGlobalReference(node.callee.object, context.sourceCode) &&
          EXPORT_WRITERS.has(propertyName(node.callee) ?? '') &&
          node.arguments[0] &&
          isExportsObject(node.arguments[0])
        ) {
          hasExports = true;
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // CommonJS: `module.exports = x`, `module['exports'] = x`,
        // `exports.a = x`, `module.exports.a.b = x`. Only the real
        // `module` / `exports` count: a parameter named `exports` is not
        // this module's exports object. `exports = x` alone rebinds the
        // local and exports nothing.
        for (
          let target: TSESTree.Node = node.left;
          target.type === 'MemberExpression';
          target = target.object
        ) {
          if (isExportsObject(target) || isExportsObject(target.object)) {
            hasExports = true;
            return;
          }
        }
      },
      'Program:exit'() {
        // `allowImportOnly` exempts a module that imports but exports nothing. It is
        // not a rule-level off switch: a module with no imports at all does not "only
        // contain imports", so it is still reported.
        const importOnly = allowImportOnly && hasImports;
        if (!skipped && !hasExports && !importOnly) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingExports',
          });
        }
      },
    };
  },
});
