/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prop-types
 * Enforce prop types usage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'propTypes';

export interface Options {
  ignore?: string[];
  customValidators?: string[];
  skipUndeclared?: boolean;
}

export const propTypes = createRule<[Options], MessageIds>({
  name: 'prop-types',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/prop-types.md',
      description: 'Enforce prop types usage',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
          },
          customValidators: {
            type: 'array',
            items: { type: 'string' },
            description: 'Accepted for compatibility; it has no effect.',
          },
          skipUndeclared: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      propTypes: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing PropTypes',
        description: 'Component missing prop type validation',
        severity: 'MEDIUM',
        fix: 'Add propTypes static property or use TypeScript',
        documentationLink:
          'https://react.dev/learn/components-and-props#specifying-a-default-prop',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
    type Component = { node: ClassNode; declared: boolean; usesProps: boolean };

    let ignore: string[];
    let skipUndeclared: boolean;
    /** Every class being walked; `component` is set for React components. */
    let classes: { component: Component | null }[];
    let components: Component[];
    /** `X.propTypes = …`, resolved against the classes at the end. */
    let assigned: TSESTree.Identifier[];

    /** The name a class goes by: its own, or the variable it is bound to. */
    // oxlint-disable-next-line consistent-function-scoping
    function nameOf(node: ClassNode): string | null {
      if (node.id) return node.id.name;
      const parent = node.parent;
      return parent.type === 'VariableDeclarator' &&
        parent.id.type === 'Identifier'
        ? parent.id.name
        : null;
    }

    /**
     * Are the props declared on the class itself: a `static propTypes` in any
     * key spelling, or TypeScript props on the base (`Component<Props>`)?
     */
    // oxlint-disable-next-line consistent-function-scoping
    function declaresProps(node: ClassNode): boolean {
      return (
        Boolean(node.superTypeArguments) ||
        node.body.body.some(
          (member) =>
            member.type === 'PropertyDefinition' &&
            member.static &&
            objectKeyName(member) === 'propTypes',
        )
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

    function enter(node: ClassNode): void {
      const name = nameOf(node);
      const isComponent =
        extendsReactComponent(node, context.sourceCode.getScope(node)) &&
        !(name !== null && ignore.includes(name));
      const component = isComponent
        ? { node, declared: declaresProps(node), usesProps: false }
        : null;
      if (component) components.push(component);
      classes.push({ component });
    }

    function exit(): void {
      classes.pop();
    }

    return {
      before() {
        const [options] = context.options;
        ignore = options?.ignore ?? [];
        skipUndeclared = options?.skipUndeclared ?? false;
        classes = [];
        components = [];
        assigned = [];
      },
      ClassDeclaration: enter,
      ClassExpression: enter,
      'ClassDeclaration:exit': exit,
      'ClassExpression:exit': exit,

      // `this.props` read inside the nearest enclosing component class.
      ThisExpression(node: TSESTree.ThisExpression) {
        const component = classes.at(-1)?.component;
        // `(this as Props).props` reads the same object as `this.props`.
        let inner: TSESTree.Node = node;
        while (inner.parent?.type === 'TSAsExpression') inner = inner.parent;
        const parent = inner.parent!;
        if (
          component &&
          parent.type === 'MemberExpression' &&
          parent.object === inner &&
          propertyName(parent) === 'props'
        ) {
          component.usesProps = true;
        }
      },

      // `App.propTypes = …` (through a cast too) declares the same static.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const target = node.left;
        if (
          target.type !== 'MemberExpression' ||
          propertyName(target) !== 'propTypes'
        )
          return;
        let object: TSESTree.Node = target.object;
        while (object.type === 'TSAsExpression') object = object.expression;
        if (object.type === 'Identifier') assigned.push(object);
      },

      'Program:exit'() {
        const assignedTo = new Set(assigned.map(classBoundTo));
        for (const component of components) {
          if (component.declared || assignedTo.has(component.node)) continue;
          if (skipUndeclared && !component.usesProps) continue;
          context.report({
            node: component.node.id ?? component.node,
            messageId: 'propTypes',
          });
        }
      },
    };
  },
});
