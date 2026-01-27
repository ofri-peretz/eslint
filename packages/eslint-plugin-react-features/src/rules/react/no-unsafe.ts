/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe
 * Prevent usage of unsafe lifecycle methods
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-unsafe.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noUnsafe';

type Options = {
  checkAliases?: boolean;
};

type RuleOptions = [Options?];

const UNSAFE_METHODS: Record<string, { replacement: string }> = {
  'UNSAFE_componentWillMount': { replacement: 'componentDidMount or useEffect' },
  'UNSAFE_componentWillReceiveProps': { replacement: 'static getDerivedStateFromProps or useEffect' },
  'UNSAFE_componentWillUpdate': { replacement: 'getSnapshotBeforeUpdate or useEffect' },
};

const LEGACY_METHODS: Record<string, { replacement: string }> = {
  'componentWillMount': { replacement: 'componentDidMount or useEffect' },
  'componentWillReceiveProps': { replacement: 'static getDerivedStateFromProps or useEffect' },
  'componentWillUpdate': { replacement: 'getSnapshotBeforeUpdate or useEffect' },
};

export const noUnsafe = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent usage of unsafe lifecycle methods',
    },
    messages: {
      noUnsafe: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe Lifecycle Method',
        description: '"{{method}}" is unsafe and may cause bugs in concurrent mode',
        severity: 'HIGH',
        fix: 'Use {{replacement}} instead',
        documentationLink: 'https://react.dev/blog/2018/03/27/update-on-async-rendering',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkAliases: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {} as Options]) {
    const { checkAliases = false } = options ?? {} as Options;
    let inClassComponent = false;

    function checkMethod(node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition): void {
      if (!inClassComponent) return;
      if (node.key.type !== 'Identifier') return;

      const methodName = node.key.name;
      
      // Check UNSAFE_ prefixed methods
      const unsafeInfo = UNSAFE_METHODS[methodName];
      if (unsafeInfo) {
        context.report({
          node,
          messageId: 'noUnsafe',
          data: {
            method: methodName,
            replacement: unsafeInfo.replacement,
          },
        });
        return;
      }

      // Check legacy methods if checkAliases is enabled
      if (checkAliases) {
        const legacyInfo = LEGACY_METHODS[methodName];
        if (legacyInfo) {
          context.report({
            node,
            messageId: 'noUnsafe',
            data: {
              method: methodName,
              replacement: legacyInfo.replacement,
            },
          });
        }
      }
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!node.superClass) return;
        
        if (node.superClass.type === 'MemberExpression') {
          if (node.superClass.object.type === 'Identifier' && 
              node.superClass.object.name === 'React' &&
              node.superClass.property.type === 'Identifier' &&
              (node.superClass.property.name === 'Component' || 
               node.superClass.property.name === 'PureComponent')) {
            inClassComponent = true;
          }
        } else if (node.superClass.type === 'Identifier') {
          if (node.superClass.name === 'Component' || node.superClass.name === 'PureComponent') {
            inClassComponent = true;
          }
        }
      },

      'ClassDeclaration:exit'() {
        inClassComponent = false;
      },

      MethodDefinition: checkMethod,
      PropertyDefinition: checkMethod,
    };
  },
});
