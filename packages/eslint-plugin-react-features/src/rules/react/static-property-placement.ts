/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: static-property-placement
 * Enforce static property placement
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'staticPropertyPlacement';

export interface Options {
  propertyGroups?: Array<{
    name: string;
    properties: string[];
  }>;
  childClass?: 'first' | 'last';
}

const DEFAULT_GROUPS = [
  {
    name: 'propTypes',
    properties: [
      'propTypes',
      'defaultProps',
      'childContextTypes',
      'contextTypes',
      'contextType',
    ],
  },
  {
    name: 'lifecycle',
    properties: ['getDerivedStateFromProps', 'getDerivedStateFromError'],
  },
];

export const staticPropertyPlacement = createRule<[Options], MessageIds>({
  name: 'static-property-placement',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/static-property-placement.md',
      description: 'Enforce static property placement',
    },
    schema: [
      {
        type: 'object',
        properties: {
          propertyGroups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                properties: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          childClass: {
            type: 'string',
            enum: ['first', 'last'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      staticPropertyPlacement: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Static Property Placement',
        description: 'Static properties should be grouped together',
        severity: 'LOW',
        fix: 'Group static properties together by category',
        documentationLink:
          'https://react.dev/reference/react/Component#static-properties',
      }),
    },
  },
  defaultOptions: [{ propertyGroups: DEFAULT_GROUPS, childClass: 'first' }],
  create(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    const [options] = context.options;
    const propertyGroups = options?.propertyGroups ?? DEFAULT_GROUPS;

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) {
          checkStaticPropertyPlacement(node, propertyGroups);
        }
      },
    };

    // oxlint-disable-next-line consistent-function-scoping
    function isReactComponent(node: TSESTree.ClassDeclaration): boolean {
      if (!node.superClass) return false;

      if (node.superClass.type === 'Identifier') {
        return (
          node.superClass.name === 'Component' ||
          node.superClass.name === 'PureComponent'
        );
      }

      if (node.superClass.type === 'MemberExpression') {
        return (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          (propertyName(node.superClass) === 'Component' ||
            propertyName(node.superClass) === 'PureComponent')
        );
      }

      return false;
    }

    function checkStaticPropertyPlacement(
      node: TSESTree.ClassDeclaration,
      groups: NonNullable<Options['propertyGroups']>,
    ) {
      const members = node.body.body;
      const staticProperties: Array<{
        name: string;
        index: number;
        node: TSESTree.PropertyDefinition | TSESTree.MethodDefinition;
      }> = [];

      // Collect static properties
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (isStaticProperty(member)) {
          const name = getPropertyName(member);
          if (name) {
            staticProperties.push({ name, index: i, node: member });
          }
        }
      }

      if (staticProperties.length < 2) return;

      // "Grouped together" means CONTIGUOUS. A group is broken when one of its
      // members appears after something else came between it and the previous
      // member of the same group — `propTypes`, something else, `defaultProps`.
      //
      // The previous implementation asked `!areInSameGroup(current, previous)`,
      // which is a different and wrong question: two ADJACENT properties from
      // different groups are exactly what correct grouping looks like. It then
      // did nothing with the answer — the report had been deleted along with an
      // unreachable branch beside it, leaving an empty `if` and a rule that
      // could not fire. Both plugin exports shipped that way.
      // A member of NO known group never breaks anything: nothing here says it
      // does not belong with whatever surrounds it, and guessing is how a rule
      // starts reporting code it cannot read. Only resuming a group after a
      // member of a DIFFERENT known group is a break we can prove.
      const seen = new Set<string>();
      let previousGroup: string | null = null;

      for (const property of staticProperties) {
        const group = groupOf(property.name, groups);
        if (group === null) continue;

        if (seen.has(group) && previousGroup !== group) {
          context.report({
            node: property.node,
            messageId: 'staticPropertyPlacement',
          });
        }
        seen.add(group);
        previousGroup = group;
      }
    }

    /** The name of the group this property belongs to, or null if it is in none. */
    // oxlint-disable-next-line consistent-function-scoping
    function groupOf(
      name: string,
      groups: NonNullable<Options['propertyGroups']>,
    ): string | null {
      for (const group of groups) {
        if (group.properties.includes(name)) return group.name;
      }
      return null;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isStaticProperty(
      member: TSESTree.ClassBody['body'][0],
    ): member is TSESTree.PropertyDefinition | TSESTree.MethodDefinition {
      return (
        // Handle PropertyDefinition and MethodDefinition
        (member.type === 'PropertyDefinition' ||
          member.type === 'MethodDefinition') &&
        member.static
      );
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getPropertyName(
      member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
    ): string | null {
      // `static [propTypes] = {}` is a property whose name is whatever the
      // VARIABLE `propTypes` holds — not the property `propTypes`. Reading the
      // identifier through a computed key was the same mistake in miniature as
      // the one this rule's grouping check made.
      if (!member.computed && member.key.type === 'Identifier') {
        return member.key.name;
      }
      return null;
    }
  },
});
