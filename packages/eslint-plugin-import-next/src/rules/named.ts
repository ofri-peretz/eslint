/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import {
  createRule,
  resolveModule,
  TSESLint,
  TSESTree,
} from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
  objectKeyName,
} from '@interlace/eslint-devkit';
import type ts from 'typescript';
import { aliasSymbolFlag } from '../utils/typescript-peer';
import { exportName } from '../utils/export-map-rules';
import { exportMapOf } from '../utils/export-map';

type MessageIds = 'named';

export interface Options {
  additionalModules?: string[];
  /**
   * eslint-plugin-import: also check the names destructured from a
   * `require()` (`const { a } = require('./m')`) against what the module
   * exports.
   */
  commonjs?: boolean;
}

export type RuleOptions = [Options?];

/**
 * Without type information: eslint-plugin-import's reading. The module is
 * parsed (`../utils/export-map`) and every name is looked up through its
 * re-exports. A module that is not known — unresolved, ignored, CommonJS —
 * is never a finding.
 */
function untyped(
  context: TSESLint.RuleContext<MessageIds, RuleOptions>,
): TSESLint.RuleListener {
  const [{ commonjs = false } = {}] = context.options;

  function check(
    node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
    names: { node: TSESTree.Node; name: string }[],
  ) {
    if (names.length === 0 || !node.source) return;
    // Not known, or not certainly an ES module: a module that does not
    // parse is neither (its syntax errors are other rules' to report).
    const exports = exportMapOf(node.source.value, context);
    if (!exports || exports.parseGoal === 'ambiguous') return;
    for (const { node: at, name } of names) {
      if (!exports.hasDeep(name).found) {
        context.report({ node: at, messageId: 'named' });
      }
    }
  }

  return {
    ImportDeclaration(node: TSESTree.ImportDeclaration) {
      if (node.importKind === 'type') return;
      check(
        node,
        node.specifiers.flatMap((s) =>
          s.type === 'ImportSpecifier' && s.importKind !== 'type'
            ? [{ node: s.imported, name: exportName(s.imported) }]
            : [],
        ),
      );
    },
    ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
      if (node.exportKind === 'type') return;
      check(
        node,
        node.specifiers.flatMap((s) =>
          s.exportKind !== 'type'
            ? [{ node: s.local, name: exportName(s.local) }]
            : [],
        ),
      );
    },
    ...(commonjs
      ? {
          VariableDeclarator(node: TSESTree.VariableDeclarator) {
            const call = node.init;
            if (
              node.id.type !== 'ObjectPattern' ||
              node.id.properties.length === 0 ||
              call?.type !== 'CallExpression' ||
              call.callee.type !== 'Identifier' ||
              call.callee.name !== 'require' ||
              call.arguments.length !== 1 ||
              call.arguments[0].type !== 'Literal' ||
              typeof call.arguments[0].value !== 'string'
            )
              return;
            const exports = exportMapOf(call.arguments[0].value, context);
            if (!exports || exports.parseGoal === 'ambiguous') return;
            for (const property of node.id.properties) {
              if (property.type !== 'Property') continue;
              const name = objectKeyName(property);
              if (name !== null && !exports.hasDeep(name).found) {
                context.report({ node: property.key, messageId: 'named' });
              }
            }
          },
        }
      : {}),
  };
}

export const named = createRule<RuleOptions, MessageIds>({
  name: 'named',
  meta: {
    interop: { runtimes: ['eslint'], nativeEquivalent: 'import/named' },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/named.md',
      description:
        'Ensure named imports correspond to a named export in the remote file',
    },
    messages: {
      named: formatLLMMessage({
        icon: MessageIcons.SECURITY, // Using SECURITY as incorrect imports can be dangerous or break build
        issueName: 'Missing Named Export',
        description: 'Named export not found in module',
        severity: 'HIGH',
        fix: 'Verify the export name or use default import',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/named.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          commonjs: {
            type: 'boolean',
            description:
              "Also check the names destructured from a `require()` (`const { a } = require('./m')`).",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // No type information: read the other module by parsing it.
    if (!hasParserServices(context)) return untyped(context);

    const services = getParserServices(context);
    const program = services.program as ts.Program;
    const checker = program.getTypeChecker?.();
    const [{ commonjs = false } = {}] = context.options;

    /**
     * The names a module file exports, when the program knows it as an ES
     * module. A file that does not resolve or is not in the program, a
     * script, and a CommonJS `export =` module (whose names depend on
     * interop) are unknown: `null`.
     */
    function exportsOf(specifier: string): Set<string> | null {
      const file = resolveModule(specifier, context.filename);
      const sourceFile =
        file === null ? undefined : program.getSourceFile(file);
      const moduleSymbol =
        sourceFile &&
        (checker as ts.TypeChecker).getSymbolAtLocation(sourceFile);
      if (
        !moduleSymbol?.exports ||
        moduleSymbol.exports.has('export=' as ts.__String)
      )
        return null;
      return new Set(
        (checker as ts.TypeChecker)
          .getExportsOfModule(moduleSymbol)
          .map((symbol) => symbol.name),
      );
    }

    /** eslint-plugin-import's `commonjs`: `const { a } = require('./m')`. */
    function checkRequire(node: TSESTree.VariableDeclarator) {
      const call = node.init;
      if (
        node.id.type !== 'ObjectPattern' ||
        call?.type !== 'CallExpression' ||
        call.callee.type !== 'Identifier' ||
        call.callee.name !== 'require' ||
        call.arguments.length !== 1 ||
        call.arguments[0].type !== 'Literal' ||
        typeof call.arguments[0].value !== 'string'
      )
        return;
      const exported = exportsOf(call.arguments[0].value);
      if (!exported) return;
      for (const property of node.id.properties) {
        if (property.type !== 'Property') continue;
        // `{ a }`, `{ 'a': x }` and `{ ['a']: x }` read the same name; a
        // runtime key (`{ [k]: x }`) names nothing.
        const name = objectKeyName(property);
        if (name !== null && !exported.has(name)) {
          context.report({ node: property.key, messageId: 'named' });
        }
      }
    }

    return {
      ImportSpecifier(node: TSESTree.ImportSpecifier) {
        if (
          node.parent.type === 'ImportDeclaration' &&
          node.parent.importKind === 'type'
        )
          return;

        // `{ default as x }` is the `default` rule's to judge.
        if (
          (node.imported.type === 'Identifier'
            ? node.imported.name
            : node.imported.value) === 'default'
        )
          return;

        const tsNode = services.esTreeNodeToTSNodeMap.get(node.imported);
        let symbol = checker?.getSymbolAtLocation?.(tsNode);

        // Resolve alias if needed
        if (symbol && symbol.flags & aliasSymbolFlag()) {
          try {
            symbol = checker?.getAliasedSymbol?.(symbol);
          } catch {
            // If resolving alias fails, symbol implies broken import
            symbol = undefined;
          }
        }

        // Check if symbol is "unknown" or broken
        if (symbol && symbol.escapedName === 'unknown') {
          symbol = undefined;
        }

        if (!symbol) {
          // Check if module itself resolves
          const source = node.parent.source;
          if (!source) return;
          const moduleNode = services.esTreeNodeToTSNodeMap.get(source);
          const moduleSymbol = checker?.getSymbolAtLocation?.(moduleNode);

          if (!moduleSymbol) return;

          context.report({
            node: node.imported,
            messageId: 'named',
          });
        }
      },

      // `export { a } from './m'` re-exports a name './m' must export.
      ExportSpecifier(node: TSESTree.ExportSpecifier) {
        const parent = node.parent;
        if (
          parent.type !== 'ExportNamedDeclaration' ||
          !parent.source ||
          parent.exportKind === 'type' ||
          node.exportKind === 'type'
        )
          return;
        const name =
          node.local.type === 'Identifier' ? node.local.name : node.local.value;
        if (name === 'default') return;

        const moduleSymbol = checker?.getSymbolAtLocation?.(
          services.esTreeNodeToTSNodeMap.get(parent.source),
        );
        // A module that does not resolve is unknown; a CommonJS `export =`
        // module's names depend on interop.
        if (!moduleSymbol?.exports) return;
        if (moduleSymbol.exports.has('export=' as ts.__String)) return;
        const exported = checker
          ?.getExportsOfModule?.(moduleSymbol)
          .some((symbol) => symbol.name === name);
        if (exported === false) {
          context.report({ node: node.local, messageId: 'named' });
        }
      },

      ...(commonjs && checker ? { VariableDeclarator: checkRequire } : {}),
    };
  },
});
