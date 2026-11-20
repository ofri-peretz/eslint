/**
 * Tests for display-name's options, as eslint-plugin-react spells them:
 * `ignoreTranspilerName` and `checkContextObjects`. The case list follows
 * eslint-plugin-react's tests/lib/rules/display-name.js (the full set is in
 * upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { displayName } from '../../rules/react/display-name';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const strict = [{ ignoreTranspilerName: true }] as const;
const contexts = [{ checkContextObjects: true }] as const;

ruleTester.run('display-name options', displayName, {
  valid: [
    // ignoreTranspilerName: an explicit displayName is the only name
    {
      name: 'ignoreTranspilerName: class with a static displayName property',
      options: strict,
      code: `class Hello extends React.Component { static displayName = 'Widget'; render() { return <div />; } }`,
    },
    {
      name: 'ignoreTranspilerName: class with a static displayName getter',
      options: strict,
      code: `class Hello extends React.Component { static get displayName() { return 'Hello'; } render() { return <div />; } }`,
    },
    {
      name: 'ignoreTranspilerName: class named by an assignment',
      options: strict,
      code: `class Hello extends React.Component { render() { return <div />; } } Hello.displayName = 'Hello';`,
    },
    {
      name: 'ignoreTranspilerName: arrow component named by an assignment',
      options: strict,
      code: `var Hello = () => <div />; Hello.displayName = 'Hello';`,
    },
    {
      name: 'ignoreTranspilerName: memo component named by an assignment to its binding',
      options: strict,
      code: `import { memo } from 'react'; const Row = memo(() => <div />); Row.displayName = 'Row';`,
    },
    {
      name: 'ignoreTranspilerName: object method component named by its dotted path',
      options: strict,
      code: `var Mixins = { Greetings: { Hello: function() { return <div />; } } }; Mixins.Greetings.Hello.displayName = 'Hello';`,
    },
    {
      name: 'ignoreTranspilerName: createReactClass with a displayName property',
      options: strict,
      code: `var Hello = createReactClass({ displayName: 'Hello', render() { return <div />; } });`,
    },
    {
      name: 'ignoreTranspilerName: a lowercase object method is not a component',
      options: strict,
      code: `var obj = { pouf() { return <div />; } };`,
    },
    {
      name: 'ignoreTranspilerName: a function that renders nothing is not a component',
      options: strict,
      code: `function Helper() { return 1; }`,
    },
    {
      name: 'ignoreTranspilerName: a class that is not a component',
      options: strict,
      code: `class Hello { render() { return <div />; } }`,
    },
    {
      name: 'ignoreTranspilerName: a call that is not createClass',
      options: strict,
      code: `var Hello = other({ render() { return <div />; } });`,
    },
    {
      name: 'ignoreTranspilerName: a createClass spelled on another object',
      options: strict,
      code: `var Hello = Other.createReactClass({ render() { return <div />; } });`,
    },
    // checkContextObjects
    {
      name: 'checkContextObjects: displayName assigned',
      options: contexts,
      code: `import { createContext } from 'react'; const Hello = createContext(); Hello.displayName = 'HelloContext';`,
    },
    {
      name: 'checkContextObjects: displayName assigned to a variable declared first',
      options: contexts,
      code: `import { createContext } from 'react'; let Hello; Hello = createContext(); Hello.displayName = 'HelloContext';`,
    },
    {
      name: 'checkContextObjects: a displayName on another object does not count',
      options: contexts,
      code: `const obj = {}; obj.displayName = 'x';`,
    },
    {
      name: 'checkContextObjects: not a React createContext',
      options: contexts,
      code: `function createContext() {} const Hello = createContext();`,
    },
    {
      name: 'checkContextObjects: not a variable the context is kept in',
      options: contexts,
      code: `import { createContext } from 'react'; const { a } = createContext(); obj.value = createContext();`,
    },
    {
      name: 'checkContextObjects: createContext is from React 16.3',
      options: contexts,
      settings: { react: { version: '16.2.0' } },
      code: `import { createContext } from 'react'; const Hello = createContext();`,
    },
    {
      name: 'checkContextObjects: false is the default',
      options: [{ checkContextObjects: false }],
      code: `import { createContext } from 'react'; const Hello = createContext();`,
    },
  ],
  invalid: [
    {
      name: 'ignoreTranspilerName: a named class',
      options: strict,
      code: `class Hello extends React.Component { render() { return <div />; } }`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: a class bound to a variable',
      options: strict,
      code: `const Hello = class extends React.Component { render() { return <div />; } };`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: an anonymous class is reported once',
      options: strict,
      code: `export default class extends React.Component { render() { return <div />; } }`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: a function declaration',
      options: strict,
      code: `function Hello() { return <div />; }`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: an arrow bound to a variable',
      options: strict,
      code: `const Hello = () => <div />;`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: an anonymous default export is reported once',
      options: strict,
      code: `export default () => <div />;`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: a memo component bound to a variable',
      options: strict,
      code: `import { memo } from 'react'; const Row = memo(() => <div />);`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: an object method component',
      options: strict,
      code: `const Mixin = { Button() { return <button />; } };`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: an object method component under a computed key has no path to name it',
      options: strict,
      code: `const Mixin = { [key]() { return <button />; } }; const Other = { ['Button']() { return <b />; } };`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: a class under a computed key has no path to name it',
      options: strict,
      code: `const o = { [key]: class extends React.Component { render() { return <div />; } } }; o.x.displayName = 'x';`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: a nested object method component, named by nothing',
      options: strict,
      code: `var o = { A: { B() { return <b />; } } }; o.A.C.displayName = 'x';`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: createReactClass without a displayName',
      options: strict,
      code: `var Hello = createReactClass({ render() { return <div />; } });`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: createReactClass with a spec the file cannot read',
      options: strict,
      code: `var Hello = createReactClass(spec);`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: React.createClass under settings.react.createClass',
      options: strict,
      settings: { react: { createClass: 'createClass' } },
      code: `var Hello = React.createClass({ render() { return <div />; } });`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: Foo.createClass under settings.react.pragma',
      options: strict,
      settings: { react: { pragma: 'Foo', createClass: 'createClass' } },
      code: `var Hello = Foo.createClass({ render() { return <div />; } });`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'ignoreTranspilerName: Foo.createClass under a @jsx pragma comment',
      options: strict,
      settings: { react: { createClass: 'createClass' } },
      code: `/** @jsx Foo */ var Hello = Foo.createClass({ render() { return <div />; } });`,
      errors: [{ messageId: 'displayName' }],
    },
    {
      name: 'checkContextObjects: a context with no displayName',
      options: contexts,
      code: `import { createContext } from 'react'; const Hello = createContext();`,
      errors: [{ messageId: 'contextDisplayName' }],
    },
    {
      name: 'checkContextObjects: React.createContext on the namespace',
      options: contexts,
      code: `import * as React from 'react'; const Hello = React.createContext();`,
      errors: [{ messageId: 'contextDisplayName' }],
    },
    {
      name: 'checkContextObjects: a context assigned after its declaration',
      options: contexts,
      code: `import { createContext } from 'react'; var Hello; Hello = createContext();`,
      errors: [{ messageId: 'contextDisplayName' }],
    },
    {
      name: 'checkContextObjects: a displayName assigned to another name',
      options: contexts,
      code: `import { createContext } from 'react'; const Hello = createContext(); const obj = {}; obj.displayName = 'False positive';`,
      errors: [{ messageId: 'contextDisplayName' }],
    },
    {
      name: 'checkContextObjects: a version spelled as a range still reads as 16.3',
      options: contexts,
      settings: { react: { version: '>16.3.0' } },
      code: `import { createContext } from 'react'; const Hello = createContext();`,
      errors: [{ messageId: 'contextDisplayName' }],
    },
  ],
});
