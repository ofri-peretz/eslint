/**
 * ESLint Rule: prefer-event-target
 * Prefer EventTarget over EventEmitter (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferEventTarget';

export interface Options {
  /** Allow EventEmitter in specific files */
  allowEventEmitter?: boolean;
}

type RuleOptions = [Options?];

export const preferEventTarget = createRule<RuleOptions, MessageIds>({
  name: 'prefer-event-target',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer EventTarget over EventEmitter for cross-platform compatibility',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferEventTarget: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'EventEmitter Usage',
        description: 'Consider using EventTarget instead of EventEmitter',
        severity: 'MEDIUM',
        fix: 'Replace EventEmitter with EventTarget for better cross-platform support',
        documentationLink: 'https://nodejs.org/api/events.html#eventtarget-and-event-api',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowEventEmitter: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowEventEmitter: false }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowEventEmitter = false } = options || {};

    if (allowEventEmitter) {
      return {};
    }

    function checkClassExtends(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) {
      if (node.superClass) {
        if (
          node.superClass.type === 'Identifier' &&
          node.superClass.name === 'EventEmitter'
        ) {
          context.report({
            node: node.superClass,
            messageId: 'preferEventTarget',
            data: {
              className: (node as TSESTree.ClassDeclaration).id?.name || 'Anonymous',
              suggestion: 'Extend EventTarget instead of EventEmitter',
            },
          });
        } else if (
          node.superClass.type === 'MemberExpression' &&
          node.superClass.property.type === 'Identifier' &&
          node.superClass.property.name === 'EventEmitter'
        ) {
          context.report({
            node: node.superClass.property,
            messageId: 'preferEventTarget',
            data: {
              className: (node as TSESTree.ClassDeclaration).id?.name || 'Anonymous',
              suggestion: 'Extend EventTarget instead of EventEmitter',
            },
          });
        }
      }
    }

    return {
      // Check import declarations
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'node:events' || node.source.value === 'events') {
          // Check if importing EventEmitter
          const eventEmitterImport = node.specifiers.find((specifier: TSESTree.ImportClause) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' && specifier.imported.name === 'EventEmitter'
          );

          if (eventEmitterImport) {
            context.report({
              node: eventEmitterImport,
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion: 'Use EventTarget instead for cross-platform compatibility',
              },
              fix(fixer: TSESLint.RuleFixer) {
                // Replace EventEmitter with EventTarget in the import
                return fixer.replaceText((eventEmitterImport as TSESTree.ImportSpecifier).imported, 'EventTarget');
              },
            });
          }
        }
      },

      // Check require() calls for EventEmitter destructuring
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require'
        ) {
          const arg = node.arguments[0];
          if (
            arg?.type === 'Literal' &&
            (arg.value === 'events' || arg.value === 'node:events')
          ) {
            // Check if destructuring EventEmitter from require
            if (node.parent?.type === 'VariableDeclarator') {
              const varName = node.parent.id;
              if (varName.type === 'ObjectPattern') {
                const eventEmitterProp = varName.properties.find((prop: TSESTree.Property | TSESTree.RestElement) =>
                  prop.type === 'Property' &&
                  prop.key.type === 'Identifier' &&
                  prop.key.name === 'EventEmitter'
                );
                if (eventEmitterProp && eventEmitterProp.type === 'Property') {
                  context.report({
                    node: eventEmitterProp.key,
                    messageId: 'preferEventTarget',
                    data: {
                      usage: 'EventEmitter from require',
                      suggestion: 'Use EventTarget for cross-platform compatibility',
                    },
                    fix(fixer: TSESLint.RuleFixer) {
                      return fixer.replaceText((eventEmitterProp as TSESTree.Property).key, 'EventTarget');
                    },
                  });
                }
              }
            }
          }
        }
      },

      // Check direct EventEmitter usage (not in extends)
      MemberExpression(node: TSESTree.MemberExpression) {
        // Skip if this is part of a class extends clause
        if (node.parent?.type === 'ClassDeclaration' && node.parent.superClass === node) {
          return;
        }

        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'EventEmitter'
        ) {
          // Check if it's accessing EventEmitter from require('events') or similar
          if (node.object.type === 'CallExpression' &&
              node.object.callee.type === 'Identifier' &&
              node.object.callee.name === 'require' &&
              node.object.arguments.length === 1 &&
              node.object.arguments[0].type === 'Literal' &&
              (node.object.arguments[0].value === 'events' || node.object.arguments[0].value === 'node:events')) {
            context.report({
              node: node.property,
              messageId: 'preferEventTarget',
              data: {
                usage: 'require("events").EventEmitter',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            });
          }
          // Check if it's accessing from a specific variable name that we know contains events
          else if (node.object.type === 'Identifier' &&
                   (node.object.name === 'events' || node.object.name === 'nodeEvents')) {
            context.report({
              node: node.property,
              messageId: 'preferEventTarget',
              data: {
                usage: `${node.object.name}.EventEmitter`,
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            });
          }
        }
      },

      // Check class extends EventEmitter
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        checkClassExtends(node);
      },

      ClassExpression(node: TSESTree.ClassExpression) {
        checkClassExtends(node);
      },
    };
  },
});
