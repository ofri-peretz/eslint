import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, hasParserServices, getParserServices } from '@interlace/eslint-devkit';

type MessageIds = 'named';

export const named = createRule<[], MessageIds>({
  name: 'named',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure named imports correspond to a named export in the remote file',
    },
    fixable: 'code',
    messages: {
      named: formatLLMMessage({
        icon: MessageIcons.SECURITY, // Using SECURITY as incorrect imports can be dangerous or break build
        issueName: 'Missing Named Export',
        description: 'Named export not found in module',
        severity: 'HIGH',
        fix: 'Verify the export name or use default import',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/named.md',
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
      ImportSpecifier(node) {
        if (node.parent.type === 'ImportDeclaration' && node.parent.importKind === 'type') return;

        const tsNode = services.esTreeNodeToTSNodeMap.get(node.imported);
        const symbol = checker.getSymbolAtLocation(tsNode);
        
        // If symbol is undefined, it means TS couldn't resolve it.
        // However, we need to be careful about "any" types or unchecked JS.
        // If the file is .ts, we expect resolution.
        
        if (!symbol) {
             // Check if module itself resolves
             const source = node.parent.source;
             if (!source) return;
             const moduleNode = services.esTreeNodeToTSNodeMap.get(source);
             const moduleSymbol = checker.getSymbolAtLocation(moduleNode);
             
             if (moduleSymbol) {
                 // Module found, but export not found
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

