/**
 * Tests for no-unknown-property's `ignore` and `requireDataLowercase` options.
 * The case list follows eslint-plugin-react's
 * tests/lib/rules/no-unknown-property.js (the full set is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnknownProperty } from '../../rules/react/no-unknown-property';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const lowercase = [{ requireDataLowercase: true }] as const;

ruleTester.run('no-unknown-property options', noUnknownProperty, {
  valid: [
    {
      name: 'ignore: a name the config lists',
      options: [{ ignore: ['someProp'] }],
      code: '<div someProp="bar"></div>',
    },
    {
      name: 'ignore: a name that is otherwise reported',
      options: [{ ignore: ['class'] }],
      code: '<div class="bar"></div>',
    },
    {
      name: 'ignore: matches the attribute as written',
      options: [{ ignore: ['css'] }],
      code: '<div css={{ flex: 1 }}></div>',
    },
    {
      name: 'requireDataLowercase false: an uppercase data attribute is fine',
      options: [{ requireDataLowercase: false }],
      code: '<div data-testID="bar" data-under_sCoRe="bar" />',
    },
    {
      name: 'requireDataLowercase: a lowercase data attribute',
      options: lowercase,
      code: '<div data-test-id="bar" />',
    },
    {
      name: 'requireDataLowercase: not a data attribute (no hyphen) on a component',
      options: lowercase,
      code: '<App dataNotAnDataAttribute="yes" />',
    },
    {
      name: 'requireDataLowercase: a data-xml name is not a data attribute',
      options: lowercase,
      code: '<App data-xmlFoo="x" />',
    },
    {
      name: 'requireDataLowercase: a namespaced name is not a data attribute',
      options: lowercase,
      code: '<svg data:Foo="x" />',
    },
    {
      name: 'a member tag takes any props, even with requireDataLowercase',
      options: lowercase,
      code: '<Foo.bar data-testID="x" someProp="y" />',
    },
  ],
  invalid: [
    {
      name: 'requireDataLowercase: uppercase data attributes on a DOM element, and an unknown one',
      options: lowercase,
      code: '<div data-testID="bar" data-under_sCoRe="bar" dataNotAnDataAttribute="yes" />',
      errors: [
        {
          messageId: 'dataLowercaseRequired',
          data: { name: 'data-testID', lowerCaseName: 'data-testid' },
        },
        { messageId: 'dataLowercaseRequired' },
        { messageId: 'noUnknownProperty' },
      ],
    },
    {
      name: 'requireDataLowercase: holds a component to it too',
      options: lowercase,
      code: '<App data-testID="bar" data-under_sCoRe="bar" dataNotAnDataAttribute="yes" />',
      errors: [
        { messageId: 'dataLowercaseRequired' },
        { messageId: 'dataLowercaseRequired' },
      ],
    },
    {
      name: 'ignore lists one name only',
      options: [{ ignore: ['class'] }],
      code: '<div class="a" someProp="b" />',
      errors: [
        {
          messageId: 'noUnknownProperty',
          data: { propName: 'someProp', elementName: 'div' },
        },
      ],
    },
  ],
});
