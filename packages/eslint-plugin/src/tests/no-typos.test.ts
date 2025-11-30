/**
 * Tests for no-typos rule
 * Catch common typos
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTypos } from '../rules/react/no-typos';

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
      valid: [],
      invalid: [
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
      valid: [],
      invalid: [
        // Access to typo property
        {
          code: `Component.defaulProps`,
          errors: [{ messageId: 'noTypos' }],
        },
        // Access to typo property via this
        {
          code: `this.defaulProps`,
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

