/**
 * ESLint Rule: no-named-as-default
 * Forbid use of exported name as identifier of default export
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'namedAsDefault';

type RuleOptions = [];

export const noNamedAsDefault = createRule<RuleOptions, MessageIds>({
  name: 'no-named-as-default',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid use of exported name as identifier of default export',
    },
    messages: {
      namedAsDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named as Default',
        cwe: 'CWE-1078',
        description:
          'Using exported name "{{name}}" as default import may shadow the named export',
        severity: 'MEDIUM',
        fix: 'Use a different name for the default import or import the named export instead',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // This rule requires resolving the imported module to see its exports
    // For a basic implementation without full resolution, we track what we can
    // In practice, this would need TypeScript language service or resolver

    // Track exports from the current file for same-file detection
    const exportedNames = new Set<string>();
    let defaultExportName: string | null = null;

    return {
      // Collect exports to detect potential issues
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.declaration) {
          if (
            (node.declaration.type === 'FunctionDeclaration' ||
              node.declaration.type === 'ClassDeclaration') &&
            node.declaration.id
          ) {
            exportedNames.add(node.declaration.id.name);
          } else if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach((decl) => {
              if (decl.id.type === 'Identifier') {
                exportedNames.add(decl.id.name);
              }
            });
          }
        }
        node.specifiers.forEach((spec) => {
          if (spec.exported.type === 'Identifier') {
            exportedNames.add(spec.exported.name);
          }
        });
      },

      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        // Track if default export is a named identifier
        if (node.declaration.type === 'Identifier') {
          defaultExportName = node.declaration.name;
        } else if (
          (node.declaration.type === 'FunctionDeclaration' ||
            node.declaration.type === 'ClassDeclaration') &&
          node.declaration.id
        ) {
          defaultExportName = node.declaration.id.name;
        }
      },

      'Program:exit'() {
        // If the default export shares a name with a named export, report
        if (defaultExportName && exportedNames.has(defaultExportName)) {
          // This is a heuristic - ideally we'd track the import site
          // For now, we report on the pattern where importing default as the name
          // would shadow the named export
        }
      },

      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Check if default import name matches a named import from same module
        const defaultSpec = node.specifiers.find(
          (s) => s.type === 'ImportDefaultSpecifier',
        );
        if (!defaultSpec) return;

        const defaultName = defaultSpec.local.name;

        // Check if there's also a named import with the same name being imported
        const namedSpecs = node.specifiers.filter(
          (s) => s.type === 'ImportSpecifier',
        ) as TSESTree.ImportSpecifier[];

        for (const namedSpec of namedSpecs) {
          const importedName =
            namedSpec.imported.type === 'Identifier'
              ? namedSpec.imported.name
              : namedSpec.imported.value;

          if (importedName === defaultName) {
            context.report({
              node: defaultSpec,
              messageId: 'namedAsDefault',
              data: { name: defaultName },
            });
            break;
          }
        }
      },
    };
  },
});
