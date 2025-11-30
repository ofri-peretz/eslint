/**
 * Tests for state-in-constructor rule
 * Enforce state initialization in constructor
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { stateInConstructor } from '../rules/react/state-in-constructor';

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

describe('state-in-constructor', () => {
  describe('Valid cases - state in constructor', () => {
    ruleTester.run('state in constructor is valid', stateInConstructor, {
      valid: [
        // State initialized in constructor
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.state = { count: 0 };
              }
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
        },
        // React.Component with state in constructor
        {
          code: `
            class MyComponent extends React.Component {
              constructor(props) {
                super(props);
                this.state = { value: '' };
              }
              render() {
                return <div>{this.state.value}</div>;
              }
            }
          `,
        },
        // PureComponent with state in constructor
        {
          code: `
            class MyComponent extends PureComponent {
              constructor(props) {
                super(props);
                this.state = { active: true };
              }
              render() {
                return <div>{this.state.active}</div>;
              }
            }
          `,
        },
        // React.PureComponent with state in constructor
        {
          code: `
            class MyComponent extends React.PureComponent {
              constructor(props) {
                super(props);
                this.state = { loading: false };
              }
              render() {
                return <div>{this.state.loading}</div>;
              }
            }
          `,
        },
        // No state at all
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Non-React class
        {
          code: `
            class Helper {
              state = { value: 0 };
            }
          `,
        },
        // Non-React class with different superClass
        {
          code: `
            class Service extends BaseService {
              state = { data: null };
            }
          `,
        },
        // Class without superClass
        {
          code: `
            class Utility {
              state = { enabled: true };
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - state as class property', () => {
    ruleTester.run('state as class property triggers error', stateInConstructor, {
      valid: [],
      invalid: [
        // State as class property in Component
        {
          code: `
            class MyComponent extends Component {
              state = { count: 0 };
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
        // State as class property in React.Component
        {
          code: `
            class MyComponent extends React.Component {
              state = { value: '' };
              render() {
                return <div>{this.state.value}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
        // State as class property in PureComponent
        {
          code: `
            class MyComponent extends PureComponent {
              state = { active: true };
              render() {
                return <div>{this.state.active}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
        // State as class property in React.PureComponent
        {
          code: `
            class MyComponent extends React.PureComponent {
              state = { loading: false };
              render() {
                return <div>{this.state.loading}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', stateInConstructor, {
      valid: [
        // Both property and constructor (constructor takes precedence)
        {
          code: `
            class MyComponent extends Component {
              state = { initial: true };
              constructor(props) {
                super(props);
                this.state = { count: 0 };
              }
              render() {
                return <div>{this.state.count}</div>;
              }
            }
          `,
        },
        // Constructor with other assignments (not state)
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.ref = React.createRef();
              }
              render() {
                return <div ref={this.ref}>Hello</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        // State property with constructor that doesn't set state
        {
          code: `
            class MyComponent extends Component {
              state = { value: '' };
              constructor(props) {
                super(props);
                this.ref = React.createRef();
              }
              render() {
                return <div ref={this.ref}>{this.state.value}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
      ],
    });
  });

  describe('Complex state patterns', () => {
    ruleTester.run('complex state patterns', stateInConstructor, {
      valid: [
        // Complex state object in constructor
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.state = {
                  user: null,
                  loading: false,
                  error: null,
                  items: []
                };
              }
              render() {
                return <div>{this.state.loading}</div>;
              }
            }
          `,
        },
        // State derived from props in constructor
        {
          code: `
            class MyComponent extends Component {
              constructor(props) {
                super(props);
                this.state = {
                  value: props.defaultValue || ''
                };
              }
              render() {
                return <div>{this.state.value}</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        // Complex state as class property
        {
          code: `
            class MyComponent extends Component {
              state = {
                user: null,
                loading: false,
                error: null,
                items: []
              };
              render() {
                return <div>{this.state.loading}</div>;
              }
            }
          `,
          errors: [{ messageId: 'stateInConstructor' }],
        },
      ],
    });
  });
});

