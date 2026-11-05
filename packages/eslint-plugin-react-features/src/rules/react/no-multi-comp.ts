/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-multi-comp
 * Prevent multiple components per file
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  type FunctionNode,
  isFunctionComponent,
} from '../../utils/function-component';
import { extendsReactComponent } from '../../utils/react-api';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noMultiComp';

export interface Options {
  ignoreStateless?: boolean;
}

type RuleOptions = [Options?];

export const noMultiComp = createRule<RuleOptions, MessageIds>({
  name: 'no-multi-comp',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-multi-comp',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-multi-comp.md',
      description: 'Prevent multiple components per file',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreStateless: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noMultiComp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Multiple Components',
        description: 'Multiple components defined in single file',
        severity: 'LOW',
        fix: 'Extract components to separate files',
        documentationLink:
          'https://react.dev/learn/thinking-in-react#step-3-identify-where-your-state-should-live',
      }),
    },
  },
  defaultOptions: [{ ignoreStateless: false }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** Each component defined in the file, and whether it is a class. */
    let components: { node: TSESTree.Node; isClass: boolean }[];

    function nameNode(
      node:
        | TSESTree.ClassDeclaration
        | TSESTree.ClassExpression
        | FunctionNode,
    ): TSESTree.Node {
      if (node.id) return node.id;
      // `const A = …` / `const A = memo(…)`: the variable names it.
      const holder =
        node.parent.type === 'CallExpression' ? node.parent.parent : node.parent;
      return holder?.type === 'VariableDeclarator' ? holder.id : node;
    }

    function onClass(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void {
      if (extendsReactComponent(node, context.sourceCode.getScope(node))) {
        components.push({ node: nameNode(node), isClass: true });
      }
    }

    function onFunction(node: FunctionNode): void {
      if (isFunctionComponent(node, context.sourceCode)) {
        components.push({ node: nameNode(node), isClass: false });
      }
    }

    return {
      before() {
        components = [];
      },
      ClassDeclaration: onClass,
      ClassExpression: onClass,
      FunctionDeclaration: onFunction,
      FunctionExpression: onFunction,
      ArrowFunctionExpression: onFunction,

      'Program:exit'() {
        const [firstOption] = context.options;
        const ignoreStateless = firstOption?.ignoreStateless ?? false;
        // With `ignoreStateless`, only class components count.
        const counted = components.filter(
          (comp) => comp.isClass || !ignoreStateless,
        );
        // Report on all components except the first
        for (const comp of counted.slice(1)) {
          context.report({
            node: comp.node,
            messageId: 'noMultiComp',
          });
        }
      },
    };
  },
});
