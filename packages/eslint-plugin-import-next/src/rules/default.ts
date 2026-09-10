/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
} from '@interlace/eslint-devkit';
import { loadTypeScript, aliasSymbolFlag } from '../utils/typescript-peer';

type MessageIds = 'noDefaultExport';

type RuleOptions = [];

export const defaultRule = createRule<RuleOptions, MessageIds>({
  name: 'default',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/default.md',
      description: 'Ensure a default export is present, given a default import',
    },
    messages: {
      noDefaultExport: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Missing Default Export',
        description: 'No default export found in imported module',
        severity: 'HIGH',
        fix: 'Use named imports or add a default export to the module',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/default.md',
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
      ImportDefaultSpecifier(node: TSESTree.ImportDefaultSpecifier) {
        if (
          node.parent.type === 'ImportDeclaration' &&
          node.parent.importKind === 'type'
        )
          return;

        // `esTreeNodeToTSNodeMap` maps an ESTree `ImportDefaultSpecifier` to
        // the TS `ImportClause` container node, not to the identifier inside
        // it, and `checker.getSymbolAtLocation()` unconditionally returns
        // `undefined` for an `ImportClause` (valid or invalid alike). Map the
        // specifier's own `local` identifier instead, the same way `named.ts`
        // resolves `node.imported` for named specifiers.
        const tsNode = services.esTreeNodeToTSNodeMap.get(node.local);
        let symbol = checker?.getSymbolAtLocation?.(tsNode);

        // Resolve alias to the binding it actually points at. This is what
        // lets a default import backed by TS `export =` / CJS interop (e.g.
        // Node builtins, JSON modules) resolve to a real symbol instead of
        // being treated as missing.
        if (symbol && symbol.flags & aliasSymbolFlag()) {
          try {
            symbol = checker?.getAliasedSymbol?.(symbol);
          } catch {
            // If resolving alias fails, symbol implies broken import
            symbol = undefined;
          }
        }

        // A default import with no matching export still resolves to a
        // symbol (the local binding), just not a useful one: TS aliases it
        // to its synthetic "unknown" symbol. Treat that the same as "no
        // symbol" so the check below still catches a genuine missing default.
        if (symbol && symbol.escapedName === 'unknown') {
          symbol = undefined;
        }

        const moduleNode = services.esTreeNodeToTSNodeMap.get(
          node.parent.source,
        );
        const moduleSymbol = checker?.getSymbolAtLocation?.(moduleNode);

        if (moduleSymbol && !symbol) {
          // If module symbol exists but we can't resolve the default import symbol,
          // check if exports contain "default"
          const tsModule = loadTypeScript();
          if (
            tsModule &&
            moduleSymbol.exports &&
            !moduleSymbol.exports.has(tsModule.InternalSymbolName.Default)
          ) {
            context.report({
              node,
              messageId: 'noDefaultExport',
            });
          }
        }
      },
    };
  },
});
