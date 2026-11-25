/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: style-prop-object
 * The `style` prop takes an object, never a string or another primitive.
 * Follows eslint-plugin-react's `style-prop-object` (MIT).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, objectKeyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isReactApi } from '../../utils/react-api';

type MessageIds = 'stylePropNotObject';
type Options = [{ allow?: string[] }?];

/** A literal that is not `null`: a string, number, boolean, regex or bigint. */
function isNonNullaryLiteral(node: TSESTree.Node): boolean {
  return node.type === 'Literal' && node.value !== null;
}

export const stylePropObject = createRule<Options, MessageIds>({
  name: 'style-prop-object',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/style-prop-object.md',
      description: 'Enforce style prop value is an object',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            additionalItems: false,
            uniqueItems: true,
          },
        },
      },
    ],
    messages: {
      stylePropNotObject: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Style Prop Is Not an Object',
        description: 'Style prop value must be an object',
        severity: 'MEDIUM',
        fix: 'Pass an object, for example const styles = { color: "red" } and style={styles}',
        documentationLink:
          'https://react.dev/reference/react-dom/components/common#applying-css-styles',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let allowed = new Set<string>();

    /** The variable `name` resolves to from `node`, or `undefined`. */
    function resolve(
      node: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | undefined {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(node.name);
        if (variable) return variable;
      }
      return undefined;
    }

    /** `style={styles}` where `const styles = 'color: red'`. */
    function checkIdentifier(node: TSESTree.Identifier): void {
      const declaration = resolve(node)?.defs[0]?.node as
        { init?: TSESTree.Node | null } | undefined;
      if (declaration?.init && isNonNullaryLiteral(declaration.init)) {
        context.report({ node, messageId: 'stylePropNotObject' });
      }
    }

    return {
      before() {
        allowed = new Set(options()[0]?.allow ?? []);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.arguments.length < 2 ||
          !isReactApi(
            node.callee,
            context.sourceCode.getScope(node),
            'createElement',
          )
        ) {
          return;
        }
        const [component, props] = node.arguments;
        if (component.type === 'Identifier' && allowed.has(component.name))
          return;
        if (props.type !== 'ObjectExpression') return;

        const style = props.properties.find(
          (property): property is TSESTree.Property =>
            property.type === 'Property' && objectKeyName(property) === 'style',
        );
        if (!style) return;
        if (style.value.type === 'Identifier') {
          checkIdentifier(style.value);
        } else if (isNonNullaryLiteral(style.value)) {
          context.report({
            node: style.value,
            messageId: 'stylePropNotObject',
          });
        }
      },

      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          !node.value ||
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'style'
        ) {
          return;
        }
        const element = node.parent;
        if (
          element.type === 'JSXOpeningElement' &&
          element.name.type === 'JSXIdentifier' &&
          allowed.has(element.name.name)
        ) {
          return;
        }

        if (
          node.value.type !== 'JSXExpressionContainer' ||
          isNonNullaryLiteral(node.value.expression)
        ) {
          context.report({ node, messageId: 'stylePropNotObject' });
        } else if (node.value.expression.type === 'Identifier') {
          checkIdentifier(node.value.expression);
        }
      },
    };
  },
});
