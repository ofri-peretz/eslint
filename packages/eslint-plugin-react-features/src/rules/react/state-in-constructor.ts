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

type MessageIds = 'stateInConstructor';

export const stateInConstructor = createRule<[], MessageIds>({
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
    schema: [],
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
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
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

    /** Does the constructor assign `this.state`? */
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
      const field = members.find(isStateField);
      if (field && !constructorAssignsState(members)) {
        context.report({
          node: field.key,
          messageId: 'stateInConstructor',
        });
      }
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
});
