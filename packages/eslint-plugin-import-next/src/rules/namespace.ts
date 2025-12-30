import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
} from '@interlace/eslint-devkit';
import ts from 'typescript';

type MessageIds = 'namespace';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

export const namespace = createRule<RuleOptions, MessageIds>({
  name: 'namespace',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure imported namespaces contain dereferenced properties as they are dereferenced',
    },
    messages: {
      namespace: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Namespace Import Issue',
        description: 'Namespace import usage issue',
        severity: 'MEDIUM',
        fix: 'Verify namespace member existence',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
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
      MemberExpression(node: TSESTree.MemberExpression) {
        // Check if object is a namespace import
        const object = node.object;
        if (object.type !== 'Identifier') return;

        const tsNode = services.esTreeNodeToTSNodeMap.get(object);
        const symbol = checker?.getSymbolAtLocation?.(tsNode);

        if (symbol && symbol.declarations && symbol.declarations.length > 0) {
          const declaration = symbol.declarations[0];
          if (declaration.kind === ts.SyntaxKind.NamespaceImport) {
            // If we have a namespace import, the symbol should refer to the module.
            // We need to check if the property being accessed exists on the module exports.

            if (node.property.type !== 'Identifier') return; // Computed access might be hard to check

            const propertyName = node.property.name;

            // This is a bit simplified; we really need to check the type of the symbol
            const type = checker?.getTypeAtLocation?.(tsNode);
            if (!type) return;
            const propertySymbol = checker?.getPropertyOfType?.(
              type,
              propertyName,
            );
            
            // Removed erroneous early return here

            if (!propertySymbol) {
              context.report({
                node: node.property,
                messageId: 'namespace',
                data: {
                  name: propertyName,
                },
              });
            }
          }
        }
      },
    };
  },
});
