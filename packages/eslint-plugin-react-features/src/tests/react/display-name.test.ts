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
        // The binding names the component through the wrapper.
        { code: `const Row = memo(() => <div>Hello</div>);` },
        { code: `const Row = React.memo(() => <div>Hello</div>);` },
        { code: `const Row = forwardRef((props, ref) => <div ref={ref} />);` },
        {
          code: `const Row = React.forwardRef((props, ref) => <div ref={ref} />);`,
        },
        // Nested wrappers still resolve to the outer binding.
        {
          code: `const Row = memo(forwardRef((props, ref) => <div ref={ref} />));`,
        },
        // Assignment and property positions carry a name too.
        { code: `Table.Row = memo(() => <div>Hello</div>);` },
        { code: `const parts = { Row: memo(() => <div>Hello</div>) };` },
        { code: `class Table { static Row = memo(() => <div>Hello</div>); }` },
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
   * inside it).
   */
  describe('wrapper calls are reported on the call', () => {
    ruleTester.run('wrapper call location', displayName, {
      valid: [
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
      ],
      invalid: [
        {
          name: 'an inline memo reports the memo call, not the arrow inside it',
          code: `render(React.memo(() => <div>Hello</div>));`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 8,
              endLine: 1,
              endColumn: 42,
            },
          ],
        },
        {
          name: 'an inline forwardRef reports the forwardRef call',
          code: `render(React.forwardRef((props, ref) => <div ref={ref} />));`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 8,
              endLine: 1,
              endColumn: 59,
            },
          ],
        },
        {
          name: 'a forwardRef built by the default-exported factory reports the call, not the factory',
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
          // upstream display-name.js, invalid: the Card case, `line: 9, column: 18` is the memo call
          name: 'a memo returned from an IIFE reports at the memo call',
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
          name: 'a nested wrapper chain is one component, reported on the outermost call',
          code: `render(memo(forwardRef((p, ref) => <div ref={ref} />)));`,
          errors: [
            {
              messageId: 'displayName',
              line: 1,
              column: 8,
              endLine: 1,
              endColumn: 55,
            },
          ],
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
        { code: `render(memo(() => 42));` },
        // A wrapper call whose argument is not a function at all.
        { code: `render(memo(Existing));` },
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
        { code: `render(memo(function Row() { return <div>Hello</div>; }));` },
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
