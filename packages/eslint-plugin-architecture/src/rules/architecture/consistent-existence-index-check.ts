/**
 * ESLint Rule: consistent-existence-index-check
 * Enforce consistent style for checking object property existence
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'consistentExistenceCheck';

export interface Options {
  /** Preferred method for checking property existence */
  preferred?: 'in' | 'hasOwnProperty' | 'Object.hasOwn';
}

type RuleOptions = [Options?];

export const consistentExistenceIndexCheck = createRule<RuleOptions, MessageIds>({
  name: 'consistent-existence-index-check',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce consistent style for checking object property existence',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      consistentExistenceCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Inconsistent Property Check',
        description: 'Use consistent method for property existence checks',
        severity: 'MEDIUM',
        fix: 'Use "{{preferred}}" instead of "{{current}}" for property checks',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          preferred: {
            type: 'string',
            enum: ['in', 'hasOwnProperty', 'Object.hasOwn'],
            default: 'in',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ preferred: 'in' }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { preferred = 'in' } = options || {};

    function reportInconsistentCheck(node: TSESTree.Node, currentMethod: string, object: TSESTree.Node, property: TSESTree.Node) {
      let fix: TSESLint.ReportFixFunction | undefined;

      // Only provide fixes for standalone expressions, not when part of larger expressions
      const parent = node.parent;
      const isStandaloneExpression = !parent ||
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


      if (preferred === 'in' && isStandaloneExpression) {
        fix = function(fixer: TSESLint.RuleFixer) {
          const objectText = context.sourceCode.getText(object);
          const propertyText = context.sourceCode.getText(property);
          return fixer.replaceText(node, `${propertyText} in ${objectText}`);
        };
      } else if (preferred === 'hasOwnProperty' && isStandaloneExpression) {
        fix = function(fixer: TSESLint.RuleFixer) {
          const objectText = context.sourceCode.getText(object);
          const propertyText = context.sourceCode.getText(property);
          return fixer.replaceText(node, `${objectText}.hasOwnProperty(${propertyText})`);
        };
      } else if (preferred === 'Object.hasOwn' && isStandaloneExpression) {
        fix = function(fixer: TSESLint.RuleFixer) {
          const objectText = context.sourceCode.getText(object);
          const propertyText = context.sourceCode.getText(property);
          return fixer.replaceText(node, `Object.hasOwn(${objectText}, ${propertyText})`);
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
      // Direct hasOwnProperty calls: obj.hasOwnProperty(prop)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'hasOwnProperty' &&
        node.arguments.length === 1 &&
        preferred !== 'hasOwnProperty'
      ) {
        reportInconsistentCheck(node, 'hasOwnProperty', node.callee.object, node.arguments[0]);
      }

        // Object.prototype.hasOwnProperty.call(obj, prop)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'MemberExpression' &&
          node.callee.object.object.type === 'MemberExpression' &&
          node.callee.object.object.object.type === 'Identifier' &&
          node.callee.object.object.object.name === 'Object' &&
          node.callee.object.object.property.type === 'Identifier' &&
          node.callee.object.object.property.name === 'prototype' &&
          node.callee.object.property.type === 'Identifier' &&
          node.callee.object.property.name === 'hasOwnProperty' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'call' &&
          node.arguments.length >= 2 &&
          preferred !== 'hasOwnProperty'
        ) {
          reportInconsistentCheck(node, 'Object.prototype.hasOwnProperty.call', node.arguments[0], node.arguments[1]);
        }

        // Object.hasOwn(obj, prop)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Object' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'hasOwn' &&
          node.arguments.length === 2 &&
          preferred !== 'Object.hasOwn'
        ) {
          reportInconsistentCheck(node, 'Object.hasOwn', node.arguments[0], node.arguments[1]);
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
