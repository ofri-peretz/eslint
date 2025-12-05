import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons, hasParserServices, getParserServices } from '@forge-js/eslint-plugin-utils';
import ts from 'typescript';

type MessageIds = 'namespace';

export const namespace = createRule<[], MessageIds>({
  name: 'namespace',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure imported namespaces contain dereferenced properties as they are dereferenced',
    },
    messages: {
      namespace: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Namespace Import Issue',
        description: 'Namespace import usage issue',
        severity: 'MEDIUM',
        fix: 'Verify namespace member existence',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
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
      MemberExpression(node) {
        // Check if object is a namespace import
        const object = node.object;
        if (object.type !== 'Identifier') return;

        const tsNode = services.esTreeNodeToTSNodeMap.get(object);
        const symbol = checker.getSymbolAtLocation(tsNode);

        if (symbol && symbol.declarations && symbol.declarations.length > 0) {
            const declaration = symbol.declarations[0];
            if (declaration.kind === ts.SyntaxKind.NamespaceImport) {
                // If we have a namespace import, the symbol should refer to the module.
                // We need to check if the property being accessed exists on the module exports.
                
                if (node.property.type !== 'Identifier') return; // Computed access might be hard to check
                
                const propertyName = node.property.name;
                
                // This is a bit simplified; we really need to check the type of the symbol
                const type = checker.getTypeAtLocation(tsNode);
                const propertySymbol = checker.getPropertyOfType(type, propertyName);
                
                if (!propertySymbol) {
                    context.report({
                        node: node.property,
                        messageId: 'namespace',
                        data: {
                            name: propertyName
                        }
                    });
                }
            }
        }
      },
    };
  },
});
