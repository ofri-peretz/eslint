/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: default-props-match-prop-types
 * Validate default props match prop types
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  memberPath,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'defaultPropsMatchPropTypes';

export const defaultPropsMatchPropTypes = createRule<[], MessageIds>({
  name: 'default-props-match-prop-types',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/default-props-match-prop-types.md',
      description: 'Validate default props match prop types',
    },
    schema: [],
    messages: {
      defaultPropsMatchPropTypes: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Default Props Mismatch',
        description: 'Default prop does not match prop type',
        severity: 'MEDIUM',
        fix: 'Update default prop to match propTypes or update propTypes',
        documentationLink:
          'https://react.dev/learn/components-and-props#default-props',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /** propTypes / defaultProps object literals, per component. */
    let owners: Map<unknown, Declared>;

    const declared = (owner: unknown): Declared => {
      let d = owners.get(owner);
      if (!d) {
        d = { propTypes: [], defaultProps: [] };
        owners.set(owner, d);
      }
      return d;
    };

    const collect = (
      owner: unknown,
      which: string | null,
      value: TSESTree.Node | null,
      scope: TSESLint.Scope.Scope,
    ) => {
      if (value?.type !== 'ObjectExpression') return;
      if (which === 'propTypes')
        declared(owner).propTypes.push({ value, scope });
      else if (which === 'defaultProps')
        declared(owner).defaultProps.push({ value, scope });
    };

    return {
      before() {
        owners = new Map();
      },
      // `static propTypes = {...}` / `static defaultProps = {...}`
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        // A class body's parent is always its class.
        const cls = node.parent.parent as
          TSESTree.ClassDeclaration | TSESTree.ClassExpression;
        if (!node.static) return;
        const owner = cls.id ? cls.id.name : cls;
        // `static propTypes`, `static 'propTypes'`, `static ['propTypes']`
        collect(
          owner,
          objectKeyName(node),
          node.value,
          context.sourceCode.getScope(node),
        );
      },
      // `Comp.propTypes = {...}` / `Comp.defaultProps = {...}`
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const { left } = node;
        if (
          left.type !== 'MemberExpression' ||
          left.object.type !== 'Identifier'
        )
          return;
        collect(
          left.object.name,
          propertyName(left),
          node.right,
          context.sourceCode.getScope(node),
        );
      },
      'Program:exit'() {
        for (const { propTypes, defaultProps } of owners.values()) {
          const validators = new Map<string, string>();
          for (const { value, scope } of propTypes) {
            for (const prop of value.properties) {
              const key = prop.type === 'Property' ? objectKeyName(prop) : null;
              if (key === null || prop.type !== 'Property') continue;
              const kind = validatorKind(prop.value, scope);
              if (kind) validators.set(key, kind);
            }
          }
          for (const { value } of defaultProps) {
            for (const prop of value.properties) {
              const key = prop.type === 'Property' ? objectKeyName(prop) : null;
              if (key === null || prop.type !== 'Property') continue;
              const expected = validators.get(key);
              const actual = literalKind(prop.value);
              if (expected && actual && expected !== actual) {
                context.report({
                  node: prop.key,
                  messageId: 'defaultPropsMatchPropTypes',
                });
              }
            }
          }
        }
      },
    };
  },
});

interface Declared {
  propTypes: {
    value: TSESTree.ObjectExpression;
    scope: TSESLint.Scope.Scope;
  }[];
  defaultProps: {
    value: TSESTree.ObjectExpression;
    scope: TSESLint.Scope.Scope;
  }[];
}

/**
 * @vocabulary The `prop-types` validators whose accepted values a literal
 * can contradict, mapped to the literal kind each accepts.
 */
const VALIDATOR_KIND: Readonly<Record<string, string>> = {
  string: 'string',
  number: 'number',
  bool: 'boolean',
};

/**
 * The literal kind a `prop-types` validator accepts, read by binding:
 * `PropTypes.string`, `PropTypes['string']`, a renamed default import, a named
 * import, each with or without `.isRequired`. `undefined` for any other
 * validator or a value not from `prop-types`.
 */
function validatorKind(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): string | undefined {
  const binding = resolveModuleBinding(node, scope);
  // The UMD build defines the global `PropTypes`: an undeclared `PropTypes.x`.
  const chain = memberPath(node);
  const full =
    binding?.module === 'prop-types'
      ? binding.path
      : !binding &&
          chain?.[0] === 'PropTypes' &&
          !isDeclared('PropTypes', scope)
        ? chain.slice(1)
        : undefined;
  if (!full) return undefined;
  const path = full.at(-1) === 'isRequired' ? full.slice(0, -1) : full;
  // `import PropTypes from 'prop-types'` resolves `PropTypes.x` to ['x'].
  return path.length === 1 ? VALIDATOR_KIND[path[0]] : undefined;
}

/** Is `name` declared anywhere from `scope` up? */
function isDeclared(name: string, scope: TSESLint.Scope.Scope): boolean {
  for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
    if ((s.set.get(name)?.defs.length ?? 0) > 0) return true;
  }
  return false;
}

/**
 * The kind of a literal default (`'x'`, `` `x` ``, `0`, `-1`, `true`), or
 * `undefined` for anything else. `null` is accepted by every non-required
 * validator, so it is not a kind that can mismatch.
 */
function literalKind(node: TSESTree.Node): string | undefined {
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0 ? 'string' : undefined;
  }
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '-' || node.operator === '+')
  ) {
    return node.argument.type === 'Literal' &&
      typeof node.argument.value === 'number'
      ? 'number'
      : undefined;
  }
  if (node.type !== 'Literal' || node.value === null) return undefined;
  const kind = typeof node.value;
  return kind === 'string' || kind === 'number' || kind === 'boolean'
    ? kind
    : undefined;
}
