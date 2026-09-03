/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-default-props
 * Require default props
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireDefaultProps';

export interface Options {
  forbidDefaultForRequired?: boolean;
}

export const requireDefaultProps = createRule<[Options], MessageIds>({
  name: 'require-default-props',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/require-default-props.md',
      description: 'Require default props',
    },
    messages: {
      requireDefaultProps: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Default Props',
        description: 'Prop is not required but has no default value',
        severity: 'MEDIUM',
        fix: 'Add defaultProps or make prop required in propTypes',
        documentationLink:
          'https://react.dev/learn/components-and-props#specifying-a-default-prop',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbidDefaultForRequired: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    const [options] = context.options;
    const forbidDefaultForRequired = options?.forbidDefaultForRequired ?? false;

    const propTypes = new Map<string, Map<string, TSESTree.Property>>();
    const defaultProps = new Map<string, Map<string, TSESTree.Property>>();
    const reactComponents = new Set<string>();

    return {
      // Track React component classes
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) reactComponents.add(componentKey(node));
      },

      /*
       * An ANONYMOUS component is still a component.
       *
       * Keying by `node.id.name` meant `export default class extends Component`
       * — one of the most common shapes in React — was never tracked, so a
       * missing default on it reported nothing. Two test cases appeared to
       * cover this and did not: both supplied COMPLETE defaults, so they passed
       * because nothing was missing, while their names attributed the pass to
       * an anonymous-class arm. A reader would have concluded the omission was
       * deliberate.
       */
      ClassExpression(node: TSESTree.ClassExpression) {
        if (isReactComponent(node)) reactComponents.add(componentKey(node));
      },

      // Collect propTypes (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="propTypes"]'(
        node: TSESTree.PropertyDefinition,
      ) {
        if (node.value && node.value.type === 'ObjectExpression') {
          const componentName = getComponentName(node);
          {
            const propsMap = new Map<string, TSESTree.Property>();
            for (const prop of node.value.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                propsMap.set(prop.key.name, prop);
              }
            }
            propTypes.set(componentName, propsMap);
          }
        }
      },

      // Collect defaultProps (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="defaultProps"]'(
        node: TSESTree.PropertyDefinition,
      ) {
        if (node.value && node.value.type === 'ObjectExpression') {
          const componentName = getComponentName(node);
          {
            const propsMap = new Map<string, TSESTree.Property>();
            for (const prop of node.value.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                propsMap.set(prop.key.name, prop);
              }
            }
            defaultProps.set(componentName, propsMap);
          }
        }
      },

      // Check at the end
      'Program:exit'() {
        for (const [componentName, propTypesMap] of propTypes) {
          // Only check React components
          if (!reactComponents.has(componentName)) {
            continue;
          }

          const defaultsMap = defaultProps.get(componentName);

          for (const [propName, propType] of propTypesMap) {
            const hasDefault = defaultsMap?.has(propName);
            const isRequired = isRequiredProp(propType);

            if (!isRequired && !hasDefault) {
              // Find the component node to report on
              // This is a simplified version - in practice, we'd need to track component nodes
              context.report({
                node: propType.key,
                messageId: 'requireDefaultProps',
              });
            }

            // `hasDefault` is intentionally not re-checked here: `get()`
            // returning a value is the same condition, and this keeps the
            // no-default arm of the lookup reachable.
            if (forbidDefaultForRequired && isRequired && defaultsMap) {
              const defaultProp = defaultsMap.get(propName);
              if (defaultProp) {
                context.report({
                  node: defaultProp.key,
                  messageId: 'requireDefaultProps',
                });
              }
            }
          }
        }
      },
    };

    // oxlint-disable-next-line consistent-function-scoping
    function getComponentName(node: TSESTree.PropertyDefinition): string {
      /*
       * A `PropertyDefinition` exists only as a class member, so its parent is
       * always a `ClassBody` and that body's parent is always a class —
       * declaration or expression, an abstract class being a declaration with
       * `abstract: true`. Neither guard can be reached by any input, and the
       * house rule is to delete such a branch rather than cover it. Before the
       * anonymous-class fix `getComponentName` could genuinely return null,
       * because it keyed on `id.name`; now `componentKey` always produces one.
       */
      /*
       * A `ClassBody`'s parent is always a class — declaration or expression,
       * and an abstract class is a declaration with `abstract: true`. There is
       * no third shape, so a guard here would be a branch no input can reach.
       * The house rule is to delete such a branch rather than cover it; the
       * cast states the invariant TypeScript cannot see.
       */
      const cls = node.parent.parent as
        TSESTree.ClassDeclaration | TSESTree.ClassExpression;
      return componentKey(cls);
    }

    /**
     * A stable key for a component class, named or not.
     *
     * The source position is used when there is no identifier. It is unique per
     * class within one lint pass, which is all this rule needs — it only has to
     * match the class that declared `propTypes` with the one that declared
     * `defaultProps`, and those are the same node.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function componentKey(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): string {
      return node.id?.name ?? `anonymous@${node.range[0]}`;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isReactComponent(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): boolean {
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

    // oxlint-disable-next-line consistent-function-scoping
    function isRequiredProp(propType: TSESTree.Property): boolean {
      // Check if prop type ends with .isRequired
      if (
        propType.value.type === 'MemberExpression' &&
        propertyName(propType.value) === 'isRequired'
      ) {
        return true;
      }
      return false;
    }
  },
});
