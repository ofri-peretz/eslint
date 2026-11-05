/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-stateless-function
 * Prefer stateless functions
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { reactExport } from '../../utils/react-api';

type MessageIds = 'preferStatelessFunction';

export interface Options {
  ignorePureComponents?: boolean;
}

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

/**
 * @vocabulary React's class-component API: the statics React reads off a
 * component, each of which a function component can carry as well.
 */
const FUNCTION_STATICS = new Set([
  'propTypes',
  'defaultProps',
  'contextTypes',
  'contextType',
  'displayName',
]);

/** `this.props` / `this.context`: what a function receives as arguments. */
const FUNCTION_THIS = new Set(['props', 'context']);

/** `constructor(props) { super(props); }`: says nothing a function cannot. */
function isUselessConstructor(member: TSESTree.MethodDefinition): boolean {
  const body = member.value.body?.body ?? [];
  return body.every(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'CallExpression' &&
      statement.expression.callee.type === 'Super',
  );
}

/**
 * Could a function component declare everything this class body does? Only
 * `render`, the statics in FUNCTION_STATICS and a useless constructor
 * qualify; state, lifecycles, handlers, fields and error-boundary statics do
 * not. A type-only member (an index signature) declares nothing.
 */
function hasOnlyFunctionMembers(node: ClassNode): boolean {
  return node.body.body.every((member) => {
    if (member.type === 'TSIndexSignature') return true;
    if (member.type === 'MethodDefinition' && member.kind === 'constructor')
      return isUselessConstructor(member);
    if (
      member.type !== 'MethodDefinition' &&
      member.type !== 'PropertyDefinition'
    )
      return false;
    const name = objectKeyName(member);
    if (member.static) return name !== null && FUNCTION_STATICS.has(name);
    return member.type === 'MethodDefinition' && name === 'render';
  });
}

export const preferStatelessFunction = createRule<[Options], MessageIds>({
  name: 'prefer-stateless-function',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/prefer-stateless-function.md',
      description: 'Prefer stateless functions',
    },
    messages: {
      preferStatelessFunction: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'Class Component',
        description: 'Class component without state or lifecycle methods',
        severity: 'MEDIUM',
        fix: 'Convert to functional component',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePureComponents: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ ignorePureComponents: false }],
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    let ignorePureComponents: boolean;

    /** The React base class `node` extends, by binding, or null. */
    function reactBase(node: ClassNode): string | null {
      if (!node.superClass) return null;
      const found = reactExport(
        node.superClass,
        context.sourceCode.getScope(node),
      );
      if (
        found === null ||
        (found.module !== null && found.module !== 'react') ||
        (found.name !== 'Component' && found.name !== 'PureComponent')
      )
        return null;
      return found.name;
    }

    /**
     * Each class being walked, and whether its body reads `this` as anything
     * but `this.props` / `this.context` (state, refs, its own methods).
     */
    const classes: { node: ClassNode; usesInstance: boolean }[] = [];

    function enter(node: ClassNode): void {
      classes.push({ node, usesInstance: false });
    }

    function exit(): void {
      const { node, usesInstance } = classes.pop()!;
      const base = reactBase(node);
      if (base === null) return;
      if (ignorePureComponents && base === 'PureComponent') return;
      if (!usesInstance && hasOnlyFunctionMembers(node)) {
        context.report({
          node: node.id ?? node,
          messageId: 'preferStatelessFunction',
        });
      }
    }

    return {
      before() {
        const [options] = context.options;
        ignorePureComponents = options?.ignorePureComponents ?? false;
        classes.length = 0;
      },
      ClassDeclaration: enter,
      ClassExpression: enter,
      'ClassDeclaration:exit': exit,
      'ClassExpression:exit': exit,
      ThisExpression(node: TSESTree.ThisExpression) {
        const current = classes.at(-1);
        if (!current) return;
        // `(this as Props).props` reads the same object as `this.props`.
        let inner: TSESTree.Node = node;
        while (inner.parent?.type === 'TSAsExpression') inner = inner.parent;
        const parent = inner.parent!;
        const name =
          parent.type === 'MemberExpression' && parent.object === inner
            ? propertyName(parent)
            : null;
        if (name === null || !FUNCTION_THIS.has(name)) {
          current.usesInstance = true;
        }
      },
    };
  },
});
