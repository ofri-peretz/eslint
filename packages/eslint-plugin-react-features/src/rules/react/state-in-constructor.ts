/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: state-in-constructor
 * Enforce state initialization in constructor
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'stateInConstructor' | 'stateInClassProperty';

/** eslint-plugin-react's `"always"` (the default) or `"never"`. */
export type Options = 'always' | 'never';

export const stateInConstructor = createRule<[Options], MessageIds>({
  name: 'state-in-constructor',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/state-in-constructor',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/state-in-constructor.md',
      description: 'Enforce state initialization in constructor',
    },
    schema: [{ type: 'string', enum: ['always', 'never'] }],
    messages: {
      stateInConstructor: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State Not in Constructor',
        description: 'State should be initialized in constructor',
        severity: 'MEDIUM',
        fix: 'Move state initialization to constructor method',
        documentationLink:
          'https://react.dev/reference/react/Component#constructor',
      }),
      stateInClassProperty: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State In Constructor',
        description: 'State should be initialized with a class property',
        severity: 'MEDIUM',
        fix: 'Move the `this.state = …` assignment to a `state = …` class field',
        documentationLink:
          'https://react.dev/reference/react/Component#constructor',
      }),
    },
  },
  defaultOptions: ['always'],
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    let option: Options;

    /** `state = …`: an instance field that initializes state. */
    function isStateField(
      member: TSESTree.ClassElement,
    ): member is TSESTree.PropertyDefinition {
      return (
        member.type === 'PropertyDefinition' &&
        !member.static &&
        // `declare state: S` / `state!: S` declare a type and set nothing.
        member.value !== null &&
        objectKeyName(member) === 'state'
      );
    }

    /** Does the constructor assign `this.state`, at its top level? */
    function constructorAssignsState(
      members: TSESTree.ClassElement[],
    ): boolean {
      return members.some(
        (member) =>
          member.type === 'MethodDefinition' &&
          member.kind === 'constructor' &&
          member.value.body?.body.some(
            (statement) =>
              statement.type === 'ExpressionStatement' &&
              statement.expression.type === 'AssignmentExpression' &&
              statement.expression.left.type === 'MemberExpression' &&
              statement.expression.left.object.type === 'ThisExpression' &&
              propertyName(statement.expression.left) === 'state',
          ),
      );
    }

    function check(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void {
      if (!extendsReactComponent(node, context.sourceCode.getScope(node)))
        return;
      const members = node.body.body;
      if (option === 'never') return;
      const field = members.find(isStateField);
      if (field && !constructorAssignsState(members)) {
        context.report({
          node: field.key,
          messageId: 'stateInConstructor',
        });
      }
    }

    return {
      before() {
        option = context.options[0] ?? 'always';
      },
      ClassDeclaration: check,
      ClassExpression: check,
      // `"never"`: `this.state = …` inside a React class's constructor.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          option !== 'never' ||
          node.left.type !== 'MemberExpression' ||
          node.left.object.type !== 'ThisExpression' ||
          propertyName(node.left) !== 'state'
        )
          return;
        const cls = enclosingClassOfConstructor(node);
        if (
          cls &&
          extendsReactComponent(cls, context.sourceCode.getScope(cls))
        ) {
          context.report({ node, messageId: 'stateInClassProperty' });
        }
      },
    };
  },
});

/**
 * The class whose constructor `node` sits in, looking through arrow functions
 * (they share `this`) and stopping at any other function. `null` when `node`
 * is not in a constructor.
 */
function enclosingClassOfConstructor(
  node: TSESTree.Node,
): TSESTree.ClassDeclaration | TSESTree.ClassExpression | null {
  for (let n: TSESTree.Node | undefined = node.parent; n; n = n.parent) {
    if (n.type === 'ArrowFunctionExpression') continue;
    if (n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration') {
      const method = n.parent;
      // A class body's parent is always its class.
      return method.type === 'MethodDefinition' && method.kind === 'constructor'
        ? (method.parent.parent as
            TSESTree.ClassDeclaration | TSESTree.ClassExpression)
        : null;
    }
  }
  return null;
}
