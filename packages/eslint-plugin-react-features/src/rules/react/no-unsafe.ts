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
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'noUnsafe';

type Options = {
  checkAliases?: boolean;
};

type RuleOptions = [Options?];

const UNSAFE_METHODS: Record<string, { replacement: string }> = {
  UNSAFE_componentWillMount: { replacement: 'componentDidMount or useEffect' },
  UNSAFE_componentWillReceiveProps: {
    replacement: 'static getDerivedStateFromProps or useEffect',
  },
  UNSAFE_componentWillUpdate: {
    replacement: 'getSnapshotBeforeUpdate or useEffect',
  },
};

const LEGACY_METHODS: Record<string, { replacement: string }> = {
  componentWillMount: { replacement: 'componentDidMount or useEffect' },
  componentWillReceiveProps: {
    replacement: 'static getDerivedStateFromProps or useEffect',
  },
  componentWillUpdate: { replacement: 'getSnapshotBeforeUpdate or useEffect' },
};

export const noUnsafe = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-unsafe',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-unsafe.md',
      description: 'Prevent usage of unsafe lifecycle methods',
    },
    messages: {
      noUnsafe: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe Lifecycle Method',
        description:
          '"{{method}}" is unsafe and may cause bugs in concurrent mode',
        severity: 'HIGH',
        fix: 'Use {{replacement}} instead',
        documentationLink:
          'https://react.dev/blog/2018/03/27/update-on-async-rendering',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let checkAliases: boolean;

    function checkMethod(
      node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
    ): void {
      // A lifecycle is an instance member of a React class component —
      // declared or a class expression, whatever its superclass is called.
      if (node.static) return;
      const owner = node.parent.parent;
      if (
        (owner.type !== 'ClassDeclaration' &&
          owner.type !== 'ClassExpression') ||
        !extendsReactComponent(owner, context.sourceCode.getScope(owner))
      )
        return;

      // `UNSAFE_x() {}`, `UNSAFE_x = () => {}` and `['UNSAFE_x']() {}`.
      const methodName = objectKeyName(node);
      if (methodName === null) return;

      const info =
        (Object.hasOwn(UNSAFE_METHODS, methodName) &&
          UNSAFE_METHODS[methodName]) ||
        (checkAliases &&
          Object.hasOwn(LEGACY_METHODS, methodName) &&
          LEGACY_METHODS[methodName]);
      if (info) {
        context.report({
          node,
          messageId: 'noUnsafe',
          data: {
            method: methodName,
            replacement: info.replacement,
          },
        });
      }
    }

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ checkAliases = false } = options ?? ({} as Options));
      },
      MethodDefinition: checkMethod,
      PropertyDefinition: checkMethod,
    };
  },
});
