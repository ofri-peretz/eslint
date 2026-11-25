/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: forbid-foreign-prop-types
 * Reading another component's `propTypes` is unsafe: production builds strip them.
 * Follows eslint-plugin-react's `forbid-foreign-prop-types` (MIT).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'forbiddenPropType';
type Options = [{ allowInPropTypes?: boolean }?];

/** The `propTypes` assignment or class field `node` sits inside, if any. */
function isInsidePropTypesDeclaration(node: TSESTree.Node): boolean {
  let assignment: TSESTree.AssignmentExpression | undefined;
  let field: TSESTree.PropertyDefinition | undefined;
  for (
    let parent = node.parent;
    parent && parent.type !== 'Program';
    parent = parent.parent
  ) {
    if (!assignment && parent.type === 'AssignmentExpression')
      assignment = parent;
    // `ClassProperty` is the legacy spelling some parsers still emit
    if (
      !field &&
      (parent.type === 'PropertyDefinition' ||
        (parent.type as string) === 'ClassProperty')
    ) {
      field = parent as TSESTree.PropertyDefinition;
    }
  }

  const left = assignment?.left;
  if (left?.type === 'MemberExpression' && propertyName(left) === 'propTypes') {
    return true;
  }
  return field !== undefined && objectKeyName(field) === 'propTypes';
}

export const forbidForeignPropTypes = createRule<Options, MessageIds>({
  name: 'forbid-foreign-prop-types',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/forbid-foreign-prop-types.md',
      description: "Disallow using another component's propTypes",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInPropTypes: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbiddenPropType: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: "Another Component's propTypes",
        description:
          'Using propTypes from another component is not safe because they may be removed in production builds',
        severity: 'MEDIUM',
        fix: 'Export the shape from a shared module, or declare the prop types again',
        documentationLink: 'https://github.com/facebook/prop-types#readme',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let allowInPropTypes = false;

    return {
      before() {
        allowInPropTypes = options()[0]?.allowInPropTypes ?? false;
      },

      // `Foo.propTypes`, `Foo['propTypes']`, as a value
      MemberExpression(node: TSESTree.MemberExpression) {
        if (propertyName(node) !== 'propTypes') return;

        // `Foo.propTypes = {…}` writes the component's own
        const parent = node.parent;
        if (parent.type === 'AssignmentExpression' && parent.left === node)
          return;
        if (allowInPropTypes && isInsidePropTypesDeclaration(node)) return;

        context.report({ node: node.property, messageId: 'forbiddenPropType' });
      },

      // `const { propTypes } = Foo`
      ObjectPattern(node: TSESTree.ObjectPattern) {
        const found = node.properties.find(
          (property) =>
            property.type === 'Property' &&
            objectKeyName(property) === 'propTypes',
        );
        if (found)
          context.report({ node: found, messageId: 'forbiddenPropType' });
      },
    };
  },
});
