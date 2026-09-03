import { RuleTester } from '@typescript-eslint/rule-tester';
import { noRenderReturnValue } from '../../rules/react/no-render-return-value';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('no-render-return-value', noRenderReturnValue, {
  valid: [
    // Valid - ReactDOM.render without storing return value
    {
      name: 'ReactDOM.render without assignment',
      code: `
        ReactDOM.render(<App />, document.getElementById('root'));
      `,
    },
    {
      name: 'ReactDOM.render in expression statement',
      code: `
        function mount() {
          ReactDOM.render(<App />, container);
        }
      `,
    },
    // Valid - other method calls with stored return value
    {
      name: 'other method call with assignment',
      code: `
        const element = React.createElement('div');
      `,
    },
    {
      name: 'different ReactDOM method',
      code: `
        const portal = ReactDOM.createPortal(<div />, container);
      `,
    },
    // Valid - similar but not ReactDOM.render
    {
      name: 'custom render function',
      code: `
        const result = customRenderer.render(<App />);
      `,
    },
    {
      name: 'render method on other object',
      code: `
        const result = MyLib.render(<App />);
      `,
    },
    // Valid - ReactDOM without render
    {
      name: 'ReactDOM.findDOMNode',
      code: `
        const node = ReactDOM.findDOMNode(this);
      `,
    },
    {
      name: 'ReactDOM.unmountComponentAtNode',
      code: `
        const result = ReactDOM.unmountComponentAtNode(container);
      `,
    },
    // Valid - render identifier not as method
    {
      name: 'render as standalone function',
      code: `
        const result = render(<App />);
      `,
    },
    // Valid - chained calls
    {
      name: 'chained method call',
      code: `
        ReactDOM.render(<App />, container).then(handleRendered);
      `,
    },
    // Valid - ReactDOM.render in callback
    {
      name: 'ReactDOM.render in callback',
      code: `
        document.addEventListener('DOMContentLoaded', () => {
          ReactDOM.render(<App />, document.getElementById('root'));
        });
      `,
    },
  ],
  invalid: [
    // Invalid - storing ReactDOM.render return value in variable
    {
      name: 'storing ReactDOM.render in const',
      code: `
        const instance = ReactDOM.render(<App />, document.getElementById('root'));
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'storing ReactDOM.render in let',
      code: `
        let instance = ReactDOM.render(<App />, container);
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'storing ReactDOM.render in var',
      code: `
        var instance = ReactDOM.render(<App />, container);
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    // Invalid - assigning ReactDOM.render return value
    {
      name: 'assigning ReactDOM.render to existing variable',
      code: `
        let instance;
        instance = ReactDOM.render(<App />, container);
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'assigning ReactDOM.render to property',
      code: `
        this.instance = ReactDOM.render(<App />, container);
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'assigning ReactDOM.render to object property',
      code: `
        app.instance = ReactDOM.render(<App />, container);
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    // Invalid - destructuring assignment
    {
      name: 'multiple variable declaration with ReactDOM.render',
      code: `
        const root = ReactDOM.render(<App />, container), other = 1;
      `,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
  ],
});

