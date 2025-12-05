/**
 * ESLint Rule: prefer-default-export
 * Prefer a default export if module exports a single name (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferDefaultExport' | 'singleNamedExport' | 'multipleNamedToDefault';

export interface Options {
  /** Target file types to check */
  target?: ('always' | 'single' | 'as-needed');
  /** Ignore files matching patterns */
  ignoreFiles?: string[];
  /** Allow named exports in specific contexts */
  allowNamedExports?: boolean;
}

type RuleOptions = [Options?];

export const preferDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'prefer-default-export',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer a default export if module exports a single name',
    },
    hasSuggestions: true,
    messages: {
      preferDefaultExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Prefer Default Export',
        description: 'Single named export should be a default export',
        severity: 'LOW',
        fix: 'Convert named export to default export',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
      singleNamedExport: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Single Export Pattern',
        description: 'Module exports single item that could be default export',
        severity: 'LOW',
        fix: 'Consider using default export for cleaner imports',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
      multipleNamedToDefault: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Multiple Named Exports',
        description: 'Consider consolidating related exports into default export',
        severity: 'LOW',
        fix: 'Group related exports as named properties of default export',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['always', 'single', 'as-needed'],
            default: 'single',
            description: 'When to enforce default exports: always (all), single (single export), as-needed (when beneficial)',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns to ignore',
          },
          allowNamedExports: {
            type: 'boolean',
            default: false,
            description: 'Allow named exports without warnings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    target: 'single',
    ignoreFiles: [],
    allowNamedExports: false
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      target = 'single',
      ignoreFiles = [],
      allowNamedExports = false,
    } = options || {};

    const filename = context.getFilename();
    if (!filename) {
      return {};
    }

    function shouldIgnoreFile(): boolean {
      return ignoreFiles.some((pattern: string) => filename.includes(pattern));
    }

    if (shouldIgnoreFile() || allowNamedExports) {
      return {};
    }

    // Track exports in this module with their nodes
    const namedExports = new Map<string, TSESTree.Node>();
    let defaultExportNode: TSESTree.ExportDefaultDeclaration | null = null;

    function addNamedExport(name: string, exportNode: TSESTree.Node) {
      namedExports.set(name, exportNode);
    }

    function checkSingleExport() {
      if (target === 'single' && namedExports.size === 1 && !defaultExportNode) {
        // Find the export node to report on
        const [exportName, exportNode] = Array.from(namedExports.entries())[0];

        // Report on the single named export
        context.report({
          node: exportNode,
          messageId: 'preferDefaultExport',
          data: {
            exportName,
            exportCount: namedExports.size,
            suggestion: 'Convert to default export for cleaner imports',
            benefit: 'Default exports provide cleaner import syntax and better tree-shaking',
          },
          suggest: [
            {
              messageId: 'preferDefaultExport',
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.insertTextBefore(exportNode, '// TODO: Convert named export to default export\n');
              },
            },
          ],
        });
      }
    }

    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Check if this is a re-export of 'default' (export { default } from "./other")
        if (node.source && node.specifiers) {
          const hasDefaultReExport = node.specifiers.some(
            (specifier: TSESTree.ExportSpecifier) => specifier.exported.type === 'Identifier' && specifier.exported.name === 'default'
          );
          if (hasDefaultReExport) {
            // Treat re-export of default as a default export
            defaultExportNode = node as unknown as TSESTree.ExportDefaultDeclaration;
          }
          // Skip all other re-exports
          return;
        }

        // Skip re-exports (exports from another module)
        if (node.source) {
          return;
        }

        // Skip TypeScript type-only exports
        if (node.exportKind === 'type') {
          return;
        }

        // Track named exports
        if (node.declaration) {
          // Skip TypeScript interface and type declarations
          if (node.declaration.type === 'TSInterfaceDeclaration' ||
              node.declaration.type === 'TSTypeAliasDeclaration') {
            return;
          }

          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
              if (decl.id.type === 'Identifier') {
                addNamedExport(decl.id.name, node);
              }
            });
          } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            addNamedExport(node.declaration.id.name, node);
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            addNamedExport(node.declaration.id.name, node);
          }
        }

        // Handle export specifiers (but not type specifiers)
        if (node.specifiers) {
          node.specifiers.forEach((specifier: TSESTree.ExportSpecifier) => {
            // Skip type-only export specifiers
            if (specifier.exportKind === 'type') {
              return;
            }
            if (specifier.exported.type === 'Identifier') {
              addNamedExport(specifier.exported.name, node);
            }
          });
        }
      },

      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        defaultExportNode = node;
      },

      // At the end of the file, analyze the export pattern
      'Program:exit'(node: TSESTree.Program) {
        if (target === 'always' && namedExports.size > 0 && !defaultExportNode) {
          context.report({
            node,
            messageId: 'multipleNamedToDefault',
            data: {
              exportCount: namedExports.size,
              exports: Array.from(namedExports).join(', '),
              suggestion: 'Consider grouping related exports as a default export object',
            },
          });
        } else {
          checkSingleExport();
        }
      },
    };
  },
});
