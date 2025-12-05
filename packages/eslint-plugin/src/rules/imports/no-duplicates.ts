import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDuplicates';

export const noDuplicates = createRule<[], MessageIds>({
  name: 'no-duplicates',
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports duplicate imports',
    },
    fixable: 'code',
    messages: {
      noDuplicates: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Duplicate Import',
        description: 'Duplicate import from the same module',
        severity: 'HIGH',
        fix: 'Merge imports into a single statement',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-duplicates.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const imports = new Map<string, TSESTree.ImportDeclaration[]>();

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!imports.has(source)) {
          imports.set(source, []);
        }
        const sourceNodes = imports.get(source);
        if (sourceNodes) {
          sourceNodes.push(node);
        }
      },
      'Program:exit'() {
        for (const nodes of imports.values()) {
          if (nodes.length > 1) {
            const [first, ...duplicates] = nodes;
            
            for (const duplicate of duplicates) {
              context.report({
                node: duplicate,
                messageId: 'noDuplicates',
                fix(fixer) {
                  // Simple fix: if both are named imports, merge them
                  const firstHasDefault = first.specifiers.some(s => s.type === 'ImportDefaultSpecifier');
                  const duplicateHasDefault = duplicate.specifiers.some(s => s.type === 'ImportDefaultSpecifier');
                  
                  const firstHasNamespace = first.specifiers.some(s => s.type === 'ImportNamespaceSpecifier');
                  const duplicateHasNamespace = duplicate.specifiers.some(s => s.type === 'ImportNamespaceSpecifier');

                  if (firstHasNamespace || duplicateHasNamespace) {
                    return null; // Too complex to merge namespace imports automatically
                  }

                  if (firstHasDefault && duplicateHasDefault) {
                    return null; // Cannot have two default imports
                  }

                  // If duplicate is empty (side-effect), just remove it
                  if (duplicate.specifiers.length === 0) {
                    return fixer.remove(duplicate);
                  }

                  // If first is empty (side-effect), we can't easily merge into it without more logic
                  if (first.specifiers.length === 0) {
                    return null;
                  }

                  const sourceCode = context.getSourceCode();
                  const specifiersToAdd = duplicate.specifiers.map(s => sourceCode.getText(s));
                  const lastSpecifier = first.specifiers[first.specifiers.length - 1];
                  
                  const replacement = `, ${specifiersToAdd.join(', ')}`;
                  
                  return [
                    fixer.insertTextAfter(lastSpecifier, replacement),
                    fixer.remove(duplicate)
                  ];
                }
              });
            }
          }
        }
      },
    };
  },
});

