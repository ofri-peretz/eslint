/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-1 coverage tests (real parser via RuleTester) for branch gaps in:
 * no-deprecated, no-danger-with-children, jsx-key, hooks-exhaustive-deps.
 * Each case targets a specific previously-uncovered branch.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecated } from '../../rules/react/no-deprecated';
import { noDangerWithChildren } from '../../rules/react/no-danger-with-children';
import { jsxKey } from '../../rules/react/jsx-key';
import { hooksExhaustiveDeps } from '../../rules/react/hooks-exhaustive-deps';

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

describe('no-deprecated coverage gaps', () => {
  ruleTester.run('no-deprecated', noDeprecated, {
    valid: [
      { name: 'nested member expression object', code: 'a.b.c;' },
      { name: 'computed member on React', code: "const x = React['findDOMNode'];" },
      { name: 'non-deprecated member', code: 'React.createElement("div");' },
      { name: 'class without superclass', code: 'class Plain { componentWillMount() {} }' },
      { name: 'class extends non-React member', code: 'class A extends Foo.Component { render() { return null; } }' },
      { name: 'class extends deep member', code: 'class A extends a.b.Component { render() { return null; } }' },
      { name: 'class extends React.Other', code: 'class A extends React.Other { render() { return null; } }' },
      { name: 'class extends computed React member', code: "class A extends React['Component'] { componentWillMount() {} }" },
      { name: 'class extends other identifier', code: 'class A extends Base { componentWillMount() {} }' },
      { name: 'class extends call expression', code: 'class A extends mixin() { componentWillMount() {} }' },
      { name: 'non-deprecated method in component', code: 'class A extends Component { render() { return null; } }' },
      { name: 'computed method key in component', code: 'class A extends Component { [dynamicKey]() {} }' },
      { name: 'class expression without superclass', code: 'const A = class { componentWillMount() {} };' },
      { name: 'class expression extends other', code: 'const A = class extends Base { componentWillMount() {} };' },
      { name: 'class expression extends deep member', code: 'const A = class extends a.b.Component { render() { return null; } };' },
      { name: 'class expression extends React.Other', code: 'const A = class extends React.Other { render() { return null; } };' },
      { name: 'class expression extends Foo.Component', code: 'const A = class extends Foo.Component { render() { return null; } };' },
      { name: 'class expression extends computed member', code: "const A = class extends React['Component'] { componentWillMount() {} };" },
    ],
    invalid: [
      {
        name: 'ReactDOM.render is deprecated',
        code: 'ReactDOM.render(app, root);',
        errors: [{ messageId: 'deprecated', data: { name: 'ReactDOM.render', replacement: 'createRoot().render()', since: 'React 18' } }],
      },
      {
        name: 'React.createClass is deprecated',
        code: 'React.createClass({});',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle method in React.Component class',
        code: 'class A extends React.Component { componentWillMount() {} }',
        errors: [{ messageId: 'deprecated', data: { name: 'componentWillMount', replacement: 'componentDidMount or constructor', since: 'React 16.3' } }],
      },
      {
        name: 'lifecycle method in React.PureComponent class',
        code: 'class A extends React.PureComponent { componentWillUpdate() {} }',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle property in Component identifier class',
        code: 'class A extends Component { componentWillReceiveProps = () => {}; }',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle in PureComponent identifier class',
        code: 'class A extends PureComponent { UNSAFE_componentWillMount() {} }',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle in class expression extends Component',
        code: 'const A = class extends Component { componentWillUpdate() {} };',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle in class expression extends React.PureComponent',
        code: 'const A = class extends React.PureComponent { UNSAFE_componentWillUpdate() {} };',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'lifecycle in class expression extends PureComponent identifier',
        code: 'const A = class extends PureComponent { componentWillMount() {} };',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'method after class exit is not flagged, second class is',
        code: 'class Plain2 {} class B extends Component { componentWillMount() {} }',
        errors: [{ messageId: 'deprecated' }],
      },
    ],
  });
});

describe('no-danger-with-children coverage gaps', () => {
  ruleTester.run('no-danger-with-children', noDangerWithChildren, {
    valid: [
      { name: 'danger with empty JSX expression child', code: 'const a = <div dangerouslySetInnerHTML={{ __html: html }}>{}</div>;' },
      { name: 'danger with whitespace-only text child', code: 'const a = <div dangerouslySetInnerHTML={{ __html: html }}>   </div>;' },
      { name: 'plain createElement identifier call', code: "createElement('div', { dangerouslySetInnerHTML: x }, 'child');" },
      { name: 'non-React object createElement', code: "Foo.createElement('div', { dangerouslySetInnerHTML: x }, 'child');" },
      { name: 'deep member callee', code: "a.b.createElement('div', {}, 'child');" },
      { name: 'React.other call', code: "React.cloneElement('div', { dangerouslySetInnerHTML: x }, 'child');" },
      { name: 'computed React member callee', code: "React['createElement']('div', { dangerouslySetInnerHTML: x }, 'child');" },
      { name: 'createElement with single argument', code: "React.createElement('div');" },
      { name: 'createElement with non-object props', code: "React.createElement('div', null, 'child');" },
      { name: 'createElement with spread props only', code: "React.createElement('div', { ...props }, 'child');" },
      { name: 'createElement with computed key props', code: "React.createElement('div', { [key]: value });" },
      { name: 'createElement danger without children', code: "React.createElement('div', { dangerouslySetInnerHTML: x });" },
      { name: 'createElement children without danger', code: "React.createElement('div', { children: kids });" },
      { name: 'createElement plain props', code: "React.createElement('div', { id: 'a' });" },
    ],
    invalid: [
      {
        name: 'JSX danger with expression child',
        code: 'const a = <div dangerouslySetInnerHTML={{ __html: html }}>{content}</div>;',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'JSX danger with children prop',
        code: 'const a = <div dangerouslySetInnerHTML={{ __html: html }} children={content} />;',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'createElement danger with children prop',
        code: "React.createElement('div', { dangerouslySetInnerHTML: x, children: kids });",
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'createElement danger with extra children args',
        code: "React.createElement('div', { dangerouslySetInnerHTML: x }, 'child');",
        errors: [{ messageId: 'dangerWithChildren' }],
      },
    ],
  });
});

describe('jsx-key coverage gaps', () => {
  ruleTester.run('jsx-key', jsxKey, {
    valid: [
      { name: 'plain arrow component (not an iterator)', code: 'const f = item => <div />;' },
      { name: 'Array.from without map function', code: 'const a = Array.from(items);' },
      { name: 'Array.from with non-function second arg', code: 'const a = Array.from(items, mapper);' },
      { name: 'Array.other with function', code: 'const a = Array.of(items, item => <div />);' },
      { name: 'Other.from with function', code: 'const a = Other.from(items, item => <div />);' },
      { name: 'nested JSX inside expression container', code: 'const a = <div>{<span />}</div>;' },
      { name: 'JSX wrapped in helper call inside map', code: 'const a = items.map(item => wrap(<div />));' },
      { name: 'key present via Children.map callback', code: 'const a = Children.map(children, child => <div key={child.id} />);' },
      { name: 'non-Children non-React deep map object', code: 'const a = Foo.Children.map(children, child => <div key={child.id} />);' },
      { name: 'key without index in map', code: 'const a = items.map(item => <div key={item.id} />);' },
      {
        name: 'index key allowed when warnUnstableKeys false',
        code: 'const a = items.map((item, index) => <div key={index} />);',
        options: [{ warnUnstableKeys: false }],
      },
      { name: 'member-expression key value', code: 'const a = items.map(item => <div key={item.id.x} />);' },
      { name: 'key attribute without value in map', code: 'const a = items.map(item => <div key />);' },
    ],
    invalid: [
      {
        name: 'missing key in Array.from map function',
        code: 'const a = Array.from(items, item => <li />);',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              {
                messageId: 'suggestKey',
                output: 'const a = Array.from(items, item => <li key={item.id} />);',
              },
            ],
          },
        ],
      },
      {
        name: 'missing key in Array.from with block-body function expression',
        code: 'const a = Array.from(items, function (entry) { return <li />; });',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              {
                messageId: 'suggestKey',
                output: 'const a = Array.from(items, function (entry) { return <li key={entry.id} />; });',
              },
            ],
          },
        ],
      },
      {
        name: 'missing key in Children.map',
        code: 'const a = Children.map(children, child => <div />);',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              { messageId: 'suggestKey', output: 'const a = Children.map(children, child => <div key={child.id} />);' },
            ],
          },
        ],
      },
      {
        name: 'missing key in React.Children.map',
        code: 'const a = React.Children.map(children, child => <div />);',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              { messageId: 'suggestKey', output: 'const a = React.Children.map(children, child => <div key={child.id} />);' },
            ],
          },
        ],
      },
      {
        name: 'missing key with zero-param Children.map callback falls back to item',
        code: 'const a = Children.map(children, () => <div />);',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              { messageId: 'suggestKey', output: 'const a = Children.map(children, () => <div key={item.id} />);' },
            ],
          },
        ],
      },
      {
        name: 'missing key in function-expression map with block return',
        code: 'const a = items.map(function (row) { return <li />; });',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              { messageId: 'suggestKey', output: 'const a = items.map(function (row) { return <li key={row.id} />; });' },
            ],
          },
        ],
      },
      {
        name: 'missing key behind conditional expression in map',
        code: 'const a = items.map(item => cond ? <li /> : null);',
        errors: [
          {
            messageId: 'missingKey',
            suggestions: [
              { messageId: 'suggestKey', output: 'const a = items.map(item => cond ? <li key={item.id} /> : null);' },
            ],
          },
        ],
      },
      {
        name: 'unstable index key in map',
        code: 'const a = items.map((item, i) => <div key={i} />);',
        errors: [{ messageId: 'unstableKey' }],
      },
      {
        name: 'unstable idx key in Array.from',
        code: 'const a = Array.from(items, (item, idx) => <div key={idx} />);',
        errors: [{ messageId: 'unstableKey' }],
      },
    ],
  });
});

const nestedDestructuringCode = `useEffect(() => {
          const { b: { nested } } = source;
          const { ...restObj } = source;
          const [ , [inner]] = list;
          const cb = ({ p: { q } }, [ , [w]]) => q + w;
          const cb2 = (...[first]) => first;
          const cb3 = ({ pat } = {}) => pat;
          cb(); cb2(); cb3();
          Use(nested, restObj, inner);
        }, [source, list]);`;

describe('hooks-exhaustive-deps coverage gaps', () => {
  ruleTester.run('hooks-exhaustive-deps', hooksExhaustiveDeps, {
    valid: [
      { name: 'hook without arguments', code: 'useEffect();' },
      { name: 'hook with non-function callback', code: 'useEffect(callbackRef, [dep]);' },
      { name: 'hook without deps array', code: 'useEffect(() => { run(); });' },
      { name: 'non-hook member call', code: 'foo.useEffect(() => { run(); }, [missing]);' },
      { name: 'computed React member call is not a hook', code: "React['useEffect'](() => { run(); }, [missing]);" },
      {
        name: 'top-level destructuring and callback params are local',
        code: `useEffect(() => {
          const { a } = source;
          const [c] = list;
          function helper() { return a + c; }
          helper();
          fetchData().then((result) => Use(result));
          const cb = ({ x, ...restProps }, [y], ...args) => x + y + args.length + restProps.z;
          const withDefault = (z = 1) => z;
          cb();
          withDefault();
        }, [source, list, fetchData]);`,
      },
      {
        name: 'member expression dependency declared',
        code: 'useEffect(() => { Render(props.value); }, [props, props.value]);',
      },
      {
        name: 'computed member access adds both roots',
        code: 'useEffect(() => { Render(table[rowId]); }, [table, rowId]);',
      },
      {
        name: 'as-const deps array with no missing deps',
        code: 'useEffect(() => {}, [] as const);',
      },
      {
        name: 'regex literal inside callback body',
        code: 'useEffect(() => { const re = /abc/; re.test(""); }, []);',
      },
      {
        name: 'stable setState and refs are skipped',
        code: 'useEffect(() => { setCount(1); dispatch(); nodeRef.current = 1; }, []);',
      },
    ],
    invalid: [
      {
        name: 'React.useEffect namespaced hook detects missing dep',
        code: 'React.useEffect(() => { Render(value); }, []);',
        errors: [
          {
            messageId: 'missingDep',
            data: { hookName: 'useEffect', deps: 'value' },
            suggestions: [
              {
                messageId: 'suggestAddDep',
                output: 'React.useEffect(() => { Render(value); }, [value]);',
              },
            ],
          },
        ],
      },
      {
        name: 'deps not an array literal',
        code: 'useEffect(() => {}, deps);',
        errors: [{ messageId: 'depsNotArrayLiteral', data: { hookName: 'useEffect' } }],
      },
      {
        name: 'missing dep appended after existing element',
        code: 'useMemo(() => Compute(alpha, beta), [alpha]);',
        errors: [
          {
            messageId: 'missingDep',
            suggestions: [
              {
                messageId: 'suggestAddDep',
                output: 'useMemo(() => Compute(alpha, beta), [alpha, beta]);',
              },
            ],
          },
        ],
      },
      {
        name: 'extra first dep removed with following comma',
        code: 'useEffect(() => {}, [unusedA, unusedB]);',
        errors: [
          {
            messageId: 'extraDep',
            data: { hookName: 'useEffect', dep: 'unusedA' },
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useEffect(() => {}, [unusedB]);',
              },
            ],
          },
          {
            messageId: 'extraDep',
            data: { hookName: 'useEffect', dep: 'unusedB' },
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useEffect(() => {}, [unusedA]);',
              },
            ],
          },
        ],
      },
      {
        name: 'single extra dep removed directly',
        code: 'useEffect(() => {}, [unusedOnly]);',
        errors: [
          {
            messageId: 'extraDep',
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useEffect(() => {}, []);',
              },
            ],
          },
        ],
      },
      {
        name: 'sparse deps array: first element with null next falls back to remove',
        code: 'useEffect(() => {}, [unusedA, , unusedB]);',
        errors: [
          {
            messageId: 'extraDep',
            data: { hookName: 'useEffect', dep: 'unusedA' },
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useEffect(() => {}, [, , unusedB]);',
              },
            ],
          },
          {
            messageId: 'extraDep',
            data: { hookName: 'useEffect', dep: 'unusedB' },
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useEffect(() => {}, [unusedA, , ]);',
              },
            ],
          },
        ],
      },
      {
        name: 'as-const non-empty deps with extra dep',
        code: 'useCallback(() => {}, [unusedZ] as const);',
        errors: [
          {
            messageId: 'extraDep',
            suggestions: [
              {
                messageId: 'suggestRemoveDep',
                output: 'useCallback(() => {}, [] as const);',
              },
            ],
          },
        ],
      },
      {
        name: 'additionalHooks pattern matches custom hook',
        code: 'useMyThing(() => { Render(value); }, []);',
        options: [{ additionalHooks: '^useMyThing$' }],
        errors: [
          {
            messageId: 'missingDep',
            data: { hookName: 'useMyThing', deps: 'value' },
            suggestions: [
              {
                messageId: 'suggestAddDep',
                output: 'useMyThing(() => { Render(value); }, [value]);',
              },
            ],
          },
        ],
      },
      {
        name: 'missing dep inserted into empty array',
        code: 'useEffect(() => { Render(value); }, []);',
        errors: [
          {
            messageId: 'missingDep',
            suggestions: [
              {
                messageId: 'suggestAddDep',
                output: 'useEffect(() => { Render(value); }, [value]);',
              },
            ],
          },
        ],
      },
      {
        name: 'nested destructuring patterns are traversed but not declared',
        code: nestedDestructuringCode,
        errors: [
          {
            messageId: 'missingDep',
            data: {
              hookName: 'useEffect',
              deps: 'b, nested, restObj, inner, q, w, p, first, pat',
            },
            // One add-dep suggestion per missing identifier: nested pattern
            // names are traversed (reported) but not declared (not local).
            suggestions: ['b', 'nested', 'restObj', 'inner', 'q', 'w', 'p', 'first', 'pat'].map(
              (dep) => ({
                messageId: 'suggestAddDep' as const,
                data: { dep },
                output: nestedDestructuringCode.replace('[source, list]', `[source, list, ${dep}]`),
              })
            ),
          },
        ],
      },
      {
        name: 'TSAsExpression deps that is not an array literal',
        code: 'useEffect(() => {}, deps as string[]);',
        errors: [{ messageId: 'depsNotArrayLiteral' }],
      },
      {
        name: 'function declaration id inside callback is local, outer fn is missing',
        code: 'useEffect(() => { function localFn() { outerFn(); } localFn(); }, []);',
        errors: [
          {
            messageId: 'missingDep',
            data: { hookName: 'useEffect', deps: 'outerFn' },
            suggestions: [{ messageId: 'suggestAddDep', output: 'useEffect(() => { function localFn() { outerFn(); } localFn(); }, [outerFn]);' }],
          },
        ],
      },
    ],
  });
});
