/**
 * Tests for style-prop-object
 * The style prop takes an object, never a string or another primitive.
 *
 * `upstreamValid` and `upstreamInvalid` are the cases of eslint-plugin-react@7.37.5
 * tests/lib/rules/style-prop-object.js (MIT), run with the default parser. Invalid cases carry
 * upstream's line, column and node type, so the report lands on the same node.
 * The same cases also run under @typescript-eslint/parser from upstream-parity/.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { stylePropObject } from '../../rules/react/style-prop-object';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const upstreamValid = [
  {
    name: 'upstream valid 1: <div style={{ color: "red" }} />',
    code: '<div style={{ color: "red" }} />',
  },
  {
    name: 'upstream valid 2: <Hello style={{ color: "red" }} />',
    code: '<Hello style={{ color: "red" }} />',
  },
  {
    name: 'upstream valid 3: function redDiv() {',
    code: '\n        function redDiv() {\n          const styles = { color: "red" };\n          return <div style={styles} />;\n        }\n      ',
  },
  {
    name: 'upstream valid 4: function redDiv() {',
    code: '\n        function redDiv() {\n          const styles = { color: "red" };\n          return <Hello style={styles} />;\n        }\n      ',
  },
  {
    name: 'upstream valid 5: const styles = { color: "red" };',
    code: '\n        const styles = { color: "red" };\n        function redDiv() {\n          return <div style={styles} />;\n        }\n      ',
  },
  {
    name: 'upstream valid 6: function redDiv(props) {',
    code: '\n        function redDiv(props) {\n          return <div style={props.styles} />;\n        }\n      ',
  },
  {
    name: "upstream valid 7: import styles from './styles';",
    code: "\n        import styles from './styles';\n        function redDiv() {\n          return <div style={styles} />;\n        }\n      ",
  },
  {
    name: "upstream valid 8: import mystyles from './styles';",
    code: "\n        import mystyles from './styles';\n        const styles = Object.assign({ color: 'red' }, mystyles);\n        function redDiv() {\n          return <div style={styles} />;\n        }\n      ",
  },
  {
    name: 'upstream valid 9: const otherProps = { style: { color: "red" } };',
    code: '\n        const otherProps = { style: { color: "red" } };\n        const { a, b, ...props } = otherProps;\n        <div {...props} />\n      ',
  },
  {
    name: "upstream valid 10: const styles = Object.assign({ color: 'red' }, mystyles);",
    code: '\n        const styles = Object.assign({ color: \'red\' }, mystyles);\n        React.createElement("div", { style: styles });\n      ',
  },
  { name: 'upstream valid 11: <div style></div>', code: '<div style></div>' },
  {
    name: 'upstream valid 12: React.createElement(MyCustomElem, {',
    code: "\n        React.createElement(MyCustomElem, {\n          [style]: true\n        }, 'My custom Elem')\n      ",
  },
  {
    name: 'upstream valid 13: let style;',
    code: '\n        let style;\n        <div style={style}></div>\n      ',
  },
  {
    name: 'upstream valid 14: let style = null;',
    code: '\n        let style = null;\n        <div style={style}></div>\n      ',
  },
  {
    name: 'upstream valid 15: let style = undefined;',
    code: '\n        let style = undefined;\n        <div style={style}></div>\n      ',
  },
  {
    name: 'upstream valid 16: <div style={undefined}></div>',
    code: '<div style={undefined}></div>',
  },
  {
    name: 'upstream valid 17: const props = { style: undefined };',
    code: '\n        const props = { style: undefined };\n        <div {...props} />\n      ',
  },
  {
    name: 'upstream valid 18: const otherProps = { style: undefined };',
    code: '\n        const otherProps = { style: undefined };\n        const { a, b, ...props } = otherProps;\n        <div {...props} />\n      ',
  },
  {
    name: 'upstream valid 19: React.createElement("div", {',
    code: '\n        React.createElement("div", {\n          style: undefined\n        })\n      ',
  },
  {
    name: 'upstream valid 20: let style;',
    code: '\n        let style;\n        React.createElement("div", {\n          style\n        })\n      ',
  },
  {
    name: 'upstream valid 21: <div style={null}></div>',
    code: '<div style={null}></div>',
  },
  {
    name: 'upstream valid 22: const props = { style: null };',
    code: '\n        const props = { style: null };\n        <div {...props} />\n      ',
  },
  {
    name: 'upstream valid 23: const otherProps = { style: null };',
    code: '\n        const otherProps = { style: null };\n        const { a, b, ...props } = otherProps;\n        <div {...props} />\n      ',
  },
  {
    name: 'upstream valid 24: React.createElement("div", {',
    code: '\n        React.createElement("div", {\n          style: null\n        })\n      ',
  },
  {
    name: 'upstream valid 25: const MyComponent = (props) => {',
    code: '\n        const MyComponent = (props) => {\n          React.createElement(MyCustomElem, {\n            ...props\n          });\n        };\n      ',
  },
  {
    name: 'upstream valid 26: <MyComponent style="myStyle" /> [{"allow":["MyComponent"]}]',
    code: '<MyComponent style="myStyle" />',
    options: [{ allow: ['MyComponent'] }],
  },
  {
    name: 'upstream valid 27: React.createElement(MyComponent, { style: "mySpecialStyle" } [{"allow":["MyComponent"]}]',
    code: 'React.createElement(MyComponent, { style: "mySpecialStyle" })',
    options: [{ allow: ['MyComponent'] }],
  },
];

const upstreamInvalid = [
  {
    name: 'upstream invalid 1: <div style="color: \'red\'" />',
    code: '<div style="color: \'red\'" />',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 1,
        column: 6,
        type: 'JSXAttribute',
      },
    ],
  },
  {
    name: 'upstream invalid 2: <Hello style="color: \'red\'" />',
    code: '<Hello style="color: \'red\'" />',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 1,
        column: 8,
        type: 'JSXAttribute',
      },
    ],
  },
  {
    name: 'upstream invalid 3: <div style={true} />',
    code: '<div style={true} />',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 1,
        column: 6,
        type: 'JSXAttribute',
      },
    ],
  },
  {
    name: 'upstream invalid 4: const styles = \'color: "red"\';',
    code: '\n        const styles = \'color: "red"\';\n        function redDiv2() {\n          return <div style={styles} />;\n        }\n      ',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 4,
        column: 30,
        type: 'Identifier',
      },
    ],
  },
  {
    name: 'upstream invalid 5: const styles = \'color: "red"\';',
    code: '\n        const styles = \'color: "red"\';\n        function redDiv2() {\n          return <Hello style={styles} />;\n        }\n      ',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 4,
        column: 32,
        type: 'Identifier',
      },
    ],
  },
  {
    name: 'upstream invalid 6: const styles = true;',
    code: '\n        const styles = true;\n        function redDiv() {\n          return <div style={styles} />;\n        }\n      ',
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 4,
        column: 30,
        type: 'Identifier',
      },
    ],
  },
  {
    name: 'upstream invalid 7: <MyComponent style="myStyle" /> [{"allow":["MyOtherComponent"]}]',
    code: '<MyComponent style="myStyle" />',
    options: [{ allow: ['MyOtherComponent'] }],
    errors: [
      {
        messageId: 'stylePropNotObject',
        line: 1,
        column: 14,
        type: 'JSXAttribute',
      },
    ],
  },
  {
    name: 'upstream invalid 8: React.createElement(MyComponent, { style: "mySpecialStyle" } [{"allow":["MyOtherComponent"]}]',
    code: 'React.createElement(MyComponent, { style: "mySpecialStyle" })',
    options: [{ allow: ['MyOtherComponent'] }],
    errors: [
      { messageId: 'stylePropNotObject', line: 1, column: 43, type: 'Literal' },
    ],
  },
];

ruleTester.run('style-prop-object', stylePropObject, {
  valid: [
    ...upstreamValid,
    {
      name: 'createElement imported under another name, with an object',
      code: `import { createElement as h } from 'react'; h('div', { style: { color: 'red' } });`,
    },
    {
      name: "a local createElement is not React's: its style argument is none of our business",
      code: `function createElement() {} createElement('div', { style: 'color: red' });`,
    },
    {
      name: 'a props object that is a variable, or null: nothing to read a style key from',
      code: `React.createElement('div', props); React.createElement('div', null);`,
    },
    {
      name: 'a template literal is not a literal: the rule stays silent when the code does not prove it',
      code: '<div style={`color: ${c}`} />',
    },
    {
      name: 'a namespaced attribute is not the style prop',
      code: '<svg:rect a:style="x" />',
    },
    {
      name: 'a computed key that is a variable is not known to be style',
      code: `React.createElement('div', { [style]: 'color: red' });`,
    },
  ],
  invalid: [
    ...upstreamInvalid,
    {
      name: 'createElement imported under another name, with a string',
      code: `import { createElement as h } from 'react'; h('div', { style: 'color: red' });`,
      errors: [{ messageId: 'stylePropNotObject', type: 'Literal' }],
    },
    {
      name: 'a quoted or computed string key is the style key too',
      code: `React.createElement('div', { 'style': 'a' }); React.createElement('div', { ['style']: 'b' });`,
      errors: [
        { messageId: 'stylePropNotObject', type: 'Literal' },
        { messageId: 'stylePropNotObject', type: 'Literal' },
      ],
    },
    {
      name: 'a number is not an object either',
      code: '<div style={42} />',
      errors: [{ messageId: 'stylePropNotObject', type: 'JSXAttribute' }],
    },
    {
      name: 'a shorthand property that resolves to a string',
      code: `const style = 'color: red'; React.createElement('div', { style });`,
      errors: [{ messageId: 'stylePropNotObject', type: 'Identifier' }],
    },
    {
      name: 'allow lists the other components only',
      code: `React.createElement(Other, { style: 'x' });`,
      options: [{ allow: ['Hello'] }],
      errors: [{ messageId: 'stylePropNotObject', type: 'Literal' }],
    },
  ],
});
