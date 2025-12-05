import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'newlineAfterImport';

export const newlineAfterImport = createRule<[], MessageIds>({
  name: 'newline-after-import',
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce a newline after import statements',
    },
    fixable: 'whitespace',
    messages: {
      newlineAfterImport: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Newline After Import',
        description: 'Require a newline after the last import statement',
        severity: 'LOW',
        fix: 'Add a newline after the import block',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        const sourceCode = context.getSourceCode();
        const nextToken = sourceCode.getTokenAfter(node);
        
        if (!nextToken) return; // End of file

        // If the next token is on the same line, it's an error (unless it's a comment, but usually imports are on own line)
        if (nextToken.loc.start.line === node.loc.end.line) {
           // Maybe it's fine if it's another import?
           // Wait, logic is: after the *last* import in a block or any import?
           // "Enforce a newline after import statements" usually means after the *group* of imports.
           // But checking every import: if next node is NOT an import, there should be a blank line.
        }
        
        const nextNode = sourceCode.getNodeByRangeIndex(nextToken.range[0]);
        if (nextNode && (nextNode.type === 'ImportDeclaration' || nextNode.type === 'TSImportEqualsDeclaration')) {
            return;
        }

        // Check lines between
        if (nextToken.loc.start.line - node.loc.end.line < 2) {
             context.report({
                node,
                messageId: 'newlineAfterImport',
                fix(fixer) {
                    const linesBetween = nextToken.loc.start.line - node.loc.end.line;
                    const newlinesToAdd = 2 - linesBetween; // Add enough to make it 2 lines total
                    return fixer.insertTextAfter(node, '\n'.repeat(newlinesToAdd));
                }
             });
        }
      },
    };
  },
});

