/**
 * Tests for no-children-prop rule
 * Disallow passing children as props (dangerous pattern)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noChildrenProp } from '../rules/react/no-children-prop';

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

describe('no-children-prop', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-children-prop validation', noChildrenProp, {
      valid: [
        // Normal JSX children usage
        {
          code: '<div>Hello World</div>',
        },
        {
          code: '<Component><span>Child</span></Component>',
        },
        // Other props are allowed
        {
          code: '<input type="text" value="test" />',
        },
        {
          code: '<MyComponent prop1="value1" prop2={42} />',
        },
        // Self-closing tags
        {
          code: '<br />',
        },
        {
          code: '<img src="test.jpg" alt="test" />',
        },
      ],
      invalid: [
        // children as a prop
        {
          code: '<div children="Hello World" />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children with JSX expression
        {
          code: '<Component children={<span>Child</span>} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children with array
        {
          code: '<List children={[<Item key="1" />, <Item key="2" />]} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children with function
        {
          code: '<Component children={() => <div>Dynamic</div>} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children with complex expression
        {
          code: '<Wrapper children={condition ? <A /> : <B />} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noChildrenProp, {
      valid: [
        // Nested components with proper children
        {
          code: `
            <div>
              <h1>Title</h1>
              <p>Content</p>
            </div>
          `,
        },
        // Component composition
        {
          code: `
            <Card>
              <CardHeader title="Title" />
              <CardBody>Body content</CardBody>
            </Card>
          `,
        },
        // Props spread (not children prop)
        {
          code: '<Component {...props} />',
        },
      ],
      invalid: [
        // children prop in complex component
        {
          code: `
            <Modal
              title="Confirm"
              children={<p>Are you sure?</p>}
            />
          `,
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // Multiple children props
        {
          code: `
            <div>
              <Component children="First" />
              <Component children={<span>Second</span>} />
            </div>
          `,
          errors: [
            {
              messageId: 'noChildrenProp',
            },
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children prop with TypeScript
        {
          code: '<MyComponent<string> children="TypeScript" />',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
      ],
    });
  });

  describe('Real World Anti-patterns', () => {
    ruleTester.run('real world anti-patterns', noChildrenProp, {
      valid: [
        // Proper children usage
        {
          code: `
            function Dialog({ children }) {
              return (
                <div className="dialog">
                  {children}
                </div>
              );
            }

            // Usage
            <Dialog>
              <h2>Confirm Action</h2>
              <p>Are you sure?</p>
            </Dialog>
          `,
        },
      ],
      invalid: [
        // Anti-pattern: passing children as prop
        {
          code: `
            function BadDialog(props) {
              return (
                <div className="dialog">
                  {props.children}
                </div>
              );
            }

            // Anti-pattern usage
            <BadDialog children={<h2>Confirm</h2>} />
          `,
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // Library component misuse
        {
          code: `
            import { Menu } from 'some-library';

            <Menu
              items={menuItems}
              children={<CustomMenuItem />}
            />
          `,
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // Conditional children prop
        {
          code: `
            <ConditionalWrapper
              condition={isVisible}
              children={isVisible ? <Content /> : null}
            />
          `,
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noChildrenProp, {
      valid: [
        // children as variable name (not JSX prop)
        {
          code: `
            const children = 'not a prop';
            console.log(children);
          `,
        },
        // children in destructuring (not JSX)
        {
          code: `
            function process({ children }) {
              return children;
            }
          `,
        },
      ],
      invalid: [
        // children prop in spread attributes
        {
          code: '<Component {...{ children: "spread" }} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
        // children with null/undefined
        {
          code: '<Component children={null} />',
          errors: [
            {
              messageId: 'noChildrenProp',
            },
          ],
        },
      ],
    });
  });
});
