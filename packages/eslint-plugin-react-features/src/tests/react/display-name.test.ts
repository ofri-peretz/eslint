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
        { code: `function Profile() { return <div>Hello</div>; }` },
        { code: `const Profile = () => { return <div>Hello</div>; };` },
        { code: `const Profile = () => <div>Hello</div>;` },
        { code: `const Profile = function() { return <div>Hello</div>; };` },
        { code: `export default function Profile() { return <div>Hello</div>; }` },
        // A named class takes its name from Class.name; displayName is optional.
        { code: `class Profile extends Component { render() { return <div>A</div>; } }` },
        { code: `class Profile extends React.Component { render() { return <div>A</div>; } }` },
        { code: `class Profile extends PureComponent { render() { return <div>A</div>; } }` },
        { code: `class Profile extends React.PureComponent { render() { return <div>A</div>; } }` },
        // The binding names the component through the wrapper.
        { code: `const Row = memo(() => <div>Hello</div>);` },
        { code: `const Row = React.memo(() => <div>Hello</div>);` },
        { code: `const Row = forwardRef((props, ref) => <div ref={ref} />);` },
        { code: `const Row = React.forwardRef((props, ref) => <div ref={ref} />);` },
        // Nested wrappers still resolve to the outer binding.
        { code: `const Row = memo(forwardRef((props, ref) => <div ref={ref} />));` },
        // Assignment and property positions carry a name too.
        { code: `Table.Row = memo(() => <div>Hello</div>);` },
        { code: `const parts = { Row: memo(() => <div>Hello</div>) };` },
        { code: `class Table { static Row = memo(() => <div>Hello</div>); }` },
        { code: `const Row = class extends Component { render() { return <div>A</div>; } };` },
      ],
      invalid: [],
    });
  });

  describe('anonymous components are reported', () => {
    ruleTester.run('anonymous components', displayName, {
      valid: [],
      invalid: [
        {
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
        { code: `export default class extends BaseService { fetch() { return 'd'; } }` },
        { code: `export default class extends Utils.BaseService { fetch() { return 'd'; } }` },
        { code: `export default class extends Other.Component { render() { return 'd'; } }` },
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
      ],
    });
  });
});
