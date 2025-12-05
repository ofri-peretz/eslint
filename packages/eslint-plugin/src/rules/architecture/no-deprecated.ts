/**
 * ESLint Rule: no-deprecated
 * Forbid imported names marked with @deprecated documentation tag (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'deprecatedImport' | 'deprecatedExport' | 'deprecatedUsage';

export interface Options {
  /** Allow importing deprecated items (for migration periods) */
  allow?: string[];
  /** Custom deprecation markers to look for */
  deprecationMarkers?: string[];
  /** Check for deprecation in JSDoc comments */
  checkJSDoc?: boolean;
  /** Check for deprecation in TypeScript deprecated decorator */
  checkDecorators?: boolean;
}

type RuleOptions = [Options?];

export const noDeprecated = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid imported names marked with @deprecated documentation tag',
    },
    hasSuggestions: true,
    messages: {
      deprecatedImport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated Import',
        description: 'Importing deprecated API that should be avoided',
        severity: 'MEDIUM',
        fix: 'Replace with recommended alternative or remove if no longer needed',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
      deprecatedExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated Export Usage',
        description: 'Using deprecated exported member',
        severity: 'MEDIUM',
        fix: 'Update to use the recommended replacement API',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
      deprecatedUsage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated API Usage',
        description: 'Using deprecated function or method',
        severity: 'MEDIUM',
        fix: 'Migrate to the recommended modern API',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of deprecated items that are allowed (for migration periods)',
          },
          deprecationMarkers: {
            type: 'array',
            items: { type: 'string' },
            default: ['@deprecated'],
            description: 'Custom deprecation markers to look for in comments',
          },
          checkJSDoc: {
            type: 'boolean',
            default: true,
            description: 'Check for @deprecated in JSDoc comments',
          },
          checkDecorators: {
            type: 'boolean',
            default: true,
            description: 'Check for @deprecated decorator in TypeScript',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allow: [],
    deprecationMarkers: ['@deprecated'],
    checkJSDoc: true,
    checkDecorators: true
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allow = [],
      deprecationMarkers = ['@deprecated'],
      checkJSDoc = true,
      checkDecorators = true,
    } = options || {};

    const filename = context.getFilename();
    if (!filename) {
      return {};
    }

    // Track deprecated items found in the current file
    const deprecatedItems = new Map<string, {
      location: TSESTree.Node;
      reason?: string;
      replacement?: string;
    }>();


    function isAllowed(name: string): boolean {
      return allow.includes(name);
    }

    function parseJSDocDeprecated(comment: string): { deprecated: boolean; reason?: string; replacement?: string } {
      const lines = comment.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Check for @deprecated tag
        for (const marker of deprecationMarkers) {
          if (trimmed.includes(marker)) {
            const afterMarker = trimmed.substring(trimmed.indexOf(marker) + marker.length).trim();

            // Try to extract reason and replacement
            let reason: string | undefined;
            let replacement: string | undefined;

            // Look for common patterns like "Use X instead" or "Replaced by Y"
            const insteadMatch = afterMarker.match(/(?:use|replaced by|see)\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/i);
            if (insteadMatch) {
              // Remove common trailing words
              replacement = insteadMatch[1].trim().replace(/\s+instead$|\s+or$|\s+as$|\s+with$/i, '');
            }

            // The rest is usually the reason
            const reasonText = afterMarker.replace(/use\s+[^.]*[.]?/i, '').replace(/replaced by\s+[^.]*[.]?/i, '').trim();
            if (reasonText) {
              reason = reasonText;
            }

            return { deprecated: true, reason, replacement };
          }
        }
      }

      return { deprecated: false };
    }

    function checkComments(node: TSESTree.Node, name: string) {
      if (!checkJSDoc) return;

      const sourceCode = context.sourceCode;
      const comments = sourceCode.getCommentsBefore(node);

      // Also check leading comments attached to the node
      const allComments = [...comments];
      if ('leadingComments' in node && Array.isArray(node.leadingComments)) {
        allComments.push(...node.leadingComments);
      }

      for (const comment of allComments) {
        if (comment.type === 'Block' && comment.value.includes('*')) {
          // JSDoc comment
          const deprecationInfo = parseJSDocDeprecated(comment.value);
          if (deprecationInfo.deprecated) {
            deprecatedItems.set(name, {
              location: node,
              reason: deprecationInfo.reason,
              replacement: deprecationInfo.replacement,
            });
            break;
          }
        }
      }
    }

    function checkDecoratorsForDeprecation(node: TSESTree.Node, name: string) {
      if (!checkDecorators) return;

      // Check for @deprecated decorator in TypeScript
      if ('decorators' in node && Array.isArray((node as { decorators?: unknown[] }).decorators)) {
        const decorators = (node as { decorators?: unknown[] }).decorators;
        if (decorators) {
          for (const decorator of decorators) {
            const dec = decorator as TSESTree.Decorator;
            if ((dec.expression.type === 'CallExpression' &&
                 dec.expression.callee.type === 'Identifier' &&
                 dec.expression.callee.name === 'deprecated') ||
                (dec.expression.type === 'Identifier' &&
                 dec.expression.name === 'deprecated')) {
              deprecatedItems.set(name, {
                location: node,
                reason: 'Marked with @deprecated decorator',
              });
              break;
            }
          }
        }
      }
    }

    function reportDeprecatedUsage(node: TSESTree.Node, name: string, usage: string) {
      if (isAllowed(name)) return;

      const deprecationInfo = deprecatedItems.get(name);
      if (!deprecationInfo) return;

      context.report({
        node,
        messageId: 'deprecatedUsage',
        data: {
          name,
          usage,
          reason: deprecationInfo.reason || 'This API is deprecated',
          replacement: deprecationInfo.replacement || 'Check documentation for replacement',
          suggestion: deprecationInfo.replacement
            ? `Replace with ${deprecationInfo.replacement}`
            : 'Find modern replacement in documentation',
        },
        suggest: deprecationInfo.replacement ? [
          {
            messageId: 'deprecatedUsage',
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node, deprecationInfo.replacement || 'Check documentation for replacement');
            },
            data: {
              replacement: deprecationInfo.replacement,
              suggestion: `Replace with ${deprecationInfo.replacement}`,
            },
          }
        ] : [],
      });
    }

    return {
      // Check for deprecated declarations in the current file
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        node.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
          if (decl.id.type === 'Identifier') {
            checkComments(node, decl.id.name);
            checkDecoratorsForDeprecation(node, decl.id.name);
          }
        });
      },

      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id) {
          checkComments(node, node.id.name);
          checkDecoratorsForDeprecation(node, node.id.name);
        }
      },

      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (node.id) {
          checkComments(node, node.id.name);
          checkDecoratorsForDeprecation(node, node.id.name);
        }
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.key.type === 'Identifier') {
          // For methods, check comments on both the method node and the key
          checkComments(node, node.key.name);
          checkComments(node.key, node.key.name);
          checkDecoratorsForDeprecation(node, node.key.name);
        }
      },

      // Check for deprecated exports in the current file
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
              if (decl.id.type === 'Identifier') {
                checkComments(node, decl.id.name);
                checkDecoratorsForDeprecation(node.declaration, decl.id.name);
              }
            });
          } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            checkComments(node, node.declaration.id.name);
            checkDecoratorsForDeprecation(node.declaration, node.declaration.id.name);
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            checkComments(node, node.declaration.id.name);
            checkDecoratorsForDeprecation(node.declaration, node.declaration.id.name);
          }
        }

        // Check exported specifiers
        if (node.specifiers) {
          node.specifiers.forEach((specifier: TSESTree.ExportSpecifier) => {
            if (specifier.exported.type === 'Identifier') {
              checkComments(node, specifier.exported.name);
            }
          });
        }
      },

      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        checkComments(node, 'default');
        checkDecoratorsForDeprecation(node, 'default');
      },

      // Check for usage of deprecated imported items
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // This would need cross-file analysis to check if imported items are deprecated
        // For now, we'll focus on deprecated items within the same file
      },

      // Check for usage of deprecated items
      MemberExpression(node: TSESTree.MemberExpression) {
        if (node.object.type === 'Identifier' &&
            deprecatedItems.has(node.object.name) &&
            node.property.type === 'Identifier') {
          reportDeprecatedUsage(node, node.object.name, `${node.object.name}.${node.property.name}`);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && deprecatedItems.has(node.callee.name)) {
          reportDeprecatedUsage(node, node.callee.name, `${node.callee.name}()`);
        }
      },

      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type === 'Identifier' && deprecatedItems.has(node.callee.name)) {
          reportDeprecatedUsage(node, node.callee.name, `new ${node.callee.name}()`);
        }
      },

      Identifier(node: TSESTree.Identifier) {
        // Check if this identifier references a deprecated item
        if (deprecatedItems.has(node.name)) {
          // Only report if it's not part of a declaration
          const parent = (node as { parent?: { type: string } }).parent;
          if (parent && !['VariableDeclarator', 'FunctionDeclaration', 'ClassDeclaration', 'ImportSpecifier', 'ExportSpecifier', 'MethodDefinition'].includes(parent.type)) {
            // Don't report if this identifier is the callee of a CallExpression (handled separately)
            if (parent.type === 'CallExpression' && (parent as TSESTree.CallExpression).callee === node) {
              return;
            }
            // Don't report if this identifier is the callee of a NewExpression (handled separately)
            if (parent.type === 'NewExpression' && (parent as TSESTree.NewExpression).callee === node) {
              return;
            }
            // Don't report if this identifier is the object of a MemberExpression (handled separately)
            if (parent.type === 'MemberExpression' && (parent as TSESTree.MemberExpression).object === node) {
              return;
            }
            // Don't report if this identifier is the property of a MemberExpression (handled separately)
            if (parent.type === 'MemberExpression' && (parent as TSESTree.MemberExpression).property === node) {
              return;
            }
            reportDeprecatedUsage(node, node.name, node.name);
          }
        }
      },
    };
  },
});
