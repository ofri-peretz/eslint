/**
 * ESLint Rule: no-commonjs
 * Prevents CommonJS require/module.exports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'commonjsRequire' | 'commonjsExport' | 'commonjsModule' | 'preferES6';

export interface Options {
  /** Allow CommonJS in certain contexts */
  allowRequire?: boolean;
  /** Allow module.exports */
  allowModuleExports?: boolean;
  /** Allow exports.* */
  allowExports?: boolean;
  /** Allow CommonJS in specific files */
  allowInFiles?: string[];
  /** Suggest ES6 alternatives */
  suggestES6?: boolean;
}

type RuleOptions = [Options?];

export const noCommonjs = createRule<RuleOptions, MessageIds>({
  name: 'no-commonjs',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents CommonJS require/module.exports',
    },
    hasSuggestions: true,
    messages: {
      commonjsRequire: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Require',
        description: 'CommonJS require() call detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 import syntax instead of require()',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
      commonjsExport: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Export',
        description: 'CommonJS module.exports detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 export default or export {} syntax',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
      commonjsModule: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'CommonJS Module',
        description: 'CommonJS exports.* pattern detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 named export syntax',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
      preferES6: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Prefer ES6 Modules',
        description: 'Legacy CommonJS module system detected',
        severity: 'LOW',
        fix: 'Migrate to ES6 import/export for better static analysis and tree-shaking',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-commonjs.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowRequire: {
            type: 'boolean',
            default: false,
            description: 'Allow require() calls.',
          },
          allowModuleExports: {
            type: 'boolean',
            default: false,
            description: 'Allow module.exports.',
          },
          allowExports: {
            type: 'boolean',
            default: false,
            description: 'Allow exports.* patterns.',
          },
          allowInFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow CommonJS in specific files.',
          },
          suggestES6: {
            type: 'boolean',
            default: true,
            description: 'Suggest ES6 alternatives.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowRequire: false,
    allowModuleExports: false,
    allowExports: false,
    allowInFiles: [],
    suggestES6: true
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowRequire = false,
      allowModuleExports = false,
      allowExports = false,
      allowInFiles = [],
      suggestES6 = true
    } = options || {};

    const filename = context.getFilename();

    function shouldAllow(): boolean {
      if (!filename) {
        return false;
      }

      // Check if file is in allowed list
      return allowInFiles.some((pattern: string) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(filename);
        }
        return filename.includes(pattern);
      });
    }

    function generateES6Suggestion(node: TSESTree.Node): string {
      // Try to generate ES6 equivalent based on the CommonJS pattern

      if (node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require') {
        // require('module')
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof arg.value === 'string') {
          return `// Convert to: import * as moduleName from '${arg.value}';`;
        }
      }

      if (node.type === 'AssignmentExpression') {
        const left = node.left;
        const right = node.right;

        // module.exports = ...
        if (left.type === 'MemberExpression' &&
            left.object.type === 'Identifier' && left.object.name === 'module' &&
            left.property.type === 'Identifier' && left.property.name === 'exports') {
          if (right.type === 'Identifier') {
            return `// Convert to: export default ${right.name};`;
          } else {
            return `// Convert to: export default ${context.sourceCode.getText(right)};`;
          }
        }

        // exports.something = ...
        if (left.type === 'MemberExpression' &&
            left.object.type === 'Identifier' && left.object.name === 'exports' &&
            left.property.type === 'Identifier') {
          const propertyName = left.property.name;
          if (right.type === 'Identifier') {
            return `// Convert to: export const ${propertyName} = ${right.name};`;
          } else {
            return `// Convert to: export const ${propertyName} = ${context.sourceCode.getText(right)};`;
          }
        }
      }

      return '// Convert to ES6 import/export syntax';
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (shouldAllow() || allowRequire) {
          return;
        }

        // Check for require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require'
        ) {
          context.report({
            node: node.callee,
            messageId: 'commonjsRequire',
            data: {
              functionName: 'require',
              currentFile: filename,
              suggestion: 'Use import statement at the top of the file',
            },
            suggest: suggestES6 ? [
              {
                messageId: 'commonjsRequire',
                fix(fixer: TSESLint.RuleFixer) {
                  const suggestion = generateES6Suggestion(node);
                  return fixer.insertTextBefore(node, suggestion + '\n');
                },
              },
            ] : undefined,
          });
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (shouldAllow()) {
          return;
        }

        const left = node.left;

        // Check for module.exports = ...
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'module' &&
          left.property.type === 'Identifier' &&
          left.property.name === 'exports' &&
          !allowModuleExports
        ) {
          context.report({
            node: left,
            messageId: 'commonjsExport',
            data: {
              pattern: 'module.exports',
              currentFile: filename,
              suggestion: 'Use export default or export {} syntax',
            },
            suggest: suggestES6 ? [
              {
                messageId: 'commonjsExport',
                fix(fixer: TSESLint.RuleFixer) {
                  const suggestion = generateES6Suggestion(node);
                  return fixer.insertTextBefore(node, suggestion + '\n');
                },
              },
            ] : undefined,
          });
        }

        // Check for module.exports.property = ... (nested)
        else if (
          left.type === 'MemberExpression' &&
          left.object.type === 'MemberExpression' &&
          left.object.object.type === 'Identifier' &&
          left.object.object.name === 'module' &&
          left.object.property.type === 'Identifier' &&
          left.object.property.name === 'exports' &&
          !allowModuleExports
        ) {
          context.report({
            node: left,
            messageId: 'commonjsModule',
            data: {
              pattern: 'module.exports.*',
              currentFile: filename,
              suggestion: 'Use named export syntax',
            },
            suggest: suggestES6 ? [
              {
                messageId: 'commonjsModule',
                fix(fixer: TSESLint.RuleFixer) {
                  return fixer.insertTextBefore(node, '// Convert to: export const propertyName = value;\n');
                },
              },
            ] : undefined,
          });
        }

        // Check for exports.* = ...
        else if (
          left.type === 'MemberExpression' &&
          left.object.type === 'Identifier' &&
          left.object.name === 'exports' &&
          !allowExports
        ) {
          context.report({
            node: left,
            messageId: 'commonjsModule',
            data: {
              pattern: 'exports.*',
              currentFile: filename,
              suggestion: 'Use named export syntax',
            },
            suggest: suggestES6 ? [
              {
                messageId: 'commonjsModule',
                fix(fixer: TSESLint.RuleFixer) {
                  const suggestion = generateES6Suggestion(node);
                  return fixer.insertTextBefore(node, suggestion + '\n');
                },
              },
            ] : undefined,
          });
        }
      },

      // Check for TypeScript import = require() syntax
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (shouldAllow() || allowRequire) {
          return;
        }

        // Check if it's import x = require('module')
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          context.report({
            node,
            messageId: 'commonjsRequire',
            data: {
              functionName: 'require',
              currentFile: filename,
              suggestion: 'Use ES6 import statement',
            },
            suggest: suggestES6 ? [
              {
                messageId: 'commonjsRequire',
                fix(fixer: TSESLint.RuleFixer) {
                  const modulePath = node.moduleReference.type === 'TSExternalModuleReference' &&
                    node.moduleReference.expression.type === 'Literal'
                    ? node.moduleReference.expression.value
                    : 'unknown';
                  return fixer.replaceText(node, `import ${node.id.name} from '${modulePath}';`);
                },
              },
            ] : undefined,
          });
        }
      },

      // Also check for __dirname, __filename which are CommonJS-specific
      Identifier(node: TSESTree.Identifier) {
        if (shouldAllow()) {
          return;
        }

        if (node.name === '__dirname' || node.name === '__filename') {
          // These are CommonJS globals that don't work in ES modules
          context.report({
            node,
            messageId: 'preferES6',
            data: {
              pattern: node.name,
              currentFile: filename,
              suggestion: 'Use import.meta.url or path resolution functions',
            },
          });
        }
      },
    };
  },
});
