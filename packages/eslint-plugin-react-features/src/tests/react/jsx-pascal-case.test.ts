/**
 * Tests for jsx-pascal-case
 * A user-defined JSX component is named in PascalCase.
 *
 * `upstreamValid` and `upstreamInvalid` are the cases of eslint-plugin-react@7.37.5
 * tests/lib/rules/jsx-pascal-case.js (MIT), run with the default parser. Invalid cases carry
 * upstream's line, column and node type, so the report lands on the same node.
 * The same cases also run under @typescript-eslint/parser from upstream-parity/.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { jsxPascalCase } from '../../rules/react/jsx-pascal-case';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const upstreamValid = [
  { name: 'upstream valid 1: <testcomponent />', code: '<testcomponent />' },
  { name: 'upstream valid 2: <testComponent />', code: '<testComponent />' },
  { name: 'upstream valid 3: <test_component />', code: '<test_component />' },
  { name: 'upstream valid 4: <TestComponent />', code: '<TestComponent />' },
  {
    name: 'upstream valid 5: <CSSTransitionGroup />',
    code: '<CSSTransitionGroup />',
  },
  { name: 'upstream valid 6: <BetterThanCSS />', code: '<BetterThanCSS />' },
  {
    name: 'upstream valid 7: <TestComponent><div /></TestComponent>',
    code: '<TestComponent><div /></TestComponent>',
  },
  { name: 'upstream valid 8: <Test1Component />', code: '<Test1Component />' },
  { name: 'upstream valid 9: <TestComponent1 />', code: '<TestComponent1 />' },
  { name: 'upstream valid 10: <T3StComp0Nent />', code: '<T3StComp0Nent />' },
  { name: 'upstream valid 11: <Éurströmming />', code: '<Éurströmming />' },
  { name: 'upstream valid 12: <Año />', code: '<Año />' },
  { name: 'upstream valid 13: <Søknad />', code: '<Søknad />' },
  { name: 'upstream valid 14: <T />', code: '<T />' },
  {
    name: 'upstream valid 15: <YMCA /> [{"allowAllCaps":true}]',
    code: '<YMCA />',
    options: [{ allowAllCaps: true }],
  },
  {
    name: 'upstream valid 16: <TEST_COMPONENT /> [{"allowAllCaps":true}]',
    code: '<TEST_COMPONENT />',
    options: [{ allowAllCaps: true }],
  },
  { name: 'upstream valid 17: <Modal.Header />', code: '<Modal.Header />' },
  {
    name: 'upstream valid 18: <qualification.T3StComp0Nent />',
    code: '<qualification.T3StComp0Nent />',
  },
  { name: 'upstream valid 19: <Modal:Header />', code: '<Modal:Header />' },
  {
    name: 'upstream valid 20: <IGNORED /> [{"ignore":["IGNORED"]}]',
    code: '<IGNORED />',
    options: [{ ignore: ['IGNORED'] }],
  },
  {
    name: 'upstream valid 21: <Foo_DEPRECATED /> [{"ignore":["*_D*D"]}]',
    code: '<Foo_DEPRECATED />',
    options: [{ ignore: ['*_D*D'] }],
  },
  {
    name: 'upstream valid 22: <Foo_DEPRECATED /> [{"ignore":["*_+(DEPRECATED|IGNORED)"]}]',
    code: '<Foo_DEPRECATED />',
    options: [{ ignore: ['*_+(DEPRECATED|IGNORED)'] }],
  },
  { name: 'upstream valid 23: <$ />', code: '<$ />' },
  { name: 'upstream valid 24: <_ />', code: '<_ />' },
  { name: 'upstream valid 25: <H1>Hello!</H1>', code: '<H1>Hello!</H1>' },
  { name: 'upstream valid 26: <Typography.P />', code: '<Typography.P />' },
  {
    name: 'upstream valid 27: <Styled.h1 /> [{"allowNamespace":true}]',
    code: '<Styled.h1 />',
    options: [{ allowNamespace: true }],
  },
  {
    name: 'upstream valid 28: <_TEST_COMPONENT /> [{"allowAllCaps":true,"allowLeadingUnderscore":true}]',
    code: '<_TEST_COMPONENT />',
    options: [{ allowAllCaps: true, allowLeadingUnderscore: true }],
  },
  {
    name: 'upstream valid 29: <_TestComponent /> [{"allowLeadingUnderscore":true}]',
    code: '<_TestComponent />',
    options: [{ allowLeadingUnderscore: true }],
  },
];

const upstreamInvalid = [
  {
    name: 'upstream invalid 1: <Test_component />',
    code: '<Test_component />',
    errors: [{ messageId: 'usePascalCase', data: { name: 'Test_component' } }],
  },
  {
    name: 'upstream invalid 2: <TEST_COMPONENT />',
    code: '<TEST_COMPONENT />',
    errors: [{ messageId: 'usePascalCase', data: { name: 'TEST_COMPONENT' } }],
  },
  {
    name: 'upstream invalid 3: <YMCA />',
    code: '<YMCA />',
    errors: [{ messageId: 'usePascalCase', data: { name: 'YMCA' } }],
  },
  {
    name: 'upstream invalid 4: <_TEST_COMPONENT /> [{"allowAllCaps":true}]',
    code: '<_TEST_COMPONENT />',
    options: [{ allowAllCaps: true }],
    errors: [
      { messageId: 'usePascalOrSnakeCase', data: { name: '_TEST_COMPONENT' } },
    ],
  },
  {
    name: 'upstream invalid 5: <TEST_COMPONENT_ /> [{"allowAllCaps":true}]',
    code: '<TEST_COMPONENT_ />',
    options: [{ allowAllCaps: true }],
    errors: [
      { messageId: 'usePascalOrSnakeCase', data: { name: 'TEST_COMPONENT_' } },
    ],
  },
  {
    name: 'upstream invalid 6: <TEST-COMPONENT /> [{"allowAllCaps":true}]',
    code: '<TEST-COMPONENT />',
    options: [{ allowAllCaps: true }],
    errors: [
      { messageId: 'usePascalOrSnakeCase', data: { name: 'TEST-COMPONENT' } },
    ],
  },
  {
    name: 'upstream invalid 7: <__ /> [{"allowAllCaps":true}]',
    code: '<__ />',
    options: [{ allowAllCaps: true }],
    errors: [{ messageId: 'usePascalOrSnakeCase', data: { name: '__' } }],
  },
  {
    name: 'upstream invalid 8: <_div /> [{"allowLeadingUnderscore":true}]',
    code: '<_div />',
    options: [{ allowLeadingUnderscore: true }],
    errors: [{ messageId: 'usePascalCase', data: { name: '_div' } }],
  },
  {
    name: 'upstream invalid 9: <__ /> [{"allowAllCaps":true,"allowLeadingUnderscore":true}]',
    code: '<__ />',
    options: [{ allowAllCaps: true, allowLeadingUnderscore: true }],
    errors: [{ messageId: 'usePascalOrSnakeCase', data: { name: '__' } }],
  },
  {
    name: 'upstream invalid 10: <$a />',
    code: '<$a />',
    errors: [{ messageId: 'usePascalCase', data: { name: '$a' } }],
  },
  {
    name: 'upstream invalid 11: <Foo_DEPRECATED /> [{"ignore":["*_FOO"]}]',
    code: '<Foo_DEPRECATED />',
    options: [{ ignore: ['*_FOO'] }],
    errors: [{ messageId: 'usePascalCase', data: { name: 'Foo_DEPRECATED' } }],
  },
  {
    name: 'upstream invalid 12: <Styled.h1 />',
    code: '<Styled.h1 />',
    errors: [{ messageId: 'usePascalCase', data: { name: 'h1' } }],
  },
  {
    name: 'upstream invalid 13: <$Typography.P />',
    code: '<$Typography.P />',
    errors: [{ messageId: 'usePascalCase', data: { name: '$Typography' } }],
  },
  {
    name: 'upstream invalid 14: <STYLED.h1 /> [{"allowNamespace":true}]',
    code: '<STYLED.h1 />',
    options: [{ allowNamespace: true }],
    errors: [{ messageId: 'usePascalCase', data: { name: 'STYLED' } }],
  },
];

ruleTester.run('jsx-pascal-case', jsxPascalCase, {
  valid: [
    ...upstreamValid,
    {
      name: 'ignore: a glob with braces',
      code: '<foo_BAR_BAZ.Qux_Zap />',
      options: [{ ignore: ['*_{BAR,FOO}_*'] }],
    },
    {
      name: 'ignore: a glob with a character set',
      code: '<Foo_a />',
      options: [{ ignore: ['Foo_[ab]'] }],
    },
    {
      name: 'ignore: a question mark stands for one character',
      code: '<Foo_x />',
      options: [{ ignore: ['Foo_?'] }],
    },
    {
      name: 'allowNamespace judges the first part only',
      code: '<Styled.h1 />',
      options: [{ allowNamespace: true }],
    },
    {
      name: 'a one-letter part ends the check: it cannot be told from a type parameter',
      code: '<T.foo_bar />',
    },
  ],
  invalid: [
    ...upstreamInvalid,
    {
      name: 'ignore matches the whole name, not a prefix',
      code: '<Foo_bar />',
      options: [{ ignore: ['Foo'] }],
      errors: [{ messageId: 'usePascalCase', data: { name: 'Foo_bar' } }],
    },
    {
      name: 'a negated glob ignores everything else, so a match is reported',
      code: '<Foo_bar />',
      options: [{ ignore: ['!Foo_*'] }],
      errors: [{ messageId: 'usePascalCase', data: { name: 'Foo_bar' } }],
    },
    {
      name: 'the second part of a member name is judged without allowNamespace',
      code: '<Styled.snake_case />',
      errors: [{ messageId: 'usePascalCase', data: { name: 'snake_case' } }],
    },
    {
      name: 'a namespaced name: the namespace is a component name too',
      code: '<Foo_bar:baz />',
      errors: [{ messageId: 'usePascalCase', data: { name: 'Foo_bar' } }],
    },
  ],
});

describe('jsx-pascal-case option schema', () => {
  const lint = (ignore: unknown) =>
    new Linter({ configType: 'flat' }).verify('<Foo_bar />', {
      files: ['**/*.js'],
      plugins: { react: { rules: { 'jsx-pascal-case': jsxPascalCase } } },
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: { 'react/jsx-pascal-case': ['error', { ignore }] },
    } as unknown as Linter.Config);

  it('accepts a list of strings', () => {
    expect(lint(['Foo_bar'])).toEqual([]);
  });

  it('rejects an entry that is not a string, wherever it sits in the list', () => {
    expect(() => lint(['Foo_bar', 42])).toThrow(/Value 42 should be string/);
  });
});
