/**
 * Tests for no-multi-comp rule
 * Prevent multiple components per file
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMultiComp } from '../../rules/react/no-multi-comp';

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

describe('no-multi-comp', () => {
  describe('Single Component (Valid)', () => {
    ruleTester.run('single components are valid', noMultiComp, {
      valid: [
        // Single function component
        {
          code: `
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Single arrow function component
        {
          code: `
            const MyComponent = () => {
              return <div>Hello</div>;
            };
          `,
        },
        // Single class component extending Component
        {
          code: `
            class MyComponent extends Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Single class component extending React.Component
        {
          code: `
            class MyComponent extends React.Component {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Single class component extending PureComponent
        {
          code: `
            class MyComponent extends PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Single class component extending React.PureComponent
        {
          code: `
            class MyComponent extends React.PureComponent {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
        },
        // Non-component functions (no JSX in return)
        {
          code: `
            function helper() {
              return 'hello';
            }
            
            function otherHelper() {
              return 42;
            }
          `,
        },
        // Non-component class (no superClass)
        {
          code: `
            class Helper {
              do() { return 'hello'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Non-component class (wrong superClass)
        {
          code: `
            class Helper extends BaseHelper {
              do() { return 'hello'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Empty file
        {
          code: ``,
        },
        // File with no components (no JSX)
        {
          code: `
            const helper = () => 'hello';
            function util() { return 42; }
            const config = { key: 'value' };
          `,
        },
        // JSX Fragment single component
        {
          code: `
            function MyComponent() {
              return <><div>Hello</div><span>World</span></>;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Multiple Components (Invalid)', () => {
    ruleTester.run('multiple components trigger errors', noMultiComp, {
      valid: [],
      invalid: [
        // Two function components
        {
          code: `
            function ComponentA() {
              return <div>A</div>;
            }
            
            function ComponentB() {
              return <div>B</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Two arrow function components
        {
          code: `
            const ComponentA = () => {
              return <div>A</div>;
            };
            
            const ComponentB = () => {
              return <div>B</div>;
            };
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Mix of function and arrow function components
        {
          code: `
            function ComponentA() {
              return <div>A</div>;
            }
            
            const ComponentB = () => {
              return <div>B</div>;
            };
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Two class components
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends Component {
              render() {
                return <div>B</div>;
              }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Mix of class and function components
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            function ComponentB() {
              return <div>B</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Three components
        {
          code: `
            function ComponentA() {
              return <div>A</div>;
            }
            
            function ComponentB() {
              return <div>B</div>;
            }
            
            function ComponentC() {
              return <div>C</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }, { messageId: 'noMultiComp' }],
        },
        // React.Component and React.PureComponent mix
        {
          code: `
            class ComponentA extends React.Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends React.PureComponent {
              render() {
                return <div>B</div>;
              }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Component and PureComponent mix
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends PureComponent {
              render() {
                return <div>B</div>;
              }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('ignoreStateless Option', () => {
    ruleTester.run('ignoreStateless option behavior', noMultiComp, {
      valid: [
        // Multiple function components with ignoreStateless
        {
          code: `
            function ComponentA() {
              return <div>A</div>;
            }
            
            function ComponentB() {
              return <div>B</div>;
            }
          `,
          options: [{ ignoreStateless: true }],
        },
        // Multiple arrow function components with ignoreStateless
        {
          code: `
            const ComponentA = () => <div>A</div>;
            const ComponentB = () => <div>B</div>;
          `,
          options: [{ ignoreStateless: true }],
        },
        // One class component and multiple function components with ignoreStateless
        {
          code: `
            class MainComponent extends Component {
              render() {
                return <div>Main</div>;
              }
            }
            
            function HelperA() {
              return <div>A</div>;
            }
            
            function HelperB() {
              return <div>B</div>;
            }
          `,
          options: [{ ignoreStateless: true }],
        },
      ],
      invalid: [
        // Two class components with ignoreStateless
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends Component {
              render() {
                return <div>B</div>;
              }
            }
          `,
          options: [{ ignoreStateless: true }],
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Three class components with ignoreStateless
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends React.Component {
              render() {
                return <div>B</div>;
              }
            }
            
            class ComponentC extends PureComponent {
              render() {
                return <div>C</div>;
              }
            }
          `,
          options: [{ ignoreStateless: true }],
          errors: [{ messageId: 'noMultiComp' }, { messageId: 'noMultiComp' }],
        },
        // Mix of class and function - reports only second class component
        {
          code: `
            class ComponentA extends Component {
              render() {
                return <div>A</div>;
              }
            }
            
            function HelperComponent() {
              return <div>Helper</div>;
            }
            
            class ComponentB extends Component {
              render() {
                return <div>B</div>;
              }
            }
          `,
          options: [{ ignoreStateless: true }],
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('JSX Detection', () => {
    ruleTester.run('JSX detection variations', noMultiComp, {
      valid: [
        // Function with nested JSX (single component)
        {
          code: `
            function MyComponent() {
              return (
                <div>
                  <header>
                    <h1>Title</h1>
                  </header>
                  <main>
                    <p>Content</p>
                  </main>
                </div>
              );
            }
          `,
        },
        // Function expression component
        {
          code: `
            const MyComponent = function() {
              return <div>Hello</div>;
            };
          `,
        },
        // Non-JSX functions are not components
        {
          code: `
            function getData() {
              return { data: 'value' };
            }
            
            function processData() {
              return getData().data;
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
      ],
      invalid: [
        // Two function expression components
        {
          code: `
            const ComponentA = function() {
              return <div>A</div>;
            };
            
            const ComponentB = function() {
              return <div>B</div>;
            };
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Components with complex JSX
        {
          code: `
            function Header() {
              return (
                <header>
                  <nav>
                    <ul>
                      <li>Home</li>
                    </ul>
                  </nav>
                </header>
              );
            }
            
            function Footer() {
              return (
                <footer>
                  <p>Copyright</p>
                </footer>
              );
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('Component Detection Edge Cases', () => {
    ruleTester.run('edge cases for component detection', noMultiComp, {
      valid: [
        // Class without superClass is not a component
        {
          code: `
            class Utility {
              static helper() { return 'value'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Class extending non-React class is not a component
        {
          code: `
            class Service extends BaseService {
              fetch() { return 'data'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Variable without init is not a component
        {
          code: `
            let myVar;
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Variable with non-function init is not a component
        {
          code: `
            const config = { key: 'value' };
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
      ],
      invalid: [
        // Multiple components with fragments
        {
          code: `
            function ComponentA() {
              return (
                <>
                  <div>A</div>
                  <div>A2</div>
                </>
              );
            }
            
            function ComponentB() {
              return (
                <>
                  <div>B</div>
                </>
              );
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('Real-World Patterns', () => {
    ruleTester.run('real-world component patterns', noMultiComp, {
      valid: [
        // Component with helper hooks (not components - no JSX)
        {
          code: `
            function useCustomHook() {
              return { value: 'data' };
            }
            
            function MyComponent() {
              const { value } = useCustomHook();
              return <div>{value}</div>;
            }
          `,
        },
        // Helper utilities without JSX
        {
          code: `
            function formatData(data) {
              return data.map(item => item.name);
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
      ],
      invalid: [
        // Main component and sub-components in same file
        {
          code: `
            function Button() {
              return <button>Click</button>;
            }
            
            function Card() {
              return (
                <div className="card">
                  <Button />
                </div>
              );
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Page with multiple section components
        {
          code: `
            function HeroSection() {
              return <section className="hero"><h1>Welcome</h1></section>;
            }
            
            function FeaturesSection() {
              return <section className="features"><h2>Features</h2></section>;
            }
            
            function Page() {
              return (
                <main>
                  <HeroSection />
                  <FeaturesSection />
                </main>
              );
            }
          `,
          errors: [{ messageId: 'noMultiComp' }, { messageId: 'noMultiComp' }],
        },
        // HOC pattern with multiple JSX returns
        {
          code: `
            function withAuth(Component) {
              return function AuthenticatedComponent(props) {
                return <Component {...props} isAuthenticated={true} />;
              };
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('MemberExpression SuperClass', () => {
    ruleTester.run('MemberExpression superClass detection', noMultiComp, {
      valid: [
        // Non-React MemberExpression superClass
        {
          code: `
            class MyService extends Utils.BaseService {
              fetch() { return 'data'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
        // Wrong object in MemberExpression
        {
          code: `
            class MyClass extends Other.Component {
              render() { return 'string'; }
            }
            
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
      ],
      invalid: [
        // Two React.Component classes
        {
          code: `
            class ComponentA extends React.Component {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends React.Component {
              render() {
                return <div>B</div>;
              }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Two React.PureComponent classes
        {
          code: `
            class ComponentA extends React.PureComponent {
              render() {
                return <div>A</div>;
              }
            }
            
            class ComponentB extends React.PureComponent {
              render() {
                return <div>B</div>;
              }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('Component Name Node Detection', () => {
    ruleTester.run('component name node detection', noMultiComp, {
      valid: [],
      invalid: [
        // Named function declarations
        {
          code: `
            function FirstComponent() {
              return <div>First</div>;
            }
            
            function SecondComponent() {
              return <div>Second</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Named variable declarators
        {
          code: `
            const FirstComponent = () => <div>First</div>;
            const SecondComponent = () => <div>Second</div>;
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
        // Named class declarations
        {
          code: `
            class FirstComponent extends Component {
              render() { return <div>First</div>; }
            }
            
            class SecondComponent extends Component {
              render() { return <div>Second</div>; }
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });

  describe('Default Options', () => {
    ruleTester.run('default options behavior', noMultiComp, {
      valid: [
        // Single component with default options
        {
          code: `
            function MyComponent() {
              return <div>Hello</div>;
            }
          `,
        },
      ],
      invalid: [
        // Multiple function components with default options (ignoreStateless: false)
        {
          code: `
            function ComponentA() {
              return <div>A</div>;
            }
            
            function ComponentB() {
              return <div>B</div>;
            }
          `,
          errors: [{ messageId: 'noMultiComp' }],
        },
      ],
    });
  });
});

