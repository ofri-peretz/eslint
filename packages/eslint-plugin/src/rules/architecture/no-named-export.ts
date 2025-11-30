/**
 * ESLint Rule: no-named-export
 * Prevents named exports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'namedExport' | 'suggestDefault';

export interface Options {
  /** Allow named exports in specific files */
  allowInFiles?: string[];
  /** Allow specific named exports */
  allowNames?: string[];
  /** Allow named exports for specific patterns */
  allowPatterns?: string[];
  /** Suggest default export alternative */
  suggestDefault?: boolean;
}

type RuleOptions = [Options?];

export const noNamedExport = createRule<RuleOptions, MessageIds>({
  name: 'no-named-export',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents named exports',
    },
    hasSuggestions: false,
    messages: {
      namedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named Export Detected',
        description: 'Named export violates import style guidelines',
        severity: 'MEDIUM',
        fix: 'Use default export instead of named export',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
      }),
      suggestDefault: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Default Export',
        description: 'Convert to default export',
        severity: 'LOW',
        fix: 'export default MyComponent;',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow named exports in specific files.',
          },
          allowNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow specific named exports.',
          },
          allowPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow named exports for specific patterns.',
          },
          suggestDefault: {
            type: 'boolean',
            default: true,
            description: 'Suggest default export alternative.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowInFiles: [],
    allowNames: [],
    allowPatterns: [],
    suggestDefault: true
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowInFiles = [],
      allowNames = [],
      allowPatterns = [],
      suggestDefault = true
    } = options || {};

    const filename = context.getFilename();

    function shouldAllow(specifier?: TSESTree.ExportSpecifier): boolean {
      if (!filename) {
        return false;
      }

      // Check if file is in allowed list
      const allowedByFile = allowInFiles.some((pattern: string) => {
        if (pattern.includes('*')) {
          // Simple glob matching: ** matches any path, * matches any name
          const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(filename);
        }
        return filename.includes(pattern);
      });

      if (allowedByFile) {
        return true;
      }

      // Check if filename matches allowed patterns
      const allowedByPattern = allowPatterns.some((pattern: string) => {
        if (pattern.includes('*')) {
          // Simple glob matching: ** matches any path, * matches any name
          const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(filename);
        }
        return filename.includes(pattern);
      });

      if (allowedByPattern) {
        return true;
      }

      // Check if specific export name is allowed
      if (specifier && specifier.exported.type === 'Identifier' && allowNames.includes(specifier.exported.name)) {
        return true;
      }

      return false;
    }


    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {

        // Check each specifier individually
        if (node.specifiers && node.specifiers.length > 0) {
          for (const specifier of node.specifiers) {
            // Allow re-exporting default as named export
            if ((specifier.exported.type === 'Identifier' && specifier.exported.name !== 'default') && !shouldAllow(specifier)) {
              context.report({
                node: specifier,
                messageId: 'namedExport',
                suggest: suggestDefault ? [
                  {
                    messageId: 'suggestDefault',
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fix(_fixer: TSESLint.RuleFixer) {
                      // Convert named export to default export
                      // This would require more complex logic to handle the export statement
                      return null; // Placeholder - would need AST manipulation
                    },
                  },
                ] : [],
              });
            }
          }
        }

        // Check for export declarations (export const foo = 1;)
        else if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            // Report on each variable declarator individually
            for (const declarator of node.declaration.declarations) {
              const varName = declarator.id.type === 'Identifier' ? declarator.id.name : undefined;
              const isAllowed = varName && allowNames.includes(varName);
              if (!isAllowed) {
                context.report({
                  node: declarator,
                  messageId: 'namedExport',
                  suggest: suggestDefault ? [
                    {
                      messageId: 'suggestDefault',
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      fix(_fixer: TSESLint.RuleFixer) {
                        // Convert named export to default export
                        return null; // Placeholder - would need AST manipulation
                      },
                    },
                  ] : [],
                });
              }
            }
          } else {
            // For other declaration types (FunctionDeclaration, ClassDeclaration, etc.)
            if (!shouldAllow()) {
              context.report({
                node: node.declaration,
                messageId: 'namedExport',
                suggest: suggestDefault ? [
                  {
                    messageId: 'suggestDefault',
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fix(_fixer: TSESLint.RuleFixer) {
                      // Convert named export to default export
                      return null; // Placeholder - would need AST manipulation
                    },
                  },
                ] : [],
              });
            }
          }
        }
      },
    };
  },
});
