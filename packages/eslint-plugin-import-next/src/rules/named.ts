/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
} from '@interlace/eslint-devkit';
import type ts from 'typescript';
import { aliasSymbolFlag } from '../utils/typescript-peer';

type MessageIds = 'named';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

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
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    if (!hasParserServices(context)) return {};

    const services = getParserServices(context);
    const checker = services.program?.getTypeChecker?.();

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
    };
  },
});
