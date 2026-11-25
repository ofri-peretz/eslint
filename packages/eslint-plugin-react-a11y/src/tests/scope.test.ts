/**
 * Tests for scope rule
 * Accessibility: WCAG 1.3.1 Info and Relationships (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { scope } from '../rules/scope';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('scope', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - scope on th', scope, {
      valid: [
        { name: 'scope on a th', code: '<th scope="col">Header</th>' },
        { code: '<th scope="row">Row Header</th>' },
        { code: '<th scope="colgroup">Group</th>' },
        { code: '<th scope="rowgroup">Group</th>' },
        { code: '<td>Data</td>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  // Upstream eslint-plugin-jsx-a11y 6.10.2 checks DOM elements only: scope.js:40-44
  // returns for a tag that is not a DOM element, "as we do not know what
  // low-level DOM element this maps to". Its tests: scope-test.js:43
  // (`<Foo scope="bar" {...props} />` valid) and :44 (`<TableHeader scope="row" />`
  // valid with TableHeader mapped to th).
  describe('Custom components', () => {
    const components = {
      'jsx-a11y': { components: { TableHeader: 'th', Foo: 'div' } },
    };
    const polymorphic = (extra: Record<string, unknown> = {}) => ({
      'jsx-a11y': { polymorphicPropName: 'as', ...extra },
    });

    ruleTester.run('valid - components the rule cannot see through', scope, {
      valid: [
        {
          // @found binwiederhier/ntfy 2026-11-24
          name: 'MUI TableCell renders a th through its component prop (ntfy Account.jsx:1148)',
          code: '<TableCell component="th" scope="row">Name</TableCell>',
        },
        {
          name: 'upstream scope-test.js:43',
          code: '<Foo scope="bar" {...props} />',
        },
        {
          name: 'a member component',
          code: '<Ui.Cell scope="col">Name</Ui.Cell>',
        },
        { name: 'a namespaced tag', code: '<svg:a scope="col" />' },
        {
          name: 'a mapping that is not a string leaves the component alone',
          code: '<Foo scope="col" />',
          settings: { 'jsx-a11y': { components: { Foo: 3 } } },
        },
        {
          name: 'a custom element, which is not a DOM element',
          code: '<my-cell scope="col" />',
        },
        {
          name: 'upstream scope-test.js:44, a component mapped to th',
          code: '<TableHeader scope="row" />',
          settings: components,
        },
        {
          name: 'a polymorphic prop that resolves to th',
          code: '<Box as="th" scope="row" />',
          settings: polymorphic(),
        },
        {
          name: 'a polymorphic prop is ignored while the setting is absent',
          code: '<Box as="div" scope="row" />',
        },
        {
          name: 'a component outside polymorphicAllowList keeps its own name',
          code: '<Box as="div" scope="row" />',
          settings: polymorphic({ polymorphicAllowList: ['Text'] }),
        },
        {
          // @found ofri-peretz/eslint PR #1739 review thread PRRT_kwDOQJxXsc67tyLs
          name: 'a bare polymorphic attribute is boolean true, not a tag name, so the component stays',
          code: '<Box as scope="row" />',
          settings: polymorphic(),
        },
        {
          name: 'a dynamic polymorphic value cannot be resolved, so the component stays',
          code: '<Box as={tag} scope="row" />',
          settings: polymorphic(),
        },
      ],
      invalid: [],
    });

    ruleTester.run(
      'invalid - components mapped to a non-th DOM element',
      scope,
      {
        valid: [],
        invalid: [
          {
            name: 'a tag named like an Object.prototype key is not read as a mapping',
            code: '<constructor scope="row" />',
            settings: components,
            errors: [{ messageId: 'invalidScope' }],
          },
          {
            name: 'upstream scope-test.js:48, a component mapped to div, once',
            code: '<Foo scope="bar" />',
            settings: components,
            errors: [{ messageId: 'invalidScope' }],
          },
          {
            name: 'a polymorphic prop that resolves to div',
            code: '<Box as="div" scope="row" />',
            settings: polymorphic(),
            errors: [{ messageId: 'invalidScope' }],
          },
          {
            name: 'a component inside polymorphicAllowList resolves',
            code: '<Box as="div" scope="row" />',
            settings: polymorphic({ polymorphicAllowList: ['Box'] }),
            errors: [{ messageId: 'invalidScope' }],
          },
          {
            name: 'the polymorphic value wins over the components map, as upstream',
            code: '<TableHeader as="span" scope="row" />',
            settings: {
              'jsx-a11y': {
                ...components['jsx-a11y'],
                polymorphicPropName: 'as',
              },
            },
            errors: [{ messageId: 'invalidScope' }],
          },
        ],
      },
    );
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - scope on non-th', scope, {
      valid: [],
      invalid: [
        {
          name: 'scope means nothing outside a table header',
          code: '<span scope="col">Header</span>',
          errors: [{ messageId: 'invalidScope' }],
        },
        {
          name: 'scope on a td, where it means nothing',
          code: '<td scope="col">Data</td>',
          errors: [{ messageId: 'invalidScope' }],
        },
        {
          name: 'upstream scope-test.js:47, scope on a div',
          code: '<div scope="row">Content</div>',
          errors: [{ messageId: 'invalidScope' }],
        },
      ],
    });
  });
});
