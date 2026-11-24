/**
 * Tests for forbid-foreign-prop-types
 * Reading another component's propTypes is unsafe: production builds strip them.
 *
 * `upstreamValid` and `upstreamInvalid` are the cases of eslint-plugin-react@7.37.5
 * tests/lib/rules/forbid-foreign-prop-types.js (MIT), run with the default parser. Invalid cases carry
 * upstream's line, column and node type, so the report lands on the same node.
 * The same cases also run under @typescript-eslint/parser from upstream-parity/.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { forbidForeignPropTypes } from '../../rules/react/forbid-foreign-prop-types';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const upstreamValid = [
  {
    name: 'upstream valid 1: import { propTypes } from "SomeComponent";',
    code: 'import { propTypes } from "SomeComponent";',
  },
  {
    name: 'upstream valid 2: import { propTypes as someComponentPropTypes } from "SomeCom',
    code: 'import { propTypes as someComponentPropTypes } from "SomeComponent";',
  },
  {
    name: 'upstream valid 3: const foo = propTypes',
    code: 'const foo = propTypes',
  },
  { name: 'upstream valid 4: foo(propTypes)', code: 'foo(propTypes)' },
  { name: 'upstream valid 5: foo + propTypes', code: 'foo + propTypes' },
  {
    name: 'upstream valid 6: const foo = [propTypes]',
    code: 'const foo = [propTypes]',
  },
  {
    name: 'upstream valid 7: const foo = { propTypes }',
    code: 'const foo = { propTypes }',
  },
  {
    name: 'upstream valid 8: Foo.propTypes = propTypes',
    code: 'Foo.propTypes = propTypes',
  },
  {
    name: 'upstream valid 9: Foo["propTypes"] = propTypes',
    code: 'Foo["propTypes"] = propTypes',
  },
  {
    name: 'upstream valid 10: const propTypes = "bar"; Foo[propTypes];',
    code: 'const propTypes = "bar"; Foo[propTypes];',
  },
  {
    name: 'upstream valid 11: const Message = (props) => (<div>{props.message}</div>); [{"allowInPropTypes":true}]',
    code: '\n        const Message = (props) => (<div>{props.message}</div>);\n        Message.propTypes = {\n          message: PropTypes.string\n        };\n        const Hello = (props) => (<Message>Hello {props.name}</Message>);\n        Hello.propTypes = {\n          name: Message.propTypes.message\n        };\n      ',
    options: [{ allowInPropTypes: true }],
  },
  {
    name: 'upstream valid 12: class MyComponent extends React.Component { [{"allowInPropTypes":true}]',
    code: '\n        class MyComponent extends React.Component {\n          static propTypes = {\n            baz: Qux.propTypes.baz\n          };\n        }\n      ',
    options: [{ allowInPropTypes: true }],
  },
];

const upstreamInvalid = [
  {
    name: 'upstream invalid 1: var Foo = createReactClass({',
    code: '\n        var Foo = createReactClass({\n          propTypes: Bar.propTypes,\n          render: function() {\n            return <Foo className="bar" />;\n          }\n        });\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Identifier' }],
  },
  {
    name: 'upstream invalid 2: var Foo = createReactClass({',
    code: '\n        var Foo = createReactClass({\n          propTypes: Bar["propTypes"],\n          render: function() {\n            return <Foo className="bar" />;\n          }\n        });\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Literal' }],
  },
  {
    name: 'upstream invalid 3: var { propTypes } = SomeComponent',
    code: '\n        var { propTypes } = SomeComponent\n        var Foo = createReactClass({\n          propTypes,\n          render: function() {\n            return <Foo className="bar" />;\n          }\n        });\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Property' }],
  },
  {
    name: 'upstream invalid 4: var { propTypes: things, ...foo } = SomeComponent',
    code: '\n        var { propTypes: things, ...foo } = SomeComponent\n        var Foo = createReactClass({\n          propTypes,\n          render: function() {\n            return <Foo className="bar" />;\n          }\n        });\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Property' }],
  },
  {
    name: 'upstream invalid 5: class MyComponent extends React.Component {',
    code: '\n        class MyComponent extends React.Component {\n          static fooBar = {\n            baz: Qux.propTypes.baz\n          };\n        }\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Identifier' }],
  },
  {
    name: 'upstream invalid 6: var { propTypes: typesOfProps } = SomeComponent',
    code: '\n        var { propTypes: typesOfProps } = SomeComponent\n        var Foo = createReactClass({\n          propTypes: typesOfProps,\n          render: function() {\n            return <Foo className="bar" />;\n          }\n        });\n      ',
    errors: [{ messageId: 'forbiddenPropType', type: 'Property' }],
  },
  {
    name: 'upstream invalid 7: const Message = (props) => (<div>{props.message}</div>); [{"allowInPropTypes":false}]',
    code: '\n        const Message = (props) => (<div>{props.message}</div>);\n        Message.propTypes = {\n          message: PropTypes.string\n        };\n        const Hello = (props) => (<Message>Hello {props.name}</Message>);\n        Hello.propTypes = {\n          name: Message.propTypes.message\n        };\n      ',
    options: [{ allowInPropTypes: false }],
    errors: [{ messageId: 'forbiddenPropType', type: 'Identifier' }],
  },
  {
    name: 'upstream invalid 8: class MyComponent extends React.Component { [{"allowInPropTypes":false}]',
    code: '\n        class MyComponent extends React.Component {\n          static propTypes = {\n            baz: Qux.propTypes.baz\n          };\n        }\n      ',
    options: [{ allowInPropTypes: false }],
    errors: [{ messageId: 'forbiddenPropType', type: 'Identifier' }],
  },
];

ruleTester.run('forbid-foreign-prop-types', forbidForeignPropTypes, {
  valid: [
    ...upstreamValid,
    {
      name: 'a component writes its own propTypes through a quoted key',
      code: `Foo['propTypes'] = { a: 1 };`,
    },
    {
      name: "allowInPropTypes: a class field may reuse another component's",
      code: 'class Bar extends React.Component { static propTypes = { a: Foo.propTypes.a }; }',
      options: [{ allowInPropTypes: true }],
    },
    {
      name: 'an unrelated property is not propTypes',
      code: 'const a = Foo.propType; const b = Foo.defaultProps;',
    },
  ],
  invalid: [
    ...upstreamInvalid,
    {
      name: 'a quoted key reads the same property',
      code: `const shape = Foo['propTypes'];`,
      errors: [{ messageId: 'forbiddenPropType', type: 'Literal' }],
    },
    {
      name: 'allowInPropTypes does not cover a read outside a propTypes declaration',
      code: 'const shape = Foo.propTypes; Bar.propTypes = { a: 1 };',
      options: [{ allowInPropTypes: true }],
      errors: [{ messageId: 'forbiddenPropType', line: 1, column: 19 }],
    },
    {
      name: 'allowInPropTypes does not cover a static field of another name',
      code: 'class Bar extends React.Component { static defaultProps = { a: Foo.propTypes.a }; }',
      options: [{ allowInPropTypes: true }],
      errors: [{ messageId: 'forbiddenPropType' }],
    },
    {
      name: 'a template literal spells the same property',
      code: 'const shape = Foo[`propTypes`];',
      errors: [{ messageId: 'forbiddenPropType', type: 'TemplateLiteral' }],
    },
    {
      name: 'a quoted key in a destructuring pattern',
      code: `const { 'propTypes': shape } = Foo;`,
      errors: [{ messageId: 'forbiddenPropType', type: 'Property' }],
    },
    {
      name: 'allowInPropTypes with a quoted static key',
      code: `class Bar extends React.Component { static 'propTypes' = { a: 1 }; } const x = Foo.propTypes;`,
      options: [{ allowInPropTypes: true }],
      errors: [{ messageId: 'forbiddenPropType', line: 1 }],
    },
    {
      name: 'a nested destructuring pattern',
      code: 'const { shape: { propTypes } } = Foo;',
      errors: [{ messageId: 'forbiddenPropType', type: 'Property' }],
    },
  ],
});
