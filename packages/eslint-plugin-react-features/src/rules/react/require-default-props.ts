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
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'requireDefaultProps';

export interface Options {
  forbidDefaultForRequired?: boolean;
}

export const requireDefaultProps = createRule<[Options], MessageIds>({
  name: 'require-default-props',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
    type Statics = {
      propTypes?: TSESTree.ObjectExpression;
      defaultProps?: TSESTree.ObjectExpression;
    };
    type StaticName = keyof Statics;

    let forbidDefaultForRequired: boolean;
    /** Each React class component, with the statics declared for it. */
    let components: Map<ClassNode, Statics>;
    /** `X.propTypes = {…}` / `X.defaultProps = {…}`, resolved at the end. */
    let assignments: {
      target: TSESTree.Identifier;
      name: StaticName;
      value: TSESTree.ObjectExpression;
    }[];

    const isStaticName = (name: string | null): name is StaticName =>
      name === 'propTypes' || name === 'defaultProps';

    /** `{ variant: …, 'aria-label': … }`: each key in any spelling. */
    // oxlint-disable-next-line consistent-function-scoping
    function entries(
      object: TSESTree.ObjectExpression | undefined,
    ): Map<string, TSESTree.Property> {
      const map = new Map<string, TSESTree.Property>();
      for (const prop of object?.properties ?? []) {
        if (prop.type !== 'Property') continue;
        const key = objectKeyName(prop);
        if (key !== null) map.set(key, prop);
      }
      return map;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isRequiredProp(propType: TSESTree.Property): boolean {
      // `PropTypes.string.isRequired`, in either member spelling.
      return (
        propType.value.type === 'MemberExpression' &&
        propertyName(propType.value) === 'isRequired'
      );
    }

    /** The class a name is bound to in this file, if any. */
    function classBoundTo(id: TSESTree.Identifier): ClassNode | undefined {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(id);
        scope;
        scope = scope.upper
      ) {
        const def = scope.set.get(id.name)?.defs[0];
        if (!def) continue;
        if (def.type === 'ClassName') return def.node as ClassNode;
        const init = def.type === 'Variable' ? def.node.init : null;
        return init?.type === 'ClassExpression' ? init : undefined;
      }
      return undefined;
    }

    function enterClass(node: ClassNode): void {
      if (!extendsReactComponent(node, context.sourceCode.getScope(node)))
        return;
      const statics: Statics = {};
      for (const member of node.body.body) {
        if (
          member.type !== 'PropertyDefinition' ||
          !member.static ||
          member.value?.type !== 'ObjectExpression'
        )
          continue;
        const name = objectKeyName(member);
        if (isStaticName(name)) statics[name] = member.value;
      }
      components.set(node, statics);
    }

    return {
      before() {
        const [options] = context.options;
        forbidDefaultForRequired = options?.forbidDefaultForRequired ?? false;
        components = new Map();
        assignments = [];
      },
      ClassDeclaration: enterClass,
      ClassExpression: enterClass,

      // `App.propTypes = {…}` declares the same static as `static propTypes`.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const target = node.left;
        if (
          target.type !== 'MemberExpression' ||
          node.right.type !== 'ObjectExpression'
        )
          return;
        // `(App as any).propTypes`: a cast changes the type, not the object.
        let object: TSESTree.Node = target.object;
        while (object.type === 'TSAsExpression') object = object.expression;
        const name = propertyName(target);
        if (object.type === 'Identifier' && isStaticName(name)) {
          assignments.push({ target: object, name, value: node.right });
        }
      },

      'Program:exit'() {
        for (const { target, name, value } of assignments) {
          const statics = components.get(classBoundTo(target)!);
          if (statics) statics[name] = value;
        }

        for (const statics of components.values()) {
          if (!statics.propTypes) continue;
          const defaultsMap = entries(statics.defaultProps);

          for (const [propName, propType] of entries(statics.propTypes)) {
            const defaultProp = defaultsMap.get(propName);
            const isRequired = isRequiredProp(propType);

            if (!isRequired && !defaultProp) {
              context.report({
                node: propType.key,
                messageId: 'requireDefaultProps',
              });
            }

            if (forbidDefaultForRequired && isRequired && defaultProp) {
              context.report({
                node: defaultProp.key,
                messageId: 'requireDefaultProps',
              });
            }
          }
        }
      },
    };
  },
});
