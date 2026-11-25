/**
 * Tests for display-name rule
 *
 * The rule reports components React cannot name — not every component that
 * lacks an explicit `displayName`. See the note on the "named components"
 * block below: the previous suite asserted the opposite, and passed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { displayName } from '../../rules/react/display-name';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('display-name', () => {
  /**
   * Regression lock — a named component is already named.
   *
   * Every case here was previously reported, and the old suite asserted each
   * one as an error. React reads the display name off `Function.name` /
   * `Class.name`, so `function Profile()` and `const Profile = () =>` show up
   * in DevTools as `Profile` with no `displayName` anywhere. Reporting them
   * means firing on essentially every component in every React codebase —
   * measured at 4 of 67 files on the benchmark's safe corpus, all of them
   * this defect.
   */
  describe('named components are not reported', () => {
    ruleTester.run('named components', displayName, {
      valid: [
        {
          name: 'a named function',
          code: `function Profile() { return <div>Hello</div>; }`,
        },
        {
          name: 'an arrow function bound to a name',
          code: `const Profile = () => { return <div>Hello</div>; };`,
        },
        { code: `const Profile = () => <div>Hello</div>;` },
        { code: `const Profile = function() { return <div>Hello</div>; };` },
        {
          code: `export default function Profile() { return <div>Hello</div>; }`,
        },
        // A named class takes its name from Class.name; displayName is optional.
        {
          code: `class Profile extends Component { render() { return <div>A</div>; } }`,
        },
        {
          code: `class Profile extends React.Component { render() { return <div>A</div>; } }`,
        },
        {
          code: `class Profile extends PureComponent { render() { return <div>A</div>; } }`,
        },
        {
          code: `class Profile extends React.PureComponent { render() { return <div>A</div>; } }`,
        },
        {
          name: 'a class component handed to a wrapper takes the name of the binding',
          code: `const Row = memo(class extends Component { render() { return <div>A</div>; } });`,
        },
        {
          name: 'a wrapped class component bound through a type assertion',
          code: `const Row = memo(class extends Component { render() { return <div>A</div>; } }) as any;`,
        },
        {
          name: 'an anonymous class assigned to a member is named by its position',
          code: `Table.Row = class extends Component { render() { return <div>A</div>; } };`,
        },
        {
          name: 'an anonymous class held by an object property is named by its position',
          code: `const parts = { Row: class extends Component { render() { return <div>A</div>; } } };`,
        },
        {
          name: 'an anonymous class held by a static class property is named by its position',
          code: `class Table { static Row = class extends Component { render() { return <div>A</div>; } }; }`,
        },
        {
          name: 'FP: a default-exported factory is not a component, and the forwardRef it builds is named',
          // @found react-bootstrap/react-bootstrap 2026-11-24 (src/divWithClassName.tsx: one extra report, on the factory)
          code: `import * as React from 'react';
export default (className: string) => {
  const Div = React.forwardRef<HTMLDivElement, any>((p, ref) => <div {...p} ref={ref} className={className} />);
  Div.displayName = 'Div';
  return Div;
};`,
        },
        // A wrapper holding a named function takes its name from that function.
        {
          name: 'memo around a named function expression',
          code: `const Row = memo(function Row() { return <div>Hello</div>; });`,
        },
        {
          name: 'forwardRef around a named function expression',
          code: `const Row = React.forwardRef(function Row(props, ref) { return <div ref={ref} />; });`,
        },
        // The binding does not name an arrow handed to a wrapper: `Row.name` is
        // the wrapper's, and DevTools shows the component as `Anonymous`. An
        // explicit displayName is the name, and it names the component wherever
        // the wrapper is bound.
        {
          name: 'displayName set on the bound memo',
          code: `const Row = memo(() => <div>Hello</div>); Row.displayName = 'Row';`,
        },
        {
          name: 'displayName set on a forwardRef bound with a type assertion',
          code: `const Row = React.forwardRef((props, ref) => <main />) as SomeComponent; Row.displayName = 'Row';`,
        },
        {
          name: 'displayName set on the wrapper held by an object property',
          code: `const parts = { Row: memo(() => <div>Hello</div>) }; parts.Row.displayName = 'Row';`,
        },
        // Nested wrappers are one component, and from React 16.12 the nested
        // forwardRef is named through the outer memo (upstream display-name
        // tests, "Nested React.forwardRef should be accepted").
        {
          name: 'memo around forwardRef on a current React',
          code: `const Row = memo(forwardRef((props, ref) => <div ref={ref} />));`,
        },
        {
          name: 'memo around forwardRef, unbound, on a current React',
          code: `export default memo(forwardRef((props, ref) => <div ref={ref} />));`,
        },
        {
          code: `const Row = class extends Component { render() { return <div>A</div>; } };`,
        },
      ],
      invalid: [],
    });
  });

  describe('anonymous components are reported', () => {
    ruleTester.run('anonymous components', displayName, {
      valid: [],
      invalid: [
        {
          name: 'an anonymous arrow as the default export — the devtools show nothing',
          code: `export default () => <div>Hello</div>;`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `export default function() { return <div>Hello</div>; }`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `export default class extends Component { render() { return <div>A</div>; } }`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `export default class extends React.PureComponent { render() { return <div>A</div>; } }`,
          errors: [{ messageId: 'displayName' }],
        },
        // A wrapper call with nothing to take a name from — passed inline.
        {
          code: `render(memo(() => <div>Hello</div>));`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `render(React.forwardRef((props, ref) => <div ref={ref} />));`,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  /**
   * Wrapper calls: the component is the call, so the report stands on the call.
   *
   * eslint-plugin-react 7.37.5 reports `React.memo(...)` / `React.forwardRef(...)`
   * with the wrapper call as the node (tests/lib/rules/display-name.js, the
   * "Card" case: `line: 9, column: 18` is the `React.memo` call, not the arrow
   * inside it), and reports it whether or not the call is bound to a variable:
   * the arrow handed to the wrapper has no name of its own.
   */
  describe('wrapper calls are reported on the call', () => {
    ruleTester.run('wrapper calls', displayName, {
      valid: [],
      invalid: [
        {
          // upstream display-name.js, invalid: "const ComponentWithMemo = React.memo(({ world }) => {"
          name: 'a bound memo around an arrow reports the memo call',
          code: `import React from 'react'
const ComponentWithMemo = React.memo(({ world }) => {
  return <div>Hello {world}</div>
})`,
          errors: [
            {
              messageId: 'displayName',
              line: 2,
              column: 27,
              endLine: 4,
              endColumn: 3,
            },
          ],
        },
        {
          // upstream display-name.js, invalid: "const ComponentWithMemo = React.memo(function() {"
          name: 'a bound memo around an anonymous function expression',
          code: `const Row = React.memo(function() { return <div>Hello</div>; });`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 13,
              endLine: 1,
              endColumn: 64,
            },
          ],
        },
        {
          // upstream display-name.js, invalid: "const ForwardRefComponentLike = React.forwardRef(({ world }, ref) => {"
          name: 'a bound forwardRef around an arrow reports the forwardRef call',
          code: `const Row = React.forwardRef(({ world }, ref) => { return <div ref={ref}>Hello {world}</div>; });`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 13,
              endLine: 1,
              endColumn: 97,
            },
          ],
        },
        {
          name: 'a memo whose arrow returns null',
          code: `const Row = React.memo(() => null);`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 13,
              endLine: 1,
              endColumn: 35,
            },
          ],
        },
        {
          name: 'a memo bound to an object property',
          code: `import { memo } from 'react';
const parts = { Row: memo(() => <div>Hello</div>) };`,
          errors: [
            {
              messageId: 'displayName',
              line: 2,
              column: 22,
              endLine: 2,
              endColumn: 50,
            },
          ],
        },
        {
          name: 'a memo assigned to a member',
          code: `import { memo } from 'react';
Table.Row = memo(() => <div>Hello</div>);`,
          errors: [
            {
              messageId: 'displayName',
              line: 2,
              column: 13,
              endLine: 2,
              endColumn: 41,
            },
          ],
        },
        {
          name: 'a memo held by a static class property',
          code: `class Table { static Row = memo(() => <div>Hello</div>); }`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 28,
              endLine: 1,
              endColumn: 56,
            },
          ],
        },
        {
          name: 'a bound memo around an arrow that returns a number',
          code: `const Row = memo(() => 42);`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 13,
              endLine: 1,
              endColumn: 27,
            },
          ],
        },
        {
          name: 'a forwardRef built inside the default-exported factory reports the call, not the factory',
          // @found react-bootstrap/react-bootstrap 2026-11-24 (src/divWithClassName.tsx)
          code: `import * as React from 'react';
export default (className: string) =>
  React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>((p, ref) => (
    <div {...p} ref={ref} className={className} />
  ));`,
          errors: [
            {
              messageId: 'displayName',
              line: 3,
              column: 3,
              endLine: 5,
              endColumn: 5,
            },
          ],
        },
        {
          // upstream display-name.js, invalid: "export default class extends React.PureComponent" with the Card IIFE
          name: 'a memo returned from an IIFE reports at the memo call (line 9, column 18 upstream)',
          code: `export default class extends React.PureComponent {
  render() {
    return <Card />;
  }
}

const Card = (() => {
  return React.memo(({ }) => (
    <div />
  ));
})();`,
          errors: [
            { messageId: 'displayName', line: 1, column: 16 },
            {
              messageId: 'displayName',
              line: 8,
              column: 10,
              endLine: 10,
              endColumn: 5,
            },
          ],
        },
        {
          name: 'a factory returning forwardRef is not itself a component',
          code: `import React from 'react';
function make() { return React.forwardRef((p, ref) => <div ref={ref} />); }`,
          errors: [{ messageId: 'displayName', line: 2, column: 26 }],
        },
        {
          // upstream display-name.js, invalid, settings.react.version 15.6.0
          name: 'memo around forwardRef on React 15.6',
          code: `const Row = React.memo(
  React.forwardRef(({ world }, ref) => {
    return <div ref={ref}>Hello {world}</div>
  })
)`,
          settings: { react: { version: '15.6.0' } },
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 13,
              endLine: 5,
              endColumn: 2,
            },
          ],
        },
        {
          // upstream display-name.js, invalid, settings.react.version 0.14.2
          name: 'memo around forwardRef on React 0.14.2',
          code: `const Row = React.memo(
  React.forwardRef(function({ world }, ref) {
    return <div ref={ref}>Hello {world}</div>
  })
)`,
          settings: { react: { version: '0.14.2' } },
          errors: [{ messageId: 'displayName', line: 1, column: 13 }],
        },
        {
          // upstream display-name.js, invalid, settings.react.version 15.0.1:
          // "ComponentWithMemoAndForwardRef gets shown as Memo(Anonymous)"
          name: 'memo around a named forwardRef function on React 15.0.1',
          code: `const Row = React.memo(
  React.forwardRef(function ComponentLike({ world }, ref) {
    return <div ref={ref}>Hello {world}</div>
  })
)`,
          settings: { react: { version: '15.0.1' } },
          errors: [{ messageId: 'displayName', line: 1, column: 13 }],
        },
        {
          name: 'memo around forwardRef on a React in the 16.12 range reports nothing; one below does',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '16.11.0' } },
          errors: [{ messageId: 'displayName', line: 1, column: 16 }],
        },
      ],
    });
    ruleTester.run('nested wrappers on a supporting React', displayName, {
      valid: [
        {
          name: 'React 15.7 names the nested forwardRef',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '15.7.0' } },
        },
        {
          name: 'React 16.12 names the nested forwardRef',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '16.12.0' } },
        },
        {
          name: 'React 0.14.10 names the nested forwardRef',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '0.14.10' } },
        },
      ],
      invalid: [
        {
          name: 'React 16.0 does not',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '16.0.0' } },
          errors: [{ messageId: 'displayName' }],
        },
        {
          name: 'React 15.6 does not',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '15.6.9' } },
          errors: [{ messageId: 'displayName' }],
        },
        {
          name: 'React 0.14.9 does not',
          code: `export default memo(forwardRef((p, ref) => <div ref={ref} />));`,
          settings: { react: { version: '0.14.9' } },
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('non-components are out of scope', () => {
    ruleTester.run('non-components', displayName, {
      valid: [
        // No JSX — not a component, regardless of anonymity.
        { code: `export default () => 'hello';` },
        { code: `export default function() { return 42; }` },
        { code: `export default { key: 'value' };` },
        // A wrapper call whose argument is not a function at all.
        {
          name: 'memo around an existing component',
          code: `render(memo(Existing));`,
        },
        { code: `render(memo());` },
        // Not a React wrapper.
        { code: `render(compute(() => <div>Hello</div>));` },
        { code: `render(lib.compute(() => <div>Hello</div>));` },
        { code: `render(memo[key](() => <div>Hello</div>));` },
        // A class that does not extend a React base.
        {
          code: `export default class extends BaseService { fetch() { return 'd'; } }`,
        },
        {
          code: `export default class extends Utils.BaseService { fetch() { return 'd'; } }`,
        },
        {
          code: `export default class extends Other.Component { render() { return 'd'; } }`,
        },
        { code: `export default class {}` },
        // An anonymous class component that names itself explicitly.
        {
          code: `export default class extends Component { static displayName = 'Row'; render() { return <div>A</div>; } }`,
        },
        // A named function expression keeps its own name.
        {
          name: 'memo around a named function expression, passed inline',
          code: `render(memo(function Row() { return <div>Hello</div>; }));`,
        },
        { code: `export default function Row() { return <div>Hello</div>; }` },
        { code: `` },
      ],
      invalid: [],
    });
  });

  describe('JSX detection', () => {
    ruleTester.run('jsx shapes', displayName, {
      valid: [],
      invalid: [
        {
          code: `export default () => (<div><header><h1>Title</h1></header></div>);`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `export default () => (<><div>A</div><div>B</div></>);`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          code: `export default ({ show }) => show ? <div>Visible</div> : null;`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          name: 'an anonymous default export rendering through React.createElement',
          code: `import React from 'react'; export default (p) => React.createElement('div', null, p.x);`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          name: 'a renamed memo import with no binding',
          code: `import { memo as m } from 'react'; export default m(() => <div />);`,
          errors: [{ messageId: 'displayName' }],
        },
        {
          name: 'an anonymous class extending a renamed Component import',
          code: `import { Component as Base } from 'react'; export default class extends Base { render() { return <div />; } }`,
          errors: [{ messageId: 'displayName' }],
        },
      ],
    });
  });

  describe('bindings that are not React', () => {
    ruleTester.run('not react', displayName, {
      valid: [
        {
          name: 'a local memo is not React.memo',
          code: `const memo = (f) => f; export default memo(() => <div />);`,
        },
        {
          name: 'a Component class from another library',
          code: `import { Component } from 'lit'; export default class extends Component { render() { return <div />; } }`,
        },
        {
          name: 'a local createElement is not React rendering',
          code: `const createElement = (t) => t; export default () => createElement('div');`,
        },
      ],
      invalid: [],
    });
  });
});
