/**
 * Tests for no-typos rule
 * Catch common typos
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTypos } from '../../rules/react/no-typos';

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

describe('no-typos', () => {
  describe('Valid cases - correct spellings', () => {
    ruleTester.run('correct spellings are valid', noTypos, {
      valid: [
        // Correct defaultProps
        {
          name: 'defaultProps',
          code: `
            class MyComponent extends Component {
              static defaultProps = {};
            }
          `,
        },
        // Correct componentDidMount
        {
          code: `
            class MyComponent extends Component {
              componentDidMount() {}
            }
          `,
        },
        // Correct componentDidUpdate
        {
          code: `
            class MyComponent extends Component {
              componentDidUpdate() {}
            }
          `,
        },
        // Correct componentWillUnmount
        {
          code: `
            class MyComponent extends Component {
              componentWillUnmount() {}
            }
          `,
        },
        // Correct shouldComponentUpdate
        {
          code: `
            class MyComponent extends Component {
              shouldComponentUpdate() { return true; }
            }
          `,
        },
        // Correct getSnapshotBeforeUpdate
        {
          code: `
            class MyComponent extends Component {
              getSnapshotBeforeUpdate() { return null; }
            }
          `,
        },
        // Correct UNSAFE methods
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componentWillMount() {}
              UNSAFE_componentWillReceiveProps() {}
              UNSAFE_componentWillUpdate() {}
            }
          `,
        },
        // Random property names
        {
          code: `
            class MyComponent extends Component {
              myCustomProperty = true;
              myCustomMethod() {}
            }
          `,
        },
        // Regular member expression
        {
          code: `this.someProperty`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - typos in class properties', () => {
    ruleTester.run('typos in class properties trigger error', noTypos, {
      valid: [],
      invalid: [
        // defaulProps typo
        {
          name: 'defaulProps — a static React never reads',
          code: `
            class MyComponent extends Component {
              static defaulProps = {};
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // defalutProps typo
        {
          code: `
            class MyComponent extends Component {
              static defalutProps = {};
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // defualtProps typo
        {
          code: `
            class MyComponent extends Component {
              static defualtProps = {};
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
      ],
    });
  });

  describe('Invalid cases - typos in method names', () => {
    ruleTester.run('typos in method names trigger error', noTypos, {
      valid: [
        {
          name: 'a static propTypes on a component is the right spelling',
          code: `class C extends React.Component { static propTypes = {}; static getDerivedStateFromProps() { return null; } }`,
        },
        {
          name: 'a typo on a class that is not a React component',
          code: `class Painter { ComponentDidMount() {} static PropTypes = {}; }`,
        },
        {
          name: 'a Component from another library is not React',
          code: `import { Component } from 'lit';
          class El extends Component { componenDidMount() {} }`,
        },
        {
          name: 'a private member is never a lifecycle',
          code: `class C extends React.Component { #ComponentDidMount() {} }`,
        },
      ],
      invalid: [
        {
          name: 'a lifecycle in another letter case',
          code: `import { Component as Base } from 'react';
          class C extends Base { ComponentDidMount() {} }`,
          errors: [{ messageId: 'noTypos' }],
        },
        {
          name: 'a static in another letter case',
          code: `class C extends React.PureComponent { static PropTypes = {}; }`,
          errors: [{ messageId: 'noTypos' }],
        },
        {
          name: 'an instance lifecycle declared static never runs',
          code: `class C extends React.Component { static componentDidMount() {} }`,
          errors: [{ messageId: 'noTypos' }],
        },
        {
          name: 'getDerivedStateFromProps declared on the instance never runs',
          code: `import * as R from 'react';
          const C = class extends R.Component { getDerivedStateFromProps() { return null; } };`,
          errors: [{ messageId: 'noTypos' }],
        },
        // componenDidMount typo
        {
          code: `
            class MyComponent extends Component {
              componenDidMount() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // componenDidUpdate typo
        {
          code: `
            class MyComponent extends Component {
              componenDidUpdate() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // componenWillUnmount typo
        {
          code: `
            class MyComponent extends Component {
              componenWillUnmount() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // shoudComponentUpdate typo
        {
          code: `
            class MyComponent extends Component {
              shoudComponentUpdate() { return true; }
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // getSnapshoBeforeUpdate typo
        {
          code: `
            class MyComponent extends Component {
              getSnapshoBeforeUpdate() { return null; }
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
      ],
    });
  });

  describe('Invalid cases - typos in UNSAFE methods', () => {
    ruleTester.run('typos in UNSAFE methods trigger error', noTypos, {
      valid: [],
      invalid: [
        // UNSAFE_componenWillMount typo
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componenWillMount() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // UNSAFE_componenWillReceiveProps typo
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componenWillReceiveProps() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
        // UNSAFE_componenWillUpdate typo
        {
          code: `
            class MyComponent extends Component {
              UNSAFE_componenWillUpdate() {}
            }
          `,
          errors: [{ messageId: 'noTypos' }],
        },
      ],
    });
  });

  describe('Invalid cases - typos in member expressions', () => {
    ruleTester.run('typos in member expressions trigger error', noTypos, {
      valid: [
        {
          name: 'reading a property of an object the file does not prove is a component',
          code: `Component.defaulProps`,
        },
        {
          name: 'reading a property off this',
          code: `this.defaulProps`,
        },
        {
          name: 'reading a correctly spelt static',
          code: `class C extends React.Component {} const shape = { ...C.propTypes, name: PropTypes.string };`,
        },
        {
          name: 'the exact static spelling assigned to a component',
          code: `class C extends React.Component {} C.defaultProps = {};`,
        },
        {
          name: 'a misspelt static assigned to a plain class',
          code: `class C {} C.DefaultProps = {};`,
        },
        {
          name: 'a misspelt static assigned to an object',
          code: `const C = {}; C.DefaultProps = {};`,
        },
        {
          name: 'a misspelt static assigned to a computed target',
          code: `class C extends React.Component {} things[0].DefaultProps = {};`,
        },
        {
          name: 'a misspelt static assigned to a function (a component or not, the file does not prove)',
          code: `function C() { return null; } C.DefaultProps = {};`,
        },
        {
          name: 'a plain variable assignment',
          code: `let x = 0; x = 1;`,
        },
        {
          name: 'an assignment to a name declared nowhere',
          code: `Undeclared.DefaultProps = {};`,
        },
      ],
      invalid: [
        {
          name: 'a misspelt static assigned to a class component',
          code: `class C extends React.Component {} C.DefaultProps = {};`,
          errors: [{ messageId: 'noTypos' }],
        },
        {
          name: 'a misspelt static assigned to a class expression component, through a cast',
          code: `const C = class extends React.Component {}; (C as any).defaulProps = {};`,
          errors: [{ messageId: 'noTypos' }],
        },
      ],
    });
  });

  describe('Multiple typos', () => {
    ruleTester.run('multiple typos', noTypos, {
      valid: [],
      invalid: [
        // Multiple typos in same class
        {
          code: `
            class MyComponent extends Component {
              static defaulProps = {};
              componenDidMount() {}
              shoudComponentUpdate() { return true; }
            }
          `,
          errors: [
            { messageId: 'noTypos' },
            { messageId: 'noTypos' },
            { messageId: 'noTypos' },
          ],
        },
      ],
    });
  });
});

