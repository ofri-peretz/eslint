/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-duplicate-props
 * Prevent duplicate props in JSX elements
 * 
 * Bug Prevention: Duplicate props cause silent overwrites
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-duplicate-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'duplicateProp';

type Options = {
  ignoreCase?: boolean;
};

type RuleOptions = [Options?];

export const jsxNoDuplicateProps = createRule<RuleOptions, MessageIds>({
  name: 'jsx-no-duplicate-props',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent duplicate props in JSX',
    },
    messages: {
      duplicateProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Duplicate Prop',
        description: 'Prop "{{name}}" is duplicated - the last value will be used',
        severity: 'HIGH',
        fix: 'Remove the duplicate prop',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-duplicate-props.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreCase: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {} as Options]) {
    const { ignoreCase = false } = options ?? {} as Options;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const seenProps = new Map<string, TSESTree.JSXAttribute>();

        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute') continue;
          if (attr.name.type !== 'JSXIdentifier') continue;

          let propName = attr.name.name;
          if (ignoreCase) {
            propName = propName.toLowerCase();
          }

          const previousAttr = seenProps.get(propName);
          if (previousAttr) {
            context.report({
              node: attr,
              messageId: 'duplicateProp',
              data: {
                name: attr.name.name,
              },
            });
          } else {
            seenProps.set(propName, attr);
          }
        }
      },
    };
  },
});
