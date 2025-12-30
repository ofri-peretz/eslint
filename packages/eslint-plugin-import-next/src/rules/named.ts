import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
} from '@interlace/eslint-devkit';
import ts from 'typescript';

type MessageIds = 'named';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

export const named = createRule<RuleOptions, MessageIds>({
  name: 'named',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure named imports correspond to a named export in the remote file',
    },
    fixable: 'code',
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

        const tsNode = services.esTreeNodeToTSNodeMap.get(node.imported);
        let symbol = checker?.getSymbolAtLocation?.(tsNode);

        // Resolve alias if needed
        if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
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

          if (moduleSymbol) {
            context.report({
              node: node.imported,
              messageId: 'named',
            });
          }
        }
      },
    };
  },
});
