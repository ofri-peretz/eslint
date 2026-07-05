/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-1 coverage tests (real parser via RuleTester) — third wave.
 * Every case targets a specific previously-uncovered branch; see the inline
 * notes naming the rule source line each fixture exercises.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';

import { checkedRequiresOnchangeOrReadonly } from '../../rules/react/checked-requires-onchange-or-readonly';
import { defaultPropsMatchPropTypes } from '../../rules/react/default-props-match-prop-types';
import { displayName } from '../../rules/react/display-name';
import { hooksExhaustiveDeps } from '../../rules/react/hooks-exhaustive-deps';
import { jsxNoDuplicateProps } from '../../rules/react/jsx-no-duplicate-props';
import { jsxNoLiterals } from '../../rules/react/jsx-no-literals';
import { noAccessStateInSetState } from '../../rules/react/no-access-state-in-setstate';
import { noChildrenProp } from '../../rules/react/no-children-prop';
import { noDangerWithChildren } from '../../rules/react/no-danger-with-children';
import { noDeprecated } from '../../rules/react/no-deprecated';
import { noDidUpdateSetState } from '../../rules/react/no-did-update-set-state';
import { noDirectMutationState } from '../../rules/react/no-direct-mutation-state';
import { noMultiComp } from '../../rules/react/no-multi-comp';
import { noObjectTypeAsDefaultProp } from '../../rules/react/no-object-type-as-default-prop';
import { noRenderReturnValue } from '../../rules/react/no-render-return-value';
import { noTypos } from '../../rules/react/no-typos';
import { noUnknownProperty } from '../../rules/react/no-unknown-property';
import { noUnsafe } from '../../rules/react/no-unsafe';
import { preferStatelessFunction } from '../../rules/react/prefer-stateless-function';
import { propTypes } from '../../rules/react/prop-types';
import { reactInJsxScope } from '../../rules/react/react-in-jsx-scope';
import { requireDefaultProps } from '../../rules/react/require-default-props';
import { requireOptimization } from '../../rules/react/require-optimization';
import { requireRenderReturn } from '../../rules/react/require-render-return';
import { sortComp } from '../../rules/react/sort-comp';
import { stateInConstructor } from '../../rules/react/state-in-constructor';
import { voidDomElementsNoChildren } from '../../rules/react/void-dom-elements-no-children';
import { jsxMaxDepth } from '../../rules/react/jsx-max-depth';
import { noWrapperSubComponent } from '../../rules/component-api/no-wrapper-sub-component';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('checked-requires-onchange-or-readonly: namespaced attribute name', () => {
  ruleTester.run('checked-requires-onchange-or-readonly', checkedRequiresOnchangeOrReadonly, {
    valid: [
      {
        name: 'JSXNamespacedName attr yields empty attrName (L66 false arm)',
        code: '<input xlink:label="x" checked={c} onChange={f} />;',
      },
    ],
    invalid: [],
  });
});

describe('default-props-match-prop-types: non-literal-comparable prop types', () => {
  ruleTester.run('default-props-match-prop-types', defaultPropsMatchPropTypes, {
    valid: [
      {
        name: 'PropTypes.func falls into switch default (L110-111)',
        code: `
          class A extends Component {
            static propTypes = { cb: PropTypes.func };
            static defaultProps = { cb: 1 };
          }
        `,
      },
      {
        name: 'non-PropTypes member expression returns empty name (L122 false, L129)',
        code: `
          class A extends Component {
            static propTypes = { cb: Other.string };
            static defaultProps = { cb: 1 };
          }
        `,
      },
    ],
    invalid: [],
  });
});

describe('display-name: superclass shapes and anonymous components', () => {
  ruleTester.run('display-name', displayName, {
    valid: [
      {
        name: 'non-React member superclass is not a component (L79 false → L88)',
        code: 'class A extends Something.Else { m() {} }',
      },
      {
        name: 'call-expression superclass is not a component (L88)',
        code: 'class B extends mixin() { m() {} }',
      },
      {
        name: 'regex literal + array hole in body do not look like JSX (L176/L182 false arms)',
        code: 'function util() { const r = /x/; const a = [1, , 2]; return r && a; }',
      },
    ],
    invalid: [
      {
        name: 'React.Component class without displayName (L79 member path)',
        code: 'class C extends React.Component { render() { return null; } }',
        errors: [{ messageId: 'displayName' }],
      },
      {
        name: 'anonymous default function component reports on node itself (L148 || fallback)',
        code: 'export default function () { return <div />; }',
        errors: [{ messageId: 'displayName' }],
      },
    ],
  });
});

describe('hooks-exhaustive-deps: array-pattern holes', () => {
  ruleTester.run('hooks-exhaustive-deps', hooksExhaustiveDeps, {
    valid: [
      {
        name: 'array destructuring with hole (L233 false arm)',
        code: `
          function C({ arr }) {
            useEffect(() => {
              const [, second] = arr;
              console.log(second);
            }, [arr]);
            return null;
          }
        `,
      },
    ],
    invalid: [],
  });
});

describe('jsx-no-duplicate-props: skipped attribute kinds + ignoreCase', () => {
  ruleTester.run('jsx-no-duplicate-props', jsxNoDuplicateProps, {
    valid: [
      {
        name: 'spread and namespaced attributes are skipped (L63-64, L64 continue)',
        code: '<div {...rest} xlink:href="a" />;',
      },
    ],
    invalid: [
      {
        name: 'ignoreCase lowercases prop names (L67-68)',
        options: [{ ignoreCase: true }],
        code: '<div Foo="a" foo="b" />;',
        errors: [{ messageId: 'duplicateProp' }],
      },
    ],
  });
});

describe('jsx-no-literals: attribute edge values', () => {
  ruleTester.run('jsx-no-literals', jsxNoLiterals, {
    valid: [
      {
        name: 'valueless attribute (L88 false arm)',
        options: [{ ignoreProps: false }],
        code: '<div hidden />;',
      },
      {
        name: 'whitespace-only attribute string (L90 false arm)',
        options: [{ ignoreProps: false }],
        code: '<div aria-label="   " />;',
      },
    ],
    invalid: [],
  });
});

describe('no-access-state-in-setstate: traversal edge shapes', () => {
  ruleTester.run('no-access-state-in-setstate', noAccessStateInSetState, {
    valid: [
      {
        name: 'array hole and regex literal in setState arg (L92/L98 false arms)',
        code: 'obj.setState({ a: [1, , 2], r: /x/ });',
      },
    ],
    invalid: [
      {
        name: 'state access nested under regex-bearing object still detected',
        code: 'this.setState({ a: /x/, b: this.state.count + 1 });',
        errors: [{ messageId: 'noAccessStateInSetState' }],
      },
    ],
  });
});

describe('no-children-prop: spread objects without children', () => {
  ruleTester.run('no-children-prop', noChildrenProp, {
    valid: [
      {
        name: 'spread object with non-children / non-identifier keys (L59 false arm)',
        code: '<div {...{ foo: 1, "bar": 2 }} />;',
      },
    ],
    invalid: [],
  });
});

describe('no-danger-with-children: createElement props with computed keys', () => {
  ruleTester.run('no-danger-with-children', noDangerWithChildren, {
    invalid: [
      {
        name: 'computed key is skipped but danger + child still reported (L117 continue)',
        code: 'React.createElement("div", { ["x"]: 1, dangerouslySetInnerHTML: { __html: "" } }, child);',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
    ],
    valid: [],
  });
});

describe('no-deprecated: non-component classes and computed keys', () => {
  ruleTester.run('no-deprecated', noDeprecated, {
    valid: [
      {
        name: 'identifier superclass that is not Component (L144 false arm)',
        code: 'class A extends Elsewhere { componentWillMount() {} }',
      },
      {
        name: 'computed member key inside a component class (L91 return)',
        code: 'class B extends Component { ["dynamic"]() {} render() { return null; } }',
      },
      {
        name: 'class expression with non-React superclass (L144 false arm)',
        code: 'const C = class extends f() { m() {} };',
      },
    ],
    invalid: [],
  });
});

describe('no-did-update-set-state: if-statements outside componentDidUpdate', () => {
  ruleTester.run('no-did-update-set-state', noDidUpdateSetState, {
    valid: [
      {
        name: 'top-level if never marks conditional check (L75 false arm)',
        code: 'if (cond) { doWork(); }',
      },
    ],
    invalid: [],
  });
});

describe('no-direct-mutation-state: superclass/member shapes', () => {
  ruleTester.run('no-direct-mutation-state', noDirectMutationState, {
    valid: [
      {
        name: 'call-expression superclass (L192 false arm)',
        code: 'class A extends f() { m() { this.state.x = 1; } }',
      },
      {
        name: 'nested class exit re-derives stack top (L207 right operand)',
        code: `
          class Outer extends Component {
            m() {
              class Inner extends Component { n() {} }
              return Inner;
            }
          }
        `,
      },
      {
        name: 'non-state update/unary expressions (L231/L232/L241 false arms)',
        code: `
          class A extends Component {
            m() { let i = 0; i++; this.foo.x++; !i; delete obj.prop; }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'computed method key leaves lifecycle flag untouched (L211 false arm)',
        code: 'class A extends Component { ["run"]() { this.state.y = 2; } }',
        errors: [
          {
            messageId: 'noDirectMutationState',
            suggestions: [
              {
                messageId: 'suggestSetState',
                output:
                  'class A extends Component { ["run"]() { // TODO: Use setState instead of direct mutation\nthis.state.y = 2; } }',
              },
              {
                messageId: 'suggestFunctionalUpdate',
                output:
                  'class A extends Component { ["run"]() { // TODO: Use functional setState for immutable updates\nthis.state.y = 2; } }',
              },
            ],
          },
        ],
      },
    ],
  });
});

describe('no-multi-comp: anonymous components and edge declarations', () => {
  ruleTester.run('no-multi-comp', noMultiComp, {
    valid: [
      {
        name: 'declarator without init (L120 null component)',
        code: 'let Foo; function helper() { return 1; }',
      },
      {
        name: 'non-React superclasses (L164 false arm, L173)',
        code: 'class A extends types.Other {} class B extends f() {}',
      },
      {
        name: 'regex + array holes are not JSX (L139/L145 false arms)',
        code: 'function util() { const r = /x/; const a = [1, , 2]; return [r, a]; }',
      },
    ],
    invalid: [
      {
        name: 'anonymous default class reports on class node (L184 || fallback)',
        code: `
          function First() { return <div />; }
          export default class extends Component { render() { return <p />; } }
        `,
        errors: [{ messageId: 'noMultiComp' }],
      },
      {
        name: 'anonymous default function reports on node (L187 || fallback)',
        code: `
          function First() { return <div />; }
          export default function () { return <p />; }
        `,
        errors: [{ messageId: 'noMultiComp' }],
      },
    ],
  });
});

describe('no-object-type-as-default-prop: plain parameter defaults', () => {
  ruleTester.run('no-object-type-as-default-prop', noObjectTypeAsDefaultProp, {
    valid: [
      {
        name: 'non-destructured param default object (L58 false arms)',
        code: 'function Foo(props = {}) { return null; }',
      },
    ],
    invalid: [],
  });
});

describe('no-render-return-value: ReactDOM.render.render and non-render calls', () => {
  ruleTester.run('no-render-return-value', noRenderReturnValue, {
    valid: [
      {
        name: 'ReactDOM.render.render is rejected by the guard (L72 true → L82)',
        code: 'const inst = ReactDOM.render.render(el, node);',
      },
      {
        name: 'assignment from unrelated call (L54 false arm)',
        code: 'x = compute();',
      },
    ],
    invalid: [],
  });
});

describe('no-typos: computed keys and literal member access', () => {
  ruleTester.run('no-typos', noTypos, {
    valid: [
      {
        name: 'computed class members and literal property access (L67/L81/L95 false arms)',
        code: `
          class A { ["defaulProps"] = 1; ["componenDidMount"]() {} }
          const v = obj["defaulProps"];
        `,
      },
    ],
    invalid: [],
  });
});

describe('no-unknown-property: namespaced attributes', () => {
  ruleTester.run('no-unknown-property', noUnknownProperty, {
    valid: [
      {
        name: 'JSXNamespacedName attribute is skipped (L125 false arm)',
        code: '<svg xlink:href="#a" />;',
      },
    ],
    invalid: [],
  });
});

describe('no-unsafe: superclass shapes and alias options', () => {
  ruleTester.run('no-unsafe', noUnsafe, {
    valid: [
      {
        name: 'non-React member superclass (L111 false arm)',
        code: 'class A extends Foo.Bar { UNSAFE_componentWillMount() {} }',
      },
      {
        name: 'call-expression superclass (L118 false arm)',
        code: 'class B extends f() { UNSAFE_componentWillMount() {} }',
      },
      {
        name: 'safe method with checkAliases disabled (L93 false arm)',
        code: 'class C extends Component { render() { return null; } }',
      },
      {
        name: 'computed key inside component class (L72 return)',
        code: 'class D extends Component { ["UNSAFE_componentWillMount"]() {} }',
      },
      {
        name: 'plain identifier superclass that is neither Component nor PureComponent (L119 false arm)',
        code: 'class G extends Base { UNSAFE_componentWillMount() {} }',
      },
      {
        name: 'checkAliases on but method is not legacy (L93 false arm)',
        options: [{ checkAliases: true }],
        code: 'class H extends Component { render() { return null; } }',
      },
    ],
    invalid: [
      {
        name: 'React.PureComponent superclass hits second alternatives (L115 operand)',
        code: 'class E extends React.PureComponent { UNSAFE_componentWillUpdate() {} }',
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        name: 'plain PureComponent identifier (L119 right operand)',
        code: 'class F extends PureComponent { UNSAFE_componentWillReceiveProps() {} }',
        errors: [{ messageId: 'noUnsafe' }],
      },
    ],
  });
});

describe('prefer-stateless-function: pure components and state detection', () => {
  ruleTester.run('prefer-stateless-function', preferStatelessFunction, {
    valid: [
      {
        name: 'non-React member superclass (L81 false → L90)',
        code: 'class A extends Foo.Bar { render() { return null; } }',
      },
      {
        name: 'state class property blocks report (L110)',
        code: 'class B extends Component { state = { a: 1 }; render() { return null; } }',
      },
      {
        name: 'constructor state assignment blocks report (L132)',
        code: `
          class C extends Component {
            constructor(props) { super(props); this.state = { a: 1 }; }
            render() { return null; }
          }
        `,
      },
      {
        name: 'ignorePureComponents via React.PureComponent (L101 false arm)',
        options: [{ ignorePureComponents: true }],
        code: 'class D extends React.PureComponent { render() { return null; } }',
      },
      {
        name: 'call-expression superclass (L81 false arm → L90)',
        code: 'class E extends f() { render() { return null; } }',
      },
      {
        name: 'constructor overload signature has no body (L132 continue)',
        code: `
          class F extends Component {
            constructor(a: string);
            constructor(a: unknown) { super(a); this.state = { on: true }; }
            render() { return null; }
          }
        `,
      },
    ],
    invalid: [],
  });
});

describe('prop-types: superclass shapes and skipUndeclared', () => {
  ruleTester.run('prop-types', propTypes, {
    valid: [
      {
        name: 'call-expression superclass (L117 false → L126)',
        code: 'class A extends mixin() { m() { return this.props.x; } }',
      },
      {
        name: 'class expression static propTypes has no declaration id (L82 false arm)',
        code: 'const B = class extends Component { static propTypes = {}; };',
      },
      {
        name: 'skipUndeclared with no props usage (L97 right operands, L143 null body path)',
        options: [{ skipUndeclared: true }],
        code: `
          class C extends Component {
            state = 1;
            helper(a: string): void;
            helper(a: unknown) {}
            render() { return null; }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'skipUndeclared still reports when this.props is used (L134-135 true path)',
        options: [{ skipUndeclared: true }],
        code: `
          class D extends Component {
            render() { const r = /x/; const a = [1, , 2]; return this.props.x && r && a; }
          }
        `,
        errors: [{ messageId: 'propTypes' }],
      },
    ],
  });
});

describe('react-in-jsx-scope: variable declaration reporting', () => {
  ruleTester.run('react-in-jsx-scope', reactInJsxScope, {
    valid: [],
    invalid: [
      {
        name: 'JSX assigned to a const without React import (L86-95)',
        code: 'let a; const b = 1, c = <div />;',
        errors: [{ messageId: 'reactInJsxScope' }],
      },
    ],
  });
});

describe('require-default-props: React.Component classes and collection guards', () => {
  ruleTester.run('require-default-props', requireDefaultProps, {
    valid: [
      {
        name: 'React.Component member superclass with defaults (L153-158)',
        code: `
          class A extends React.Component {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          }
        `,
      },
      {
        name: 'non-object propTypes/defaultProps values are ignored (L70/L86 false arms)',
        code: `
          class B extends Component {
            static propTypes = SHARED;
            static defaultProps = DEFAULTS;
          }
        `,
      },
      {
        name: 'class expression statics have no component name (L72/L88 false arms, L142)',
        code: `
          const C = class extends Component {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          };
        `,
      },
      {
        name: 'anonymous default class id fallback (L140 || null)',
        code: `
          export default class extends Component {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          }
        `,
      },
      {
        name: 'required prop without default and forbid off (L125 false arm)',
        code: `
          class E extends Component {
            static propTypes = { a: PropTypes.string.isRequired };
            static defaultProps = {};
          }
        `,
      },
      {
        name: 'spread entries in defaultProps are skipped (L91 false arm)',
        code: `
          class G extends Component {
            static propTypes = { ...shared, a: PropTypes.string };
            static defaultProps = { ...base, a: "x" };
          }
        `,
      },
      {
        name: 'PureComponent identifier superclass (L150 right operand)',
        code: `
          class H extends PureComponent {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          }
        `,
      },
      {
        name: 'React.PureComponent member superclass (L158 right operand)',
        code: `
          class I extends React.PureComponent {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          }
        `,
      },
      {
        name: 'call-expression superclass is not a component (L153 false arm → L162)',
        code: `
          class J extends f() {
            static propTypes = { a: PropTypes.string };
            static defaultProps = { a: "x" };
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'forbidDefaultForRequired reports default on required prop (L125 true path + no-default lookup arm)',
        options: [{ forbidDefaultForRequired: true }],
        code: `
          class F extends Component {
            static propTypes = { a: PropTypes.string.isRequired, b: PropTypes.number.isRequired };
            static defaultProps = { a: "x" };
          }
        `,
        errors: [{ messageId: 'requireDefaultProps' }],
      },
    ],
  });
});

describe('require-optimization: function declarations and identifier-superclass classes', () => {
  ruleTester.run('require-optimization', requireOptimization, {
    valid: [
      {
        name: 'small function declaration component (L147 decl arm, L159-161, L498-499)',
        code: 'function Small(props) { return null; }',
      },
      {
        name: 'function declaration with non-props identifier param (L159 false arms)',
        code: 'function Other(input) { return null; }',
      },
    ],
    invalid: [
      {
        name: 'plain Component superclass with heavy render (L288-289, L336-360 render analysis)',
        code: `
          class Heavy extends Component {
            render() {
              const p = this.props;
              const rows = items.map(function (i) { return i; });
              const { a, b, c } = this.props;
              return <ul>{rows}</ul>;
            }
          }
        `,
        errors: [{ messageId: 'considerPureComponent' }],
      },
    ],
  });
});

describe('require-render-return: statement shapes', () => {
  ruleTester.run('require-render-return', requireRenderReturn, {
    valid: [
      {
        name: 'return inside single-statement if consequent (L61 false, L71)',
        code: 'class A extends Component { render() { if (x) return null; } }',
      },
      {
        name: 'return inside nested block (L87-88)',
        code: 'class B extends Component { render() { { return null; } } }',
      },
      {
        name: 'return inside switch case (L94 both arms)',
        code: `
          class C extends Component {
            render() { switch (x) { case 1: log(); break; default: return null; } }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'if without returns in either branch (L81/L82 operand arms)',
        code: 'class D extends Component { render() { if (x) y(); else { z(); } } }',
        errors: [{ messageId: 'requireRenderReturn' }],
      },
      {
        name: 'if with no alternate and no return (L82 left operand short-circuit)',
        code: 'class E extends Component { render() { if (x) y(); } }',
        errors: [{ messageId: 'requireRenderReturn' }],
      },
    ],
  });
});

describe('sort-comp: computed keys, static render, property reports', () => {
  ruleTester.run('sort-comp', sortComp, {
    valid: [
      {
        name: 'computed member key is unnamed (L120 false, L144 false → L147)',
        code: 'class A extends Component { ["x"]() {} render() { return null; } }',
      },
      {
        name: 'static render method order index (L165)',
        code: 'class B extends Component { m() {} static render() {} }',
      },
    ],
    invalid: [
      {
        name: 'instance property after render reports on property key (L156 false → L159)',
        code: 'class C extends Component { render() { return null; } state = {}; }',
        errors: [{ messageId: 'sortComp' }],
      },
    ],
  });
});

describe('state-in-constructor: superclass and constructor shapes', () => {
  ruleTester.run('state-in-constructor', stateInConstructor, {
    valid: [
      {
        name: 'call-expression superclass is not a component (L55 false → L64)',
        code: 'class A extends mix() { state = {}; }',
      },
      {
        name: 'constructor-only state (L95 false arm)',
        code: `
          class B extends Component {
            constructor(props) { super(props); this.state = {}; }
          }
        `,
      },
      {
        name: 'constructor overload signature is not a FunctionExpression (L112 false arm)',
        code: `
          class C extends Component {
            constructor(a: string);
            constructor(a: unknown) { super(a); this.state = {}; }
            state = {};
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'React.Component member superclass; report loop skips earlier members (L95 false arm)',
        code: 'class D extends React.Component { m() {} state = {}; }',
        errors: [{ messageId: 'stateInConstructor' }],
      },
    ],
  });
});

describe('void-dom-elements-no-children: member-expression element names', () => {
  ruleTester.run('void-dom-elements-no-children', voidDomElementsNoChildren, {
    valid: [
      {
        name: 'JSXMemberExpression name is skipped (L97 return)',
        code: '<Foo.br>{child}</Foo.br>;',
      },
    ],
    invalid: [],
  });
});

describe('jsx-max-depth: JSX nested inside expression containers', () => {
  ruleTester.run('jsx-max-depth', jsxMaxDepth, {
    valid: [],
    invalid: [
      {
        name: 'expression-container JSX counts toward depth (L88-90)',
        options: [{ max: 1 }],
        code: '<div>{<span><a /></span>}</div>;',
        errors: [{ messageId: 'jsxMaxDepth' }],
      },
    ],
  });
});

describe('no-wrapper-sub-component: member-expression primitives', () => {
  ruleTester.run('no-wrapper-sub-component', noWrapperSubComponent, {
    valid: [
      {
        name: 'namespaced JSX name is not pascal-case (L57 false arm → L58)',
        code: 'const Foo = (props) => <ns:tag {...props} />;',
      },
    ],
    invalid: [
      {
        name: 'passthrough to JSXMemberExpression primitive (L57 false → L58)',
        code: 'const Foo = (props) => <Bar.Baz {...props} />;',
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
    ],
  });
});
