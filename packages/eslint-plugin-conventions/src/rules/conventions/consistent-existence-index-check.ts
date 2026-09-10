/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: consistent-existence-index-check
 * Enforce consistent style for checking object property existence
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'consistentExistenceCheck';

export interface Options {
  /**
   * Preferred method for checking property existence. Default: `Object.hasOwn`.
   *
   * The default used to be `in`, which pointed every codebase at the one form of
   * the three that answers `true` for an INHERITED key. That is the direction a
   * prototype-pollution guard is written to avoid, and it is the opposite of where
   * the language went: `Object.hasOwn` exists because `in` and the `hasOwnProperty`
   * dances were both wrong answers, and eslint core's `prefer-object-has-own`
   * points the same way.
   *
   * `in` remains available and is the right answer when a chain lookup is what the
   * code means — a prototype-based lookup table, a `Symbol.hasInstance` check.
   * It is a choice to make deliberately rather than one to arrive at by default.
   */
  preferred?: 'in' | 'hasOwnProperty' | 'Object.hasOwn';
}

type RuleOptions = [Options?];

export const consistentExistenceIndexCheck = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'consistent-existence-index-check',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/consistent-existence-index-check.md',
      description:
        'Enforce consistent style for checking object property existence',
    },
    fixable: 'code',
    messages: {
      consistentExistenceCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Inconsistent Property Check',
        description: 'Use consistent method for property existence checks',
        severity: 'MEDIUM',
        fix: 'Use "{{preferred}}" instead of "{{current}}" for property checks',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          preferred: {
            type: 'string',
            enum: ['in', 'hasOwnProperty', 'Object.hasOwn'],
            default: 'Object.hasOwn',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ preferred: 'Object.hasOwn' }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { preferred = 'Object.hasOwn' } = options || {};

    function reportInconsistentCheck(
      node: TSESTree.Node,
      currentMethod: string,
      object: TSESTree.Node,
      property: TSESTree.Node,
      surplusArguments = false,
    ) {
      let fix: TSESLint.ReportFixFunction | undefined;

      // TWO boundaries a fixer may not cross, because crossing either changes what
      // the code does. The preference is still reported on both — which form a
      // codebase writes is the user's style to pick — and only the fix stops.
      //
      // 1. THE PROTOTYPE CHAIN. `in` walks it and the own-property checks do not, so
      //    a rewrite answers a different question for an inherited key.
      const crossesPrototypeBoundary =
        (currentMethod === 'in') !== (preferred === 'in');

      // 2. THE DISPATCH. `obj.hasOwnProperty(k)` looks the method up ON `obj`:
      //    it throws on a null-prototype object and calls whatever a shadowing
      //    `hasOwnProperty` own-property points at. `Object.hasOwn(obj, k)` and
      //    `Object.prototype.hasOwnProperty.call(obj, k)` never touch `obj`'s own
      //    lookup, which is exactly why code that handles untrusted objects uses
      //    them. Rewriting `Object.hasOwn(Object.create(null), k)` into
      //    `Object.create(null).hasOwnProperty(k)` turns a working check into a
      //    TypeError. Those last two ARE interchangeable, and remain fixable.
      const crossesDispatchBoundary =
        currentMethod === 'hasOwnProperty' || preferred === 'hasOwnProperty';

      // Only provide fixes for standalone expressions, not when part of larger expressions
      const parent = node.parent;
      const isStandaloneExpression =
        !parent ||
        parent.type === 'ExpressionStatement' ||
        (parent.type === 'VariableDeclarator' && parent.init === node) ||
        (parent.type === 'AssignmentExpression' && parent.right === node) ||
        (parent.type === 'ReturnStatement' && parent.argument === node) ||
        (parent.type === 'ArrowFunctionExpression' && parent.body === node) ||
        (parent.type === 'IfStatement' && parent.test === node) ||
        (parent.type === 'WhileStatement' && parent.test === node) ||
        (parent.type === 'DoWhileStatement' && parent.test === node) ||
        (parent.type === 'ForStatement' && parent.test === node) ||
        (parent.type === 'ConditionalExpression' && parent.test === node);

      // Only one conversion survives both boundaries: between
      // `Object.prototype.hasOwnProperty.call(obj, k)` and `Object.hasOwn(obj, k)`,
      // which ask the same question through the same dispatch. Every other pairing
      // is reported without a fix, so `--fix` can never change a program's meaning.
      // A SURPLUS argument is evaluated even though the check ignores it:
      // `Object.prototype.hasOwnProperty.call(obj, key, sideEffect())` runs
      // `sideEffect()`, and a rewrite that drops the argument drops the effect
      // with it. Reported, since the preference is unchanged; not rewritten.
      if (
        !crossesPrototypeBoundary &&
        !crossesDispatchBoundary &&
        !surplusArguments &&
        preferred === 'Object.hasOwn' &&
        isStandaloneExpression
      ) {
        fix = function (fixer: TSESLint.RuleFixer) {
          const objectText = context.sourceCode.getText(object);
          const propertyText = context.sourceCode.getText(property);
          return fixer.replaceText(
            node,
            `Object.hasOwn(${objectText}, ${propertyText})`,
          );
        };
      }

      context.report({
        node,
        messageId: 'consistentExistenceCheck',
        data: {
          current: currentMethod,
          preferred,
        },
        fix,
      });
    }

    return {
      // Check for hasOwnProperty calls
      CallExpression(node: TSESTree.CallExpression) {
        // Direct hasOwnProperty calls: obj.hasOwnProperty(prop). Reindented
        // to match the sibling `if` blocks below — the original 6-space
        // indent here suggested this branch was at a different scope level
        // (CodeQL: `js/misleading-indentation-after-control-statement`).
        if (
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'hasOwnProperty' &&
          node.arguments.length === 1 &&
          preferred !== 'hasOwnProperty'
        ) {
          reportInconsistentCheck(
            node,
            'hasOwnProperty',
            node.callee.object,
            node.arguments[0],
          );
        }

        // Object.prototype.hasOwnProperty.call(obj, prop)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'MemberExpression' &&
          node.callee.object.object.type === 'MemberExpression' &&
          node.callee.object.object.object.type === 'Identifier' &&
          node.callee.object.object.object.name === 'Object' &&
          propertyName(node.callee.object.object) === 'prototype' &&
          propertyName(node.callee.object) === 'hasOwnProperty' &&
          propertyName(node.callee) === 'call' &&
          node.arguments.length >= 2 &&
          preferred !== 'hasOwnProperty'
        ) {
          reportInconsistentCheck(
            node,
            'Object.prototype.hasOwnProperty.call',
            node.arguments[0],
            node.arguments[1],
            node.arguments.length > 2,
          );
        }

        // Object.hasOwn(obj, prop)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Object' &&
          propertyName(node.callee) === 'hasOwn' &&
          node.arguments.length === 2 &&
          preferred !== 'Object.hasOwn'
        ) {
          reportInconsistentCheck(
            node,
            'Object.hasOwn',
            node.arguments[0],
            node.arguments[1],
          );
        }
      },

      // Check for 'in' operator usage
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator === 'in' && preferred !== 'in') {
          reportInconsistentCheck(node, 'in', node.right, node.left);
        }
      },
    };
  },
});
