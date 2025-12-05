import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, hasParserServices, getParserServices } from '@interlace/eslint-devkit';
import ts from 'typescript';

type MessageIds = 'noDefaultExport';

export const defaultRule = createRule<[], MessageIds>({
  name: 'default',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure a default export is present, given a default import',
    },
    messages: {
      noDefaultExport: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Missing Default Export',
        description: 'No default export found in imported module',
        severity: 'HIGH',
        fix: 'Use named imports or add a default export to the module',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/default.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!hasParserServices(context)) return {};
    
    const services = getParserServices(context);
    const checker = services.program!.getTypeChecker();

    return {
      ImportDefaultSpecifier(node) {
        if (node.parent.type === 'ImportDeclaration' && node.parent.importKind === 'type') return;

        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
        const symbol = checker.getSymbolAtLocation(tsNode);
        
        const moduleNode = services.esTreeNodeToTSNodeMap.get(node.parent.source);
        const moduleSymbol = checker.getSymbolAtLocation(moduleNode);

        if (moduleSymbol && !symbol) {
             // If module symbol exists but we can't resolve the default import symbol, 
             // check if exports contain "default"
             if (moduleSymbol.exports && !moduleSymbol.exports.has(ts.InternalSymbolName.Default)) {
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
