/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-event-target
 * Prefer EventTarget over EventEmitter (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  isGlobalReference,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferEventTarget';

export interface Options {
  /** Allow EventEmitter in specific files */
  allowEventEmitter?: boolean;
}

type RuleOptions = [Options?];

export const preferEventTarget = createRule<RuleOptions, MessageIds>({
  name: 'prefer-event-target',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/prefer-event-target',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modernization/docs/rules/prefer-event-target.md',
      description:
        'Prefer EventTarget over EventEmitter for cross-platform compatibility',
    },
    /**
     * NOT fixable, and it must not claim to be.
     *
     * The removed fixers rewrote the BINDING NAME and nothing else:
     * `import { EventEmitter }` became `import { EventTarget }`, and the
     * require form the same. Two things were wrong with that.
     *
     * `events` does not export `EventTarget` — it is a global in Node 15+, so
     * the rewritten import resolves to `undefined`. And the fixer never
     * touched the USE, so `class Bus extends EventEmitter` was left behind
     * with nothing bound to that name. Running `--fix` over working code
     * produced a file that cannot run:
     *
     *     import { EventTarget } from "events";      // undefined
     *     export class Bus extends EventEmitter {}   // unbound identifier
     *
     * EventEmitter to EventTarget is a semantic migration — `.on()`/`.emit()`
     * against `.addEventListener()`/`.dispatchEvent()`, different error
     * semantics, and a breaking change for any exported class. No mechanical
     * rewrite is correct, so the rule reports and leaves the decision alone.
     */
    messages: {
      preferEventTarget: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'EventEmitter Usage',
        description: 'Consider using EventTarget instead of EventEmitter',
        severity: 'MEDIUM',
        fix: 'Replace EventEmitter with EventTarget for better cross-platform support',
        documentationLink:
          'https://nodejs.org/api/events.html#eventtarget-and-event-api',
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Does this expression hold Node's EventEmitter, by where its binding comes
     * from? `events` exports the class as its default export AND as
     * `EventEmitter`, so the module root counts too: `import E from 'events'`,
     * `const E = require('node:events')`, `ev.EventEmitter` on a namespace.
     */
    function isNodeEmitter(node: TSESTree.Node): boolean {
      const binding = resolveModuleBinding(
        node,
        context.sourceCode.getScope(node),
      );
      if (binding?.module !== 'events') return false;
      return (
        binding.path.length === 0 ||
        (binding.path.length === 1 && binding.path[0] === 'EventEmitter')
      );
    }

    /**
     * The innermost identifier of `a.b.c` when nothing in the file declares it.
     * A root the file declares (an import from another module, a parameter, a
     * local class) is a known binding, and `isNodeEmitter` already answered
     * for it.
     */
    function undeclaredRoot(node: TSESTree.Node): boolean {
      let current = node;
      while (current.type === 'MemberExpression') current = current.object;
      return (
        current.type === 'Identifier' &&
        isGlobalReference(current, context.sourceCode)
      );
    }

    function checkClassExtends(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ) {
      if (node.superClass) {
        if (
          node.superClass.type === 'Identifier' &&
          (isNodeEmitter(node.superClass) ||
            (node.superClass.name === 'EventEmitter' &&
              undeclaredRoot(node.superClass)))
        ) {
          context.report({
            node: node.superClass,
            messageId: 'preferEventTarget',
            data: {
              className:
                (node as TSESTree.ClassDeclaration).id?.name || 'Anonymous',
              suggestion: 'Extend EventTarget instead of EventEmitter',
            },
          });
        } else if (
          node.superClass.type === 'MemberExpression' &&
          (isNodeEmitter(node.superClass) ||
            (propertyName(node.superClass) === 'EventEmitter' &&
              undeclaredRoot(node.superClass)))
        ) {
          context.report({
            node: node.superClass.property,
            messageId: 'preferEventTarget',
            data: {
              className:
                (node as TSESTree.ClassDeclaration).id?.name || 'Anonymous',
              suggestion: 'Extend EventTarget instead of EventEmitter',
            },
          });
        }
      }
    }

    return {
      before() {
        const [options] = context.options;
        const { allowEventEmitter = false } = options || {};

        if (allowEventEmitter) {
          return false;
        }
        return true;
      },
      // Check import declarations
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (
          node.source.value === 'node:events' ||
          node.source.value === 'events'
        ) {
          // Check if importing EventEmitter
          const eventEmitterImport = node.specifiers.find(
            (specifier: TSESTree.ImportClause) =>
              specifier.type === 'ImportSpecifier' &&
              specifier.imported.type === 'Identifier' &&
              specifier.imported.name === 'EventEmitter',
          );

          if (eventEmitterImport) {
            context.report({
              node: eventEmitterImport,
              messageId: 'preferEventTarget',
              data: {
                importedName: 'EventEmitter',
                suggestion:
                  'Use EventTarget instead for cross-platform compatibility',
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
                const eventEmitterProp = varName.properties.find(
                  (prop: TSESTree.Property | TSESTree.RestElement) =>
                    prop.type === 'Property' &&
                    // `{ 'EventEmitter': E }` binds the same export.
                    objectKeyName(prop) === 'EventEmitter',
                );
                if (eventEmitterProp && eventEmitterProp.type === 'Property') {
                  context.report({
                    node: eventEmitterProp.key,
                    messageId: 'preferEventTarget',
                    data: {
                      usage: 'EventEmitter from require',
                      suggestion:
                        'Use EventTarget for cross-platform compatibility',
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
        if (
          node.parent?.type === 'ClassDeclaration' &&
          node.parent.superClass === node
        ) {
          return;
        }

        if (propertyName(node) === 'EventEmitter') {
          // Check if it's accessing EventEmitter from require('events') or similar
          if (
            node.object.type === 'CallExpression' &&
            node.object.callee.type === 'Identifier' &&
            node.object.callee.name === 'require' &&
            node.object.arguments.length === 1 &&
            node.object.arguments[0].type === 'Literal' &&
            (node.object.arguments[0].value === 'events' ||
              node.object.arguments[0].value === 'node:events')
          ) {
            context.report({
              node: node.property,
              messageId: 'preferEventTarget',
              data: {
                usage: 'require("events").EventEmitter',
                suggestion: 'Use EventTarget for cross-platform compatibility',
              },
            });
          }
          // A namespace import or required module (`ev.EventEmitter`), by
          // binding; an undeclared `events` / `nodeEvents` keeps the old
          // name match. A parameter named `events` is an unknown value.
          else if (
            node.object.type === 'Identifier' &&
            (isNodeEmitter(node.object) ||
              ((node.object.name === 'events' ||
                node.object.name === 'nodeEvents') &&
                undeclaredRoot(node.object)))
          ) {
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

      // `new Emitter()` where `Emitter` is the module root - a default import
      // or `require('events')` itself - which no import specifier named.
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type !== 'Identifier') return;
        const binding = resolveModuleBinding(
          node.callee,
          context.sourceCode.getScope(node),
        );
        if (binding?.module === 'events' && binding.path.length === 0) {
          context.report({
            node: node.callee,
            messageId: 'preferEventTarget',
            data: {
              usage: node.callee.name,
              suggestion: 'Use EventTarget for cross-platform compatibility',
            },
          });
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
