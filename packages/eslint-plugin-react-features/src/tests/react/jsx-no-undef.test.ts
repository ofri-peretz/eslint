/**
 * Tests for jsx-no-undef
 * A JSX tag must name a binding that exists. The case list follows
 * eslint-plugin-react's tests/lib/rules/jsx-no-undef.js (the full set is in
 * upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { jsxNoUndef } from '../../rules/react/jsx-no-undef';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('jsx-no-undef', jsxNoUndef, {
  valid: [
    {
      name: 'an intrinsic element',
      code: '<div />',
    },
    {
      name: 'an imported component',
      code: "import Foo from './Foo'; <Foo />",
    },
    {
      name: 'a component declared in the file',
      code: 'var Foo = () => null; <Foo />',
    },
    {
      name: 'a member expression whose object is declared',
      code: 'var Foo = { Bar() { return null; } }; <Foo.Bar />',
    },
    {
      name: 'a namespaced tag names no binding',
      code: '<svg:circle />',
    },
    {
      name: '`this` is not a binding',
      code: 'class A { render() { return <this.Foo />; } }',
    },
    {
      name: 'a component declared in an enclosing function',
      code: 'function outer() { var Foo = () => null; return function inner() { return <Foo />; }; }',
    },
    {
      name: 'a global with allowGlobals',
      code: '<Foo />',
      options: [{ allowGlobals: true }],
      languageOptions: { globals: { Foo: true } },
    },
    {
      name: 'a module-level component with allowGlobals: the module scope still counts',
      code: 'var Foo = () => null; <Foo />',
      options: [{ allowGlobals: true }],
    },
  ],
  invalid: [
    {
      name: 'an undeclared component',
      code: '<Foo />',
      errors: [{ messageId: 'undefined', data: { identifier: 'Foo' } }],
    },
    {
      name: 'an undeclared object of a member expression',
      code: '<Foo.Bar />',
      errors: [{ messageId: 'undefined', data: { identifier: 'Foo' } }],
    },
    {
      name: 'a deeper member expression names its leftmost object',
      code: '<Foo.Bar.Baz />',
      errors: [{ messageId: 'undefined', data: { identifier: 'Foo' } }],
    },
    {
      name: 'a global in a module is undefined without allowGlobals',
      code: '<Foo />',
      languageOptions: { globals: { Foo: true } },
      errors: [{ messageId: 'undefined', data: { identifier: 'Foo' } }],
    },
    {
      name: 'a component declared in a sibling function',
      code: 'function a() { var Foo = () => null; } function b() { return <Foo />; }',
      errors: [{ messageId: 'undefined', data: { identifier: 'Foo' } }],
    },
  ],
});

describe('jsx-no-undef in a script', () => {
  const lint = (code: string, globals: Record<string, boolean>) =>
    new Linter({ configType: 'flat' }).verify(code, {
      files: ['**/*.js'],
      plugins: { react: { rules: { 'jsx-no-undef': jsxNoUndef } as never } },
      languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'script',
        globals,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { 'react/jsx-no-undef': 'error' },
    });

  it('accepts a configured global: a script has no module scope above it', () => {
    expect(lint('<Foo />', { Foo: true })).toEqual([]);
  });

  it('accepts a component declared in the script', () => {
    expect(lint('var Foo = () => null; <Foo />', {})).toEqual([]);
  });

  it('reports a name that is not configured', () => {
    expect(lint('<Foo />', {})).toHaveLength(1);
  });
});
