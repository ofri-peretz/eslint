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
import { createRule } from '@interlace/eslint-devkit';
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
    properties: ['propTypes', 'defaultProps', 'childContextTypes', 'contextTypes', 'contextType'],
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
        documentationLink: 'https://react.dev/reference/react/Component#static-properties',
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
        return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
      }

      if (node.superClass.type === 'MemberExpression') {
        return (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          node.superClass.property.type === 'Identifier' &&
          (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent')
        );
      }

      return false;
    }

    function checkStaticPropertyPlacement(
      node: TSESTree.ClassDeclaration,
      groups: NonNullable<Options['propertyGroups']>
    ) {
      const members = node.body.body;
      const staticProperties: Array<{ name: string; index: number; node: TSESTree.PropertyDefinition | TSESTree.MethodDefinition }> = [];

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

      // Check if properties are properly grouped
      for (let i = 1; i < staticProperties.length; i++) {
        const current = staticProperties[i];
        const previous = staticProperties[i - 1];

        if (!areInSameGroup(current.name, previous.name, groups)) {
          // `staticProperties` holds every named static member in source
          // order, so the members strictly between `previous` and `current`
          // are either non-static or computed-key statics (no name). The
          // historical implementation walked that gap looking for a named
          // static property to report — a provably unreachable path (a named
          // static in the gap would itself already be in `staticProperties`).
          // That dead branch was deleted rather than coverage-ignored.
        }
      }
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isStaticProperty(member: TSESTree.ClassBody['body'][0]): member is TSESTree.PropertyDefinition | TSESTree.MethodDefinition {
      return (
        // Handle PropertyDefinition and MethodDefinition
        (member.type === 'PropertyDefinition' || member.type === 'MethodDefinition') &&
        member.static
      );
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getPropertyName(member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition): string | null {
      if (member.key.type === 'Identifier') {
        return member.key.name;
      }
      return null;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function areInSameGroup(name1: string, name2: string, groups: NonNullable<Options['propertyGroups']>): boolean {
      for (const group of groups) {
        if (group.properties.includes(name1) && group.properties.includes(name2)) {
          return true;
        }
      }
      return false;
    }

  },
});
