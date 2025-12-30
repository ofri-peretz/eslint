/**
 * ESLint Rule: no-named-export
 * Prevents named exports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
      }),
      suggestDefault: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Default Export',
        description: 'Convert to default export',
        severity: 'LOW',
        fix: 'export default MyComponent;',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
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
  defaultOptions: [
    {
      allowInFiles: [],
      allowNames: [],
      allowPatterns: [],
      suggestDefault: true,
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowInFiles = [],
      allowNames = [],
      allowPatterns = [],
      // suggestDefault // unused option
    } = options || {};

    const filename = context.getFilename();

    function shouldAllow(specifier?: TSESTree.ExportSpecifier): boolean {
      if (!filename) {
        return false;
      }

      // Check if file is in allowed list
      const allowedByFile = allowInFiles.some((pattern: string) => {
        if (pattern.includes('*')) {
          const regexStr = '^' + pattern
             .replace(/[.+?^${}()|[\]\\]/g, (match) => {
                 if (match === '*') return '*'; 
                 return '\\' + match;
             })
             .replace(/\*\*/g, '.*')
             .replace(/\*/g, '[^/]*') + '$';
             
          try {
             const regex = new RegExp(regexStr);
             const result = regex.test(filename);
             // DEBUG LOGIC if needed, but relying on report below
             return result;
          } catch {
             return false;
          }
        }
        return filename.includes(pattern);
      });

      if (allowedByFile) {
        return true;
      }

      // Check if filename matches allowed patterns
      const allowedByPattern = allowPatterns.some((pattern: string) => {
        if (pattern.includes('*')) {
          const regexStr = '^' + pattern
             .replace(/[.+?^${}()|[\]\\]/g, (match) => {
                 if (match === '*') return '*'; 
                 return '\\' + match;
             })
             .replace(/\*\*/g, '.*')
             .replace(/\*/g, '[^/]*') + '$';
          try {   
            const regex = new RegExp(regexStr);
            return regex.test(filename);
          } catch { return false; }
        }
        return filename.includes(pattern);
      });

      if (allowedByPattern) {
        return true;
      }

      // Check if specific export name is allowed
      if (
        specifier &&
        specifier.exported.type === 'Identifier' &&
        allowNames.includes(specifier.exported.name)
      ) {
        return true;
      }

      return false;
    }

    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Skip type exports
        if (
          node.exportKind === 'type' ||
          (node.declaration &&
             (node.declaration.type === 'TSInterfaceDeclaration' || 
              node.declaration.type === 'TSTypeAliasDeclaration'))
        ) {
          return;
        }

        // Check each specifier individually
        if (node.specifiers && node.specifiers.length > 0) {
          for (const specifier of node.specifiers) {
            // Allow re-exporting default as named export
            if (
              specifier.exported.type === 'Identifier' &&
              specifier.exported.name !== 'default' &&
              !shouldAllow(specifier)
            ) {
              if (specifier.exportKind !== 'type') {
                context.report({
                  node: specifier,
                  messageId: 'namedExport',
                });
              }
            }
          }
        }

        // Check for export declarations (export const foo = 1;)
        else if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            // Report on each variable declarator individually
            for (const declarator of node.declaration.declarations) {
              const varName =
                declarator.id.type === 'Identifier'
                  ? declarator.id.name
                  : undefined;
              const isAllowed = (varName && allowNames.includes(varName)) || shouldAllow();
              if (!isAllowed) {
                context.report({
                  node: declarator,
                  messageId: 'namedExport',
                });
              }
            }
          } else if (
            node.declaration.type === 'FunctionDeclaration' ||
            node.declaration.type === 'ClassDeclaration'
          ) {
            const name = node.declaration.id?.name;
            if (name && !allowNames.includes(name) && !shouldAllow()) {
              context.report({
                node: node.declaration,
                messageId: 'namedExport',
              });
            }
          }
        }
      },
    };
  },
});
