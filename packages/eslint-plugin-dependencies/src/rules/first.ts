import type { TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'first';

export const first = createRule<[], MessageIds>({
  name: 'first',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure all imports appear before other statements',
    },
    fixable: 'code',
    messages: {
      first: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Import Placement',
        description: 'Import statements should be at the top of the file',
        severity: 'MEDIUM',
        fix: 'Move import to the top of the file',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        const sourceCode = context.getSourceCode();
        const body = sourceCode.ast.body;
        const index = body.indexOf(node);
        
        if (index > 0) {
          const prevNode = body[index - 1];
          if (prevNode.type !== 'ImportDeclaration' && 
              prevNode.type !== 'TSImportEqualsDeclaration' &&
              !isDirective(prevNode)) {
            
            context.report({
              node,
              messageId: 'first',
            });
          }
        }
      },
    };

    function isDirective(node: TSESTree.Node) {
      return node.type === 'ExpressionStatement' && 
             node.expression.type === 'Literal' && 
             typeof node.expression.value === 'string' &&
             node.expression.value.startsWith('use ');
    }
  },
});

