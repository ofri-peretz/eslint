/**
 * ESLint Rule: no-default-export
 * Prevents default exports (eslint-plugin-import inspired)
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'defaultExport' | 'preferNamedExport' | 'defaultExportRefactor';

export interface Options {
  /** Allow default exports in specific files */
  allowInFiles?: string[];
  /** Allow default exports for specific patterns */
  allowPatterns?: string[];
  /** Suggest named export alternative */
  suggestNamed?: boolean;
}

type RuleOptions = [Options?];

export const noDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'no-default-export',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents default exports',
    },
    fixable: 'code',
    messages: {
      defaultExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Default Export Detected',
        description: 'Default export violates import style guidelines',
        severity: 'MEDIUM',
        fix: 'Use named export instead of default export',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
      }),
      preferNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Prefer Named Exports',
        description: 'Named exports provide better tree-shaking and refactoring',
        severity: 'LOW',
        fix: 'Convert default export to named export',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
      }),
      defaultExportRefactor: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Export Style Violation',
        description: 'Default export pattern not allowed in this codebase',
        severity: 'MEDIUM',
        fix: 'Refactor to use named exports consistently',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
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
            description: 'Allow default exports in specific files.',
          },
          allowPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow default exports for specific patterns.',
          },
          suggestNamed: {
            type: 'boolean',
            default: true,
            description: 'Suggest named export alternative.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowInFiles: [],
    allowPatterns: [],
    suggestNamed: true
  }],

  create(context) {
    const [options] = context.options;
    const {
      allowInFiles = [],
      allowPatterns = [],
      suggestNamed = true
    } = options || {};

    const filename = context.getFilename();

    function shouldAllow(): boolean {
      if (!filename) {
        return false;
      }

      // Check if file is in allowed list
      const allowedByFile = allowInFiles.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(filename);
        }
        return filename.includes(pattern);
      });

      if (allowedByFile) {
        return true;
      }

      // Check if filename matches allowed patterns
      return allowPatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(filename);
        }
        return filename.includes(pattern);
      });
    }

    function generateNamedExportSuggestion(node: TSESTree.ExportDefaultDeclaration): string {
      if (!suggestNamed) {
        return '';
      }

      const declaration = node.declaration;

      // Try to determine a good name for the named export
      let suggestedName = 'exportedValue';

      if (declaration.type === 'Identifier') {
        // export default foo; -> export { foo };
        suggestedName = declaration.name;
      } else if (declaration.type === 'FunctionDeclaration' && declaration.id) {
        // export default function foo() {} -> export function foo() {}
        // But we still need to report this as it should be export function foo()
        suggestedName = declaration.id.name;
      } else if (declaration.type === 'ClassDeclaration' && declaration.id) {
        // export default class Foo {} -> export class Foo {}
        suggestedName = declaration.id.name;
      } else if (declaration.type === 'FunctionDeclaration' && !declaration.id) {
        // export default function() {} -> export function defaultFunction() {}
        suggestedName = 'defaultFunction';
      } else if (declaration.type === 'ClassDeclaration' && !declaration.id) {
        // export default class {} -> export class DefaultClass {}
        suggestedName = 'DefaultClass';
      }

      return `// Convert to: export { ${suggestedName} };`;
    }

    return {
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (shouldAllow()) {
          return;
        }

        const suggestion = generateNamedExportSuggestion(node);

        context.report({
          node,
          messageId: 'defaultExport',
          data: {
            currentFile: filename,
            suggestion: 'Use named export for better tree-shaking',
            example: suggestion,
          },
          fix(fixer) {
            const declaration = node.declaration;
            const sourceCode = context.sourceCode;

            if (declaration.type === 'Identifier') {
              // export default foo; -> export { foo };
              return fixer.replaceText(node, `export { ${declaration.name} };`);
            } else if (declaration.type === 'Literal') {
              // export default "value"; -> const defaultExport = "value"; export { defaultExport };
              const exprText = sourceCode.getText(declaration);
              const namedExport = `const defaultExport = ${exprText};\nexport { defaultExport };`;
              return fixer.replaceText(node, namedExport);
            } else {
              // For all other cases, replace 'export default' with 'export'
              const nodeText = sourceCode.getText(node);
              const namedExport = nodeText.replace(/^export default/, 'export');
              return fixer.replaceText(node, namedExport);
            }
          },
        });
      },

      // Also check for export { default } patterns
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (shouldAllow()) {
          return;
        }

        // Check if this is export { default } from "module"
        // This is a re-export pattern that effectively creates a default export
        if (node.specifiers) {
          const hasDefaultSpecifier = node.specifiers.some(
            spec => spec.exported.type === 'Identifier' && spec.exported.name === 'default' ||
                    (spec.local && spec.local.type === 'Identifier' && spec.local.name === 'default')
          );

          if (hasDefaultSpecifier) {
            context.report({
              node,
              messageId: 'preferNamedExport',
              data: {
                pattern: 'export { default }',
                currentFile: filename,
                suggestion: 'Use named re-export instead',
              },
            });
          }
        }
      },

      // Check for export = value (TypeScript namespace export)
      TSExportAssignment(node: TSESTree.TSExportAssignment) {
        if (shouldAllow()) {
          return;
        }

        context.report({
          node,
          messageId: 'defaultExportRefactor',
          data: {
            pattern: 'export = value',
            currentFile: filename,
            suggestion: 'Use ES6 named exports',
          },
        });
      },

      // Handle TypeScript interface and type exports
      TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
        // Check if this is a default export (export default interface ...)
        // This would be caught by ExportDefaultDeclaration, but we need to handle
        // the case where it's directly exported as default
        if (node.parent && node.parent.type === 'ExportDefaultDeclaration') {
          // This will be handled by ExportDefaultDeclaration visitor
          return;
        }
      },

      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration) {
        // Similar to interfaces
        if (node.parent && node.parent.type === 'ExportDefaultDeclaration') {
          return;
        }
      },
    };
  },
});
