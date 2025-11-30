/**
 * ESLint Rule: no-mutable-exports
 * Forbid the use of mutable exports with `var` or `let` (eslint-plugin-import inspired)
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'mutableExport' | 'varExport' | 'letExport';

export interface Options {
  /** Allow mutable exports in specific files */
  allowInFiles?: string[];
  /** Ignore specific export names */
  ignoreExports?: string[];
}

type RuleOptions = [Options?];

export const noMutableExports = createRule<RuleOptions, MessageIds>({
  name: 'no-mutable-exports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid the use of mutable exports with `var` or `let`',
    },
    hasSuggestions: false,
    messages: {
      mutableExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Mutable Export',
        description: 'Export uses mutable declaration that can be reassigned',
        severity: 'MEDIUM',
        fix: 'Use const for exports to ensure immutability',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
      varExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Var Export',
        description: 'Export declared with var can be reassigned',
        severity: 'MEDIUM',
        fix: 'Change var to const for better predictability',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
      letExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Let Export',
        description: 'Export declared with let can be reassigned',
        severity: 'MEDIUM',
        fix: 'Change let to const if value never changes',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns where mutable exports are allowed',
          },
          ignoreExports: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific export names to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowInFiles: [],
    ignoreExports: [],
  }],

  create(context) {
    const [options] = context.options;
    const {
      allowInFiles = [],
      ignoreExports = [],
    } = options || {};

    const filename = context.getFilename();
    if (!filename) {
      return {};
    }

    function shouldSkipFile(): boolean {
      return allowInFiles.some(pattern => filename.includes(pattern));
    }

    function shouldIgnoreExport(exportName: string): boolean {
      return ignoreExports.includes(exportName);
    }

    function reportMutableExport(node: TSESTree.VariableDeclaration, exportName: string, declarationKind: 'var' | 'let') {
      if (shouldSkipFile() || shouldIgnoreExport(exportName)) {
        return;
      }

      const messageId = declarationKind === 'var' ? 'varExport' : 'letExport';

      context.report({
        node,
        messageId,
      });
    }

    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.declaration || node.declaration.type !== 'VariableDeclaration') {
          return;
        }

        const { kind, declarations } = node.declaration;

        // Only check var and let declarations
        if (kind !== 'var' && kind !== 'let') {
          return;
        }

        declarations.forEach(decl => {
          if (decl.id.type === 'Identifier') {
            reportMutableExport(node.declaration as TSESTree.VariableDeclaration, decl.id.name, kind);
          }
        });
      },

      // Also check for re-exports that might be mutable
      // This is more complex as it requires following the import chain
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        // Check if this variable declaration is exported
        const parent = (node as { parent?: TSESTree.Node }).parent;
        if (parent && parent.type === 'ExportNamedDeclaration') {
          // This is already handled above
          return;
        }

        // Check if this variable is exported elsewhere in the file
        // This is a simplified check - a full implementation would need to track all exports
        const sourceCode = context.sourceCode;
        const fileText = sourceCode.getText();

        if (node.kind === 'var' || node.kind === 'let') {
          node.declarations.forEach(decl => {
            if (decl.id.type === 'Identifier') {
              const varName = decl.id.name;

              // Check if this variable is exported later in the file
              // This is a heuristic - real implementation would need AST analysis
              const exportPattern = new RegExp(`export\\s*{\\s*${varName}\\s*}`, 'g');
              if (exportPattern.test(fileText)) {
                reportMutableExport(node, varName, node.kind);
              }
            }
          });
        }
      },
    };
  },
});
